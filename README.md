# umi-react-admin

> **中文文档**：[README.zh-CN.md](./README.zh-CN.md) · 简体中文完整文档在此，欢迎翻译 PR。

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-3-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE) [![Deploy](https://github.com/Jerry-CodeHub/umi-react-admin/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/Jerry-CodeHub/umi-react-admin/actions/workflows/deploy.yml) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

`umi-react-admin` is an open-source admin template built on **Umi Max 4 + React 19 + Ant Design 6 + ProComponents**. Unlike most templates, its demo tells **one coherent story**: a fictional IoT monitoring platform — 240+ stations, ~90 days of alarms, tickets derived from those alarms, 86 operators with role-based permissions and audit logs. Every number on the dashboard is aggregated live from those records, and holds up to scrutiny.

**[Live demo](https://jerry-codehub.github.io/umi-react-admin/)** — one-click sign-in for five roles (`admin` / `lead` / `operator` / `analyst` / `guest`) sharing the same dataset, so you can compare permission differences across menus, buttons and API responses (see `docs/demo/role-matrix.md`).

| Group | Pages |
| --- | --- |
| Dashboard | KPIs (online devices, alarms today, SLA rate, avg response), alarm trend, type mix, regional online rate, disposition flow, device health, distribution, latest activity |
| System | Users (filter / sort / batch / detail drawer), roles (permission tree), audit logs, access demo (route-level / button-level / data-level) |
| Operations | Device registry, alarm center (convert to ticket / recover / false positive), ticket board (drag & drop, keyboard accessible), spectrum occupancy (D3) |
| Maps | AMap, OpenLayers (same station set); six Cesium scenes: GeoHash grid, direction & distance, heatmap, routes & coverage, box-select & measure, air/sea situation |
| Components | Calendar (FullCalendar), rich text (self-hosted TinyMCE with data-generated weekly report), signature (ticket acceptance), page screenshot (html2canvas) |
| Media / Documents | Video, music player, waveform; browser-side monthly PDF report and Excel import/export (row-level validation) generated live from the data |

Fully bilingual (zh-CN / en-US), light/dark themes, mobile-friendly; every page has a "view source" link in the top-right corner.

![Dashboard (controlled demo scenario)](docs/demo/screenshots/02-dashboard-scenario.png)

![Ticket board with full-history lookup](docs/demo/screenshots/07-tickets-board.png)

![Dark theme](docs/demo/screenshots/03-dashboard-dark.png)

![Mobile (390px)](docs/demo/screenshots/12-mobile-users.png)

> Screenshots are from the 2026-10-12 demo walkthrough (more in [docs/demo/screenshots/](./docs/demo/screenshots/)).

## Contents

- [Requirements](#requirements) / [Getting started](#getting-started) (incl. [Environment variables](#environment-variables))
- [Scripts](#scripts) / [Directory layout](#directory-layout) / [Features](#features)
- [Deployment](#deployment) / [Third-party licensing notes](#third-party-licensing-notes) / [Analytics & privacy](#analytics--privacy)
- [Contributors](#contributors-) / [Changelog](./CHANGELOG.md) / [10-minute demo script](./docs/demo/demo-script.md)

## Requirements

- Node.js 24 LTS (see [.nvmrc](./.nvmrc); nvm / fnm recommended); minimum 22.22.2 (engine requirement of jsdom, Cesium and friends)
- pnpm 11 (the `packageManager` field pins the version; pnpm 10 auto-switches); releases younger than 24 hours are rejected by pnpm 11's default `minimumReleaseAge`
- Developers in China may configure a registry mirror in `~/.npmrc` (this repo's `.npmrc` intentionally carries none)

## Getting started

```bash
git clone https://github.com/Jerry-CodeHub/umi-react-admin.git

cd umi-react-admin

# Copy the env template and fill in as needed (see environment variables below)
cp .env.example .env.local

pnpm install

pnpm start
```

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `CESIUM_ION_TOKEN` | Optional | Your own public web token, restricted by origin and quota; without it the app falls back to HTTPS OSM (no SDK-shared token). Ion terrain requires your own token |
| `UMI_APP_DEMO_MODE` | Required for demo | Only `true` enables the pure-frontend demo; unset or `false` means real mode. `.env.example` enables the demo explicitly |
| `UMI_APP_API_BASE` | Required for real builds | Same-origin API path prefix such as `/` or `/backend`; cross-origin backends must be proxied at a same-origin entry. Mutually exclusive with demo mode |
| `AMAP_KEY` / `AMAP_SECURITY_CODE` | For AMap features | Your own public web key restricted by origin and quota; without it the SDK is not loaded and no library-shared key is used |
| `CLARITY_ID` | Not supported | The template lacks consent, content masking and matching CSP integration; setting it fails the build. No analytics scripts by default |

## Scripts

```bash
pnpm start             # Dev server (port 8000; reads the explicit mode from .env.local)
pnpm start:demo        # Dev with the demo backend explicitly enabled
pnpm build             # Real-mode production build: requires a same-origin API
pnpm build:demo        # Public demo build (primary pipeline: Vercel / Docker)
pnpm build:github:demo # Public demo build for GitHub Pages (sub-path /umi-react-admin/)
pnpm check             # typecheck + strict lint + vitest (run before every commit)
pnpm test              # vitest units (demo data sanity, API, CSP consistency, route table)
pnpm e2e               # Playwright: per-route smoke on the build:github:demo output + English completeness + key flows
pnpm e2e:build         # Build once, then run e2e
pnpm size              # Public demo build + bundle-size budget gate (size-budget.json)
pnpm audit:security    # Full raw dependency advisories + installed patch verification with attack regressions
pnpm analyze           # Build with a bundle composition report
pnpm format            # Prettier
```

## Directory layout

```
src/
├── pages/            # Pages grouped by menu (Dashboard / System / Ops / Map / Components / Media / Document / Exception)
├── components/       # Shared components (DemoPage shell, ChartCard, CesiumViewer, GuideTour, ErrorBoundary…)
├── demo/             # In-browser demo backend: data generator, patch store, REST routes, axios adapter
├── services/         # API calls and the shared frontend/backend contract (types.ts)
├── hooks/            # useApi / useChartTheme / useEnums / useThemeMode
├── locales/          # zh-CN / en-US messages (split by domain; key parity enforced by tests)
├── constants/        # Enum order, semantic colors, permission tree
├── layouts/          # Top bar
└── utils/            # Request layer, formatting, map math (geodesy / geohash / turf merged)
config/               # umi config, routes (with legacy redirects), single-source CSP, chunking, build info
e2e/                  # Playwright specs
```

## Features

- **Demo backend**: browser-resident demo APIs (`src/demo`, wired in via an axios adapter) used only when `UMI_APP_DEMO_MODE=true`. The login token lives in the current tab's sessionStorage; modifications to the fictional business data persist as patches in localStorage, and the avatar menu offers "reset demo data". Do not import real business or sensitive data. Data is generated deterministically per calendar day; the window slides with today.
- **Data plausibility**: `src/demo/generate.test.ts` encodes the rules as assertions — level ratios, weekday/weekend rhythm, timeline ordering, device-status ↔ active-alarm correspondence, KPI/agreement parity, example.com-only emails, masked phone numbers, documentation-reserved IP ranges.
- **Real backend**: disable the demo, set a same-origin `UMI_APP_API_BASE`, and implement the endpoints per [src/services/types.ts](./src/services/types.ts). The frontend expects server-side session cookies; login returns user info, no bearer is stored. The cookie/CSRF/server-auth/TLS contract lives in [SECURITY.md](./SECURITY.md); there is no backend implementation in this repo. Real production builds fail without a backend configured, and real-mode pages never show demo shortcuts.
- **Auth & permissions**: permission points for the five roles (admin / lead / operator / analyst / viewer) are defined in `src/constants/permissions.ts` and act as the **single authorization source** for menus, buttons and the in-browser demo API — the demo backend resolves them per request from the role record, so permission edits apply to existing sessions immediately. Demo mode never validates passwords; a real backend must still authorize every operation and data scope itself. Login redirects are normalized and confined to this app.
- **Document input**: XLSX capped at 5 MiB / 16 MiB actual decompression / 16 sheets / 1000 rows / 64 columns / 4096 chars per field; XML merges and named ranges are checked before allocation. Parsing runs in a terminable worker with a 10s timeout. PDF capped at 20 MiB / 1000 pages, two-page render window, image and canvas budgets checked; switching files cancels the previous task.
- **i18n & theming**: bilingual UI (first visit follows the browser language); writing Chinese literals in code is blocked by an ESLint rule, and e2e asserts the English UI has no leftovers. Charts, maps, calendar and rich text all follow the light/dark theme.
- **Build info**: the footer shows the build commit and time; `dist/version.json` is generated from the same source so you can verify the deployed version.
- **Accessibility**: `<html lang>` follows the UI language, pinch-zoom is allowed; the top bar and the ticket board are keyboard-operable; icon buttons have accessible names.
- **Browser baseline**: Chrome 111+ / Firefox 128+ / Safari 16.4+ (Tailwind CSS 4); the PDF page needs native `Promise.try` (Chrome 128+ / Firefox 134+ / Safari 18.2+).

## Deployment

Vercel and Docker enforce CSP plus `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` and HTTPS HSTS. The CSP source list lives in [config/csp.ts](./config/csp.ts); the two static header copies are compared by tests, and production HTML carries a meta CSP too. `'unsafe-eval'` serves the Cesium Knockout controls and inline styles serve antd; those compatibility needs require keeping the checks on third-party versions and every HTML input boundary. The GitHub Pages meta CSP cannot provide header-grade frame protection, so Pages hosts the public demo only.

- **GitHub Pages**: pushing `master` triggers [deploy.yml](./.github/workflows/deploy.yml) automatically. Build, full dependency audit and artifact scanning run in a read-only job; only the publishing job — which downloads the checked artifacts — gets write access. `build:github:demo` enables the public demo explicitly; real mode refuses this target. A copied `404.html` supports sub-routes; after deploy the pipeline verifies `version.json` and runs the online `@smoke` suite.
- **Vercel**: see [vercel.json](./vercel.json). The public demo sets `UMI_APP_DEMO_MODE=true` explicitly; real deployments configure a same-origin API proxy and backend sessions — the SPA rewrite must not answer API requests. Lockfile installs use `--frozen-lockfile`.
- **Docker**: public demo via `docker build --build-arg UMI_APP_DEMO_MODE=true .`; real targets use `--build-arg UMI_APP_API_BASE=/` plus an API reverse proxy at your HTTPS entry. The image is static-frontend only (`/api/` returns 404). nginx 1.30 enforces CSP; hashed assets get one-year immutable caching, entries and non-hashed resources use conditional caching. `CESIUM_ION_TOKEN` is a public client credential — restrict its origins and quota; optional `GIT_SHA` feeds the version info.

## Third-party licensing notes

This project ships under **MIT** (see [LICENSE](./LICENSE)), but the following third-party content is **not licensed under MIT**:

- **TinyMCE 8**: dual-licensed GPL-2.0-or-later / Tiny commercial. This template **self-hosts** TinyMCE from npm (served in the rich-text route's async chunk — no Tiny Cloud, no API key) and runs the editor with `license_key: 'gpl'`. Distributing the template under MIT does not grant TinyMCE rights for closed-source commercial use: offering builds containing TinyMCE is distribution and must comply with the GPL; for closed-source commercial use, buy a Tiny license or swap in TipTap (MIT) / Quill 2 (BSD-3). Evaluate your own situation for internal-use scenarios.
- **Cesium**: Apache-2.0 (the build output ships the license copy at `dist/Cesium/LICENSE.md`).
- **Demo media**: the bundled demo audio, PDFs, video posters and business data are project-made (business data is deterministically generated by `src/demo` in the browser) and provided for demo purposes only; the video player page hotlinks the official xgplayer demo CDN at runtime, which is not redistributed with the repo.
- The full dependency license inventory lives in [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).

## Analytics & privacy

The template ships no analytics or session-replay scripts; setting `CLARITY_ID` directly fails the build. If you add analytics, implement consent, sensitive-input masking and a matching CSP first, and verify that no request fires when consent is refused. Map and video pages call public third-party services as their features require; public web keys must be origin- and quota-restricted.

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
          <a href="https://allcontributors.js.org/docs/en/bot/usage">Add your contributions</a>
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
