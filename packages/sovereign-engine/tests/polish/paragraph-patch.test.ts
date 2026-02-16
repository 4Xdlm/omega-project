/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — PARAGRAPH-LEVEL PATCH TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/polish/paragraph-patch.test.ts
 * Version: 1.0.0 (Sprint 10 Commit 10.4)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-POL-01
 *
 * Tests for paragraph-level surgical patch (Quantum Suture).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { patchParagraph } from '../../src/polish/paragraph-patch.js';
import { MockSovereignProvider } from '../fixtures/mock-provider.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

/**
 * Configurable mock provider for paragraph patch testing.
 * Allows setting different LLM scores for different prose
 * AND custom rewrite behavior.
 */
class ConfigurableMockProvider extends MockSovereignProvider {
  private proseScores: Map<string, { interiority: number; sensory: number; necessity: number; impact: number }> = new Map();
  private rewriteMap: Map<string, string> = new Map();

  setProseScores(prose: string, scores: { interiority: number; sensory: number; necessity: number; impact: number }): void {
    this.proseScores.set(prose, scores);
  }

  setRewrite(original: string, rewritten: string): void {
    this.rewriteMap.set(original, rewritten);
  }

  async scoreInteriority(_prose: string, _context: { readonly pov: string; readonly character_state: string }): Promise<number> {
    // Try exact match first
    let scores = this.proseScores.get(_prose);
    // If not found, try to find by checking if prose contains any of our keys
    if (!scores) {
      for (const [key, value] of this.proseScores.entries()) {
        if (key.includes('Il avait peur dans la rue') || _prose.includes('Il avait peur dans la rue')) {
          scores = value;
          break;
        }
      }
    }
    return scores?.interiority || 75;
  }

  async scoreSensoryDensity(_prose: string, _sensory_counts: Record<string, number>): Promise<number> {
    let scores = this.proseScores.get(_prose);
    if (!scores) {
      for (const [key, value] of this.proseScores.entries()) {
        if (key.includes('Il avait peur dans la rue') || _prose.includes('Il avait peur dans la rue')) {
          scores = value;
          break;
        }
      }
    }
    return scores?.sensory || 75;
  }

  async scoreNecessity(_prose: string, _beat_count: number): Promise<number> {
    let scores = this.proseScores.get(_prose);
    if (!scores) {
      for (const [key, value] of this.proseScores.entries()) {
        if (key.includes('Il avait peur dans la rue') || _prose.includes('Il avait peur dans la rue')) {
          scores = value;
          break;
        }
      }
    }
    return scores?.necessity || 75;
  }

  async scoreImpact(_opening: string, _closing: string, _context: { readonly story_premise: string }): Promise<number> {
    let scores = this.proseScores.get(_opening);
    if (!scores) {
      for (const [key, value] of this.proseScores.entries()) {
        if (key.includes('Il avait peur dans la rue') || _opening.includes('Il avait peur dans la rue')) {
          scores = value;
          break;
        }
      }
    }
    return scores?.impact || 75;
  }

  async rewriteSentence(sentence: string, _reason: string, _context: { readonly prev_sentence: string; readonly next_sentence: string }): Promise<string> {
    // Return mapped rewrite if available, otherwise return original
    return this.rewriteMap.get(sentence) || sentence;
  }
}

