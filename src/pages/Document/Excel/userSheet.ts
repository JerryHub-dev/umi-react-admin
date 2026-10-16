/**
 * 用户表 ↔ .xlsx：导出、模板、导入解析与逐行校验（纯函数，exceljs 由调用方动态 import 传入）。
 * 表头与枚举值同时接受中英文与 key，换了界面语言导出的文件也能导回来。
 */
import { DEPARTMENT_KEYS } from '@/constants/enums';
import { ROLE_KEYS } from '@/constants/permissions';
import enEnums from '@/locales/en-US/enums';
import enSystem from '@/locales/en-US/system';
import zhEnums from '@/locales/zh-CN/enums';
import zhSystem from '@/locales/zh-CN/system';
import type { DepartmentKey, RoleKey, User, UserCreateInput, UserImportRow } from '@/services/types';
import type { Workbook } from 'exceljs';
import { WorkbookInputError, XLSX_LIMITS } from './xlsxBoundary';

export const FIELDS = ['name', 'username', 'email', 'department', 'role'] as const;
export type Field = (typeof FIELDS)[number];
/**
 * 角色列可以留空：空 = 不指定角色，服务端按默认角色（访客）创建，不构成角色分配；
 * 填了值才是一次角色分配，需要 system.user.role.assign（见 restrictRoleColumn）。
 * 其余列必填。
 */
const REQUIRED_FIELDS: readonly Field[] = ['name', 'username', 'email', 'department'];

const headerKey = (field: Field) => `users.column.${field}` as const;
const HEADER_ALIASES = new Map<string, Field>(
  FIELDS.flatMap((field) => [
    [field.toLowerCase(), field],
    [(zhSystem as Record<string, string>)[headerKey(field)].toLowerCase(), field],
    [(enSystem as Record<string, string>)[headerKey(field)].toLowerCase(), field],
  ]),
);

/** 枚举值别名：key、中文名、英文名都能识别 */
const enumAliases = <K extends string>(prefix: string, keys: readonly K[]) =>
  new Map<string, K>(
    keys.flatMap((key) => [
      [key.toLowerCase(), key],
      [(zhEnums as Record<string, string>)[`${prefix}.${key}`].toLowerCase(), key],
      [(enEnums as Record<string, string>)[`${prefix}.${key}`].toLowerCase(), key],
    ]),
  );
const DEPARTMENTS = enumAliases<DepartmentKey>('department', DEPARTMENT_KEYS);
const ROLES = enumAliases<RoleKey>('role', ROLE_KEYS);

export type ParsedRow = {
  key: string;
  row: number;
  values: Partial<Record<Field, string>>;
  input?: UserCreateInput;
  errors: string[];
};

type Translate = (id: string, values?: Record<string, string | number>) => string;

