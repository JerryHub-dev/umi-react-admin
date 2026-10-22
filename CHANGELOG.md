# Changelog

Maintained in the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format; per-commit detail lives in git log.

> Language note: entries before 2026-10-13 are recorded in Chinese (kept as history); entries from 2026-10-13 onward are recorded in English.

## [Unreleased]

### UI review fixes (2026-10-22)

- **Build**: the production build failed on `import { default as … } from 'mgrs'` (the ESM entry webpack resolves has only named exports), so the GitHub Pages deploy of the Situation release never shipped; `forward` is resolved through the namespace object like milsymbol. The Cesium lifecycle test mocks `cesium-navigation-es6` (its UMD build requires `'Cesium'`, which Node cannot resolve)
- **Sign-in**: the evidence strip shows live numbers from a new public demo endpoint `GET /api/v1/demo/snapshot` (same aggregation as the dashboard KPIs) instead of hard-coded 236/240 · 12 · 96.4%, and only in demo mode; quick-entry buttons read "Try as …" / 「以…体验」 throughout
- **Loading**: the route skeleton moved to `src/loading.tsx` — umi only picks up that path, so the old `src/pages/loading.tsx` never rendered and chunk loads (e.g. right after sign-in) showed a blank screen. `html` follows the theme's `color-scheme`, so dark mode no longer flashes white during those frames and native scrollbars match
- **Navigation**: en-US top-level groups are Ops / Docs / Errors and top-nav items use 10px side padding, so all eight groups fit from 1280px instead of folding into "···"
- **Cesium**: the scene shell no longer adds its own 40/16px padding on top of DemoPage's (content lines up with other pages, the stage fits the viewport, phones get the full width); the legend moved into the left column under the panels (Situation's group list and legend overlapped); the credit container override uses `!important` because the Viewer rewrites its position inline on resize, which left the ion logo under the legend; the basemap alert spans narrow stages with the retry button below the text. Situation and Direction use neutral monitoring wording (coastal sea & air traffic, cooperative / civil / unidentified / suspicious / non-compliant, groups instead of order of battle; no real sea names or ELINT)
- **Dashboard**: the disposition sankey aligns nodes by level (terminal dispositions no longer share the last column with ticket results, whose labels overlapped); the sunburst labels only cities with ≥4% of devices; the device-health scatter jitters points deterministically and its tooltip names the fields; the scatter and sunburst share one region-to-colour mapping; region uptime bar labels use dark text; alarm types have fixed colours (`ALARM_TYPE_COLOR`: device offline grey, overheating volcano — no green, which means healthy elsewhere) instead of rank-ordered category colours; the 7-day sparkline is visible on dark cards
- **Pages**: the ticket board's columns scroll internally on desktop (the 3-day done column used to stretch the page past 4000px); alarms open the handle menu on click (as do the users, Excel and sign-in language dropdowns) and confirm before closing as false positive; recovered ticketed alarms use the same status dot as other recovered rows; the calendar shows 24-hour `HH:mm` times; the screenshot card lists recent alarms with level tags instead of a one-bar "height = level" chart; the video page replaces xgplayer's "unsupported format" overlay with a load-failure state and retry; spectrum style options are localized; the monthly PDF report's KPI is 30-day alarms instead of today's; copy says 243 stations (240 + 3 demo-scenario stations)

### Review fixes: Cesium scenes, basemap chain and navigation (2026-10-19)

- **Military symbols**: unknown and hostile SIDCs were written as `UFA-…`/`HFA-…` (affiliation in the coding-scheme position); milsymbol rejected them and drew them as **friendly** blue frames, so the Situation page's hostile and unknown tracks contradicted their red/yellow labels and trails. Sea-surface function codes (`MS`) were invalid too. The table now uses valid codes (`symbols.test.ts` asserts validity and affiliation for every entry), and `militarySymbol` returns the real `width`/`height` plus an anchor `offset` — the labelled station symbol (95×41) used to be stretched into a square
- **Direction**: targets vanished after 20 minutes of the 12 h clock window (positions were sampled only for 0–1200 s with no extrapolation). Positions are now evaluated analytically per frame (`CallbackPositionProperty`, the same function as the margin panel). The polar chart follows the site theme instead of a hard-coded `theme="dark"`
- **GeoHash**: clicking a cell flies in again — the handler read the `viewer` state captured by `onReady` (always `null` on first mount, a destroyed instance after a basemap retry)
- **TimeDeck**: re-reads the clock range when a scene configures it after mount (Trajectory's slider was stuck on Cesium's default 24 h window) and updates at most per second / 10 Hz instead of re-rendering on every Cesium tick, paused or not
- **Situation**: the event feed recovers after the 12 h loop wraps or the user scrubs backwards (it used to stay empty while the alert KPI restarted)
- **Heatmap**: the click probe uses the current transmitter powers and re-computes when a slider moves; a worker that fails to load (chunk 404, no module-worker support) now falls back to the main-thread sampler instead of leaving the layer blank
- **Scene HUD**: the top-right action bar moved left of Cesium's toolbar, which it used to cover (Home and the 2D/3D picker kept on purpose); the toolbar sits above the glass panels so the picker can expand
- **Basemap failure detection**: the AMap fallback host is now observed (`TILE_HOSTS`); HTTP-level tile errors (429/403/5xx, invisible to the XHR `error` event) come from the current base layer's `imageryProvider.errorEvent`, re-attached on every layer swap (the old listener sat on `ImageryLayer.errorEvent`, which only reports provider-creation failures, and only incremented a counter); network failures count only for the current provider's host, so in-flight requests of a removed layer no longer push the new one over the threshold; the AMap probe no longer raises the banner once the carto upgrade has taken over (OSM and AMap blocked + carto reachable used to flag every Cesium page), and only one AMap probe runs at a time
- **Navigation**: clicking a group title goes to the first visible page the role can access (`firstAccessibleLeaf` in `src/utils/routeNav.ts`) — the static `/system` → `/system/users` redirect sent operator/analyst/viewer, who still see the group because `/system/access` has no access key, to a 403. The command palette excludes `hideInMenu` and wildcard routes (sign-in and the `*` 404 were listed) and ignores Enter/arrow keys while an IME is composing
- **CI**: the e2e basemap failure test also blocks `*.autonavi.com` (the AMap fallback answered 200 with `access-control-allow-origin: *`, so the banner never appeared); the e2e console whitelist includes `basemaps.cartocdn.com`; `size-budget.json` raises `publicMB` from 4 to 4.5 for the 586 KB glTF (public measured 3.82 MB, over the old 3.8 MB headroom line)
- **Tests**: new `symbols.test.ts` and `routeNav.test.ts`; palette tests cover hidden and wildcard routes; lifecycle tests cover the host filter and HTTP-level provider errors
- **Low-severity follow-ups**: Trajectory replays on the new viewer after a basemap retry and swaps in the glTF aircraft when its HEAD check resolves after the viewer is ready (unless the user started a custom route); the coverage corridor actually grows (it was re-sliced from its own prefix and stuck at two samples) and no longer runs ahead of the aircraft when speed ≠ 1. Situation's KPI/event heartbeat is throttled to ≤4 Hz by wall clock (it re-rendered every frame at ×120/×600). `useCesiumViewer` tears down the viewer, tile observer and rejection listener when a page's `onReady` throws, logs it and shows the error state. BoxSelect tools tolerate a null viewer; `polarPattern` returns `azimuthDeg`; the unused `meta.fl`, `landOn`, `followEntity` and `tileObserverInstalled` are gone; en-US labels fixed (Sample quality, Trails, East China Sea); the group-nav e2e matches "Audit log". New `fieldModel.test.ts`; situation and station-fleet tests cover enter/exit pairing, determinism, weight proportionality and tiny counts
- **Last four low-severity items**: the heatmap's propagation distance scales longitude by cos(latitude) (`planarDistanceKm`, within 0.5% of the haversine probe; east–west distances used to be ~15% too long, squashing the isolines against the coverage circles); GroupNav and the command palette share `canAccessRoute` with plugin-access semantics, so an access key missing from `access.ts` hides the page there too instead of showing a link into a 403; the palette input is a proper `combobox` (`aria-controls`, `aria-activedescendant`, empty state moved out of the listbox as a `status`); the Cesium scene bar scrolls horizontally on narrow screens and keeps the selected scene in view instead of truncating every label

