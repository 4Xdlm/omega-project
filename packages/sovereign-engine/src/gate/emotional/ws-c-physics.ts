/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — WS-C EMOTION PHYSICS — coeur de mesure L0/L1 (Voie A)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Module:  src/gate/emotional/ws-c-physics.ts
 * Spec:    outputs/WS_C_MEASUREMENT_HARNESS_SPEC.md
 * GO:      tribunal WS_C_HARNESS_L0_L1_P0 (L1 anti-circularite verrouille).
 *
 * MESURE la fidelite emotion01 d'un extrait a un contrat PLAN, via la PHYSIQUE
 * LEGALE seulement. == GARAGE INTERDIT == : imports autorises UNIQUEMENT depuis
 * `chunking/detector/features.ts` (extracteurs deterministes, Codex 281).
 * JAMAIS target_14d / scoreTension14D / analyzeEmotionFromText / deriveEmotionContract.
 * ZERO LLM. Deterministe. Aucun usage ne qualifie emotion01 pour R6 (L0/L1 = gate).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { extractSentiment, extractFeatures, featureIntensity, featureDistance } from '../../chunking/detector/features.js';

type FV = ReturnType<typeof extractFeatures>;

/** Contrat PLAN (physique legale seulement — PAS de target_14d). */
export interface PhysicsContract {
  readonly id: string;
  /** valence cible par quartile, [-1,1]. */
  readonly X: readonly [number, number, number, number];
  /** arousal cible par quartile, [0,1]. */
  readonly Y: readonly [number, number, number, number];
  /** quartile de rupture attendu (1..4) ou null. */
  readonly ruptureQ: number | null;
  /** taux de decroissance attendu (>=0). */
  readonly lambda: number;
}

/** Mesures physiques d'un extrait (4 quartiles). */
export interface ExtractMetrics {
  readonly valence: readonly [number, number, number, number];
  readonly arousalRaw: readonly [number, number, number, number];
  readonly fvs: readonly [FV, FV, FV, FV];
}

const clamp01 = (x: number): number => (!Number.isFinite(x) ? 0 : x < 0 ? 0 : x > 1 ? 1 : x);

/** Mesure les 4 quartiles d'un extrait. Physique legale uniquement. */
export function measureExtract(quartileTexts: readonly [string, string, string, string]): ExtractMetrics {
  const fvs = quartileTexts.map((t) => extractFeatures(t)) as unknown as [FV, FV, FV, FV];
  const valence = quartileTexts.map((t) => extractSentiment(t)) as unknown as [number, number, number, number];
  const arousalRaw = fvs.map((f) => featureIntensity(f)) as unknown as [number, number, number, number];
  return { valence, arousalRaw, fvs };
}

/** min-max local (dans l'extrait) -> [0,1] ; plat -> 0.5. Pas de fuite inter-extrait. */
function minmax4(a: readonly number[]): [number, number, number, number] {
  const mn = Math.min(...a); const mx = Math.max(...a);
  if (mx - mn < 1e-9) return [0.5, 0.5, 0.5, 0.5];
  return a.map((x) => (x - mn) / (mx - mn)) as unknown as [number, number, number, number];
}

