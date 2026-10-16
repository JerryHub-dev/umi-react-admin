import en from '@/locales/en-US';
import zh from '@/locales/zh-CN';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildUsersWorkbook, parseUsersWorkbook, restrictRoleColumn, toImportRows } from './userSheet';

const translator = (messages: Record<string, string>) => (id: string, values?: Record<string, string | number>) =>
  (messages[id] ?? id).replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? ''));
const tZh = translator(zh as Record<string, string>);
const tEn = translator(en as Record<string, string>);

describe('用户表导入导出', () => {
  it('英文界面导出的文件，在中文界面能完整导回（表头与枚举值双语识别）', () => {
    const workbook = buildUsersWorkbook(
      ExcelJS,
      [{ name: 'Test', username: 'test.user', email: 'test@example.com', department: 'ops2', role: 'lead' }],
      tEn,
      'Users',
    );
    const rows = parseUsersWorkbook(workbook, new Set(), tZh);
    expect(rows).toHaveLength(1);
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].input).toEqual({
      name: 'Test',
      username: 'test.user',
      email: 'test@example.com',
      department: 'ops2',
      role: 'lead',
    });
  });

  it('逐行校验：必填、邮箱、登录名格式、已存在、文件内重复、枚举取值', () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('s');
    sheet.addRow(['姓名', '登录名', '邮箱', '部门', '角色']);
    sheet.addRow(['', 'ok.name', 'a@example.com', '运维一部', '访客']);
    sheet.addRow(['A', '1bad', 'not-an-email', '不存在的部门', 'admin']);
    sheet.addRow(['B', 'admin', 'b@example.com', 'ops1', 'viewer']);
    sheet.addRow(['C', 'dup.name', 'c@example.com', 'ops1', 'viewer']);
    sheet.addRow(['D', 'dup.name', 'd@example.com', 'ops1', 'viewer']);
    sheet.addRow(['', '', '', '', '']);
    const rows = parseUsersWorkbook(workbook, new Set(['admin']), tZh);
    expect(rows.map((r) => r.row)).toEqual([2, 3, 4, 5, 6]);
    expect(rows[0].errors).toEqual(['姓名必填']);
    expect(rows[1].errors).toEqual(['邮箱格式不正确', '登录名不合法', '部门取值无效']);
    expect(rows[2].errors).toEqual(['登录名已存在']);
    expect(rows[3].errors).toEqual(['登录名与文件中其它行重复']);
    expect(rows.every((r) => !r.input)).toBe(true);
  });

  it('直接调用时也拒绝稀疏超限坐标、过长字段和无工作表', () => {
    expect(() => parseUsersWorkbook(new ExcelJS.Workbook(), new Set(), tZh)).toThrow('noSheet');
    const sparse = new ExcelJS.Workbook();
    sparse.addWorksheet('s').getCell('A1002').value = 'Test';
    expect(() => parseUsersWorkbook(sparse, new Set(), tZh)).toThrow('sheetLimit');
    const text = new ExcelJS.Workbook();
    text.addWorksheet('s').getCell('A1').value = 'A'.repeat(4097);
    expect(() => parseUsersWorkbook(text, new Set(), tZh)).toThrow('textLimit');
  });
});

describe('角色列语义与导入载荷（客户端只提交 key，不提交界面标签）', () => {
  const sheetOf = (rows: string[][]) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('s');
    sheet.addRow(['姓名', '登录名', '邮箱', '部门', '角色']);
    rows.forEach((row) => sheet.addRow(row));
    return parseUsersWorkbook(workbook, new Set(), tZh);
  };

  it('角色列可以留空：不报必填，input 不带 role（服务端按默认角色创建）', () => {
    const [row] = sheetOf([['A', 'role.empty', 'a@example.com', 'ops1', '']]);
    expect(row.errors).toEqual([]);
    expect(row.input).toEqual({ name: 'A', username: 'role.empty', email: 'a@example.com', department: 'ops1' });
  });

  it('中文标签、英文标签与 key 都映射成同一个角色 key', () => {
    const rows = sheetOf([
      ['A', 'role.zh', 'a@example.com', '运维一部', '运维工程师'],
      ['B', 'role.en', 'b@example.com', 'ops1', 'Operator'],
      ['C', 'role.key', 'c@example.com', 'ops1', 'operator'],
    ]);
    expect(rows.map((row) => row.input?.role)).toEqual(['operator', 'operator', 'operator']);
    expect(rows[0].input?.department).toBe('ops1');
  });

  it('toImportRows 只提交本地校验通过的行：部门/角色是 key，空角色不带 role 键，保留 Excel 行号', () => {
    const rows = sheetOf([
      ['A', 'ok.one', 'a@example.com', '运维一部', '数据分析员'],
      ['B', 'ok.two', 'b@example.com', 'ops2', ''],
      ['', 'bad.row', 'not-an-email', 'ops1', 'viewer'],
    ]);
    const payload = toImportRows(rows);
    expect(payload).toEqual([
      { row: 2, name: 'A', username: 'ok.one', email: 'a@example.com', department: 'ops1', role: 'analyst' },
      { row: 3, name: 'B', username: 'ok.two', email: 'b@example.com', department: 'ops2' },
    ]);
    expect(payload.every((row) => !('role' in row) || row.role !== '')).toBe(true);
  });

  it('没有 role.assign 时：填了角色的行判无效并提示清空，未填角色的行不受影响', () => {
    const rows = sheetOf([
      ['A', 'with.role', 'a@example.com', 'ops1', 'viewer'],
      ['B', 'no.role', 'b@example.com', 'ops1', ''],
    ]);
    const restricted = restrictRoleColumn(rows, { canAssignRole: false }, tZh);
    expect(restricted[0].input).toBeUndefined();
    expect(restricted[0].errors).toEqual([tZh('excel.error.roleForbidden')]);
    expect(restricted[1]).toBe(rows[1]);
    // 提交载荷因此不会带 role，导入不会被整批 403
    expect(toImportRows(restricted)).toEqual([
      { row: 3, name: 'B', username: 'no.role', email: 'b@example.com', department: 'ops1' },
    ]);
    // 有权限时原样返回
    expect(restrictRoleColumn(rows, { canAssignRole: true }, tZh)).toBe(rows);
  });
});
