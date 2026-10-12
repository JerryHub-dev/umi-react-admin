import { FIELDS, parseUsersWorkbook, type Field, type ParsedRow } from './userSheet';
import { WorkbookInputError, XLSX_LIMITS, validateXlsxArchive, type ImportErrorCode } from './xlsxBoundary';

export type ImportMessages = {
  required: Record<Field, string>;
  invalidEnum: Record<Field, string>;
  fixed: Record<string, string>;
};
export type ImportRequest = { buffer: ArrayBuffer; usernames: string[]; messages: ImportMessages };
export type ImportResponse = { ok: true; rows: ParsedRow[] } | { ok: false; code: ImportErrorCode };

/** Kept separate so real ZIP/ExcelJS parsing can be exercised without a browser worker. */
export const readUsersImport = async ({ buffer, usernames, messages }: ImportRequest): Promise<ParsedRow[]> => {
  await validateXlsxArchive(buffer);
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  // These element-count limits are additional checks, not the coordinate/ZIP boundary.
  const options = {
    maxRows: XLSX_LIMITS.rows,
    maxCols: XLSX_LIMITS.columns,
    ignoreNodes: ['dataValidations', 'conditionalFormatting', 'extLst'],
  };
  await workbook.xlsx.load(buffer, options);
  const translate = (id: string, values?: Record<string, string | number>) => {
    if (id.startsWith('users.column.')) return id.slice('users.column.'.length);
    const field = String(values?.field) as Field;
    if (id === 'excel.error.required') return messages.required[field];
    if (id === 'excel.error.enum') return messages.invalidEnum[field];
    return messages.fixed[id] ?? id;
  };
  return parseUsersWorkbook(workbook, new Set(usernames), translate);
};

const workerScope = globalThis as typeof globalThis & {
  document?: unknown;
  postMessage?: (message: ImportResponse) => void;
  onmessage?: (event: MessageEvent<ImportRequest>) => void;
};

// Tests import the parser in Node; only a dedicated worker installs this handler.
if (typeof workerScope.postMessage === 'function' && typeof workerScope.document === 'undefined') {
  workerScope.onmessage = (event) => {
    void readUsersImport(event.data).then(
      (rows) => workerScope.postMessage?.({ ok: true, rows }),
      (error: unknown) =>
        workerScope.postMessage?.({
          ok: false,
          code: error instanceof WorkbookInputError ? error.code : 'parseFailed',
        }),
    );
  };
}

export const importMessages = (
  t: (id: string, values?: Record<string, string | number>) => string,
): ImportMessages => ({
  required: Object.fromEntries(
    FIELDS.map((field) => [field, t('excel.error.required', { field: t(`users.column.${field}`) })]),
  ) as Record<Field, string>,
  invalidEnum: Object.fromEntries(
    FIELDS.map((field) => [field, t('excel.error.enum', { field: t(`users.column.${field}`) })]),
  ) as Record<Field, string>,
  fixed: Object.fromEntries(
    ['email', 'username', 'exists', 'duplicate'].map((code) => [`excel.error.${code}`, t(`excel.error.${code}`)]),
  ),
});
