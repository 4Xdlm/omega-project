/**
 * Tests for path-safety.ts — Absolute path detection
 */

import { describe, it, expect } from 'vitest';
import { scanForAbsolutePaths, validateFilePathSafety } from '../../src/runtime/path-safety.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('scanForAbsolutePaths', () => {
  it('detects Windows absolute paths', () => {
    const content = 'Some text with C:\\Users\\test\\file.txt in it';
    const violations = scanForAbsolutePaths(content);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toMatch(/C:\\/i);
  });

  it('detects Linux /home/ paths', () => {
    const content = 'Path: /home/user/project/file.txt';
    const violations = scanForAbsolutePaths(content);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toMatch(/\/home\//i);
  });

  it('detects macOS /Users/ paths', () => {
    const content = 'Path: /Users/john/Documents/test.json';
    const violations = scanForAbsolutePaths(content);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toMatch(/\/Users\//i);
  });

  it('returns empty array for relative paths', () => {
    const content = 'Relative: ./src/file.ts and ../tests/test.ts';
    const violations = scanForAbsolutePaths(content);
    expect(violations.length).toBe(0);
  });

  it('returns empty array for safe content', () => {
    const content = JSON.stringify({
      scene_id: 'SCN-001',
      relative_path: 'output/scene_001.txt',
      count: 42,
    });
    const violations = scanForAbsolutePaths(content);
    expect(violations.length).toBe(0);
  });
});

describe('validateFilePathSafety', () => {
  it('validates safe temporary file', () => {
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, `test-path-safety-${Date.now()}.txt`);
    fs.writeFileSync(testFile, 'Safe content: relative/path/file.txt', 'utf8');

    const result = validateFilePathSafety(testFile);
    expect(result.safe).toBe(true);
    expect(result.violations.length).toBe(0);

    fs.unlinkSync(testFile);
  });

  it('detects unsafe temporary file with absolute path', () => {
    const tmpDir = os.tmpdir();
    const testFile = path.join(tmpDir, `test-path-unsafe-${Date.now()}.txt`);
    fs.writeFileSync(testFile, 'Unsafe: C:\\Windows\\System32\\file.dll', 'utf8');

    const result = validateFilePathSafety(testFile);
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);

    fs.unlinkSync(testFile);
  });

  it('returns safe for non-existent file', () => {
    const result = validateFilePathSafety('/nonexistent/file/path.txt');
    expect(result.safe).toBe(true);
    expect(result.violations.length).toBe(0);
  });
});
