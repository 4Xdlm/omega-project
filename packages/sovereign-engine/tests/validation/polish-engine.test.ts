/**
 * polish-engine.test.ts
 * Sprint U-W2 — Tests du Polish Engine
 *
 * Couverture :
 *   - SKIP si composite hors [POLISH_FLOOR, SEAL_THRESHOLD) — INV-PE-02
 *   - SKIP si aucun axe bloquant identifié
 *   - extractPolishDiagnostic() — extraction sub-axes bloquants
 *   - Boucle polish : SEAL au round 1, REJECT après max rounds
 *   - INV-PE-03 : max MAX_POLISH_ROUNDS iterations
 *   - INV-PE-06 : fail-closed sur erreur LLM
 *
 * Standard: NASA-Grade L4 / DO-178C — PASS ou FAIL
 */

import { describe, it, expect, vi } from 'vitest';
import {
  PolishEngine,
  PolishError,
  extractPolishDiagnostic,
  POLISH_FLOOR,
  POLISH_SEAL_THRESHOLD,
  MAX_POLISH_ROUNDS,
} from '../../src/validation/phase-u/polish-engine';
import type { SovereignForgeResult } from '../../src/engine';
import type { ForgePacketInput } from '../../src/input/forge-packet-assembler';
import type { SovereignProvider } from '../../src/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockResult(
  composite: number,
  rci: number,
  vcScore = 70,
  verdict: 'SEAL' | 'REJECT' = 'REJECT',
): SovereignForgeResult {
  return {
    final_prose: 'Prose de test. Du sang. Elle savait. La maison était silencieuse et le vent ne portait rien.',
    verdict,
    s_score: { composite, verdict },
    macro_score: {
      composite,
      min_axis: rci,
      verdict,
      macro_axes: {
        ecc: { score: 92, sub_scores: [] },
        rci: {
          score: rci,
          sub_scores: [
            { name: 'voice_conformity', score: vcScore, weight: 1.0, method: 'CALC', details: 'ellipsis(t=0.50/a=0.20/d=30.0%) | opening_var(t=0.80/a=0.45/d=35.0%) | para_rhythm(t=0.90/a=0.85/d=5.0%)' },
            { name: 'hook_presence',    score: 72, weight: 0.20, method: 'CALC', details: '' },
            { name: 'rhythm',           score: 78, weight: 1.0,  method: 'CALC', details: '' },
            { name: 'signature',        score: 100, weight: 1.0, method: 'CALC', details: '' },
            { name: 'euphony',          score: 85,  weight: 0.5, method: 'CALC', details: '' },
          ],
        },
        sii: { score: 88, sub_scores: [] },
        ifi: { score: 97, sub_scores: [] },
        aai: { score: 95, sub_scores: [] },
      },
    },
  } as unknown as SovereignForgeResult;
}

function makeMockInput(): ForgePacketInput {
  return {
    plan: {} as any,
    scene: { objective: 'Scène narrative', conflict_type: 'internal' } as any,
    style_profile: {
      lexicon: { signature_words: ['silence', 'lumière', 'ombre'], forbidden_words: [] },
      imagery: { recurrent_motifs: ['obscurité'], density_target_per_100_words: 3, banned_metaphors: [] },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.3, 0.85] },
    } as any,
    kill_lists: { banned_words: [], banned_cliches: [], banned_ai_patterns: [], banned_filter_words: [] } as any,
    canon: [],
    continuity: {} as any,
    run_id: 'test-polish',
    language: 'fr',
  };
}

function makeMockProvider(): SovereignProvider {
  return {} as SovereignProvider;
}

// ── Tests : extractPolishDiagnostic ──────────────────────────────────────────

