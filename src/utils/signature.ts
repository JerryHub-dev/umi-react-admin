/** Only bounded PNG data produced by the signature canvas may reach image/download sinks. */
export const safeSignature = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length > 3 * 1024 * 1024) return undefined;
  const prefix = 'data:image/png;base64,';
  if (!value.startsWith(prefix)) return undefined;
  const encoded = value.slice(prefix.length);
  if (encoded.length < 44 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return undefined;
  try {
    const header = Uint8Array.from(atob(encoded.slice(0, 44)), (char) => char.charCodeAt(0));
    if ([137, 80, 78, 71, 13, 10, 26, 10].some((byte, index) => header[index] !== byte)) return undefined;
    const view = new DataView(header.buffer);
    if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452) return undefined;
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    if (!width || !height || width > 4096 || height > 4096 || width * height > 4_000_000) return undefined;
    return value;
  } catch {
    return undefined;
  }
};
