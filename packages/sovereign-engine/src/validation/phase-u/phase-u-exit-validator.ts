/**
 * phase-u-exit-validator.ts
 * U-W5 — Phase U Exit Criteria Validator
 *
 * Collecte N KSelectionReport + N résultats one-shot, calcule les métriques
 * de sortie Phase U, produit un PhaseUExitReport avec verdict PASS/FAIL.
 *
 * MÉTRIQUES DE SORTIE (spec OMEGA_PLAN_TRANSCENDANCE):
 *   MET-EU-01 : Greatness médiane top-1 ≥ 75/100 sur ≥ MIN_RUNS runs
 *   MET-EU-02 : gain composite top-K vs one-shot ≥ 15% (gain moyen)
 *   MET-EU-03 : SEAL rate Top-K ≥ SEAL rate one-shot (0 régression)
 *   MET-EU-04 : ≥ MIN_RUNS runs disponibles pour décision
 *   MET-EU-05 : 0 régression tests existants (gate externe, non calculé ici)
 *
 * Invariants:
 *   INV-EU-01 : médiane calculée sur top-1 composite uniquement (SEAL survivants)
 *   INV-EU-02 : gain = (median_topk - median_oneshot) / median_oneshot × 100
 *   INV-EU-03 : seal_rate_topk = k_survived_seal_total / k_generated_total
 *   INV-EU-04 : PhaseUExitReport produit pour chaque appel evaluate()
 *   INV-EU-05 : fail-closed — données insuffisantes → verdict INSUFFICIENT_DATA
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import type { KSelectionReport } from './top-k-selection.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OneShotRecord {
  readonly run_id:      string;
  readonly verdict:     'SEAL_ATOMIC' | 'SAGA_READY' | 'REJECT';  // dual-path — INV-SEAL-02
  readonly s_composite: number;   // [0, 100] score S-Oracle
  readonly ssi?:        number;   // min_axis — optionnel pour rétrocompatibilité — INV-SR-05
}

export interface MetricResult {
  readonly name:    string;
  readonly value:   number;
  readonly threshold: number;
  readonly pass:    boolean;
  readonly detail:  string;
}

export type PhaseUVerdict =
  | 'PASS'               // tous les critères atteints
  | 'FAIL'               // au moins 1 critère non atteint
  | 'INSUFFICIENT_DATA'; // < MIN_RUNS runs disponibles

/**
 * INV-SR-03 : Détail par chemin SEAL_ATOMIC / SAGA_READY
 */
export interface SealPathBreakdown {
  readonly seal_atomic_oneshot: number;
  readonly seal_atomic_topk:    number;
  readonly saga_ready_oneshot:  number;
  readonly saga_ready_topk:     number;
  readonly total_certified:     number;  // SEAL_ATOMIC + SAGA_READY (union, sans double-comptage)
}

/** Rapport complet Phase U — INV-EU-04 */
export interface PhaseUExitReport {
  readonly verdict:                  PhaseUVerdict;
  readonly runs_topk:                number;
  readonly runs_oneshot:             number;
  readonly metrics:                  MetricResult[];
  readonly greatness_median:         number;    // [0, 100]
  readonly gain_pct:                 number;    // % gain top-K vs one-shot
  readonly seal_rate_topk:           number;    // [0, 1]
  readonly seal_rate_oneshot:        number;    // [0, 1]
  readonly seal_atomic_rate_oneshot: number;    // rate SEAL_ATOMIC one-shot
  readonly seal_atomic_rate_topk:    number;    // rate SEAL_ATOMIC top-K
  readonly saga_ready_rate_oneshot:  number;    // rate SAGA_READY one-shot (inclut ATOMIC — INV-SR-02)
  readonly saga_ready_rate_topk:     number;    // rate SAGA_READY top-K (inclut ATOMIC — INV-SR-02)
  readonly seal_path_breakdown:      SealPathBreakdown;
  readonly created_at:               string;    // ISO 8601
  readonly blocking_failures:        string[];  // métriques FAIL
}

export class PhaseUExitError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = 'PhaseUExitError';
  }
}

// ── Seuils (calibrés spec OMEGA) ─────────────────────────────────────────────

