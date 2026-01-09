/**
 * CAT-D: Deterministic Rejection Tests
 * Phase 29.2 - NASA-Grade L4
 *
 * Question: "Le même input invalide produit-il toujours le même rejet ?"
 *
 * Invariants couverts: INV-MYC-08, INV-MYC-10
 * Rejets associés: All REJ-MYC-*
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  isRejected,
  REJECTION_CODES,
} from '../../src/index.js';

describe('CAT-D: Deterministic Rejection', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // D.1: Same invalid input produces same rejection code
  // ═══════════════════════════════════════════════════════════════════════════

  describe('D.1: Rejection code consistency', () => {
    it('D.1.1: empty input always produces REJ-MYC-300', () => {
      const codes: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = validate({ content: '' });
        if (isRejected(result)) {
          codes.push(result.rejection.code);
        }
      }
      expect(codes.length).toBe(100);
      expect(new Set(codes).size).toBe(1);
      expect(codes[0]).toBe(REJECTION_CODES.EMPTY_INPUT);
    });

    it('D.1.2: HTML input always produces REJ-MYC-003', () => {
      const htmlContent = '<!DOCTYPE html><html><body>Test</body></html>';
      const codes: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = validate({ content: htmlContent });
        if (isRejected(result)) {
          codes.push(result.rejection.code);
        }
      }
      expect(codes.length).toBe(100);
      expect(new Set(codes).size).toBe(1);
      expect(codes[0]).toBe(REJECTION_CODES.FORMAT_HTML);
    });

    it('D.1.3: JSON input always produces REJ-MYC-004', () => {
      const jsonContent = '{"key": "value"}';
      const codes: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = validate({ content: jsonContent });
        if (isRejected(result)) {
          codes.push(result.rejection.code);
        }
      }
      expect(codes.length).toBe(100);
      expect(new Set(codes).size).toBe(1);
      expect(codes[0]).toBe(REJECTION_CODES.FORMAT_JSON);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D.2: Rejection message consistency
  // ═══════════════════════════════════════════════════════════════════════════

  describe('D.2: Rejection message consistency', () => {
    it('D.2.1: same input produces identical messages', () => {
      const invalidContent = '<?xml version="1.0"?>';
      const messages: string[] = [];
      for (let i = 0; i < 50; i++) {
        const result = validate({ content: invalidContent });
        if (isRejected(result)) {
          messages.push(result.rejection.message);
        }
      }
      expect(messages.length).toBe(50);
      expect(new Set(messages).size).toBe(1);
    });

    it('D.2.2: rejection category is consistent', () => {
      const categories: string[] = [];
      for (let i = 0; i < 50; i++) {
        const result = validate({ content: '\x07bell' });
        if (isRejected(result)) {
          categories.push(result.rejection.category);
        }
      }
      expect(categories.length).toBe(50);
      expect(new Set(categories).size).toBe(1);
      expect(categories[0]).toBe('Content');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D.3: Parameter rejection determinism
  // ═══════════════════════════════════════════════════════════════════════════

  describe('D.3: Parameter rejection determinism', () => {
    it('D.3.1: NaN seed always rejected with same code', () => {
      const codes: string[] = [];
      for (let i = 0; i < 50; i++) {
        const result = validate({ content: 'Valid', seed: NaN });
        if (isRejected(result)) {
          codes.push(result.rejection.code);
        }
      }
      expect(codes.length).toBe(50);
      expect(new Set(codes).size).toBe(1);
      expect(codes[0]).toBe(REJECTION_CODES.INVALID_SEED);
    });

    it('D.3.2: invalid mode always rejected with same code', () => {
      const codes: string[] = [];
      for (let i = 0; i < 50; i++) {
        const result = validate({
          content: 'Valid',
          mode: 'invalid' as 'paragraph',
        });
        if (isRejected(result)) {
          codes.push(result.rejection.code);
        }
      }
      expect(codes.length).toBe(50);
      expect(new Set(codes).size).toBe(1);
      expect(codes[0]).toBe(REJECTION_CODES.INVALID_MODE);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D.4: Rejection is terminal (INV-MYC-10)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('D.4: Rejection terminality', () => {
    it('D.4.1: rejected result never has output', () => {
      for (let i = 0; i < 50; i++) {
        const result = validate({ content: '' });
        expect(isRejected(result)).toBe(true);
        expect('output' in result).toBe(false);
      }
    });

    it('D.4.2: rejection always has required fields', () => {
      const result = validate({ content: '%PDF-1.4' });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection).toHaveProperty('code');
        expect(result.rejection).toHaveProperty('category');
        expect(result.rejection).toHaveProperty('message');
        expect(result.rejection).toHaveProperty('timestamp');
      }
    });
  });
});
