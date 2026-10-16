type SplitChunksOptions = {
  chunks: 'all';
  minSize: number;
  maxSize?: number;
  cacheGroups: Record<string, unknown>;
};

type WebpackChainConfig = {
  optimization: {
    splitChunks: (options: SplitChunksOptions) => void;
  };
};

/**
 * 分包策略要点：
 * - vendors 兜底组限定 chunks: 'initial'——此前继承顶层 chunks:'all' 且带 maxSize，
 *   把 Cesium/turf 等异步引擎打成碎片卷入首屏同步加载（审计 perf-1）；
 * - 不再使用 maxSize 碎片化——55KB 级的 vendor 碎片既推高请求数也破坏长效缓存；
 * - 只给「单一功能域」的大库建命名组。命名 + enforce 的组会把命中的所有模块合进同一个
 *   chunk，任何路由用到其中一个模块就得下载整组：曾经的 media 组把 html2canvas（图表库
 *   @antv/g 的依赖）与 xgplayer/wavesurfer 绑在一起、d3 组把图表库用到的 d3-* 与 D3 页的
 *   全部 d3 绑在一起，首页因此白白下载播放器与整份 d3。这类跨域共享的库交给 webpack
 *   按实际引用关系自动拆分；
 * - cesium 包只是 re-export，引擎代码在 @cesium/engine、@cesium/widgets，分组正则须覆盖；
 * - antd 的 rc 组件正逐步迁往 @rc-component/* 作用域（5.29 已有 5 个，6.x 全部迁移），antd 分组须覆盖。
 * - 命名 + enforce 的组必须区分「入口依赖」与「仅异步路由依赖」：组内任一模块被入口用到，整组
 *   都会进首屏同步加载。入口真正需要的库（antd 核心、react）用 chunks: 'initial' 限定，
 *   只在页面里出现的部分交给 webpack 按引用自动拆异步包（antd 组的 432KB→入口所需部分，
 *   见该组注释与 config/chunkGraph.ts 记录的路由清单）。
 * 路由级真实首屏体积由 config/chunkGraph.ts 记录、scripts/check-bundle-size.mjs 门禁
 * （后者还要求实测 ≤ 预算的 95%，留出至少 5% 余量）。
 */
export const configureSplitChunks = (config: WebpackChainConfig) => {
  config.optimization.splitChunks({
    chunks: 'all',
    minSize: 30_000,
    cacheGroups: {
      framework: {
        name: 'framework',
        test: /[\\/]node_modules[\\/](react|react-dom|scheduler|history)[\\/]/,
        priority: 50,
        enforce: true,
      },
      charts: {
        name: 'vendor-charts',
        test: /[\\/]node_modules[\\/](@antv|@ant-design[\\/](charts|plots))[\\/]/,
        priority: 45,
        enforce: true,
      },
      // pro-components 只有布局与各业务页用到：单独成组并限定异步，登录页与入口不再背它（约 180KB gzip）
      pro: {
        name: 'vendor-pro',
        test: /[\\/]node_modules[\\/]@ant-design[\\/]pro-[\w-]+[\\/]/,
        chunks: 'async',
        priority: 42,
        enforce: true,
      },
      /**
       * antd 组只接管**入口真正用到**的 antd / rc 模块（chunks: 'initial'）。
       *
       * 此前继承顶层 chunks: 'all' + enforce：命名 + 强制分组会把命中的全部模块合进同一个
       * chunk，而该 chunk 会被挂到所有引用其中任一模块的路由组上——入口用了 ConfigProvider /
       * App / message / Button / Dropdown 等少数几个组件，却因此同步加载整个 antd + rc 生态
       * （实测 432KB gzip，占入口 690KB 的 63%），Table/DatePicker/Tree/Upload/Form…
       * 这些只有内页才用的重组件全都在首屏。
       *
       * 改成 'initial' 后：入口用到的 antd 仍进 vendor-antd（同步、命名、可长期缓存，内页复用
       * 不重复打包——webpack 的 RemoveParentModulesPlugin 保证父子 chunk 间不重复）；只在异步
       * 路由里出现的 antd 模块由 webpack 默认组（defaultVendors, chunks: 'all', minChunks 2）
       * 按实际引用关系自动拆成异步 chunk，只有用到它的路由才下载。
       *
       * 该行为已在 webpack 5.104 的最小复现里验证：改动前同步 vendor chunk 装下全部 antd 模块，
       * 改动后仅剩入口模块，页面独占模块按引用自动分包且产物中无重复副本（标记串只出现一次）。
       */
      antd: {
        name: 'vendor-antd',
        test: /[\\/]node_modules[\\/](@ant-design|@rc-component|antd|rc-.+)[\\/]/,
        chunks: 'initial',
        priority: 40,
        enforce: true,
      },
      cesium: {
        name: 'vendor-cesium',
        test: /[\\/]node_modules[\\/](@cesium[\\/][\w-]+|cesium|cesium-navigation-es6)[\\/]/,
        priority: 35,
        enforce: true,
      },
      // pdf（react-pdf/pdfjs-dist）不做强制分组，按引用自动拆分
      pdf: {
        name: 'vendor-pdf',
        test: /[\\/]node_modules[\\/](react-pdf|pdfjs-dist)[\\/]/,
        priority: 25,
      },
      turf: {
        name: 'vendor-turf',
        test: /[\\/]node_modules[\\/]@turf[\\/]/,
        priority: 20,
        enforce: true,
      },
      vendors: {
        name: 'vendors',
        test: /[\\/]node_modules[\\/]/,
        chunks: 'initial',
        priority: -10,
        reuseExistingChunk: true,
      },
    },
  });
};
