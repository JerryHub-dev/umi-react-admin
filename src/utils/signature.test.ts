import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { inspectSignature, safeSignature } from './signature';

/**
 * 1×1 真实 PNG（IHDR/IDAT/IEND 三个 chunk 的 CRC 全部正确）。
 * 注意：本文件原来的夹具 IDAT CRC 是错的（stored 0xef9a2f5b vs 实际 0xefa2a75b），
 * 旧的弱校验器只看 magic+IHDR 所以放行；F11 改成强校验后它被判失败——这是夹具的问题，
 * 不是校验器过严。真实来源（canvas.toDataURL 与 src/demo/signatureSample.ts 的 400×160 样本）
 * 都能通过，下面的用例把这两件事都固定下来。
 */
const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** 把 base64 夹具的某个 chunk 尾部 CRC 改一个 bit，用来验证 CRC 真的在生效 */
const corruptChunkCrc = (dataUrl: string, chunkType: string) => {
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]!), (char) => char.charCodeAt(0));
  let offset = 8;
  while (offset < bytes.length) {
    const length = new DataView(bytes.buffer, offset, 4).getUint32(0);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (type === chunkType) {
      bytes[offset + 8 + length] = bytes[offset + 8 + length]! ^ 0x01;
      break;
    }
    offset += 12 + length;
  }
  return `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;
};

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

  // ---- F11：chunk 结构与 CRC 必须真实生效（不是只判前缀长度）----
  it('accepts a byte-exact well-formed PNG', () => {
    expect(inspectSignature(png)).toEqual({ ok: true, value: png });
  });

  it('rejects a PNG whose IDAT CRC does not match its content', () => {
    const broken = corruptChunkCrc(png, 'IDAT');
    expect(broken).not.toBe(png);
    expect(inspectSignature(broken)).toEqual({ ok: false, reason: 'CRC mismatch in IDAT' });
    expect(safeSignature(broken)).toBeUndefined();
  });

  it('rejects a PNG whose IHDR CRC does not match its content', () => {
    expect(inspectSignature(corruptChunkCrc(png, 'IHDR'))).toEqual({ ok: false, reason: 'CRC mismatch in IHDR' });
  });

  it('rejects a payload truncated inside the chunk chain', () => {
    const encoded = png.split(',')[1]!;
    const truncated = encoded.slice(0, encoded.length - 16);
    expect(inspectSignature(`data:image/png;base64,${truncated}`)).toMatchObject({ ok: false });
  });

  it('rejects data appended after IEND', () => {
    const bytes = Uint8Array.from(atob(png.split(',')[1]!), (char) => char.charCodeAt(0));
    const extended = Uint8Array.from([...bytes, 0x00, 0x00, 0x00, 0x00]);
    const url = `data:image/png;base64,${btoa(String.fromCharCode(...extended))}`;
    expect(inspectSignature(url)).toEqual({ ok: false, reason: 'trailing data after IEND' });
  });

  it('rejects non-canonical base64 (whitespace, padding in the middle, bad charset)', () => {
    const encoded = png.split(',')[1]!;
    const variants = [
      `${encoded.slice(0, 8)} ${encoded.slice(8)}`,
      `AA==${encoded.slice(4)}`,
      `${encoded.slice(0, -4)}!!==`,
    ];
    const results = variants.map((bad) => [bad.slice(0, 12), safeSignature(`data:image/png;base64,${bad}`)] as const);
    expect(results.filter(([, value]) => value !== undefined)).toEqual([]);
  });

  it('accepts the bundled synthetic demo signature (real 400x160 canvas output)', async () => {
    const { SYNTHETIC_SIGNATURE_PNG } = await import('@/demo/signatureSample');
    // 真实产物的回归：强校验不能把演示与画布自己生成的签名判失败
    expect(safeSignature(SYNTHETIC_SIGNATURE_PNG)).toBe(SYNTHETIC_SIGNATURE_PNG);
  });
});

// ---------------------------------------------------------------------------
// 2026-10-15 只读审查：结构畸形但 CRC 正确的 PNG 必须被拒（不能只看 chunk 链与 CRC）
// ---------------------------------------------------------------------------

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: number[]) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const u32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
const chunk = (type: string, payload: number[]) => {
  const body = [...[...type].map((char) => char.charCodeAt(0)), ...payload];
  return [...u32(payload.length), ...body, ...u32(crc32(body))];
};

type PngSpec = {
  width?: number;
  height?: number;
  bitDepth?: number;
  colorType?: number;
  compression?: number;
  filter?: number;
  interlace?: number;
  /** 解压后的扫描行字节数；缺省按 IHDR 精确计算（交错图按 Adam7 七遍累加） */
  rawBytes?: number;
  /** 直接给 IDAT 的数据（跳过 zlib 压缩） */
  idat?: number[];
  /** 在 IHDR 与 IDAT 之间插入的 chunk，如 PLTE */
  before?: number[][];
  /** IDAT 之后、IEND 之前插入的 chunk */
  after?: number[][];
  omitIdat?: boolean;
};

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];
const scanlineBytes = (width: number, height: number, bits: number) =>
  width && height ? height * (1 + Math.ceil((width * bits) / 8)) : 0;
const expectedRaw = ({ width = 8, height = 8, bitDepth = 8, colorType = 6, interlace = 0 }: PngSpec) => {
  const bits = bitDepth * (CHANNELS[colorType] ?? 1);
  if (!interlace) return scanlineBytes(width, height, bits);
  return ADAM7.reduce(
    (sum, [x, y, dx, dy]) =>
      sum + scanlineBytes(Math.ceil(Math.max(0, width - x!) / dx!), Math.ceil(Math.max(0, height - y!) / dy!), bits),
    0,
  );
};

const buildPng = (spec: PngSpec = {}) => {
  const { width = 8, height = 8, bitDepth = 8, colorType = 6, compression = 0, filter = 0, interlace = 0 } = spec;
  const raw = spec.rawBytes ?? expectedRaw(spec);
  const idat = spec.idat ?? [...deflateSync(Buffer.alloc(raw))];
  const bytes = [
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunk('IHDR', [...u32(width), ...u32(height), bitDepth, colorType, compression, filter, interlace]),
    ...(spec.before ?? []).flat(),
    ...(spec.omitIdat ? [] : chunk('IDAT', idat)),
    ...(spec.after ?? []).flat(),
    ...chunk('IEND', []),
  ];
  return `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;
};
const PLTE = chunk('PLTE', [0, 0, 0, 255, 255, 255]);

