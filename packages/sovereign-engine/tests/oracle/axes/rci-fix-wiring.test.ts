/**
 * RCI Wiring Fix — Invariant Tests
 * Validates: voice_conformity always included, hook_presence neutral = 85
 */

import { describe, it, expect } from 'vitest';
import { computeRCI } from '../../../src/oracle/macro-axes.js';
import { scoreVoiceConformity } from '../../../src/oracle/axes/voice-conformity.js';
import { MOCK_PACKET } from '../../fixtures/mock-packet.js';
import { PROSE_GOOD } from '../../fixtures/mock-prose.js';
import type { ForgePacket } from '../../../src/types.js';

describe('RCI Wiring Fix [RCI-FIX]', () => {
  it('RCI-FIX-01: voice_conformity is ALWAYS included in sub_scores (even without provider)', async () => {
    // Call computeRCI WITHOUT provider — voice_conformity must still appear
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    const vc = result.sub_scores.find(s => s.name === 'voice_conformity');
    expect(vc).toBeDefined();
    expect(vc!.weight).toBe(1.0);
    expect(vc!.method).toBe('CALC');
    expect(vc!.score).toBeGreaterThanOrEqual(0);
    expect(vc!.score).toBeLessThanOrEqual(100);
  });

  it('RCI-FIX-02: hook_presence returns 85 (not 75) when no hooks defined', async () => {
    // Create packet with empty signature_words and recurrent_motifs
    const noHooksPacket: ForgePacket = {
      ...MOCK_PACKET,
      style_genome: {
        ...MOCK_PACKET.style_genome,
        lexicon: {
          ...MOCK_PACKET.style_genome.lexicon,
          signature_words: [],
        },
        imagery: {
          ...MOCK_PACKET.style_genome.imagery,
          recurrent_motifs: [],
        },
      },
    } as any;

    const result = await computeRCI(noHooksPacket, PROSE_GOOD);
    const hook = result.sub_scores.find(s => s.name === 'hook_presence');

    expect(hook).toBeDefined();
    expect(hook!.score).toBe(85);
  });

  it('RCI-FIX-03: scoreVoiceConformity takes only (packet, prose) — no provider param', async () => {
    // Verify the function works with exactly 2 arguments
    const result = await scoreVoiceConformity(MOCK_PACKET, PROSE_GOOD);

    expect(result.axis_id).toBe('voice_conformity');
    expect(result.method).toBe('CALC');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('RCI-FIX-04: RCI includes voice_conformity weight in total weight calculation', async () => {
    const result = await computeRCI(MOCK_PACKET, PROSE_GOOD);

    // voice_conformity has weight 1.0 — it MUST contribute to totalWeight
    const totalWeight = result.sub_scores.reduce((sum, s) => sum + s.weight, 0);
    const vcWeight = result.sub_scores.find(s => s.name === 'voice_conformity')!.weight;

    // totalWeight includes voice_conformity's 1.0
    expect(totalWeight).toBeGreaterThanOrEqual(vcWeight);

    // 5 sub_scores: rhythm(1.0) + signature(1.0) + hook(0.20) + euphony(1.0) + voice(1.0) = 4.20
    expect(result.sub_scores).toHaveLength(5);
    expect(totalWeight).toBeCloseTo(5.0, 1);
  });
});
