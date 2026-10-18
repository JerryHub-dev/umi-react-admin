import en from '@/locales/en-US';
import ExcelJS from 'exceljs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { importMessages, readUsersImport } from './importWorker';
import { buildUsersWorkbook } from './userSheet';
import { WorkbookInputError, XLSX_LIMITS, validateWorkbookXml, validateXlsxArchive } from './xlsxBoundary';

const require = createRequire(import.meta.url);
type ZipFixture = {
  file: (name: string, text: string, options?: { createFolders: boolean }) => ZipFixture;
  generateAsync: (options: Record<string, string | boolean>) => Promise<Uint8Array>;
};
// 测试需要 exceljs 内嵌的 jszip 来构造恶意压缩包夹具：先收敛到 exceljs 的解析上下文，
// 再用字面量 'jszip' 取包——解析路径固定自依赖图，不接纳外部输入
const exceljsRequire = createRequire(require.resolve('exceljs'));
const Zip = exceljsRequire('jszip') as new () => ZipFixture;
// ExcelJS writeBuffer() 在 Node 24 下可能返回共享池上的视图（byteOffset>0、底层 slab 更大），
// slice().buffer 会把整个 slab 当文件传入，EOCD 边界校验必然失败；这里显式拷贝出精确长度的 buffer
const toBuffer = (bytes: Uint8Array) => new Uint8Array(bytes).buffer as ArrayBuffer;
const t = (id: string, values?: Record<string, string | number>) =>
  ((en as Record<string, string>)[id] ?? id).replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? ''));
