/**
 * 生成演示用的合成签名 PNG（白底深色笔迹，400×160），输出 data URL 与 base64 长度。
 * 用于固定场景「已验收与返工」的预置验收记录——明确标注为合成示例，不冒充任何真人笔迹。
 *
 * 用法：node scripts/make-signature-png.mjs [--write src/demo/signatureSample.ts]
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 400;
const H = 160;

// 简单无衬线笔迹：三条参数曲线模拟连笔（正弦扰动 + 收笔抬笔的线宽变化）
const strokes = [
  { x0: 40, x1: 210, y: 95, amp: 26, freq: 2.1, phase: 0.4, width: 7 },
  { x0: 200, x1: 320, y: 70, amp: 18, freq: 1.6, phase: 1.1, width: 6 },
  { x0: 300, x1: 366, y: 100, amp: 22, freq: 1.2, phase: 2.3, width: 5 },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ink = (x, y) => {
  // 白底 255；笔迹深灰 30±，边缘按距离做 2 级抗锯齿
  for (const s of strokes) {
    const t = (x - s.x0) / (s.x1 - s.x0);
    if (t < -0.08 || t > 1.08) continue;
    const envelope = Math.sin(Math.PI * clamp(t, 0, 1)) ** 0.35; // 起笔收笔略细
    const cy = s.y + Math.sin(t * Math.PI * 2 * s.freq + s.phase) * s.amp * envelope;
    const w = (s.width * envelope) / 2;
    const d = Math.abs(y - cy);
    if (d <= w) return 30;
    if (d <= w + 1.2) return 120;
  }
  return 255;
};

const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0; // filter type 0
  for (let x = 0; x < W; x++) {
    const v = ink(x, y);
    const o = y * (1 + W * 4) + 1 + x * 4;
    raw[o] = v;
    raw[o + 1] = v;
    raw[o + 2] = v;
    raw[o + 3] = 255;
  }
}

const chunk = (type, data) => {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([head, body, tail]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const base64 = png.toString('base64');
const dataUrl = `data:image/png;base64,${base64}`;

if (process.argv.includes('--write')) {
  const target = process.argv[process.argv.indexOf('--write') + 1] ?? 'src/demo/signatureSample.ts';
  writeFileSync(
    target,
    `/**\n * 合成签名样本（scripts/make-signature-png.mjs 生成，白底深色笔迹 ${W}×${H}）。\n * 仅用于固定演示场景的预置验收与导出演示——不是任何真人的笔迹。\n */\nexport const SYNTHETIC_SIGNATURE_PNG =\n  '${dataUrl}';\n`,
  );
  console.error(`wrote ${target} (${base64.length} base64 chars)`);
} else {
  console.log(dataUrl);
  console.error(`PNG ${png.length} bytes, base64 ${base64.length} chars`);
}
