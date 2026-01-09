/**
 * CAT-F: Non-Alteration Tests
 * Phase 29.2 - NASA-Grade L4
 *
 * Question: "Mycelium modifie-t-il silencieusement le contenu ?"
 *
 * Invariants couverts: INV-MYC-09, INV-MYC-04
 * Rejets associés: None (testing transformations)
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  isAccepted,
} from '../../src/index.js';

describe('CAT-F: Non-Alteration', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // F.1: Leading/trailing whitespace preservation (INV-MYC-09)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('F.1: Whitespace preservation', () => {
    it('F.1.1: leading spaces preserved', () => {
      const result = validate({ content: '   text' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('   text');
      }
    });

    it('F.1.2: trailing spaces preserved', () => {
      const result = validate({ content: 'text   ' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('text   ');
      }
    });

    it('F.1.3: both leading and trailing spaces preserved', () => {
      const result = validate({ content: '  text  ' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('  text  ');
      }
    });

    it('F.1.4: internal spaces preserved', () => {
      const result = validate({ content: 'word1    word2' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('word1    word2');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // F.2: Line ending normalization is documented (INV-MYC-04)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('F.2: Line ending normalization', () => {
    it('F.2.1: CRLF normalized to LF (documented change)', () => {
      const result = validate({ content: 'line\r\ntext' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('line\ntext');
      }
    });

    it('F.2.2: CR normalized to LF (documented change)', () => {
      const result = validate({ content: 'line\rtext' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('line\ntext');
      }
    });

    it('F.2.3: LF unchanged', () => {
      const result = validate({ content: 'line\ntext' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('line\ntext');
      }
    });

    it('F.2.4: mixed line endings all normalized', () => {
      const result = validate({ content: 'a\r\nb\rc\nd' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('a\nb\nc\nd');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // F.3: Content integrity
  // ═══════════════════════════════════════════════════════════════════════════

  describe('F.3: Content integrity', () => {
    it('F.3.1: text content unchanged', () => {
      const originalContent = 'The quick brown fox jumps over the lazy dog.';
      const result = validate({ content: originalContent });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe(originalContent);
      }
    });

    it('F.3.2: unicode content unchanged', () => {
      const originalContent = 'Émotions, café, naïve, über, 日本語';
      const result = validate({ content: originalContent });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe(originalContent);
      }
    });

    it('F.3.3: tabs preserved', () => {
      const result = validate({ content: 'col1\tcol2\tcol3' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('col1\tcol2\tcol3');
      }
    });

    it('F.3.4: multiple newlines preserved', () => {
      const result = validate({ content: 'para1\n\n\npara2' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('para1\n\n\npara2');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // F.4: No trim or strip operations
  // ═══════════════════════════════════════════════════════════════════════════

  describe('F.4: No trim/strip', () => {
    it('F.4.1: trailing newlines preserved', () => {
      const result = validate({ content: 'text\n\n\n' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('text\n\n\n');
      }
    });

    it('F.4.2: leading newlines preserved', () => {
      const result = validate({ content: '\n\n\ntext' });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe('\n\n\ntext');
      }
    });

    it('F.4.3: combined preservations work correctly', () => {
      const input = '  \n  text  \n  ';
      const result = validate({ content: input });
      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.content).toBe(input);
      }
    });
  });
});