export const buildUsersWorkbook = (
  ExcelJS: { Workbook: new () => Workbook },
  users: Pick<User, Field>[],
  t: Translate,
  sheetName: string,
) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = FIELDS.map((field) => ({
    header: t(headerKey(field)),
    key: field,
    width: field === 'email' ? 32 : 18,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  users.forEach((user) =>
    sheet.addRow({
      ...user,
      department: t(`department.${user.department}`),
      role: t(`role.${user.role}`),
    }),
  );
  return workbook;
};

export const parseUsersWorkbook = (workbook: Workbook, existingUsernames: Set<string>, t: Translate): ParsedRow[] => {
  if (!workbook.worksheets.length) throw new WorkbookInputError('noSheet');
  if (workbook.worksheets.length > XLSX_LIMITS.sheets) throw new WorkbookInputError('sheetLimit');
  let cells = 0;
  // Defend direct callers too. Archive checks run before ExcelJS allocates this model.
  workbook.worksheets.forEach((worksheet) => {
    if (worksheet.rowCount > XLSX_LIMITS.rows || worksheet.columnCount > XLSX_LIMITS.columns) {
      throw new WorkbookInputError('sheetLimit');
    }
    worksheet.eachRow((row) => {
      if (row.cellCount > XLSX_LIMITS.columns) throw new WorkbookInputError('sheetLimit');
      row.eachCell((cell) => {
        if (++cells > XLSX_LIMITS.cells) throw new WorkbookInputError('sheetLimit');
        if (cell.text.length > XLSX_LIMITS.textCharacters) throw new WorkbookInputError('textLimit');
      });
    });
  });
  const sheet = workbook.worksheets[0];
  const columnField = new Map<number, Field>();
  // 一律取 cell.text：邮箱常被 Excel 转成超链接，富文本与公式单元格的 value 都是对象
  sheet.getRow(1).eachCell((cell, col) => {
    const field = HEADER_ALIASES.get(cell.text.trim().toLowerCase());
    if (field) columnField.set(col, field);
  });

  const rows: ParsedRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: Partial<Record<Field, string>> = {};
    columnField.forEach((field, col) => {
      values[field] = row.getCell(col).text.trim();
    });
    if (!Object.values(values).some(Boolean)) return;

    const errors: string[] = [];
    REQUIRED_FIELDS.forEach((field) => {
      if (!values[field]) errors.push(t('excel.error.required', { field: t(headerKey(field)) }));
    });
    if (values.email) {
      // Same accepted shape as the old pattern, with linear work on long invalid input.
      const at = values.email.indexOf('@');
      const dot = values.email.indexOf('.', at + 2);
      if (
        at <= 0 ||
        at !== values.email.lastIndexOf('@') ||
        dot <= at + 1 ||
        dot === values.email.length - 1 ||
        /\s/.test(values.email)
      ) {
        errors.push(t('excel.error.email'));
      }
    }
    const username = values.username?.toLowerCase();
    if (username && !/^[a-z][a-z0-9._-]{2,31}$/.test(username)) errors.push(t('excel.error.username'));
    if (username && existingUsernames.has(username)) errors.push(t('excel.error.exists'));
    const department = values.department ? DEPARTMENTS.get(values.department.toLowerCase()) : undefined;
    const role = values.role ? ROLES.get(values.role.toLowerCase()) : undefined;
    if (values.department && !department) errors.push(t('excel.error.enum', { field: t(headerKey('department')) }));
    if (values.role && !role) errors.push(t('excel.error.enum', { field: t(headerKey('role')) }));

    rows.push({
      key: `row-${rowNumber}`,
      row: rowNumber,
      values,
      errors,
      input:
        errors.length === 0
          ? {
              name: values.name!,
              username: username!,
              email: values.email!,
              department: department!,
              ...(role ? { role } : {}),
            }
          : undefined,
    });
  });

  // 文件内部登录名重复
  const seen = new Map<string, number>();
  rows.forEach((r) => {
    const username = r.values.username?.toLowerCase();
    if (!username) return;
    seen.set(username, (seen.get(username) ?? 0) + 1);
  });
  rows.forEach((r) => {
    const username = r.values.username?.toLowerCase();
    if (username && seen.get(username)! > 1) {
      r.errors.push(t('excel.error.duplicate'));
      r.input = undefined;
    }
  });
  return rows;
};

/**
 * 没有 system.user.role.assign 时，填了角色的行在本地判无效（提示清空角色列）：
 * 服务端对「任意一行指定了角色」整批 403，不能让一行越权拖垮整批，也不能悄悄丢掉角色列按访客导入。
 */
export const restrictRoleColumn = (
  rows: ParsedRow[],
  { canAssignRole }: { canAssignRole: boolean },
  t: Translate,
): ParsedRow[] =>
  canAssignRole
    ? rows
    : rows.map((row) =>
        row.values.role ? { ...row, input: undefined, errors: [...row.errors, t('excel.error.roleForbidden')] } : row,
      );

/**
 * 导入请求载荷：只提交本地校验通过的行，字段取解析后的 key（部门/角色的中英文标签已在解析时映射），
 * 未指定角色的行不带 role 键。row 是 Excel 原始行号，服务端用它回报问题行。
 */
export const toImportRows = (rows: ParsedRow[]): (UserImportRow & { row: number })[] =>
  rows.flatMap(({ row, input }) =>
    input
      ? [
          {
            row,
            name: input.name,
            username: input.username,
            email: input.email,
            department: input.department,
            ...(input.role ? { role: input.role } : {}),
          },
        ]
      : [],
  );

export const downloadWorkbook = async (workbook: Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  // 挂到文档再点击、下一轮事件循环再释放 URL：部分浏览器在同步 revoke 时会中断下载
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