### Cesium situational scenes (2026-10-18)

- **Situation**: rebuilt on a deterministic maritime/air model (`situationModel.ts`: core/warning/watch zones, six formation templates, 61 tracks with AIS/flight metadata, zone enter/exit events computed offline and streamed into a live feed during replay), MIL-STD-2525C symbols drawn with milsymbol (`components/CesiumViewer/symbols.ts`), a shared affiliation/accent palette (`palette.ts`) and a keyframe camera tour (`CameraDirector.ts`)
- **One clock for six scenes**: `TimeDeck` binds play/pause, speed and scrubbing to `viewer.clock`, replacing per-page `performance.now()` heartbeats
- **GeoHash**: a synthetic 8000-station fleet (`stationFleet.ts`, 34 provincial clusters, fixed seed) alongside the live 240 devices; extruded density cells grow in on precision/source changes
- **Heatmap**: the field is computed in a Web Worker (`heatWorker.ts`) and rendered through an ImageData colour LUT with d3-contour isolines (`heatRender.ts`); `fieldModel.ts` rewritten
- **Trajectory**: a glTF patrol aircraft (`public/assets/models/aircraft.glb`, the Apache-2.0 Cesium_Air sample) with a canvas billboard fallback when the model is unreachable
- **Basemap chain without an ion token**: a colour-graded ("night") OSM layer by default; a pixel-checked probe upgrades to CartoDB Dark Matter; when OSM is unreachable the AMap raster tiles are the last fallback (GCJ-02, basemap only — not used for measurements); the failure banner shows only when all of them fail. `https://*.basemaps.cartocdn.com` is allowed in img-src/connect-src in all four CSP copies
- **HUD for all six scenes**: compass and distance legend (cesium-navigation-es6), graticule toggle, MGRS cursor readout
- **Dependencies**: `milsymbol` 3.0.4, `mgrs` 2.2.0

### Two navigation fixes (2026-10-18)

- **Clicking a top-level group now enters its default page** (`/system` → users; since 2026-10-19 the first page the role can access, see below). Implemented with `subMenuItemRender` wrapping submenu titles in a click handler: `postMenuData`/`onTitleClick` injection does not work here because pro-components 3.1.14's internal build mangles BaseMenu's prop to `n`, while `subMenuItemRender` is a plain-name prop passed verbatim through the ProLayout → Header → TopNavHeader → BaseMenu `{...props}` chain. Nested group titles in the dropdown (Cesium) navigate the same way; on phones (≤768px, where the header collapses to a drawer) the click handler defers to the drawer's native expand
- **Fixed the tab row jumping on page entry**. ProLayout's content `main` carries a default `padding: 32px 40px` and only drops it (`has-page-container` class) once a PageContainer mounts — on a route's first visit the lazy-chunk frame renders GroupNav inside that padding at (88, 40), then it snaps to (56, 0). A `:has([data-tour="groupnav"])` rule zeroes the content padding whenever the tab row is present (the steady state already is zero), and GroupNav now stays mounted with an empty selection through group-root redirect frames (`/system` → `/system/users`) instead of unmounting for one frame

### Layout polish: hierarchy, dropdowns and the command palette (2026-10-18)

- **Visual hierarchy**: the group tab row is now the single emphasis — 40px tall, `colorSplit` bottom hairline, left edge aligned to the same 40px reference line as page content (was 24px/misaligned). Group pages no longer repeat the page name in a large PageContainer title: DemoPage collapses to a compact row (14px secondary description + page actions), cutting the page header from ~80px to ~36px; standalone pages (dashboard) keep the full header. The group name rides the right end of the tab row as a small uppercase tertiary tag — scroll context without breaking the left reference line
- **Header dropdowns restored**: top-level groups carry their children again (hover/click popup, access-filtered), so any page is one click from anywhere instead of top-group + tab; on phones the hamburger drawer gets the full two-level tree back
- **Command palette (⌘K / Ctrl+K)**: `src/components/CommandPalette` searches every accessible leaf page by localized name or path (menu.* keys, same cumulative rules as titles), keyboard-first (↑↓ / Enter / Esc), with a header search button as the discoverable entry. Traverses umi's unnamed layout wrappers in clientRoutes — a plain name-based walk yields nothing
- **Cesium scene bar**: sticky second row (top: 96px) visually identical to the group tabs, each scene with a semantic icon (grid / aim / heatmap / route / select / picture) so the scene switcher reads as navigation while the in-page `Segmented` controls stay parameters
- **Interaction details**: switching tabs or palette entries resets scroll to top (long tables used to land at the old offset); the tab row scrolls horizontally instead of antd's «···» overflow (a collapsed selected tab loses the current position) and auto-scrolls the selection into view; route changes fade content in over 150ms, disabled under `prefers-reduced-motion`
- **Tests**: palette flatten/filter unit tests (including the unnamed-wrapper case), GroupNav tests updated for the no-selection guard

### Layout refactor: top nav + in-content group tabs (2026-10-18)

- **Navigation**: the `mix` layout (top-level groups in the header + a second menu column on the left) is replaced by a two-level scheme with a single navigation shell — `layout: 'top'` carries the eight first-level groups in the header (their dropdowns were briefly dropped here and restored the same day, see "Layout polish" above; no route sets `hideChildrenInMenu`), and the second level moved into `GroupNav`, a sticky horizontal menu at the top of the content area (`src/components/GroupNav`). The content region reclaims the former 208px sider width; page URLs, access keys and legacy redirects are untouched
- **GroupNav** filters items with the same access semantics as the ProLayout menu, reuses the `menu.<group>.<page>` i18n keys, highlights the current page by longest-prefix match (`/map/cesium/geohash` → the Cesium tab), keeps antd Menu's keyboard navigation but scrolls horizontally (`disabledOverflow`) instead of collapsing into «···», and exposes a `<nav aria-label>` landmark. Single pages (dashboard) and groups whose items are all filtered out render no bar
- **Cesium third level dissolved**: `/map/cesium` gains a scene shell (`src/pages/Map/Cesium/Layout.tsx`) — a `Segmented` control over the six 3D scenes with the active child rendered in an `<Outlet />`. The only third-level menu in the app becomes in-page switching; the six scene routes, their paths and permissions are unchanged
- **DemoPage**: page titles are now computed from the matched route chain (`useNamedChain` + `menuKeyOf`, the same source as `document.title`) instead of the ProLayout menu context, which no longer contains second-level items; breadcrumbs are dropped (the group tab row already states the context)
- **Guide tour**: new "pages within the group" step pointing at the tab row (only shown when it exists, i.e. not on the dashboard)
- **Tests**: new unit tests cover GroupNav access filtering, selection and the null cases; `e2e/flows.spec.ts` gains a smoke test that switches pages via the tab row. Demo docs no longer reference the left menu

