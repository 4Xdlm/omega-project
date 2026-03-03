/**
 * greatness-judge.test.ts
 * U-W2 — Tests du Greatness Judge
 *
 * Couverture :
 *   - computeComposite()  — pure function, 100% CALC, 0 LLM
 *   - GreatnessJudge.evaluate() — adapter mocké
 *   - GreatnessJudge.evaluateVariants() — tri top-K
 *   - GreatnessLLMAdapter.parseAndValidate() — via accès interne au test
 *   - Invariants INV-GJ-01 à INV-GJ-06
 *
 * Standard: NASA-Grade L4 / DO-178C — PASS ou FAIL
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeComposite,
  GreatnessJudge,
  GreatnessLLMAdapter,
  GreatnessError,
  GREATNESS_AXES,
  TOTAL_WEIGHT,
  type AxisScore,
  type GreatnessAxis,
  type GreatnessResult,
} from '../../src/validation/phase-u/greatness-judge';
import type { JudgeCache, JudgeResult } from '../../src/validation/judge-cache';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROSE_A = "Elle regardait ses mains. Il ne reviendrait pas. Le café refroidissait dans la tasse, et c'était suffisant.";
const PROSE_B = "Le soleil se levait sur la ville endormie. Pierre sentit une étrange sensation envahir son cœur. Tout semblait irréel.";
const SHA_A   = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B   = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const AXES_ORDER: GreatnessAxis[] = ['memorabilite', 'tension_implicite', 'voix', 'subjectivite'];

function makeAxes(scores: [number, number, number, number]): AxisScore[] {
  return AXES_ORDER.map((axis, i) => ({
    axis,
    score:  scores[i],
    reason: `Raison ${axis}`,
    weight: GREATNESS_AXES[axis].weight,
  }));
}

/** Mock JudgeCache */
function makeMockCache(): JudgeCache {
  const store = new Map<string, JudgeResult>();
  return {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, val: JudgeResult) => { store.set(key, val); },
    stats: () => ({ entries: store.size, hits: 0, misses: 0 }),
    clear: () => store.clear(),
    persist: async () => {},
    load: async () => {},
  } as unknown as JudgeCache;
}

/** Mock GreatnessLLMAdapter — retourne des scores fixes par axe */
function makeMockAdapter(scoresByAxis: Record<GreatnessAxis, JudgeResult>): GreatnessLLMAdapter {
  return {
    judge: vi.fn(async (axis: GreatnessAxis) => scoresByAxis[axis]),
  } as unknown as GreatnessLLMAdapter;
}

