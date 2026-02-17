/**
 * Tests: SEAL LOCK Parser + SEAL DISK Gate (RULE-SEAL-01)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseSealLock } from '../../src/proofpack/seal-lock.js';
import { validateSealDisk } from '../../src/gates/seal-disk-gate.js';
import type { SealLock } from '../../src/proofpack/seal-lock.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL LOCK PARSER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_LOCK_JSON = JSON.stringify({
  rule: 'RULE-SEAL-01',
  version: '1.0',
  description: 'test',
  fail_mode: 'fail-closed',
  seal_target: { kind: 'sprint', id: '20', tag: 'sprint-20-sealed', commit: 'f75837ca' },
  release_target: { kind: 'release', id: 'v3.0.0-art', tag: 'v3.0.0-art', commit: 'f75837ca' },
  required_paths: [
    'proofpacks/sprint-20/Sprint20_SEAL_REPORT.md',
    'proofpacks/sprint-20/20.6/npm_test.txt',
  ],
  minimal_markers: { seal_report: 'Verdict: PASS', npm_test: 'passed' },
});

describe('parseSealLock (RULE-SEAL-01)', () => {
  it('SLOCK-01: valid JSON → parsed correctly', () => {
    const lock = parseSealLock(VALID_LOCK_JSON);
    expect(lock.rule).toBe('RULE-SEAL-01');
    expect(lock.fail_mode).toBe('fail-closed');
    expect(lock.seal_target.tag).toBe('sprint-20-sealed');
    expect(lock.required_paths.length).toBe(2);
  });

  it('SLOCK-02: invalid JSON → throws', () => {
    expect(() => parseSealLock('{')).toThrow('invalid JSON');
  });

  it('SLOCK-03: wrong fail_mode → throws', () => {
    const bad = JSON.stringify({ ...JSON.parse(VALID_LOCK_JSON), fail_mode: 'open' });
    expect(() => parseSealLock(bad)).toThrow('fail_mode');
  });

  it('SLOCK-04: missing seal_target → throws', () => {
    const obj = JSON.parse(VALID_LOCK_JSON);
    delete obj.seal_target;
    expect(() => parseSealLock(JSON.stringify(obj))).toThrow('seal_target');
  });

  it('SLOCK-05: empty required_paths → throws', () => {
    const obj = JSON.parse(VALID_LOCK_JSON);
    obj.required_paths = [];
    expect(() => parseSealLock(JSON.stringify(obj))).toThrow('required_paths');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL DISK GATE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateSealDisk (RULE-SEAL-01)', () => {
  let tempDir: string;
  let lock: SealLock;

  beforeEach(() => {
    lock = parseSealLock(VALID_LOCK_JSON);
    tempDir = join(tmpdir(), `seal-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createFile(relPath: string, content: string): void {
    const absPath = join(tempDir, relPath);
    mkdirSync(join(absPath, '..'), { recursive: true });
    writeFileSync(absPath, content, 'utf-8');
  }

  it('SDISK-01: all files present + markers → PASS', () => {
    createFile('proofpacks/sprint-20/Sprint20_SEAL_REPORT.md', '# SEAL REPORT\n\nVerdict: PASS\n');
    createFile('proofpacks/sprint-20/20.6/npm_test.txt', 'Tests  467 passed (467)\n');

    const result = validateSealDisk(lock, tempDir);
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.empty).toHaveLength(0);
    expect(result.marker_failures).toHaveLength(0);
  });

  it('SDISK-02: missing file → FAIL', () => {
    // Only create one of two required files
    createFile('proofpacks/sprint-20/Sprint20_SEAL_REPORT.md', '# SEAL REPORT\n\nVerdict: PASS\n');

    const result = validateSealDisk(lock, tempDir);
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('SDISK-03: empty file → FAIL', () => {
    createFile('proofpacks/sprint-20/Sprint20_SEAL_REPORT.md', '');
    createFile('proofpacks/sprint-20/20.6/npm_test.txt', 'Tests  467 passed (467)\n');

    const result = validateSealDisk(lock, tempDir);
    expect(result.ok).toBe(false);
    expect(result.empty.length).toBeGreaterThan(0);
  });

  it('SDISK-04: npm_test without PASS marker → FAIL', () => {
    createFile('proofpacks/sprint-20/Sprint20_SEAL_REPORT.md', '# SEAL REPORT\n\nVerdict: PASS\n');
    createFile('proofpacks/sprint-20/20.6/npm_test.txt', 'Tests  3 failed (467)\n');

    const result = validateSealDisk(lock, tempDir);
    expect(result.ok).toBe(false);
    expect(result.marker_failures.length).toBeGreaterThan(0);
  });

  it('SDISK-05: SEAL_REPORT without Verdict marker → FAIL', () => {
    createFile('proofpacks/sprint-20/Sprint20_SEAL_REPORT.md', '# Some report without verdict\n\nNothing here.');
    createFile('proofpacks/sprint-20/20.6/npm_test.txt', 'Tests  467 passed (467)\n');

    const result = validateSealDisk(lock, tempDir);
    expect(result.ok).toBe(false);
    expect(result.marker_failures.length).toBeGreaterThan(0);
  });

  it('SDISK-06: all files missing → FAIL with 2 missing', () => {
    const result = validateSealDisk(lock, tempDir);
    expect(result.ok).toBe(false);
    expect(result.missing).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE VALIDATION (actual repo proofpacks)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Live SEAL validation (RULE-SEAL-01)', () => {
  it('LIVE-SEAL-01: actual Sprint 20 proofpacks exist on disk', () => {
    const { readFileSync: readFs } = require('node:fs');
    const { resolve } = require('node:path');

    // Resolve from this test file location to package root
    const pkgRoot = resolve(__dirname, '..', '..');
    const lockPath = join(pkgRoot, 'proofpacks', 'SEAL_LOCK.json');

    const lockJson = readFs(lockPath, 'utf-8');
    const lock = parseSealLock(lockJson);
    const result = validateSealDisk(lock, pkgRoot);

    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.empty).toHaveLength(0);
    expect(result.marker_failures).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
