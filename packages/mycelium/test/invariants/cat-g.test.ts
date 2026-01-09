/**
 * CAT-G: Metadata Isolation Tests
 * Phase 29.2 - NASA-Grade L4
 *
 * Question: "Les métadonnées affectent-elles le résultat de validation ?"
 *
 * Invariants couverts: INV-MYC-11
 * Rejets associés: None (testing isolation)
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  isAccepted,
} from '../../src/index.js';

describe('CAT-G: Metadata Isolation', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // G.1: Metadata doesn't affect content
  // ═══════════════════════════════════════════════════════════════════════════

  describe('G.1: Content independence', () => {
    it('G.1.1: same content with different sourceId produces same output', () => {
      const content = 'Test narrative content for analysis.';

      const resultA = validate({
        content,
        meta: { sourceId: 'source-A' },
      });

      const resultB = validate({
        content,
        meta: { sourceId: 'source-B' },
      });

      expect(isAccepted(resultA)).toBe(true);
      expect(isAccepted(resultB)).toBe(true);

      if (isAccepted(resultA) && isAccepted(resultB)) {
        expect(resultA.output.content).toBe(resultB.output.content);
      }
    });

    it('G.1.2: same content with different timestamp produces same output', () => {
      const content = 'Another test content.';

      const resultA = validate({
        content,
        meta: { timestamp: '2026-01-01T00:00:00Z' },
      });

      const resultB = validate({
        content,
        meta: { timestamp: '2026-12-31T23:59:59Z' },
      });

      expect(isAccepted(resultA)).toBe(true);
      expect(isAccepted(resultB)).toBe(true);

      if (isAccepted(resultA) && isAccepted(resultB)) {
        expect(resultA.output.content).toBe(resultB.output.content);
      }
    });

    it('G.1.3: same content with and without metadata produces same output', () => {
      const content = 'Content without metadata.';

      const resultWithMeta = validate({
        content,
        meta: { sourceId: 'test', timestamp: '2026-01-01T00:00:00Z' },
      });

      const resultWithoutMeta = validate({ content });

      expect(isAccepted(resultWithMeta)).toBe(true);
      expect(isAccepted(resultWithoutMeta)).toBe(true);

      if (isAccepted(resultWithMeta) && isAccepted(resultWithoutMeta)) {
        expect(resultWithMeta.output.content).toBe(resultWithoutMeta.output.content);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // G.2: Metadata doesn't affect validation decision
  // ═══════════════════════════════════════════════════════════════════════════

  describe('G.2: Validation decision independence', () => {
    it('G.2.1: valid content stays valid regardless of metadata', () => {
      const content = 'Valid narrative text.';

      for (let i = 0; i < 10; i++) {
        const result = validate({
          content,
          meta: { sourceId: `source-${i}`, timestamp: new Date().toISOString() },
        });
        expect(isAccepted(result)).toBe(true);
      }
    });

    it('G.2.2: metadata doesn\'t change seed', () => {
      const content = 'Test content';
      const seed = 12345;

      const resultA = validate({
        content,
        seed,
        meta: { sourceId: 'A' },
      });

      const resultB = validate({
        content,
        seed,
        meta: { sourceId: 'B' },
      });

      expect(isAccepted(resultA)).toBe(true);
      expect(isAccepted(resultB)).toBe(true);

      if (isAccepted(resultA) && isAccepted(resultB)) {
        expect(resultA.output.seed).toBe(resultB.output.seed);
        expect(resultA.output.seed).toBe(seed);
      }
    });

    it('G.2.3: metadata doesn\'t change mode', () => {
      const content = 'Test content';

      const resultA = validate({
        content,
        mode: 'sentence',
        meta: { sourceId: 'A' },
      });

      const resultB = validate({
        content,
        mode: 'sentence',
        meta: { sourceId: 'B' },
      });

      expect(isAccepted(resultA)).toBe(true);
      expect(isAccepted(resultB)).toBe(true);

      if (isAccepted(resultA) && isAccepted(resultB)) {
        expect(resultA.output.mode).toBe(resultB.output.mode);
        expect(resultA.output.mode).toBe('sentence');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // G.3: Metadata passthrough
  // ═══════════════════════════════════════════════════════════════════════════

  describe('G.3: Metadata passthrough', () => {
    it('G.3.1: sourceId is passed through', () => {
      const result = validate({
        content: 'Test',
        meta: { sourceId: 'my-source-123' },
      });

      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.meta?.sourceId).toBe('my-source-123');
      }
    });

    it('G.3.2: processedAt is added by Mycelium', () => {
      const result = validate({
        content: 'Test',
        meta: { sourceId: 'test' },
      });

      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.meta?.processedAt).toBeDefined();
        // Verify it's a valid ISO8601 timestamp
        const date = new Date(result.output.meta!.processedAt);
        expect(date.getTime()).not.toBeNaN();
      }
    });

    it('G.3.3: myceliumVersion is added', () => {
      const result = validate({
        content: 'Test',
        meta: { sourceId: 'test' },
      });

      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.meta?.myceliumVersion).toBeDefined();
        expect(result.output.meta?.myceliumVersion).toBe('1.0.0');
      }
    });

    it('G.3.4: no meta in input means no meta in output', () => {
      const result = validate({ content: 'Test without meta' });

      expect(isAccepted(result)).toBe(true);
      if (isAccepted(result)) {
        expect(result.output.meta).toBeUndefined();
      }
    });
  });
});