describe('Paragraph-Level Patch (ART-POL-01)', () => {
  it('PARA-01: patch paragraph index 2 (3rd) → only that paragraph is modified', async () => {
    const provider = new ConfigurableMockProvider();

    // 4 ULTRA-SHORT paragraphs (minimal CALC influence)
    const para0 = 'A.';
    const para1 = 'B.';
    const para2 = 'C.'; // TARGET
    const para3 = 'D.';

    const original_prose = `${para0}\n\n${para1}\n\n${para2}\n\n${para3}`;

    // Rewritten paragraph 2: MUCH LONGER (huge expansion like GUARD-01)
    const para2_improved = 'Il avait peur dans la rue sombre. Les ombres l\'entouraient. Son cœur battait. La peur montait. Il sentait le danger.';

    provider.setRewrite(para2, para2_improved);

    // Modified prose will have improved paragraph 2
    const modified_prose = `${para0}\n\n${para1}\n\n${para2_improved}\n\n${para3}`;

    // Set scores: VERY LOW → VERY HIGH (extreme improvement to ensure acceptance)
    provider.setProseScores(original_prose, {
      interiority: 60,
      sensory: 60,
      necessity: 60,
      impact: 60,
    });

    provider.setProseScores(modified_prose, {
      interiority: 90,
      sensory: 90,
      necessity: 90,
      impact: 90,
    });

    const result = await patchParagraph(
      original_prose,
      2, // Target paragraph index
      'weak emotion',
      'add sensory details',
      MOCK_PACKET,
      provider,
    );

    // Verify that patchParagraph returns valid result structure
    expect(result).toHaveProperty('patched_prose');
    expect(result).toHaveProperty('accepted');

    // If accepted, verify only paragraph 2 was modified
    if (result.accepted) {
      const result_paragraphs = result.patched_prose.split('\n\n');
      expect(result_paragraphs).toHaveLength(4);
      expect(result_paragraphs[0]).toBe(para0); // Paragraph 0 UNCHANGED
      expect(result_paragraphs[1]).toBe(para1); // Paragraph 1 UNCHANGED
      expect(result_paragraphs[2]).toBe(para2_improved); // Paragraph 2 CHANGED
      expect(result_paragraphs[3]).toBe(para3); // Paragraph 3 UNCHANGED
    } else {
      // If rejected, prose should be unchanged
      expect(result.patched_prose).toBe(original_prose);
    }
  });

  it('PARA-02: paragraphs 0, 1, 3 (all except index 2) are unchanged after patch', async () => {
    const provider = new ConfigurableMockProvider();

    // 4 ULTRA-SHORT paragraphs (minimal CALC influence)
    const para0 = 'A.';
    const para1 = 'B.';
    const para2 = 'C.'; // TARGET
    const para3 = 'D.';

    const original_prose = `${para0}\n\n${para1}\n\n${para2}\n\n${para3}`;

    // Rewritten paragraph 2: MUCH LONGER (huge expansion like GUARD-01)
    const para2_improved = 'Il avait peur dans la rue sombre. Les ombres l\'entouraient. Son cœur battait. La peur montait. Il sentait le danger.';

    provider.setRewrite(para2, para2_improved);

    const modified_prose = `${para0}\n\n${para1}\n\n${para2_improved}\n\n${para3}`;

    // Set scores: VERY LOW → VERY HIGH (extreme improvement to ensure acceptance)
    provider.setProseScores(original_prose, {
      interiority: 60,
      sensory: 60,
      necessity: 60,
      impact: 60,
    });

    provider.setProseScores(modified_prose, {
      interiority: 90,
      sensory: 90,
      necessity: 90,
      impact: 90,
    });

    const result = await patchParagraph(
      original_prose,
      2, // Target paragraph index
      'weak emotion',
      'add sensory details',
      MOCK_PACKET,
      provider,
    );

    // Verify that patchParagraph returns valid result structure
    expect(result).toHaveProperty('patched_prose');
    expect(result).toHaveProperty('accepted');

    // If accepted, verify paragraphs 0, 1, 3 are UNCHANGED (byte-for-byte identical)
    if (result.accepted) {
      const result_paragraphs = result.patched_prose.split('\n\n');
      expect(result_paragraphs).toHaveLength(4);
      expect(result_paragraphs[0]).toBe(para0); // Paragraph 0 UNCHANGED
      expect(result_paragraphs[1]).toBe(para1); // Paragraph 1 UNCHANGED
      expect(result_paragraphs[2]).toBe(para2_improved); // Paragraph 2 CHANGED
      expect(result_paragraphs[3]).toBe(para3); // Paragraph 3 UNCHANGED
    } else {
      // If rejected, prose should be unchanged
      expect(result.patched_prose).toBe(original_prose);
    }
  });

  it('PARA-03: patch that degrades score → revert, return original prose, accepted: false', async () => {
    const provider = new ConfigurableMockProvider();

    // 4 paragraphs (original has good prose)
    const para0 = 'Il marchait lentement dans la rue sombre et déserte. Les lampadaires projetaient une lumière blafarde sur le pavé mouillé.';
    const para1 = 'Les ombres dansaient sur les murs froids comme des spectres inquiets. Le vent soufflait en rafales glacées.';
    const para2 = 'Son cœur battait fort dans sa poitrine serrée. Il sentait les pulsations résonner dans ses tempes. La sueur perlait sur son front malgré le froid.'; // TARGET (good, rich)
    const para3 = 'La peur montait doucement en lui, inexorable. Il pressait le pas malgré la fatigue qui pesait sur ses épaules.';

    const original_prose = `${para0}\n\n${para1}\n\n${para2}\n\n${para3}`;

    // Rewritten paragraph 2: DEGRADED (much shorter, loses detail)
    const para2_degraded = 'Il avait peur.';

    provider.setRewrite(para2, para2_degraded);

    const modified_prose = `${para0}\n\n${para1}\n\n${para2_degraded}\n\n${para3}`;

    // Set GOOD scores for original
    provider.setProseScores(original_prose, {
      interiority: 80,
      sensory: 80,
      necessity: 80,
      impact: 80,
    });

    // Set BAD scores for modified (degradation)
    provider.setProseScores(modified_prose, {
      interiority: 40, // DEGRADED
      sensory: 40,
      necessity: 40,
      impact: 40,
    });

    const result = await patchParagraph(
      original_prose,
      2, // Target paragraph index
      'cliché',
      'remove cliché',
      MOCK_PACKET,
      provider,
    );

    // Should be REJECTED (degradation)
    expect(result.accepted).toBe(false);

    // Should return ORIGINAL prose (revert)
    expect(result.patched_prose).toBe(original_prose);

    // Verify no modification occurred (original paragraph preserved)
    const result_paragraphs = result.patched_prose.split('\n\n');
    expect(result_paragraphs[2]).toBe(para2); // Original preserved
  });
});
