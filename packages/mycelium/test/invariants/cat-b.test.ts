/**
 * CAT-B: Encoding Validation Tests
 * Phase 29.2 - NASA-Grade L4
 *
 * Question: "L'encodage UTF-8 est-il strictement valide ?"
 *
 * Invariants couverts: INV-MYC-01, INV-MYC-07
 * Rejets associés: REJ-MYC-100, REJ-MYC-101, REJ-MYC-102, REJ-MYC-103, REJ-MYC-301
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  isAccepted,
  isRejected,
  REJECTION_CODES,
} from '../../src/index.js';

describe('CAT-B: Encoding Validation', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // B.1: Valid UTF-8 is ACCEPTED
  // ═══════════════════════════════════════════════════════════════════════════

  describe('B.1: Valid UTF-8', () => {
    it('B.1.1: accepts ASCII-only text', () => {
      const result = validate({ content: 'Hello World 123!@#' });
      expect(isAccepted(result)).toBe(true);
    });

    it('B.1.2: accepts text with accented characters', () => {
      const result = validate({ content: 'Café, résumé, naïve, über' });
      expect(isAccepted(result)).toBe(true);
    });

    it('B.1.3: accepts text with various scripts', () => {
      const result = validate({
        content: 'English 日本語 العربية 中文 한국어',
      });
      expect(isAccepted(result)).toBe(true);
    });

    it('B.1.4: accepts text with emoji (valid UTF-8 surrogates)', () => {
      const result = validate({ content: 'Hello 😀 World 🌍!' });
      expect(isAccepted(result)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B.2: BOM is REJECTED (REJ-MYC-103)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('B.2: BOM rejection', () => {
    it('B.2.1: rejects UTF-8 BOM at start', () => {
      // UTF-8 BOM: EF BB BF
      const bomContent = '\uFEFFHello World';
      const result = validate({ content: bomContent });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.UTF8_BOM);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B.3: Control characters are REJECTED (REJ-MYC-301)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('B.3: Control character rejection', () => {
    it('B.3.1: rejects NULL character (0x00)', () => {
      const result = validate({ content: 'Hello\x00World' });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        // NULL is detected as binary
        expect(result.rejection.code).toBe(REJECTION_CODES.FORMAT_BINARY);
      }
    });

    it('B.3.2: rejects BELL character (0x07)', () => {
      const result = validate({ content: 'Hello\x07World' });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.CONTROL_CHAR);
      }
    });

    it('B.3.3: rejects ESCAPE character (0x1B)', () => {
      const result = validate({ content: 'Hello\x1BWorld' });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.CONTROL_CHAR);
      }
    });

    it('B.3.4: accepts TAB character (0x09)', () => {
      const result = validate({ content: 'Hello\tWorld' });
      expect(isAccepted(result)).toBe(true);
    });

    it('B.3.5: accepts LF character (0x0A)', () => {
      const result = validate({ content: 'Hello\nWorld' });
      expect(isAccepted(result)).toBe(true);
    });

    it('B.3.6: accepts CR character (0x0D) - normalized to LF', () => {
      const result = validate({ content: 'Hello\rWorld' });
      expect(isAccepted(result)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B.4: Encoding category verification
  // ═══════════════════════════════════════════════════════════════════════════

  describe('B.4: Encoding category', () => {
    it('B.4.1: BOM rejection has Encoding category', () => {
      const result = validate({ content: '\uFEFFTest' });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.category).toBe('Encoding');
      }
    });

    it('B.4.2: Control char rejection has Content category', () => {
      const result = validate({ content: 'Test\x07' });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.category).toBe('Content');
      }
    });
  });
});
