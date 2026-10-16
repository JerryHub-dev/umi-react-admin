import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, navigate, signIn, test } from './fixtures';

/**
 * Q5 无障碍回归：对 10 条路由在浅色 / 暗色两套主题下跑 axe-core，逐路由打印 critical/serious 计数。
 *
 * 门禁标准：critical = 0 且 serious = 0（axe 全规则集，不做 impact 阈值放宽）。
 * axe-core 从本地 pnpm store 注入（page.addScriptTag），不需要网络、不新增依赖。
 * 允许的排除项必须逐条登记在 EXCLUSIONS 中（规则 id + 精确节点选择器 + 理由）。
 */

type Impact = 'minor' | 'moderate' | 'serious' | 'critical' | null;

type AxeNode = { html: string; target: string[]; failureSummary?: string };

type AxeViolation = {
  id: string;
  impact: Impact;
  help: string;
  tags: string[];
  nodes: AxeNode[];
};

type AxeResults = { violations: AxeViolation[]; incomplete: AxeViolation[] };

/** 主题：与 src/utils/Auth/initialState.ts 的 THEME_STORAGE_KEY 一致 */
type Theme = 'light' | 'realDark';

const ROUTES = [
  '/',
  '/system/users',
  '/system/roles',
  '/system/logs',
  '/ops/devices',
  '/ops/alarms',
  '/ops/tickets',
  '/document/excel',
  '/document/pdf',
  '/components/calendar',
] as const;

/**
 * 第三方/框架误报登记表。每一项都必须给出规则 id、精确节点选择器与理由，且只命中该节点。
 * 目前为空：所有违规都在源码里真实修掉，不放宽任何规则。
 */
type Exclusion = { route: string; theme: Theme | 'both'; id: string; target: string; reason: string };

const EXCLUSIONS: Exclusion[] = [];

const isExcluded = (route: string, theme: Theme, violation: AxeViolation, node: AxeNode) =>
  EXCLUSIONS.some(
    (item) =>
      item.id === violation.id &&
      item.target === node.target.join(' ') &&
      (item.route === route || item.route === '*') &&
      (item.theme === 'both' || item.theme === theme),
  );

/** 解析本地 pnpm store 中的 axe-core 源码路径（axe-core 是传递依赖，没有顶层符号链接） */
const resolveAxeSource = (): string => {
  const root = process.cwd();
  const candidates = [join(root, 'node_modules/axe-core/axe.min.js')];
  const store = join(root, 'node_modules/.pnpm');
  if (existsSync(store)) {
    for (const entry of readdirSync(store)) {
      if (entry.startsWith('axe-core@')) {
        candidates.push(join(store, entry, 'node_modules/axe-core/axe.min.js'));
      }
    }
  }
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error('axe-core 未在本地 pnpm store 中找到；拒绝下载，请检查依赖安装');
  }
  return found;
};

const AXE_SOURCE = resolveAxeSource();
const AXE_ROUTE = '**/a11y-axe.min.js';

/**
 * 站点 CSP 是 `script-src 'self'`（无 unsafe-inline），addScriptTag 内联注入会被浏览器拦下；
 * 改成同源 URL + page.route 直接回本地 axe-core 源码，既不需要网络也不放宽 CSP。
 */
const injectAxe = async (page: import('@playwright/test').Page) => {
  const loaded = await page.evaluate(() => Boolean((window as unknown as { axe?: unknown }).axe));
  if (loaded) return;
  await page.route(AXE_ROUTE, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: readFileSync(AXE_SOURCE, 'utf8') }),
  );
  await page.addScriptTag({ url: '/a11y-axe.min.js' });
  await page.unroute(AXE_ROUTE);
};

const runAxe = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          axe: { run: (context: Document) => Promise<AxeResults> };
        }
      ).axe.run(document) as Promise<AxeResults>,
  );

const settle = (route: string) => (route === '/components/calendar' ? 2000 : 1200);

/**
 * 到达暗色的两条路径必须分别验证：冷启动（localStorage + reload，算法从头算）与顶栏切换
 * （umi `setAntdConfig` 深合并 `merge({}, prev, next)`，只覆盖新配置里出现的键）。
 * 只测冷启动会漏掉整整一类缺陷：两套 token 键集合不对称时，浅色值在切换后残留，
 * 暗色算法从浅色 seed 重新派生，状态色文字在 #141414 上只剩 2.4~2.8:1，而冷启动完全正常。
 * 切换路径覆盖评审给出会泄漏的页面（状态色文字渲染处）。
 */
type Path = 'boot' | 'toggle';