### PDF page on browsers without ES2026 built-ins (2026-10-16)

- **Fix**: on Chromium 141 the PDF page crashed into the error boundary with `getOrInsertComputed is not a function`. pdfjs-dist 6's modern build calls `Map`/`WeakMap.prototype.getOrInsert(Computed)` (native from Chrome/Edge 145, Firefox 144, Safari 26.2) and, while converting embedded fonts in the worker, `Math.sumPrecise` (Chrome/Edge 147, Firefox 137, Safari 26.2). Without `Math.sumPrecise`, embedded fonts silently fell back to system fonts. `src/pages/Document/Pdf/pdfjsPolyfills.mjs` now defines these only when missing and never replaces a native implementation. It loads on the main thread before react-pdf, and in the worker through a blob entry module (`pdfWorkerSrc.ts`) that imports it before pdf.js's own worker, so pdf.js still creates and terminates one worker per document
- **Why not the legacy build**: pdfjs-dist's legacy build bundles core-js 3.50, which force-replaces the native `Promise.try` in every current browser and the `DOMException` constructor and Iterator helpers in some. That is the same class of global override that `polyfill.imports: ['core-js/stable']` exists to avoid
- **Build**: modules emitted verbatim through `new URL(..., import.meta.url)` no longer go through the `src` babel rule (`config/urlAssets.ts`, called by both configs). Babel's transform-runtime had injected `@babel/runtime` imports with absolute build-machine paths into the standalone polyfill file
- **Browser baseline**: the PDF page needs Chrome/Edge 140+ / Firefox 134+ / Safari 18.2+ (native `Promise.try` and `Uint8Array` hex/base64; pdf.js reads the document fingerprint with `toHex` on every load). The previously documented Chrome 128+ stopped being true with the pdfjs-dist 6 upgrade
- **Tests**: unit tests check the polyfills against spec edge cases (canonical `-0` keys, receiver and callback order, weak-key validation, exact rounding, intermediate overflow, subnormals) and confirm they never replace existing methods. An e2e test deletes the built-ins on the main thread and in the worker, so CI's newer Chromium still covers the wiring, and asserts that a PDF with embedded TrueType fonts gets its fonts registered

### Sign-in page redesign (2026-10-16)

- **Login page**: replaced the split dark-gradient layout with a full-bleed page — brand bar, large headline + highlights, and a near-opaque sign-in panel (larger inputs with icons, new `login.subtitle` copy); in real (non-demo) mode the submit button is now the primary action
- **ParticleField** (`src/components/ParticleField`): a dependency-free Canvas 2D background in which a ring of radial capsule particles eases after the pointer (visual reference: the antigravity.google hero; independently implemented, no code reused). It behaves like water: crests travel outward through the ring, the edge undulates instead of staying a perfect circle, pointer speed stirs bigger and faster waves plus a trailing wake that calm down once the pointer rests, and each particle rides a damped spring with a slow-fading glow. Particles are bucketed by hue × intensity, so a frame is a few dozen draw calls; the count is capped on large screens; `prefers-reduced-motion` gets a single static frame; on phones the idle ring wanders around the headline. The panel deliberately skips `backdrop-filter`: blurring an animated canvas halved the frame rate without GPU compositing
- **Session expiry**: a 401 now sends the user to `/login?redirect=<page>&reason=expired` instead of a bare `/login`. The full-page redirect used to wipe the "session expired" toast and drop the return address, so users landed on the dashboard; the login page now shows a persistent notice and returns to the original page after sign-in (helpers in `src/utils/Auth/loginUrl.ts`, shared with the route guards)
- **Browser tab titles**: the app never set `document.title` (empty on every page). `index.html` now carries "React Admin" and `onRouteChange` sets "<page> - React Admin" from the same `menu.*` keys as the menu, in both languages
- **Sign-in UX**: every entry is disabled while a request is in flight (rapid clicks on two roles used to fire concurrent logins); failures show an inline alert instead of a 3-second toast and, in real mode, clear and refocus the password; Caps Lock warning; username autofocus; "remember username" (username only) and a forgot-password note in real mode; role tooltips on the demo entries; "you will return to <page>" when a redirect is pending; GitHub link (demo only) and build info in the footer
- **Background polish**: waves calm down and dim while the user types; frame rate drops to 20 fps when the window is blurred and 30 fps after 8 s without input; a static frame under forced-colors; an intro ripple expands from the centre on load
- **Tests**: `/login` joins the axe gate in light, dark and toggled themes (0 violations); new `e2e/login.spec.ts` covers titles, the English UI, the session-expiry round trip, reduced motion and the demo-only controls

### Logo & icon redesign (2026-10-16)

- **Project logo**: the signal-ripple mark (read as an RSS feed icon) is replaced by a monitoring-radar mark — scope rings, crosshair, a sweep sector and a cyan target blip inside it, i.e. the demo's station → alarm story. `public/logo.svg` serves the in-app logo (ProLayout, sign-in page) and the README heading; `public/favicon.svg` is a separately drawn small-size variant (no inner ring, heavier strokes) so the browser tab stays legible at 16px
- **Site icons**: a full favicon set replaces the single `shortcut icon` — `favicon.ico` (16/32/48, for browsers without SVG icons and direct `/favicon.ico` requests, which previously fell through to the SPA HTML on nginx), `favicon.svg`, and a 180×180 full-bleed `apple-touch-icon.png`. The `<link>` tags come from one helper (`config/favicons.ts`) used by both build pipelines; the bitmaps are regenerated deterministically from the SVGs with `node scripts/make-icons.mjs`
- **Menu icons** now match what each page does and no longer repeat: device ops → wrench (was an org-chart cluster), operation logs → audit, map group → compass, Cesium 3D → globe (was a network-node glyph), OpenLayers → layers (its compass clashed with the feature-tour entry), signature → signature, screenshot → camera (was scissors), audio waveform → sound (was a microphone; the page does not record), 500 → server (bug stays with the repo Issues link)
- **In-page icons**: the language switcher (header and sign-in page) uses the translation icon instead of the globe that the map menu used; the feature tour uses the help icon; the signature eraser uses the clear brush instead of the format painter, and "clear" uses delete; Excel "export all users" uses export instead of a second download icon; the meaningless swap icon on every audio clip option is removed

### Open-source polish & structure audit fixes (2026-10-13)

