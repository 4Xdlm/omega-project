/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — UTILITAIRES MATHÉMATIQUES (SSOT)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: utils/math-utils.ts
 * Version: 1.1.0 (CLEAN-2 : ajout computeMinAxis)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Source unique de vérité pour les calculs mathématiques partagés OMEGA.
 * Contient : calculateVariance, pearsonCorrelation, cosineSimilarity, computeMinAxis
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export function calculateVariance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
}

export function pearsonCorrelation(x: readonly number[], y: readonly number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((a, b, i) => a + (b - meanX) * (y[i] - meanY), 0);
  const denX = Math.sqrt(x.reduce((a, b) => a + Math.pow(b - meanX, 2), 0));
  const denY = Math.sqrt(y.reduce((a, b) => a + Math.pow(b - meanY, 2), 0));
  if (denX === 0 || denY === 0) return 0;
  return num / (denX * denY);
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const nA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (nA === 0 || nB === 0) return 0;
  return dot / (nA * nB);
}

// ── OMEGA SOVEREIGN — CALC UTILITAIRES ───────────────────────────────────────

import type { MacroAxesScores } from '../oracle/macro-axes.js';

/**
 * computeMinAxis — Calcule le min des 5 macro-axes (SSI = min_axis).
 *
 * Utilisé pour SEAL_ATOMIC et SAGA_READY (INV-SR-05).
 * Source unique de vérité — remplace les implémentations dupliquées dans :
 *   - top-k-selection.ts
 *   - scene-chain.ts
 *
 * Sémantique des défauts :
 *   - macroAxes null/undefined → 0 (échoue tout seuil)
 *   - axe individuel manquant → 100 (neutre — ne pénalise pas si l'objet existe)
 *
 * @returns min(ECC, RCI, SII, IFI, AAI) ou 0 si macroAxes null/undefined
 */
export function computeMinAxis(macroAxes: MacroAxesScores | null | undefined): number {
  if (!macroAxes) return 0;
  return Math.min(
    macroAxes.ecc?.score ?? 100,
    macroAxes.rci?.score ?? 100,
    macroAxes.sii?.score ?? 100,
    macroAxes.ifi?.score ?? 100,
    macroAxes.aai?.score ?? 100,
  );
}
