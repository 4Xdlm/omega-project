/**
 * OMEGA Release — Extractor Tests
 * Phase G.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractArchive } from '../../src/install/extractor.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('extractArchive', () => {
  const testDir = join(tmpdir(), 'omega-install-extract');
  const archiveDir = join(testDir, 'archives');
  const outputDir = join(testDir, 'extracted');

  beforeEach(() => {
    mkdirSync(archiveDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('extracts valid archive', () => {
    const archivePath = join(archiveDir, 'test.zip');
    writeFileSync(archivePath, JSON.stringify({
      omega_version: '1.0.0',
      files: ['index.js', 'README.md'],
    }));
    const result = extractArchive(archivePath, outputDir);
    expect(result.success).toBe(true);
    expect(result.fileCount).toBe(2);
  });

  it('writes MANIFEST.json to output', () => {
    const archivePath = join(archiveDir, 'test.zip');
    writeFileSync(archivePath, JSON.stringify({
      omega_version: '1.0.0',
      files: [],
    }));
    extractArchive(archivePath, outputDir);
    expect(existsSync(join(outputDir, 'MANIFEST.json'))).toBe(true);
  });

  it('fails on missing archive', () => {
    const result = extractArchive(join(archiveDir, 'missing.zip'), outputDir);
    expect(result.success).toBe(false);
  });

  it('fails on invalid format', () => {
    const archivePath = join(archiveDir, 'bad.zip');
    writeFileSync(archivePath, 'not-json');
    const result = extractArchive(archivePath, outputDir);
    expect(result.success).toBe(false);
  });
});