const zipXml = async (xml: string, descriptor = false, name = 'xl/worksheets/sheet1.xml') => {
  const zip = new Zip();
  zip.file(name, xml, { createFolders: false });
  return toBuffer(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', streamFiles: descriptor }));
};

describe('XLSX boundary before parser allocation', () => {
  it('accepts real ExcelJS exports, cached formulas, hyperlinks, rich text and bilingual aliases', async () => {
    const workbook = buildUsersWorkbook(
      ExcelJS,
      [{ name: 'Test', username: 'test.user', email: 'test@example.com', department: 'ops1', role: 'viewer' }],
      t,
      'Users',
    );
    const sheet = workbook.worksheets[0];
    sheet.getCell('A2').value = { formula: '"Test"', result: 'Test' };
    sheet.getCell('C2').value = { text: 'test@example.com', hyperlink: 'mailto:test@example.com' };
    sheet.getCell('D2').value = { richText: [{ text: 'ops' }, { text: '1' }] };
    const bytes = await workbook.xlsx.writeBuffer();
    const rows = await readUsersImport({
      buffer: toBuffer(bytes as unknown as Uint8Array),
      usernames: [],
      messages: importMessages(t),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].input).toEqual({
      name: 'Test',
      username: 'test.user',
      email: 'test@example.com',
      department: 'ops1',
      role: 'viewer',
    });
  });

  it.each([false, true])('accepts ordinary deflate ZIPs with data descriptor=%s', async (descriptor) => {
    await expect(
      validateXlsxArchive(
        await zipXml(
          '<worksheet><sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData></worksheet>',
          descriptor,
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it('counts real deflate output even when both ZIP headers claim one byte', async () => {
    const buffer = await zipXml(`<sst><si><t>${'A'.repeat(4096)}</t></si></sst>`, false, 'xl/sharedStrings.xml');
    const view = new DataView(buffer);
    const central = new Uint8Array(buffer).findIndex(
      (value, index, bytes) =>
        value === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x01 && bytes[index + 3] === 0x02,
    );
    view.setUint32(22, 1, true);
    view.setUint32(central + 24, 1, true);
    await expect(validateXlsxArchive(buffer, { entryBytes: 512, expandedBytes: 1024 })).rejects.toMatchObject({
      code: 'archiveLimit',
    });
  });

  it('checks total expanded output across several individually small entries', async () => {
    const zip = new Zip();
    zip.file('one.txt', 'A'.repeat(400));
    zip.file('two.txt', 'B'.repeat(400));
    const buffer = toBuffer(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
    await expect(validateXlsxArchive(buffer, { expandedBytes: 600 })).rejects.toMatchObject({ code: 'archiveLimit' });
  });

  it('rejects path aliases and central/local name disagreement', async () => {
    await expect(
      validateXlsxArchive(await zipXml('<worksheet/>', false, '../xl/worksheets/sheet1.xml')),
    ).rejects.toMatchObject({ code: 'parseFailed' });
    const buffer = await zipXml('<worksheet/>');
    new Uint8Array(buffer)[30] = 'X'.charCodeAt(0);
    await expect(validateXlsxArchive(buffer)).rejects.toMatchObject({ code: 'parseFailed' });
  });

  it('rejects malformed/truncated ZIP before parser use', async () => {
    const buffer = await zipXml('<worksheet/>');
    await expect(validateXlsxArchive(buffer.slice(0, -1))).rejects.toBeInstanceOf(WorkbookInputError);
  });

  it('validates XML aliases also recognized by ExcelJS unanchored entry matchers', async () => {
    await expect(
      validateXlsxArchive(
        await zipXml(
          '<worksheet><sheetData><row r="1002"/></sheetData></worksheet>',
          false,
          'xl/worksheets/sheet1.xml.extra',
        ),
      ),
    ).rejects.toMatchObject({ code: 'sheetLimit' });
  });

  it.each([
    '<worksheet><sheetData><row r="1002"><c r="A1002"><v>1</v></c></row></sheetData></worksheet>',
    '<worksheet><sheetData><row r="1"><c r="BM1"><v>1</v></c></row></sheetData></worksheet>',
    '<worksheet><cols><col min="1" max="65"/></cols></worksheet>',
    '<worksheet><mergeCells><mergeCell ref="A1:A1002"/></mergeCells></worksheet>',
    '<workbook><definedNames><definedName name="range">Users!$A$1:$A$1002</definedName></definedNames></workbook>',
    '<workbook><definedNames><definedName name="range">Users!$A$1:A1002</definedName></definedNames></workbook>',
    '<workbook><definedNames><definedName name="range">Users!A1002:$A$1</definedName></definedNames></workbook>',
    '<workbook><definedNames><definedName name="range">Users!A1:A1002</definedName></definedNames></workbook>',
  ])('rejects coordinate/range amplification: %s', async (xml) => {
    await expect(validateXlsxArchive(await zipXml(xml))).rejects.toMatchObject({ code: 'sheetLimit' });
  });

  it('rejects DTD/entities and combined rich-text values over the cap', () => {
    expect(() => validateWorkbookXml('<!DOCTYPE worksheet [<!ENTITY a "x">]><worksheet/>')).toThrow(WorkbookInputError);
    expect(() =>
      validateWorkbookXml(`<sst><si><r><t>${'A'.repeat(2048)}</t></r><r><t>${'B'.repeat(2049)}</t></r></si></sst>`),
    ).toThrow('textLimit');
  });

  it('counts decoded text and accepts a value at the exact cap with XML whitespace', () => {
    expect(() =>
      validateWorkbookXml(`<sst>\n<si>\n<t>${'&amp;'.repeat(XLSX_LIMITS.textCharacters)}</t>\n</si>\n</sst>`),
    ).not.toThrow();
  });

  it('handles quoted sheet names and mixed absolute/relative named-range coordinates', () => {
    expect(() =>
      validateWorkbookXml(
        '<workbook><definedNames><definedName name="range">\'Users, 2026\'!$A$1:B2,Users!A3:$B$4</definedName></definedNames></workbook>',
      ),
    ).not.toThrow();
    expect(() =>
      validateWorkbookXml(
        '<workbook><definedNames><definedName name="range">Users!$A$1:A1002suffix</definedName></definedNames></workbook>',
      ),
    ).toThrow('unsupported');
  });
});
