import DemoPage from '@/components/DemoPage';
import { useApi } from '@/hooks/useApi';
import { getDashboardOverview } from '@/services/ops';
import { DownloadOutlined, FileSyncOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Space, Spin, Upload } from 'antd';
import html2canvas from 'html2canvas';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { PdfPreflightAborted, preflightFailure, preflightPdf } from './pdfPreflight';
import { buildImagePdf, dataUrlToBytes } from './pdfWriter';
import {
  PDF_LIMITS,
  PdfInputError,
  checkPdfFileSize,
  checkPdfPageCount,
  checkPdfViewport,
  pdfPageWindow,
} from './previewLimits';
import ReportSheet, { SHEET } from './ReportSheet';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// 静态资源根路径经 PUBLIC_PATH 拼接：主产线 '/'、GitHub Pages '/umi-react-admin/'
const PDF_OPTIONS = {
  cMapUrl: `${PUBLIC_PATH}cmaps/`,
  isEvalSupported: false,
  maxImageSize: PDF_LIMITS.imagePixels,
  canvasMaxAreaInBytes: PDF_LIMITS.canvasBytes,
  stopAtErrors: true,
  standardFontDataUrl: `${PUBLIC_PATH}standard_fonts/`,
};
/** 图表动画结束后再截图 */
const CHART_SETTLE_MS = 1200;
const PAGE_WINDOW = PDF_LIMITS.window;

type RenderWindow = {
  selection: number;
  generation: number;
  index: number;
  width: number;
  pages: number[];
  rendered: number[];
};

/**
 * 读取 Blob 字节。优先 `arrayBuffer()`（微任务，浏览器与 jsdom 都可用），
 * 仅在缺失时退回 FileReader，保证预检前的读取不依赖 timer。
 */
const readBlobBytes = (blob: Blob): Promise<Uint8Array> =>
  typeof blob.arrayBuffer === 'function'
    ? blob.arrayBuffer().then((buffer) => new Uint8Array(buffer))
    : new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error('pdf read failed'));
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.readAsArrayBuffer(blob);
      });

/**
 * pdf.js 的 PDFDocumentProxy 在**运行时**有 destroy()（build/pdf.mjs:16529，由 destroyCapability
 * 保护、可重复调用），但安装的 pdfjs-dist 类型只在 PDFDocumentLoadingTask 上声明了 destroy()。
 * 这里用一个最小结构扩展描述运行时事实，而不是把整个代理断言成 any（其余成员仍受类型约束）。
 */
type DestroyableDocument = PDFDocumentProxy & { destroy?: () => Promise<void> };

/**
 * 释放 PDF 文档资源。卸载 `<Document>` 时 react-pdf 自身的 cleanup 会 dispose 其 loading task；
 * 这里再显式 destroy 一次作为兜底，并延后到下一个宏任务，保证顺序是「先卸载、后销毁」。
 * pdf.js 侧的 destroy 是幂等的（PDFDocumentLoadingTask.destroy 置 destroyed；
 * PDFDocumentProxy.destroy 由 destroyCapability 短路），重复调用安全。
 */
const releaseDocument = (pdf?: DestroyableDocument) => {
  // 先把方法取到局部变量：可选属性的收窄不会跨越闭包边界
  const destroy = pdf?.destroy;
  if (typeof destroy !== 'function') return;
  setTimeout(() => {
    try {
      // Promise.resolve 兜住「返回非 Promise」的 mock/旧实现
      void Promise.resolve(destroy.call(pdf)).catch(() => undefined);
    } catch {
      // 已经销毁或正在销毁：无需处理
    }
  }, 0);
};