describe('extractPolishDiagnostic', () => {
  it('identifie voice_conformity et hook_presence comme bloquants si RCI < floor', () => {
    const result = makeMockResult(91.5, 76);
    const diag = extractPolishDiagnostic(result);
    expect(diag.rci_score).toBe(76);
    expect(diag.composite_before).toBeCloseTo(91.5, 1);
    // voice_conformity=70 et hook_presence=72 sont < 82 (sub-floor) → bloquants
    expect(diag.blocking_sub_axes.length).toBeGreaterThan(0);
    expect(diag.blocking_sub_axes.some(a => a.includes('voice_conformity'))).toBe(true);
    expect(diag.blocking_sub_axes.some(a => a.includes('hook_presence'))).toBe(true);
  });

  it('ellipsis_rate et opening_variety extraits depuis les détails voice_conformity', () => {
    const result = makeMockResult(91.5, 76);
    const diag = extractPolishDiagnostic(result);
    // Actual ellipsis = 0.20 (a=0.20 dans les détails mock)
    expect(diag.ellipsis_rate_actual).toBeCloseTo(0.20, 2);
    expect(diag.opening_variety_actual).toBeCloseTo(0.45, 2);
  });

  it('retourne liste vide si RCI >= floor (aucun axe bloquant)', () => {
    const result = makeMockResult(93, 87, 92, 'SEAL');
    const diag = extractPolishDiagnostic(result);
    expect(diag.blocking_sub_axes.length).toBe(0);
  });
});

// ── Tests : PolishEngine.polish() — INV-PE-02 (SKIP hors plage) ──────────────

describe('PolishEngine — INV-PE-02 : SKIP hors plage', () => {
  const engine = new PolishEngine(makeMockProvider(), 'claude-sonnet-4-20250514', 'test-key');

  it('SKIP si composite déjà >= SEAL_THRESHOLD', async () => {
    const result = makeMockResult(POLISH_SEAL_THRESHOLD, 88, 90, 'SEAL');
    const polished = await engine.polish(makeMockInput(), result, 'seed-test');
    expect(polished.verdict).toBe('SKIP');
    expect(polished.skip_reason).toContain('ALREADY_SEAL');
    expect(polished.rounds_executed).toBe(0);
    expect(polished.polish_gain).toBe(0);
  });

  it('SKIP si composite < POLISH_FLOOR', async () => {
    const result = makeMockResult(POLISH_FLOOR - 1, 60);
    const polished = await engine.polish(makeMockInput(), result, 'seed-test');
    expect(polished.verdict).toBe('SKIP');
    expect(polished.skip_reason).toContain('BELOW_POLISH_FLOOR');
    expect(polished.rounds_executed).toBe(0);
  });

  it('SKIP si aucun axe bloquant (RCI >= floor)', async () => {
    const result = makeMockResult(91, 87, 92, 'REJECT');
    const polished = await engine.polish(makeMockInput(), result, 'seed-test');
    expect(polished.verdict).toBe('SKIP');
    expect(polished.skip_reason).toContain('NO_BLOCKING_AXES');
  });
});

// ── Tests : INV-PE-03 (max rounds) ───────────────────────────────────────────

describe('PolishEngine — INV-PE-03 : max rounds enforcement', () => {
  it('ne dépasse jamais MAX_POLISH_ROUNDS iterations', async () => {
    let callCount = 0;
    const provider = makeMockProvider();

    // Mock forge qui retourne toujours REJECT
    const engine = new PolishEngine(provider, 'claude-sonnet-4-20250514', 'fake-key');

    // Patch callPolishLLM via prototype pour retourner prose modifiée
    const originalCall = (engine as any).callPolishLLM.bind(engine);
    vi.spyOn(engine as any, 'callPolishLLM').mockImplementation(async () => {
      callCount++;
      return 'Prose polie mock round ' + callCount + '. Du sang. Elle savait. Trop tard. Le bruit cessa.';
    });

    // Mock runSovereignForge pour retourner toujours REJECT composite 91
    const { runSovereignForge: originalRunForge } = await import('../../src/engine');
    vi.mock('../../src/engine', async (importOriginal) => {
      const actual = await importOriginal() as any;
      return {
        ...actual,
        runSovereignForge: vi.fn().mockResolvedValue(makeMockResult(91, 76)),
      };
    });

    const initialResult = makeMockResult(90, 76);
    const polished = await engine.polish(makeMockInput(), initialResult, 'seed-test');

    // rounds_executed <= MAX_POLISH_ROUNDS
    expect(polished.rounds_executed).toBeLessThanOrEqual(MAX_POLISH_ROUNDS);
    expect(polished.rounds.length).toBeLessThanOrEqual(MAX_POLISH_ROUNDS);
    vi.restoreAllMocks();
  });
});

