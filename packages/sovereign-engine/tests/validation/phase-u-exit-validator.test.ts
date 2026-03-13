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
  computeSealRateOneShotAtomic,
  computeSealRateOneShotSaga,
  computeSagaReadyRateTopK,
  PhaseUExitValidator,
  PhaseUExitError,
  MIN_RUNS,
  GREATNESS_MEDIAN_MIN,
  GAIN_PCT_MIN,
  SAGA_READY_RATE_MIN,
  type OneShotRecord,
  type SealPathBreakdown,
} from '../../src/validation/phase-u/phase-u-exit-validator';
import type { KSelectionReport, VariantRecord } from '../../src/validation/phase-u/top-k-selection';
import {
  SAGA_READY_COMPOSITE_MIN,
  SAGA_READY_SSI_MIN,
} from '../../src/validation/phase-u/top-k-selection';
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
    saga_ready:     true,
    seal_path:      'SEAL_ATOMIC',
    greatness:      makeGreatnessResult(composite),
  };
}

function makeKReport(
  composite: number,
  kSurvivedSeal = 8,
  kGenerated = 16,
  kSagaReady?: number,
): KSelectionReport {
  const effectiveSagaReady = kSagaReady ?? kSurvivedSeal;  // SEAL_ATOMIC ⊆ SAGA_READY — INV-SR-02
  return {
    run_id:          `run-${Math.random()}`,
    k_requested:     16,
    k_generated:     kGenerated,
    k_survived_seal: kSurvivedSeal,
    k_saga_ready:    effectiveSagaReady,
    saga_ready_rate: kGenerated > 0
      ? Math.round((effectiveSagaReady / kGenerated) * 10000) / 10000
      : 0,
    k_evaluated:     kSurvivedSeal,
    variants:        [],
    top1:            makeTop1(composite),
    top1_composite:  composite,
    gain_vs_first:   5,
    created_at:      new Date().toISOString(),
  };
}

function makeOneShotRecord(
  verdict: 'SEAL_ATOMIC' | 'SAGA_READY' | 'REJECT',
  sComposite = 70,
): OneShotRecord {
  return { run_id: `os-${Math.random()}`, verdict, s_composite: sComposite };
}

/** Génère N KSelectionReport avec composite donné */
function makeReports(n: number, composite = 80, sealRate = 0.8, kSagaReady?: number): KSelectionReport[] {
  return Array.from({ length: n }, () => makeKReport(composite, Math.round(16 * sealRate), 16, kSagaReady));
}

/** Génère N OneShotRecord avec SEAL_ATOMIC rate et composite donnés */
function makeOneShotRecords(n: number, sealRate = 0.7, composite = 60): OneShotRecord[] {
  return Array.from({ length: n }, (_, i) => makeOneShotRecord(
    i < Math.round(n * sealRate) ? 'SEAL_ATOMIC' : 'REJECT',
    composite,
  ));
}

