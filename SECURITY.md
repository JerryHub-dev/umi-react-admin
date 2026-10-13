# Security Policy

> **中文版**：[SECURITY.zh-CN.md](./SECURITY.zh-CN.md) — the two copies are maintained in sync.

## Reporting a vulnerability

**Please do not report security issues in public issues.** Preferred channels:

1. GitHub private vulnerability reporting: repo page → **Security** tab → **Report a vulnerability** (the maintainer must enable Private vulnerability reporting under Settings → Code security first)
2. Email: lishuai4415@gmail.com (the `author` in package.json)

Please include: affected version/commit, reproduction steps, and impact assessment. We will acknowledge receipt within **3 business days** and feed progress back through the original channel.

## Supported versions

| Version         | Supported |
| --------------- | --------- |
| Latest `master` | ✅        |
| Historical tags | ❌        |

## Quality gates

- PR-stage CI: typecheck / strict lint (including `.mjs`) / vitest / both explicit demo builds / bundle budget & style coverage / **artifact secret scanning** (fingerprint-verified against declared public client tokens only) / full dependency advisories with verified source patches / Playwright (CSP violations caused by third parties are not ignored)
- Post-deploy: wait for the online `version.json` to switch to this commit, then run the `@smoke` cases against the live site
- Commit stage: pre-commit (lint-staged + typecheck)
- Repository hygiene tests: committable files must not contain JWT-shaped secrets or local artifacts

## Known limitations

This repository is a frontend template only — there is no real backend. The pure-frontend demo requires `UMI_APP_DEMO_MODE=true` explicitly. The demo never validates passwords and cannot establish trusted data isolation — permission points are enforced per request by the in-browser demo backend (which makes permission differences demonstrable), but every check runs inside the user's own browser and is not a real security boundary. The demo uses fictional data only; the login token lives in sessionStorage, and startup removes legacy localStorage tokens. In-browser data and scripts are under the user's control.

The demo is off by default. Real production builds require a same-origin `UMI_APP_API_BASE` and fail otherwise; GitHub Pages hosts the public demo only. Real mode uses cookie sessions, removes the persistent bearer entry, forbids cross-origin API addresses and per-request API overrides, and normalizes login redirects to stay within this app. Frontend permission display never substitutes for server-side authorization.

Vercel and nginx enforce CSP; production HTML carries a meta CSP. GitHub Pages cannot serve `frame-ancestors`/`X-Frame-Options` headers, so it must not host a real admin console that needs anti-framing protection. Cesium's Knockout controls require `unsafe-eval`, antd styles require inline styles; rich text must keep flowing through DOMPurify, PDF must keep eval/scripts disabled, and uploads and URL inputs must pass through their respective boundaries. Without configured map keys no third-party shared credentials are used; unreviewed analytics integrations fail the build.

The local preview server binds to 127.0.0.1 only and rejects directory traversal, escaping symlinks and abnormal encodings. It is for local verification; production should use an HTTPS static entry. nginx listens on intranet 8080 with TLS terminated at the deployment entry; HSTS only takes effect once the browser has seen an HTTPS response.

## Real backend integration contract

There is no backend implementation today; the following must be delivered server-side when integrating — frontend tests cannot substitute:

- Session cookies use `Secure`, `HttpOnly`, an appropriate `SameSite`, a restricted Path, and avoid a broad Domain; login re-issues the session, logout invalidates it server-side.
- Every business endpoint independently verifies identity, role, object ownership and data scope; client-supplied roles or demo tokens are never accepted.
- State changes use POST/PUT/PATCH/DELETE, check a trusted Origin plus the frontend-sent `X-Requested-With: XMLHttpRequest`, and reject cross-origin CORS/simple requests; GET/HEAD must not mutate state. Any additional cross-origin scenario needs a real CSRF scheme.
- Login/logout/currentUser responses carry `Cache-Control: no-store`; errors use proper HTTP statuses, and endpoints must never return SPA HTML. Credentials go only to the fixed same-origin API; the server owns rate limiting, credential storage and session lifetime.
- The HTTPS entry provides certificates, a same-origin API proxy, CSP and other security headers, and real responses plus permission regressions are verified. The template itself declares no verified online backend or TLS environment.

## Document & dependency boundaries

XLSX is checked for ZIP structure, actual decompressed size, XML, coordinates, merges and named ranges before reaching ExcelJS; file/row/column/field budgets apply and parsing runs in a terminable worker with a 10-second cap. PDF has file/page/visible-window/canvas/image budgets and cancels stale tasks. These budgets bound what the template accepts as input; they do not prove browser-native decoders are defect-free against arbitrary malformed files.

Historical advisories are no longer recorded as accepted-without-fix. Real upgrades, removals or source patches are tracked in [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md). Raw `pnpm audit` may still flag locally patched packages by version number; the raw output is kept, and `pnpm audit:security` must additionally verify source hashes of every installed instance plus real attack regressions — new advisories and unproven instances fail. Gates must never be passed by ignoring advisories, faking version numbers, or assessing only unreachable paths.
