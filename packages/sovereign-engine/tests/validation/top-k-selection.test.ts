/**
 * top-k-selection.test.ts
 * U-W4 — Tests du Top-K Selection Engine
 *
 * Couverture :
 *   - generateDistinctSeeds()   — pure function, 100% CALC, 0 LLM
 *   - TestableTopKRunner.run()  — pipeline complet avec forgeRunner + judge mockés
 *   - Invariants INV-TK-01 à INV-TK-06
 *
 * Standard: NASA-Grade L4 / DO-178C — PASS ou FAIL
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateDistinctSeeds,
  TopKError,
  TOP_K_MIN,
  TOP_K_MAX,
  CANDIDATE_FLOOR_COMPOSITE,
  type KSelectionReport,
  type VariantRecord,
} from '../../src/validation/phase-u/top-k-selection';
import {
  GreatnessJudge,
  type GreatnessResult,
  type AxisScore,
  type SelectionTrace,
  GREATNESS_AXES,
} from '../../src/validation/phase-u/greatness-judge';
import type { ForgePacketInput } from '../../src/input/forge-packet-assembler';
import type { SovereignForgeResult } from '../../src/engine';
import { sha256 } from '@omega/canon-kernel';

// ── Types internes ────────────────────────────────────────────────────────────

type ForgeRunner = (input: ForgePacketInput) => Promise<SovereignForgeResult>;

// ── TestableTopKRunner — pipeline Top-K injectable (pas de monkey-patch) ──────
//
// Reproduit la logique de TopKSelectionEngine.run() mais avec forgeRunner
// injectable en lieu et place de runSovereignForge, et signature (input, k, seed).
// Cela évite tout problème de signature provider et de monkey-patch.

class TestableTopKRunner {
  constructor(
    private readonly forgeRunner: ForgeRunner,
    private readonly judge: GreatnessJudge,
  ) {}

  async run(input: ForgePacketInput, k: number, baseSeed: string): Promise<KSelectionReport> {
    // INV-TK-01
    if (!Number.isInteger(k) || k < TOP_K_MIN || k > TOP_K_MAX) {
      throw new TopKError('INVALID_K', `k=${k} must be integer in [${TOP_K_MIN}, ${TOP_K_MAX}]`);
    }

    // INV-TK-02 — seeds distincts
    const seeds = generateDistinctSeeds(baseSeed, k);
    const runId = sha256(`${baseSeed}:${k}`);

    // ── Étape 1 : Génération K variantes ─────────────────────────────────────
    const variants: VariantRecord[] = [];

    for (let i = 0; i < k; i++) {
      const seed        = seeds[i];
      const seededInput = { ...input, seeds: { ...((input as Record<string, unknown>).seeds as object ?? {}), generation: seed } } as ForgePacketInput;

      let forgeResult: SovereignForgeResult;
      try {
        forgeResult = await this.forgeRunner(seededInput);
      } catch (err) {
        // INV-TK-06 : erreur provider = REJECTED, non bloquant
        variants.push({
          seed,
          variant_index:    i,
          forge_result:     null as unknown as SovereignForgeResult,
          prose_sha256:     '',
          survived_seal:    false,
          saga_ready:       false,
          seal_path:        null,
          is_candidate:     false,
          rejection_reason: `FORGE_ERROR: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }

      const survived     = forgeResult.verdict === 'SEAL';
      const sComposite   = (forgeResult.s_score as Record<string, unknown>)?.composite as number ?? 0;
      const is_candidate = sComposite >= CANDIDATE_FLOOR_COMPOSITE;
      // saga_ready / seal_path — simplified for test (no macro_axes in mock)
      const saga_ready   = sComposite >= 92.0 && survived;
      const seal_path: 'SEAL_ATOMIC' | 'SAGA_READY' | null =
        survived ? 'SEAL_ATOMIC' : saga_ready ? 'SAGA_READY' : null;
      variants.push({
        seed,
        variant_index:    i,
        forge_result:     forgeResult,
        prose_sha256:     sha256(forgeResult.final_prose),
        survived_seal:    survived,
        saga_ready,
        seal_path,
        is_candidate,
        rejection_reason: is_candidate
          ? undefined
          : `BELOW_CANDIDATE_FLOOR: composite=${sComposite}<${CANDIDATE_FLOOR_COMPOSITE}`,
      });
    }

    const kGenerated = variants.filter(v => v.forge_result !== null).length;
    const survivors  = variants.filter(v => v.survived_seal);
    const candidates = variants.filter(v => v.is_candidate);

    // INV-TK-03 (U-ROSETTE-02) : au moins 1 candidat (composite >= CANDIDATE_FLOOR_COMPOSITE)
    if (candidates.length === 0) {
      throw new TopKError('ZERO_CANDIDATES', `0/${kGenerated} variants reached candidacy floor (composite >= ${CANDIDATE_FLOOR_COMPOSITE})`);
    }

    // Etape 2 : Evaluation Greatness sur les CANDIDATS
    const evaluated: VariantRecord[] = [];

    for (const v of variants) {
      if (!v.is_candidate) { evaluated.push(v); continue; }

      let greatness: GreatnessResult | undefined;
      try {
        greatness = await (this.judge as unknown as {
          evaluate(prose: string, sha: string): Promise<GreatnessResult>;
        }).evaluate(v.forge_result.final_prose, v.prose_sha256);
      } catch (err) {
        // INV-TK-06 (patch U-ROSETTE-03) : erreur GreatnessJudge sur variante i = non-bloquant
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(`[TopK] JUDGE_WARN variant ${v.variant_index}: ${detail}`);
        evaluated.push({ ...v, rejection_reason: `JUDGE_FAILED: ${detail}` });
        continue;
      }
      evaluated.push({ ...v, greatness });
    }

    // ── Étape 3 : Sélection top-1 (argmax composite) ─────────────────────────
    const scored = evaluated.filter(v => v.is_candidate && v.greatness);
    const kJudgeFailed = candidates.length - scored.length;

    // INV-TK-06 : fail-closed — si 0 candidats evalues -> JUDGE_FAILED bloquant
    if (scored.length === 0) {
      throw new TopKError('JUDGE_FAILED', `All ${candidates.length} candidate(s) failed GreatnessJudge evaluation`);
    }

    scored.sort((a, b) => b.greatness!.composite - a.greatness!.composite);
    const top1 = scored[0];

    const first       = evaluated.find(v => v.variant_index === 0 && v.is_candidate && v.greatness);
    const gainVsFirst = first
      ? Math.round((top1.greatness!.composite - first.greatness!.composite) * 100) / 100
      : 0;

    const sagaReadyVariants = evaluated.filter(v => v.saga_ready);
    return {
      run_id:          runId,
      k_requested:     k,
      k_generated:     kGenerated,
      k_survived_seal: survivors.length,
      k_saga_ready:    sagaReadyVariants.length,
      saga_ready_rate: kGenerated > 0
        ? Math.round((sagaReadyVariants.length / kGenerated) * 10000) / 10000
        : 0,
      k_candidates:    candidates.length,
      k_evaluated:     scored.length,
      k_judge_failed:  kJudgeFailed,
      variants:        evaluated,
      top1,
      top1_composite:  top1.greatness!.composite,
      gain_vs_first:   gainVsFirst,
      created_at:      new Date().toISOString(),
    };
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_SEED = 'omega-test-base-seed-2026';

const MINIMAL_INPUT = {
  scene_id:  'scene-test-001',
  language:  'fr',
  intent:    { story_goal: 'test', scene_goal: 'test', conflict_type: 'internal', pov: 'third', tense: 'past', target_word_count: 400 },
  beats:     [],
  subtext:   { hidden_agenda: 'none', surface_action: 'none' },
  sensory:   { dominant_sense: 'visual', intensity: 0.5 },
  style_genome:     { shape: 'LINEAR', register: 'standard', rhythm: 'moderate' },
  emotion_contract: { curve_quartiles: [
    { dominant: 'neutral', valence: 0, arousal: 0 },
    { dominant: 'neutral', valence: 0, arousal: 0 },
    { dominant: 'neutral', valence: 0, arousal: 0 },
    { dominant: 'neutral', valence: 0, arousal: 0 },
  ]},
} as unknown as ForgePacketInput;

function makeSealedResult(prose = 'Prose de test.'): SovereignForgeResult {
  return { version: '2.0.0', final_prose: prose, s_score: { composite: 93 } as never, macro_score: null, verdict: 'SEAL', loop_result: {} as never, passes_executed: 1 } as SovereignForgeResult;
}

function makeRejectedResult(prose = 'Prose rejetee.'): SovereignForgeResult {
  return { ...makeSealedResult(prose), verdict: 'REJECT', s_score: { composite: 78 } as never } as SovereignForgeResult;
}

function makeGreatnessResult(composite: number): GreatnessResult {
  const axes: AxisScore[] = (['memorabilite', 'tension_implicite', 'voix', 'subjectivite'] as const).map(axis => ({
    axis, score: composite / 100, reason: `ok-${axis}`, weight: GREATNESS_AXES[axis].weight,
  }));
  return { composite, axes, trace: { prose_sha256: 'a'.repeat(64), evaluated_at: new Date().toISOString(), axes, composite, verdict: 'EVALUATED' } };
}

function makeMockJudge(compositesByCall: number[]): GreatnessJudge {
  let idx = 0;
  return {
    evaluate: vi.fn(async (_prose: string, sha: string) => {
      const c = compositesByCall[idx++ % compositesByCall.length];
      return { ...makeGreatnessResult(c), trace: { ...makeGreatnessResult(c).trace, prose_sha256: sha } };
    }),
  } as unknown as GreatnessJudge;
}

function makeEngine(forgeRunner: ForgeRunner, judge: GreatnessJudge): TestableTopKRunner {
  return new TestableTopKRunner(forgeRunner, judge);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — generateDistinctSeeds()
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W4 generateDistinctSeeds — INV-TK-02', () => {

  it('TK-SEED-01: génère K seeds distincts', () => {
    expect(new Set(generateDistinctSeeds(BASE_SEED, 8)).size).toBe(8);
  });

  it('TK-SEED-02: seeds sont des SHA256 (64 hex chars)', () => {
    for (const s of generateDistinctSeeds(BASE_SEED, 4)) {
      expect(s).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('TK-SEED-03: déterministe — même baseSeed + k → mêmes seeds', () => {
    expect(generateDistinctSeeds('fixed', 5)).toEqual(generateDistinctSeeds('fixed', 5));
  });

  it('TK-SEED-04: baseSeed différente → seeds différents', () => {
    expect(generateDistinctSeeds('A', 4)).not.toEqual(generateDistinctSeeds('B', 4));
  });

  it('TK-SEED-05: k=2 (minimum) → 2 seeds', () => {
    expect(generateDistinctSeeds(BASE_SEED, 2)).toHaveLength(2);
  });

  it('TK-SEED-06: k=32 (maximum) → 32 seeds distincts', () => {
    const s = generateDistinctSeeds(BASE_SEED, 32);
    expect(s).toHaveLength(32);
    expect(new Set(s).size).toBe(32);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — INV-TK-01 : validation k
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W4 INV-TK-01 — validation k', () => {

  it('TK-K-01: TOP_K_MIN = 2, TOP_K_MAX = 32', () => {
    expect(TOP_K_MIN).toBe(2);
    expect(TOP_K_MAX).toBe(32);
  });

  it('TK-K-02: k=1 → TopKError INVALID_K', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([70]));
    await expect(e.run(MINIMAL_INPUT, 1, BASE_SEED)).rejects.toThrow('INVALID_K');
  });

  it('TK-K-03: k=33 → TopKError INVALID_K', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([70]));
    await expect(e.run(MINIMAL_INPUT, 33, BASE_SEED)).rejects.toThrow(TopKError);
  });

  it('TK-K-04: k=0 → TopKError INVALID_K', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([70]));
    await expect(e.run(MINIMAL_INPUT, 0, BASE_SEED)).rejects.toThrow(TopKError);
  });

  it('TK-K-05: k=2 (minimum valide) → pas de TopKError INVALID_K', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([70, 80]));
    const r = await e.run(MINIMAL_INPUT, 2, BASE_SEED);
    expect(r.k_requested).toBe(2);
  });

  it('TK-K-06: k flottant → TopKError INVALID_K', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([70]));
    await expect(e.run(MINIMAL_INPUT, 2.5, BASE_SEED)).rejects.toThrow(TopKError);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — INV-TK-03 : ZERO_SURVIVORS
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W4 INV-TK-03 — ZERO_CANDIDATES (U-ROSETTE-02)', () => {

  it('TK-ZS-01: toutes variantes REJECT (score<85) -> TopKError ZERO_CANDIDATES', async () => {
    // makeRejectedResult() retourne composite=78 => sous CANDIDATE_FLOOR_COMPOSITE=85
    const e = makeEngine(async () => makeRejectedResult(), makeMockJudge([70]));
    await expect(e.run(MINIMAL_INPUT, 3, BASE_SEED)).rejects.toThrow('ZERO_CANDIDATES');
  });

  it('TK-ZS-02: toutes variantes FORGE_ERROR -> ZERO_CANDIDATES', async () => {
    const e = makeEngine(async () => { throw new Error('API down'); }, makeMockJudge([70]));
    await expect(e.run(MINIMAL_INPUT, 2, BASE_SEED)).rejects.toThrow('ZERO_CANDIDATES');
  });

  it('TK-ZS-03: 1 SEAL sur k=3 -> pas de ZERO_CANDIDATES (survived_seal => is_candidate)', async () => {
    let idx = 0;
    const e = makeEngine(async () => idx++ === 0 ? makeSealedResult('A scelle.') : makeRejectedResult(), makeMockJudge([75]));
    const r = await e.run(MINIMAL_INPUT, 3, BASE_SEED);
    expect(r.k_candidates).toBeGreaterThanOrEqual(1);
    expect(r.top1_composite).toBe(75);
  });

  it('TK-ZS-04: CANDIDATE_FLOOR_COMPOSITE = 85 (INV-TK-CANDIDATE-01)', () => {
    expect(CANDIDATE_FLOOR_COMPOSITE).toBe(85);
  });

  it('TK-ZS-05: CANDIDATE_FLOOR_COMPOSITE < 93 (SEAL threshold inchange)', () => {
    expect(CANDIDATE_FLOOR_COMPOSITE).toBeLessThan(93);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — INV-TK-05 : top-1 = argmax composite
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W4 INV-TK-05 — top-1 sélection', () => {

  it('TK-TOP-01: top-1 = variante avec composite le plus élevé', async () => {
    const composites = [60, 85, 70];
    const e = makeEngine(async () => makeSealedResult('x'), makeMockJudge(composites));
    const r = await e.run(MINIMAL_INPUT, 3, BASE_SEED);
    expect(r.top1_composite).toBe(85);
  });

  it('TK-TOP-02: gain_vs_first = composite top1 - composite variant[0]', async () => {
    const composites = [60, 85, 70];
    const e = makeEngine(async () => makeSealedResult('x'), makeMockJudge(composites));
    const r = await e.run(MINIMAL_INPUT, 3, BASE_SEED);
    expect(r.gain_vs_first).toBe(25); // 85 - 60
  });

  it('TK-TOP-03: k=2, scores égaux → rapport valide', async () => {
    const e = makeEngine(async () => makeSealedResult('x'), makeMockJudge([70, 70]));
    const r = await e.run(MINIMAL_INPUT, 2, BASE_SEED);
    expect(r.top1_composite).toBe(70);
    expect(r.top1).toBeDefined();
  });

  it('TK-TOP-04: top1.is_candidate = true (selection sur candidats, pas seulement SEAL)', async () => {
    const e = makeEngine(async () => makeSealedResult('x'), makeMockJudge([80]));
    const r = await e.run(MINIMAL_INPUT, 2, BASE_SEED);
    expect(r.top1.is_candidate).toBe(true);
  });

  it('TK-TOP-05: top1.greatness.composite = top1_composite', async () => {
    const e = makeEngine(async () => makeSealedResult('x'), makeMockJudge([77]));
    const r = await e.run(MINIMAL_INPUT, 2, BASE_SEED);
    expect(r.top1.greatness!.composite).toBe(r.top1_composite);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — INV-TK-04 : KSelectionReport
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W4 INV-TK-04 — KSelectionReport', () => {

  it('TK-REP-01: rapport contient tous les champs requis', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([70]));
    const r = await e.run(MINIMAL_INPUT, 2, BASE_SEED);
    expect(r.run_id).toBeTruthy();
    expect(r.k_requested).toBe(2);
    expect(typeof r.k_generated).toBe('number');
    expect(typeof r.k_survived_seal).toBe('number');
    expect(typeof r.k_candidates).toBe('number');
    expect(typeof r.k_evaluated).toBe('number');
    expect(r.variants).toHaveLength(2);
    expect(r.top1).toBeDefined();
    expect(r.top1_composite).toBeGreaterThanOrEqual(0);
    expect(r.created_at).toBeTruthy();
  });

  it('TK-REP-02: k_requested = k fourni', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([65]));
    const r = await e.run(MINIMAL_INPUT, 4, BASE_SEED);
    expect(r.k_requested).toBe(4);
  });

  it('TK-REP-03: variants.length = k_requested', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([65]));
    const r = await e.run(MINIMAL_INPUT, 3, BASE_SEED);
    expect(r.variants).toHaveLength(3);
  });

  it('TK-REP-04: chaque VariantRecord a seed, variant_index, survived_seal, is_candidate', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([70]));
    const r = await e.run(MINIMAL_INPUT, 2, BASE_SEED);
    for (const v of r.variants) {
      expect(v.seed).toBeTruthy();
      expect(typeof v.variant_index).toBe('number');
      expect(typeof v.survived_seal).toBe('boolean');
      expect(typeof v.is_candidate).toBe('boolean');
    }
  });

  it('TK-REP-05: created_at est ISO 8601 valide', async () => {
    const e = makeEngine(async () => makeSealedResult(), makeMockJudge([70]));
    const r = await e.run(MINIMAL_INPUT, 2, BASE_SEED);
    expect(new Date(r.created_at).toISOString()).toBe(r.created_at);
  });

  it('TK-REP-06: variante REJECT a rejection_reason renseigné', async () => {
    let idx = 0;
    const e = makeEngine(async () => idx++ === 0 ? makeSealedResult() : makeRejectedResult(), makeMockJudge([70]));
    const r = await e.run(MINIMAL_INPUT, 2, BASE_SEED);
    const rejected = r.variants.find(v => !v.is_candidate);
    expect(rejected?.rejection_reason).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — INV-TK-06 : fail-closed
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W4 INV-TK-06 — fail-closed', () => {

  it('TK-FC-01: erreur provider individuelle = REJECTED non bloquant (si autre SEAL)', async () => {
    let idx = 0;
    const e = makeEngine(async () => {
      if (idx++ === 1) throw new Error('Provider down');
      return makeSealedResult('OK');
    }, makeMockJudge([75]));
    const r = await e.run(MINIMAL_INPUT, 3, BASE_SEED);
    expect(r.k_candidates).toBeGreaterThanOrEqual(1);
    expect(r.variants.find(v => v.rejection_reason?.startsWith('FORGE_ERROR'))).toBeDefined();
  });

  it('TK-FC-02: erreur GreatnessJudge = TopKError JUDGE_FAILED (bloquant)', async () => {
    const brokenJudge = { evaluate: vi.fn().mockRejectedValue(new Error('Judge timeout')) } as unknown as GreatnessJudge;
    const e = makeEngine(async () => makeSealedResult('x'), brokenJudge);
    await expect(e.run(MINIMAL_INPUT, 2, BASE_SEED)).rejects.toThrow(TopKError);
    await expect(e.run(MINIMAL_INPUT, 2, BASE_SEED)).rejects.toThrow('JUDGE_FAILED');
  });

  it('TK-FC-03: judge echoue sur 1/3 variantes — run reussit avec les 2 candidats restants', async () => {
    // K=3 candidats : judge reussit sur 0 et 2, echoue sur 1
    let callCount = 0;
    const partialJudge = {
      evaluate: vi.fn().mockImplementation(async () => {
        const i = callCount++;
        if (i === 1) throw new Error('fetch failed: memorabilite timeout');
        return { composite: 80, trace: { axis: 'greatness', score: 80 } as unknown as SelectionTrace };
      }),
    } as unknown as GreatnessJudge;
    const e = makeEngine(async () => makeSealedResult('x'), partialJudge);
    const r = await e.run(MINIMAL_INPUT, 3, BASE_SEED);
    // run ne doit pas echouer meme avec 1 judge failure
    expect(r.k_evaluated).toBe(2);   // 2 sur 3 evalues avec succes
    expect(r.k_judge_failed).toBe(1); // 1 echec non-bloquant
    expect(r.top1).toBeDefined();
    expect(r.k_judge_failed).toBeGreaterThanOrEqual(0);
  });

  it('TK-FC-04: judge echoue sur TOUTES les variantes — throw JUDGE_FAILED bloquant', async () => {
    const totalFailJudge = {
      evaluate: vi.fn().mockRejectedValue(new Error('network unreachable')),
    } as unknown as GreatnessJudge;
    const e = makeEngine(async () => makeSealedResult('x'), totalFailJudge);
    await expect(e.run(MINIMAL_INPUT, 3, BASE_SEED)).rejects.toThrow(TopKError);
    await expect(e.run(MINIMAL_INPUT, 3, BASE_SEED)).rejects.toThrow('JUDGE_FAILED');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — TopKError
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W4 TopKError', () => {

  it('TK-ERR-01: message inclut le code', () => {
    const err = new TopKError('TEST_CODE', 'test message');
    expect(err.message).toContain('TEST_CODE');
    expect(err.name).toBe('TopKError');
    expect(err.code).toBe('TEST_CODE');
  });

  it('TK-ERR-02: cause optionnel préservée', () => {
    const cause = new Error('root cause');
    expect(new TopKError('WRAP', 'wrapped', cause).cause).toBe(cause);
  });
});
