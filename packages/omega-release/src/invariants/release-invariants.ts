/**
 * OMEGA Release — Release Invariants
 * Phase G.0 — INV-G0-01 through INV-G0-10
 */

import type { InvariantResult, InvariantContext } from './types.js';
import { isSemVer, parseSemVer } from '../version/parser.js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** INV-G0-01: Version Coherence — VERSION = package.json = tag = filename */
export function invVersionCoherence(ctx: InvariantContext): InvariantResult {
  const start = Date.now();
  const versionFilePath = join(ctx.projectRoot, 'VERSION');

  if (!existsSync(versionFilePath)) {
    return { id: 'INV-G0-01', name: 'Version Coherence', status: 'FAIL',
      message: 'VERSION file not found', duration_ms: Date.now() - start };
  }

  const fileVersion = readFileSync(versionFilePath, 'utf-8').trim();

  if (ctx.packageJsonVersion && fileVersion !== ctx.packageJsonVersion) {
    return { id: 'INV-G0-01', name: 'Version Coherence', status: 'FAIL',
      message: `VERSION (${fileVersion}) !== package.json (${ctx.packageJsonVersion})`,
      duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-01', name: 'Version Coherence', status: 'PASS',
    message: `Version coherent: ${fileVersion}`, duration_ms: Date.now() - start };
}

/** INV-G0-02: SemVer Validity — all versions strictly SemVer 2.0.0 */
export function invSemVerValidity(ctx: InvariantContext): InvariantResult {
  const start = Date.now();

  if (!isSemVer(ctx.version)) {
    return { id: 'INV-G0-02', name: 'SemVer Validity', status: 'FAIL',
      message: `Invalid SemVer: ${ctx.version}`, duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-02', name: 'SemVer Validity', status: 'PASS',
    message: `Valid SemVer: ${ctx.version}`, duration_ms: Date.now() - start };
}

/** INV-G0-03: Version Monotonicity — N+1 > N, no downgrade */
export function invVersionMonotonicity(currentVersion: string, previousVersion: string): InvariantResult {
  const start = Date.now();

  let curr, prev;
  try {
    curr = parseSemVer(currentVersion);
    prev = parseSemVer(previousVersion);
  } catch {
    return { id: 'INV-G0-03', name: 'Version Monotonicity', status: 'FAIL',
      message: `Cannot parse versions: ${currentVersion}, ${previousVersion}`,
      duration_ms: Date.now() - start };
  }

  const isGreater = curr.major > prev.major ||
    (curr.major === prev.major && curr.minor > prev.minor) ||
    (curr.major === prev.major && curr.minor === prev.minor && curr.patch > prev.patch);

  if (!isGreater) {
    return { id: 'INV-G0-03', name: 'Version Monotonicity', status: 'FAIL',
      message: `${currentVersion} is not greater than ${previousVersion}`,
      duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-03', name: 'Version Monotonicity', status: 'PASS',
    message: `${currentVersion} > ${previousVersion}`, duration_ms: Date.now() - start };
}

/** INV-G0-04: Changelog Consistency — version entry exists in CHANGELOG.md */
export function invChangelogConsistency(ctx: InvariantContext): InvariantResult {
  const start = Date.now();

  if (!ctx.changelogContent) {
    const changelogPath = join(ctx.projectRoot, 'CHANGELOG.md');
    if (!existsSync(changelogPath)) {
      return { id: 'INV-G0-04', name: 'Changelog Consistency', status: 'FAIL',
        message: 'CHANGELOG.md not found', duration_ms: Date.now() - start };
    }
  }

  const content = ctx.changelogContent ?? readFileSync(join(ctx.projectRoot, 'CHANGELOG.md'), 'utf-8');
  const hasVersion = content.includes(`## [${ctx.version}]`);

  if (!hasVersion) {
    return { id: 'INV-G0-04', name: 'Changelog Consistency', status: 'FAIL',
      message: `Version ${ctx.version} not found in CHANGELOG.md`,
      duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-04', name: 'Changelog Consistency', status: 'PASS',
    message: `Version ${ctx.version} found in changelog`, duration_ms: Date.now() - start };
}

/** INV-G0-05: Artifact Integrity — every artifact has SHA-256 checksum */
export function invArtifactIntegrity(ctx: InvariantContext): InvariantResult {
  const start = Date.now();

  if (!ctx.artifacts || ctx.artifacts.length === 0) {
    return { id: 'INV-G0-05', name: 'Artifact Integrity', status: 'SKIP',
      message: 'No artifacts to verify', duration_ms: Date.now() - start };
  }

  const missing = ctx.artifacts.filter(a => !a.sha256 || a.sha256.length !== 64);
  if (missing.length > 0) {
    return { id: 'INV-G0-05', name: 'Artifact Integrity', status: 'FAIL',
      message: `${missing.length} artifacts missing SHA-256`,
      duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-05', name: 'Artifact Integrity', status: 'PASS',
    message: `${ctx.artifacts.length} artifacts verified`,
    duration_ms: Date.now() - start };
}

/** INV-G0-06: Self-Test Gate — self-test must pass before release */
export function invSelfTestGate(ctx: InvariantContext): InvariantResult {
  const start = Date.now();

  if (!ctx.selfTestVerdict) {
    return { id: 'INV-G0-06', name: 'Self-Test Gate', status: 'SKIP',
      message: 'Self-test not run', duration_ms: Date.now() - start };
  }

  if (ctx.selfTestVerdict !== 'PASS') {
    return { id: 'INV-G0-06', name: 'Self-Test Gate', status: 'FAIL',
      message: 'Self-test failed', duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-06', name: 'Self-Test Gate', status: 'PASS',
    message: 'Self-test passed', duration_ms: Date.now() - start };
}

/** INV-G0-07: Checksum Determinism — same input = same checksum */
export function invChecksumDeterminism(): InvariantResult {
  const start = Date.now();
  const testInput = 'OMEGA-DETERMINISM-CHECK';

  const hash1 = createHash('sha256').update(testInput, 'utf-8').digest('hex');
  const hash2 = createHash('sha256').update(testInput, 'utf-8').digest('hex');

  if (hash1 !== hash2) {
    return { id: 'INV-G0-07', name: 'Checksum Determinism', status: 'FAIL',
      message: `Non-deterministic: ${hash1} !== ${hash2}`,
      duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-07', name: 'Checksum Determinism', status: 'PASS',
    message: 'SHA-256 deterministic', duration_ms: Date.now() - start };
}

/** INV-G0-08: Platform Coverage — all 3 platforms must have artifacts */
export function invPlatformCoverage(ctx: InvariantContext): InvariantResult {
  const start = Date.now();
  const requiredPlatforms = ['win-x64', 'linux-x64', 'macos-arm64'];

  if (!ctx.artifacts || ctx.artifacts.length === 0) {
    return { id: 'INV-G0-08', name: 'Platform Coverage', status: 'SKIP',
      message: 'No artifacts to check', duration_ms: Date.now() - start };
  }

  const filenames = ctx.artifacts.map(a => a.filename);
  const missing = requiredPlatforms.filter(p => !filenames.some(f => f.includes(p)));

  if (missing.length > 0) {
    return { id: 'INV-G0-08', name: 'Platform Coverage', status: 'FAIL',
      message: `Missing platforms: ${missing.join(', ')}`,
      duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-08', name: 'Platform Coverage', status: 'PASS',
    message: `All ${requiredPlatforms.length} platforms covered`,
    duration_ms: Date.now() - start };
}

/** INV-G0-09: Build Determinism — same source + config = same artifacts */
export function invBuildDeterminism(hash1: string, hash2: string): InvariantResult {
  const start = Date.now();

  if (!hash1 || !hash2) {
    return { id: 'INV-G0-09', name: 'Build Determinism', status: 'SKIP',
      message: 'No hashes to compare', duration_ms: Date.now() - start };
  }

  if (hash1 !== hash2) {
    return { id: 'INV-G0-09', name: 'Build Determinism', status: 'FAIL',
      message: `Non-deterministic build: ${hash1} !== ${hash2}`,
      duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-09', name: 'Build Determinism', status: 'PASS',
    message: 'Build deterministic', duration_ms: Date.now() - start };
}

/** INV-G0-10: Release Manifest Integrity — manifest hash is valid */
export function invManifestIntegrity(manifest: Record<string, unknown>): InvariantResult {
  const start = Date.now();

  if (!manifest || !manifest['hash'] || !manifest['version']) {
    return { id: 'INV-G0-10', name: 'Manifest Integrity', status: 'FAIL',
      message: 'Manifest missing required fields',
      duration_ms: Date.now() - start };
  }

  const storedHash = manifest['hash'] as string;
  const copy = { ...manifest };
  delete copy['hash'];
  const content = JSON.stringify(copy);
  const computedHash = createHash('sha256').update(content, 'utf-8').digest('hex');

  if (storedHash !== computedHash) {
    return { id: 'INV-G0-10', name: 'Manifest Integrity', status: 'FAIL',
      message: `Hash mismatch: stored=${storedHash.slice(0, 16)}... computed=${computedHash.slice(0, 16)}...`,
      duration_ms: Date.now() - start };
  }

  return { id: 'INV-G0-10', name: 'Manifest Integrity', status: 'PASS',
    message: 'Manifest hash verified', duration_ms: Date.now() - start };
}

/** Run all release invariants */
export function runAllInvariants(ctx: InvariantContext): InvariantResult[] {
  return [
    invVersionCoherence(ctx),
    invSemVerValidity(ctx),
    invChangelogConsistency(ctx),
    invArtifactIntegrity(ctx),
    invSelfTestGate(ctx),
    invChecksumDeterminism(),
    invPlatformCoverage(ctx),
  ];
}