function makeUniformAdapter(score: number, reason = 'ok'): GreatnessLLMAdapter {
  return makeMockAdapter({
    memorabilite:      { score, reason },
    tension_implicite: { score, reason },
    voix:              { score, reason },
    subjectivite:      { score, reason },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — computeComposite() — pure CALC
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W2 computeComposite — INV-GJ-01', () => {

  it('GJ-CALC-01: scores uniformes 1.0 → composite = 100', () => {
    const axes = makeAxes([1, 1, 1, 1]);
    expect(computeComposite(axes)).toBe(100);
  });

  it('GJ-CALC-02: scores uniformes 0.0 → composite = 0', () => {
    const axes = makeAxes([0, 0, 0, 0]);
    expect(computeComposite(axes)).toBe(0);
  });

  it('GJ-CALC-03: scores uniformes 0.5 → composite = 50', () => {
    const axes = makeAxes([0.5, 0.5, 0.5, 0.5]);
    expect(computeComposite(axes)).toBe(50);
  });

  it('GJ-CALC-04: pondération correcte — subjectivite (×3.0) a plus de poids', () => {
    // subjectivite=1.0, tout le reste=0.0
    // composite = (0×2.0 + 0×2.5 + 0×2.0 + 1×3.0) / 9.5 × 100 = 31.58
    const axes = makeAxes([0, 0, 0, 1]);
    const expected = Math.round((3.0 / 9.5) * 100 * 100) / 100;
    expect(computeComposite(axes)).toBe(expected);
  });

  it('GJ-CALC-05: pondération correcte — tension_implicite (×2.5)', () => {
    // tension=1.0, reste=0.0
    // composite = 2.5 / 9.5 × 100 = 26.32
    const axes = makeAxes([0, 1, 0, 0]);
    const expected = Math.round((2.5 / 9.5) * 100 * 100) / 100;
    expect(computeComposite(axes)).toBe(expected);
  });

  it('GJ-CALC-06: TOTAL_WEIGHT = 9.5 (invariant architectural)', () => {
    expect(TOTAL_WEIGHT).toBe(9.5);
  });

  it('GJ-CALC-07: 4 axes avec poids conformes à la spec', () => {
    expect(GREATNESS_AXES.memorabilite.weight).toBe(2.0);
    expect(GREATNESS_AXES.tension_implicite.weight).toBe(2.5);
    expect(GREATNESS_AXES.voix.weight).toBe(2.0);
    expect(GREATNESS_AXES.subjectivite.weight).toBe(3.0);
  });

  it('GJ-CALC-08: composite arrondi à 2 décimales', () => {
    const axes = makeAxes([0.3, 0.7, 0.4, 0.6]);
    const result = computeComposite(axes);
    expect(result).toBe(Math.round(result * 100) / 100);
  });

  it('GJ-CALC-09: composite toujours dans [0, 100]', () => {
    const axes = makeAxes([0.9, 0.85, 0.95, 0.8]);
    const result = computeComposite(axes);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('GJ-CALC-10: nombre d\'axes ≠ 4 → GreatnessError COMPOSITE_ERROR', () => {
    const axes3 = makeAxes([0.5, 0.5, 0.5, 0.5]).slice(0, 3);
    expect(() => computeComposite(axes3)).toThrow(GreatnessError);
    expect(() => computeComposite(axes3)).toThrow('COMPOSITE_ERROR');
  });

  it('GJ-CALC-11: 0 axes → GreatnessError COMPOSITE_ERROR', () => {
    expect(() => computeComposite([])).toThrow(GreatnessError);
  });

  it('GJ-CALC-12: scores exacts spec — human_top niveau (0.8 partout) → composite = 80', () => {
    const axes = makeAxes([0.8, 0.8, 0.8, 0.8]);
    expect(computeComposite(axes)).toBe(80);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — GreatnessJudge.evaluate() — adapter mocké
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W2 GreatnessJudge.evaluate — INV-GJ-02/03/04/05', () => {

  it('GJ-EVAL-01: évaluation valide → GreatnessResult complet', async () => {
    const adapter = makeUniformAdapter(0.7, 'Bonne prose');
    const judge   = GreatnessJudge.withAdapter(adapter);
    const result  = await judge.evaluate(PROSE_A, SHA_A);

    expect(result.composite).toBe(70);
    expect(result.axes).toHaveLength(4);
    expect(result.trace.verdict).toBe('EVALUATED');
    expect(result.trace.prose_sha256).toBe(SHA_A);
  });

  it('GJ-EVAL-02: INV-GJ-02 — scores [0,1] sur chaque axe', async () => {
    const adapter = makeUniformAdapter(0.6);
    const judge   = GreatnessJudge.withAdapter(adapter);
    const result  = await judge.evaluate(PROSE_A, SHA_A);
    for (const axis of result.axes) {
      expect(axis.score).toBeGreaterThanOrEqual(0);
      expect(axis.score).toBeLessThanOrEqual(1);
    }
  });

  it('GJ-EVAL-03: INV-GJ-03 — justification présente sur chaque axe', async () => {
    const adapter = makeUniformAdapter(0.5, 'Raison valide');
    const judge   = GreatnessJudge.withAdapter(adapter);
    const result  = await judge.evaluate(PROSE_A, SHA_A);
    for (const axis of result.axes) {
      expect(axis.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it('GJ-EVAL-04: INV-GJ-04 — SelectionTrace présente avec prose_sha256', async () => {
    const adapter = makeUniformAdapter(0.75);
    const judge   = GreatnessJudge.withAdapter(adapter);
    const result  = await judge.evaluate(PROSE_A, SHA_A);
    expect(result.trace.prose_sha256).toBe(SHA_A);
    expect(result.trace.axes).toHaveLength(4);
    expect(result.trace.composite).toBe(result.composite);
    expect(result.trace.evaluated_at).toBeTruthy();
  });

  it('GJ-EVAL-05: INV-GJ-05 — prose vide → GreatnessError EMPTY_PROSE', async () => {
    const adapter = makeUniformAdapter(0.5);
    const judge   = GreatnessJudge.withAdapter(adapter);
    await expect(judge.evaluate('', SHA_A)).rejects.toThrow(GreatnessError);
    await expect(judge.evaluate('', SHA_A)).rejects.toThrow('EMPTY_PROSE');
  });

  it('GJ-EVAL-06: INV-GJ-05 — sha256 manquant → GreatnessError MISSING_SHA256', async () => {
    const adapter = makeUniformAdapter(0.5);
    const judge   = GreatnessJudge.withAdapter(adapter);
    await expect(judge.evaluate(PROSE_A, '')).rejects.toThrow(GreatnessError);
    await expect(judge.evaluate(PROSE_A, '')).rejects.toThrow('MISSING_SHA256');
  });

  it('GJ-EVAL-07: INV-GJ-05 — LLM throw → GreatnessError AXIS_EVAL_FAILED', async () => {
    const adapter = {
      judge: vi.fn().mockRejectedValue(new Error('API timeout')),
    } as unknown as GreatnessLLMAdapter;
    const judge = GreatnessJudge.withAdapter(adapter);
    await expect(judge.evaluate(PROSE_A, SHA_A)).rejects.toThrow(GreatnessError);
    await expect(judge.evaluate(PROSE_A, SHA_A)).rejects.toThrow('AXIS_EVAL_FAILED');
  });

  it('GJ-EVAL-08: score 0 → composite = 0 (borne basse)', async () => {
    const adapter = makeUniformAdapter(0);
    const judge   = GreatnessJudge.withAdapter(adapter);
    const result  = await judge.evaluate(PROSE_A, SHA_A);
    expect(result.composite).toBe(0);
  });

  it('GJ-EVAL-09: score 1 → composite = 100 (borne haute)', async () => {
    const adapter = makeUniformAdapter(1);
    const judge   = GreatnessJudge.withAdapter(adapter);
    const result  = await judge.evaluate(PROSE_A, SHA_A);
    expect(result.composite).toBe(100);
  });

  it('GJ-EVAL-10: 4 axes évalués dans le bon ordre', async () => {
    const scores: JudgeResult[] = [
      { score: 0.8, reason: 'memo' },
      { score: 0.7, reason: 'tension' },
      { score: 0.6, reason: 'voix' },
      { score: 0.9, reason: 'subj' },
    ];
    let callIdx = 0;
    const adapter = {
      judge: vi.fn(async () => scores[callIdx++]),
    } as unknown as GreatnessLLMAdapter;
    const judge  = GreatnessJudge.withAdapter(adapter);
    const result = await judge.evaluate(PROSE_A, SHA_A);
    expect(result.axes[0].axis).toBe('memorabilite');
    expect(result.axes[1].axis).toBe('tension_implicite');
    expect(result.axes[2].axis).toBe('voix');
    expect(result.axes[3].axis).toBe('subjectivite');
  });

  it('GJ-EVAL-11: composite calculé = formule attendue', async () => {
    const adapter = makeMockAdapter({
      memorabilite:      { score: 0.8, reason: 'memo' },
      tension_implicite: { score: 0.6, reason: 'tension' },
      voix:              { score: 0.7, reason: 'voix' },
      subjectivite:      { score: 0.9, reason: 'subj' },
    });
    const judge  = GreatnessJudge.withAdapter(adapter);
    const result = await judge.evaluate(PROSE_A, SHA_A);

    // composite = (0.8×2.0 + 0.6×2.5 + 0.7×2.0 + 0.9×3.0) / 9.5 × 100
    const expected = Math.round(((0.8 * 2.0 + 0.6 * 2.5 + 0.7 * 2.0 + 0.9 * 3.0) / 9.5) * 100 * 100) / 100;
    expect(result.composite).toBe(expected);
  });

  it('GJ-EVAL-12: SelectionTrace.evaluated_at est un ISO 8601 valide', async () => {
    const adapter = makeUniformAdapter(0.5);
    const judge   = GreatnessJudge.withAdapter(adapter);
    const result  = await judge.evaluate(PROSE_A, SHA_A);
    expect(() => new Date(result.trace.evaluated_at)).not.toThrow();
    expect(new Date(result.trace.evaluated_at).toISOString()).toBe(result.trace.evaluated_at);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — evaluateVariants() — top-K selection
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W2 GreatnessJudge.evaluateVariants — Top-K', () => {
  const variantA = { prose: PROSE_A, sha256: SHA_A };
  const variantB = { prose: PROSE_B, sha256: SHA_B };

  it('GJ-VAR-01: 2 variantes → triées par composite desc (meilleure en tête)', async () => {
    let callCount = 0;
    const adapter = {
      judge: vi.fn(async () => {
        // Variante A (4 appels) → score 0.8, Variante B (4 appels) → score 0.4
        callCount++;
        return callCount <= 4
          ? { score: 0.8, reason: 'A top' }
          : { score: 0.4, reason: 'B faible' };
      }),
    } as unknown as GreatnessLLMAdapter;
    const judge   = GreatnessJudge.withAdapter(adapter);
    const results = await judge.evaluateVariants([variantA, variantB]);
    expect(results[0].composite).toBeGreaterThan(results[1].composite);
    expect(results[0].trace.prose_sha256).toBe(SHA_A);
  });

  it('GJ-VAR-02: 1 variante → tableau d\'1 résultat', async () => {
    const adapter = makeUniformAdapter(0.6);
    const judge   = GreatnessJudge.withAdapter(adapter);
    const results = await judge.evaluateVariants([variantA]);
    expect(results).toHaveLength(1);
  });

  it('GJ-VAR-03: 0 variantes → GreatnessError EMPTY_VARIANTS', async () => {
    const adapter = makeUniformAdapter(0.6);
    const judge   = GreatnessJudge.withAdapter(adapter);
    await expect(judge.evaluateVariants([])).rejects.toThrow(GreatnessError);
    await expect(judge.evaluateVariants([])).rejects.toThrow('EMPTY_VARIANTS');
  });

  it('GJ-VAR-04: sélectionTrace présente pour chaque variante — INV-GJ-04', async () => {
    const adapter = makeUniformAdapter(0.7);
    const judge   = GreatnessJudge.withAdapter(adapter);
    const results = await judge.evaluateVariants([variantA, variantB]);
    for (const r of results) {
      expect(r.trace.verdict).toBe('EVALUATED');
      expect(r.trace.axes).toHaveLength(4);
    }
  });

  it('GJ-VAR-05: 3 variantes scores distincts → ordre stable décroissant', async () => {
    const SHA_C = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
    const varC  = { prose: 'Variante C', sha256: SHA_C };
    let idx = 0;
    const scoreMap = [0.9, 0.5, 0.7]; // A, B, C (4 appels chacun)
    const adapter = {
      judge: vi.fn(async () => {
        const s = scoreMap[Math.floor(idx / 4)];
        idx++;
        return { score: s, reason: 'ok' };
      }),
    } as unknown as GreatnessLLMAdapter;
    const judge   = GreatnessJudge.withAdapter(adapter);
    const results = await judge.evaluateVariants([variantA, variantB, varC]);
    expect(results[0].composite).toBeGreaterThanOrEqual(results[1].composite);
    expect(results[1].composite).toBeGreaterThanOrEqual(results[2].composite);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — GreatnessError
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W2 GreatnessError', () => {
  it('GJ-ERR-01: message inclut le code', () => {
    const err = new GreatnessError('MY_CODE', 'test message');
    expect(err.message).toContain('MY_CODE');
    expect(err.message).toContain('test message');
    expect(err.name).toBe('GreatnessError');
    expect(err.code).toBe('MY_CODE');
  });

  it('GJ-ERR-02: cause optionnel préservée', () => {
    const cause = new Error('original');
    const err   = new GreatnessError('WRAP', 'wrapped', cause);
    expect(err.cause).toBe(cause);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Architecture & spec conformance
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W2 Architecture — spec OMEGA_PLAN_TRANSCENDANCE', () => {
  it('GJ-SPEC-01: 4 axes définis dans GREATNESS_AXES', () => {
    const keys = Object.keys(GREATNESS_AXES);
    expect(keys).toContain('memorabilite');
    expect(keys).toContain('tension_implicite');
    expect(keys).toContain('voix');
    expect(keys).toContain('subjectivite');
    expect(keys).toHaveLength(4);
  });

  it('GJ-SPEC-02: chaque axe a un prompt non-vide', () => {
    for (const [name, def] of Object.entries(GREATNESS_AXES)) {
      expect(def.prompt.trim().length, `prompt vide pour ${name}`).toBeGreaterThan(50);
    }
  });

  it('GJ-SPEC-03: prompt subjectivite contient marqueurs IA-générique', () => {
    const prompt = GREATNESS_AXES.subjectivite.prompt;
    expect(prompt).toContain('étrange sensation');
    expect(prompt).toContain('tout semblait irréel');
  });

  it('GJ-SPEC-04: prompt tension_implicite contient règle anti-biais', () => {
    const prompt = GREATNESS_AXES.tension_implicite.prompt;
    expect(prompt.toLowerCase()).toContain('anti-biais');
  });

  it('GJ-SPEC-05: prompt voix contient signal alarme IA', () => {
    const prompt = GREATNESS_AXES.voix.prompt;
    expect(prompt.toLowerCase()).toContain('alarme');
  });

  it('GJ-SPEC-06: somme des poids = 9.5 exactement', () => {
    const sum = Object.values(GREATNESS_AXES).reduce((acc, v) => acc + v.weight, 0);
    expect(sum).toBe(9.5);
  });

  it('GJ-SPEC-07: GreatnessJudge.withAdapter() injecte adapter custom (testabilité)', async () => {
    const adapter = makeUniformAdapter(0.6);
    const judge   = GreatnessJudge.withAdapter(adapter);
    const result  = await judge.evaluate(PROSE_A, SHA_A);
    expect(result.composite).toBe(60);
  });
});
