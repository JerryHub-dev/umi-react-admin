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
| `CLARITY_ID` | 暂不支持 | 模板缺少同意、内容遮蔽及对应 CSP 集成，设置该变量会拒绝构建；默认无统计脚本 |

## 常用脚本

```bash
pnpm start            # 开发服务器（端口 8000，读取 .env.local 的显式模式）
pnpm start:demo       # 显式演示开发
pnpm build            # 真实模式生产构建：必须配置同源 API
pnpm build:demo       # 显式公开演示构建（主产线：Vercel / Docker）
pnpm build:github:demo # GitHub Pages 公开演示构建（子路径 /umi-react-admin/）
pnpm check            # typecheck + 严格 lint + vitest（提交前必跑）
pnpm test             # vitest 单测（含演示数据合理性、接口、CSP 一致性、路由表）
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
- **鉴权与权限**：五种角色（admin / lead / operator / analyst / viewer）的权限点定义于 `src/constants/permissions.ts`，是菜单、按钮与浏览器内演示接口的**同一授权口径**——演示后端逐请求按角色记录解析，改权限对已有会话立即生效。演示模式不校验密码；真实后端仍须独立校验每次操作及数据范围。登录回跳会规范化并限制在本站应用内。
- **文档输入**：XLSX 限 5 MiB、实际解压 16 MiB、16 张表、1000 数据行、64 列、每字段 4096 字符；XML/合并/命名区域也在分配前检查。解析放入可终止 worker，超时 10 秒。PDF 限 20 MiB、1000 页，只渲染两页窗口，并检查图片及画布预算；切换文件会取消旧任务。
- **多语言与主题**：中英双语（首次访问按浏览器语言选择），代码中直接写中文会被 ESLint 规则拦下，英文界面无遗漏由 e2e 断言；明暗主题下图表、地图、日历、富文本同步切换。
- **构建信息**：页脚显示构建提交与时间，`dist/version.json` 同源，部署后可核对线上版本。
- **无障碍**：`<html lang>` 随语言切换、页面允许缩放；顶栏与看板可键盘操作；图标按钮具可访问名称。
- **浏览器基线**：Chrome 111+ / Firefox 128+ / Safari 16.4+（Tailwind CSS 4）；PDF 需要原生 `Promise.try`（Chrome 128+ / Firefox 134+ / Safari 18.2+）。

## 部署

Vercel 与 Docker 强制 CSP，并设置 `X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、`Permissions-Policy` 和 HTTPS HSTS。CSP 来源见 [config/csp.ts](./config/csp.ts)，两份响应头副本由测试比对；生产 HTML 也带 meta CSP。`'unsafe-eval'` 服务于 Cesium Knockout 控件，样式内联服务于 antd；这些兼容需求要求保持第三方版本和所有 HTML 输入边界的检查。GitHub Pages 的 meta CSP 无法提供响应头级的防嵌入保护，只支持公开演示。

- **GitHub Pages**：push `master` 自动触发 [deploy.yml](./.github/workflows/deploy.yml)。构建、全量依赖检查及产物扫描在只读 job 中执行，下载已检查产物的发布 job 才拥有仓库写权限。`build:github:demo` 显式开启公开演示；真实模式拒绝该目标。复制 `404.html` 支持子路由，部署后按 `version.json` 校验版本并跑线上 `@smoke`。
- **Vercel**：见 [vercel.json](./vercel.json)。公开演示明确设置 `UMI_APP_DEMO_MODE=true`；真实部署配置同源 API 代理及后端会话，不可将 SPA rewrite 作为 API 响应。锁文件以 `--frozen-lockfile` 安装。
- **Docker**：公开演示使用 `docker build --build-arg UMI_APP_DEMO_MODE=true .`；真实目标使用 `--build-arg UMI_APP_API_BASE=/` 并在 HTTPS 入口配置 API 反向代理。镜像本身只有静态前端，`/api/` 返回 404。nginx 1.30 强制 CSP；哈希产物一年长缓存，入口和非哈希资源协商缓存。`CESIUM_ION_TOKEN` 为公开客户端凭据，需自行限制来源与权限；可选 `GIT_SHA` 用于版本信息。

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
