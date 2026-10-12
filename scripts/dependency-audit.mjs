import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const patchedAdvisories = {
  'GHSA-vfj7-8cjw-p6xm': { name: 'braces', version: '3.0.3' },
  'GHSA-vcc3-ghjq-m6fr': { name: 'decode-uri-component', version: '0.2.2' },
};
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Reject endpoint/schema failures and retain all severities; an empty or partial response is not success. */
export const parseAudit = (text) => {
  const audit = JSON.parse(text);
  if (!record(audit) || !record(audit.advisories) || !record(audit.metadata?.vulnerabilities) || audit.error) {
    throw new Error('Invalid audit response');
  }
  const counts = audit.metadata.vulnerabilities;
  if (severities.some((severity) => !Number.isSafeInteger(counts[severity]) || counts[severity] < 0)) {
    throw new Error('Invalid audit vulnerability counts');
  }
  const advisories = Object.values(audit.advisories);
  if (severities.reduce((total, severity) => total + counts[severity], 0) !== advisories.length) {
    throw new Error('Audit metadata/advisory count mismatch');
  }
  for (const advisory of advisories) {
    if (
      !record(advisory) ||
      typeof advisory.github_advisory_id !== 'string' ||
      typeof advisory.module_name !== 'string' ||
      !severities.includes(advisory.severity) ||
      !Array.isArray(advisory.findings) ||
      !advisory.findings.length ||
      advisory.findings.some(
        (finding) =>
          !record(finding) ||
          typeof finding.version !== 'string' ||
          !Array.isArray(finding.paths) ||
          !finding.paths.length,
      )
    ) {
      throw new Error('Invalid audit advisory');
    }
  }
  return audit;
};

/** Follow installed node_modules edges, including peer contexts; exclude unreachable old pnpm caches. */
export const installedPackages = (root) => {
  const packages = new Map();
  const directories = new Set();
  const pending = [join(root, 'node_modules')];
  while (pending.length) {
    const directory = pending.pop();
    if (!existsSync(directory)) continue;
    const realDirectory = realpathSync(directory);
    if (directories.has(realDirectory)) continue;
    directories.add(realDirectory);
    const candidates = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.'))
      .flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.name.startsWith('@') ? readdirSync(path).map((child) => join(path, child)) : [path];
      });
    for (const candidate of candidates) {
      if (!existsSync(join(candidate, 'package.json'))) continue;
      const path = realpathSync(candidate);
      if (packages.has(path)) continue;
      const pkg = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'));
      packages.set(path, pkg);
      const parent = pkg.name.startsWith('@') ? dirname(dirname(path)) : dirname(path);
      // pnpm stores dependency symlinks beside each package in its own virtual node_modules.
      if (basename(parent) === 'node_modules') pending.push(parent);
      pending.push(join(path, 'node_modules'));
    }
  }
  return packages;
};

/** Verify every reachable installed instance; never trust just one hoisted import. */
export const verifyInstalledPatches = (root = projectRoot, proof) => {
  const manifest = proof ?? JSON.parse(readFileSync(join(root, 'scripts/dependency-patch-proof.json'), 'utf8'));
  const packages = installedPackages(root);
  const verified = new Map();
  for (const [name, expected] of Object.entries(manifest)) {
    const instances = [...packages].filter(([, pkg]) => pkg.name === name);
    if (!instances.length || !record(expected.files) || !Object.keys(expected.files).length) {
      throw new Error(`No installed source proof for ${name}`);
    }
    for (const [path, pkg] of instances) {
      if (pkg.name !== name || pkg.version !== expected.version)
        throw new Error(`Unverified ${name} version: ${pkg.version}`);
      for (const [file, hash] of Object.entries(expected.files)) {
        const actual = createHash('sha256')
          .update(readFileSync(join(path, file)))
          .digest('hex');
        if (actual !== hash) throw new Error(`Installed patch differs: ${name}/${file}`);
      }
    }
    verified.set(name, expected.version);
    console.log(`Verified patched source: ${name}@${expected.version}, ${instances.length} installed instance(s)`);
  }
  return verified;
};

export const assessAdvisories = (audit, verified) => {
  const proven = [];
  const blocked = [];
  for (const advisory of Object.values(audit.advisories)) {
    const expected = patchedAdvisories[advisory.github_advisory_id];
    if (
      expected &&
      advisory.module_name === expected.name &&
      verified.get(expected.name) === expected.version &&
      advisory.findings.every((finding) => finding.version === expected.version)
    ) {
      proven.push(advisory.github_advisory_id);
    } else {
      blocked.push(advisory.github_advisory_id);
    }
  }
  return { proven, blocked };
};

const run = () => {
  const auditResult = spawnSync(
    'pnpm',
    ['audit', '--json', '--registry=https://registry.npmjs.org/', '--config.auditConfig={}'],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  // Print the untouched upstream report and exit status before evaluating local source repairs.
  process.stdout.write(auditResult.stdout || '');
  process.stderr.write(auditResult.stderr || '');
  console.log(`Raw pnpm audit exit: ${auditResult.status}`);
  if (auditResult.error || ![0, 1].includes(auditResult.status)) throw new Error('Dependency audit failed to complete');
  const audit = parseAudit(auditResult.stdout);
  const verified = verifyInstalledPatches();
  const regression = spawnSync(
    process.execPath,
    [join(projectRoot, 'node_modules/vitest/vitest.mjs'), 'run', 'scripts/dependency-security.test.ts'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 60_000,
    },
  );
  if (regression.error || regression.status !== 0) throw new Error('Installed dependency attack regressions failed');
  const assessment = assessAdvisories(audit, verified);
  for (const id of assessment.proven) console.log(`Source repair verified; upstream version match retained: ${id}`);
  if (assessment.blocked.length) throw new Error(`Unrepaired advisories: ${assessment.blocked.join(', ')}`);
  console.log('Dependency gate passed: no advisories without a verified source repair');
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
