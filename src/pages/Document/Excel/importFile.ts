import { importMessages, type ImportResponse } from './importWorker';
import type { ParsedRow } from './userSheet';
import { WorkbookInputError, XLSX_LIMITS, checkWorkbookFileSize } from './xlsxBoundary';

type Translate = (id: string, values?: Record<string, string | number>) => string;

/** The main-thread timer can terminate parsing even when worker JavaScript is busy. */
export const importUsersFile = (
  file: File,
  usernames: string[],
  t: Translate,
  signal: AbortSignal,
): Promise<ParsedRow[]> => {
  checkWorkbookFileSize(file.size);
  return new Promise((resolve, reject) => {
    let worker: Worker | undefined;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: () => void;
    const finish = (result: ParsedRow[] | WorkbookInputError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      worker?.terminate();
      if (result instanceof WorkbookInputError) reject(result);
      else resolve(result);
    };
    abort = () => finish(new WorkbookInputError('cancelled'));
    timer = setTimeout(() => finish(new WorkbookInputError('timeout')), XLSX_LIMITS.timeoutMs);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    void file
      .arrayBuffer()
      .then((buffer) => {
        if (settled) return;
        try {
          worker = new Worker(new URL('./importWorker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = ({ data }: MessageEvent<ImportResponse>) => {
            finish(data.ok ? data.rows : new WorkbookInputError(data.code));
          };
          worker.onerror = () => finish(new WorkbookInputError('parseFailed'));
          worker.onmessageerror = () => finish(new WorkbookInputError('parseFailed'));
          worker.postMessage({ buffer, usernames, messages: importMessages(t) }, [buffer]);
        } catch {
          finish(new WorkbookInputError('unsupported'));
        }
      })
      .catch(() => finish(new WorkbookInputError('parseFailed')));
  });
};
