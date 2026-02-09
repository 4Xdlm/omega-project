/**
 * OMEGA Runner — Canonical Module Tests
 * Phase D.1 — 15 tests for canonicalJSON, canonicalPath, canonicalBytes
 */

import { describe, it, expect } from 'vitest';
import { canonicalJSON, canonicalPath, canonicalBytes } from '../src/proofpack/canonical.js';
import { hashString } from '../src/proofpack/hash.js';

describe('canonicalJSON', () => {
  it('sorts object keys lexicographically', () => {
    const result = canonicalJSON({ b: 2, a: 1 });
    expect(result).toBe('{"a":1,"b":2}');
  });

  it('sorts nested object keys recursively', () => {
    const result = canonicalJSON({ z: { b: 2, a: 1 }, a: 1 });
    expect(result).toBe('{"a":1,"z":{"a":1,"b":2}}');
  });

  it('preserves array order', () => {
    const result = canonicalJSON({ arr: [3, 1, 2] });
    expect(result).toBe('{"arr":[3,1,2]}');
  });

  it('produces deterministic output for same input', () => {
    const obj = { x: 10, a: 'hello', m: [1, 2, 3] };
    const r1 = canonicalJSON(obj);
    const r2 = canonicalJSON(obj);
    expect(r1).toBe(r2);
  });

  it('handles empty object', () => {
    const result = canonicalJSON({});
    expect(result).toBe('{}');
  });

  it('handles null, boolean, and number primitives', () => {
    expect(canonicalJSON(null)).toBe('null');
    expect(canonicalJSON(true)).toBe('true');
    expect(canonicalJSON(false)).toBe('false');
    expect(canonicalJSON(42)).toBe('42');
  });

  it('same input produces same hash (determinism)', () => {
    const obj = { key: 'value', nested: { deep: true } };
    const h1 = hashString(canonicalJSON(obj));
    const h2 = hashString(canonicalJSON(obj));
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});

describe('canonicalPath', () => {
  it('converts Windows backslashes to forward slashes', () => {
    const result = canonicalPath('C:\\Users\\test\\file.txt');
    expect(result).toBe('C:/Users/test/file.txt');
  });

  it('leaves POSIX paths unchanged', () => {
    const result = canonicalPath('/home/user/file.txt');
    expect(result).toBe('/home/user/file.txt');
  });

  it('handles mixed separators', () => {
    const result = canonicalPath('dir\\sub/file\\name.ts');
    expect(result).toBe('dir/sub/file/name.ts');
  });
});

describe('canonicalBytes', () => {
  it('converts CRLF to LF', () => {
    const result = canonicalBytes('line1\r\nline2\r\n');
    expect(result).toBe('line1\nline2\n');
  });

  it('converts lone CR to LF', () => {
    const result = canonicalBytes('line1\rline2\r');
    expect(result).toBe('line1\nline2\n');
  });

  it('leaves LF-only content unchanged', () => {
    const content = 'line1\nline2\n';
    const result = canonicalBytes(content);
    expect(result).toBe(content);
  });

  it('is idempotent (applying twice yields same result)', () => {
    const input = 'a\r\nb\rc\n';
    const once = canonicalBytes(input);
    const twice = canonicalBytes(once);
    expect(once).toBe(twice);
  });

  it('INV-RUN-09: CRLF immune — hash(LF) === hash(CRLF)', () => {
    const lfContent = 'line1\nline2\nline3\n';
    const crlfContent = 'line1\r\nline2\r\nline3\r\n';
    const hashLf = hashString(lfContent);
    const hashCrlf = hashString(crlfContent);
    expect(hashLf).toBe(hashCrlf);
  });
});
