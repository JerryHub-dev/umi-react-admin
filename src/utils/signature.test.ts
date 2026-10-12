import { describe, expect, it } from 'vitest';
import { safeSignature } from './signature';

const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';

describe('signature image and download boundary', () => {
  it('preserves canvas PNG values', () => expect(safeSignature(png)).toBe(png));
  it.each([
    'javascript:alert(1)',
    'https://example.test/track',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/svg+xml,<svg/>',
    'data:image/png;base64,AAAA',
    undefined,
  ])('rejects other sources %s', (value) => {
    expect(safeSignature(value)).toBeUndefined();
  });
  it('rejects dimensions before the image decoder allocates a canvas', () => {
    const data = Uint8Array.from(atob(png.split(',')[1]!), (char) => char.charCodeAt(0));
    new DataView(data.buffer).setUint32(16, 0xffffffff);
    expect(safeSignature(`data:image/png;base64,${btoa(String.fromCharCode(...data))}`)).toBeUndefined();
  });
  it('rejects oversized encoded input', () => {
    expect(safeSignature(`data:image/png;base64,${'A'.repeat(3 * 1024 * 1024)}`)).toBeUndefined();
  });
});
