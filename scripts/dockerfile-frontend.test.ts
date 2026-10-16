import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('..', import.meta.url);
const dockerfile = readFileSync(new URL('Dockerfile', root), 'utf8');
/** 只看指令行：注释里会提到 `# syntax=...` 与 `RUN --mount=type=secret` 这类反例说明 */
const instructions = dockerfile
  .split('\n')
  .filter((line) => !/^\s*#/.test(line))
  .join('\n');

/** 需要外部 BuildKit frontend 的能力：默认 frontend 不支持，出现时必须显式固定 frontend 版本 */
const FRONTEND_ONLY = [/<<-?\s*['"]?[A-Z]/, /--mount\s*=/, /COPY\s+--link/, /COPY\s+--parents/, /ADD\s+--checksum/];
/** 精确版本（可选摘要）：:1 / :latest / :1.7 / :1.7.0-labs 之类的浮动或变体 tag 都不接受 */
const FRONTEND_REFERENCE = String.raw`docker\/dockerfile:\d+\.\d+\.\d+(?:@sha256:[0-9a-f]{64})?`;
const PINNED_FRONTEND = new RegExp(`^${FRONTEND_REFERENCE}$`);
const PINNED_OR_ABSENT = new RegExp(`^(?:${FRONTEND_REFERENCE}|<none>)$`);
const SYNTAX_DIRECTIVE = /^#\s*syntax\s*=\s*(\S+)\s*$/im;

/**
 * F9（审查 2026-10）：Dockerfile 首行曾是 `# syntax=docker/dockerfile:1`。
 * 该 tag 可变：构建时会隐式从上游拉取一个随时可能变化的解析器镜像，与两个 base 镜像
 * 都已按 sha256 摘要固定的策略不一致（供应链可变依赖）。当前文件只使用默认 frontend 支持的
 * 指令，所以声明被删除；若将来需要 BuildKit 专属语法，必须精确固定版本/摘要并同步本测试。
 *
 * 验证方式（离线，无 docker daemon）：逐条列出 Dockerfile 用到的指令/语法，与默认 frontend
 * 能力对照（见下）；本机未运行真实 `docker build`（Docker daemon 未启动）。
 */
describe('Dockerfile BuildKit frontend 固定性（F9）', () => {
  it('没有未固定的 docker/dockerfile tag', () => {
    expect(SYNTAX_DIRECTIVE.exec(dockerfile)?.[1] ?? '<none>').toMatch(PINNED_OR_ABSENT);
  });

  it('未声明外部 frontend 时不得使用其专属语法（heredoc / RUN --mount / COPY --link 等）', () => {
    const pinnedFrontend = PINNED_FRONTEND.test(SYNTAX_DIRECTIVE.exec(dockerfile)?.[1] ?? '');
    const used = FRONTEND_ONLY.filter((pattern) => pattern.test(instructions)).map((pattern) => pattern.source);
    // 用了专属语法就必须显式固定 frontend；没有固定时违规清单必须为空
    expect(pinnedFrontend ? [] : used).toEqual([]);
  });

  it('只使用默认 frontend 支持的经典指令', () => {
    const used = [...instructions.matchAll(/^([A-Z]+)\s/gm)].map((match) => match[1]);
    const allowed = new Set(['FROM', 'ARG', 'WORKDIR', 'COPY', 'RUN', 'EXPOSE', 'ENV', 'USER', 'CMD', 'ENTRYPOINT']);
    expect([...new Set(used)].filter((name) => !allowed.has(name))).toEqual([]);
  });

  it('保留多阶段构建与 --from 拷贝（默认 frontend 支持）', () => {
    expect(dockerfile).toMatch(/^FROM\s+\S+\s+AS\s+builder$/im);
    expect(dockerfile).toMatch(/^COPY\s+--from=builder\s+\S+\s+\S+$/m);
    expect(instructions).toMatch(/^RUN\s+corepack enable/m);
  });

  it('两个 base 镜像都按摘要固定（与 frontend 固定同一策略）', () => {
    const froms = [...dockerfile.matchAll(/^FROM\s+(\S+)/gim)].map((match) => match[1]);
    expect(froms.length).toBeGreaterThanOrEqual(2);
    expect(froms.filter((image) => !/@sha256:[0-9a-f]{64}$/.test(image))).toEqual([]);
  });
});
