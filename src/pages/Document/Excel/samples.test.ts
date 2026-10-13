/**
 * public/demo 示例文件回归（UI 审计整改 R08）：Excel 页「示例文件」下拉提供的四个 .xlsx
 * 由 scripts/make-demo-samples.mjs 生成，这里断言它们存在、体积受控、表头与解析约定一致，
 * 且每行命中 userSheet.ts 校验规则的预期分支。
 * 校验走真实导入管线 readUsersImport（validateXlsxArchive + ExcelJS + parseUsersWorkbook，
 * 与浏览器 Worker 同一条代码路径；Worker 生命周期本身由 importFile.test.ts 覆盖）。
 */
import zh from '@/locales/zh-CN';
import ExcelJS from 'exceljs';
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importMessages, readUsersImport } from './importWorker';
import { FIELDS } from './userSheet';

const t = (id: string, values?: Record<string, string | number>) =>
  ((zh as Record<string, string>)[id] ?? id).replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? ''));
const messages = importMessages(t);

const SAMPLE_FILES = ['users-valid.xlsx', 'users-partial.xlsx', 'users-invalid.xlsx', 'users-duplicate.xlsx'];
const sampleUrl = (name: string) => new URL(`../../../../public/demo/${name}`, import.meta.url);

/** readFileSync 的小文件可能落在共享池上，复制出精确长度的 ArrayBuffer（同 xlsxBoundary.test 的 toBuffer 注释） */
const readArrayBuffer = (name: string) => {
  const bytes = readFileSync(sampleUrl(name));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
};

/** 浏览器里 existingUsernames 是演示后端全量用户（拼音式 + admin/guest），demo.* 均不在其中 */
const importSample = (name: string, existing: string[]) =>
  readUsersImport({ buffer: readArrayBuffer(name), usernames: existing, messages });

const headerRow = async (name: string) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(readArrayBuffer(name));
  return workbook.worksheets[0].getRow(1);
};

const errorText = {
  requiredName: t('excel.error.required', { field: t('users.column.name') }),
  requiredUsername: t('excel.error.required', { field: t('users.column.username') }),
  email: t('excel.error.email'),
  username: t('excel.error.username'),
  exists: t('excel.error.exists'),
  duplicate: t('excel.error.duplicate'),
};

describe('Excel 导入示例文件（public/demo）', () => {
  it('四个文件存在、体积 < 20KB、表头与默认语言的模板列名一致', async () => {
    for (const name of SAMPLE_FILES) {
      const size = statSync(sampleUrl(name)).size;
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(20 * 1024);
      const header = await headerRow(name);
      expect(header.cellCount).toBe(FIELDS.length);
      FIELDS.forEach((field, index) => {
        expect(header.getCell(index + 1).text).toBe(t(`users.column.${field}`));
      });
    }
  });

  it('users-valid：3 行全部有效，用户名为演示主线（E08）保留名', async () => {
    const rows = await importSample('users-valid.xlsx', ['admin', 'guest']);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.input?.username)).toEqual(['demo.iris', 'demo.hugo', 'demo.nora']);
    rows.forEach((row) => expect(row.errors).toEqual([]));
    expect(rows[0].input).toEqual({
      name: '陈雨薇',
      username: 'demo.iris',
      email: 'demo.iris@example.com',
      department: 'ops1',
      role: 'operator',
    });
  });

  it('users-partial：2 行有效 + 邮箱格式与登录名非法各 1 行', async () => {
    const rows = await importSample('users-partial.xlsx', ['admin', 'guest']);
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.errors)).toEqual([[], [], [errorText.email], [errorText.username]]);
    expect(rows.map((row) => row.input?.username)).toEqual(['demo.para', 'demo.parb', undefined, undefined]);
  });

  it('users-invalid：4 行全部无效，各命中一种错误', async () => {
    const rows = await importSample('users-invalid.xlsx', ['admin', 'guest']);
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.errors)).toEqual([
      [errorText.email],
      [errorText.username],
      [errorText.requiredName],
      [errorText.requiredUsername],
    ]);
    expect(rows.every((row) => row.input === undefined)).toBe(true);
  });

  it('users-duplicate：文件内重复一对、与种子 admin 冲突；demo.iris 在主线导入后才冲突', async () => {
    const rows = await importSample('users-duplicate.xlsx', ['admin', 'guest']);
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.input?.username)).toEqual(['demo.su', undefined, undefined, undefined, 'demo.iris']);
    expect(rows.map((row) => row.errors)).toEqual([
      [],
      [errorText.duplicate],
      [errorText.duplicate],
      [errorText.exists],
      [],
    ]);

    // 主线顺序：先导 users-valid.xlsx（demo.* 落库），再导本文件 → demo.iris 行变为「已存在」
    const mainline = await importSample('users-valid.xlsx', ['admin', 'guest']);
    const existing = ['admin', 'guest', ...mainline.flatMap((row) => (row.input ? [row.input.username] : []))];
    const after = await importSample('users-duplicate.xlsx', existing);
    expect(after[0].input?.username).toBe('demo.su');
    expect(after[4].errors).toEqual([errorText.exists]);
  });
});
