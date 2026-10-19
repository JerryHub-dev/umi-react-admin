/**
 * CSP 单一来源。三条产线各有一份副本：GitHub Pages 的 <meta>（config.github.ts 直接引用本模块）、
 * vercel.json 与 nginx/security-headers.conf（静态文件无法 import，由 scripts/csp-consistency.test.ts
 * 逐条比对，任何一处漂移即测试失败）。改来源清单只改这里，再同步两份静态副本。
 *
 * 来源说明：
 * - script 'unsafe-eval'：Cesium Knockout 模板编译用 new Function（实测在用），pdfjs 已关 isEvalSupported
 * - script https://webapi.amap.com：唯一被注入的脚本主机，由已安装的加载器源码推导
 *   （@pansy/amap-api-loader 0.4.10 的 es/utils.js AMap JSONP、es/index.js 的 AMapUI / Loca）。
 *   不再放行 https://*.amap.com：通配符会把 amap.com 整个子域树变成可执行脚本来源，而依赖只请求这一个主机。
 *   升级加载器必须重新推导主机，scripts/csp-amap-pinning.test.ts 把包版本、注入地址与来源清单绑在一起。
 *   页面只有配置 AMAP_KEY 才调用 load()，加载器内置的共享 key（es/config.js）不会被使用。
 * - style 'unsafe-inline'：antd cssinjs 运行时注入 + tailwind 任意值
 * - img/connect 保留 *.amap.com / *.autonavi.com：高德瓦片与数据服务走图片/XHR，不是脚本来源；
 *   Cesium 无 token 链路在 OSM 不可达时也用高德瓦片兜底
 *   openstreetmap：瓦片（OpenLayers 走 <img>，Cesium 无 token 默认底图走 XHR，故 img/connect 均列出）；cesium.com：ion 影像
 *   basemaps.cartocdn.com：Cesium 无 token 时探针通过后升级的暗色底图（CartoDB Dark Matter，OSM 数据的 CDN 分发）
 * - virtualearth.net：显式配置 ion token 的 Cesium 影像可能引用 Bing；无 token 时不涉及
 *   （无 token 链路：「夜航滤镜」OSM → carto 探针升级 → OSM 不可达时高德兜底）
 * - media blob:：wavesurfer 7 把音频解码后以 blob URL 交给 <audio> 播放（缺了它音频可视页无法播放）
 * - huoshanstatic：xgplayer 演示视频
 */
export const CSP_DIRECTIVES: [string, string[]][] = [
  ['default-src', ["'self'"]],
  ['base-uri', ["'self'"]],
  ['form-action', ["'self'"]],
  ['object-src', ["'none'"]],
  ['frame-ancestors', ["'self'"]],
  ['script-src', ["'self'", "'unsafe-eval'", 'https://webapi.amap.com']],
  ['style-src', ["'self'", "'unsafe-inline'"]],
  [
    'img-src',
    [
      "'self'",
      'data:',
      'blob:',
      'https://*.amap.com',
      'https://*.autonavi.com',
      'https://tile.openstreetmap.org',
      'https://*.basemaps.cartocdn.com',
      'https://ion.cesium.com',
      'https://api.cesium.com',
      'https://assets.ion.cesium.com',
      'https://*.virtualearth.net',
    ],
  ],
  [
    'connect-src',
    [
      "'self'",
      'blob:',
      'https://*.amap.com',
      'https://*.autonavi.com',
      'https://tile.openstreetmap.org',
      'https://*.basemaps.cartocdn.com',
      'https://ion.cesium.com',
      'https://api.cesium.com',
      'https://assets.ion.cesium.com',
      'https://*.virtualearth.net',
    ],
  ],
  ['font-src', ["'self'", 'data:']],
  ['media-src', ["'self'", 'blob:', 'https://sf1-cdn-tos.huoshanstatic.com']],
  ['worker-src', ["'self'", 'blob:']],
  ['frame-src', ["'self'"]],
];

/** meta 版 CSP 不支持 frame-ancestors（浏览器会忽略并告警），<meta> 输出时剔除 */
const META_UNSUPPORTED = new Set(['frame-ancestors']);

export const buildCsp = ({ meta = false }: { meta?: boolean } = {}) =>
  CSP_DIRECTIVES.filter(([name]) => !(meta && META_UNSUPPORTED.has(name)))
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
