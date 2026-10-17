/**
 * 由项目标识的两份 SVG 源生成位图图标（产物提交在 public/，构建时原样复制到 dist 根）。
 *
 * 源文件：
 * - public/logo.svg    应用内标识（ProLayout、登录页），细节完整
 * - public/favicon.svg 标签页图标：logo 的小尺寸版（按 32 网格重绘，16px 下仍清晰）
 *
 * 产物：
 * - public/favicon.ico          16/32/48 三档 PNG 封装的 ICO：不认 SVG 图标的浏览器、
 *                               以及直接请求 /favicon.ico 的客户端（书签、RSS 阅读器等）
 * - public/apple-touch-icon.png 180×180 满版方图：iOS 主屏会自己裁圆角，透明圆角会被填成黑边，
 *                               所以把 logo 底板的 rx 置 0 后渲染
 *
 * 用法：node scripts/make-icons.mjs（改了任一 SVG 后重新执行并提交产物）
 * - 用 Playwright 自带的 Chromium 栅格化，与浏览器实际渲染一致；本机浏览器版本与
 *   @playwright/test 不匹配时，用 CHROMIUM_PATH 指定可执行文件
 * - 同一 Chromium 版本下重复执行产物字节一致（无时间戳、无随机）
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const ICO_SIZES = [16, 32, 48];
const TOUCH_SIZE = 180;

const readSvg = (file) => readFileSync(join(PUBLIC_DIR, file), 'utf8');

/** 满版底板：logo 唯一的圆角矩形是底板，rx 置 0（找不到或不唯一说明源文件结构变了，直接失败） */
const fullBleed = (svg) => {
  const tiles = svg.match(/<rect width="64" height="64" rx="14"/g) ?? [];
  if (tiles.length !== 1) throw new Error('logo.svg 底板结构已变化，请同步更新 make-icons.mjs 的 fullBleed');
  return svg.replace('<rect width="64" height="64" rx="14"', '<rect width="64" height="64"');
};

/** 透明背景下把 SVG 渲染成 size×size 的 PNG */
const rasterize = async (page, svg, size) => {
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><img src="${src}" width="${size}" height="${size}" style="display:block"></body></html>`,
  );
  await page.locator('img').evaluate((img) => img.decode());
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
};

/** PNG 封装的 ICO（Vista 起的格式，所有现代浏览器支持）：ICONDIR + 每档 16 字节目录项 + PNG 数据 */
const packIco = (images) => {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry); // 宽，0 表示 256
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1); // 高
    header.writeUInt8(0, entry + 2); // 调色板颜色数：真彩色为 0
    header.writeUInt8(0, entry + 3); // reserved
    header.writeUInt16LE(1, entry + 4); // color planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  const favicon = readSvg('favicon.svg');
  const images = [];
  for (const size of ICO_SIZES) images.push({ size, png: await rasterize(page, favicon, size) });
  const ico = packIco(images);
  writeFileSync(join(PUBLIC_DIR, 'favicon.ico'), ico);
  console.log(`favicon.ico: ${ICO_SIZES.join('/')}px，${ico.byteLength} 字节`);

  const touch = await rasterize(page, fullBleed(readSvg('logo.svg')), TOUCH_SIZE);
  writeFileSync(join(PUBLIC_DIR, 'apple-touch-icon.png'), touch);
  console.log(`apple-touch-icon.png: ${TOUCH_SIZE}px，${touch.byteLength} 字节`);
} finally {
  await browser.close();
}
