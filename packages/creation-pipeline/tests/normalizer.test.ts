import { describe, it, expect } from 'vitest';
import { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from '../src/normalizer.js';

describe('Normalizer', () => {
  it('normalizes CRLF to LF', () => {
    expect(normalizeLF('a\r\nb')).toBe('a\nb');
  });

  it('normalizes whitespace', () => {
    expect(normalizeWhitespace('  a   b  ')).toBe('a b');
  });

  it('normalizes JSON', () => {
    expect(normalizeJSON('a\r\nb\n\n\nc')).toBe('a\nb\nc');
  });

  it('is idempotent', () => {
    const s = normalize('  a   b  ');
    expect(normalize(s)).toBe(s);
  });

  it('compose normalizations', () => {
    expect(normalize('  a\r\n  b  ')).toBe('a\n b');
  });

  it('handles CR only', () => {
    expect(normalizeLF('a\rb')).toBe('a\nb');
  });
});