- **README**: corrected the antd version to 6; updated the sign-in description to the five one-click roles and the current "permission points as the single authorization source" semantics; added a table of contents, a CHANGELOG link and 4 demo screenshots. README.md is now the **full English primary document**, with the complete Chinese version moved to [README.zh-CN.md](README.zh-CN.md) (cross-linked at the top of both)
- **English-first facade**: CONTRIBUTING / SECURITY / CODE_OF_CONDUCT / THIRD-PARTY-NOTICES converted to English-primary docs with `.zh-CN` copies maintained in sync; issue templates (bug form + feature request + config.yml) and the PR template anglicized; package.json description now English with antd 6; fixed a stray bullet breaking the THIRD-PARTY-NOTICES demo-resource table
- **CHANGELOG**: merged the leftover duplicate "Unreleased" heading; the 2026-09 governance batch is archived under [1.0.0]
- **SECURITY.md**: "permissions are for display only" replaced with the accurate description (the demo backend enforces them per request, but that is not a real security boundary)
- **docs/demo/**: sanitized — removed the AI review brief (internal working document) and scrubbed maintainer-local absolute paths and local-environment narratives; the public deliverables remain (ledger, demo script, module scripts, role matrix, scenario manifest, screenshots)
- **Repository hygiene**: `.gitignore` now uniformly ignores local tool dirs (.mimosa/, .v2c/, .claude/settings.local.json); THIRD-PARTY-NOTICES demo-resource inventory registers public/demo/users-*.xlsx and the walkthrough screenshots
- **CI/CD**: `timeout-minutes` on every job; Playwright report/trace uploaded on e2e failure; a new "define-injection detectability" leg (builds with a runtime-constructed public dummy JWT, asserts the artifact secret scan catches it undeclared and passes once declared — closing the same blind spot the Vercel pipeline has); dependabot gains the docker ecosystem; the bug issue template became a YAML form (build commit / environment / language+theme fields) plus config.yml disabling blank issues; the PR template gains CHANGELOG and e2e checklist items
- **Docs restructure**: demo-facing deliverables promoted to `docs/demo/` (role matrix, 10-minute demo script incl. an appendix of unverified boundaries, machine-readable scenario manifest, 4 README screenshots); internal QA records (remediation ledger, re-review report, module acceptance scripts) and 12 unreferenced screenshots removed from the distribution; the stale empty `public/js/` directory deleted
- **Structure cleanup**: removed the always-failing build:github / start:github scripts (the public pipeline allows demo variants only); removed the dead esbuildMinifyIIFE option, the legacy empty plugins/ directory and the stale public/Cesium/ eslint ignore; config.github.ts define narrowed to the differing keys only (the rest inherit from the main config, eliminating verbatim-copy drift) with the metas merge-mode comment corrected; added src/utils/now.ts as the single "current time" source (follows the demo clock in controlled mode), adopted by three pages; the repo URL is now single-sourced in src/constants/repo.ts; REGIONS deduplicated against REGION_KEYS (single definition in constants/enums); stationUi.tsx renamed StationUi.tsx to match the component naming convention; fixed a stale generator-script reference in scenarios.ts

### UI-audit remediation (2026-10-12, docs/demo/)

Feature and demo fixes per the 2026-10-11 UI audit report (F01–F09 / D / E / R / U lists):

- **F02 permissions take effect**: permission points (src/constants/permissions.ts) become the single authorization source for menus, routes, buttons and the demo API; the demo backend resolves them per request from the role record (permission edits apply to existing sessions immediately); five one-click role accounts (admin / lead / operator / analyst / guest, password demo); new points ops.ticket.accept, ops.schedule.update, system.demo.reset; full matrix in docs/demo/role-matrix.md
- **F03 ticket locating**: alarm ticket links deep-link with the ID (/ops/tickets?focus=WO-…); GET /tickets/:id loads historical tickets independently; the board gains a full-history "ticket lookup" panel (ID / status / priority / time)
- **F04 Excel recovery**: the preview state offers "choose another file / cancel import", submit is disabled with an explanation at 0 valid rows; import moved to server-side batch re-validation (POST /users/import) with accurate created/duplicated/invalid counts and no double writes; export and dedup iterate all pages (>200 users not truncated); four downloadable samples ship with the project (public/demo/users-*.xlsx, regenerable via scripts/make-demo-samples.mjs)
- **F05 consecutive acceptance**: after signing, the next valid ticket is selected automatically; a completion empty state shows when all are signed; switching tickets clears the pad
- **F06 rework semantics**: leaving "done" archives the current acceptance into acceptanceHistory (with invalidation time and actor) and clears it; a new acceptance is required after re-completion; the ticket drawer shows the invalidated records and an explicit "rework" action
- **F07 status linkage**: unified derivation rules in src/demo/availability.ts — a device goes online only when all blocking alarms (critical/major × offline/power/link/temperature) are cleared; device APIs, maps, dashboard KPIs and reports share the same result; a multi-alarm device does not come online early
- **F08 unrecovered semantics**: "unrecovered only" filters by business recovery meaning (active + ticketed-but-unrecovered); converting to a ticket is not recovery
- **F09 demo clock**: src/demo/clock.ts (live / frozen) + a per-request staleness check that rebuilds base data across thresholds (patches preserved; cross-day sessions no longer stall); the controlled scenario freezes the clock and displays "demo time" explicitly; multi-tab sync via storage events
- **D02 fixed scenarios**: src/demo/scenarios.ts adds stable SCN objects (mainline fault / multi-alarm / urgent todo / SLA contrast / consecutive acceptance / accepted-rework / historical ticket / false positive / maintenance / normal device / schedules) present on any demo day; machine-readable manifest docs/demo/demo-scenarios.json; STORE_VERSION 2→3 (old patches cleaned; reset restores)
- **Maps**: the /map default entry goes to OpenLayers when no AMap key is configured (runtime decision; the AMap page stays with a fallback link and disabled dead controls); the six Cesium scenes show a visible notice with retry when basemap tiles keep failing (F01 re-verified in e2e/cesium-basemap.spec.ts)
- **UI**: login page and demo copy label antd 6; deprecated APIs adapted (Timeline items.children→content etc.); dashboard KPIs and latest activity are clickable into their objects; the device drawer offers map locating and alarm links; the screenshot target is selectable
- Regressions: src/demo/availability.test.ts, scenarios.test.ts, server/remediation.test.ts, manifest.test.ts, plus e2e/demo-mainline.spec.ts (E01–E10 ×2 rounds), e2e/cesium-basemap.spec.ts, e2e/remediation-flows.spec.ts
- Two pre-existing defects exposed during the work: (1) umi define injects a `${KEY}` literal placeholder for unset keys (truthy) — AMap/Cesium treated the placeholder as configured, skipping the OSM fallback and requesting ion (401, no tiles); added src/utils/buildGlobals.ts for safe runtime reading with placeholder filtering. (2) /api/v1/demo/clock required login, so the top bar fetch while signed out triggered a request-layer 401 full-page jump that dropped the login redirect (read made public; unsigned-in bars no longer fetch)
- Alarm-page deep links (?keyword=) now work on same-route navigation (query-only changes); keyword submission uses formRef.submit() (actionRef.reload() ignores current form values)
- Cesium imagery now selects by hosting protocol: http pages (local e2e, intranet Docker) always use the credential-free OSM basemap; https deployments use ion imagery — fixing real-token builds where Bing tiles over http were blocked by CSP connect-src (CSP not relaxed)
- Independent re-review fixes (fix table preserved in this entry): buildGlobals restored the compile-time literal channel (P1; AMAP_KEY/ion token configs effective again, verified with a dummy build); the signature "all signed" completion state is reachable (P2); F08 English copy "Unrecovered only" (P2); the generator compression constraint covers the remaining≤6min window (with a 12-sample regression); frozen-mode SLA/duration/acceptance windows use the demo clock; the acceptance endpoint validates signature shape server-side; >200-user import boundary regression; dead code removed

### antd 6 (2026-10-07, PR #41)

## [1.0.0] - 2026-10-07

首个正式发布基线：2026-09 演示重构（refactor/* 链，PR #23–#33）+ 依赖与安全加固。

### 2026-09 治理批次（随 v1.0.0 发布）

（feat/next-umi）

### 依赖升级阶段 4（2026-09-23）

- pnpm 10 → 11.27.1：11 起不读 `package.json#pnpm` 与 `.npmrc` 非鉴权配置，overrides（49 条）与提升等配置迁入 `pnpm-workspace.yaml`，`allowBuilds` 显式记录不执行的安装脚本；Dockerfile 同步拷贝该文件。未选 12.x：12 是 Rust 重写的原生二进制，pnpm 10 自动切换到它在本机即失败（ENOEXEC）
- 关闭 `shamefullyHoist`：node_modules 顶层只剩声明的依赖；Cesium 默认 token 白名单与 mock 可加载性门禁改为沿依赖链解析传递依赖
- TypeScript 5.9 → 6.0（最后一个带 JS 编译器 API 的版本）。TS 7 暂缓：typescript-eslint 最新版 peer `<6.1.0`；实测 TS 7.0.2 对本项目类型检查 0 错误、1.35s
- ESLint 8（@umijs/lint 预设）→ ESLint 10 flat config（`eslint.config.mjs`，逐条移植 umi 规则集）；stylelint 14 → 17（`stylelint.config.mjs`）。ESLint 9 已于 2026-08 EOL 故直接上 10
- React 18 → 19（项目直接依赖，umi 别名到它）、@types/react 19、react-pdf 11（PDF.js 6.3，`suspense={false}` 保留原告警）；antd 5 经官方 `@ant-design/v5-patch-for-react-19` 兼容 React 19
- 高德页去掉 `@pansy/react-amap`（其 Marker 调用 React 19 已删除的 `unmountComponentAtNode`，库 2024-06 后无更新），改为直接调用 JS API 2.0，加载器仍用 `@pansy/amap-api-loader`，未配 key 时行为不变
- antd 6 + pro-components 3（beta）放在独立实验分支 `chore/deps-phase4-antd6-experimental`，未并入本阶段

### 依赖升级阶段 3（2026-09-23）

- FullCalendar 6 → 7：五个插件包合并为 `@fullcalendar/react/*` 入口，新增 peer `temporal-polyfill`；v7 不再内置 CSS，改为引入 skeleton + Classic 主题（保持 v6 外观）；类型改名（`DateSelectArg` → `DateSelectInfo` 等）；日历随应用暗色主题切换（调色板读取祖先 `data-color-scheme`）。可见差异：v6 下日期数字被 antd 的链接色染成蓝色，v7 恢复正文色；列头默认不加粗
- Tailwind CSS 3 → 4：删除 `tailwind.config.js`，配置迁入 `tailwind.css`（`@theme inline` 桥接 antd CSS 变量、`@source` 限定扫描范围、`@source not inline()` 替代 blocklist）。工具类刻意不放进 `@layer`，保持 v3 与 antd CSS-in-JS 的层叠语义；日历侧栏的 `space-y-3` 改为等价的 v3 选择器（v4 的 space-y 实现会输给 antd 排版外边距）。17 个页面与升级前逐像素对比无差异（日历页除外）
- 浏览器基线提高到 Chrome 111+ / Firefox 128+ / Safari 16.4+（Tailwind 4 要求），README 已注明

### 依赖升级阶段 2（2026-09-23）

- 工程工具主版本：husky 9（`prepare` 改为 `husky`，hook 去掉 v8 的引导行）、lint-staged 17（需 Node ≥22.22.1；配置改名 `.lintstagedrc.json`，17 起无扩展名按 YAML 解析）、cross-env 10（`start` 脚本无环境变量，去掉无效包装）、prettier-plugin-organize-imports 4、prettier-plugin-packagejson 3
- 运行时小型主版本：@dnd-kit/sortable 10、signature_pad 5、ol 10；移除从未被引用的 @dnd-kit/modifiers

### 依赖升级阶段 1（2026-09-23）

- 工具链切到 Node 24 LTS（`.nvmrc` 24.21.0、Docker 构建镜像同步）；engines 由 `>=20`（Node 20 已于 2026-04 停止维护）收紧为 `^22.22.2 || >=24.15.0`，与 Cesium、jsdom 的引擎要求对齐
- 范围内升级：antd 5.17 → 5.29、cesium 1.141 → 1.145、wavesurfer.js 7.12、xgplayer 3.0.26、FullCalendar 6.1.21、react-pdf 10.5、prettier 3.9 等；@umijs/max 暂留 4.7.19（4.7.20 发布不足两天）
- 幽灵依赖清零：classnames、@dnd-kit/utilities、pdfjs-dist（与 react-pdf 内置版本严格一致）显式声明；styled-components 改走 `@umijs/max` 再导出，ProCard 改从 pro-components 导入，fecha 换成 dayjs。仓库卫生门禁新增「导入包必须已声明」与 pdfjs 版本一致性检查，为后续 pnpm 11（不再读取 `.npmrc` 的 shamefully-hoist）铺路
- antd 5.25 起废弃的 `destroyOnClose` 改为 `destroyOnHidden`；vendor-antd 分包覆盖 `@rc-component/*` 作用域
- 依赖审计 low 3 → 1（postcss-selector-parser 两条经 override 修复）

### 审查修复（2026-09-21 审查后）

- 本地开发恢复：`mock/` 下的测试文件导致 umi mock 整批加载失败（dev 全站 HTTP 500、preview 启动即退出），测试移出并加 mock 可加载性门禁
- 纯静态部署可登录：鉴权增加前端本地演示实现（此前 GitHub Pages / Vercel / Docker 下整站锁在登录页）；GitHub Pages 加 404.html、Vercel 加 SPA rewrite
- 请求层对齐 umi 运行时约定：errorHandler 不再产生无人处理的 rejection，`skipErrorHandler` 生效，token 只发往自有后端
- PDF 可用：根因为 umi 默认注入的 core-js 提案 polyfill 强制覆盖原生 `Promise.try`，改为只注入 `core-js/stable`
- Docker：产物启用内容哈希，仅哈希文件长缓存；`.mjs` MIME、安全响应头、nginx 1.30
- TinyMCE 改为自托管 8.9.1（此前实际从 Tiny Cloud 加载，无 key 时编辑器只读，8.9.1 升级对运行时无效）
- 拆包修正：去掉误合并的 media/d3 强制分组，体积门禁新增路由真实首屏指标并接入 CI
- 其余：边框基线、暗色登录页、键盘可操作的顶栏菜单、`<html lang>`、Excel 超链接单元格、D3 首段 NaN、AudioPlayer 歌词解析崩溃、Cesium 署名恢复与初始化收敛、首页图表数据全部自制
- 更正：下方"首屏 JS gzip 2.40MB → 728KB"只统计入口同步脚本；登录后落地页 /home 的真实首屏为 1153KB gzip（修正前 1275KB）
- CI：产物 JWT 扫描原为固定 grep，会被 Cesium 自带的公开默认 ion token 必然命中（PR #9 两条构建因此失败），改为白名单脚本 `scripts/check-dist-secrets.mjs`；CI 改为只在 PR 与手动时触发，不再留下被并发取消的重复运行；README 徽章改为反映 master 的部署工作流

### 安全

- 修复 errorHandler 全部分支不可达的回归（axios 运行时下 `instanceof Response` 恒 false），401 恢复清 token 跳登录
- tinymce 8.5.0 → 8.9.1（消 3 条 high XSS）；axios override 0.31.1 → 1.20.0；依赖审计公告 130 条 → 32 条（high 49 → 5）
- 移除硬编码作者私有 Clarity 项目 ID 的统计脚本，改为 `CLARITY_ID` 环境变量可选注入（默认零统计）
- CI 增加产物 JWT 泄露扫描（放行 Cesium 自带的公开默认 ion token，只输出指纹）与依赖审计步骤；pre-commit 增加类型检查

### 新增

- 鉴权闭环：mock 登录/登出/currentUser 三接口、initialState 真实化、路由守卫、`dontHaveAccess` 权限演示
- 生产演示数据层：纯静态托管下表格 CRUD 经静态 JSON + localStorage 真实可用（`UMI_APP_API_BASE` 可切换真实后端）
- 暗色模式真实现（antd 算法热切换 + ProLayout 联动 + localStorage 持久化）
- Excel 演示页（exceljs 导入/导出）；PDF 页三环境路径统一与失败可见提示
- vitest 测试体系（34 例起步，请求层契约/geoHash 性质/纯函数）
- 体积预算门禁（`pnpm size`）；PR 触发的 CI 工作流
- 社区治理文件（SECURITY/CONTRIBUTING/CODE_OF_CONDUCT/PR 模板）与第三方许可清单

### 变更

- 依赖栈收敛：移除 16 个零引用依赖（含断供 3.5 年的设计器 beta fork 与四个重复热图库）；@umijs/max 4.6.53 → 4.7.19；TypeScript 5.9
- turf 整包改按需子包（根除 AGPL/EPL 传递组件）；热力图演示数据降采样（21k → 5.4k 点）
- 演示媒体替换为自制资源（PDF/音频），移除来源不明的第三方媒体约 10MB

### 性能

- 首屏同步脚本 192 → 4 个，首屏 JS gzip 2.40MB → 728KB（splitChunks 重构）
- 删除 8.3k 行不可达代码（Formily/Designable 死代码、半成品演示页、死数据）

### 修复

- 多边形合并误用 `turf.combine`（只打包不合并）改为 `turf.union` 真并集；轨迹补点丢失短线段终点
- 表格编辑不再清空表单外字段；性别枚举与数据对齐；详情抽屉接通
- en-US 菜单键 HaiAirPosture 错挂修复；lint-staged 双配置收敛为单一配置
- Docker 交付链重建（多阶段 + nginx + .dockerignore，见后续提交）

## 历史版本

见 [git log](https://github.com/Jerry-CodeHub/umi-react-admin/commits/master)。

### 依赖与安全加固（2026-10-07，PR #35/#36/#21）

- 安全 overrides 清零新披露的 2 critical + 7 high（piscina、proxy-addr、compression、source-map-js、brace-expansion、fast-uri 等）；braces（GHSA-vfj7-8cjw-p6xm）与 sprintf-js 无上游补丁，登记接受（THIRD-PARTY-NOTICES，跟踪 issue #38/#39）
- dependabot：ignore `pdfjs-dist`（锁版跟随 react-pdf 内置版本）与 `@ant-design/icons` major（待 antd 6）
- patch-and-minor 组 12 项升级（@umijs/max 4.7.22、vitest 5、eslint 10.12、stylelint 17.16 等），wavesurfer.js 8.0.1
- master 开启 branch protection（required: check / build / e2e）

### 2026-09 演示重构（refactor/*）

方案见 `docs/remediation-plan-2026-09-23.md`（不入库）。

### P8 界面走查修正（2026-09-24）

按「中英 × 明暗 × 1440 / 390 宽」截图矩阵逐页走查后的修正：

- 控制台报错：权限演示页文案里直接写了 `<Access accessible={…}>`，react-intl 按 ICU 语法解析失败并回退成原文（改为 `{code}` 占位符，新增测试拦截文案中的花括号 / 标签）；首次导览第一步遮罩高度为负；dev 下 MFSU 把测试依赖 vitest 当页面依赖预编译报 `node:module`
- 表格：用户 / 设备 / 告警表改按列宽之和决定宽度（原先写死 1300px，1440 宽屏上靠后的列被固定操作列盖住、英文「Delete」被截断）；设备表大区与城市合并为「位置」；手机宽度下不再固定列（勾选列 + 操作列会挤掉全部数据列）
- 手机适配：频谱覆盖图保持最小宽度横向滚动（刻度与标注不再重叠）；音频播放页频谱样式改下拉、舞台改上下布局；截图卡片详情固定两列、编号移到标题下
- 暗色主题：菜单选中项改为浅色高亮（原为整块主色）；签名板随主题变暗，留档图片统一重绘为白底深色笔迹
- 视觉：日历工具栏与网格改用 antd token（原为深石板灰默认皮肤）；波形按峰值归一化、未播放部分用中性灰并显示声道与采样率；图表中「提示」级告警用浅一档的蓝，让严重 / 重要先被看到；角色列表成员数移到标题行、可键盘选择；签名板加签名线提示；异常页子菜单加图标与说明
- 富文本：正文限宽 800px 居中（满宽长行难读），段落格式下拉跟随界面语言
- 空状态：Excel 页的空状态直接是导入拖拽区并列出所需列；Cesium 场强热力图 / 方位测距 / 路线与覆盖进入即绘制主图层；歌词在播放前即可见（原先每次继续播放都会再追加一份歌词列表）
- 工单看板：点击卡片（或聚焦后回车）打开详情抽屉——基本信息、时限、处理进度（创建 → 开始处理 → 完成 → 验收签字，含签名图），底部可直接流转状态；拖拽改为鼠标移动 6px / 触屏长按 250ms 才激活（原 PointerSensor 在触屏上被浏览器滚动手势抢走，手机上根本拖不动）；例行巡检增加计划开工时间，待处理卡片显示「计划 MM-DD 开始」
- 日程：点击日程先看详情（类型、时间），删除需二次确认（原先一点就弹删除确认）；手机上默认按周列表视图、日历排在侧栏之前；日历在页面挂载后才渲染，消除开发环境 "Can't perform a React state update on a component that hasn't mounted yet" 警告（FullCalendar 在 render 阶段就发起拉取，被 React 丢弃的那次渲染回写状态）
- 登录页：窄屏在登录框上方保留产品标识与一句话定位；「或使用任意用户名登录」改为次要文字色
- 手机上首次导览第一步指向左上角菜单按钮（原先指向隐藏的顶部菜单，浮在半空）；工作台告警趋势窄屏按周取刻度；英文日志「Change role permissions」缩为「Edit role」，不再溢出到相邻列
- 演示后端响应改为按发出顺序返回：随机耗时允许乱序时，快速切换筛选（如「只看未恢复」）的旧请求晚到会覆盖新结果（ProTable 的中止只停 loading、不拦回写），e2e 偶发失败即由此暴露
- 演示数据：操作日志中同一告警 / 工单的同一操作只记一次，派单由值班长操作（原先出现同一人两次派发同一张工单）；覆盖合并按钮不再写「东北区 214 个站点」（与全国 240 站的设定矛盾），改为「214 个覆盖多边形」；`STORE_VERSION` 升到 2

### P7 部署与使用体验（2026-09-24）

- 登录页重做：左侧产品说明与亮点，右侧「以管理员体验」「以访客体验（受限权限）」一键登录，表单预填；登录页可直接切换明暗与语言
- 首次登录导览（antd Tour，4 步：菜单分组 → 主题与语言 → 账户菜单与重置 → 查看源码），可从头像菜单「功能导览」重新打开
- 构建信息：页脚显示构建时间、部署目标与提交号（链接到提交），并输出 `dist/version.json`；Docker 经 `--build-arg GIT_SHA` 传入提交号
- 路由切换的加载占位改为贴近页面形状的骨架；项目标识换成自制 SVG（同时作为 favicon），删除沿用的 umi 标识与未使用的图片
- 体积：pro-components 拆为异步 `vendor-pro`，入口 JS 由 777KB 降到 649KB gzip、登录页由 779KB 降到 652KB，预算相应收紧到 700KB
- E2E（Playwright，`e2e/`）：对 GitHub Pages 同构产物逐页断言无未捕获异常、无 console.error、无 CSP 违规；英文界面逐页断言无遗漏中文；关键流程（登录回跳、旧路径重定向、访客 403 与脱敏、KPI 与台账口径一致、告警转工单与看板拖动、重置演示数据、版本信息）。CI 新增 e2e 任务；部署后等待线上 `version.json` 切到本次提交再对线上跑 `@smoke`
- 部署提交改用 github-actions[bot] 身份（不再计入维护者的贡献图）
- Cesium 影像瓦片请求失败时的未处理拒绝不再刷屏（缺几块瓦片不影响使用）
- `pnpm preview` 改用与 GitHub Pages 行为一致的静态服务器（`scripts/serve-dist.mjs`），不再用自带 mock 的 `max preview`
- 文档：README、CONTRIBUTING、SECURITY 与新架构对齐

### P6 地图（2026-09-24）

- 高德与 OpenLayers：两张地图显示同一批 240 个监测站，按状态着色、按状态筛选（带数量）、点击弹出站点卡片（两页共用一个 React 组件）；高德暗色主题切换深色底图，OpenLayers 暗色下瓦片反色
- Cesium 六个场景统一到 `useCesiumViewer` / `CesiumStage`（创建、初始视角、错误态、外部事件处理器的销毁都在一处），并按业务重做：
  - GeoHash 网格：把 240 个站点按 GeoHash 分桶计数（精度可调）、查看视野中心的网格编码
  - 方位测距：外场监测点的截获 / 定位 / 解调包络；新增 `utils/MapCompute/geodesy.ts`（大圆公式），由「方位 + 距离」反算的包络与实测经纬度的误差 < 3 km（测试断言）。原算法把方位 0 当作正东、且不按纬度缩放经度，已删除
  - 场强热力图：图片纹理与点云（悬停读取场强、分级图例）
  - 路线与覆盖：巡检路线规划（逐点点击，按公里生成采样点并给出全长）、三种能力包络的 turf 并集、东北区 214 个站点覆盖的凸包合并与逐个显示对比
  - 框选与测距：在站点上框选统计、两点直线距离
  - 海空态势：关注海域内 7 个目标按航速插值运动（SampledPositionProperty），可调播放速度、开关航迹、点击查看目标
- 数据与代码分离：删除写在 TS 里的 2,694 行数据（`exportJson.ts`、`dataEnd.ts`，其中 800 行 `thermal` 从未被引用），改为 `public/data/cesium/*.json` 按需加载；删除不再使用的计算函数与图标
- 样式收敛完成：移除 styled-components 插件配置、全局 Less 与 `postcss-less`，样式只剩 antd token + Tailwind + 少量按根类名隔离的 CSS
- 多语言迁移完成：`I18N_PENDING` 清空，代码中不再有直接书写的中文界面文案

### P5b 组件、多媒体与文档（2026-09-24）

- 日程：日程来自接口（值班交接、现场巡检、复盘评审、培训、维护窗口、版本发布，按类型着色），框选新建、拖动 / 拉伸改期、点击删除都写回接口；侧栏显示类型图例与「接下来」列表
- 富文本：TinyMCE 预置一份按当前数据生成的运维周报（核心指标表、告警类型 Top 3、下周巡检计划），插值全部转义，回显仍经 DOMPurify；只打包实际用到的 8 个插件
- 电子签名：改为工单验收场景——选择近 3 天完成的工单，签字后写回工单（看板卡片显示「已验收签字」），可下载签名 PNG；画布随容器与像素比自适应，改用 ref 而非全局 id
- 视频 / 音频：外壳统一、文案双语；音乐播放器改用原生 Segmented 切换频谱样式、唱片随播放旋转，歌词中英双语；波形页颜色跟随主题、显示播放进度
- PDF：删除原先写着开发说明的 `public/demo.pdf`，改为在浏览器内按当前数据生成两页月报（复用工作台图表，html2canvas 截图 + 手写的最小 PDF 封装，无需嵌入中文字体），react-pdf 预览、可下载，也可打开本地 PDF
- 样式：以上页面的 styled-components 全部移除（信号板、PDF、音频页），音乐播放器的舞台样式改为按根类名隔离的普通 CSS
- 修复：Tailwind 4 默认边框色是 `oklch()`，html2canvas 1.x 无法解析，截图页与 PDF 生成会整体失败；基础层边框色改为 rgb 写法

### P5a 设备运维（2026-09-24）

- 设备台账（新）：240 台监测站，按大区、型号、状态筛选，在线率 / 电平 / 心跳排序；详情抽屉含最近告警
- 告警中心（新）：近 90 天告警，按级别、类型、状态、大区、时间范围筛选，「只看未恢复」开关；未恢复告警可转工单、标记恢复或误报关闭，转出的工单立即出现在看板
- 工单看板：替换原先 944 行的 dnd-kit 示例拷贝（只画了 16 个数字方块），改为三列看板——卡片含优先级、处理人、时限剩余 / 超时；拖动流转状态并写回（乐观更新，失败回退）；键盘左右方向键直接跨列；可按故障 / 巡检筛选。删除不再使用的 `@dnd-kit/sortable`、`@dnd-kit/utilities`
- 频谱占用：替换原先 1,006 行的 D3 频率图，改为对数频率轴上的型号覆盖带与重点业务频段叠加（宽度随容器自适应、颜色跟随主题），下方表格列出各重点频段可监测的在线设备数与覆盖型号
- 演示数据：例行巡检改为多站点连续作业（3~6 天），看板「处理中」列在任何时刻都有内容

### P4 系统管理（2026-09-24）

- 用户管理：头像 + 姓名 + 邮箱、工号、部门、角色、脱敏手机、状态、最近登录（相对时间，悬停看精确时间）；关键字 / 部门 / 角色 / 状态筛选与服务端排序分页；新建 / 编辑表单带校验；单个与批量启用、停用、删除（体验账号与当前账号受保护）；详情抽屉展示该用户最近的操作记录
- 角色权限（新）：五种内置角色与成员数，按权限点树勾选配置、恢复默认；系统管理员角色锁定全部权限
- 操作日志（新）：近 30 天审计记录，按关键字、操作类型、结果、时间范围筛选；在演示站里的登录、编辑等操作实时出现在这里
- 权限演示：当前身份卡片与一键切换（管理员 ↔ 访客）；路由级（无权限访问得到 403）、按钮级（`<Access>` 隐藏或禁用）、数据级（精确坐标仅管理员可见）三个示例并排对比
- Excel 导入导出与用户管理同源：导出全部用户、下载模板；导入时表头与部门 / 角色取值中英文都能识别，逐行校验必填、邮箱、登录名格式、已存在与文件内重复，确认后写入用户表
- 仓库卫生门禁的导入识别不再把 `'import'` 这类字符串误判为模块导入

### P3 工作台（2026-09-24）

- 首页重做为运营工作台：4 个 KPI（在线设备、今日告警及较昨日同期、工单时限达成率、平均响应时长，后两项与前 30 天对比，按「好 / 坏」而非涨跌着色）+ 告警趋势（按级别堆叠，30/90 天切换）+ 告警类型环图 + 各大区在线率 + 告警处置流向桑基图 + 设备健康散点 + 设备分布旭日图 + 最新动态；全部来自 `/api/v1/dashboard/overview`，由明细实时聚合，每分钟自动刷新
- 图表跟随明暗主题（G2 classic / classicDark），级别等语义色全站一致；卡片内置加载骨架与出错重试；栅格按 xs / md / xl 响应式排布，手机宽度单列
- 截图页改为截取一张告警详情卡片（含图表，背景跟随主题），支持预览与下载
- 删除首页旧的静态图表数据（`public/data/charts`）与其生成脚本，业务数据统一由 `src/demo` 生成

### P2 信息架构与页面外壳（2026-09-24）

- 菜单重组为 工作台 / 系统管理 / 设备运维 / 地图 / 组件 / 多媒体 / 文档 / 异常页，路径统一小写 kebab-case；旧版 34 条路径全部重定向到新地址（`config/routes.ts` 的 `LEGACY_REDIRECTS`，`scripts/routes.test.ts` 校验目标存在、组件文件存在、菜单双语键齐全）
- 演示页统一外壳 `DemoPage`：标题与面包屑取自路由，下方一句话说明，右上角「查看源码」直达仓库文件
- 多语言基础设施：文案按领域拆分（menu / framework / enums / pages），中英键集一致、英文无中文、占位符一致由 `locales.test.ts` 把关；ESLint 新增 `local/no-cjk-literal`，代码里直接写中文即报错（尚未迁移的页面在 `I18N_PENDING` 清单中，随后续阶段清空）。首次访问按浏览器语言选择界面语言
- 请求层、错误边界、业务错误的兜底文案改为从 locales 取默认语言，不再在代码里另写中文
- 顶栏重做：一键切换明暗主题、语言、GitHub、账户菜单（重置演示数据 / 退出登录），头像按姓名生成首字与固定底色
- 应用列表换成项目相关链接（文档、更新日志、问题反馈、Ant Design、Umi、AntV），图标改用内置图标；CSP 随之去掉两个阿里图片域名
- 新增 `useChartTheme`（图表跟随明暗主题）与全站语义色常量（告警级别、设备状态、工单状态、分类色板）；新增 500 异常页
- 修复：Cesium「模型」页文件名 `Model.tsx` 被 umi model 插件当作数据模型自动加载（大小写不敏感文件系统上 dev 编译失败），改名 `ModelMeasure.tsx`

### P1 演示数据底座（2026-09-24）

- 统一的演示后端 `src/demo`：浏览器内运行的 REST 服务，经请求层 axios adapter 接入；dev、preview 与 GitHub Pages / Vercel / Docker 走同一套实现。删除 `mock/` 目录、umi mock 配置、`services/demo` 与 `USE_BACKEND` 双链路（mock 目录曾导致 dev 全站 500）。未采用 MSW：Service Worker 只在 https / localhost 可用，Docker 经 http 内网地址访问时会整站无法登录
- 数据故事：虚构的「物联网监测运营平台」——86 名用户（7 个部门、5 种角色）、34 个城市 240 台监测设备、近 90 天约 1,500 条告警、由告警派生的工单与例行巡检、近 30 天操作日志、前后五周日程。按日历日播种：每天的历史固定、窗口随今天滑动；工单状态按「现在」推导，看板与 KPI 随时间自然演进
- 合理性门禁 `src/demo/generate.test.ts`：级别比例、工作日/周末节律、时间线先后、设备状态与活动告警对应、KPI 与明细口径一致、邮箱仅 example.com、手机号仅脱敏、IP 仅文档保留段、中英数据同构
- 改动以补丁形式存 localStorage（带版本号，结构变化时整体作废；损坏数据自动丢弃；清理旧版 `umi-react-admin-demo-users` 键），支持一键重置
- 接口契约 `src/services/types.ts` 与按领域拆分的服务模块（users / system / ops / events）；删除 OneAPI 生成的 `any` 服务代码
- 体验账号：`admin`（系统管理员）与 `guest`（访客，受限权限）；种子用户按角色签发 token，停用后已签发的 token 立即失效
- 修复：登录后偶发被弹回登录页（状态未提交即跳转，登录请求变为异步后稳定复现），改为登录态写入后再跳转；未登录打开受保护页面由「无权访问」改为先去登录并在登录后回到原页面（只接受站内路径）

### P0 热修（2026-09-23）

- 音频可视页恢复播放：wavesurfer 7 以 blob URL 播放音频，CSP `media-src` 补 `blob:`（GitHub Pages meta 与 vercel.json 为强制模式，09-22 安全头上线后该页点击播放无反应）
- 视频封面改为自制 SVG 随站点托管（原热链图片被 CSP `img-src` 拦截，播放器区为白底）
- CSP 单一来源 `config/csp.ts`：GitHub Pages meta 直接引用，vercel.json 与 nginx 副本由 `scripts/csp-consistency.test.ts` 逐字比对
- 发版后旧 chunk 丢失自愈：错误边界识别 ChunkLoadError 后自动刷新一次（60 秒内至多一次），仍失败则提示「站点已更新」；错误边界文案接入双语
