// @vitest-environment jsdom
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type PageCallbacks = { pageNumber: number; onRenderSuccess: () => void; onRenderError: (error: Error) => void };
type DocumentCallbacks = {
  file?: Blob;
  children?: ReactNode;
  onLoadSuccess: (pdf: PDFDocumentProxy) => void;
  onLoadError?: (error: Error) => void;
  onSourceError?: (error: Error) => void;
};
const callbacks = vi.hoisted(() => {
  vi.stubGlobal('PUBLIC_PATH', '/');
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  return {
    documents: [] as DocumentCallbacks[],
    pages: [] as PageCallbacks[],
    open: undefined as ((file: File) => unknown) | undefined,
  };
});

vi.mock('@umijs/max', () => ({ useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }) }));
vi.mock('@/hooks/useApi', () => ({ useApi: () => ({ data: undefined }) }));
vi.mock('@/services/ops', () => ({ getDashboardOverview: vi.fn() }));
vi.mock('@/components/DemoPage', () => ({
  default: ({ children, extra }: { children: ReactNode; extra: ReactNode }) => (
    <>
      {extra}
      {children}
    </>
  ),
}));
vi.mock('./ReportSheet', () => ({ default: () => null, SHEET: { width: 794 } }));
vi.mock('html2canvas', () => ({ default: vi.fn() }));
vi.mock('antd', () => ({
  Alert: ({ description }: { description: string }) => <div role="alert">{description}</div>,
  Button: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Space: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Spin: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Upload: ({ children, beforeUpload }: { children: ReactNode; beforeUpload: (file: File) => unknown }) => {
    callbacks.open = beforeUpload;
    return <>{children}</>;
  },
}));
vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: (props: DocumentCallbacks) => {
    if (props.file) callbacks.documents.push(props);
    return <>{props.file && props.children}</>;
  },
  Page: (props: PageCallbacks) => {
    callbacks.pages.push(props);
    return <canvas data-page={props.pageNumber} />;
  },
}));

import Pdf from './index';
import { buildPdfBytes, declaredCountBombPdf, notAPdf, twoPageReportPdf } from './pdfFixtures';
import { buildImagePdf } from './pdfWriter';
import { PDF_LIMITS } from './previewLimits';

