/**
 * OMEGA Auditpack Hostile Tests
 * Phase M - NASA-Grade L4
 */
import { describe, it, expect } from 'vitest';
import { isSafePath, validateZipStructure } from '../../src/auditpack';

describe('Phase M — Hostile Tests', () => {
  describe('M-T01: Path traversal attacks', () => {
    const attacks = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      'foo/../../../etc/passwd',
      './foo/../../etc/passwd',
      'foo/bar/../../../etc/passwd',
      '....//....//etc/passwd',
    ];

    for (const attack of attacks) {
      it(`blocks: ${attack}`, () => {
        expect(isSafePath(attack, '/tmp/safe')).toBe(false);
      });
    }
  });

  describe('M-T02: Null byte injection', () => {
    it('detects null bytes in filenames', () => {
      const entries = [
        { filename: 'innocent.txt\0.exe', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
      ];

      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(false);
      expect(result.hasDangerousFiles).toBe(true);
    });
  });

  describe('M-T03: Windows path separators', () => {
    it('detects backslashes in filenames', () => {
      const entries = [
        { filename: 'foo\\bar\\baz.txt', isDirectory: false, compressedSize: 100, uncompressedSize: 200 },
      ];

      const result = validateZipStructure(entries, '/tmp/extract');
      expect(result.valid).toBe(false);
      expect(result.hasDangerousFiles).toBe(true);
    });
  });
});
