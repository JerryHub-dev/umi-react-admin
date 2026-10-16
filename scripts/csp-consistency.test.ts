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

/** 取一条指令的完整文本（含指令名），用于逐条比对漂移 */
const directiveOf = (csp: string | undefined, name: string) =>
  csp?.split('; ').find((directive) => directive.startsWith(`${name} `));

/**
 * 三条产线的 CSP 必须同源（config/csp.ts）。2026-09-22 的安全头 PR 在三处手写同一份清单，
 * 漏了 media-src blob:，音频可视页在 GitHub Pages 与 Vercel 上无法播放——这里把漂移挡在 CI。
 */
describe('CSP 三产线一致性', () => {
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
    for (const copy of [vercelCsp(), nginxCsp()]) {
      expect(directiveOf(copy, 'script-src')).toBe(canonical);
      expect(directiveOf(copy, 'script-src')).not.toContain('*');
    }
  });
});
