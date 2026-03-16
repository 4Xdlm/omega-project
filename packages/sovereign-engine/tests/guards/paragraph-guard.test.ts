/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — PARAGRAPH GUARD TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * V4.2 — Tests for runtime paragraph compliance guard.
 * Invariants tested:
 *   INV-PG-01: countParagraphs uses same regex as tension_14d scorer
 *   INV-PG-02: prose with >= 4 paragraphs passes through unchanged
 *   INV-PG-03: prose with < 4 paragraphs triggers retry
 *   INV-PG-04: max 1 retry attempt
 *   INV-PG-05: failed retry returns original prose
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';
import { countParagraphs, ensureParagraphCompliance } from '../../src/guards/paragraph-guard.js';
import type { SovereignProvider } from '../../src/types.js';

// ── INV-PG-01: countParagraphs uses same split as tension_14d ────────────────

describe('countParagraphs', () => {
  it('counts 4 paragraphs separated by double newlines', () => {
    const prose = 'Para 1.\n\nPara 2.\n\nPara 3.\n\nPara 4.';
    expect(countParagraphs(prose)).toBe(4);
  });

  it('counts 2 paragraphs (the problematic case)', () => {
    const prose = 'Big block one with lots of text.\n\nBig block two with lots of text.';
    expect(countParagraphs(prose)).toBe(2);
  });

  it('counts 1 paragraph (no double newlines)', () => {
    const prose = 'One continuous block of prose with no paragraph breaks at all.';
    expect(countParagraphs(prose)).toBe(1);
  });

  it('ignores empty paragraphs (whitespace-only between breaks)', () => {
    const prose = 'Para 1.\n\n   \n\nPara 2.\n\nPara 3.\n\nPara 4.';
    // Split produces: ['Para 1.', '   ', 'Para 2.', 'Para 3.', 'Para 4.']
    // Filter trims '   ' → length > 0 is true → counts as 5? No...
    // Actually '   '.trim().length === 0, so it's filtered out → 4
    expect(countParagraphs(prose)).toBe(4);
  });

  it('handles trailing/leading newlines', () => {
    const prose = '\n\nPara 1.\n\nPara 2.\n\nPara 3.\n\nPara 4.\n\n';
    expect(countParagraphs(prose)).toBe(4);
  });

  it('counts 6 paragraphs (more than minimum is fine)', () => {
    const prose = 'P1.\n\nP2.\n\nP3.\n\nP4.\n\nP5.\n\nP6.';
    expect(countParagraphs(prose)).toBe(6);
  });
});

// ── Mock provider ────────────────────────────────────────────────────────────

function createMockProvider(reformattedProse: string): SovereignProvider {
  return {
    generateDraft: vi.fn().mockResolvedValue(reformattedProse),
    generateStructuredJSON: vi.fn(),
    judgeTextQuality: vi.fn(),
  } as unknown as SovereignProvider;
}

// ── INV-PG-02: >= 4 paragraphs passes through unchanged ─────────────────────

describe('ensureParagraphCompliance — pass-through', () => {
  it('returns prose unchanged when >= 4 paragraphs', async () => {
    const prose = 'P1.\n\nP2.\n\nP3.\n\nP4.';
    const provider = createMockProvider('should not be called');

    const result = await ensureParagraphCompliance(prose, provider);

    expect(result.original_count).toBe(4);
    expect(result.final_count).toBe(4);
    expect(result.retried).toBe(false);
    expect(result.prose).toBe(prose);
    expect(provider.generateDraft).not.toHaveBeenCalled();
  });

  it('returns prose unchanged when > 4 paragraphs', async () => {
    const prose = 'P1.\n\nP2.\n\nP3.\n\nP4.\n\nP5.';
    const provider = createMockProvider('should not be called');

    const result = await ensureParagraphCompliance(prose, provider);

    expect(result.original_count).toBe(5);
    expect(result.retried).toBe(false);
    expect(provider.generateDraft).not.toHaveBeenCalled();
  });
});

// ── INV-PG-03: < 4 paragraphs triggers retry ────────────────────────────────

describe('ensureParagraphCompliance — retry', () => {
  it('retries and succeeds when LLM reformats to 4 paragraphs', async () => {
    const original = 'Block one.\n\nBlock two.';
    const reformatted = 'P1 reformatted.\n\nP2 reformatted.\n\nP3 reformatted.\n\nP4 reformatted.';
    const provider = createMockProvider(reformatted);

    const result = await ensureParagraphCompliance(original, provider);

    expect(result.original_count).toBe(2);
    expect(result.final_count).toBe(4);
    expect(result.retried).toBe(true);
    expect(result.retry_success).toBe(true);
    expect(result.prose).toBe(reformatted);
    expect(provider.generateDraft).toHaveBeenCalledTimes(1);
  });

  it('retries with correct language (fr)', async () => {
    const original = 'Un seul bloc.';
    const reformatted = 'P1.\n\nP2.\n\nP3.\n\nP4.';
    const provider = createMockProvider(reformatted);

    await ensureParagraphCompliance(original, provider, 'fr');

    const call = (provider.generateDraft as any).mock.calls[0];
    expect(call[0]).toContain('Reformate ce texte');
    expect(call[0]).toContain('EXACTEMENT 4 paragraphes');
  });

  it('retries with correct language (en)', async () => {
    const original = 'One single block.';
    const reformatted = 'P1.\n\nP2.\n\nP3.\n\nP4.';
    const provider = createMockProvider(reformatted);

    await ensureParagraphCompliance(original, provider, 'en');

    const call = (provider.generateDraft as any).mock.calls[0];
    expect(call[0]).toContain('Reformat this text');
    expect(call[0]).toContain('EXACTLY 4 paragraphs');
  });
});

// ── INV-PG-04: max 1 retry attempt ──────────────────────────────────────────

describe('ensureParagraphCompliance — max retries', () => {
  it('calls provider exactly once on retry (MAX_RETRIES=1)', async () => {
    const original = 'One block only.';
    const stillBad = 'Still one block only.';
    const provider = createMockProvider(stillBad);

    await ensureParagraphCompliance(original, provider);

    expect(provider.generateDraft).toHaveBeenCalledTimes(1);
  });
});

// ── INV-PG-05: failed retry returns original prose ───────────────────────────

describe('ensureParagraphCompliance — failure', () => {
  it('returns original prose when retry still has < 4 paragraphs', async () => {
    const original = 'Block A.\n\nBlock B.';
    const stillBad = 'Still block A.\n\nStill block B.';
    const provider = createMockProvider(stillBad);

    const result = await ensureParagraphCompliance(original, provider);

    expect(result.original_count).toBe(2);
    expect(result.final_count).toBe(2);
    expect(result.retried).toBe(true);
    expect(result.retry_success).toBe(false);
    expect(result.prose).toBe(original); // ORIGINAL, not the failed reformat
  });

  it('returns original prose when provider throws', async () => {
    const original = 'Block A.\n\nBlock B.';
    const provider = {
      generateDraft: vi.fn().mockRejectedValue(new Error('API error')),
      generateStructuredJSON: vi.fn(),
      judgeTextQuality: vi.fn(),
    } as unknown as SovereignProvider;

    const result = await ensureParagraphCompliance(original, provider);

    expect(result.original_count).toBe(2);
    expect(result.retried).toBe(true);
    expect(result.retry_success).toBe(false);
    expect(result.prose).toBe(original);
  });
});
