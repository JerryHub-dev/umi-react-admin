// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { importUsersFile } from './importFile';
import { XLSX_LIMITS } from './xlsxBoundary';

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: MessageEvent) => void;
  onerror?: () => void;
  onmessageerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    TestWorker.instances.push(this);
  }
}
const smallFile = () => ({ size: 1, arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1)) }) as unknown as File;
const t = (id: string) => id;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  TestWorker.instances = [];
});

describe('bounded import worker lifecycle', () => {
  it('checks file size before reading or creating a worker', () => {
    const file = { size: XLSX_LIMITS.fileBytes + 1, arrayBuffer: vi.fn() } as unknown as File;
    expect(() => importUsersFile(file, [], t, new AbortController().signal)).toThrow('fileLimit');
    expect(file.arrayBuffer).not.toHaveBeenCalled();
  });

  it('terminates a stale import and ignores its later successful result', async () => {
    vi.stubGlobal('Worker', TestWorker);
    const controller = new AbortController();
    const promise = importUsersFile(smallFile(), [], t, controller.signal);
    await Promise.resolve();
    const worker = TestWorker.instances[0];
    controller.abort();
    worker.onmessage?.({ data: { ok: true, rows: [] } } as MessageEvent);
    await expect(promise).rejects.toThrow('cancelled');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('enforces the deadline from the main thread and terminates the worker', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', TestWorker);
    const promise = importUsersFile(smallFile(), [], t, new AbortController().signal);
    const outcome = promise.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(XLSX_LIMITS.timeoutMs);
    expect(await outcome).toMatchObject({ code: 'timeout' });
    expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it('terminates a completed worker while preserving the valid preview result', async () => {
    vi.stubGlobal('Worker', TestWorker);
    const promise = importUsersFile(smallFile(), [], t, new AbortController().signal);
    await Promise.resolve();
    const worker = TestWorker.instances[0];
    worker.onmessage?.({ data: { ok: true, rows: [] } } as MessageEvent);
    await expect(promise).resolves.toEqual([]);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
