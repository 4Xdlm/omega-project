/**
 * CAT-A: Contract Conformance Tests
 * Phase 29.2 - NASA-Grade L4
 *
 * Question: "L'entrée respecte-t-elle le contrat DNA_INPUT_CONTRACT ?"
 *
 * Invariants couverts: INV-MYC-03, INV-MYC-10
 * Rejets associés: REJ-MYC-001 à 008, REJ-MYC-400, REJ-MYC-401
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  isAccepted,
  isRejected,
  REJECTION_CODES,
} from '../../src/index.js';

describe('CAT-A: Contract Conformance', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // A.1: Valid contract-compliant inputs are ACCEPTED
  // ═══════════════════════════════════════════════════════════════════════════

  describe('A.1: Contract-compliant inputs', () => {
    it('A.1.1: accepts valid plain text UTF-8', () => {
      const result = validate({ content: 'Hello, world!' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('Hello, world!');
      }
    });

    it('A.1.2: accepts text with valid UTF-8 characters', () => {
      const result = validate({ content: 'Bonjour le monde! Émotions et café.' });
      expect(isAccepted(result)).toBe(true);
    });

    it('A.1.3: accepts multi-line text', () => {
      const content = 'Line one.\nLine two.\nLine three.';
      const result = validate({ content });
      expect(isAccepted(result)).toBe(true);
    });

    it('A.1.4: accepts text with valid optional parameters', () => {
      const result = validate({
        content: 'Test content',
        seed: 12345,
        mode: 'sentence',
      });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.seed).toBe(12345);
        expect(result.output.mode).toBe('sentence');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A.2: Format violations are REJECTED
  // ═══════════════════════════════════════════════════════════════════════════

  describe('A.2: Format violations', () => {
    it('A.2.1: rejects PDF content', () => {
      // PDF magic bytes: %PDF
      const pdfContent = '%PDF-1.4 fake pdf content';
      const result = validate({ content: pdfContent });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.FORMAT_PDF);
      }
    });

    it('A.2.2: rejects HTML content', () => {
      const htmlContent = '<!DOCTYPE html><html><body>Test</body></html>';
      const result = validate({ content: htmlContent });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.FORMAT_HTML);
      }
    });

    it('A.2.3: rejects JSON content', () => {
      const jsonContent = '{"key": "value", "array": [1, 2, 3]}';
      const result = validate({ content: jsonContent });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.FORMAT_JSON);
      }
    });

    it('A.2.4: rejects XML content', () => {
      const xmlContent = '<?xml version="1.0"?><root><item>Test</item></root>';
      const result = validate({ content: xmlContent });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.FORMAT_XML);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A.3: Parameter violations are REJECTED (INV-MYC-03)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('A.3: Parameter violations', () => {
    it('A.3.1: rejects NaN seed', () => {
      const result = validate({ content: 'Valid text', seed: NaN });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.INVALID_SEED);
      }
    });

    it('A.3.2: rejects Infinity seed', () => {
      const result = validate({ content: 'Valid text', seed: Infinity });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.INVALID_SEED);
      }
    });

    it('A.3.3: rejects invalid mode', () => {
      const result = validate({
        content: 'Valid text',
        mode: 'invalid' as 'paragraph',
      });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection.code).toBe(REJECTION_CODES.INVALID_MODE);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // A.4: Rejection is terminal (INV-MYC-10)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('A.4: Rejection terminality', () => {
    it('A.4.1: rejected result has no output field', () => {
      const result = validate({ content: '' });
      expect(isRejected(result)).toBe(true);
      expect('output' in result).toBe(false);
    });

    it('A.4.2: rejection includes proper structure', () => {
      const result = validate({ content: '<?xml version="1.0"?>' });
      expect(isRejected(result)).toBe(true);
      if (isRejected(result)) {
        expect(result.rejection).toHaveProperty('code');
        expect(result.rejection).toHaveProperty('category');
        expect(result.rejection).toHaveProperty('message');
        expect(result.rejection).toHaveProperty('timestamp');
      }
    });

    it('A.4.3: acceptance includes proper output', () => {
      const result = validate({ content: 'Valid narrative text' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output).toHaveProperty('content');
        expect(result.output).toHaveProperty('seed');
        expect(result.output).toHaveProperty('mode');
      }
    });
  });
});
