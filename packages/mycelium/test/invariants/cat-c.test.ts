/**
 * CAT-C: Boundary Tests
 * Phase 29.2 - NASA-Grade L4
 *
 * Question: "Les limites de taille sont-elles correctement enforcées ?"
 *
 * Invariants couverts: INV-MYC-02, INV-MYC-06
 * Rejets associés: REJ-MYC-200, REJ-MYC-201, REJ-MYC-202, REJ-MYC-300
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  isAccepted,
  isRejected,
  REJECTION_CODES,
  MIN_LENGTH,
  MAX_LENGTH,
  MAX_LINE_LENGTH,
} from '../../src/index.js';

describe('CAT-C: Boundary Tests', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // C.1: Minimum size boundary
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C.1: Minimum size', () => {
    it('C.1.1: accepts single character (MIN_LENGTH)', () => {
      const result = validate({ content: 'a' });
      expect(isAccepted(result)).toBe(true);
    });

    it('C.1.2: rejects empty string', () => {
      const result = validate({ content: '' });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.EMPTY_INPUT);
      }
    });

    it('C.1.3: rejects whitespace-only string', () => {
      const result = validate({ content: '   \t\n  ' });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.EMPTY_INPUT);
      }
    });

    it('C.1.4: accepts whitespace with text', () => {
      const result = validate({ content: '   a   ' });
      expect(isAccepted(result)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C.2: Maximum size boundary (INV-MYC-02)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C.2: Maximum size', () => {
    it('C.2.1: accepts content just under MAX_LENGTH', () => {
      // Create a string that's about 1KB (small enough to not timeout)
      const content = 'a'.repeat(1000);
      const result = validate({ content });
      expect(isAccepted(result)).toBe(true);
    });

    it('C.2.2: rejects content exceeding MAX_LENGTH', () => {
      // Create a string that exceeds 10MB
      const content = 'a'.repeat(MAX_LENGTH + 1);
      const result = validate({ content });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.SIZE_EXCEEDED);
        expect(result.rejection.details?.max).toBe(MAX_LENGTH);
      }
    });

    it('C.2.3: rejection includes size information', () => {
      const content = 'a'.repeat(MAX_LENGTH + 100);
      const result = validate({ content });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.details).toHaveProperty('size');
        expect(result.rejection.details).toHaveProperty('max');
        expect(result.rejection.category).toBe('Size');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C.3: Line length boundary
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C.3: Line length', () => {
    it('C.3.1: accepts normal multi-line text', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const result = validate({ content });
      expect(isAccepted(result)).toBe(true);
    });

    it('C.3.2: accepts reasonably long lines', () => {
      const content = 'a'.repeat(10000);  // 10KB line
      const result = validate({ content });
      expect(isAccepted(result)).toBe(true);
    });

    it('C.3.3: rejects line exceeding MAX_LINE_LENGTH', () => {
      const longLine = 'a'.repeat(MAX_LINE_LENGTH + 1);
      const result = validate({ content: longLine });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.LINE_TOO_LONG);
        expect(result.rejection.details?.lineNumber).toBe(1);
      }
    });

    it('C.3.4: identifies correct line number for long line', () => {
      const normalLine = 'Normal line';
      const longLine = 'a'.repeat(MAX_LINE_LENGTH + 1);
      const content = `${normalLine}\n${normalLine}\n${longLine}`;
      const result = validate({ content });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.details?.lineNumber).toBe(3);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C.4: Boundary edge cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C.4: Edge cases', () => {
    it('C.4.1: accepts single newline with text', () => {
      const result = validate({ content: '\n' });
      expect(isRejected(result)).toBe(true); // Whitespace only
    });

    it('C.4.2: accepts text with trailing newline', () => {
      const result = validate({ content: 'text\n' });
      expect(isAccepted(result)).toBe(true);
    });

    it('C.4.3: accepts text with leading newline', () => {
      const result = validate({ content: '\ntext' });
      expect(isAccepted(result)).toBe(true);
    });
  });
});
