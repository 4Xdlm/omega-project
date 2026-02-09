/**
 * OMEGA Release — Self-Test Runner Tests
 * Phase G.0 — INV-G0-06: SELFTEST_PASS
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runSelfTest, runSingleCheck } from '../../src/selftest/runner.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('runSelfTest', () => {
  const testDir = join(tmpdir(), 'omega-release-selftest-runner');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'VERSION'), '1.0.0');
    writeFileSync(join(testDir, 'package.json'), '{}');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('runs all 5 checks', () => {
    const result = runSelfTest({ projectRoot: testDir, version: '1.0.0' });
    expect(result.checks).toHaveLength(5);
  });

  it('has timestamp', () => {
    const result = runSelfTest({ projectRoot: testDir, version: '1.0.0' });
    expect(result.timestamp).toBeTruthy();
  });

  it('has platform info', () => {
    const result = runSelfTest({ projectRoot: testDir, version: '1.0.0' });
    expect(result.platform).toBeTruthy();
  });

  it('produces PASS verdict when all checks pass', () => {
    const result = runSelfTest({ projectRoot: testDir, version: '1.0.0' });
    const hasFailure = result.checks.some(c => c.status === 'FAIL');
    expect(result.verdict).toBe(hasFailure ? 'FAIL' : 'PASS');
  });

  it('measures duration', () => {
    const result = runSelfTest({ projectRoot: testDir, version: '1.0.0' });
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });
});

describe('runSingleCheck', () => {
  const testDir = join(tmpdir(), 'omega-release-single-check');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'VERSION'), '1.0.0');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('runs VERSION check', () => {
    const check = runSingleCheck('VERSION', { projectRoot: testDir, version: '1.0.0' });
    expect(check).not.toBeNull();
    expect(check!.id).toBe('VERSION');
  });

  it('runs HASH_ENGINE check', () => {
    const check = runSingleCheck('HASH_ENGINE', { projectRoot: testDir, version: '1.0.0' });
    expect(check).not.toBeNull();
    expect(check!.status).toBe('PASS');
  });

  it('returns null for unknown check', () => {
    expect(runSingleCheck('UNKNOWN', { projectRoot: testDir, version: '1.0.0' })).toBeNull();
  });
});
