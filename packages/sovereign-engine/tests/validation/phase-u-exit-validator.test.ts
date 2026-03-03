/**
 * phase-u-exit-validator.test.ts
 * U-W5 — Tests du Phase U Exit Criteria Validator
 *
 * Couverture :
 *   - median()                    — pure CALC
 *   - computeGainPct()            — pure CALC
 *   - computeSealRateTopK()       — pure CALC
 *   - computeSealRateOneShot()    — pure CALC
 *   - PhaseUExitValidator.evaluate() — métriques + verdicts
 *   - Invariants INV-EU-01 à INV-EU-05
 *
 * 100% CALC — 0 appel LLM.
 * Standard: NASA-Grade L4 / DO-178C — PASS ou FAIL
 */

import { describe, it, expect } from 'vitest';
import {
  median,
  computeGainPct,
  computeSealRateTopK,
  computeSealRateOneShot,
  PhaseUExitValidator,
  PhaseUExitError,
  MIN_RUNS,
  GREATNESS_MEDIAN_MIN,
  GAIN_PCT_MIN,
  type OneShotRecord,
} from '../../src/validation/phase-u/phase-u-exit-validator';
import type { KSelectionReport, VariantRecord } from '../../src/validation/phase-u/top-k-selection';
import type { GreatnessResult, AxisScore } from '../../src/validation/phase-u/greatness-judge';
import { GREATNESS_AXES } from '../../src/validation/phase-u/greatness-judge';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAxes(composite: number): AxisScore[] {
  return (['memorabilite', 'tension_implicite', 'voix', 'subjectivite'] as const).map(axis => ({
    axis,
    score:  composite / 100,
    reason: `ok-${axis}`,
    weight: GREATNESS_AXES[axis].weight,
  }));
}

function makeGreatnessResult(composite: number): GreatnessResult {
  const axes = makeAxes(composite);
  return {
    composite,
    axes,
    trace: { prose_sha256: 'a'.repeat(64), evaluated_at: new Date().toISOString(), axes, composite, verdict: 'EVALUATED' },
  };
}

function makeTop1(composite: number): VariantRecord {
  return {
    seed:           'seed-test',
    variant_index:  0,
    forge_result:   { final_prose: 'prose', verdict: 'SEAL' } as never,
    prose_sha256:   'a'.repeat(64),
    survived_seal:  true,
    greatness:      makeGreatnessResult(composite),
  };
}

function makeKReport(composite: number, kSurvivedSeal = 8, kGenerated = 16): KSelectionReport {
  return {
    run_id:          `run-${Math.random()}`,
    k_requested:     16,
    k_generated:     kGenerated,
    k_survived_seal: kSurvivedSeal,
    k_evaluated:     kSurvivedSeal,
    variants:        [],
    top1:            makeTop1(composite),
    top1_composite:  composite,
    gain_vs_first:   5,
    created_at:      new Date().toISOString(),
  };
}

function makeOneShotRecord(verdict: 'SEAL' | 'REJECT', sComposite = 70): OneShotRecord {
  return { run_id: `os-${Math.random()}`, verdict, s_composite: sComposite };
}

/** Génère N KSelectionReport avec composite donné */
function makeReports(n: number, composite = 80, sealRate = 0.8): KSelectionReport[] {
  return Array.from({ length: n }, () => makeKReport(composite, Math.round(16 * sealRate)));
}

/** Génère N OneShotRecord avec SEAL rate et composite donnés */
function makeOneShotRecords(n: number, sealRate = 0.7, composite = 60): OneShotRecord[] {
  return Array.from({ length: n }, (_, i) => makeOneShotRecord(
    i < Math.round(n * sealRate) ? 'SEAL' : 'REJECT',
    composite,
  ));
}

