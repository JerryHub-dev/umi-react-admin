import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CSP_DIRECTIVES } from '../config/csp';

const root = new URL('..', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, root), 'utf8');

/**
 * 高德脚本来源固定点：包版本 ↔ 加载器源码实际注入的地址 ↔ CSP script-src 三者绑定。
 *
 * 背景（审查 2026-10 F5）：script-src 原为 https://*.amap.com，等于把 amap.com 整个子域树
 * 都变成可执行脚本来源；而依赖 @pansy/amap-api-loader 只向一个主机注入 <script>。
 * 这里不抄常量、直接从已安装的加载器源码推导地址，因此升级加载器（改主机或改路径）会让
 * 测试失败，必须先重新推导来源再放行——不允许静默扩大或漂移信任面。
 */
const REVIEWED_LOADER_VERSION = '0.4.10';
const LOADER_SCRIPT_ORIGIN = 'https://webapi.amap.com';
/** Vite/umi 走 package.json 的 module 字段（es/），lib/ 是给 CJS 消费者的编译副本，不是浏览器入口 */
const LOADER_BROWSER_ENTRY_FILES = [
  'node_modules/@pansy/amap-api-loader/es/utils.js',
  'node_modules/@pansy/amap-api-loader/es/index.js',
];

const loaderVersion = () =>
  (JSON.parse(read('node_modules/@pansy/amap-api-loader/package.json')) as { version: string }).version;

/** 从加载器源码里取出所有字面量 https 地址（注入点都是 script.src = "https://..."） */
const loaderScriptUrls = () =>
  LOADER_BROWSER_ENTRY_FILES.flatMap((file) =>
    [...read(file).matchAll(/["'](https:\/\/[^"']+)["']/g)].map((match) => match[1]),
  );

describe('高德脚本来源与 CSP 绑定（F5）', () => {
  it('加载器版本必须是审查过的版本，升级后需重新推导脚本主机', () => {
    expect(loaderVersion()).toBe(REVIEWED_LOADER_VERSION);
  });

  it('从已安装源码推导：全部脚本注入点都只指向 webapi.amap.com', () => {
    const urls = loaderScriptUrls();
    // 三个已知注入点：AMap JSONP（utils.js）、AMapUI（index.js）、Loca（index.js）
    expect(urls).toContain(`${LOADER_SCRIPT_ORIGIN}/maps?callback=__amap_init_callback`);
    expect(urls).toContain(`${LOADER_SCRIPT_ORIGIN}/ui/`);
    expect(urls).toContain(`${LOADER_SCRIPT_ORIGIN}/loca?v=`);
    expect([...new Set(urls.map((url) => new URL(url).origin))]).toEqual([LOADER_SCRIPT_ORIGIN]);
  });

  it('script-src 精确等于推导出的主机，既无通配符也不缺主机', () => {
    const scriptSrc = CSP_DIRECTIVES.find(([name]) => name === 'script-src')?.[1] ?? [];
    expect(scriptSrc).toEqual(["'self'", "'unsafe-eval'", LOADER_SCRIPT_ORIGIN]);
    expect(scriptSrc.filter((source) => source.includes('*'))).toEqual([]);
    // 推导出的每个脚本地址都必须被 script-src 放行（否则地图页在真实浏览器里会被 CSP 拦掉）
    for (const url of loaderScriptUrls()) expect(scriptSrc).toContain(new URL(url).origin);
  });

  it('只收窄 script-src：瓦片/数据服务所需的 amap/autonavi 图片与 XHR 来源保持放行', () => {
    const sourcesOf = (name: string) => CSP_DIRECTIVES.find(([directive]) => directive === name)?.[1] ?? [];
    for (const directive of ['img-src', 'connect-src']) {
      expect(sourcesOf(directive)).toContain('https://*.amap.com');
      expect(sourcesOf(directive)).toContain('https://*.autonavi.com');
    }
  });

  it('页面只在配置了 AMAP_KEY 时调用 load()，不会回落到加载器内置共享 key', () => {
    const page = read('src/pages/Map/Amap/index.tsx');
    expect(page).toContain("import { load } from '@pansy/amap-api-loader'");
    // key 来自构建期注入，且 load() 之前有缺失即返回的分支
    expect(page).toContain("const amapKey = readBuildGlobal('AMAP_KEY')");
    expect(page).toMatch(/if \(!amapKey\) \{[\s\S]{0,120}?return undefined;\s*\}\s*let disposed/);
    expect(page).toMatch(/load\(\{ key: amapKey, version: '2\.0' \}\)/);
    // 依赖自带共享 key（es/config.js 的 defaultConfig.key），必须保持为空才不会被隐式使用
    expect(read('node_modules/@pansy/amap-api-loader/es/config.js')).toMatch(/key: '[0-9a-f]{32}'/);
    expect(read('config/config.ts')).toMatch(/AMAP_KEY: process\.env\.AMAP_KEY \|\| ''/);
  });
});