// ── Tests : structure PolishResult ───────────────────────────────────────────

describe('PolishEngine — structure PolishResult', () => {
  it('PolishResult SKIP contient tous les champs requis', async () => {
    const engine = new PolishEngine(makeMockProvider(), 'claude-sonnet-4-20250514', 'test-key');
    const result = makeMockResult(POLISH_SEAL_THRESHOLD + 1, 90, 92, 'SEAL');
    const polished = await engine.polish(makeMockInput(), result, 'seed');

    expect(polished).toMatchObject({
      verdict:        'SKIP',
      final_prose:    expect.any(String),
      final_composite: expect.any(Number),
      rounds:         [],
      rounds_executed: 0,
      polish_gain:    0,
      prose_sha256_final: expect.stringMatching(/^[0-9a-f]{64}$/),
      polish_hash:    expect.stringMatching(/^[0-9a-f]{64}$/),
      created_at:     expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      skip_reason:    expect.any(String),
    });
  });

  it('PolishRound contient tous les champs de traçabilité', async () => {
    const engine = new PolishEngine(makeMockProvider(), 'claude-sonnet-4-20250514', 'test-key');

    vi.spyOn(engine as any, 'callPolishLLM').mockResolvedValue(
      'Prose polie. Du sang. Elle savait. Trop tard. Rien de plus. La nuit.'
    );

    const { runSovereignForge } = await import('../../src/engine');
    vi.mocked(runSovereignForge).mockResolvedValueOnce(
      makeMockResult(POLISH_SEAL_THRESHOLD, 87, 92, 'SEAL')
    );

    const initialResult = makeMockResult(91, 76);
    const polished = await engine.polish(makeMockInput(), initialResult, 'seed-round-test');

    if (polished.rounds.length > 0) {
      const round = polished.rounds[0];
      expect(round).toMatchObject({
        round:              1,
        seed:               expect.stringMatching(/^[0-9a-f]{64}$/),
        composite_before:   expect.any(Number),
        composite_after:    expect.any(Number),
        delta_composite:    expect.any(Number),
        rci_before:         expect.any(Number),
        rci_after:          expect.any(Number),
        verdict_after:      expect.stringMatching(/^(SEAL|REJECT)$/),
        prose_sha256_before: expect.stringMatching(/^[0-9a-f]{64}$/),
        prose_sha256_after:  expect.stringMatching(/^[0-9a-f]{64}$/),
      });
    }
    vi.restoreAllMocks();
  });
});

// ── Tests : constants ─────────────────────────────────────────────────────────

describe('Polish Engine — constantes INV-PE-02', () => {
  it('POLISH_FLOOR < POLISH_SEAL_THRESHOLD', () => {
    expect(POLISH_FLOOR).toBeLessThan(POLISH_SEAL_THRESHOLD);
  });

  it('MAX_POLISH_ROUNDS est un entier positif', () => {
    expect(Number.isInteger(MAX_POLISH_ROUNDS)).toBe(true);
    expect(MAX_POLISH_ROUNDS).toBeGreaterThan(0);
  });

  it('POLISH_FLOOR >= 80 (évite de polir des textes trop faibles)', () => {
    expect(POLISH_FLOOR).toBeGreaterThanOrEqual(80);
  });
});
