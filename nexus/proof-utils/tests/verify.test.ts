/**
 * Verify Tests - NASA-Grade
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildManifest } from '../src/manifest.js';
import { verifyManifest } from '../src/verify.js';

describe('verifyManifest', () => {
  const testDir = join(tmpdir(), 'proof-utils-verify-' + Date.now());
  const testFile = join(testDir, 'test-verify.txt');

  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testFile, 'original');
  });

  afterAll(() => {
    if (existsSync(testFile)) {
      unlinkSync(testFile);
    }
  });

  it('should verify intact manifest', () => {
    const manifest = buildManifest([testFile]);
    const result = verifyManifest(manifest);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should detect tampered file', () => {
    const manifest = buildManifest([testFile]);

    // Tamper
    writeFileSync(testFile, 'tampered');

    const result = verifyManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.tamperedFiles).toContain(testFile);
    expect(result.errors.some((e) => e.includes('Hash mismatch'))).toBe(true);

    // Restore
    writeFileSync(testFile, 'original');
  });

  it('should detect missing file', () => {
    const manifest = buildManifest([testFile]);

    // Delete
    unlinkSync(testFile);

    const result = verifyManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not found'))).toBe(true);

    // Restore
    writeFileSync(testFile, 'original');
  });

  it('should freeze result', () => {
    const manifest = buildManifest([testFile]);
    const result = verifyManifest(manifest);

    expect(() => {
      (result as { valid: boolean }).valid = false;
    }).toThrow();
  });

  it('should handle empty manifest', () => {
    const manifest = buildManifest([]);
    const result = verifyManifest(manifest);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
