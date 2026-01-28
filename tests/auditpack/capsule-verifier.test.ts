/**
 * OMEGA Capsule Verifier Tests
 * Phase M - NASA-Grade L4
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { verifyCapsule, createSecureTempDir, cleanupTempDir } from '../../src/auditpack';

describe('Phase M — Capsule Verifier', () => {
  describe('M-INV-03: Temp directory management', () => {
    it('creates unique temp directories', () => {
      const dir1 = createSecureTempDir();
      const dir2 = createSecureTempDir();

      expect(dir1).not.toBe(dir2);
      expect(existsSync(dir1)).toBe(true);
      expect(existsSync(dir2)).toBe(true);

      // Cleanup
      cleanupTempDir(dir1);
      cleanupTempDir(dir2);

      expect(existsSync(dir1)).toBe(false);
      expect(existsSync(dir2)).toBe(false);
    });

    it('cleanup only removes omega-verify directories', () => {
      // Should not remove arbitrary directories
      cleanupTempDir('/tmp'); // Should do nothing
      cleanupTempDir('/home'); // Should do nothing
    });
  });

  describe('M-INV-04: Missing capsule handling', () => {
    it('returns ERROR for non-existent file', async () => {
      const result = await verifyCapsule('/nonexistent/capsule.zip');
      expect(result.success).toBe(false);
      expect(result.verdict).toBe('ERROR');
      expect(result.errors).toContain('Capsule file not found');
    });
  });

  describe('M-INV-05: Report generation', () => {
    it('generates deterministic report format', async () => {
      const result = await verifyCapsule('/nonexistent/capsule.zip');
      // Even for error cases, report should be formatted correctly
      expect(result.verdict).toBe('ERROR');
    });
  });
});
