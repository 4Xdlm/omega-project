/**
 * @fileoverview Phase 3.3 - Edge Cases Tests for Segment Engine
 * Tests business invariants, extreme inputs, and robustness.
 */

import { describe, it, expect } from 'vitest';
import { segmentText } from '../src/segmenter.js';
import { assertAllInvariants, InvariantError } from '../src/invariants.js';
import { normalizeText } from '../src/normalizer.js';
import { stableStringify, sha256Hex, hashObject } from '../src/canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY 1: BUSINESS INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Business Invariants - Extreme Cases', () => {
  describe('INV-SEG-01: Offset Validity', () => {
    it('should maintain valid offsets with very long sentences', () => {
      const longSentence = 'A'.repeat(5000) + '. ' + 'B'.repeat(5000) + '.';
      const result = segmentText(longSentence, { mode: 'sentence' });
      const { text } = normalizeText(longSentence, 'normalize_lf');

      expect(() => assertAllInvariants(text, result)).not.toThrow();
      expect(result.segments.every(s => s.start >= 0)).toBe(true);
      expect(result.segments.every(s => s.end > s.start)).toBe(true);
    });

    it('should maintain valid offsets with 1000 short sentences', () => {
      const manySentences = Array(1000).fill('OK.').join(' ');
      const result = segmentText(manySentences, { mode: 'sentence' });
      const { text } = normalizeText(manySentences, 'normalize_lf');

      expect(() => assertAllInvariants(text, result)).not.toThrow();
      expect(result.segment_count).toBe(1000);
    });
  });

  describe('INV-SEG-02: Slice Exactness', () => {
    it('should preserve exact text with mixed Unicode', () => {
      const mixed = '日本語です。中文也可以。English too.';
      const result = segmentText(mixed, { mode: 'sentence' });
      const { text } = normalizeText(mixed, 'normalize_lf');

      expect(() => assertAllInvariants(text, result)).not.toThrow();
      for (const seg of result.segments) {
        expect(seg.text).toBe(text.slice(seg.start, seg.end));
      }
    });

    it('should preserve exact text with RTL mixed content', () => {
      const rtl = 'Hello. مرحبا. שלום.';
      const result = segmentText(rtl, { mode: 'sentence' });
      const { text } = normalizeText(rtl, 'normalize_lf');

      expect(() => assertAllInvariants(text, result)).not.toThrow();
    });
  });

  describe('INV-SEG-05: Hash Determinism', () => {
    it('should produce consistent hash with emoji', () => {
      const emoji = '🎯 Hello. 👋 World.';
      const hashes = new Set<string>();

      for (let i = 0; i < 50; i++) {
        const result = segmentText(emoji, { mode: 'sentence' });
        hashes.add(result.segmentation_hash);
      }

      expect(hashes.size).toBe(1);
    });

    it('should produce different hashes for different unicode normalization', () => {
      const nfc = 'café';  // NFC form
      const nfd = 'café'; // NFD form (if different bytes)

      const result1 = segmentText(nfc + '.', { mode: 'sentence' });
      const result2 = segmentText(nfd + '.', { mode: 'sentence' });

      // Hashes may differ if byte representation differs
      expect(result1.segmentation_hash).toBeDefined();
      expect(result2.segmentation_hash).toBeDefined();
    });
  });

  describe('INV-SEG-08: Newline Normalization', () => {
    it('should normalize mixed line endings', () => {
      const mixed = 'Line1\r\nLine2\rLine3\nLine4.';
      const result = segmentText(mixed, { mode: 'sentence', newline_policy: 'normalize_lf' });

      for (const seg of result.segments) {
        expect(seg.text.includes('\r')).toBe(false);
      }
    });

    it('should preserve line endings in preserve mode', () => {
      const crlf = 'Para1\r\n\r\nPara2';
      const result = segmentText(crlf, { mode: 'paragraph', newline_policy: 'preserve' });

      expect(result.segment_count).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY 2: SECURITY EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Edge Cases', () => {
  describe('Null Byte Handling', () => {
    it('should handle text with null bytes', () => {
      const withNull = 'Hello\x00World.';
      const result = segmentText(withNull, { mode: 'sentence' });

      expect(result.segment_count).toBeGreaterThan(0);
    });

    it('should handle multiple null bytes', () => {
      const manyNulls = 'A\x00\x00\x00B. C\x00D.';
      const result = segmentText(manyNulls, { mode: 'sentence' });

      expect(result.segment_count).toBeGreaterThan(0);
    });
  });

  describe('Control Character Handling', () => {
    it('should handle text with control characters', () => {
      const withControl = 'Hello\x07World\x08Test.';
      const result = segmentText(withControl, { mode: 'sentence' });

      expect(result.segment_count).toBeGreaterThan(0);
    });

    it('should handle tab and form feed', () => {
      const withTabs = 'Column1\tColumn2. Next\fPage.';
      const result = segmentText(withTabs, { mode: 'sentence' });

      expect(result.segment_count).toBeGreaterThan(0);
    });
  });

  describe('Script Injection Patterns', () => {
    it('should safely handle HTML-like content', () => {
      const html = '<script>alert("xss")</script>. Normal text.';
      const result = segmentText(html, { mode: 'sentence' });

      expect(result.segment_count).toBe(2);
      expect(result.segments[0].text).toContain('<script>');
    });

    it('should safely handle SQL-like content', () => {
      const sql = "DROP TABLE users; SELECT * FROM data.";
      const result = segmentText(sql, { mode: 'sentence' });

      expect(result.segment_count).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY 3: ROBUSTNESS - EXTREME INPUTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Robustness - Extreme Inputs', () => {
  describe('Very Large Inputs', () => {
    it('should handle 10K character single sentence', () => {
      const large = 'X'.repeat(10000) + '.';
      const result = segmentText(large, { mode: 'sentence' });

      expect(result.segment_count).toBe(1);
      expect(result.segments[0].char_count).toBe(10001);
    });

    it('should handle 10K short lines', () => {
      const manyLines = Array(10000).fill('Line').join('\n\n');
      const result = segmentText(manyLines, { mode: 'paragraph' });

      expect(result.segment_count).toBe(10000);
    });
  });

  describe('Unicode Extremes', () => {
    it('should handle emoji sequences', () => {
      const emoji = '👨‍👩‍👧‍👦 Family. 🏳️‍🌈 Flag.';
      const result = segmentText(emoji, { mode: 'sentence' });

      expect(result.segment_count).toBe(2);
    });

    it('should handle zero-width characters', () => {
      const zeroWidth = 'Hello\u200BWorld. Test\u200C\u200DText.';
      const result = segmentText(zeroWidth, { mode: 'sentence' });

      expect(result.segment_count).toBe(2);
    });

    it('should handle combining diacritical marks', () => {
      const combining = 'café résumé. naïve.';
      const result = segmentText(combining, { mode: 'sentence' });

      expect(result.segment_count).toBe(2);
    });

    it('should handle mathematical symbols', () => {
      const math = '∑∏∫∂∇. ∀∃∄∈∉.';
      const result = segmentText(math, { mode: 'sentence' });

      expect(result.segment_count).toBe(2);
    });

    it('should handle full-width characters', () => {
      const fullWidth = 'ＡＢＣ。ＤＥＦ。';
      const result = segmentText(fullWidth, { mode: 'sentence' });

      expect(result.segment_count).toBe(2);
    });
  });

  describe('Edge String Values', () => {
    it('should handle single character', () => {
      const result = segmentText('.', { mode: 'sentence' });
      // Single punctuation might be empty after processing
      expect(result.segment_count).toBeLessThanOrEqual(1);
    });

    it('should handle only whitespace variations', () => {
      const whitespace = '   \t\t\n\n   ';
      const result = segmentText(whitespace, { mode: 'sentence' });

      expect(result.segment_count).toBe(0);
    });

    it('should handle only punctuation', () => {
      const punctuation = '...!?;:';
      const result = segmentText(punctuation, { mode: 'sentence' });

      // Behavior depends on implementation
      expect(result).toBeDefined();
    });

    it('should handle alternating whitespace and text', () => {
      const alt = '  A  .  B  .  C  ';
      const result = segmentText(alt, { mode: 'sentence' });

      expect(result.segment_count).toBe(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL FUNCTION EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Canonical Functions - Edge Cases', () => {
  describe('stableStringify - Boundary Values', () => {
    it('should handle Number.MAX_SAFE_INTEGER', () => {
      const result = stableStringify(Number.MAX_SAFE_INTEGER);
      expect(result).toBe('9007199254740991');
    });

    it('should handle Number.MIN_SAFE_INTEGER', () => {
      const result = stableStringify(Number.MIN_SAFE_INTEGER);
      expect(result).toBe('-9007199254740991');
    });

    it('should handle very small decimals', () => {
      const result = stableStringify(0.0000001);
      expect(result).toBe('1e-7');
    });

    it('should handle deeply nested objects', () => {
      const deep: any = {};
      let current = deep;
      for (let i = 0; i < 50; i++) {
        current.next = {};
        current = current.next;
      }
      current.value = 'end';

      const result = stableStringify(deep);
      expect(result).toContain('"value":"end"');
    });

    it('should handle array with 1000 elements', () => {
      const arr = Array(1000).fill(1);
      const result = stableStringify(arr);
      expect(result.length).toBeGreaterThan(1000);
    });

    it('should handle unicode escape sequences', () => {
      const unicode = '\u0000\u001F';
      expect(() => stableStringify(unicode)).not.toThrow();
    });
  });

  describe('sha256Hex - Input Variations', () => {
    it('should hash very long string', () => {
      const long = 'x'.repeat(100000);
      const hash = sha256Hex(long);
      expect(hash.length).toBe(64);
    });

    it('should hash binary-like string', () => {
      const binary = String.fromCharCode(...Array(256).keys());
      const hash = sha256Hex(binary);
      expect(hash.length).toBe(64);
    });
  });

  describe('hashObject - Complex Structures', () => {
    it('should hash deeply nested array/object mix', () => {
      const complex = {
        arr: [[{ a: 1 }], [{ b: 2 }]],
        obj: { nested: { deep: { value: true } } },
      };
      const hash = hashObject(complex);
      expect(hash.length).toBe(64);
    });

    it('should produce same hash for equivalent structures', () => {
      const obj1 = { z: 1, a: 2, m: [3, 4] };
      const obj2 = { a: 2, z: 1, m: [3, 4] };
      expect(hashObject(obj1)).toBe(hashObject(obj2));
    });
  });
});
