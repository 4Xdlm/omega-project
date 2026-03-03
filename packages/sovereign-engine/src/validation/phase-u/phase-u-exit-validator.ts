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
  readonly run_id:     string;
  readonly verdict:    'SEAL' | 'REJECT';
  readonly s_composite: number;   // [0, 100] score S-Oracle
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

/** Rapport complet Phase U — INV-EU-04 */
export interface PhaseUExitReport {
  readonly verdict:           PhaseUVerdict;
  readonly runs_topk:         number;
  readonly runs_oneshot:      number;
  readonly metrics:           MetricResult[];
  readonly greatness_median:  number;    // [0, 100]
  readonly gain_pct:          number;    // % gain top-K vs one-shot
  readonly seal_rate_topk:    number;    // [0, 1]
  readonly seal_rate_oneshot: number;    // [0, 1]
  readonly created_at:        string;    // ISO 8601
  readonly blocking_failures: string[];  // métriques FAIL
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
 * Calcule le SEAL rate one-shot.
 * seal_rate = Σ(verdict === SEAL) / total
 */
export function computeSealRateOneShot(records: OneShotRecord[]): number {
  if (records.length === 0) return 0;
  const seals = records.filter(r => r.verdict === 'SEAL').length;
  return Math.round((seals / records.length) * 10000) / 10000;
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

    // INV-EU-05 : données insuffisantes
    if (topKReports.length < MIN_RUNS || oneShotRecords.length < MIN_RUNS) {
      return {
        verdict:           'INSUFFICIENT_DATA',
        runs_topk:         topKReports.length,
        runs_oneshot:      oneShotRecords.length,
        metrics:           [],
        greatness_median:  0,
        gain_pct:          0,
        seal_rate_topk:    0,
        seal_rate_oneshot: 0,
        created_at:        now,
        blocking_failures: [`INSUFFICIENT_DATA: topK=${topKReports.length}/${MIN_RUNS}, oneShot=${oneShotRecords.length}/${MIN_RUNS}`],
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

    // ── MET-EU-02 : gain top-K vs one-shot ───────────────────────────────────
    const oneShotSealComposites = oneShotRecords
      .filter(r => r.verdict === 'SEAL')
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
        pass:      gainPct >= GAIN_PCT_MIN,
        detail:    `Gain top-K vs one-shot = ${gainPct}% (seuil ≥ ${GAIN_PCT_MIN}%)`,
      };
    } else {
      metEU02 = {
        name:      'MET-EU-02',
        value:     0,
        threshold: GAIN_PCT_MIN,
        pass:      false,
        detail:    'INSUFFICIENT_SEAL_DATA: pas assez de SEAL pour calculer le gain',
      };
    }

    // ── MET-EU-03 : 0 régression SEAL rate ───────────────────────────────────
    const sealRateTopK    = computeSealRateTopK(topKReports);
    const sealRateOneShot = computeSealRateOneShot(oneShotRecords);
    const sealRegressionDelta = Math.round((sealRateTopK - sealRateOneShot) * 10000) / 10000;

    const metEU03: MetricResult = {
      name:      'MET-EU-03',
      value:     sealRegressionDelta,
      threshold: SEAL_RATE_REGRESSION,
      pass:      sealRegressionDelta >= SEAL_RATE_REGRESSION,
      detail:    `SEAL rate: topK=${sealRateTopK} vs oneShot=${sealRateOneShot}, delta=${sealRegressionDelta} (seuil ≥ 0)`,
    };

    // ── MET-EU-04 : volume minimum ────────────────────────────────────────────
    const metEU04: MetricResult = {
      name:      'MET-EU-04',
      value:     Math.min(topKReports.length, oneShotRecords.length),
      threshold: MIN_RUNS,
      pass:      topKReports.length >= MIN_RUNS && oneShotRecords.length >= MIN_RUNS,
      detail:    `Runs disponibles: topK=${topKReports.length}, oneShot=${oneShotRecords.length} (seuil ≥ ${MIN_RUNS} chacun)`,
    };

    const metrics = [metEU01, metEU02, metEU03, metEU04];
    const blockingFailures = metrics.filter(m => !m.pass).map(m => m.detail);
    const verdict: PhaseUVerdict = blockingFailures.length === 0 ? 'PASS' : 'FAIL';

    return {
      verdict,
      runs_topk:         topKReports.length,
      runs_oneshot:      oneShotRecords.length,
      metrics,
      greatness_median:  greatnessMedian,
      gain_pct:          gainPct,
      seal_rate_topk:    sealRateTopK,
      seal_rate_oneshot: sealRateOneShot,
      created_at:        now,
      blocking_failures: blockingFailures,
    };
  }
}
