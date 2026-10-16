import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCsp } from '../config/csp';

const root = new URL('..', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, root), 'utf8');

const vercelCsp = () =>
  (JSON.parse(read('vercel.json')) as { headers: { headers: { key: string; value: string }[] }[] }).headers
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === 'Content-Security-Policy')?.value;

const nginxCsp = () => /add_header Content-Security-Policy "([^"]+)"/.exec(read('nginx/security-headers.conf'))?.[1];

/** vercel.json 的全部响应头（name → value） */
const vercelHeaders = () =>
  new Map(
    (JSON.parse(read('vercel.json')) as { headers: { headers: { key: string; value: string }[] }[] }).headers
      .flatMap((rule) => rule.headers)
      .map((header) => [header.key, header.value]),
  );

/** nginx/security-headers.conf 的全部 add_header（name → value） */
const nginxHeaders = () =>
  new Map(
    [...read('nginx/security-headers.conf').matchAll(/^add_header ([\w-]+) "([^"]+)" always;$/gm)].map((match) => [
      match[1],
      match[2],
    ]),
  );

/**
 * public/_headers（Cloudflare Pages）按平台语法解析：`#` 注释、不缩进的行是 URL 规则、缩进的行是 `Name: value`。
 * 返回每条规则及其响应头，供一致性与平台限制断言共用。
 */
const cloudflareRules = () => {
  const rules: { url: string; headers: Map<string, string> }[] = [];
  for (const line of read('public/_headers').split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ url: line.trim(), headers: new Map() });
      continue;
    }
    const separator = line.indexOf(':');
    rules.at(-1)?.headers.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return rules;
};
const cloudflareHeaders = () =>
  cloudflareRules().find((rule) => rule.url === '/*')?.headers ?? new Map<string, string>();

/** 取一条指令的完整文本（含指令名），用于逐条比对漂移 */
const directiveOf = (csp: string | undefined, name: string) =>
  csp?.split('; ').find((directive) => directive.startsWith(`${name} `));

/**
 * 各产线的 CSP 必须同源（config/csp.ts）。2026-09-22 的安全头 PR 在三处手写同一份清单，
 * 漏了 media-src blob:，音频可视页在 GitHub Pages 与 Vercel 上无法播放——这里把漂移挡在 CI。
 * 副本：vercel.json、nginx/security-headers.conf、public/_headers（Cloudflare Pages），
 * 以及 GitHub Pages 的 meta 版（由 config.github.ts 直接调用 buildCsp 生成，无需比对）。
 */
describe('CSP 与安全响应头的多产线一致性', () => {
  it('vercel.json 的 CSP 响应头与 config/csp.ts 一致', () => {
    const vercel = JSON.parse(read('vercel.json')) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const csp = vercel.headers
      .flatMap((rule) => rule.headers)
      .find((header) => header.key === 'Content-Security-Policy')?.value;
    expect(csp).toBe(buildCsp());
  });

  it('nginx/security-headers.conf 的 CSP 与 config/csp.ts 一致', () => {
    const matched = /add_header Content-Security-Policy "([^"]+)"/.exec(read('nginx/security-headers.conf'));
    expect(matched?.[1]).toBe(buildCsp());
  });

  it('public/_headers（Cloudflare Pages）的 CSP 与 config/csp.ts 一致', () => {
    expect(cloudflareHeaders().get('Content-Security-Policy')).toBe(buildCsp());
  });

  /**
   * 不只 CSP：其余安全头此前在 vercel.json 与 nginx 两处手写、从未互相比对。
   * Cloudflare Pages 接入后成了第三份副本，这里要求三处的头名集合与取值逐项相同。
   */
  it('Vercel / nginx / Cloudflare Pages 三处的安全响应头逐项一致', () => {
    const reference = vercelHeaders();
    expect([...reference.keys()].sort()).toEqual([
      'Content-Security-Policy',
      'Permissions-Policy',
      'Referrer-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
    ]);
    for (const [name, headers] of [
      ['nginx/security-headers.conf', nginxHeaders()],
      ['public/_headers', cloudflareHeaders()],
    ] as const) {
      expect({ name, headers: Object.fromEntries(headers) }).toEqual({ name, headers: Object.fromEntries(reference) });
    }
  });

  it('public/_headers 符合 Cloudflare Pages 的平台限制（≤100 条规则、单个响应头 ≤2000 字符）', () => {
    const rules = cloudflareRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.length).toBeLessThanOrEqual(100);
    for (const rule of rules) {
      for (const [name, value] of rule.headers) expect(`${name}: ${value}`.length).toBeLessThanOrEqual(2000);
    }
  });

  it('meta 版剔除浏览器不支持的 frame-ancestors', () => {
    expect(buildCsp({ meta: true })).not.toContain('frame-ancestors');
    expect(buildCsp()).toContain("frame-ancestors 'self'");
  });

  /**
   * F5（审查 2026-10）：script-src 曾被写成 https://*.amap.com —— 通配符信任 amap.com 的整个子域树。
   * 实际只有 @pansy/amap-api-loader 注入脚本（主机 https://webapi.amap.com，推导与包版本绑定见
   * scripts/csp-amap-pinning.test.ts）。三条产线必须都是同一个精确主机，且不得再出现通配符。
   */
  it('三处 script-src 精确收窄到加载器主机，且不含通配符', () => {
    const canonical = "script-src 'self' 'unsafe-eval' https://webapi.amap.com";
    expect(directiveOf(buildCsp(), 'script-src')).toBe(canonical);
    for (const copy of [vercelCsp(), nginxCsp(), cloudflareHeaders().get('Content-Security-Policy')]) {
      expect(directiveOf(copy, 'script-src')).toBe(canonical);
      expect(directiveOf(copy, 'script-src')).not.toContain('*');
    }
  });
});
