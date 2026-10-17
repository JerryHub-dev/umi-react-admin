# 第三方许可与资源说明（中文版）

> 英文主文档：[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)；本文件为其完整中文副本，两者同步维护。

本项目按 MIT 分发（见 [LICENSE](./LICENSE)）。本文件汇总分发物中涉及的第三方组件与资源。

## 依赖许可汇总

直接依赖以宽松许可为主，完整传递依赖清单可通过 `pnpm licenses list --prod` 生成查看。关键组件：

| 组件 | 许可 | 说明 |
| --- | --- | --- |
| React / antd / @ant-design/\* / @umijs/max | MIT |  |
| Cesium | Apache-2.0 | 构建产物随附许可副本（`dist/Cesium/LICENSE.md`），满足 Apache-2.0 第 4 条再分发要求 |
| TinyMCE 8 | GPL-2.0-or-later / Tiny 商业双许可 | 自托管：随构建产物分发（仅富文本路由的异步 chunk），编辑器以 `license_key: 'gpl'` 运行；对外提供含 TinyMCE 的产物即构成分发，须遵守 GPL，闭源商用请购买 Tiny 许可或替换（见 README「第三方许可说明」） |
| @turf/union、@turf/helpers | MIT | 按需引入；已避免整包 `@turf/turf` 带来的 AGPL（marchingsquares）/EPL（jsts）传递组件 |
| OpenLayers | BSD-2-Clause |  |
| xgplayer / xgplayer-music / wavesurfer.js | MIT | 视频播放器页的示例视频/海报运行时引用 xgplayer 官方演示 CDN；音频页使用项目自制素材 |
| exceljs | MIT | Excel 演示页动态加载 |
| react-pdf（pdfjs-dist） | Apache-2.0 | cmaps/standard_fonts 随构建产物分发（pdfjs-dist 同为 Apache-2.0） |

## 演示资源清单

| 资源 | 来源 | 许可 |
| --- | --- | --- |
| `public/audio/audio.wav`、`public/audio/stereo.wav` | 项目自制（正弦合成音频） | 随项目 MIT |
| `public/data/cesium/*.json`（覆盖包络、场强测试、站点覆盖多边形）、`src/demo/`（演示数据生成器与词库） | 项目自制演示数据 | 随项目 MIT |
| `public/logo.svg`、`public/favicon.svg`、`public/favicon.ico`、`public/apple-touch-icon.png` | 项目自制标识（监测雷达图形；ICO/PNG 由 `scripts/make-icons.mjs` 从两份 SVG 确定性栅格化） | 随项目 MIT |
| `public/_headers`、`public/_redirects`、`public/api-not-configured.json` | 项目自制的部署配置（Cloudflare Pages 响应头与 `/api` 改写） | 随项目 MIT |
| `public/demo/users-*.xlsx`、`docs/demo/screenshots/` | 项目自制（Excel 样例由 `scripts/make-demo-samples.mjs` 确定性生成；截图为本项目 UI 走查产出） | 随项目 MIT |
| 音频播放器页的歌词与唱片/背景 | 项目自制（自写示例 LRC；唱片与背景为纯 CSS 绘制） | 随项目 MIT |
| 视频播放器页示例视频/海报 | xgplayer 官方演示 CDN（字节跳动文档示例资源） | 页面运行时引用，不随仓库分发 |

> 历史版本曾携带的 `react-dev.pdf`（疑似 React 官方文档，版权属 Meta）、来源不明音频与视频已在治理中替换/移除；音频播放器页此前热链的商业歌曲、专辑封面及随仓库分发的完整歌词，以及首页图表取自 AntV 示例的第三方数据（股价、气温距平），均已于 2026-09 替换为项目自制内容。

## 依赖安全修复（2026-10-09）

历史接受项已改为源码处理；完整构建链和运行时链均纳入审计，不再配置 `auditConfig.ignoreGhsas`。公告根据版本号匹配，本地补丁保留真实版本；原始审计的非零结果必须与补丁证明分别记录。

| 组件 / 原风险 | 处理 |
| --- | --- |
| image-size / less | 保留 less >=4.9.1 override，移除旧 image-size 路径 |
| react-router / react-router-dom 6.30.4 | Umi 的 6.x 路径定向升级至 7.18.2；补 StaticRouter 导入和仅匹配完整入口的 alias，保留 Router 7 子路径导出；未使用的旧测试工具移除 |
| uuid 8.3.2 | ExcelJS 的依赖定向升级到仍支持 CommonJS 的 11.1.1 |
| postcss-selector-parser 6.1.3 | 两条旧主版本路径均升级 7.1.6，包含新增公告修复 |
| decode-uri-component 0.2.2 | 按官方线性解码修复回移，保留 query-string 所需 CommonJS API；真实源码补丁在 patches/ |
| braces 3.0.3 | 本地源码增加解析/AST/编译深度、节点数、展开数量和输出预算，范围限制不可绕过；真实包攻击回归验证普通 glob 与边界拒绝 |
| elliptic / crypto-browserify | 删除通用浏览器 crypto polyfill 链；ExcelJS 使用 bare 入口及实际所需的 hash/randombytes，避免预打包旧 ECC 副本。保留真实 SHA-512 工作表保护能力 |
| sprintf-js 1.0.3 | 移除未使用的 Umi lint/test 工具路径；模板继续使用独立 ESLint/Vitest |

本地补丁使用 pnpm `patchedDependencies`，随锁文件固定。`pnpm audit:security` 输出全量原始公告；只对精确匹配已修补源码的全部安装实例，且通过真实攻击回归的已知公告认定已修复，其他公告一律失败。不能将审计记录解释为上游已经发布修复版本。

补丁升级需要重新核对源码哈希、CommonJS/浏览器入口、构建与 E2E，随后更新证明；不能仅删除补丁或添加 ignore。官方公告包括 [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)、[decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)、[React Router 7 的后续修复](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)。
