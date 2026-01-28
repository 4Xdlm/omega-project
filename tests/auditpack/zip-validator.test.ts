/**
 * OMEGA Zip Validator Tests
 * Phase M - NASA-Grade L4
 */
import { describe, it, expect } from 'vitest';
import { isSafePath, validateZipStructure } from '../../src/auditpack';

describe('Phase M — Zip Validator', () => {
  describe('M-INV-01: Zip-slip defense', () => {
    it('rejects absolute paths', () => {
      expect(isSafePath('/etc/passwd', '/tmp/extract')).toBe(false);
      expect(isSafePath('C:\\Windows\\System32', '/tmp/extract')).toBe(false);
    });

    it('rejects parent directory traversal', () => {
      expect(isSafePath('../../../etc/passwd', '/tmp/extract')).toBe(false);
      expect(isSafePath('foo/../../bar', '/tmp/extract')).toBe(false);
    });

    it('accepts safe relative paths', () => {
      expect(isSafePath('intent.json', '/tmp/extract')).toBe(true);
      expect(isSafePath('artifacts/output.txt', '/tmp/extract')).toBe(true);
      expect(isSafePath('nested/deep/file.txt', '/tmp/extract')).toBe(true);
    });
  });

  describe('M-INV-02: Structure validation', () => {
    it('validates clean entry list', () => {
      const entries = [
        { filename: 'intent.json', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
        { filename: 'hashes.txt', isDirectory: false, compressedSize: 50, uncompressedSize: 100 },
      ];

      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(true);
      expect(result.hasZipSlip).toBe(false);
    });

    it('detects zip-slip in entries', () => {
      const entries = [
        { filename: '../../../etc/passwd', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
      ];

      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(false);
      expect(result.hasZipSlip).toBe(true);
    });

    it('detects dangerous filenames', () => {
      const entries = [
        { filename: 'file\0name.txt', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
      ];

      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(false);
      expect(result.hasDangerousFiles).toBe(true);
    });
  });
});
