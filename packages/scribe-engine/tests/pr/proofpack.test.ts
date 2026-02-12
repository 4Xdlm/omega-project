/**
 * OMEGA — PROOFPACK TESTS
 * Phase: PR-5 | Invariant: INV-PROOFPACK-EXPORT-01
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  captureToolchainInfo,
  generateSHA256Sums,
  detectAbsolutePaths,
  buildProofPack,
  generateReplayScript,
  generateVerifyPowershell,
} from '../../src/pr/proofpack.js';

const TEST_DIR = join(process.cwd(), '.test-proofpack-pr5');
const SOURCE_DIR = join(TEST_DIR, 'source');
const OUTPUT_DIR = join(TEST_DIR, 'output');

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(SOURCE_DIR, { recursive: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('Proofpack — Toolchain Capture (GAP-5B)', () => {
  it('captures node version', () => {
    const info = captureToolchainInfo();

    expect(info.node_version).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it('captures npm version', () => {
    const info = captureToolchainInfo();

    expect(info.npm_version).toBeDefined();
    expect(info.npm_version).not.toBe('');
  });

  it('captures os platform and arch', () => {
    const info = captureToolchainInfo();

    expect(info.os_platform).toBeDefined();
    expect(info.os_arch).toBeDefined();
  });

  it('includes timestamp', () => {
    const info = captureToolchainInfo();

    expect(info.timestamp).toBeDefined();
    expect(new Date(info.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('is deterministic for same environment', () => {
    const info1 = captureToolchainInfo();
    const info2 = captureToolchainInfo();

    expect(info1.node_version).toBe(info2.node_version);
    expect(info1.npm_version).toBe(info2.npm_version);
  });
});

describe('Proofpack — SHA256SUMS Generation (GAP-5A)', () => {
  it('generates SHA256SUMS.txt format', () => {
    writeFileSync(join(SOURCE_DIR, 'file1.txt'), 'content1');
    writeFileSync(join(SOURCE_DIR, 'file2.txt'), 'content2');

    const files = ['file1.txt', 'file2.txt'];
    const sums = generateSHA256Sums(files, SOURCE_DIR);

    const lines = sums.trim().split('\n');
    expect(lines).toHaveLength(2);

    // Format: <hash>  <file> (two spaces)
    expect(lines[0]).toMatch(/^[a-f0-9]{64}  file1\.txt$/);
    expect(lines[1]).toMatch(/^[a-f0-9]{64}  file2\.txt$/);
  });

  it('is deterministic (same file → same hash)', () => {
    writeFileSync(join(SOURCE_DIR, 'test.txt'), 'deterministic content');

    const sums1 = generateSHA256Sums(['test.txt'], SOURCE_DIR);
    const sums2 = generateSHA256Sums(['test.txt'], SOURCE_DIR);

    expect(sums1).toBe(sums2);
  });

  it('handles subdirectories', () => {
    mkdirSync(join(SOURCE_DIR, 'subdir'), { recursive: true });
    writeFileSync(join(SOURCE_DIR, 'subdir', 'nested.txt'), 'nested content');

    const files = ['subdir/nested.txt'];
    const sums = generateSHA256Sums(files, SOURCE_DIR);

    expect(sums).toContain('subdir/nested.txt');
  });

  it('uses forward slashes for paths', () => {
    mkdirSync(join(SOURCE_DIR, 'a', 'b'), { recursive: true });
    writeFileSync(join(SOURCE_DIR, 'a', 'b', 'file.txt'), 'content');

    const sums = generateSHA256Sums(['a\\b\\file.txt'], SOURCE_DIR);

    // Should normalize to forward slashes
    expect(sums).toContain('a/b/file.txt');
  });
});

describe('Proofpack — Absolute Path Detection (GAP-5D)', () => {
  it('detects Windows absolute paths', () => {
    const testFile = join(SOURCE_DIR, 'test.txt');
    writeFileSync(testFile, 'Some text with C:\\Users\\elric\\path');

    const violations = detectAbsolutePaths(testFile);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain('Absolute path');
  });

  it('detects Unix absolute paths', () => {
    const testFile = join(SOURCE_DIR, 'test.txt');
    writeFileSync(testFile, 'Some text with /home/user/path');

    const violations = detectAbsolutePaths(testFile);

    expect(violations.length).toBeGreaterThan(0);
  });

  it('passes when no absolute paths present', () => {
    const testFile = join(SOURCE_DIR, 'test.txt');
    writeFileSync(testFile, 'Relative path: ./output/file.txt');

    const violations = detectAbsolutePaths(testFile);

    expect(violations).toHaveLength(0);
  });

  it('handles binary files gracefully', () => {
    const testFile = join(SOURCE_DIR, 'binary.bin');
    const buffer = Buffer.from([0xff, 0xfe, 0x00, 0x01]);
    writeFileSync(testFile, buffer);

    const violations = detectAbsolutePaths(testFile);

    // Should not throw, returns empty array for binary
    expect(violations).toHaveLength(0);
  });
});

describe('Proofpack — Pack Building', () => {
  it('builds complete proofpack', () => {
    writeFileSync(join(SOURCE_DIR, 'test.json'), JSON.stringify({ test: true }));

    const manifest = buildProofPack({
      sourceDir: SOURCE_DIR,
      outputDir: OUTPUT_DIR,
      runType: 'test',
      verdict: 'PASS',
    });

    expect(manifest.pack_id).toBeDefined();
    expect(manifest.run_type).toBe('test');
    expect(manifest.verdict).toBe('PASS');
    expect(manifest.files).toContain('test.json');

    // Check generated files (GAP-5A, GAP-5B)
    expect(existsSync(join(OUTPUT_DIR, 'SHA256SUMS.txt'))).toBe(true);
    expect(existsSync(join(OUTPUT_DIR, 'toolchain.json'))).toBe(true);
    expect(existsSync(join(OUTPUT_DIR, 'MANIFEST.json'))).toBe(true);
  });

  it('throws if source directory not found', () => {
    expect(() => {
      buildProofPack({
        sourceDir: '/nonexistent',
        outputDir: OUTPUT_DIR,
        runType: 'test',
        verdict: 'PASS',
      });
    }).toThrow(/not found/);
  });

  it('throws if no files in source', () => {
    expect(() => {
      buildProofPack({
        sourceDir: SOURCE_DIR,
        outputDir: OUTPUT_DIR,
        runType: 'test',
        verdict: 'PASS',
      });
    }).toThrow(/No files found/);
  });

  it('throws if absolute paths detected (GAP-5D)', () => {
    writeFileSync(join(SOURCE_DIR, 'bad.txt'), 'C:\\Users\\elric\\absolute');

    expect(() => {
      buildProofPack({
        sourceDir: SOURCE_DIR,
        outputDir: OUTPUT_DIR,
        runType: 'test',
        verdict: 'PASS',
      });
    }).toThrow(/Absolute path violations/);
  });

  it('files are sorted alphabetically (GAP-5C)', () => {
    writeFileSync(join(SOURCE_DIR, 'zebra.txt'), 'z');
    writeFileSync(join(SOURCE_DIR, 'apple.txt'), 'a');
    writeFileSync(join(SOURCE_DIR, 'banana.txt'), 'b');

    const manifest = buildProofPack({
      sourceDir: SOURCE_DIR,
      outputDir: OUTPUT_DIR,
      runType: 'test',
      verdict: 'PASS',
    });

    expect(manifest.files[0]).toBe('apple.txt');
    expect(manifest.files[1]).toBe('banana.txt');
    expect(manifest.files[2]).toBe('zebra.txt');
  });
});

describe('Proofpack — Replay Scripts', () => {
  it('generates bash replay script', () => {
    const manifest = {
      pack_id: 'test-pack-123',
      timestamp: '2026-02-12T00:00:00.000Z',
      run_type: 'e2e',
      files: ['file1.txt', 'file2.txt'],
      sha256_manifest: 'SHA256SUMS.txt',
      toolchain: 'toolchain.json',
      verdict: 'PASS',
    };

    const script = generateReplayScript(manifest);

    expect(script).toContain('#!/usr/bin/env bash');
    expect(script).toContain('test-pack-123');
    expect(script).toContain('sha256sum -c');
  });

  it('generates PowerShell verify script', () => {
    const manifest = {
      pack_id: 'test-pack-123',
      timestamp: '2026-02-12T00:00:00.000Z',
      run_type: 'e2e',
      files: ['file1.txt', 'file2.txt'],
      sha256_manifest: 'SHA256SUMS.txt',
      toolchain: 'toolchain.json',
      verdict: 'PASS',
    };

    const script = generateVerifyPowershell(manifest);

    expect(script).toContain('# OMEGA Proof Pack');
    expect(script).toContain('test-pack-123');
    expect(script).toContain('Get-FileHash');
  });
});

describe('Proofpack — Determinism', () => {
  it('produces same SHA256SUMS for same files', () => {
    writeFileSync(join(SOURCE_DIR, 'test.txt'), 'content');

    const manifest1 = buildProofPack({
      sourceDir: SOURCE_DIR,
      outputDir: OUTPUT_DIR,
      runType: 'test',
      verdict: 'PASS',
    });

    const sums1 = readFileSync(join(OUTPUT_DIR, 'SHA256SUMS.txt'), 'utf8');

    rmSync(OUTPUT_DIR, { recursive: true });
    mkdirSync(OUTPUT_DIR, { recursive: true });

    const manifest2 = buildProofPack({
      sourceDir: SOURCE_DIR,
      outputDir: OUTPUT_DIR,
      runType: 'test',
      verdict: 'PASS',
    });

    const sums2 = readFileSync(join(OUTPUT_DIR, 'SHA256SUMS.txt'), 'utf8');

    expect(sums1).toBe(sums2);
  });
});
