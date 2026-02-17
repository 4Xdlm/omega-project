import { describe, it, expect } from 'vitest';
import {
  calibrate, computeConformity, computeStability,
  computeCreativity, computeHonesty, computeC_llm,
  determineStrategy, computePasses, computeBudget,
  selectRotatingPrompts,
  type BenchmarkRun, type CalibrationInput,
} from '../../src/genius/genius-calibrator.js';
import { parseNoncompliance } from '../../src/genius/noncompliance-parser.js';

// ═══════════════════════════════════════════════════════════════════
// HELPER : créer un BenchmarkRun standard
// ═══════════════════════════════════════════════════════════════════

function makeRun(overrides: Partial<BenchmarkRun> & { prompt_id: string; prompt_type: 'core' | 'rotating' }): BenchmarkRun {
  return {
    hard_constraints_total: 4,
    hard_constraints_passed: 4,
    q_text_score: 92,
    S_score: 88,
    I_diagnostics: { contradictions_found: 0, false_causals: 0 },
    D_diagnostics: { stopword_ratio: 0.35 },
    R_diagnostics: { motif_recurrence: 0.7 },
    symbols_declared: 2,
    symbols_detected: 2,
    noncompliance: parseNoncompliance(''),
    ...overrides,
  };
}

function makeStandardRuns(): BenchmarkRun[] {
  const runs: BenchmarkRun[] = [];
  for (let i = 1; i <= 7; i++) {
    runs.push(makeRun({ prompt_id: `CORE-0${i}`, prompt_type: 'core' }));
  }
  for (let i = 1; i <= 3; i++) {
    runs.push(makeRun({ prompt_id: `ROT-0${i}`, prompt_type: 'rotating', S_score: 90 }));
  }
  return runs;
}