const validator = new PhaseUExitValidator();

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — median() — pure CALC
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W5 median() — INV-EU-01', () => {

  it('EU-MED-01: [5] → 5', () => {
    expect(median([5])).toBe(5);
  });

  it('EU-MED-02: [1, 2, 3] → 2 (impair)', () => {
    expect(median([1, 2, 3])).toBe(2);
  });

  it('EU-MED-03: [1, 2, 3, 4] → 2.5 (pair)', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('EU-MED-04: tableau non trié → même résultat', () => {
    expect(median([3, 1, 4, 1, 5])).toBe(3);
  });

  it('EU-MED-05: [75, 80, 85, 90, 70] → 80', () => {
    expect(median([75, 80, 85, 90, 70])).toBe(80);
  });

  it('EU-MED-06: tableau vide → PhaseUExitError EMPTY_ARRAY', () => {
    expect(() => median([])).toThrow(PhaseUExitError);
    expect(() => median([])).toThrow('EMPTY_ARRAY');
  });

  it('EU-MED-07: tous égaux → valeur unique', () => {
    expect(median([77, 77, 77, 77])).toBe(77);
  });

  it('EU-MED-08: arrondi à 2 décimales', () => {
    const result = median([1, 2]);
    expect(result).toBe(Math.round(result * 100) / 100);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — computeGainPct() — pure CALC
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W5 computeGainPct() — INV-EU-02', () => {

  it('EU-GAIN-01: topK=80, oneShot=60 → gain = 33.33%', () => {
    expect(computeGainPct(80, 60)).toBeCloseTo(33.33, 1);
  });

  it('EU-GAIN-02: topK=75, oneShot=75 → gain = 0%', () => {
    expect(computeGainPct(75, 75)).toBe(0);
  });

  it('EU-GAIN-03: topK=60, oneShot=80 → gain négatif', () => {
    expect(computeGainPct(60, 80)).toBeLessThan(0);
  });

  it('EU-GAIN-04: oneShot=0 → PhaseUExitError DIVISION_BY_ZERO', () => {
    expect(() => computeGainPct(80, 0)).toThrow(PhaseUExitError);
    expect(() => computeGainPct(80, 0)).toThrow('DIVISION_BY_ZERO');
  });

  it('EU-GAIN-05: gain ≥ 15% si topK=80, oneShot=69 → seuil dépassé', () => {
    expect(computeGainPct(80, 69)).toBeGreaterThan(15);
  });

  it('EU-GAIN-06: arrondi à 2 décimales', () => {
    const g = computeGainPct(80, 60);
    expect(g).toBe(Math.round(g * 100) / 100);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — computeSealRateTopK() / computeSealRateOneShot()
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W5 computeSealRate — INV-EU-03', () => {

  it('EU-SR-01: 8/16 sur 1 rapport → 0.5', () => {
    expect(computeSealRateTopK([makeKReport(80, 8, 16)])).toBe(0.5);
  });

  it('EU-SR-02: 0 généré → 0', () => {
    expect(computeSealRateTopK([])).toBe(0);
  });

  it('EU-SR-03: 2 rapports 8/16 chacun → 0.5', () => {
    expect(computeSealRateTopK([makeKReport(80, 8, 16), makeKReport(80, 8, 16)])).toBe(0.5);
  });

  it('EU-SR-04: oneShot 7/10 SEAL → 0.7', () => {
    const records = makeOneShotRecords(10, 0.7);
    expect(computeSealRateOneShot(records)).toBe(0.7);
  });

  it('EU-SR-05: oneShot vide → 0', () => {
    expect(computeSealRateOneShot([])).toBe(0);
  });

  it('EU-SR-06: oneShot 100% SEAL → 1.0', () => {
    const records = Array.from({ length: 5 }, () => makeOneShotRecord('SEAL', 93));
    expect(computeSealRateOneShot(records)).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — PhaseUExitValidator : INSUFFICIENT_DATA
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W5 PhaseUExitValidator — INSUFFICIENT_DATA — INV-EU-05', () => {

  it('EU-INSUF-01: 0 runs → INSUFFICIENT_DATA', () => {
    const r = validator.evaluate([], []);
    expect(r.verdict).toBe('INSUFFICIENT_DATA');
  });

  it('EU-INSUF-02: topK < MIN_RUNS → INSUFFICIENT_DATA', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS - 1),
      makeOneShotRecords(MIN_RUNS),
    );
    expect(r.verdict).toBe('INSUFFICIENT_DATA');
  });

  it('EU-INSUF-03: oneShot < MIN_RUNS → INSUFFICIENT_DATA', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS),
      makeOneShotRecords(MIN_RUNS - 1),
    );
    expect(r.verdict).toBe('INSUFFICIENT_DATA');
  });

  it('EU-INSUF-04: INSUFFICIENT_DATA → metrics = []', () => {
    const r = validator.evaluate(makeReports(5), makeOneShotRecords(5));
    expect(r.metrics).toHaveLength(0);
  });

  it('EU-INSUF-05: blocking_failures contient raison INSUFFICIENT_DATA', () => {
    const r = validator.evaluate([], []);
    expect(r.blocking_failures[0]).toContain('INSUFFICIENT_DATA');
  });

  it('EU-INSUF-06: MIN_RUNS = 30', () => {
    expect(MIN_RUNS).toBe(30);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — PhaseUExitValidator : verdict PASS
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W5 PhaseUExitValidator — verdict PASS', () => {

  it('EU-PASS-01: tous critères atteints → PASS', () => {
    // médiane topK = 80 ≥ 75 ✅
    // oneShot composite = 60, gain = (80-60)/60×100 = 33% ≥ 15% ✅
    // SEAL rate topK = 8/16 = 0.5 ≥ oneShot = 0.3 ✅
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),       // topK composite=80, sealRate=0.5
      makeOneShotRecords(MIN_RUNS, 0.3, 60), // oneShot composite=60, sealRate=0.3
    );
    expect(r.verdict).toBe('PASS');
    expect(r.blocking_failures).toHaveLength(0);
  });

  it('EU-PASS-02: PASS → 4 métriques présentes', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),
      makeOneShotRecords(MIN_RUNS, 0.3, 60),
    );
    expect(r.metrics).toHaveLength(4);
  });

  it('EU-PASS-03: PASS → greatness_median ≥ 75', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),
      makeOneShotRecords(MIN_RUNS, 0.3, 60),
    );
    expect(r.greatness_median).toBeGreaterThanOrEqual(GREATNESS_MEDIAN_MIN);
  });

  it('EU-PASS-04: PASS → gain_pct ≥ 15%', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),
      makeOneShotRecords(MIN_RUNS, 0.3, 60),
    );
    expect(r.gain_pct).toBeGreaterThanOrEqual(GAIN_PCT_MIN);
  });

  it('EU-PASS-05: PASS → seal_rate_topk ≥ seal_rate_oneshot', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),
      makeOneShotRecords(MIN_RUNS, 0.3, 60),
    );
    expect(r.seal_rate_topk).toBeGreaterThanOrEqual(r.seal_rate_oneshot);
  });

  it('EU-PASS-06: MET-EU-04 PASS si runs ≥ MIN_RUNS', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),
      makeOneShotRecords(MIN_RUNS, 0.3, 60),
    );
    const met04 = r.metrics.find(m => m.name === 'MET-EU-04');
    expect(met04?.pass).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — PhaseUExitValidator : verdict FAIL (critères individuels)
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W5 PhaseUExitValidator — verdict FAIL', () => {

  it('EU-FAIL-01: médiane topK < 75 → MET-EU-01 FAIL', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 70, 0.5),        // composite=70 < seuil 75
      makeOneShotRecords(MIN_RUNS, 0.3, 50),
    );
    const met01 = r.metrics.find(m => m.name === 'MET-EU-01');
    expect(met01?.pass).toBe(false);
    expect(r.verdict).toBe('FAIL');
  });

  it('EU-FAIL-02: gain < 15% → MET-EU-02 FAIL', () => {
    // topK=76, oneShot=75 → gain ≈ 1.3% < 15%
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 76, 0.7),
      makeOneShotRecords(MIN_RUNS, 0.7, 75),
    );
    const met02 = r.metrics.find(m => m.name === 'MET-EU-02');
    expect(met02?.pass).toBe(false);
    expect(r.verdict).toBe('FAIL');
  });

  it('EU-FAIL-03: SEAL rate topK < oneShot → MET-EU-03 FAIL (régression)', () => {
    // topK sealRate=0.2 < oneShot sealRate=0.8
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.2),
      makeOneShotRecords(MIN_RUNS, 0.8, 60),
    );
    const met03 = r.metrics.find(m => m.name === 'MET-EU-03');
    expect(met03?.pass).toBe(false);
    expect(r.verdict).toBe('FAIL');
  });

  it('EU-FAIL-04: plusieurs critères FAIL → tous dans blocking_failures', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 60, 0.2),       // médiane 60 < 75, sealRate trop bas
      makeOneShotRecords(MIN_RUNS, 0.8, 55), // sealRate oneShot haut → régression
    );
    expect(r.blocking_failures.length).toBeGreaterThan(1);
    expect(r.verdict).toBe('FAIL');
  });

  it('EU-FAIL-05: FAIL → 4 métriques quand même présentes', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 60, 0.2),
      makeOneShotRecords(MIN_RUNS, 0.8, 55),
    );
    expect(r.metrics).toHaveLength(4);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — Structure du rapport — INV-EU-04
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W5 PhaseUExitReport structure — INV-EU-04', () => {

  it('EU-REP-01: rapport contient tous les champs requis', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),
      makeOneShotRecords(MIN_RUNS, 0.3, 60),
    );
    expect(typeof r.verdict).toBe('string');
    expect(typeof r.runs_topk).toBe('number');
    expect(typeof r.runs_oneshot).toBe('number');
    expect(Array.isArray(r.metrics)).toBe(true);
    expect(typeof r.greatness_median).toBe('number');
    expect(typeof r.gain_pct).toBe('number');
    expect(typeof r.seal_rate_topk).toBe('number');
    expect(typeof r.seal_rate_oneshot).toBe('number');
    expect(typeof r.created_at).toBe('string');
    expect(Array.isArray(r.blocking_failures)).toBe(true);
  });

  it('EU-REP-02: created_at est ISO 8601 valide', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),
      makeOneShotRecords(MIN_RUNS, 0.3, 60),
    );
    expect(new Date(r.created_at).toISOString()).toBe(r.created_at);
  });

  it('EU-REP-03: chaque MetricResult a name, value, threshold, pass, detail', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),
      makeOneShotRecords(MIN_RUNS, 0.3, 60),
    );
    for (const m of r.metrics) {
      expect(m.name).toBeTruthy();
      expect(typeof m.value).toBe('number');
      expect(typeof m.threshold).toBe('number');
      expect(typeof m.pass).toBe('boolean');
      expect(m.detail.trim().length).toBeGreaterThan(0);
    }
  });

  it('EU-REP-04: runs_topk = topKReports.length', () => {
    const n = 35;
    const r = validator.evaluate(
      makeReports(n, 80, 0.5),
      makeOneShotRecords(n, 0.3, 60),
    );
    expect(r.runs_topk).toBe(n);
  });

  it('EU-REP-05: seuils spec OMEGA — GREATNESS_MEDIAN_MIN=75, GAIN_PCT_MIN=15', () => {
    expect(GREATNESS_MEDIAN_MIN).toBe(75);
    expect(GAIN_PCT_MIN).toBe(15);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 8 — PhaseUExitError
// ══════════════════════════════════════════════════════════════════════════════

describe('U-W5 PhaseUExitError', () => {

  it('EU-ERR-01: message inclut le code', () => {
    const e = new PhaseUExitError('TEST', 'msg');
    expect(e.message).toContain('TEST');
    expect(e.name).toBe('PhaseUExitError');
  });
});
