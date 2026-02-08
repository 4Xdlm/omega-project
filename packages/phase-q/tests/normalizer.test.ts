import { describe, it, expect } from 'vitest';
import { normalize, normalizeLF, normalizeWhitespace, normalizeJSON, isIdempotent } from '../src/normalizer.js';

describe('Phase Q — Normalizer (Q-INV-05)', () => {
  describe('normalizeLF', () => {
    it('should convert CRLF to LF', () => {
      expect(normalizeLF('hello\r\nworld')).toBe('hello\nworld');
    });

    it('should convert lone CR to LF', () => {
      expect(normalizeLF('hello\rworld')).toBe('hello\nworld');
    });

    it('should preserve existing LF', () => {
      expect(normalizeLF('hello\nworld')).toBe('hello\nworld');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should collapse multiple spaces to single space', () => {
      expect(normalizeWhitespace('hello   world')).toBe('hello world');
    });

    it('should trim leading and trailing whitespace per line', () => {
      expect(normalizeWhitespace('  hello  \n  world  ')).toBe('hello\nworld');
    });

    it('should collapse tabs to single space', () => {
      expect(normalizeWhitespace('hello\t\tworld')).toBe('hello world');
    });
  });

  describe('normalizeJSON', () => {
    it('should sort JSON keys lexicographically', () => {
      const input = '{"z":1,"a":2,"m":3}';
      const result = normalizeJSON(input);
      expect(result).toBe('{"a":2,"m":3,"z":1}');
    });

    it('should return non-JSON input unchanged', () => {
      expect(normalizeJSON('not json')).toBe('not json');
    });
  });

  describe('normalize (full pipeline)', () => {
    it('should apply LF + whitespace + trim', () => {
      const input = '  hello\r\n  world  \r\n';
      const result = normalize(input);
      expect(result).toBe('hello\nworld');
    });

    it('should handle empty string', () => {
      expect(normalize('')).toBe('');
    });

    it('should preserve unicode characters', () => {
      const input = 'cafe\u0301';
      expect(normalize(input)).toBe('cafe\u0301');
    });
  });

  describe('isIdempotent', () => {
    it('should return true for already normalized input', () => {
      expect(isIdempotent('hello\nworld')).toBe(true);
    });

    it('should return true for any input (normalization is always idempotent)', () => {
      expect(isIdempotent('  hello\r\n  world  ')).toBe(true);
    });
  });
});
