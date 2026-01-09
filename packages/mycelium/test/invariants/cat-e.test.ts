/**
 * CAT-E: Accept Stability Tests
 * Phase 29.2 - NASA-Grade L4
 *
 * Question: "Le même input valide produit-il toujours le même output ?"
 *
 * Invariants couverts: INV-MYC-08, INV-MYC-04
 * Rejets associés: None (testing ACCEPT path)
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  isAccepted,
} from '../../src/index.js';

describe('CAT-E: Accept Stability', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // E.1: Content stability
  // ═══════════════════════════════════════════════════════════════════════════

  describe('E.1: Content stability', () => {
    it('E.1.1: same input produces identical content', () => {
      const input = { content: 'Hello World!' };
      const outputs: string[] = [];

      for (let i = 0; i < 100; i++) {
        const result = validate(input);
        if (isAccepted(result)) {
          outputs.push(result.output.content);
        }
      }

      expect(outputs.length).toBe(100);
      expect(new Set(outputs).size).toBe(1);
      expect(outputs[0]).toBe('Hello World!');
    });

    it('E.1.2: complex text produces stable output', () => {
      const input = {
        content: 'Line 1: Émotions\nLine 2: 日本語\nLine 3: End',
      };
      const outputs: string[] = [];

      for (let i = 0; i < 100; i++) {
        const result = validate(input);
        if (isAccepted(result)) {
          outputs.push(result.output.content);
        }
      }

      expect(outputs.length).toBe(100);
      expect(new Set(outputs).size).toBe(1);
    });

    it('E.1.3: large text produces stable output', () => {
      const input = { content: 'a'.repeat(10000) };
      const outputs: string[] = [];

      for (let i = 0; i < 50; i++) {
        const result = validate(input);
        if (isAccepted(result)) {
          outputs.push(result.output.content);
        }
      }

      expect(outputs.length).toBe(50);
      expect(new Set(outputs).size).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E.2: Seed stability
  // ═══════════════════════════════════════════════════════════════════════════

  describe('E.2: Seed stability', () => {
    it('E.2.1: default seed is consistent', () => {
      const input = { content: 'Test' };
      const seeds: number[] = [];

      for (let i = 0; i < 100; i++) {
        const result = validate(input);
        if (isAccepted(result)) {
          seeds.push(result.output.seed);
        }
      }

      expect(seeds.length).toBe(100);
      expect(new Set(seeds).size).toBe(1);
      expect(seeds[0]).toBe(42); // DEFAULT_SEED
    });

    it('E.2.2: custom seed is preserved', () => {
      const input = { content: 'Test', seed: 12345 };
      const seeds: number[] = [];

      for (let i = 0; i < 100; i++) {
        const result = validate(input);
        if (isAccepted(result)) {
          seeds.push(result.output.seed);
        }
      }

      expect(seeds.length).toBe(100);
      expect(new Set(seeds).size).toBe(1);
      expect(seeds[0]).toBe(12345);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E.3: Mode stability
  // ═══════════════════════════════════════════════════════════════════════════

  describe('E.3: Mode stability', () => {
    it('E.3.1: default mode is consistent', () => {
      const input = { content: 'Test' };
      const modes: string[] = [];

      for (let i = 0; i < 100; i++) {
        const result = validate(input);
        if (isAccepted(result)) {
          modes.push(result.output.mode);
        }
      }

      expect(modes.length).toBe(100);
      expect(new Set(modes).size).toBe(1);
      expect(modes[0]).toBe('paragraph'); // DEFAULT_MODE
    });

    it('E.3.2: custom mode is preserved', () => {
      const input = { content: 'Test', mode: 'sentence' as const };
      const modes: string[] = [];

      for (let i = 0; i < 100; i++) {
        const result = validate(input);
        if (isAccepted(result)) {
          modes.push(result.output.mode);
        }
      }

      expect(modes.length).toBe(100);
      expect(new Set(modes).size).toBe(1);
      expect(modes[0]).toBe('sentence');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E.4: Line ending normalization stability (INV-MYC-04)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('E.4: Normalization stability', () => {
    it('E.4.1: CRLF consistently normalized to LF', () => {
      const input = { content: 'Line1\r\nLine2\r\nLine3' };
      const outputs: string[] = [];

      for (let i = 0; i < 100; i++) {
        const result = validate(input);
        if (isAccepted(result)) {
          outputs.push(result.output.content);
        }
      }

      expect(outputs.length).toBe(100);
      expect(new Set(outputs).size).toBe(1);
      expect(outputs[0]).toBe('Line1\nLine2\nLine3');
    });

    it('E.4.2: CR consistently normalized to LF', () => {
      const input = { content: 'Line1\rLine2\rLine3' };
      const outputs: string[] = [];

      for (let i = 0; i < 100; i++) {
        const result = validate(input);
        if (isAccepted(result)) {
          outputs.push(result.output.content);
        }
      }

      expect(outputs.length).toBe(100);
      expect(new Set(outputs).size).toBe(1);
      expect(outputs[0]).toBe('Line1\nLine2\nLine3');
    });
  });
});
