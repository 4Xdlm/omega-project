/**
 * OMEGA Release — Self-Test Checks Tests
 * Phase G.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkVersion } from '../../src/selftest/checks/version-check.js';
import { checkHashEngine } from '../../src/selftest/checks/hash-check.js';
import { checkModules } from '../../src/selftest/checks/modules-check.js';
import { checkCLI } from '../../src/selftest/checks/cli-check.js';
import { checkIntegrity } from '../../src/selftest/checks/integrity-check.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('checkVersion', () => {
  const testDir = join(tmpdir(), 'omega-selftest-version');

  beforeEach(() => mkdirSync(testDir, { recursive: true }));
  afterEach(() => rmSync(testDir, { recursive: true, force: true }));

  it('PASS with valid VERSION file', () => {
    writeFileSync(join(testDir, 'VERSION'), '1.0.0');
    const result = checkVersion(join(testDir, 'VERSION'));
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('VERSION');
  });

  it('FAIL with missing VERSION file', () => {
    const result = checkVersion(join(testDir, 'NONEXISTENT'));
    expect(result.status).toBe('FAIL');
  });

  it('FAIL with invalid SemVer', () => {
    writeFileSync(join(testDir, 'VERSION'), 'not-semver');
    const result = checkVersion(join(testDir, 'VERSION'));
    expect(result.status).toBe('FAIL');
  });
});

describe('checkHashEngine', () => {
  it('PASS — SHA-256 works', () => {
    const result = checkHashEngine();
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('HASH_ENGINE');
  });

  it('has correct empty hash test vector', () => {
    const result = checkHashEngine();
    expect(result.details?.emptyHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('checkModules', () => {
  it('PASS — critical modules importable', () => {
    const result = checkModules();
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('MODULES');
  });
});

describe('checkCLI', () => {
  it('PASS — CLI commands defined', () => {
    const result = checkCLI();
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('CLI');
    expect(result.details?.commands).toContain('version');
    expect(result.details?.commands).toContain('selftest');
  });
});

describe('checkIntegrity', () => {
  const testDir = join(tmpdir(), 'omega-selftest-integrity');

  beforeEach(() => mkdirSync(testDir, { recursive: true }));
  afterEach(() => rmSync(testDir, { recursive: true, force: true }));

  it('PASS with all files present', () => {
    writeFileSync(join(testDir, 'package.json'), '{}');
    writeFileSync(join(testDir, 'VERSION'), '1.0.0');
    const result = checkIntegrity(testDir);
    expect(result.status).toBe('PASS');
  });

  it('WARN with missing files', () => {
    const result = checkIntegrity(testDir);
    expect(result.status).toBe('WARN');
  });
});