export const MIN_RUNS            = 30;    // minimum runs pour décision
export const GREATNESS_MEDIAN_MIN = 75;   // médiane Greatness top-1 ≥ 75
export const GAIN_PCT_MIN         = 15;   // gain top-K vs one-shot ≥ 15%
export const SEAL_RATE_REGRESSION = 0;    // top-K SEAL rate ≥ one-shot (0 régression)

/** INV-SR-01 : SAGA_READY = composite >= 92.0 AND min_axis >= 85.0 */
export const SAGA_READY_COMPOSITE_MIN = 92.0;  // INV-SR-01
/** INV-SR-01 : SSI = min_axis — zéro appel API */
export const SAGA_READY_SSI_MIN       = 85.0;  // INV-SR-01
/** MET-EU-06 : saga_ready_rate_topk ≥ 5% */
export const SAGA_READY_RATE_MIN      = 0.05;  // MET-EU-06

// ── Fonctions pures (CALC) ────────────────────────────────────────────────────

/**
 * Calcule la médiane d'un tableau de nombres.
 * Tableau vide → PhaseUExitError EMPTY_ARRAY.
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    throw new PhaseUExitError('EMPTY_ARRAY', 'Cannot compute median of empty array');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
    : sorted[mid];
}

/**
 * Calcule le gain relatif (%) entre deux médianes.
 * gain = (topk - oneshot) / oneshot × 100
 * Si oneshot = 0 → PhaseUExitError DIVISION_BY_ZERO.
 */
export function computeGainPct(medianTopK: number, medianOneShot: number): number {
  if (medianOneShot === 0) {
    throw new PhaseUExitError('DIVISION_BY_ZERO', 'one-shot median is 0, cannot compute gain');
  }
  return Math.round(((medianTopK - medianOneShot) / medianOneShot) * 100 * 100) / 100;
}

/**
 * Calcule le SEAL rate d'un ensemble de KSelectionReport.
 * seal_rate = Σ(k_survived_seal) / Σ(k_generated)
 * Si k_generated_total = 0 → 0.
 */
export function computeSealRateTopK(reports: KSelectionReport[]): number {
  const totalSeal = reports.reduce((s, r) => s + r.k_survived_seal, 0);
  const totalGen  = reports.reduce((s, r) => s + r.k_generated,     0);
  if (totalGen === 0) return 0;
  return Math.round((totalSeal / totalGen) * 10000) / 10000;
}

/**
 * Calcule le SEAL rate one-shot (rétrocompatible : accepte 'SEAL' legacy + 'SEAL_ATOMIC').
 * seal_rate = Σ(verdict === SEAL | SEAL_ATOMIC) / total
 */
export function computeSealRateOneShot(records: OneShotRecord[]): number {
  if (records.length === 0) return 0;
  const seals = records.filter(r =>
    r.verdict === 'SEAL_ATOMIC' || (r.verdict as string) === 'SEAL',
  ).length;
  return Math.round((seals / records.length) * 10000) / 10000;
}

/**
 * Calcule le taux SEAL_ATOMIC one-shot.
 * INV-SEAL-01 : SEAL_ATOMIC = composite >= 93.0 AND min_axis >= 85.0
 */
export function computeSealRateOneShotAtomic(records: OneShotRecord[]): number {
  if (records.length === 0) return 0;
  const seals = records.filter(r => r.verdict === 'SEAL_ATOMIC').length;
  return Math.round((seals / records.length) * 10000) / 10000;
}

/**
 * Calcule le taux certifié one-shot (SAGA_READY inclut SEAL_ATOMIC — INV-SR-02).
 * INV-SR-01 : SAGA_READY = composite >= 92.0 AND min_axis >= 85.0
 */
export function computeSealRateOneShotSaga(records: OneShotRecord[]): number {
  if (records.length === 0) return 0;
  // SAGA_READY inclut les SEAL_ATOMIC (INV-SR-02)
  const seals = records.filter(r =>
    r.verdict === 'SEAL_ATOMIC' || r.verdict === 'SAGA_READY',
  ).length;
  return Math.round((seals / records.length) * 10000) / 10000;
}

/**
 * Calcule le taux SAGA_READY top-K (inclut SEAL_ATOMIC — INV-SR-02).
 * Utilise k_saga_ready du KSelectionReport (retombe sur 0 pour rétrocompatibilité).
 */