const TOGGLE_ROUTES = ['/', '/ops/devices', '/ops/alarms', '/ops/tickets'] as const;

const CASES: { route: string; theme: Theme; path: Path }[] = [
  ...ROUTES.map((route) => ({ route, theme: 'light' as const, path: 'boot' as const })),
  ...ROUTES.map((route) => ({ route, theme: 'realDark' as const, path: 'boot' as const })),
  ...TOGGLE_ROUTES.map((route) => ({ route, theme: 'realDark' as const, path: 'toggle' as const })),
];

const label = (theme: Theme, path: Path) => (path === 'toggle' ? `${theme} · 切换` : theme);

const prepare = async (page: import('@playwright/test').Page, route: string, theme: Theme, path: Path) => {
  // 真实模式（本地基线服务器）用 cookie 会话：不清 cookie 会直接跳过登录页，signIn 拿不到表单
  await page.context().clearCookies();
  await signIn(page);
  if (theme === 'realDark' && path === 'boot') {
    await page.evaluate(() => localStorage.setItem('umi_theme', 'realDark'));
    await page.reload();
    await expect(page.locator('.ant-pro-page-container, .ant-result').first()).toBeVisible();
  }
  await navigate(page, route);
  await expect(page.locator('.ant-pro-page-container, .ant-result').first()).toBeVisible();
  if (path === 'toggle') {
    await page.locator('button[data-tour="theme"]').click();
    // 断言切换真的落到 token 上：localStorage 只是「意图」，--ant-color-primary 才是渲染用的值。
    // 键集合不对称（缺陷版本）时这里会停在浅色的 #0958d9，测试直接失败，而不会误判成通过。
    await expect
      .poll(
        () =>
          page.evaluate(() => ({
            stored: localStorage.getItem('umi_theme'),
            primary: getComputedStyle(document.querySelector('.ant-app') as Element)
              .getPropertyValue('--ant-color-primary')
              .trim(),
          })),
        { message: '顶栏切换后应立即应用暗色 token（不是只写 localStorage）' },
      )
      .toEqual({ stored: 'realDark', primary: '#1668dc' });
  }
  await page.waitForTimeout(settle(route));
};

const counts = (violations: AxeViolation[]) => ({
  critical: violations.filter((item) => item.impact === 'critical').length,
  serious: violations.filter((item) => item.impact === 'serious').length,
  moderate: violations.filter((item) => item.impact === 'moderate').length,
  minor: violations.filter((item) => item.impact === 'minor').length,
});

/** 逐路由计数落盘 + 断言消息里带上同一行：失败时报告里也能直接读到 before/after 对比 */
const REPORT = join(process.cwd(), 'test-results', 'a11y-counts.jsonl');

const record = (entry: Record<string, unknown>, line: string) => {
  mkdirSync(join(process.cwd(), 'test-results'), { recursive: true });
  appendFileSync(REPORT, `${JSON.stringify(entry)}\n`);
  return line;
};

for (const { route, theme, path } of CASES) {
  test.describe(`axe 无障碍审计（${theme} / ${path}） @a11y`, () => {
    test(`${route} [${label(theme, path)}]`, async ({ page }) => {
      await prepare(page, route, theme, path);
      await injectAxe(page);
      const results = await runAxe(page);

      const violations = results.violations
        .map((violation) => ({
          ...violation,
          nodes: violation.nodes.filter((node) => !isExcluded(route, theme, violation, node)),
        }))
        .filter((violation) => violation.nodes.length > 0);

      const summary = counts(violations);
      const detail = violations
        .map((violation) => `${violation.id}(${violation.impact}:${violation.nodes.length})`)
        .join(' ');
      const nodes = violations.flatMap((violation) =>
        violation.nodes.map((node) => ({
          id: violation.id,
          impact: violation.impact,
          target: node.target.join(' '),
          html: node.html.slice(0, 200),
          failureSummary: node.failureSummary,
        })),
      );
      const line = record(
        { route, theme, path, summary, detail, nodes },
        `[a11y] ${route} ${label(theme, path)} critical=${summary.critical} serious=${summary.serious} moderate=${summary.moderate} minor=${summary.minor} ${detail}`,
      );
      test.info().annotations.push({ type: 'a11y-counts', description: line });

      const critical = violations.filter((item) => item.impact === 'critical');
      const serious = violations.filter((item) => item.impact === 'serious');
      expect(
        critical.map((item) => item.id),
        `critical ${route} [${label(theme, path)}] :: ${line}`,
      ).toEqual([]);
      expect(
        serious.map((item) => item.id),
        `serious ${route} [${label(theme, path)}] :: ${line}`,
      ).toEqual([]);
    });
  });
}
