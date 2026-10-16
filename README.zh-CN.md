# umi-react-admin（中文文档）

> **English documentation**: [README.md](./README.md) — the primary README is in English; this is the complete Simplified Chinese version. Translation PRs welcome.

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-3-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE) [![Deploy](https://github.com/Jerry-CodeHub/umi-react-admin/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/Jerry-CodeHub/umi-react-admin/actions/workflows/deploy.yml) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.zh-CN.md)

`umi-react-admin` 是基于 **Umi Max 4 + React 19 + Ant Design 6 + ProComponents** 的开源后台模板。和多数模板不同，它的演示内容讲的是**同一个故事**：一个虚构的「物联网监测运营平台」——240 台监测站、近 90 天告警、由告警派生的工单、86 名运维人员、角色权限与操作审计，工作台上的每个数字都由这些明细实时聚合，经得起推敲。

**[在线演示](https://jerry-codehub.github.io/umi-react-admin/)** —— 登录页提供五种角色的一键体验（`admin` 管理员 / `lead` 值班长 / `operator` 运维工程师 / `analyst` 数据分析员 / `guest` 访客），共用同一份演示数据，可直接对比菜单、按钮与接口层的权限差异（见 `docs/demo/role-matrix.md`）。

| 分组 | 页面 |
| --- | --- |
| 工作台 | KPI（在线设备、今日告警、工单时限达成率、平均响应）、告警趋势、类型占比、各大区在线率、处置流向、设备健康、设备分布、最新动态 |
| 系统管理 | 用户管理（筛选 / 排序 / 批量 / 详情抽屉）、角色权限（权限点树）、操作日志、权限演示（路由级 / 按钮级 / 数据级） |
| 设备运维 | 设备台账、告警中心（转工单 / 恢复 / 误报关闭）、工单看板（拖拽流转，支持键盘）、频谱占用（D3） |
| 地图 | 高德、OpenLayers（同一批站点）；Cesium 六个场景：GeoHash 网格、方位测距、场强热力图、路线与覆盖、框选与测距、海空态势 |
| 组件 | 日程（FullCalendar）、富文本（自托管 TinyMCE，预置按数据生成的周报）、电子签名（工单验收）、页面截图（html2canvas） |
| 多媒体 / 文档 | 视频、音乐播放器、波形；浏览器内按数据生成的月报 PDF、Excel 导入导出（逐行校验） |

全站中英双语、明暗主题、手机端可用；每个页面右上角「查看源码」直达对应代码。

![工作台（受控演示场景）](docs/demo/screenshots/02-dashboard-scenario.png)

![工单看板与全量历史查询](docs/demo/screenshots/07-tickets-board.png)

![深色主题](docs/demo/screenshots/03-dashboard-dark.png)

![手机端（390px）](docs/demo/screenshots/12-mobile-users.png)

> 截图来自 2026-10-12 的演示主线走查（更多见 [docs/demo/screenshots/](./docs/demo/screenshots/)）。

## 目录

- [环境要求](#环境要求) / [安装使用](#安装使用)（含[环境变量](#环境变量)）
- [常用脚本](#常用脚本) / [目录结构](#目录结构) / [功能说明](#功能说明)
- [部署](#部署) / [第三方许可说明](#第三方许可说明) / [统计与隐私](#统计与隐私)
- [Contributors](#contributors-) / [更新日志](./CHANGELOG.md) / [10 分钟演示手册](./docs/demo/demo-script.md)

> 本文件为完整中文文档；英文主文档见顶部链接。

## 环境要求

- Node.js 24 LTS（见 [.nvmrc](./.nvmrc)，推荐使用 nvm / fnm 管理）；最低 22.22.2（jsdom、Cesium 等依赖的引擎要求）
- pnpm 11（`packageManager` 字段已钉住版本，pnpm 10 会自动切换）；新发布不足 24 小时的依赖版本会被 pnpm 11 默认的 `minimumReleaseAge` 拒绝
- 国内开发者可在 `~/.npmrc` 自行配置镜像源（本仓库的 `.npmrc` 不携带镜像配置）

## 安装使用

```bash
git clone https://github.com/Jerry-CodeHub/umi-react-admin.git

cd umi-react-admin

# 复制环境变量模板，按需填写（见下方环境变量说明）
cp .env.example .env.local

pnpm install

pnpm start
```

### 环境变量

| 变量 | 必需 | 说明 |
| --- | --- | --- |
| `CESIUM_ION_TOKEN` | 可选 | 自行申请并限制来源与权限的公开 Web token；缺失时使用 HTTPS OSM，不使用 SDK 共享 token，Ion 地形需要自有 token |
| `UMI_APP_DEMO_MODE` | 演示需显式开启 | 仅 `true` 启用纯前端演示；未设置或 `false` 为真实模式。`.env.example` 明确开启演示 |
| `UMI_APP_API_BASE` | 真实生产构建需要 | 同源 API 路径前缀，例如 `/` 或 `/backend`；跨源后端须由同源入口代理。不可与演示模式同时配置 |
| `AMAP_KEY` / `AMAP_SECURITY_CODE` | 高德功能需要 | 自行申请受来源与配额限制的公开 Web Key；未配置时不加载 SDK、不使用组件库共享 key |
| `EXPECTED_CESIUM_TOKEN` / `EXPECTED_AMAP_KEY` / `EXPECTED_AMAP_SECURITY_CODE` | 构建注入了对应凭据时 | 产物扫描用的类型化声明：每个构建期凭据（[config/config.ts](./config/config.ts) 的 `CESIUM_ION_TOKEN` / `AMAP_KEY` / `AMAP_SECURITY_CODE`）都必须在部署前显式声明为「设计上公开」。扫描只比对 SHA-256 指纹，绝不打印或记录凭据值；构建期注入了却没声明、声明形态不合法、声明与产物不一致、或有声明却在产物里找不到，一律 fail closed。`EXPECTED_TOKEN` 仅作为 Cesium token 的废弃别名保留 |
| `CLARITY_ID` | 暂不支持 | 模板缺少同意、内容遮蔽及对应 CSP 集成，设置该变量会拒绝构建；默认无统计脚本 |

## 常用脚本

```bash
pnpm start            # 开发服务器（端口 8000，读取 .env.local 的显式模式）
pnpm start:demo       # 显式演示开发
pnpm build            # 真实模式生产构建：必须配置同源 API（UMI_APP_DEMO_MODE=false、UMI_APP_API_BASE=/）
pnpm build:real       # 同上，显式钉住模式；CI 矩阵会构建它来断言演示代码已被剥离
pnpm build:demo       # 显式公开演示构建（主产线：Vercel / Docker）
pnpm build:github:demo # GitHub Pages 公开演示构建（子路径 /umi-react-admin/）
pnpm check            # typecheck + 严格 lint + vitest（提交前必跑）
pnpm test             # vitest 单测（含演示数据合理性、接口、CSP 一致性、路由表）
pnpm test:coverage    # vitest 带覆盖率门禁；百分比统计的是 vitest.config.ts 的选定域，不是全项目覆盖率
pnpm e2e              # Playwright：对 build:github:demo 产物逐页冒烟 + 英文完整性 + 关键流程
pnpm e2e:build        # 构建并跑 e2e
pnpm size             # 显式演示构建并执行体积预算门禁（size-budget.json）
pnpm audit:security   # 全量原始依赖公告 + 已安装补丁源码及攻击回归校验
pnpm analyze          # 构建并生成 bundle 组成分析
pnpm format           # Prettier 格式化
```

## 目录结构

```
src/
├── pages/            # 页面（按菜单分组：Dashboard / System / Ops / Map / Components / Media / Document / Exception）
├── components/       # 通用组件（DemoPage 页面外壳、ChartCard、CesiumViewer、GuideTour、ErrorBoundary…）
├── demo/             # 浏览器内的演示后端：数据生成器、补丁存储、REST 路由、axios adapter
├── services/         # 接口调用与前后端契约（types.ts）
├── hooks/            # useApi / useChartTheme / useEnums / useThemeMode
├── locales/          # 中英文案（按领域拆分，键集一致由测试把关）
├── constants/        # 枚举顺序、语义色、权限点树
├── layouts/          # 顶栏
└── utils/            # 请求层、格式化、地图计算（geodesy / geohash / turf 合并）
config/               # umi 配置、路由（含旧路径重定向）、CSP 单一来源、分包、构建信息
e2e/                  # Playwright 用例
```

## 功能说明

- **演示后端**：仅 `UMI_APP_DEMO_MODE=true` 时使用浏览器内的演示接口（`src/demo`，经 axios adapter 接入）。登录 token 仅存在当前标签页的 sessionStorage；虚构业务数据的修改仍以补丁形式存 localStorage，头像菜单可「重置演示数据」。请勿导入真实业务或敏感数据。数据按日历日以固定种子生成，时间窗随今天滑动。
- **数据合理性**：`src/demo/generate.test.ts` 把规则写成断言——级别比例、工作日 / 周末节律、时间线先后、设备状态与活动告警对应、KPI 与明细口径一致、邮箱只用 example.com、手机号只以脱敏形式出现、IP 只用文档保留段。
- **接真实后端**：关闭演示，设置同源 `UMI_APP_API_BASE`，按 [src/services/types.ts](./src/services/types.ts) 实现接口。前端采用服务端会话 Cookie；登录返回用户信息，不保存 bearer。Cookie、CSRF、服务端权限与 TLS 契约见 [SECURITY.md](./SECURITY.zh-CN.md)，仓库没有后端实现。未配置后端的真实生产构建直接失败，真实页面不显示演示快捷入口。
- **鉴权与权限**：五种角色（admin / lead / operator / analyst / viewer）的权限点定义于 `src/constants/permissions.ts`，是菜单、按钮与浏览器内演示接口的**同一授权口径**——演示后端逐请求按角色记录解析，改权限对已有会话立即生效。分配角色是独立权限（`system.user.role.assign`，默认矩阵里仅 admin 持有）：它是唯一能把用户 `role` 写入记录的通道（新建用户、带 `role` 的资料更新，以及角色单元格非空的导入行——角色留空按访客导入，任一行在无权限时指定角色则整批 403），任何身份改自己的角色都返回 403（含 admin），可分配范围限于 `viewer` / `operator` / `analyst`——当前是 admin / lead 的账号同样不能经该通道改角色。角色权限编辑也有同样的上限：持有 `system.role.update` 的角色不能修改或 reset 自己所在的角色，且只能授予自己持有的权限点。精确设备坐标是数据级权限（`ops.device.coordinate.view`）：没有它时接口在序列化阶段把坐标粗化到 0.1° 格网并标 `coordinatePrecision: 'coarse'`，脱敏不由 UI 完成。状态变更路由会写操作日志（含 actor / action / target / result / time）：登录/退出、用户新建/编辑/停用/删除、角色分配、角色权限修改与 reset、批量导入、告警处置、工单派发/开始处理/退回/完成/验收/返工、日程增删改与演示时钟切换。有两条特权路由**刻意不记日志**——`POST /api/v1/demo/reset` 与 `POST /api/v1/demo/scenario` 会清空补丁存储（日志表也在其中），写进去的条目会立刻被抹掉。五个快捷体验账号（`admin`、`guest`、`lead`、`operator`、`analyst`）与当前登录账号受保护：不能停用、不能删除（单条与批量都不行）、不能改名（演示会话按登录名识别，当前登录账号不能改自己的登录名）。当前角色是 admin / lead 的账号只由管理员角色维护：持有 `system.user.update` / `system.user.delete` 的委派角色（含 lead 自己）对它们停用、启用、删除或改资料一律 403（单条与批量都是，批量混入一个即整批拒绝），用户页对这些行置灰。完整矩阵见 [docs/demo/role-matrix.md](./docs/demo/role-matrix.md)。演示模式不校验密码；真实后端仍须独立校验每次操作及数据范围。登录回跳会规范化并限制在本站应用内。
- **文档输入**：XLSX 限 5 MiB、实际解压 16 MiB、16 张表、1000 数据行、64 列、每字段 4096 字符；XML/合并/命名区域也在分配前检查。解析放入可终止 worker，超时 10 秒。PDF 限 20 MiB、1000 页，只渲染两页窗口，并检查图片及画布预算；切换文件会取消旧任务。Excel **导入接口**在任何写入前整批复核：最多 1000 行、每行 8 个字段、每字段 256 字符、全批文本 200 000 字符、序列化请求体 5 MiB，并只接受字段白名单加数值元数据字段 `row`。结构非法返回 400、超预算返回 413，畸形请求**零写入**（不存在部分导入）。
- **多语言与主题**：中英双语（首次访问按浏览器语言选择），代码中直接写中文会被 ESLint 规则拦下，英文界面无遗漏由 e2e 断言；明暗主题下图表、地图、日历、富文本同步切换。
- **构建信息**：页脚显示构建提交与时间，`dist/version.json` 同源，部署后可核对线上版本。
- **无障碍**：`<html lang>` 随语言切换、页面允许缩放；顶栏与看板可键盘操作；图标按钮具可访问名称。
- **浏览器基线**：Chrome 111+ / Firefox 128+ / Safari 16.4+（Tailwind CSS 4）；PDF 需要原生 `Promise.try`（Chrome 128+ / Firefox 134+ / Safari 18.2+）。

## 部署

Vercel 与 Docker 强制 CSP，并设置 `X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、`Permissions-Policy` 和 HTTPS HSTS。CSP 来源见 [config/csp.ts](./config/csp.ts)，两份响应头副本由测试比对；生产 HTML 也带 meta CSP。`script-src` 收窄为 `'self'` + `'unsafe-eval'` + 唯一加载器主机 `https://webapi.amap.com`——这是已安装的 `@pansy/amap-api-loader` 注入 `<script>` 的唯一主机，由 `scripts/csp-amap-pinning.test.ts` 从其源码推导并绑定。`img-src` / `connect-src` 仍放行 `https://*.amap.com` 与 `https://*.autonavi.com`，因为瓦片与数据服务走图片/XHR，不是脚本来源。`'unsafe-eval'` 服务于 Cesium Knockout 控件，样式内联服务于 antd；这些兼容需求要求保持第三方版本和所有 HTML 输入边界的检查。GitHub Pages 的 meta CSP 无法提供响应头级的防嵌入保护，只支持公开演示。

所有将要部署的构建都会在构建后、发布前做一次凭据泄露扫描。每个构建期凭据都必须通过 `EXPECTED_CESIUM_TOKEN` / `EXPECTED_AMAP_KEY` / `EXPECTED_AMAP_SECURITY_CODE` 声明为「设计上公开」（[scripts/check-dist-secrets.mjs](./scripts/check-dist-secrets.mjs)）；扫描只输出 SHA-256 指纹与文件路径，并在「注入了却没声明」「声明形态不合法」「声明与产物不一致」「有声明但产物里没有」时 fail closed。由 `process.env` 间接派生的 define（经变量、解构、函数或本地模块）同样会被追踪；已登记公开项以外的 `UMI_APP_*` 变量一律判失败，因为 umi 会不经 define 块把该前缀的变量注入浏览器包。第二层对非 JWT 形态密钥特征（AWS / GitHub / Slack / `sk-` 前缀、PEM 私钥块）不做白名单，出现即失败。

- **GitHub Pages**：push `master` 自动触发 [deploy.yml](./.github/workflows/deploy.yml)。构建、全量依赖检查及产物扫描在只读 job 中执行，下载已检查产物的发布 job 才拥有仓库写权限。`build:github:demo` 显式开启公开演示；真实模式拒绝该目标。复制 `404.html` 支持子路由。扫描后产线在 `dist` 之外生成逐文件 SHA-256 完整性清单（[scripts/verify-dist-integrity.mjs](./scripts/verify-dist-integrity.mjs)），清单随同一个 artifact 上传，下载后先比对清单指纹与 build job 输出一致，再逐文件校验后才发布——缺文件、多文件、内容或大小变化、符号链接、目录结构变化都会让部署失败。部署后按 `version.json` 校验版本并跑线上 `@smoke`。
- **Vercel**：见 [vercel.json](./vercel.json)。公开演示明确设置 `UMI_APP_DEMO_MODE=true`；真实部署配置同源 API 代理及后端会话。锁文件以 `--frozen-lockfile` 安装。`/api/*` 闭合失败：显式的 `/api/(.*)` rewrite 排在 SPA 回退之前，[api/[...path].js](./api/[...path].js) 在 `API_ORIGIN` 未配置时返回 `503` JSON、对字面 `/api/v1/*` 之外的路径返回 `404` JSON，只有通过判定后才代理到 `API_ORIGIN`；SPA 回退正则本身排除 `api`，因此接口请求永远不会拿到 `index.html`。运行时代价：`/api` 流量全部经过 Serverless Function——冷启动、约 4.5 MB 的请求体上限、执行时长上限、不做流式转发；高流量后端应改用平台级网关。nginx（`location ~ ^/api(/|$)`，其 404 JSON 响应体来自单一来源 [nginx/api-fail-closed.conf](./nginx/api-fail-closed.conf)，由 Dockerfile 拷入镜像）与 GitHub Pages 等价的本地服务器实现同样的闭合行为。
- **Docker**：公开演示使用 `docker build --build-arg UMI_APP_DEMO_MODE=true .`；真实目标使用 `--build-arg UMI_APP_API_BASE=/` 并在 HTTPS 入口配置 API 反向代理。构建阶段在**同一个** `RUN` 层里执行 `pnpm build` 与凭据扫描，扫描失败就不会留下未扫描的 `dist` 层，之后运行镜像才 `COPY --from=builder /app/dist`。镜像本身只有静态前端，`/api/` 返回 404。Dockerfile 不再声明可变的 `# syntax=docker/dockerfile:1` frontend（只使用默认 frontend 支持的指令）；若将来需要 BuildKit 专属语法，必须固定到精确版本或摘要，由 [scripts/dockerfile-frontend.test.ts](./scripts/dockerfile-frontend.test.ts) 把关。nginx 1.30 强制 CSP；哈希产物一年长缓存，入口和非哈希资源协商缓存。`CESIUM_ION_TOKEN` 为公开客户端凭据，需自行限制来源与权限；可选 `GIT_SHA` 用于版本信息。

体积余量，由 `node scripts/check-bundle-size.mjs` 在正式的 `pnpm build:demo` 产物上实测（CI 门禁消费的正是这条产线）：entry 441 KB gzip（预算 700）、dashboard 1057 KB（预算 1250）、login 478 KB（预算 700）、`dist` 27.3 MB（预算 30）、`public` 3.2 MB（预算 4）。真实模式构建（`pnpm build:real`）更小——entry 425 KB、dashboard 1041 KB、login 462 KB——因为浏览器内演示后端已被剥离。`size-budget.json` 的上限一项都没有提高；门禁改为「任何指标超过预算 × 0.95 即失败」，即每个指标都必须留出 5% 余量——这条规则可证明不是空转（58 KB 的 entry 能过旧的绝对值 60 KB，但过不了新的 57 KB 线）。余量最薄的是 `dist`：27.3 MB（28 632 343 B）对 28.5 MB 上限，低于上限约 4.2%。`dist` 也从改动前的既有基线 26.9 MB 涨到 27.3 MB；这 +0.4 MB 是已观测到的差值，但**未**归因到任何单项改动。余量规则还有一处已披露的连带影响：`syncScripts` 是整数计数，上限 6 加上 5% 余量意味着 6 个脚本会失败（6 > 5.7）；当前是 4 个，所以今天不构成约束，但这是有意的收紧。

真实模式的演示代码剥离走的是构建期 **alias**，不是 tree-shaking：当 `demoMode` 为 false 时，`config/config.ts` 把 `@/demo/adapter` 与 `@/demo/token` 指向最小替身（`src/demo/*.real.ts`）。单靠 tree-shaking 不够——`DEMO_MODE` 是经模块命名空间读取的（产物里表现为属性访问而不是被内联的字面量），因此 `if (DEMO_MODE)` 分支不会被折叠成死代码，演示 token 模块会留在入口 chunk 里。`scripts/real-mode-artifact.test.ts` 对真实产物断言这一点，并已接入 CI。本机运行结论：`pnpm build:real` 后执行 `REAL_MODE_ARTIFACT_REQUIRED=1 pnpm exec vitest run scripts/real-mode-artifact.test.ts` → 6 passed、1 skipped、0 failed；`dist/index.html` 点名的四个入口 chunk 不含任何演示专属标记（`WO-SCN-HIST`、`ALM-SCN`、`umi-react-admin:demo-store`、`umi-react-admin-demo-users`），两个替身哨兵（`__REAL_MODE_ADAPTER_STUB__`、`__REAL_MODE_TOKEN_STUB__`）**存在**——这正是「两个 alias 真的生效、而不是字符串碰巧消失」的证据——且这四个标记在整个 `dist` 中出现于 0 个文件。那 1 个 skip 是演示构建的反向断言，对真实模式产物不适用；CI 的 `build:real` 作业设置 `REAL_MODE_ARTIFACT_REQUIRED=1`，因此真实模式断言不会静默跳过。

已知残留——真实模式仍会带进少量演示代码：`umi-react-admin:demo-clock:v1`（来自 `src/demo/clock.ts`）出现在真实构建的三个懒加载路由 chunk 中（`Signature`、`Tickets`、`Alarms`），因为 `src/utils/now.ts` 静态 import 了 `@/demo/clock`。它不在入口 chunk，也不属于演示后端 / 生成器 / 场景 / 存储，所以既定剥离标准成立——但若某来源站曾用于演示，localStorage 里残留的冻结时钟锚点会让真实模式的相对时间出错。推荐的修法是给 `@/demo/clock` 加第三个构建期 alias。因此真实模式**并非**「零演示代码」。

本机构建注意：`.env.local` 不在 CI / Vercel / Docker 环境中（`.dockerignore` 排除 `.env*`，`.gitignore` 覆盖 `/.env.*`，且该文件未被跟踪），但 umi 自身的 `loadEnv` 会依次用 `.env`、`.env.local` **覆盖** `process.env`，因此本机构建可能带着一个 shell 环境变量无法覆盖的凭据——这正是「本机扫描失败、CI 通过」的常见原因。

## 第三方许可说明

本项目按 **MIT** 分发（见 [LICENSE](./LICENSE)），但以下第三方内容**不随 MIT 一并授权**：

- **TinyMCE 8**：GPL-2.0-or-later 或 Tiny 商业许可双轨。本模板**自托管** npm 中的 TinyMCE（随富文本路由的异步 chunk 分发，不依赖 Tiny Cloud 与 API key），编辑器以 `license_key: 'gpl'` 运行。模板按 MIT 分发不等于授予 TinyMCE 闭源商用权利：对外提供包含 TinyMCE 的构建产物即构成分发，须遵守 GPL；闭源商用请购买 Tiny 商业许可，或替换为 TipTap（MIT）/ Quill 2（BSD-3）。仅内部使用等场景的义务请结合自身情况评估。
- **Cesium**：Apache-2.0（构建产物已随附许可副本 `dist/Cesium/LICENSE.md`）。
- **演示媒体**：仓库内的演示音频、PDF、视频封面与业务数据均为项目自制（业务数据由 `src/demo` 在浏览器内以固定种子确定性生成），仅作演示用途；视频播放器页的示例视频运行时引用 xgplayer 官方演示 CDN，不随仓库分发。
- 完整依赖许可清单见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.zh-CN.md)。

## 统计与隐私

模板无统计或会话回放脚本，直接设置 `CLARITY_ID` 会阻止构建。另行集成统计时，应先完成同意、敏感输入遮蔽与匹配的 CSP，并验证拒绝同意时无请求。地图、视频等页面会按功能请求公开第三方服务；公开 Web Key 需限制来源与配额。

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- npx all-contributors-cli add JerryHub-dev code -->
<!-- npx all-contributors-cli add kingling-abb code -->
<!-- npx all-contributors-cli add cc9971 code  -->

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cc9971"><img src="https://avatars.githubusercontent.com/u/85613959?v=4?s=100" width="100px;" alt="chen"/><br /><sub><b>chen</b></sub></a><br /><a href="https://github.com/Jerry-CodeHub/umi-react-admin/commits?author=cc9971" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kingling-abb"><img src="https://avatars.githubusercontent.com/u/153783999?v=4?s=100" width="100px;" alt="kingling-abb"/><br /><sub><b>kingling-abb</b></sub></a><br /><a href="https://github.com/Jerry-CodeHub/umi-react-admin/commits?author=kingling-abb" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JerryHub-dev"><img src="https://avatars.githubusercontent.com/u/75985761?v=4?s=100" width="100px;" alt="LiShuai (阿木)"/><br /><sub><b>LiShuai (阿木)</b></sub></a><br /><a href="https://github.com/Jerry-CodeHub/umi-react-admin/commits?author=JerryHub-dev" title="Code">💻</a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td align="center" size="13px" colspan="7">
        <img src="https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg">
          <a href="https://all-contributors.js.org/docs/en/bot/usage">Add your contributions</a>
        </img>
      </td>
    </tr>
  </tfoot>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## License

[MIT](./LICENSE) © 2024-present Li Shuai (Jerry)
