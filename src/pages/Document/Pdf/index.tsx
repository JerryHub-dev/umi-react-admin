import DemoPage from '@/components/DemoPage';
import { useApi } from '@/hooks/useApi';
import { getDashboardOverview } from '@/services/ops';
import { DownloadOutlined, FileSyncOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Space, Spin, Upload } from 'antd';
import html2canvas from 'html2canvas';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
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

export default function Pdf() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
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
  const file = selection?.file;
  const displayWidth = Math.max(160, Math.min(794, window.innerWidth - 96));

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      selectionVersion.current += 1;
      renderGeneration.current += 1;
    };
  }, []);

  const loadFailure = (version: number, error: unknown) => {
    if (!mounted.current || selectionVersion.current !== version) return;
    selectionVersion.current += 1;
    renderGeneration.current += 1;
    setSelection(undefined); // Unmounting Document destroys its loading/render tasks.
    setLoaded(undefined);
    setRenderWindow(undefined);
    setNumPages(undefined);
    setLoadError(t(error instanceof PdfInputError ? `pdf.error.${error.code}` : 'pdf.loadFailed'));
  };

  const open = (next: Blob | File) => {
    const version = ++selectionVersion.current;
    renderGeneration.current += 1;
    setPageIndex(0);
    setNumPages(undefined);
    setLoaded(undefined);
    setRenderWindow(undefined);
    try {
      checkPdfFileSize(next.size);
      setLoadError(undefined);
      setSelection({ version, file: next });
    } catch (error) {
      loadFailure(version, error);
    }
  };

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
  }, [overview, report]);

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
  }, [loaded, pageIndex, displayWidth]);

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
  }, [selection, pageIndex, renderComplete]);

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
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monthly-report.pdf';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
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
                if (version === undefined || version !== selectionVersion.current) return;
                try {
                  checkPdfPageCount(pdf.numPages);
                  setNumPages(pdf.numPages);
                  setLoaded({ version, pdf });
                } catch (error) {
                  loadFailure(version, error);
                }
              }}
              onLoadError={(error: Error) => selection && loadFailure(selection.version, error)}
              onSourceError={(error: Error) => selection && loadFailure(selection.version, error)}
              className="flex flex-col items-center gap-4"
            >
              {renderWindow &&
                renderWindow.pages.map((number) => (
                  <Page
                    key={`${renderWindow.generation}-${number}`}
                    pageNumber={number}
                    width={renderWindow.width}
                    devicePixelRatio={Math.min(window.devicePixelRatio || 1, PDF_LIMITS.devicePixelRatio)}
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
