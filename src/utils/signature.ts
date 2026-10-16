/**
 * 签名图（PNG data URL）的唯一强校验器（审查 F11）。
 *
 * 浏览器渲染、下载、以及演示后端的验收 mutation 必须共用这一个实现：
 * 只检查 data URL 前缀与最小长度是不够的——畸形载荷会被持久化成「已验收」的工单。
 * 这里逐层收紧：类型 → 长度 → canonical 前缀 → base64 合法性 → PNG magic → IHDR
 * → 宽高与像素上限 → 每个 chunk（含 IEND）的长度与 CRC → IHDR 字段取值（位深 / 色彩类型 /
 * 压缩 / 过滤 / 交错）→ PLTE 与色彩类型匹配 → IDAT 存在且连续 → IDAT 是 zlib 流，
 * 且解压字节数恰好等于 IHDR 推出的扫描行大小（解压按该大小设上限，不会被压缩炸弹撑爆）。
 *
 * 所有上限集中在 SIGNATURE_LIMITS，避免调用方各写一套。
 */
import { InflateLimitError, inflateFlate } from './inflate';
export const SIGNATURE_LIMITS = {
  /** data URL 的最大字符数（约 2.25 MiB 解码后） */
  maxDataUrlLength: 3 * 1024 * 1024,
  /** 解码后 PNG 的最大字节数（约 2 MiB） */
  maxDecodedBytes: 2 * 1024 * 1024,
  /** 单边最大像素 */
  maxDimension: 4096,
  /** 最大总像素 */
  maxPixels: 4_000_000,
} as const;

const PREFIX = 'data:image/png;base64,';
/** PNG 规范允许的「色彩类型 → 位深」组合 */
const COLOR_TYPE_DEPTHS: Record<number, readonly number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};
const COLOR_TYPE_CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
/** Adam7 七遍的 [起始 x, 起始 y, x 步长, y 步长] */
const ADAM7_PASSES = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
] as const;
const PNG_MAGIC = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const IHDR_TYPE = 0x49484452;

/** PNG 标准 CRC-32（IEEE 802.3），用于 chunk 完整性校验 */
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

/** 严格 base64：长度 4 的倍数、只含合法字符、padding 只在末尾、无空白 */
const isCanonicalBase64 = (value: string) =>
  value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);

/** 一组扫描行（每行 1 字节过滤类型 + 像素数据）解压后的字节数；空的一遍不占任何字节 */
const scanlineBytes = (width: number, height: number, bitsPerPixel: number) =>
  width && height ? height * (1 + Math.ceil((width * bitsPerPixel) / 8)) : 0;

/** IHDR 推出的 IDAT 解压后应有的字节数（交错图按 Adam7 七遍累加） */
const expectedImageBytes = (width: number, height: number, bitDepth: number, colorType: number, interlace: number) => {
  const bitsPerPixel = bitDepth * COLOR_TYPE_CHANNELS[colorType]!;
  if (!interlace) return scanlineBytes(width, height, bitsPerPixel);
  return ADAM7_PASSES.reduce(
    (sum, [x, y, dx, dy]) =>
      sum +
      scanlineBytes(Math.ceil(Math.max(0, width - x) / dx), Math.ceil(Math.max(0, height - y) / dy), bitsPerPixel),
    0,
  );
};

/**
 * 走一遍 PNG chunk 链：长度前缀必须落在缓冲区内，每个 chunk（含 IEND）的 CRC 与内容一致，
 * 关键 chunk 的顺序与取值合法，IDAT 解压后恰好是 IHDR 描述的图像大小。
 * 返回 undefined 表示结构合法；否则返回失败原因（仅用于测试断言，不外泄给用户）。
 */
