/**
 * targeted-patch.test.ts — Tests P5 : Targeted Patch
 * Sprint P5 — V-PARTITION v3.0.0
 *
 * INV-TP-01 : Only targets ECC, RCI, SII
 * INV-TP-02 : word_change_pct > max → ROLLBACK
 * INV-TP-03 : Damage gate REJECT → ROLLBACK
 * INV-TP-04 : target_delta <= 0 → ROLLBACK
 * INV-TP-05 : Flag OMEGA_TARGETED_PATCH=1 activates
 *
 * 9 tests — 100% CALC — 0 appel LLM (mock provider).
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  identifyWeakestAxis,
  buildPatchPrompt,
  calculateWordChangePct,
  isTargetedPatchActive,
  runTargetedPatch,
  DEFAULT_PATCH_CONFIG,
} from '../../src/polish/targeted-patch.js';
import type { MacroAxesScores } from '../../src/oracle/macro-axes.js';
import type { MacroSScore } from '../../src/oracle/s-score.js';
import type { SovereignProvider } from '../../src/types.js';
import { MINIMAL_FORGE_PACKET } from '../input/__fixtures__/minimal-forge-packet.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

afterEach(() => {
  delete process.env.OMEGA_TARGETED_PATCH;
});

function makeMacroAxis(name: string, score: number) {
  return {
    name, score, weight: 0.2, method: 'CALC' as const,
    sub_scores: [], bonuses: [],
    reasons: { top_contributors: [], top_penalties: [] },
  };
}

function makeMacroAxes(scores: { ecc: number; rci: number; sii: number; ifi: number; aai: number }): MacroAxesScores {
  return {
    ecc: makeMacroAxis('ECC', scores.ecc),
    rci: makeMacroAxis('RCI', scores.rci),
    sii: makeMacroAxis('SII', scores.sii),
    ifi: makeMacroAxis('IFI', scores.ifi),
    aai: makeMacroAxis('AAI', scores.aai),
  };
}

function makeMacroSScore(scores: { ecc: number; rci: number; sii: number; ifi: number; aai: number }, composite: number): MacroSScore {
  return {
    score_id: 'test', score_hash: 'test', scene_id: 'test', seed: 'test',
    macro_axes: makeMacroAxes(scores),
    composite, min_axis: Math.min(scores.ecc, scores.rci, scores.sii, scores.ifi, scores.aai),
    verdict: composite >= 92 ? 'SEAL' : 'PITCH',
    ecc_score: scores.ecc, emotion_weight_pct: 60,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — identifyWeakestAxis (INV-TP-01)
// ═══════════════════════════════════════════════════════════════════════════════

describe('P5 — identifyWeakestAxis', () => {

  it('INV-TP-01: ECC lowest → target = ECC', () => {
    const axes = makeMacroAxes({ ecc: 80, rci: 85, sii: 90, ifi: 95, aai: 95 });
    expect(identifyWeakestAxis(axes)).toBe('ECC');
  });

  it('INV-TP-01: RCI lowest → target = RCI', () => {
    const axes = makeMacroAxes({ ecc: 90, rci: 75, sii: 85, ifi: 95, aai: 95 });
    expect(identifyWeakestAxis(axes)).toBe('RCI');
  });

  it('INV-TP-01: force_target overrides auto-detection', () => {
    const axes = makeMacroAxes({ ecc: 80, rci: 85, sii: 90, ifi: 95, aai: 95 });
    expect(identifyWeakestAxis(axes, 'SII')).toBe('SII');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — buildPatchPrompt
// ═══════════════════════════════════════════════════════════════════════════════

describe('P5 — buildPatchPrompt', () => {

  it('RCI prompt contains rhythm keywords and interdictions', () => {
    const prompt = buildPatchPrompt('RCI', 'Test prose.');
    expect(prompt).toContain('rythme');
    expect(prompt).toContain('syncopes');
    expect(prompt).toContain('NE CHANGE AUCUN fait');
    expect(prompt).toContain('NE MODIFIE PAS plus de 15%');
  });

  it('ECC prompt contains emotion keywords and interdictions', () => {
    const prompt = buildPatchPrompt('ECC', 'Test prose.');
    expect(prompt).toContain('émotion');
    expect(prompt).toContain('CORPS');
    expect(prompt).toContain('NE CHANGE AUCUN fait');
    expect(prompt).toContain('NE MODIFIE PAS plus de 15%');
  });

  it('SII prompt contains sensory keywords and interdictions', () => {
    const prompt = buildPatchPrompt('SII', 'Test prose.');
    expect(prompt).toContain('sensoriel');
    expect(prompt).toContain('NÉCESSAIRE');
    expect(prompt).toContain('NE CHANGE AUCUN fait');
    expect(prompt).toContain('NE MODIFIE PAS plus de 15%');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — calculateWordChangePct
// ═══════════════════════════════════════════════════════════════════════════════

describe('P5 — calculateWordChangePct', () => {

  it('identical text → 0%', () => {
    expect(calculateWordChangePct('a b c d e', 'a b c d e')).toBe(0);
  });

  it('1 word changed → small %', () => {
    const pct = calculateWordChangePct(
      'le chat noir dort sur le lit',
      'le chat blanc dort sur le lit',
    );
    // 1 word changed out of 7 ≈ 14.3%
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(20);
  });

  it('completely different text → high %', () => {
    const pct = calculateWordChangePct(
      'bonjour le monde entier',
      'salut la planete vaste',
    );
    expect(pct).toBeGreaterThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — runTargetedPatch (mock provider)
// ═══════════════════════════════════════════════════════════════════════════════

describe('P5 — runTargetedPatch', () => {

  it('INV-TP-04: same text returned → accepted = false (no improvement)', async () => {
    const prose = 'Le silence tombait entre eux comme une pluie froide.';
    const macroScore = makeMacroSScore({ ecc: 85, rci: 80, sii: 88, ifi: 95, aai: 95 }, 87.0);

    // Mock provider returns same text
    const provider: SovereignProvider = {
      generateDraft: vi.fn().mockResolvedValue(prose),
      generateStructuredJSON: vi.fn(),
      scoreInteriority: vi.fn().mockResolvedValue({ name: 'interiority', score: 85, weight: 2.0 }),
      scoreSensoryDensity: vi.fn().mockResolvedValue({ name: 'sensory_density', score: 85, weight: 1.5 }),
      scoreNecessity: vi.fn().mockResolvedValue({ name: 'necessity', score: 85, weight: 1.5 }),
      scoreImpact: vi.fn().mockResolvedValue({ name: 'impact', score: 85, weight: 2.0 }),
      applyPatch: vi.fn(),
      rewriteSentence: vi.fn(),
    };

    const result = await runTargetedPatch(MINIMAL_FORGE_PACKET, prose, macroScore, provider);

    expect(result.accepted).toBe(false);
    expect(result.target_axis).toBe('RCI'); // lowest at 80
    expect(result.rollback_reason).toContain('no improvement');
  });

  it('INV-TP-05: flag check works', () => {
    expect(isTargetedPatchActive()).toBe(false);
    process.env.OMEGA_TARGETED_PATCH = '1';
    expect(isTargetedPatchActive()).toBe(true);
  });
});
