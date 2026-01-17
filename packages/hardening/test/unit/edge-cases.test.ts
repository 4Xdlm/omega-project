/**
 * @fileoverview Phase 3.3 - Edge Cases Tests for Hardening Module
 * Tests security edge cases, sanitization boundaries, and robustness.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeObject,
  sanitizePath,
  sanitizeUrl,
  escapeHtml,
  stripHtml,
  safeJsonParse,
  safeJsonStringify,
} from '../../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY 1: SECURITY INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Invariants', () => {
  describe('Null Byte Attacks', () => {
    it('should remove null bytes from strings', () => {
      const result = sanitizeString('hello\x00world', { removeNullBytes: true });
      expect(result.value).toBe('helloworld');
      expect(result.modifications).toContain('removed null bytes');
    });

    it('should remove null bytes from paths', () => {
      const result = sanitizePath('/path/to\x00/file.txt');
      expect(result.value).not.toContain('\x00');
    });

    it('should remove null bytes from URLs', () => {
      const result = sanitizeUrl('https://example.com/page\x00.html');
      expect(result.value).not.toContain('\x00');
    });

    it('should handle multiple null bytes', () => {
      const result = sanitizeString('\x00\x00\x00test\x00\x00', { removeNullBytes: true });
      expect(result.value).toBe('test');
    });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should remove __proto__ from objects', () => {
      const obj = { __proto__: { polluted: true }, safe: 'value' };
      const result = sanitizeObject(obj);
      expect((result.value as any).__proto__).toBeUndefined();
    });

    it('should remove constructor from objects', () => {
      const obj = { constructor: { polluted: true }, safe: 'value' };
      const result = sanitizeObject(obj);
      expect(Object.keys(result.value as object)).not.toContain('constructor');
    });

    it('should remove prototype from objects', () => {
      const obj = { prototype: { polluted: true }, safe: 'value' };
      const result = sanitizeObject(obj);
      expect(Object.keys(result.value as object)).not.toContain('prototype');
    });

    it('should remove dangerous keys from nested objects', () => {
      const obj = { level1: { level2: { __proto__: {} } } };
      const result = sanitizeObject(obj);
      expect(result.modifications.some(m => m.includes('dangerous key'))).toBe(true);
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should remove .. sequences', () => {
      const result = sanitizePath('../../../etc/passwd');
      expect(result.value).not.toContain('..');
    });

    it('should handle multiple .. sequences', () => {
      const result = sanitizePath('a/../../b/../../../c');
      expect(result.value.match(/\.\./g)).toBeNull();
    });

    it('should normalize backslashes to forward slashes', () => {
      const result = sanitizePath('path\\to\\file');
      expect(result.value).toBe('path/to/file');
    });

    it('should remove double slashes', () => {
      const result = sanitizePath('path//to///file');
      expect(result.value).not.toContain('//');
    });
  });

  describe('URL Injection Prevention', () => {
    it('should block javascript: URLs', () => {
      const result = sanitizeUrl('javascript:alert(1)');
      expect(result.success).toBe(false);
    });

    it('should block data: URLs', () => {
      const result = sanitizeUrl('data:text/html,<script>alert(1)</script>');
      expect(result.success).toBe(false);
    });

    it('should block vbscript: URLs', () => {
      const result = sanitizeUrl('vbscript:msgbox("XSS")');
      expect(result.success).toBe(false);
    });

    it('should handle case variations', () => {
      expect(sanitizeUrl('JAVASCRIPT:alert(1)').success).toBe(false);
      expect(sanitizeUrl('JaVaScRiPt:alert(1)').success).toBe(false);
    });

    it('should block non-allowed protocols', () => {
      const result = sanitizeUrl('ftp://example.com', ['https']);
      expect(result.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY 2: XSS PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('XSS Prevention', () => {
  describe('HTML Escaping', () => {
    it('should escape script tags', () => {
      const result = escapeHtml('<script>alert("XSS")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should escape all special characters', () => {
      const result = escapeHtml('<>"\'&');
      expect(result).toBe('&lt;&gt;&quot;&#x27;&amp;');
    });

    it('should handle nested tags', () => {
      const result = escapeHtml('<div><span onclick="evil()">Click</span></div>');
      expect(result).not.toContain('<div>');
    });

    it('should handle event handlers', () => {
      const result = escapeHtml('<img onerror="alert(1)" src="x">');
      expect(result).not.toContain('onerror=');
    });
  });

  describe('HTML Stripping', () => {
    it('should remove script tags and content', () => {
      const result = stripHtml('<script>evil()</script>Safe text');
      expect(result.value).toBe('Safe text');
    });

    it('should remove style tags and content', () => {
      const result = stripHtml('<style>.hidden{display:none}</style>Visible');
      expect(result.value).toBe('Visible');
    });

    it('should remove all HTML tags', () => {
      const result = stripHtml('<p>Paragraph</p><b>Bold</b><i>Italic</i>');
      expect(result.value).toBe('ParagraphBoldItalic');
    });

    it('should handle malformed HTML', () => {
      const result = stripHtml('<div><span>Unclosed');
      expect(result.success).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY 3: ROBUSTNESS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Robustness - Edge Inputs', () => {
  describe('Empty and Null Values', () => {
    it('should handle empty string', () => {
      const result = sanitizeString('');
      expect(result.success).toBe(true);
      expect(result.value).toBe('');
    });

    it('should handle null in object sanitization', () => {
      const result = sanitizeObject(null);
      expect(result.success).toBe(true);
      expect(result.value).toBe(null);
    });

    it('should handle undefined in object sanitization', () => {
      const result = sanitizeObject(undefined);
      expect(result.success).toBe(true);
      expect(result.value).toBe(undefined);
    });

    it('should handle empty object', () => {
      const result = sanitizeObject({});
      expect(result.success).toBe(true);
      expect(result.value).toEqual({});
    });

    it('should handle empty array', () => {
      const result = sanitizeObject([]);
      expect(result.success).toBe(true);
      expect(result.value).toEqual([]);
    });
  });

  describe('Very Large Inputs', () => {
    it('should handle 10K character string', () => {
      const large = 'x'.repeat(10000);
      const result = sanitizeString(large);
      expect(result.success).toBe(true);
      expect(result.value.length).toBe(10000);
    });

    it('should truncate to maxLength', () => {
      const large = 'x'.repeat(10000);
      const result = sanitizeString(large, { maxLength: 100 });
      expect(result.value.length).toBe(100);
      expect(result.modifications).toContain('truncated to 100 chars');
    });

    it('should handle deeply nested object', () => {
      const deep: any = {};
      let current = deep;
      for (let i = 0; i < 15; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.value = 'end';

      const result = sanitizeObject(deep, 20);
      expect(result.success).toBe(true);
    });

    it('should handle max depth exceeded', () => {
      const deep: any = {};
      let current = deep;
      for (let i = 0; i < 15; i++) {
        current.nested = {};
        current = current.nested;
      }

      const result = sanitizeObject(deep, 5);
      expect(result.modifications.some(m => m.includes('max depth'))).toBe(true);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle emoji in strings', () => {
      const result = sanitizeString('Hello 👋 World 🌍');
      expect(result.success).toBe(true);
      expect(result.value).toContain('👋');
    });

    it('should handle RTL text', () => {
      const result = sanitizeString('مرحبا Hello שלום');
      expect(result.success).toBe(true);
    });

    it('should handle combining characters', () => {
      const result = sanitizeString('café résumé naïve');
      expect(result.success).toBe(true);
    });

    it('should handle zero-width characters', () => {
      const result = sanitizeString('Hello\u200BWorld');
      expect(result.success).toBe(true);
    });

    it('should remove control characters when enabled', () => {
      const result = sanitizeString('Hello\x07World', { removeControlChars: true });
      expect(result.value).toBe('HelloWorld');
    });
  });

  describe('JSON Edge Cases', () => {
    it('should handle empty JSON object', () => {
      const result = safeJsonParse('{}');
      expect(result.success).toBe(true);
      expect(result.value).toEqual({});
    });

    it('should handle empty JSON array', () => {
      const result = safeJsonParse('[]');
      expect(result.success).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('should handle JSON null', () => {
      const result = safeJsonParse('null');
      expect(result.success).toBe(true);
      expect(result.value).toBe(null);
    });

    it('should handle JSON with unicode', () => {
      const result = safeJsonParse('{"emoji": "👋", "chinese": "中文"}');
      expect(result.success).toBe(true);
    });

    it('should stringify and parse roundtrip', () => {
      const original = { key: 'value', num: 42, arr: [1, 2, 3] };
      const stringified = safeJsonStringify(original);
      expect(stringified.success).toBe(true);

      const parsed = safeJsonParse(stringified.value!);
      expect(parsed.success).toBe(true);
      expect(parsed.value).toEqual(original);
    });
  });
});