const inspectPngChunks = (bytes: Uint8Array): string | undefined => {
  let offset = 8; // 跳过 magic
  let ihdr: { width: number; height: number; bitDepth: number; colorType: number; interlace: number } | undefined;
  let sawPlte = false;
  let sawIend = false;
  /** IDAT 必须连续出现：开始后遇到别的 chunk 即视为结束，之后再出现 IDAT 判非法 */
  let idatState: 'before' | 'inside' | 'after' = 'before';
  const idatParts: Uint8Array[] = [];
  let idatLength = 0;
  while (offset < bytes.length) {
    // chunk = 4 字节长度 + 4 字节类型 + 数据 + 4 字节 CRC
    if (offset + 12 > bytes.length) return 'truncated chunk header';
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    const length = view.getUint32(0);
    if (length > bytes.length) return 'chunk length exceeds payload';
    const end = offset + 12 + length;
    if (end > bytes.length) return 'chunk data exceeds payload';
    const type = String.fromCharCode(bytes[offset + 4]!, bytes[offset + 5]!, bytes[offset + 6]!, bytes[offset + 7]!);
    // 先校验 CRC 再按类型处理：IEND 也不例外（此前在 CRC 之前就跳出了遍历）
    const expected = new DataView(bytes.buffer, bytes.byteOffset + offset + 8 + length, 4).getUint32(0);
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== expected) return `CRC mismatch in ${type}`;
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      if (ihdr) return 'duplicate IHDR';
      if (length !== 13) return 'IHDR length is not 13';
      const fields = new DataView(data.buffer, data.byteOffset, 13);
      const bitDepth = fields.getUint8(8);
      const colorType = fields.getUint8(9);
      const interlace = fields.getUint8(12);
      if (!COLOR_TYPE_DEPTHS[colorType]?.includes(bitDepth)) return 'invalid bit depth / color type';
      if (fields.getUint8(10) !== 0) return 'invalid compression method';
      if (fields.getUint8(11) !== 0) return 'invalid filter method';
      if (interlace !== 0 && interlace !== 1) return 'invalid interlace method';
      ihdr = { width: fields.getUint32(0), height: fields.getUint32(4), bitDepth, colorType, interlace };
    } else if (!ihdr) {
      return 'first chunk is not IHDR';
    } else if (type === 'PLTE') {
      if (sawPlte) return 'duplicate PLTE';
      if (idatState !== 'before') return 'PLTE after IDAT';
      if (ihdr.colorType === 0 || ihdr.colorType === 4) return 'PLTE in a grayscale image';
      if (length === 0 || length % 3 !== 0 || length / 3 > 2 ** ihdr.bitDepth) return 'invalid PLTE length';
      sawPlte = true;
    } else if (type === 'IDAT') {
      if (idatState === 'after') return 'IDAT chunks are not consecutive';
      if (ihdr.colorType === 3 && !sawPlte) return 'missing PLTE';
      idatState = 'inside';
      idatParts.push(data);
      idatLength += length;
    } else if (idatState === 'inside') {
      idatState = 'after';
    }
    if (type === 'IEND') {
      if (length !== 0) return 'IEND length is not 0';
      sawIend = true;
      if (end !== bytes.length) return 'trailing data after IEND';
      break;
    }
    offset = end;
  }
  if (!ihdr) return 'missing IHDR';
  if (!sawIend) return 'missing IEND';
  if (!idatParts.length) return 'missing IDAT';

  // IDAT 拼起来是一个 zlib 流，解压后必须恰好是 IHDR 描述的扫描行大小；
  // 以该大小为上限解压，压缩炸弹在越界处立即中止，不保留解压结果
  const imageBytes = expectedImageBytes(ihdr.width, ihdr.height, ihdr.bitDepth, ihdr.colorType, ihdr.interlace);
  const stream = new Uint8Array(idatLength);
  let cursor = 0;
  for (const part of idatParts) {
    stream.set(part, cursor);
    cursor += part.length;
  }
  let decoded: number;
  try {
    decoded = inflateFlate(stream, { limit: imageBytes });
  } catch (error) {
    return error instanceof InflateLimitError ? 'IDAT decodes past the image size' : 'IDAT is not a valid zlib stream';
  }
  if (decoded !== imageBytes) return 'IDAT size does not match IHDR';
  return undefined;
};

/** 内部：返回校验结果与失败原因，便于测试精确断言失败层级 */
export const inspectSignature = (value: unknown): { ok: true; value: string } | { ok: false; reason: string } => {
  if (typeof value !== 'string') return { ok: false, reason: 'not a string' };
  if (value.length > SIGNATURE_LIMITS.maxDataUrlLength) return { ok: false, reason: 'payload too large' };
  if (!value.startsWith(PREFIX)) return { ok: false, reason: 'not a canonical PNG data URL' };
  const encoded = value.slice(PREFIX.length);
  if (!isCanonicalBase64(encoded)) return { ok: false, reason: 'invalid base64' };
  // 4/3 比例 + padding：解码后的字节数必须在上限内，避免先分配再校验
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  const decodedLength = (encoded.length / 4) * 3 - padding;
  if (decodedLength < 45) return { ok: false, reason: 'too short to be a PNG' };
  if (decodedLength > SIGNATURE_LIMITS.maxDecodedBytes) return { ok: false, reason: 'decoded payload too large' };

  let bytes: Uint8Array;
  try {
    const binary = atob(encoded);
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return { ok: false, reason: 'invalid base64' };
  }
  if (bytes.length !== decodedLength) return { ok: false, reason: 'base64 length mismatch' };
  if (PNG_MAGIC.some((byte, index) => bytes[index] !== byte)) return { ok: false, reason: 'not a PNG' };

  const header = new DataView(bytes.buffer, bytes.byteOffset, 26);
  if (header.getUint32(8) !== 13) return { ok: false, reason: 'IHDR length is not 13' };
  if (header.getUint32(12) !== IHDR_TYPE) return { ok: false, reason: 'IHDR signature missing' };
  const width = header.getUint32(16);
  const height = header.getUint32(20);
  if (!width || !height) return { ok: false, reason: 'zero dimension' };
  if (width > SIGNATURE_LIMITS.maxDimension || height > SIGNATURE_LIMITS.maxDimension)
    return { ok: false, reason: 'dimension out of range' };
  if (width * height > SIGNATURE_LIMITS.maxPixels) return { ok: false, reason: 'pixel budget exceeded' };

  const chunkProblem = inspectPngChunks(bytes);
  if (chunkProblem) return { ok: false, reason: chunkProblem };

  return { ok: true, value };
};

/**
 * 唯一对外入口：合法时返回原值，否则 undefined。
 * 渲染 / 下载 / mutation 三处都必须用它，不允许内联前缀判断。
 */
export const safeSignature = (value: unknown): string | undefined => {
  const result = inspectSignature(value);
  return result.ok ? result.value : undefined;
};