export default function Pdf() {
  const intl = useIntl();
  // t/loadFailure/open 必须跨渲染保持同一身份：三个 effect 依赖它们，一旦每次渲染都变化，
  // 校验 effect 就会不断重启并反复置状态（无限渲染）。intl 的**身份**不保证稳定，
  // 因此用 latest-ref 读取它，而不是把 intl 放进 useCallback 依赖。
  const intlRef = useRef(intl);
  useEffect(() => {
    intlRef.current = intl;
  }, [intl]);
  const t = useCallback(
    (id: string, values?: Record<string, string | number>) => intlRef.current.formatMessage({ id }, values),
    [],
  );
  const { data: overview } = useApi(getDashboardOverview);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<Blob>();
  const [selection, setSelection] = useState<{ version: number; file: Blob | File }>();
  const [loaded, setLoaded] = useState<{ version: number; pdf: PDFDocumentProxy }>();
  const [renderWindow, setRenderWindow] = useState<RenderWindow>();
  const [numPages, setNumPages] = useState<number>();
  const [pageIndex, setPageIndex] = useState(0);
  const [loadError, setLoadError] = useState<string>();
  const selectionVersion = useRef(0);
  const renderGeneration = useRef(0);
  const mounted = useRef(true);
  /** 当前选择的取消信号：换文件 / 失败 / 卸载都会 abort，让预检与解析立即停止 */
  const abortRef = useRef<AbortController | undefined>(undefined);
  /** 当前持有的 PDF 文档，用于显式 destroy */
  const pdfRef = useRef<DestroyableDocument | undefined>(undefined);
  /** 已生成的对象 URL，卸载时统一 revoke */
  const urlRef = useRef(new Set<string>());
  const file = selection?.file;
  const displayWidth = Math.max(160, Math.min(794, window.innerWidth - 96));

  useEffect(() => {
    // 在 effect 内固定引用：Set 实例本身从不被替换，cleanup 里必须用它而不是 urlRef.current
    const trackedUrls = urlRef.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      selectionVersion.current += 1;
      renderGeneration.current += 1;
      abortRef.current?.abort();
      releaseDocument(pdfRef.current);
      pdfRef.current = undefined;
      for (const url of trackedUrls) URL.revokeObjectURL(url);
      trackedUrls.clear();
    };
  }, []);

  const loadFailure = useCallback(
    (version: number, error: unknown) => {
      // 过期回调（旧文件 / 旧窗口）不得影响当前状态
      if (!mounted.current || selectionVersion.current !== version) return;
      selectionVersion.current += 1;
      renderGeneration.current += 1;
      abortRef.current?.abort();
      releaseDocument(pdfRef.current);
      pdfRef.current = undefined;
      setSelection(undefined); // Unmounting Document destroys its loading/render tasks.
      setLoaded(undefined);
      setRenderWindow(undefined);
      setNumPages(undefined);
      setLoadError(t(error instanceof PdfInputError ? `pdf.error.${error.code}` : 'pdf.loadFailed'));
    },
    [t],
  );

  const open = useCallback(
    (next: Blob | File) => {
      const version = ++selectionVersion.current;
      renderGeneration.current += 1;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPageIndex(0);
      setNumPages(undefined);
      setLoaded(undefined);
      setRenderWindow(undefined);
      try {
        checkPdfFileSize(next.size);
      } catch (error) {
        loadFailure(version, error);
        return;
      }
      setLoadError(undefined);
      // F13：容器级预检必须在文件交给 react-pdf 之前完成。
      // 这里只读取字节并做结构化预算判定，不解码页面、不创建画布。
      void (async () => {
        try {
          const bytes = await readBlobBytes(next);
          if (controller.signal.aborted || selectionVersion.current !== version) return;
          const report = preflightPdf(bytes, { signal: controller.signal });
          if (controller.signal.aborted || selectionVersion.current !== version) return;
          if (!report.ok) throw new PdfInputError(preflightFailure(report));
          setSelection({ version, file: next });
        } catch (error) {
          // 已取消或已被更新的选择取代：丢弃这个过期结果
          if (controller.signal.aborted || selectionVersion.current !== version) return;
          if (error instanceof PdfPreflightAborted) return;
          loadFailure(version, error);
        }
      })();
    },
    [loadFailure],
  );

  // 报告页渲染完成后逐页截图（2 倍分辨率）并封装为 PDF
  useEffect(() => {
    if (!overview || report) return undefined;
    let cancelled = false;
    const initialSelection = selectionVersion.current;
    const timer = setTimeout(async () => {
      try {
        const sheets = [...(sheetRef.current?.querySelectorAll<HTMLElement>('.report-sheet') ?? [])];
        const pages = [];
        if (sheets.length !== 2) throw new PdfInputError('pageLimit');
        // 逐页截图（并发截图会互相抢主线程，反而更慢）
        for (const sheet of sheets) {
          if (cancelled) return;
          const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: '#ffffff' });
          try {
            if (cancelled) return;
            if (canvas.width * canvas.height > PDF_LIMITS.imagePixels) throw new PdfInputError('canvasLimit');
            pages.push({
              jpeg: dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.92)),
              width: canvas.width,
              height: canvas.height,
            });
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
        if (cancelled) return;
        const blob = new Blob([buildImagePdf(pages) as BlobPart], { type: 'application/pdf' });
        setReport(blob);
        // Finishing a report must not replace a file the user selected meanwhile.
        if (selectionVersion.current === initialSelection) open(blob);
      } catch (error) {
        if (!cancelled && selectionVersion.current === initialSelection) loadFailure(initialSelection, error);
      }
    }, CHART_SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [overview, report, open, loadFailure]);

  // Validate only the requested pages before React-PDF can allocate their canvases.
  useEffect(() => {
    if (!loaded || loaded.version !== selectionVersion.current) return undefined;
    let cancelled = false;
    const generation = ++renderGeneration.current;
    setRenderWindow(undefined);
    void (async () => {
      const numbers = pdfPageWindow(loaded.pdf.numPages, pageIndex);
      for (const number of numbers) {
        const page = await loaded.pdf.getPage(number);
        if (cancelled || loaded.version !== selectionVersion.current || generation !== renderGeneration.current) return;
        checkPdfViewport(page.getViewport({ scale: 1 }), displayWidth);
      }
      if (!cancelled && loaded.version === selectionVersion.current && generation === renderGeneration.current) {
        setRenderWindow({
          selection: loaded.version,
          generation,
          index: pageIndex,
          width: displayWidth,
          pages: numbers,
          rendered: [],
        });
      }
    })().catch((error: unknown) => {
      if (!cancelled && loaded.version === selectionVersion.current && generation === renderGeneration.current) {
        loadFailure(loaded.version, error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, pageIndex, displayWidth, loadFailure]);

  const renderComplete =
    renderWindow?.selection === selection?.version &&
    renderWindow?.index === pageIndex &&
    renderWindow?.width === displayWidth &&
    !!renderWindow?.pages.length &&
    renderWindow.pages.every((page) => renderWindow.rendered.includes(page));

  useEffect(() => {
    if (!selection || renderComplete) return undefined;
    // The deadline covers document loading, page geometry and actual rendering of every visible page.
    const timer = setTimeout(() => loadFailure(selection.version, new PdfInputError('timeout')), PDF_LIMITS.timeoutMs);
    return () => clearTimeout(timer);
  }, [selection, pageIndex, renderComplete, loadFailure]);

  const renderFailure = (frame: RenderWindow, error: Error) => {
    if (frame.generation === renderGeneration.current) loadFailure(frame.selection, error);
  };

  const rendered = (frame: RenderWindow, page: number) => {
    if (
      !mounted.current ||
      frame.generation !== renderGeneration.current ||
      frame.selection !== selectionVersion.current
    )
      return;
    setRenderWindow((current) => {
      if (!current || current.generation !== frame.generation || current.rendered.includes(page)) return current;
      return { ...current, rendered: [...current.rendered, page] };
    });
  };

  const moveWindow = (delta: number) => {
    renderGeneration.current += 1;
    setRenderWindow(undefined);
    setPageIndex((index) => Math.max(0, index + delta));
  };

  const download = () => {
    if (!report) return;
    const url = URL.createObjectURL(report);
    urlRef.current.add(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monthly-report.pdf';
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      urlRef.current.delete(url);
    }, 0);
  };

  return (
    <DemoPage
      descriptionId="page.pdf.desc"
      source="src/pages/Document/Pdf/pdfWriter.ts"
      extra={
        <Space wrap>
          {report && file !== report && (
            <Button icon={<FileSyncOutlined />} onClick={() => report && open(report)}>
              {t('pdf.backToReport')}
            </Button>
          )}
          <Upload accept="application/pdf,.pdf" showUploadList={false} beforeUpload={(f) => (open(f), false)}>
            <Button icon={<FolderOpenOutlined />}>{t('pdf.loadFile')}</Button>
          </Upload>
          <Button type="primary" icon={<DownloadOutlined />} disabled={!report} onClick={download}>
            {t('pdf.download')}
          </Button>
        </Space>
      }
    >
      <Card styles={{ body: { background: 'var(--ant-color-fill-tertiary)' } }}>
        {loadError && (
          <Alert showIcon type="warning" className="mb-4" title={t('pdf.loadFailed')} description={loadError} />
        )}
        {!file && !loadError ? (
          <div className="flex min-h-[480px] items-center justify-center">
            <Spin description={t('pdf.generating')}>
              <div className="h-24 w-64" />
            </Spin>
          </div>
        ) : (
          <>
            {/* react-pdf 11 默认走 Suspense + Error Boundary；本页沿用 onLoadError 驱动的告警，关闭 suspense */}
            <Document
              key={selection?.version}
              suspense={false}
              file={file}
              options={PDF_OPTIONS}
              onLoadSuccess={(pdf) => {
                const version = selection?.version;
                if (version === undefined || version !== selectionVersion.current) return; // 过期回调
                try {
                  checkPdfPageCount(pdf.numPages);
                  pdfRef.current = pdf;
                  setNumPages(pdf.numPages);
                  setLoaded({ version, pdf });
                } catch (error) {
                  loadFailure(version, error);
                }
              }}
              onLoadError={(error: Error) => {
                const version = selection?.version;
                if (version === undefined || version !== selectionVersion.current) return; // 过期回调
                loadFailure(version, error);
              }}
              onSourceError={(error: Error) => {
                const version = selection?.version;
                if (version === undefined || version !== selectionVersion.current) return; // 过期回调
                loadFailure(version, error);
              }}
              className="flex flex-col items-center gap-4"
            >
              {renderWindow &&
                renderWindow.pages.map((number) => (
                  <Page
                    key={`${renderWindow.generation}-${number}`}
                    pageNumber={number}
                    width={renderWindow.width}
                    devicePixelRatio={Math.min(window.devicePixelRatio || 1, PDF_LIMITS.devicePixelRatio)}
                    // F13：关闭注释层与文本层。二者是 <Page> 的独立解码边界：
                    // renderAnnotationLayer=false 时 react-pdf 不再调用 getAnnotations()，
                    // renderTextLayer=false 时不再调用 getTextContent()（表单默认关闭且依赖注释层）。
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    onLoadError={(error: Error) => renderFailure(renderWindow, error)}
                    onRenderError={(error: Error) => renderFailure(renderWindow, error)}
                    onRenderSuccess={() => rendered(renderWindow, number)}
                    className="shadow-lg"
                  />
                ))}
            </Document>
            {numPages && numPages > PAGE_WINDOW ? (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button disabled={pageIndex === 0} onClick={() => moveWindow(-PAGE_WINDOW)}>
                  {t('pdf.prev')}
                </Button>
                <span>
                  {t('pdf.pages', {
                    from: pageIndex + 1,
                    to: Math.min(pageIndex + PAGE_WINDOW, numPages),
                    total: numPages,
                  })}
                </span>
                <Button disabled={pageIndex + PAGE_WINDOW >= numPages} onClick={() => moveWindow(PAGE_WINDOW)}>
                  {t('pdf.next')}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>
      {/* 屏幕外渲染报告纸面：只用于截图生成 PDF，生成后卸载 */}
      {overview && !report && (
        <div aria-hidden className="pointer-events-none fixed top-0" style={{ left: -SHEET.width * 2 }}>
          <ReportSheet ref={sheetRef} overview={overview} />
        </div>
      )}
    </DemoPage>
  );
}
