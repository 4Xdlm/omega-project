import { describe, it, expect } from 'vitest';
import { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from '../src/normalizer.js';

describe('Normalizer', () => {
  it('normalizes CRLF to LF', () => {
    expect(normalizeLF('hello\r\nworld')).toBe('hello\nworld');
  });

  it('normalizes whitespace', () => {
    expect(normalizeWhitespace('hello   world')).toBe('hello world');
  });

  it('normalizes JSON', () => {
    expect(normalizeJSON('{"b": 1, "a": 2}')).toBe('{"b":1,"a":2}');
  });

  it('is idempotent', () => {
    const input = 'hello   world\r\n  test';
    const first = normalize(input);
    const second = normalize(first);
    expect(first).toBe(second);
  });

  it('compose normalizations', () => {
    const input = 'hello\r\n   world   \r\n  test';
    const result = normalize(input);
    expect(result).not.toContain('\r');
    expect(result).not.toContain('  ');
  });

  it('handles CR only', () => {
    expect(normalizeLF('hello\rworld')).toBe('hello\nworld');
  });
});
