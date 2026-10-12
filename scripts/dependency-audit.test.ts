import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assessAdvisories, parseAudit, verifyInstalledPatches } from './dependency-audit.mjs';

const report = (overrides: Record<string, unknown> = {}) => ({
  advisories: {
    '1': {
      github_advisory_id: 'GHSA-vfj7-8cjw-p6xm',
      module_name: 'braces',
      severity: 'high',
      findings: [{ version: '3.0.3', paths: ['.>micromatch>braces'] }],
      ...overrides,
    },
  },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } },
});

describe('依赖审计必须保留原始公告并证明全部实际实例', () => {
  it('缺失或不完整的接口结果不能通过', () => {
    expect(() => parseAudit('{}')).toThrow();
    expect(() => parseAudit('not json')).toThrow();
    expect(() => parseAudit(JSON.stringify({ ...report(), advisories: {} }))).toThrow(/mismatch/);
    expect(() => parseAudit(JSON.stringify({ ...report(), error: 'endpoint unavailable' }))).toThrow();
  });

  it('源码修补只适用于同一公告、模块和版本，未证明时失败', () => {
    const audit = parseAudit(JSON.stringify(report()));
    expect(assessAdvisories(audit, new Map())).toEqual({ proven: [], blocked: ['GHSA-vfj7-8cjw-p6xm'] });
    expect(assessAdvisories(audit, new Map([['braces', '3.0.3']]))).toEqual({
      proven: ['GHSA-vfj7-8cjw-p6xm'],
      blocked: [],
    });
    const otherVersion = parseAudit(JSON.stringify(report({ findings: [{ version: '3.0.2', paths: ['.>braces'] }] })));
    expect(assessAdvisories(otherVersion, new Map([['braces', '3.0.3']])).blocked).toHaveLength(1);
    const otherModule = parseAudit(JSON.stringify(report({ module_name: 'another-package' })));
    expect(assessAdvisories(otherModule, new Map([['braces', '3.0.3']])).blocked).toHaveLength(1);
  });

  it.each(['low', 'moderate', 'high', 'critical'])('任何新 %s 公告都阻断', (severity) => {
    const input = report({ github_advisory_id: 'GHSA-new1-new2-new3', severity });
    input.metadata.vulnerabilities.high = 0;
    input.metadata.vulnerabilities[severity as 'low' | 'moderate' | 'high' | 'critical'] = 1;
    expect(assessAdvisories(parseAudit(JSON.stringify(input)), new Map([['braces', '3.0.3']])).blocked).toEqual([
      'GHSA-new1-new2-new3',
    ]);
  });

  const temporary: string[] = [];
  afterEach(() => temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })));
  const packageAt = (path: string, name: string, source = 'patched code') => {
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, 'package.json'), JSON.stringify({ name, version: '3.0.3' }));
    writeFileSync(join(path, 'index.js'), source);
  };
  const fixture = () => {
    const root = mkdtempSync(join(tmpdir(), 'dependency-proof-'));
    temporary.push(root);
    const directory = join(root, 'node_modules/braces');
    packageAt(directory, 'braces');
    const proof = {
      braces: {
        version: '3.0.3',
        files: { 'index.js': createHash('sha256').update('patched code').digest('hex') },
      },
    };
    return { root, directory, proof };
  };

  it('实际源码被改变或补丁未安装时拒绝', () => {
    const { root, directory, proof } = fixture();
    expect(verifyInstalledPatches(root, proof).get('braces')).toBe('3.0.3');
    writeFileSync(join(directory, 'index.js'), 'unpatched code');
    expect(() => verifyInstalledPatches(root, proof)).toThrow(/differs/);
    rmSync(directory, { recursive: true });
    expect(() => verifyInstalledPatches(root, proof)).toThrow(/No installed/);
  });

  it('另一个实际消费的未修补实例也阻断，孤立缓存不冒充依赖图', () => {
    const { root, proof } = fixture();
    const bad = join(root, 'node_modules/.pnpm/old/node_modules/braces');
    packageAt(bad, 'braces', 'unpatched code');
    expect(verifyInstalledPatches(root, proof).get('braces')).toBe('3.0.3');
    const consumer = join(root, 'node_modules/consumer');
    packageAt(consumer, 'consumer');
    mkdirSync(join(consumer, 'node_modules'));
    symlinkSync(bad, join(consumer, 'node_modules/braces'));
    expect(() => verifyInstalledPatches(root, proof)).toThrow(/differs/);
  });
});
