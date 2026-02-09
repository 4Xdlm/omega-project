/**
 * OMEGA Release — Version File Tests
 * Phase G.0 — INV-G0-01: VERSION_TAG_SYNC
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readVersionFile, writeVersionFile, extractVersionFromFilename } from '../../src/version/file.js';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('readVersionFile / writeVersionFile', () => {
  const testDir = join(tmpdir(), 'omega-release-vfile-test');
  const versionPath = join(testDir, 'VERSION');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('write then read', () => {
    const written = writeVersionFile(versionPath, '1.0.0');
    expect(written.version).toBe('1.0.0');
    expect(written.hash).toHaveLength(64);

    const read = readVersionFile(versionPath);
    expect(read.version).toBe('1.0.0');
    expect(read.hash).toBe(written.hash);
  });

  it('trims whitespace on write', () => {
    const written = writeVersionFile(versionPath, '  2.0.0  ');
    expect(written.version).toBe('2.0.0');
  });

  it('throws on missing file', () => {
    expect(() => readVersionFile(join(testDir, 'NONEXISTENT'))).toThrow('VERSION file not found');
  });

  it('produces deterministic hash', () => {
    const w1 = writeVersionFile(versionPath, '1.0.0');
    const w2 = writeVersionFile(versionPath, '1.0.0');
    expect(w1.hash).toBe(w2.hash);
  });
});

describe('extractVersionFromFilename', () => {
  it('extracts from standard filename', () => {
    expect(extractVersionFromFilename('omega-1.0.0-win-x64.zip')).toBe('1.0.0');
  });

  it('extracts with prerelease', () => {
    expect(extractVersionFromFilename('omega-2.0.0-alpha-linux-x64.tar.gz')).toBe('2.0.0-alpha');
  });

  it('returns null for non-matching', () => {
    expect(extractVersionFromFilename('random-file.txt')).toBeNull();
  });
});
