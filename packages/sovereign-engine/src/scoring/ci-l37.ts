/**
 * CI_L37 — Causal Index base sur la loi L37 (seule loi causale bilingue prouvee)
 *
 * L37 : sub_per_sentence -> f26b_long_sent_rate -> Tier_qualite
 * Mediation FR = 136%, EN = 95%. Robustesse V6 : 114-194%.
 *
 * SHADOW MODE (D1) : ce score est informatif uniquement.
 * Il ne modifie PAS le verdict de production.
 *
 * References corpus (881 oeuvres, fenetres 500w, Tier S) :
 *   sub_per_sentence : P25=0.49, mediane=0.72, P75=1.03
 *   f26b_long_sent_rate : P25=0.05, mediane=0.11, P75=0.20
 */

import { computeTextFeatures } from './text-features.js';

// Bornes de normalisation (Tier S, 500w, corpus 881 oeuvres)
const SUB_REF = { min: 0.20, max: 1.50 };
const F26B_REF = { min: 0.00, max: 0.35 };

// Poids (sub = cause profonde, f26b = effet mediatise)
const W_SUB = 0.60;
const W_F26B = 0.40;

function norm(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export interface CIL37Result {
  readonly ci_l37: number;
  readonly sub_per_sentence: number;
  readonly f26b_long_sent_rate: number;
  readonly sub_normalized: number;
  readonly f26b_normalized: number;
}

export function computeCIL37(prose: string): CIL37Result {
  if (!prose || prose.trim().length < 20) {
    return { ci_l37: 0, sub_per_sentence: 0, f26b_long_sent_rate: 0, sub_normalized: 0, f26b_normalized: 0 };
  }

  const features = computeTextFeatures(prose);

  const sub = (features as Record<string, number>).f26a_mean_sub_markers ?? 0;
  const f26b = (features as Record<string, number>).f26b_long_sent_rate ?? 0;

  const subNorm = norm(sub, SUB_REF.min, SUB_REF.max);
  const f26bNorm = norm(f26b, F26B_REF.min, F26B_REF.max);

  const ci = Math.round((W_SUB * subNorm + W_F26B * f26bNorm) * 10000) / 100;

  return {
    ci_l37: Math.min(100, ci),
    sub_per_sentence: sub,
    f26b_long_sent_rate: f26b,
    sub_normalized: subNorm,
    f26b_normalized: f26bNorm,
  };
}
