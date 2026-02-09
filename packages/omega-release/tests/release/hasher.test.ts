/**
 * OMEGA Release — Hasher Tests
 * Phase G.0 — INV-G0-05: ARTIFACT_SHA256
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sha256File, sha512File, sha256String, generateChecksumFile, verifyChecksum, parseChecksumFile } from '../../src/release/hasher.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('sha256String', () => {
  it('hashes empty string correctly', () => {
    expect(sha256String('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('produces 64-char hex', () => {
    expect(sha256String('OMEGA')).toHaveLength(64);
  });

  it('is deterministic', () => {
    const h1 = sha256String('test');
    const h2 = sha256String('test');
    expect(h1).toBe(h2);
  });

  it('different inputs produce different hashes', () => {
    expect(sha256String('a')).not.toBe(sha256String('b'));
  });
});

describe('sha256File / sha512File', () => {
  const testDir = join(tmpdir(), 'omega-release-hasher-test');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('hashes file correctly', () => {
    const path = join(testDir, 'test.txt');
    writeFileSync(path, 'hello', 'utf-8');
    const hash = sha256File(path);
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });

  it('sha512 produces 128-char hex', () => {
    const path = join(testDir, 'test512.txt');
    writeFileSync(path, 'hello', 'utf-8');
    const hash = sha512File(path);
    expect(hash).toHaveLength(128);
  });

  it('file hash is deterministic', () => {
    const path = join(testDir, 'determ.txt');
    writeFileSync(path, 'content', 'utf-8');
    expect(sha256File(path)).toBe(sha256File(path));
  });
});

describe('generateChecksumFile', () => {
  it('generates correct format', () => {
    const artifacts = [
      { filename: 'omega-1.0.0-win-x64.zip', sha256: 'a'.repeat(64) },
      { filename: 'omega-1.0.0-linux-x64.tar.gz', sha256: 'b'.repeat(64) },
    ];
    const output = generateChecksumFile(artifacts);
    expect(output).toContain('a'.repeat(64) + '  omega-1.0.0-win-x64.zip');
    expect(output).toContain('b'.repeat(64) + '  omega-1.0.0-linux-x64.tar.gz');
  });
});

describe('parseChecksumFile', () => {
  it('parses standard format', () => {
    const content = `${'a'.repeat(64)}  file1.zip\n${'b'.repeat(64)}  file2.tar.gz\n`;
    const map = parseChecksumFile(content);
    expect(map.get('file1.zip')).toBe('a'.repeat(64));
    expect(map.get('file2.tar.gz')).toBe('b'.repeat(64));
  });
});

describe('verifyChecksum', () => {
  const testDir = join(tmpdir(), 'omega-release-verify-test');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('returns true for matching checksum', () => {
    const path = join(testDir, 'good.txt');
    writeFileSync(path, 'omega', 'utf-8');
    const hash = sha256File(path);
    expect(verifyChecksum(path, hash)).toBe(true);
  });

  it('returns false for wrong checksum', () => {
    const path = join(testDir, 'bad.txt');
    writeFileSync(path, 'omega', 'utf-8');
    expect(verifyChecksum(path, 'wrong')).toBe(false);
  });

  it('returns false for missing file', () => {
    expect(verifyChecksum(join(testDir, 'nope'), 'abc')).toBe(false);
  });
});
