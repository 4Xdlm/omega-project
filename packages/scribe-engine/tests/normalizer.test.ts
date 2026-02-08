import { describe, it, expect } from 'vitest';
import { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from '../src/normalizer.js';

describe('Normalizer', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeLF('a\r\nb')).toBe('a\nb');
  });

  it('converts lone CR to LF', () => {
    expect(normalizeLF('a\rb')).toBe('a\nb');
  });

  it('normalizes whitespace', () => {
    expect(normalizeWhitespace('a  b   c')).toBe('a b c');
  });

  it('normalizes JSON', () => {
    const input = '{"b": 1, "a": 2}';
    const result = normalizeJSON(input);
    expect(result).toBe('{"b":1,"a":2}');
  });

  it('is idempotent', () => {
    const input = 'hello\r\n  world';
    const first = normalize(input);
    const second = normalize(first);
    expect(first).toBe(second);
  });

  it('compose: normalize = normalizeWhitespace(normalizeLF(...))', () => {
    const input = 'a\r\nb  c';
    expect(normalize(input)).toBe(normalizeWhitespace(normalizeLF(input)));
  });
});
