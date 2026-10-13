# Contributing Guide

> **中文版**：[CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md) — the two copies are maintained in sync.

Thanks for your interest in umi-react-admin!

## Setting up

- Node.js 24 LTS (see `.nvmrc`; nvm / fnm recommended); minimum 22.22.2
- pnpm 11 (the `packageManager` field pins the version; pnpm 10 and corepack auto-switch). Configuration lives in `pnpm-workspace.yaml`; `.npmrc` only holds auth/registry. Switching from pnpm 10 requires rebuilding `node_modules` (add `--config.confirm-modules-purge=false` in non-interactive terminals).

```bash
pnpm install
cp .env.example .env.local   # fill in as needed
pnpm start:demo
```

## Workflow

1. Fork and branch off `master` with a short-lived branch (`feat/xxx`, `fix/xxx`)
2. Use conventional commit prefixes (`feat:` / `fix:` / `chore:` / `perf:` / `refactor:` / `test:` / `docs:`) — the commit-msg hook validates them
3. Run `pnpm check` before committing (typecheck + strict lint + vitest); run `pnpm e2e:build` (browser smoke) when pages change, and `pnpm size` (bundle budget gate) when build configuration changes
4. Open a PR — CI runs the full quality gates (build smoke, Playwright, artifact secret scanning)

## Conventions

- Naming: components PascalCase, utility functions camelCase, component directories PascalCase; route paths lowercase kebab-case (when changing a path, register the old one in `LEGACY_REDIRECTS` in `config/routes.ts`)
- No `console.log` (warn/error allowed); `===` enforced; avoid explicit `any`
- All UI copy goes through `src/locales` (zh/en key parity enforced by tests); Chinese literals in code are rejected by the `local/no-cjk-literal` rule (demo data in `src/demo` is exempt)
- Styling: antd tokens + Tailwind; third-party component skins use plain CSS scoped by a root class. styled-components / Less / CSS Modules are not used
- New pages use the `DemoPage` shell (description + view-source) and fetch data via `src/services` and the demo backend (`src/demo/server/routes.ts`) — never hard-code sample data in pages
- New files under `public/` must be registered in [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md) with source and license

## Testing

- Unit tests: `src/**/*.test.ts` (vitest) — demo data sanity, demo backend endpoints, request layer, geo math, import/export
- Repo-level: `scripts/*.test.ts` — repository hygiene, CSP consistency across the three pipelines, route table (components exist, legacy paths resolve, bilingual menu keys)
- Browser: `e2e/` (Playwright) — every page free of errors / CSP violations, English UI without leftover Chinese, key business flows; cases tagged `@smoke` re-run against the live site after each deployment
- Coverage: `pnpm test:coverage` (the starter set lives in `vitest.config.ts`)
