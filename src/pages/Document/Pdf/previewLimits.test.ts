import { describe, expect, it } from 'vitest';
import { PDF_LIMITS, checkPdfFileSize, checkPdfPageCount, checkPdfViewport, pdfPageWindow } from './previewLimits';

describe('bounded PDF preview', () => {
  it('builds only the current two-page window, including the final odd page', () => {
    expect(pdfPageWindow(undefined, 0)).toEqual([]);
    expect(pdfPageWindow(1000, 0)).toEqual([1, 2]);
    expect(pdfPageWindow(1000, 998)).toEqual([999, 1000]);
    expect(pdfPageWindow(3, 2)).toEqual([3]);
  });

  it.each([0, -1, NaN, Infinity, 1.5, 1001, 1_000_000_000])(
    'rejects invalid/oversized page count %s before allocation',
    (pages) => {
      expect(() => checkPdfPageCount(pages)).toThrow('pageLimit');
      expect(() => pdfPageWindow(pages, 0)).toThrow('pageLimit');
    },
  );

  it('accepts the file-size boundary and rejects an oversize file before reading', () => {
    expect(() => checkPdfFileSize(PDF_LIMITS.fileBytes)).not.toThrow();
    expect(() => checkPdfFileSize(PDF_LIMITS.fileBytes + 1)).toThrow('fileLimit');
  });

  it('accepts A4 report geometry and rejects extreme aspect ratios/non-finite dimensions', () => {
    expect(() => checkPdfViewport({ width: 595.28, height: 841.89 }, 794)).not.toThrow();
    expect(() => checkPdfViewport({ width: 1, height: 1_000_000 }, 794)).toThrow('canvasLimit');
    expect(() => checkPdfViewport({ width: 0, height: 10 }, 794)).toThrow('canvasLimit');
    expect(() => checkPdfViewport({ width: NaN, height: 10 }, 794)).toThrow('canvasLimit');
  });
});
