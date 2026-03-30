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

// Bornes de normalisation MODE CORPUS (Tier S humain, 500w, 881 oeuvres)
const SUB_REF_CORPUS = { min: 0.20, max: 1.50 };
const F26B_REF_CORPUS = { min: 0.00, max: 0.35 };

// Bornes de normalisation MODE OMEGA (regime Sonnet, BB-C01 plafond ~0.099)
const SUB_REF_OMEGA = { min: 0.03, max: 0.12 };
const F26B_REF_OMEGA = { min: 0.01, max: 0.18 };

// Poids (sub = cause profonde, f26b = effet mediatise)
const W_SUB = 0.60;
const W_F26B = 0.40;

function norm(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export interface CIL37Result {
  readonly ci_l37_corpus: number;  // normalise sur bornes Tier S humain
  readonly ci_l37_omega: number;   // normalise sur bornes regime Sonnet
  readonly sub_per_sentence: number;
  readonly f26b_long_sent_rate: number;
  readonly sub_norm_corpus: number;
  readonly sub_norm_omega: number;
  readonly f26b_norm_corpus: number;
  readonly f26b_norm_omega: number;
}

export function computeCIL37(prose: string): CIL37Result {
  if (!prose || prose.trim().length < 20) {
    return { ci_l37_corpus: 0, ci_l37_omega: 0, sub_per_sentence: 0, f26b_long_sent_rate: 0,
             sub_norm_corpus: 0, sub_norm_omega: 0, f26b_norm_corpus: 0, f26b_norm_omega: 0 };
  }

  const features = computeTextFeatures(prose);

  const sub = (features as Record<string, number>).f26a_mean_sub_markers ?? 0;
  const f26b = (features as Record<string, number>).f26b_long_sent_rate ?? 0;

  // Mode corpus (distance aux maitres humains)
  const subNormC = norm(sub, SUB_REF_CORPUS.min, SUB_REF_CORPUS.max);
  const f26bNormC = norm(f26b, F26B_REF_CORPUS.min, F26B_REF_CORPUS.max);
  const ciCorpus = Math.min(100, Math.round((W_SUB * subNormC + W_F26B * f26bNormC) * 10000) / 100);

  // Mode omega (qualite relative dans l'espace Sonnet)
  const subNormO = norm(sub, SUB_REF_OMEGA.min, SUB_REF_OMEGA.max);
  const f26bNormO = norm(f26b, F26B_REF_OMEGA.min, F26B_REF_OMEGA.max);
  const ciOmega = Math.min(100, Math.round((W_SUB * subNormO + W_F26B * f26bNormO) * 10000) / 100);

  return {
    ci_l37_corpus: ciCorpus,
    ci_l37_omega: ciOmega,
    sub_per_sentence: sub,
    f26b_long_sent_rate: f26b,
    sub_norm_corpus: subNormC,
    sub_norm_omega: subNormO,
    f26b_norm_corpus: f26bNormC,
    f26b_norm_omega: f26bNormO,
  };
}
