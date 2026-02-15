/**
 * Tests for sha256sums.ts — SHA256SUMS generation and verification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateSHA256SUMS, verifySHA256SUMS } from '../../src/runtime/sha256sums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('generateSHA256SUMS', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `sha256sums-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('generates SHA256SUMS.txt for directory with files', () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, 'file1.txt'), 'Content A', 'utf8');
    fs.writeFileSync(path.join(testDir, 'file2.json'), '{"key":"value"}', 'utf8');

    const outputPath = path.join(testDir, 'SHA256SUMS.txt');
    generateSHA256SUMS(testDir, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('file1.txt');
    expect(content).toContain('file2.json');

    // Verify format: <64-hex>  <path>
    const lines = content.trim().split('\n');
    for (const line of lines) {
      expect(line).toMatch(/^[a-f0-9]{64}  .+$/);
    }
  });

  it('sorts files alphabetically', () => {
    fs.writeFileSync(path.join(testDir, 'zebra.txt'), 'Z', 'utf8');
    fs.writeFileSync(path.join(testDir, 'alpha.txt'), 'A', 'utf8');
    fs.writeFileSync(path.join(testDir, 'beta.txt'), 'B', 'utf8');

    const outputPath = path.join(testDir, 'SHA256SUMS.txt');
    generateSHA256SUMS(testDir, outputPath);

    const content = fs.readFileSync(outputPath, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines[0]).toContain('alpha.txt');
    expect(lines[1]).toContain('beta.txt');
    expect(lines[2]).toContain('zebra.txt');
  });

  it('skips SHA256SUMS.txt itself', () => {
    fs.writeFileSync(path.join(testDir, 'file1.txt'), 'Test', 'utf8');
    const outputPath = path.join(testDir, 'SHA256SUMS.txt');

    generateSHA256SUMS(testDir, outputPath);
    const content = fs.readFileSync(outputPath, 'utf8');

    expect(content).not.toContain('SHA256SUMS.txt');
    expect(content).toContain('file1.txt');
  });
});

describe('verifySHA256SUMS', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `sha256verify-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('verifies valid SHA256SUMS.txt', () => {
    fs.writeFileSync(path.join(testDir, 'file1.txt'), 'Content', 'utf8');

    const sumsPath = path.join(testDir, 'SHA256SUMS.txt');
    generateSHA256SUMS(testDir, sumsPath);

    const result = verifySHA256SUMS(testDir, sumsPath);
    expect(result.valid).toBe(true);
    expect(result.mismatches.length).toBe(0);
  });

  it('detects missing SHA256SUMS.txt', () => {
    const result = verifySHA256SUMS(testDir, path.join(testDir, 'SHA256SUMS.txt'));
    expect(result.valid).toBe(false);
    expect(result.mismatches.length).toBeGreaterThan(0);
    expect(result.mismatches[0]).toContain('not found');
  });

  it('detects hash mismatch', () => {
    fs.writeFileSync(path.join(testDir, 'file1.txt'), 'Original', 'utf8');

    const sumsPath = path.join(testDir, 'SHA256SUMS.txt');
    generateSHA256SUMS(testDir, sumsPath);

    // Modify file after generating sums
    fs.writeFileSync(path.join(testDir, 'file1.txt'), 'Modified', 'utf8');

    const result = verifySHA256SUMS(testDir, sumsPath);
    expect(result.valid).toBe(false);
    expect(result.mismatches.length).toBeGreaterThan(0);
    expect(result.mismatches[0]).toContain('Hash mismatch');
  });
});
