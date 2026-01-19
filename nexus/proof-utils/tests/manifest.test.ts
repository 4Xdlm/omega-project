/**
 * Manifest Tests - NASA-Grade
 * CORRECTION #2: Time injection (determinism)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildManifest } from '../src/manifest.js';

describe('buildManifest', () => {
  const testDir = join(tmpdir(), 'proof-utils-test-' + Date.now());
  const testFile = join(testDir, 'test-manifest.txt');

  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testFile, 'test content');
  });

  afterAll(() => {
    if (existsSync(testFile)) {
      unlinkSync(testFile);
    }
  });

  it('should build manifest for files', () => {
    const fixedTimestamp = () => 123456789;
    const manifest = buildManifest([testFile], fixedTimestamp);

    expect(manifest.entries.length).toBe(1);
    expect(manifest.entries[0]?.path).toBe(testFile);
    expect(manifest.entries[0]?.size).toBeGreaterThan(0);
    expect(manifest.entries[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.timestamp).toBe(123456789);
  });

  it('should be deterministic (same input -> same output)', () => {
    const fixedTimestamp = () => 999999;
    const m1 = buildManifest([testFile], fixedTimestamp);
    const m2 = buildManifest([testFile], fixedTimestamp);

    expect(m1.entries[0]?.sha256).toBe(m2.entries[0]?.sha256);
    expect(m1.timestamp).toBe(m2.timestamp);
  });

  it('should freeze manifest', () => {
    const manifest = buildManifest([testFile]);

    expect(() => {
      (manifest as { version: string }).version = '2.0.0';
    }).toThrow();
  });

  it('should handle empty file list', () => {
    const manifest = buildManifest([]);
    expect(manifest.entries.length).toBe(0);
  });
});
