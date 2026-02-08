/**
 * OMEGA Forge — Normalizer Tests
 * Phase C.5 — 6 tests for normalizeLF, normalizeWhitespace, normalizeJSON, normalize
 */

import { describe, it, expect } from 'vitest';
import { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from '../src/normalizer.js';

describe('normalizer', () => {
  it('normalizes CRLF to LF', () => {
    const input = 'line1\r\nline2\r\nline3';
    const result = normalizeLF(input);
    expect(result).toBe('line1\nline2\nline3');
    expect(result).not.toContain('\r');
  });

  it('collapses whitespace and trims lines', () => {
    const input = '  hello   world  \n  foo   bar  ';
    const result = normalizeWhitespace(input);
    expect(result).toBe('hello world\nfoo bar');
  });

  it('normalizes JSON with trailing whitespace and CRLF', () => {
    const input = '  {"key": "value"}  \r\n';
    const result = normalizeJSON(input);
    expect(result).toBe('{"key": "value"}');
    expect(result).not.toContain('\r');
  });

  it('normalize is idempotent', () => {
    const input = '  hello   world  \r\n  foo   bar  \r\n';
    const once = normalize(input);
    const twice = normalize(once);
    expect(once).toBe(twice);
  });

  it('compose: normalize = normalizeWhitespace(normalizeLF(text))', () => {
    const input = '  alpha   beta  \r\n  gamma   delta  ';
    const composed = normalizeWhitespace(normalizeLF(input));
    const direct = normalize(input);
    expect(composed).toBe(direct);
  });

  it('handles lone CR characters', () => {
    const input = 'a\rb\rc';
    const result = normalizeLF(input);
    expect(result).toBe('a\nb\nc');
  });
});
