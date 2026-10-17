/**
 * 站点图标 <link> 的单一来源（主产线 base '/'，GitHub Pages 产线 '/umi-react-admin/'）。
 * 不用 umi 的 `favicons` 选项：它只输出无 type / sizes 的 `<link rel="shortcut icon">`。
 *
 * - favicon.ico（16/32/48）：不认 SVG 图标的浏览器；sizes="32x32" 让认 SVG 的浏览器优先选 SVG
 * - favicon.svg：logo 的小尺寸版，现代浏览器的标签页图标
 * - apple-touch-icon.png（180×180 满版）：iOS 添加到主屏
 *
 * 图形源文件与位图生成见 scripts/make-icons.mjs。两条产线经 lodash.merge 按数组下标逐项合并
 * （@umijs/core 读取 config.<env>.ts 的方式），因此必须用本函数生成同构数组，不要在任一侧手写增减项。
 */
export const faviconLinks = (base: string) => [
  { rel: 'icon', href: `${base}favicon.ico`, sizes: '32x32' },
  { rel: 'icon', href: `${base}favicon.svg`, type: 'image/svg+xml' },
  { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` },
];