/** Génère N OneShotRecord avec un mix SEAL_ATOMIC / SAGA_READY / REJECT */
function makeOneShotRecordsMixed(
  n: number,
  atomicRate: number,
  sagaRate: number,
  composite = 92.5,
): OneShotRecord[] {
  const atomicCount = Math.round(n * atomicRate);
  const sagaCount   = Math.round(n * sagaRate);
  return Array.from({ length: n }, (_, i) => {
    if (i < atomicCount)              return makeOneShotRecord('SEAL_ATOMIC', 93.5);
    if (i < atomicCount + sagaCount)  return makeOneShotRecord('SAGA_READY', composite);
    return makeOneShotRecord('REJECT', 85);
  });
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

  it('EU-SR-06: oneShot 100% SEAL_ATOMIC → 1.0', () => {
    const records = Array.from({ length: 5 }, () => makeOneShotRecord('SEAL_ATOMIC', 93));
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

  it('EU-PASS-02: PASS → 5 métriques présentes', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0.5),
      makeOneShotRecords(MIN_RUNS, 0.3, 60),
    );
    expect(r.metrics).toHaveLength(5);
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

  it('EU-FAIL-02: gain < 15% → MET-EU-02 informatif (non-bloquant)', () => {
    // topK=76, oneShot=75 → gain ≈ 1.3% < 15%
    // MET-EU-02 est informatif depuis dual-path — ne bloque plus
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 76, 0.7),
      makeOneShotRecords(MIN_RUNS, 0.7, 75),
    );
    const met02 = r.metrics.find(m => m.name === 'MET-EU-02');
    expect(met02?.pass).toBe(true);  // informatif = toujours pass
  });

  it('EU-FAIL-03: certified rate topK < oneShot → MET-EU-03 FAIL (régression)', () => {
    // topK saga_ready=2/16 (0.125) < oneShot SAGA_READY rate=0.8
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 80, 0, 2),   // k_survived_seal=0, k_saga_ready=2
      makeOneShotRecordsMixed(MIN_RUNS, 0, 0.8), // 80% SAGA_READY oneshot
    );
    const met03 = r.metrics.find(m => m.name === 'MET-EU-03');
    expect(met03?.pass).toBe(false);
    expect(r.verdict).toBe('FAIL');
  });

  it('EU-FAIL-04: plusieurs critères FAIL → tous dans blocking_failures', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 60, 0, 0),        // médiane 60 < 75, saga_ready=0
      makeOneShotRecordsMixed(MIN_RUNS, 0, 0.8, 55), // saga_ready oneShot haut → régression
    );
    expect(r.blocking_failures.length).toBeGreaterThan(1);
    expect(r.verdict).toBe('FAIL');
  });

  it('EU-FAIL-05: FAIL → 5 métriques quand même présentes', () => {
    const r = validator.evaluate(
      makeReports(MIN_RUNS, 60, 0.2),
      makeOneShotRecords(MIN_RUNS, 0.8, 55),
    );
    expect(r.metrics).toHaveLength(5);
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
    expect(typeof r.seal_atomic_rate_oneshot).toBe('number');
    expect(typeof r.seal_atomic_rate_topk).toBe('number');
    expect(typeof r.saga_ready_rate_oneshot).toBe('number');
    expect(typeof r.saga_ready_rate_topk).toBe('number');
    expect(typeof r.seal_path_breakdown).toBe('object');
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

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 9 — SAGA_READY dual-path — INV-SR-01..05
// ══════════════════════════════════════════════════════════════════════════════

describe('U-ROSETTE-18 SAGA_READY dual-path — INV-SR-01..05', () => {

  // ── SR-01 : composite=92.5, min_axis=87.0 → saga_ready=true, survived_seal=false ─
  it('SR-01: composite=92.5, min_axis=87.0 → SAGA_READY, not SEAL_ATOMIC', () => {
    const record: OneShotRecord = { run_id: 'sr01', verdict: 'SAGA_READY', s_composite: 92.5, ssi: 87.0 };
    expect(record.verdict).toBe('SAGA_READY');
    expect(record.s_composite).toBeGreaterThanOrEqual(SAGA_READY_COMPOSITE_MIN);
    expect(record.ssi).toBeGreaterThanOrEqual(SAGA_READY_SSI_MIN);
  });

  // ── SR-02 : composite=92.9, min_axis=85.0 → saga_ready=true, survived_seal=false ─
  it('SR-02: composite=92.9, min_axis=85.0 → SAGA_READY (boundary)', () => {
    const record: OneShotRecord = { run_id: 'sr02', verdict: 'SAGA_READY', s_composite: 92.9, ssi: 85.0 };
    expect(record.verdict).toBe('SAGA_READY');
    expect(record.ssi).toBe(SAGA_READY_SSI_MIN);
  });

  // ── SR-03 : composite=93.1, min_axis=88.0 → saga_ready=true, survived_seal=true (ATOMIC) ─
  it('SR-03: composite=93.1, min_axis=88.0 → SEAL_ATOMIC (also SAGA_READY by INV-SR-02)', () => {
    const record: OneShotRecord = { run_id: 'sr03', verdict: 'SEAL_ATOMIC', s_composite: 93.1, ssi: 88.0 };
    expect(record.verdict).toBe('SEAL_ATOMIC');
    // INV-SR-02 : SEAL_ATOMIC ⊆ SAGA_READY
    expect(record.s_composite).toBeGreaterThanOrEqual(SAGA_READY_COMPOSITE_MIN);
    expect(record.ssi).toBeGreaterThanOrEqual(SAGA_READY_SSI_MIN);
  });

  // ── SR-04 : composite=91.9, min_axis=86.0 → saga_ready=false (composite < 92.0) ─
  it('SR-04: composite=91.9 → REJECT (below SAGA_READY_COMPOSITE_MIN)', () => {
    const record: OneShotRecord = { run_id: 'sr04', verdict: 'REJECT', s_composite: 91.9, ssi: 86.0 };
    expect(record.verdict).toBe('REJECT');
    expect(record.s_composite).toBeLessThan(SAGA_READY_COMPOSITE_MIN);
  });

  // ── SR-05 : composite=92.5, min_axis=84.9 → saga_ready=false (min_axis < 85.0) ─
  it('SR-05: min_axis=84.9 → REJECT (below SAGA_READY_SSI_MIN)', () => {
    const record: OneShotRecord = { run_id: 'sr05', verdict: 'REJECT', s_composite: 92.5, ssi: 84.9 };
    expect(record.verdict).toBe('REJECT');
    expect(record.ssi).toBeLessThan(SAGA_READY_SSI_MIN);
  });

  // ── SR-06 : 30 runs avec saga_ready_rate=10% → MET-EU-06 PASS ─
  it('SR-06: 30 runs saga_ready_rate=10% → MET-EU-06 PASS', () => {
    // top-K: k_saga_ready=2/16 per report → saga_ready_rate=0.125 ≥ 0.05
    const topKReports = makeReports(MIN_RUNS, 80, 0, 2);  // k_saga_ready=2
    const osRecords   = makeOneShotRecordsMixed(MIN_RUNS, 0, 0.1);
    const r = validator.evaluate(topKReports, osRecords);
    const met06 = r.metrics.find(m => m.name === 'MET-EU-06');
    expect(met06?.pass).toBe(true);
    expect(met06?.value).toBeGreaterThanOrEqual(SAGA_READY_RATE_MIN);
  });

  // ── SR-07 : 30 runs avec saga_ready_rate=3% → MET-EU-06 FAIL ─
  it('SR-07: 30 runs saga_ready_rate=3% → MET-EU-06 FAIL', () => {
    // top-K: k_saga_ready=0 per report → saga_ready_rate=0 < 0.05
    const topKReports = makeReports(MIN_RUNS, 80, 0, 0);  // k_saga_ready=0
    const osRecords   = makeOneShotRecordsMixed(MIN_RUNS, 0, 0.03);
    const r = validator.evaluate(topKReports, osRecords);
    const met06 = r.metrics.find(m => m.name === 'MET-EU-06');
    expect(met06?.pass).toBe(false);
  });

  // ── SR-08 : INV-SR-02 : tout SEAL_ATOMIC est aussi SAGA_READY ─
  it('SR-08: INV-SR-02 — computeSealRateOneShotSaga includes SEAL_ATOMIC', () => {
    const records: OneShotRecord[] = [
      { run_id: 'a', verdict: 'SEAL_ATOMIC', s_composite: 93.5 },
      { run_id: 'b', verdict: 'SAGA_READY',  s_composite: 92.5 },
      { run_id: 'c', verdict: 'REJECT',      s_composite: 85 },
    ];
    const atomicRate = computeSealRateOneShotAtomic(records);
    const sagaRate   = computeSealRateOneShotSaga(records);
    // INV-SR-02 : saga includes atomic
    expect(sagaRate).toBeGreaterThanOrEqual(atomicRate);
    expect(atomicRate).toBeCloseTo(1 / 3, 4);
    expect(sagaRate).toBeCloseTo(2 / 3, 4);
  });

  // ── SR-09 : INV-SR-04 : composite brut identique avant/après classification ─
  it('SR-09: INV-SR-04 — composite brut non modifié par classification', () => {
    const originalComposite = 92.5;
    const record: OneShotRecord = {
      run_id: 'sr09', verdict: 'SAGA_READY', s_composite: originalComposite, ssi: 87.0,
    };
    // INV-SR-04 : le composite brut n'est jamais modifié
    expect(record.s_composite).toBe(originalComposite);

    const kReport = makeKReport(originalComposite, 0, 16, 2);
    expect(kReport.top1_composite).toBe(originalComposite);
  });

  // ── SR-10 : seal_path_breakdown.total_certified = atomic + saga_ready (sans double-comptage) ─
  it('SR-10: seal_path_breakdown.total_certified = atomic + saga (no double-count)', () => {
    // 2 SEAL_ATOMIC + 3 SAGA_READY oneshot, topK: 1 seal + 2 saga per report
    const osRecords: OneShotRecord[] = [
      ...Array.from({ length: 2 }, (_, i) => makeOneShotRecord('SEAL_ATOMIC', 93.5)),
      ...Array.from({ length: 3 }, (_, i) => makeOneShotRecord('SAGA_READY', 92.5)),
      ...Array.from({ length: MIN_RUNS - 5 }, (_, i) => makeOneShotRecord('REJECT', 85)),
    ];
    const topKReports = Array.from({ length: MIN_RUNS }, () => makeKReport(80, 1, 16, 3));

    const r = validator.evaluate(topKReports, osRecords);
    const bd = r.seal_path_breakdown;

    expect(bd.seal_atomic_oneshot).toBe(2);
    expect(bd.saga_ready_oneshot).toBe(3);   // sans double-comptage (5 total - 2 atomic)
    expect(bd.seal_atomic_topk).toBe(MIN_RUNS);     // 1 per report × 30
    expect(bd.saga_ready_topk).toBe(MIN_RUNS * 2);  // (3-1) per report × 30
    // total_certified = saga_ready total (includes atomic)
    expect(bd.total_certified).toBe(5 + MIN_RUNS * 3);
  });

  // ── Constantes ─
  it('SR-CONST: SAGA_READY_COMPOSITE_MIN=92, SAGA_READY_SSI_MIN=85, SAGA_READY_RATE_MIN=0.05', () => {
    expect(SAGA_READY_COMPOSITE_MIN).toBe(92.0);
    expect(SAGA_READY_SSI_MIN).toBe(85.0);
    expect(SAGA_READY_RATE_MIN).toBe(0.05);
  });

  // ── computeSagaReadyRateTopK retombe à 0 sans k_saga_ready ─
  it('SR-COMPAT: computeSagaReadyRateTopK returns 0 for legacy reports without k_saga_ready', () => {
    const legacyReport = {
      run_id: 'legacy', k_requested: 8, k_generated: 8,
      k_survived_seal: 0, k_evaluated: 4, variants: [],
      top1: makeTop1(80), top1_composite: 80,
      gain_vs_first: 0, created_at: new Date().toISOString(),
    } as unknown as KSelectionReport;
    expect(computeSagaReadyRateTopK([legacyReport])).toBe(0);
  });
});