describe('GENIUS-03: C_llm Calibrator', () => {

  // ─────────────────────────────────────────────────────────────
  // TEST-G03-01 : C_llm calculé sur 10 prompts
  // ─────────────────────────────────────────────────────────────
  it('TEST-G03-01: C_llm computed from 10 benchmark runs', () => {
    const input: CalibrationInput = {
      runs: makeStandardRuns(),
      provider_id: 'claude-sonnet-4',
    };
    const result = calibrate(input);

    expect(result.C_llm).toBeGreaterThan(0);
    expect(result.C_llm).toBeLessThanOrEqual(1);
    expect(result.components.conformity).toBeGreaterThan(0);
    expect(result.components.stability).toBeGreaterThan(0);
    expect(result.components.creativity).toBeGreaterThan(0);
    expect(result.components.honesty).toBeGreaterThan(0);
    expect(result.benchmark_version).toBe('BENCHMARK_CORE_V1');
    expect(result.provider_id).toBe('claude-sonnet-4');
    expect(result.passes_recommended).toBeGreaterThanOrEqual(1);
    expect(result.budget_tokens).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST-G03-02 : C_llm > 0.85 → mono-pass [GENIUS-09]
  // ─────────────────────────────────────────────────────────────
  it('TEST-G03-02: C_llm > 0.85 → strategy mono-pass', () => {
    const runs = makeStandardRuns();
    const result = calibrate({ runs, provider_id: 'test' });
    expect(result.C_llm).toBeGreaterThan(0.85);
    expect(result.strategy).toBe('mono-pass');
  });

  // ─────────────────────────────────────────────────────────────
  // TEST-G03-03 : C_llm < 0.60 → max-assist [GENIUS-10]
  // ─────────────────────────────────────────────────────────────
  it('TEST-G03-03: C_llm < 0.60 → strategy max-assist', () => {
    const badScores = [30, 95, 42, 38, 55, 48, 60, 35, 45, 50];
    const runs = makeStandardRuns().map((r, i) => ({
      ...r,
      hard_constraints_passed: 1,
      q_text_score: badScores[i],
      S_score: 30,
      I_diagnostics: { contradictions_found: 3, false_causals: 4 },
      symbols_declared: 5,
      symbols_detected: 0,
    }));

    const result = calibrate({ runs, provider_id: 'test' });
    expect(result.C_llm).toBeLessThan(0.60);
    expect(result.strategy).toBe('max-assist');
  });

  // ─────────────────────────────────────────────────────────────
  // TEST-G03-04 : Honesty = 0.1 → C_llm chute [GENIUS-07]
  // ─────────────────────────────────────────────────────────────
  it('TEST-G03-04: low honesty collapses C_llm', () => {
    const runs = makeStandardRuns().map(r => ({
      ...r,
      I_diagnostics: { contradictions_found: 5, false_causals: 5 },
      D_diagnostics: { stopword_ratio: 0.70 },
      symbols_declared: 5,
      symbols_detected: 0,
      noncompliance: parseNoncompliance(
        'NONCOMPLIANCE: RYTHME | excuse1\nNONCOMPLIANCE: STRUCTURE | excuse2'
      ),
    }));
    const honesty = computeHonesty(runs);
    expect(honesty).toBeLessThan(0.3);

    const result = calibrate({ runs, provider_id: 'test' });
    expect(result.C_llm).toBeLessThan(0.70);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST-G03-05 : Budget tokens augmente sous 0.60 [GENIUS-08]
  // ─────────────────────────────────────────────────────────────
  it('TEST-G03-05: budget_tokens increases when C_llm < 0.60', () => {
    const T_base = 4000;
    const budget_low = computeBudget(0.40, T_base);
    const budget_high = computeBudget(0.90, T_base);
    expect(budget_low).toBeGreaterThan(budget_high);
    expect(budget_low).toBeGreaterThan(T_base * 1.3);
    expect(budget_low).toBeCloseTo(T_base * 1.6, 0);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST-G03-06 : Prompts tournants changent par semaine [GENIUS-14]
  // ─────────────────────────────────────────────────────────────
  it('TEST-G03-06: rotating prompts change weekly, deterministic', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `PROMPT-${i.toString().padStart(2, '0')}`);

    const week1a = selectRotatingPrompts(pool, '2026-W08');
    const week1b = selectRotatingPrompts(pool, '2026-W08');
    const week2 = selectRotatingPrompts(pool, '2026-W09');

    expect(week1a).toEqual(week1b);
    expect(week1a).not.toEqual(week2);
    expect(week1a).toHaveLength(3);
    expect(week2).toHaveLength(3);
    expect(new Set(week1a).size).toBe(3);
    expect(new Set(week2).size).toBe(3);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST-G03-07 : Q_system ne touche pas seal_granted [GENIUS-06]
  // ─────────────────────────────────────────────────────────────
  it('TEST-G03-07: CalibrationResult has no seal_granted field', () => {
    const result = calibrate({
      runs: makeStandardRuns(),
      provider_id: 'test',
    });
    expect(result).not.toHaveProperty('seal_granted');
    expect(result).not.toHaveProperty('seal_run');
    expect(result).not.toHaveProperty('reject');
    expect(result).not.toHaveProperty('verdict');
    expect(result.C_llm).toBeDefined();
    expect(result.strategy).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST-G03-08 : NONCOMPLIANCE parsé + penalties [GENIUS-27, GENIUS-29]
  // ─────────────────────────────────────────────────────────────
  it('TEST-G03-08: NONCOMPLIANCE parsed with penalty enforcement', () => {
    const r0 = parseNoncompliance('Texte normal sans déclaration.');
    expect(r0.count).toBe(0);
    expect(r0.h5_penalty).toBe(false);
    expect(r0.auto_pitch).toBe(false);

    const r1 = parseNoncompliance('NONCOMPLIANCE: RYTHME | phrase longue pour courbe Q3');
    expect(r1.count).toBe(1);
    expect(r1.declarations[0].section).toBe('RYTHME');
    expect(r1.declarations[0].reason).toContain('phrase longue');
    expect(r1.h5_penalty).toBe(false);
    expect(r1.auto_pitch).toBe(false);

    const r2 = parseNoncompliance(
      'NONCOMPLIANCE: RYTHME | raison1\nAutre texte\nNONCOMPLIANCE: LEXIQUE | raison2'
    );
    expect(r2.count).toBe(2);
    expect(r2.h5_penalty).toBe(true);
    expect(r2.auto_pitch).toBe(false);

    const r3 = parseNoncompliance(
      'NONCOMPLIANCE: A | r1\nNONCOMPLIANCE: B | r2\nNONCOMPLIANCE: C | r3'
    );
    expect(r3.count).toBe(3);
    expect(r3.h5_penalty).toBe(true);
    expect(r3.auto_pitch).toBe(true);
  });

  // ─── INVARIANTS ───

  it('C_llm is deterministic: same input → same output', () => {
    const runs = makeStandardRuns();
    const r1 = calibrate({ runs, provider_id: 'test' });
    const r2 = calibrate({ runs, provider_id: 'test' });
    expect(r1.C_llm).toBe(r2.C_llm);
    expect(r1.strategy).toBe(r2.strategy);
    expect(r1.passes_recommended).toBe(r2.passes_recommended);
  });

  it('C_llm bounded [0, 1]', () => {
    const r1 = calibrate({ runs: makeStandardRuns(), provider_id: 'test' });
    expect(r1.C_llm).toBeGreaterThanOrEqual(0);
    expect(r1.C_llm).toBeLessThanOrEqual(1);
  });

  it('empty runs → C_llm = 0', () => {
    const result = calibrate({ runs: [], provider_id: 'test' });
    expect(result.C_llm).toBe(0);
  });

  it('strategy boundaries are exact', () => {
    expect(determineStrategy(0.86)).toBe('mono-pass');
    expect(determineStrategy(0.85)).toBe('multi-pass');
    expect(determineStrategy(0.60)).toBe('multi-pass');
    expect(determineStrategy(0.59)).toBe('max-assist');
  });

  it('passes_recommended clamp [1, 10]', () => {
    expect(computePasses(0.01, 3)).toBeLessThanOrEqual(10);
    expect(computePasses(0.01, 3)).toBeGreaterThanOrEqual(1);
    expect(computePasses(1.0, 3)).toBe(3);
  });

  it('conformity = 0 when no core runs', () => {
    const rotatingOnly = makeStandardRuns().filter(r => r.prompt_type === 'rotating');
    expect(computeConformity(rotatingOnly)).toBe(0);
  });

  it('creativity = 0 when no rotating runs', () => {
    const coreOnly = makeStandardRuns().filter(r => r.prompt_type === 'core');
    expect(computeCreativity(coreOnly, 85)).toBe(0);
  });

  it('NONCOMPLIANCE parser handles malformed input gracefully', () => {
    const r = parseNoncompliance('NONCOMPLIANCE without pipe\nNONCOMPLIANCE: | empty section');
    expect(r.declarations.every(d => d.section.length > 0)).toBe(true);
  });
});
