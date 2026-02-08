import { describe, it, expect } from 'vitest';
import { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from '../src/normalizer.js';

describe('Normalizer', () => {
  it('should convert CRLF to LF', () => {
    expect(normalizeLF('a\r\nb\r\nc')).toBe('a\nb\nc');
  });

  it('should trim trailing whitespace per line', () => {
    expect(normalizeWhitespace('a   \nb  \nc')).toBe('a\nb\nc');
  });

  it('should sort JSON keys', () => {
    const input = JSON.stringify({ b: 2, a: 1 });
    const result = normalizeJSON(input);
    expect(result).toBe('{"a":1,"b":2}');
  });

  it('should be idempotent', () => {
    const input = 'hello\r\n  world  \r\n\r\n\r\nfoo';
    const r1 = normalize(input);
    const r2 = normalize(r1);
    expect(r1).toBe(r2);
  });

  it('should handle plan-like text', () => {
    const input = 'Plan:\r\n  Arc 1  \r\n  Scene 1  ';
    const result = normalize(input);
    expect(result).toBe('Plan:\n  Arc 1\n  Scene 1');
  });

  it('should convert CR to LF', () => {
    expect(normalizeLF('a\rb\rc')).toBe('a\nb\nc');
  });
});