/** Spearman sur 4 points (rangs). */
function spearman4(a: readonly number[], b: readonly number[]): number {
  const rank = (v: readonly number[]): number[] => {
    const idx = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(v.length);
    idx.forEach(([, i], k) => { r[i] = k; });
    return r;
  };
  const ra = rank(a); const rb = rank(b);
  const n = a.length;
  let d2 = 0; for (let i = 0; i < n; i++) d2 += (ra[i] - rb[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

/** Fidelites partielles [0,1]. */
export function fidelities(m: ExtractMetrics, c: PhysicsContract): {
  fid_val: number; fid_ar: number; fid_shape: number; fid_rup: number; fid_Z: number;
} {
  const val01 = m.valence.map((v) => (v + 1) / 2);
  const X01 = c.X.map((x) => (x + 1) / 2);
  const ar01 = minmax4(m.arousalRaw);
  const fid_val = clamp01(1 - val01.reduce((s, v, i) => s + Math.abs(v - X01[i]), 0) / 4);
  const fid_ar = clamp01(1 - ar01.reduce((s, v, i) => s + Math.abs(v - c.Y[i]), 0) / 4);
  const fid_shape = clamp01((1 + spearman4(ar01, c.Y)) / 2);
  // rupture : frontiere de plus grand saut (0..2 => entre q1/q2, q2/q3, q3/q4)
  const dists = [featureDistance(m.fvs[0], m.fvs[1]), featureDistance(m.fvs[1], m.fvs[2]), featureDistance(m.fvs[2], m.fvs[3])];
  const maxD = Math.max(...dists);
  let fid_rup: number;
  if (c.ruptureQ === null) {
    const norm = maxD / (1e-9 + dists.reduce((a, b) => a + b, 0));
    fid_rup = clamp01(1 - Math.max(0, norm - 0.34) / 0.66); // plat = bien
  } else {
    const detectedBoundary = dists.indexOf(maxD); // 0..2
    const targetBoundary = Math.min(2, Math.max(0, c.ruptureQ - 1));
    fid_rup = clamp01(1 - Math.abs(detectedBoundary - targetBoundary) / 2);
  }
  // Z : decroissance observee (q1->q4) vs attendue (tanh(lambda))
  const decayObs = (ar01[0] - ar01[3] + 1) / 2; // [0,1]
  const decayExp = (Math.tanh(c.lambda) + 1) / 2;
  const fid_Z = clamp01(1 - Math.abs(decayObs - decayExp));
  return { fid_val, fid_ar, fid_shape, fid_rup, fid_Z };
}

/** Les 3 formules candidates -> emotion01 [0,1]. */
export function emotion01(m: ExtractMetrics, c: PhysicsContract): { C1: number; C2: number; C3: number } {
  const f = fidelities(m, c);
  const four = [f.fid_val, f.fid_ar, f.fid_shape, f.fid_rup];
  const meanFour = four.reduce((a, b) => a + b, 0) / 4;
  const C1 = meanFour;
  const C2 = clamp01(meanFour - 0.5 * Math.max(0, 0.5 - Math.min(...four)));
  const C3 = (f.fid_shape + f.fid_rup) / 2;
  return { C1, C2, C3 };
}

/** AUC (Mann-Whitney, rang) : P(pos > neg). 0.5 = aucune separation. */
export function auc(pos: readonly number[], neg: readonly number[]): number {
  if (pos.length === 0 || neg.length === 0) return 0.5;
  const all = [...pos.map((v) => [v, 1] as const), ...neg.map((v) => [v, 0] as const)].sort((a, b) => a[0] - b[0]);
  // rangs moyens (gestion des egalites)
  const ranks = new Array<number>(all.length);
  let i = 0;
  while (i < all.length) {
    let j = i; while (j + 1 < all.length && all[j + 1][0] === all[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = avg;
    i = j + 1;
  }
  let sumPos = 0; for (let k = 0; k < all.length; k++) if (all[k][1] === 1) sumPos += ranks[k];
  const nP = pos.length; const nN = neg.length;
  return (sumPos - (nP * (nP + 1)) / 2) / (nP * nN);
}

/** Melange deterministe des 4 quartiles (permutation seedee simple). */
export function shuffleQuartiles<T>(q: readonly [T, T, T, T], seed: number): [T, T, T, T] {
  // permutations non-identite de 4 elements, choisies par seed
  const perms: number[][] = [[1, 0, 3, 2], [3, 2, 1, 0], [2, 3, 0, 1], [1, 3, 0, 2], [2, 0, 3, 1]];
  const p = perms[seed % perms.length];
  return [q[p[0]], q[p[1]], q[p[2]], q[p[3]]];
}
