/**
 * @fileoverview Tests for sanitization utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeObject,
  sanitizePath,
  sanitizeUrl,
  escapeHtml,
  stripHtml,
} from '../../src/index.js';

describe('sanitizeString', () => {
  it('should remove null bytes', () => {
    const result = sanitizeString('hello\0world');
    expect(result.value).toBe('helloworld');
    expect(result.modifications).toContain('removed null bytes');
  });

  it('should trim by default', () => {
    const result = sanitizeString('  hello  ');
    expect(result.value).toBe('hello');
    expect(result.modifications).toContain('trimmed whitespace');
  });

  it('should not trim if disabled', () => {
    const result = sanitizeString('  hello  ', { trim: false });
    expect(result.value).toBe('  hello  ');
  });

  it('should convert to lowercase', () => {
    const result = sanitizeString('HELLO', { lowercase: true });
    expect(result.value).toBe('hello');
    expect(result.modifications).toContain('converted to lowercase');
  });

  it('should convert to uppercase', () => {
    const result = sanitizeString('hello', { uppercase: true });
    expect(result.value).toBe('HELLO');
    expect(result.modifications).toContain('converted to uppercase');
  });

  it('should truncate to max length', () => {
    const result = sanitizeString('hello world', { maxLength: 5 });
    expect(result.value).toBe('hello');
    expect(result.modifications).toContain('truncated to 5 chars');
  });

  it('should remove control characters', () => {
    const result = sanitizeString('hello\x00\x01\x02world', { removeControlChars: true });
    expect(result.value).toBe('helloworld');
  });

  it('should normalize newlines', () => {
    const result = sanitizeString('line1\r\nline2\rline3', { normalizeNewlines: true });
    expect(result.value).toBe('line1\nline2\nline3');
  });
});

describe('sanitizeObject', () => {
  it('should remove dangerous keys', () => {
    const result = sanitizeObject({
      safe: 'value',
      __proto__: 'dangerous',
      constructor: 'dangerous',
    });
    expect(result.success).toBe(true);
    expect(result.value).toEqual({ safe: 'value' });
    expect(result.modifications.some((m) => m.includes('dangerous key'))).toBe(true);
  });

  it('should handle nested objects', () => {
    const result = sanitizeObject({
      a: { b: { c: 'value' } },
    });
    expect(result.success).toBe(true);
    expect((result.value as any).a.b.c).toBe('value');
  });

  it('should handle arrays', () => {
    const result = sanitizeObject(['a', 'b', 'c']);
    expect(result.success).toBe(true);
    expect(result.value).toEqual(['a', 'b', 'c']);
  });

  it('should limit depth', () => {
    const deep = { a: { b: { c: { d: { e: 'deep' } } } } };
    const result = sanitizeObject(deep, 3);
    expect(result.modifications).toContain('max depth exceeded');
  });

  it('should sanitize strings in objects', () => {
    const result = sanitizeObject({ key: 'value\0with\0nulls' });
    expect((result.value as any).key).toBe('valuewithnulls');
  });
});

describe('sanitizePath', () => {
  it('should remove null bytes', () => {
    const result = sanitizePath('path/to\0/file');
    expect(result.value).toBe('path/to/file');
    expect(result.modifications).toContain('removed null bytes');
  });

  it('should normalize separators', () => {
    const result = sanitizePath('path\\to\\file');
    expect(result.value).toBe('path/to/file');
    expect(result.modifications).toContain('normalized path separators');
  });

  it('should remove double slashes', () => {
    const result = sanitizePath('path//to//file');
    expect(result.value).toBe('path/to/file');
  });

  it('should remove trailing slash', () => {
    const result = sanitizePath('path/to/dir/');
    expect(result.value).toBe('path/to/dir');
    expect(result.modifications).toContain('removed trailing slash');
  });

  it('should remove traversal sequences', () => {
    const result = sanitizePath('path/../../../etc/passwd');
    expect(result.value).not.toContain('..');
    expect(result.modifications).toContain('removed traversal sequences');
  });
});

describe('sanitizeUrl', () => {
  it('should allow https URLs', () => {
    const result = sanitizeUrl('https://example.com/path');
    expect(result.success).toBe(true);
    expect(result.value).toBe('https://example.com/path');
  });

  it('should allow http URLs by default', () => {
    const result = sanitizeUrl('http://example.com/path');
    expect(result.success).toBe(true);
  });

  it('should block javascript: URLs', () => {
    const result = sanitizeUrl('javascript:alert(1)');
    expect(result.success).toBe(false);
    expect(result.modifications).toContain('blocked dangerous protocol');
  });

  it('should block data: URLs', () => {
    const result = sanitizeUrl('data:text/html,<script>alert(1)</script>');
    expect(result.success).toBe(false);
  });

  it('should block vbscript: URLs', () => {
    const result = sanitizeUrl('vbscript:msgbox(1)');
    expect(result.success).toBe(false);
  });

  it('should block disallowed protocols', () => {
    const result = sanitizeUrl('ftp://example.com', ['https']);
    expect(result.success).toBe(false);
    expect(result.modifications.some((m) => m.includes('blocked protocol'))).toBe(true);
  });

  it('should remove null bytes', () => {
    const result = sanitizeUrl('https://example\0.com');
    expect(result.value).toBe('https://example.com');
  });
});

describe('escapeHtml', () => {
  it('should escape &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should escape <', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('should escape >', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('should escape "', () => {
    expect(escapeHtml('a "b" c')).toBe('a &quot;b&quot; c');
  });

  it('should escape \'', () => {
    expect(escapeHtml("a 'b' c")).toBe('a &#x27;b&#x27; c');
  });

  it('should escape all characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });
});

describe('stripHtml', () => {
  it('should remove script tags', () => {
    const result = stripHtml('<script>alert(1)</script>text');
    expect(result.value).toBe('text');
    expect(result.modifications).toContain('removed script tags');
  });

  it('should remove style tags', () => {
    const result = stripHtml('<style>body{}</style>text');
    expect(result.value).toBe('text');
    expect(result.modifications).toContain('removed style tags');
  });

  it('should remove all HTML tags', () => {
    const result = stripHtml('<p>Hello <strong>world</strong></p>');
    expect(result.value).toBe('Hello world');
    expect(result.modifications).toContain('removed HTML tags');
  });

  it('should handle nested tags', () => {
    const result = stripHtml('<div><p>text</p></div>');
    expect(result.value).toBe('text');
  });
});
