// @vitest-environment jsdom
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type PageCallbacks = { pageNumber: number; onRenderSuccess: () => void; onRenderError: (error: Error) => void };
type DocumentCallbacks = { file?: Blob; children?: ReactNode; onLoadSuccess: (pdf: PDFDocumentProxy) => void };
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
  const load = async (pages = 2) => {
    await act(async () => callbacks.open?.(new File(['local fixture'], 'report.pdf', { type: 'application/pdf' })));
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
    await act(async () => callbacks.open?.(new File(['local fixture'], 'report.pdf', { type: 'application/pdf' })));
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
});