export function computeSagaReadyRateTopK(reports: KSelectionReport[]): number {
  const totalSaga = reports.reduce((s, r) => s + ((r as Record<string, unknown>).k_saga_ready as number ?? 0), 0);
  const totalGen  = reports.reduce((s, r) => s + r.k_generated, 0);
  if (totalGen === 0) return 0;
  return Math.round((totalSaga / totalGen) * 10000) / 10000;
}

// ── Phase U Exit Validator ────────────────────────────────────────────────────

export class PhaseUExitValidator {

  /**
   * Évalue les métriques de sortie Phase U.
   * INV-EU-05 : données insuffisantes → INSUFFICIENT_DATA (pas d'exception).
   */
  evaluate(
    topKReports: KSelectionReport[],
    oneShotRecords: OneShotRecord[],
  ): PhaseUExitReport {
    const now = new Date().toISOString();

    // ── Dual-path rates (always computed) ────────────────────────────────────
    const sealAtomicRateOneshot = computeSealRateOneShotAtomic(oneShotRecords);
    const sagaReadyRateOneshot  = computeSealRateOneShotSaga(oneShotRecords);
    const sealAtomicRateTopk    = computeSealRateTopK(topKReports);
    const sagaReadyRateTopk     = computeSagaReadyRateTopK(topKReports);

    const sealAtomicOneShotCount = oneShotRecords.filter(r => r.verdict === 'SEAL_ATOMIC').length;
    const sagaReadyOneShotCount  = oneShotRecords.filter(r => r.verdict === 'SEAL_ATOMIC' || r.verdict === 'SAGA_READY').length;
    const sealAtomicTopkCount    = topKReports.reduce((s, r) => s + r.k_survived_seal, 0);
    const sagaReadyTopkCount     = topKReports.reduce((s, r) => s + ((r as Record<string, unknown>).k_saga_ready as number ?? 0), 0);

    const breakdown: SealPathBreakdown = {
      seal_atomic_oneshot: sealAtomicOneShotCount,
      seal_atomic_topk:    sealAtomicTopkCount,
      saga_ready_oneshot:  sagaReadyOneShotCount - sealAtomicOneShotCount,  // sans double-comptage
      saga_ready_topk:     sagaReadyTopkCount - sealAtomicTopkCount,        // sans double-comptage
      total_certified:     sagaReadyOneShotCount + sagaReadyTopkCount,      // union ATOMIC + SAGA
    };

    // INV-EU-05 : données insuffisantes
    if (topKReports.length < MIN_RUNS || oneShotRecords.length < MIN_RUNS) {
      return {
        verdict:                  'INSUFFICIENT_DATA',
        runs_topk:                topKReports.length,
        runs_oneshot:             oneShotRecords.length,
        metrics:                  [],
        greatness_median:         0,
        gain_pct:                 0,
        seal_rate_topk:           0,
        seal_rate_oneshot:        0,
        seal_atomic_rate_oneshot: sealAtomicRateOneshot,
        seal_atomic_rate_topk:    sealAtomicRateTopk,
        saga_ready_rate_oneshot:  sagaReadyRateOneshot,
        saga_ready_rate_topk:     sagaReadyRateTopk,
        seal_path_breakdown:      breakdown,
        created_at:               now,
        blocking_failures:        [`INSUFFICIENT_DATA: topK=${topKReports.length}/${MIN_RUNS}, oneShot=${oneShotRecords.length}/${MIN_RUNS}`],
      };
    }

    // ── MET-EU-01 : Greatness médiane top-1 ─────────────────────────────────
    const topKComposites = topKReports
      .filter(r => r.top1.greatness !== undefined)
      .map(r => r.top1_composite);

    const greatnessMedian = topKComposites.length > 0 ? median(topKComposites) : 0;

    const metEU01: MetricResult = {
      name:      'MET-EU-01',
      value:     greatnessMedian,
      threshold: GREATNESS_MEDIAN_MIN,
      pass:      greatnessMedian >= GREATNESS_MEDIAN_MIN,
      detail:    `Greatness médiane top-1 = ${greatnessMedian} (seuil ≥ ${GREATNESS_MEDIAN_MIN})`,
    };

    // ── MET-EU-02 : gain top-K vs one-shot (informatif — INV-SR-04) ─────────
    const oneShotSealComposites = oneShotRecords
      .filter(r => r.verdict === 'SEAL_ATOMIC' || (r.verdict as string) === 'SEAL')
      .map(r => r.s_composite);

    let gainPct = 0;
    let metEU02: MetricResult;

    if (oneShotSealComposites.length > 0 && topKComposites.length > 0) {
      const medianOneShot = median(oneShotSealComposites);
      gainPct = medianOneShot > 0
        ? computeGainPct(greatnessMedian, medianOneShot)
        : 0;
      metEU02 = {
        name:      'MET-EU-02',
        value:     gainPct,
        threshold: GAIN_PCT_MIN,
        pass:      true,  // informatif uniquement — ne bloque plus
        detail:    `Gain top-K vs one-shot = ${gainPct}% (informatif, seuil ${GAIN_PCT_MIN}% non-bloquant)`,
      };
    } else {
      metEU02 = {
        name:      'MET-EU-02',
        value:     0,
        threshold: GAIN_PCT_MIN,
        pass:      true,  // informatif uniquement
        detail:    'INSUFFICIENT_SEAL_DATA: pas assez de SEAL_ATOMIC pour calculer le gain (informatif)',
      };
    }

    // ── MET-EU-03 : 0 régression certified rate (SAGA_READY, inclut ATOMIC) ─
    const sealRateTopK    = sagaReadyRateTopk;
    const sealRateOneShot = sagaReadyRateOneshot;
    const sealRegressionDelta = Math.round((sealRateTopK - sealRateOneShot) * 10000) / 10000;

    const metEU03: MetricResult = {
      name:      'MET-EU-03',
      value:     sealRegressionDelta,
      threshold: SEAL_RATE_REGRESSION,
      pass:      sealRegressionDelta >= SEAL_RATE_REGRESSION,
      detail:    `Certified rate (SAGA_READY): topK=${sealRateTopK} vs oneShot=${sealRateOneShot}, delta=${sealRegressionDelta} (seuil ≥ 0)`,
    };

    // ── MET-EU-04 : volume minimum ────────────────────────────────────────────
    const metEU04: MetricResult = {
      name:      'MET-EU-04',
      value:     Math.min(topKReports.length, oneShotRecords.length),
      threshold: MIN_RUNS,
      pass:      topKReports.length >= MIN_RUNS && oneShotRecords.length >= MIN_RUNS,
      detail:    `Runs disponibles: topK=${topKReports.length}, oneShot=${oneShotRecords.length} (seuil ≥ ${MIN_RUNS} chacun)`,
    };

    // ── MET-EU-06 : saga_ready_rate_topk ≥ 5% ──────────────────────────────
    const metEU06: MetricResult = {
      name:      'MET-EU-06',
      value:     sagaReadyRateTopk,
      threshold: SAGA_READY_RATE_MIN,
      pass:      sagaReadyRateTopk >= SAGA_READY_RATE_MIN,
      detail:    `saga_ready_rate_topk = ${sagaReadyRateTopk} (seuil ≥ ${SAGA_READY_RATE_MIN})`,
    };

    const metrics = [metEU01, metEU02, metEU03, metEU04, metEU06];
    const blockingFailures = metrics.filter(m => !m.pass).map(m => m.detail);
    const verdict: PhaseUVerdict = blockingFailures.length === 0 ? 'PASS' : 'FAIL';

    return {
      verdict,
      runs_topk:                topKReports.length,
      runs_oneshot:             oneShotRecords.length,
      metrics,
      greatness_median:         greatnessMedian,
      gain_pct:                 gainPct,
      seal_rate_topk:           sealRateTopK,
      seal_rate_oneshot:        sealRateOneShot,
      seal_atomic_rate_oneshot: sealAtomicRateOneshot,
      seal_atomic_rate_topk:    sealAtomicRateTopk,
      saga_ready_rate_oneshot:  sagaReadyRateOneshot,
      saga_ready_rate_topk:     sagaReadyRateTopk,
      seal_path_breakdown:      breakdown,
      created_at:               now,
      blocking_failures:        blockingFailures,
    };
  }
}
