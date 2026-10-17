import { resolveObjectURL } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { createPdfWorkerSrc, pdfWorkerModuleSource } from './pdfWorkerSrc';

const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;

describe('pdf.js worker entry', () => {
  it('evaluates the polyfill before the pdf.js worker and re-exports the worker', async () => {
    const scope = globalThis as typeof globalThis & { pdfWorkerEntryOrder?: string[] };
    scope.pdfWorkerEntryOrder = [];
    const entry = pdfWorkerModuleSource(
      moduleUrl('globalThis.pdfWorkerEntryOrder.push("polyfill");'),
      moduleUrl('globalThis.pdfWorkerEntryOrder.push("worker"); export const WorkerMessageHandler = "handler";'),
    );
    const loaded = await import(/* @vite-ignore */ moduleUrl(entry));
    expect(scope.pdfWorkerEntryOrder).toEqual(['polyfill', 'worker']);
    expect(loaded.WorkerMessageHandler).toBe('handler');
    delete scope.pdfWorkerEntryOrder;
  });

  it('quotes URLs as string literals', () => {
    expect(pdfWorkerModuleSource('https://a.test/p.mjs', 'https://a.test/"w".mjs')).toContain(
      JSON.stringify('https://a.test/"w".mjs'),
    );
  });

  it('is a JavaScript blob pointing at the emitted polyfill and pdf.js worker', async () => {
    const blob = resolveObjectURL(createPdfWorkerSrc())!;
    expect(blob.type).toBe('text/javascript');
    expect(await blob.text()).toBe(
      pdfWorkerModuleSource(
        new URL('./pdfjsPolyfills.mjs', import.meta.url).href,
        new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href,
      ),
    );
  });
});
