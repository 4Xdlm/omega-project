/**
 * OMEGA Release — Install Verifier Tests
 * Phase G.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyArchive, verifySingleFile } from '../../src/install/verifier.js';
import { sha256File, generateChecksumFile } from '../../src/release/hasher.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('verifyArchive', () => {
  const testDir = join(tmpdir(), 'omega-install-verify');

  beforeEach(() => mkdirSync(testDir, { recursive: true }));
  afterEach(() => rmSync(testDir, { recursive: true, force: true }));

  it('verifies matching checksum', () => {
    const archivePath = join(testDir, 'omega-1.0.0-win-x64.zip');
    writeFileSync(archivePath, 'archive-content');
    const hash = sha256File(archivePath);
    const checksumContent = generateChecksumFile([{ filename: 'omega-1.0.0-win-x64.zip', sha256: hash }]);
    const checksumPath = join(testDir, 'checksums.sha256');
    writeFileSync(checksumPath, checksumContent);

    const result = verifyArchive(archivePath, checksumPath);
    expect(result.verified).toBe(true);
  });

  it('fails on missing archive', () => {
    const result = verifyArchive(join(testDir, 'missing.zip'), join(testDir, 'checksums'));
    expect(result.verified).toBe(false);
  });

  it('fails on missing checksum file', () => {
    writeFileSync(join(testDir, 'file.zip'), 'content');
    const result = verifyArchive(join(testDir, 'file.zip'), join(testDir, 'missing-checksums'));
    expect(result.verified).toBe(false);
    expect(result.expected).toBe('NO_CHECKSUM_FILE');
  });

  it('fails on mismatched checksum', () => {
    const archivePath = join(testDir, 'bad.zip');
    writeFileSync(archivePath, 'content');
    const checksumContent = `${'f'.repeat(64)}  bad.zip\n`;
    const checksumPath = join(testDir, 'checksums.sha256');
    writeFileSync(checksumPath, checksumContent);

    const result = verifyArchive(archivePath, checksumPath);
    expect(result.verified).toBe(false);
  });
});

describe('verifySingleFile', () => {
  const testDir = join(tmpdir(), 'omega-install-single');

  beforeEach(() => mkdirSync(testDir, { recursive: true }));
  afterEach(() => rmSync(testDir, { recursive: true, force: true }));

  it('verifies matching hash', () => {
    const filePath = join(testDir, 'test.txt');
    writeFileSync(filePath, 'content');
    const hash = sha256File(filePath);
    const result = verifySingleFile(filePath, hash);
    expect(result.verified).toBe(true);
  });

  it('fails on wrong hash', () => {
    const filePath = join(testDir, 'test.txt');
    writeFileSync(filePath, 'content');
    const result = verifySingleFile(filePath, 'wronghash');
    expect(result.verified).toBe(false);
  });

  it('fails on missing file', () => {
    const result = verifySingleFile(join(testDir, 'nope'), 'abc');
    expect(result.verified).toBe(false);
  });
});
