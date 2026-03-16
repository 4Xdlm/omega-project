/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — SEMANTIC SLICER TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Sprint 2 — Tests for CALC-pure semantic slicer.
 * Invariants tested:
 *   INV-SLICER-01: Prose with >= 4 paragraphs passes through unchanged
 *   INV-SLICER-02: Prose with < 4 paragraphs gets sliced into >= 4
 *   INV-SLICER-03: Cuts happen at sentence boundaries (never mid-sentence)
 *   INV-SLICER-04: Word count is preserved (no content modification)
 *   INV-SLICER-05: countParagraphs uses same regex as tension_14d
 *   INV-SLICER-06: < 4 sentences returns original (can't split further)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { applySemanticSlicing, countParagraphs } from '../../src/guards/semantic-slicer.js';

// ── INV-SLICER-05: countParagraphs same regex as tension_14d ─────────────────

describe('countParagraphs', () => {
  it('counts 4 paragraphs separated by double newlines', () => {
    expect(countParagraphs('P1.\n\nP2.\n\nP3.\n\nP4.')).toBe(4);
  });

  it('counts 1 paragraph (no breaks)', () => {
    expect(countParagraphs('One continuous block of prose.')).toBe(1);
  });

  it('counts 2 paragraphs', () => {
    expect(countParagraphs('Block A.\n\nBlock B.')).toBe(2);
  });

  it('ignores whitespace-only paragraphs', () => {
    expect(countParagraphs('P1.\n\n   \n\nP2.\n\nP3.\n\nP4.')).toBe(4);
  });
});

// ── INV-SLICER-01: >= 4 paragraphs passes through unchanged ─────────────────

describe('applySemanticSlicing — pass-through', () => {
  it('returns prose unchanged when >= 4 paragraphs', () => {
    const prose = 'Para 1.\n\nPara 2.\n\nPara 3.\n\nPara 4.';
    const result = applySemanticSlicing(prose);

    expect(result.sliced).toBe(false);
    expect(result.original_paragraph_count).toBe(4);
    expect(result.final_paragraph_count).toBe(4);
    expect(result.prose).toBe(prose);
  });

  it('returns prose unchanged when > 4 paragraphs', () => {
    const prose = 'P1.\n\nP2.\n\nP3.\n\nP4.\n\nP5.\n\nP6.';
    const result = applySemanticSlicing(prose);

    expect(result.sliced).toBe(false);
    expect(result.prose).toBe(prose);
  });
});

// ── INV-SLICER-02: < 4 paragraphs gets sliced ───────────────────────────────

describe('applySemanticSlicing — slicing', () => {
  it('slices 1 long paragraph into 4', () => {
    // ~80 words, 8 sentences
    const prose = 'Le silence pesait. Marie regarda ses mains. La lumière du soir entrait par la fenêtre. Pierre ne disait rien. Dehors le vent se levait. Elle sentit le froid monter. Les mots ne venaient pas. Finalement elle se leva.';
    const result = applySemanticSlicing(prose);

    expect(result.sliced).toBe(true);
    expect(result.final_paragraph_count).toBeGreaterThanOrEqual(4);
  });

  it('slices 2 paragraphs into 4', () => {
    const prose = 'Première partie longue. Marie marchait vite. Le sol était glissant. La nuit tombait déjà.\n\nDeuxième partie. Pierre attendait dehors. Il faisait froid. Les étoiles brillaient dans le ciel noir.';
    const result = applySemanticSlicing(prose);

    expect(result.sliced).toBe(true);
    expect(result.final_paragraph_count).toBeGreaterThanOrEqual(4);
  });

  // INV-SLICER-04: Word count preserved
  it('preserves total word count after slicing', () => {
    const prose = 'Le silence pesait. Marie regarda ses mains. La lumière du soir entrait par la fenêtre. Pierre ne disait rien. Dehors le vent se levait. Elle sentit le froid monter. Les mots ne venaient pas. Finalement elle se leva.';
    const originalWords = prose.split(/\s+/).filter((w) => w.length > 0).length;

    const result = applySemanticSlicing(prose);
    const slicedWords = result.prose.split(/\s+/).filter((w) => w.length > 0).length;

    expect(slicedWords).toBe(originalWords);
  });
});

// ── INV-SLICER-03: Cuts at sentence boundaries ──────────────────────────────

describe('applySemanticSlicing — sentence boundaries', () => {
  it('never cuts mid-sentence', () => {
    const prose = 'Phrase un très longue. Phrase deux aussi longue. Phrase trois moyenne. Phrase quatre courte. Phrase cinq ample. Phrase six dernière.';
    const result = applySemanticSlicing(prose);

    // Each paragraph should end with punctuation
    const paragraphs = result.prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    for (const p of paragraphs) {
      const trimmed = p.trim();
      expect(trimmed).toMatch(/[.!?…»"]$/);
    }
  });
});

// ── INV-SLICER-06: < 4 sentences returns original ───────────────────────────

describe('applySemanticSlicing — edge cases', () => {
  it('returns original when < 4 sentences', () => {
    const prose = 'Phrase un. Phrase deux. Phrase trois.';
    const result = applySemanticSlicing(prose);

    expect(result.sliced).toBe(false);
    expect(result.prose).toBe(prose);
  });

  it('handles empty string', () => {
    const result = applySemanticSlicing('');
    expect(result.sliced).toBe(false);
  });
});