describe('PNG 结构语义（审查残留：CRC 正确但结构畸形）', () => {
  it('合法的生成图都通过：RGBA8、1 位灰度、带 PLTE 的 2 位调色板、Adam7 交错 RGB', () => {
    for (const spec of [
      {},
      { width: 3, height: 5, bitDepth: 1, colorType: 0 },
      { width: 4, height: 4, bitDepth: 2, colorType: 3, before: [PLTE] },
      { width: 9, height: 9, bitDepth: 8, colorType: 2, interlace: 1 },
    ]) {
      expect({ spec, result: inspectSignature(buildPng(spec)) }).toMatchObject({ result: { ok: true } });
    }
  });

  it('没有 IDAT 的 PNG 被拒', () => {
    expect(inspectSignature(buildPng({ omitIdat: true }))).toEqual({ ok: false, reason: 'missing IDAT' });
  });

  it('IHDR 的位深 / 色彩类型 / 压缩 / 过滤 / 交错取值非法时被拒', () => {
    for (const spec of [
      { colorType: 2, bitDepth: 4 },
      { colorType: 5 },
      { colorType: 6, bitDepth: 7 },
      { colorType: 0, bitDepth: 3 },
      { compression: 1 },
      { filter: 1 },
      { interlace: 2 },
    ]) {
      expect({ spec, result: inspectSignature(buildPng(spec)) }).toMatchObject({ result: { ok: false } });
    }
  });

  it('IEND 的 CRC 也要校验（不能在校验前就结束遍历）', () => {
    expect(inspectSignature(corruptChunkCrc(png, 'IEND'))).toEqual({ ok: false, reason: 'CRC mismatch in IEND' });
  });

  it('IDAT 不是 zlib 流时被拒（即便 CRC 正确）', () => {
    const garbage = Array.from({ length: 64 }, (_, index) => (index * 37 + 11) & 0xff);
    expect(inspectSignature(buildPng({ idat: garbage }))).toMatchObject({ ok: false });
    // 头部合法、主体不是合法 DEFLATE
    expect(inspectSignature(buildPng({ idat: [0x78, 0x9c, 0xff, 0xff, 0xff, 0xff] }))).toMatchObject({ ok: false });
  });

  it('IDAT 解压字节数与 IHDR 不符时被拒（过短与过长都不行）', () => {
    const exact = expectedRaw({});
    expect(inspectSignature(buildPng({ rawBytes: exact - 1 }))).toMatchObject({ ok: false });
    expect(inspectSignature(buildPng({ rawBytes: exact + 1 }))).toMatchObject({ ok: false });
  });

  it('调色板图缺 PLTE、灰度图带 PLTE、IDAT 不连续时被拒', () => {
    expect(inspectSignature(buildPng({ width: 4, height: 4, bitDepth: 2, colorType: 3 }))).toMatchObject({ ok: false });
    expect(inspectSignature(buildPng({ colorType: 0, before: [PLTE] }))).toMatchObject({ ok: false });
    const raw = [...deflateSync(Buffer.alloc(expectedRaw({})))];
    const split = buildPng({ idat: raw.slice(0, 4), after: [chunk('tEXt', [65, 0, 66]), chunk('IDAT', raw.slice(4))] });
    expect(inspectSignature(split)).toMatchObject({ ok: false });
  });
});