describe('PDF deadline covers the current page window rendering', () => {
  let element: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    vi.useFakeTimers();
    callbacks.documents.length = 0;
    callbacks.pages.length = 0;
    element = document.createElement('div');
    document.body.append(element);
    root = createRoot(element);
    await act(async () => root.render(<Pdf />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    element.remove();
    vi.useRealTimers();
  });
  /**
   * 容器级预检对认不出结构的字节 fail closed（不再把 parsed=false 放行给 PDF.js），
   * 所以这里必须是结构合法的 PDF；页数与几何由下面伪造的 onLoadSuccess 决定，与字节内容无关。
   */
  const reportFile = () => {
    const bytes = twoPageReportPdf();
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return new File([buffer], 'report.pdf', { type: 'application/pdf' });
  };
  const load = async (pages = 2) => {
    await act(async () => callbacks.open?.(reportFile()));
    await act(async () => {
      callbacks.documents.at(-1)?.onLoadSuccess({
        numPages: pages,
        getPage: async () => ({ getViewport: () => ({ width: 600, height: 800 }) }),
      } as unknown as PDFDocumentProxy);
      await Promise.resolve();
      await Promise.resolve();
    });
  };
  const page = (number: number) => callbacks.pages.findLast((entry) => entry.pageNumber === number)!;

  it('geometry and one rendered page do not cancel the deadline for the remaining page', async () => {
    await load();
    expect(element.querySelectorAll('canvas')).toHaveLength(2);
    await act(async () => vi.advanceTimersByTime(9999));
    await act(async () => page(1).onRenderSuccess());
    expect(element.querySelector('[role=alert]')).toBeNull();
    await act(async () => vi.advanceTimersByTime(1));
    expect(element.textContent).toContain('pdf.error.timeout');
    expect(element.querySelectorAll('canvas')).toHaveLength(0);
  });

  it('completion of every current page cancels the deadline', async () => {
    await load();
    await act(async () => {
      page(1).onRenderSuccess();
      page(2).onRenderSuccess();
    });
    await act(async () => vi.advanceTimersByTime(50_000));
    expect(element.querySelector('[role=alert]')).toBeNull();
    expect(element.querySelectorAll('canvas')).toHaveLength(2);
  });

  it('old window render callbacks cannot complete or fail the new window', async () => {
    await load(4);
    const old = [page(1), page(2)];
    await act(async () => old.forEach((entry) => entry.onRenderSuccess()));
    const next = [...element.querySelectorAll('button')].find((button) => button.textContent === 'pdf.next');
    await act(async () => {
      next?.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      old.forEach((entry) => entry.onRenderSuccess());
      old[0].onRenderError(new Error('stale render'));
    });
    expect(element.querySelector('[role=alert]')).toBeNull();
    expect(element.querySelector('canvas')?.getAttribute('data-page')).toBe('3');
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(element.textContent).toContain('pdf.error.timeout');
  });

  it('a previous window page load rejection cannot clear the newly requested window', async () => {
    let rejectPrevious: (error: Error) => void = () => undefined;
    const previous = new Promise((_, reject) => {
      rejectPrevious = reject;
    });
    await act(async () => callbacks.open?.(reportFile()));
    await act(async () => {
      callbacks.documents.at(-1)?.onLoadSuccess({
        numPages: 4,
        getPage: async (number: number) =>
          number === 1 ? previous : { getViewport: () => ({ width: 600, height: 800 }) },
      } as unknown as PDFDocumentProxy);
    });
    const next = [...element.querySelectorAll('button')].find((button) => button.textContent === 'pdf.next');
    await act(async () => {
      next?.click();
      rejectPrevious(new Error('previous page load failed'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(element.querySelector('[role=alert]')).toBeNull();
    expect([...element.querySelectorAll('canvas')].map((canvas) => canvas.getAttribute('data-page'))).toEqual([
      '3',
      '4',
    ]);
  });

  const mockPdf = (pages: number) =>
    ({
      numPages: pages,
      getPage: async () => ({ getViewport: () => ({ width: 600, height: 800 }) }),
    }) as unknown as PDFDocumentProxy;
  /**
   * TS 6 的 BlobPart 要求 ArrayBufferView<ArrayBuffer>，而 Uint8Array 的默认类型参数是
   * ArrayBufferLike。这里显式拷进自有的 ArrayBuffer，而不是用 `as BlobPart` 之类的断言
   * 把类型问题盖掉——断言会让真正的不兼容在运行时才暴露。
   */
  const fileOf = (bytes: Uint8Array, name: string) => {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return new File([buffer], name, { type: 'application/pdf' });
  };
  const openFile = async (file: File) => {
    await act(async () => callbacks.open?.(file));
  };

  it('容器级预检拒绝的放大文档不会交给 react-pdf，并显示 pdf.error.preflight', async () => {
    // 声明式页树放大：根 /Pages 的 /Count 远超页数上限，而文件本身只有几百字节
    const bomb = declaredCountBombPdf();
    expect(bomb.length).toBeLessThan(4096);
    await openFile(fileOf(bomb, 'bomb.pdf'));
    expect(callbacks.documents).toHaveLength(0);
    expect(element.querySelectorAll('canvas')).toHaveLength(0);
    expect(element.querySelector('[role=alert]')?.textContent).toContain('pdf.error.preflight');
  });

  it('加密 PDF 与认不出结构的文件在预检阶段就被拒绝，各显示专门的提示', async () => {
    const encrypted = buildPdfBytes(
      [
        { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
        { id: 2, body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
        { id: 3, body: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] >>' },
        { id: 9, body: '<< /Filter /Standard /V 1 /R 2 /O <00> /U <00> /P -4 >>' },
      ],
      '/Encrypt 9 0 R /ID [<00> <00>]',
    );
    await openFile(fileOf(encrypted, 'encrypted.pdf'));
    expect(callbacks.documents).toHaveLength(0);
    expect(element.querySelector('[role=alert]')?.textContent).toContain('pdf.error.encrypted');

    await openFile(fileOf(notAPdf(), 'not-a.pdf'));
    expect(callbacks.documents).toHaveLength(0);
    expect(element.querySelector('[role=alert]')?.textContent).toContain('pdf.error.parseFailed');
  });

  it('正常两页报告通过预检并渲染出两页', async () => {
    const report = buildImagePdf([
      { jpeg: new Uint8Array(1024).fill(1), width: 794, height: 1123 },
      { jpeg: new Uint8Array(1024).fill(2), width: 794, height: 1123 },
    ]);
    await openFile(fileOf(report, 'report.pdf'));
    expect(callbacks.documents).toHaveLength(1);
    await act(async () => {
      callbacks.documents.at(-1)?.onLoadSuccess(mockPdf(2));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect([...element.querySelectorAll('canvas')].map((canvas) => canvas.getAttribute('data-page'))).toEqual([
      '1',
      '2',
    ]);
    expect(element.querySelector('[role=alert]')).toBeNull();
  });

  it('被新选择取代的预检结果不会挂载旧文档（过期回调被丢弃）', async () => {
    const first = fileOf(twoPageReportPdf(), 'first.pdf');
    const second = fileOf(twoPageReportPdf(), 'second.pdf');
    // 不 await：让 first 的异步预检悬空，随后立刻改选 second
    callbacks.open?.(first);
    await openFile(second);
    expect(callbacks.documents).toHaveLength(1);
    expect(callbacks.documents[0].file).toBe(second);
  });

  it('过期 Document 的 onLoadSuccess 迟到时不会影响当前文档', async () => {
    const first = fileOf(twoPageReportPdf(), 'first.pdf');
    const second = fileOf(twoPageReportPdf(), 'second.pdf');
    await openFile(first);
    const stale = callbacks.documents.at(-1);
    await openFile(second);
    // 迟到的旧回调带着超限页数：若未被丢弃会立刻触发 pdf.error.pageLimit
    await act(async () => {
      stale?.onLoadSuccess(mockPdf(PDF_LIMITS.pages + 1));
      await Promise.resolve();
    });
    expect(element.querySelector('[role=alert]')).toBeNull();
    expect(callbacks.documents).toHaveLength(2);
  });

  it('过期 Document 的 onLoadError 迟到时不会打断当前文档', async () => {
    const first = fileOf(twoPageReportPdf(), 'first.pdf');
    const second = fileOf(twoPageReportPdf(), 'second.pdf');
    await openFile(first);
    const stale = callbacks.documents.at(-1);
    await openFile(second);
    await act(async () => {
      callbacks.documents.at(-1)?.onLoadSuccess(mockPdf(2));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(element.querySelectorAll('canvas')).toHaveLength(2);
    await act(async () => {
      stale?.onLoadError?.(new Error('stale load failure'));
      await Promise.resolve();
    });
    expect(element.querySelector('[role=alert]')).toBeNull();
    expect(element.querySelectorAll('canvas')).toHaveLength(2);
  });
});
