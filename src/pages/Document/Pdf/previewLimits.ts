export const PDF_LIMITS = {
  fileBytes: 20 * 1024 * 1024,
  pages: 1000,
  window: 2,
  imagePixels: 16 * 1024 * 1024,
  canvasBytes: 64 * 1024 * 1024,
  canvasSide: 8192,
  devicePixelRatio: 2,
  timeoutMs: 10_000,
} as const;

export class PdfInputError extends Error {
  constructor(public readonly code: 'fileLimit' | 'pageLimit' | 'canvasLimit' | 'parseFailed' | 'timeout') {
    super(code);
    this.name = 'PdfInputError';
  }
}

export const checkPdfFileSize = (size: number) => {
  if (!Number.isSafeInteger(size) || size <= 0) throw new PdfInputError('parseFailed');
  if (size > PDF_LIMITS.fileBytes) throw new PdfInputError('fileLimit');
};

export const checkPdfPageCount = (pages: number) => {
  if (!Number.isSafeInteger(pages) || pages <= 0 || pages > PDF_LIMITS.pages) throw new PdfInputError('pageLimit');
};

/** Allocate only the visible window, never an array proportional to document size. */
export const pdfPageWindow = (pages: number | undefined, index: number) => {
  if (pages === undefined) return [];
  checkPdfPageCount(pages);
  if (!Number.isSafeInteger(index) || index < 0 || index >= pages) throw new PdfInputError('pageLimit');
  return Array.from({ length: Math.min(PDF_LIMITS.window, pages - index) }, (_, offset) => index + offset + 1);
};

/** Check page geometry before mounting React-PDF's Canvas component. */
export const checkPdfViewport = ({ width, height }: { width: number; height: number }, displayWidth: number) => {
  if (![width, height, displayWidth].every((value) => Number.isFinite(value) && value > 0))
    throw new PdfInputError('canvasLimit');
  const canvasWidth = Math.ceil(displayWidth * PDF_LIMITS.devicePixelRatio);
  const canvasHeight = Math.ceil((height / width) * displayWidth * PDF_LIMITS.devicePixelRatio);
  if (
    canvasWidth > PDF_LIMITS.canvasSide ||
    canvasHeight > PDF_LIMITS.canvasSide ||
    canvasWidth * canvasHeight > PDF_LIMITS.imagePixels
  ) {
    throw new PdfInputError('canvasLimit');
  }
};
