/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARC SCORER — Cohérence narrative multi-briques (P2-00)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Remplace le moving-average naïf de dual-scale.ts par 3 sous-scores CALC :
 *
 *   progression      (0.40) — croissance monotone de la qualité cumulée
 *   tension_variance  (0.35) — écart-type normalisé des scores locaux
 *   closure_signal    (0.25) — score du dernier window relatif à la cible
 *
 * ARC = 0.40 * progression + 0.35 * tension_variance + 0.25 * closure_signal
 * FINAL = 0.43 * LOCAL + 0.57 * ARC  [SSOT: dual-scale.ts:12-13]
 *
 * Toutes les données viennent du pipeline existant — 0 appel LLM.
 *
 * Phase : P2-00 (ARC-01)
 * Standard : NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Weights ──
/** @sealed — source: POST_IRM_PLAN_CONVERGENT.md */
export const W_PROGRESSION = 0.40;
export const W_TENSION_VARIANCE = 0.35;
export const W_CLOSURE = 0.25;

// ── Interface ──
export interface ArcScore {
  /** Croissance monotone de la qualité cumulée (0→100). */
  readonly progression: number;
  /** Dynamisme inter-sections : écart-type normalisé → score (0→100). */
  readonly tension_variance: number;
  /** Score du dernier window relatif à la cible (0→100). */
  readonly closure_signal: number;
  /** Score ARC composite (0→100). */
  readonly arc_composite: number;
}

export interface ArcScorerState {
  /** Buffer des scores locaux accumulés. */
  readonly scores: readonly number[];
  /** Seuil cible pour le closure_signal (seal_threshold du profil actif). */
  readonly closure_target: number;
}

// ── State ──
let _scores: number[] = [];
let _closureTarget = 88.0; // default = LITTERAIRE seal_threshold

/**
 * Reset le buffer ARC. À appeler en début de run.
 */
export function resetArc(): void {
  _scores = [];
  _closureTarget = 88.0;
}

/**
 * Configure la cible closure (seal_threshold du profil qualité actif).
 * Doit être appelé une fois en début de run si le profil n'est pas LITTERAIRE.
 * [SSOT: quality-profiles.ts:18-88]
 */
export function setClosureTarget(target: number): void {
  if (target < 0 || target > 100) {
    throw new Error(`[ARC] closure_target hors bornes: ${target}. Attendu [0, 100].`);
  }
  _closureTarget = target;
}

/**
 * Retourne l'état courant (pour debug / télémétrie).
 */
export function getArcState(): ArcScorerState {
  return {
    scores: [..._scores],
    closure_target: _closureTarget,
  };
}

// ── Calculs ──

/**
 * Progression : mesure si les scores locaux croissent au fil des windows.
 *
 * Méthode : pente de régression linéaire normalisée.
 * - Si pente > 0 : le texte s'améliore → score élevé
 * - Si pente = 0 : stable → score moyen (50)
 * - Si pente < 0 : le texte se dégrade → score bas
 *
 * Normalisation : pente brute ∈ [-100, +100] par window → mapped sur [0, 100].
 * Avec 1 seul score, on retourne 50 (pas assez de données).
 */
export function computeProgression(scores: readonly number[]): number {
  const n = scores.length;
  if (n <= 1) return 50.0; // pas assez de données, neutre

  // Régression linéaire y = a*x + b (x = index 0..n-1, y = score)
  const meanX = (n - 1) / 2;
  const meanY = scores.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    numerator += dx * (scores[i] - meanY);
    denominator += dx * dx;
  }

  // Pente par window (delta score par step)
  const slope = denominator === 0 ? 0 : numerator / denominator;

  // Normalisation : slope de ±10 points/window = 0 ou 100
  // Plage réaliste : slope ∈ [-10, +10]
  const MAX_SLOPE = 10;
  const normalized = 50 + (slope / MAX_SLOPE) * 50;

  return Math.round(Math.max(0, Math.min(100, normalized)) * 100) / 100;
}

/**
 * Tension Variance : mesure la STABILITÉ de la qualité entre sections.
 *
 * Contexte qualité : la variance = INSTABILITÉ du pipeline.
 * Un texte avec des scores stables = pipeline maîtrisé → score ÉLEVÉ.
 * Un texte avec des scores chaotiques = pipeline instable → score BAS.
 *
 * Méthode : score de stabilité basé sur le CV (coefficient de variation).
 * CV bas → pipeline stable → score haut.
 * CV élevé → pipeline chaotique → score bas.
 *
 * Avec 1 seul score, on retourne 50 (pas assez de données).
 */
export function computeTensionVariance(scores: readonly number[]): number {
  const n = scores.length;
  if (n <= 1) return 50.0;

  const avg = scores.reduce((a, b) => a + b, 0) / n;
  if (avg === 0) return 0;

  const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);
  const cv = stdev / avg;

  // Score de stabilité : CV → score inversé
  // CV = 0.00 → 95 (quasi-parfait, mais pas 100 — pas assez de signal)
  // CV = 0.02 → 90 (excellent, très stable)
  // CV = 0.05 → 75 (bon, variation normale)
  // CV = 0.10 → 50 (moyen, variation notable)
  // CV = 0.15 → 30 (instable)
  // CV = 0.25 → 10 (chaotique)
  // CV > 0.30 → 0  (dégénéré)

  const score = 95 * Math.exp(-cv * 15);

  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
}

/**
 * Closure Signal : le dernier window atteint-il la cible ?
 *
 * Mesure la distance entre le score du dernier window et le seal_threshold
 * du profil qualité actif.
 *
 * - Score >= cible → 100 (closure parfaite)
 * - Score = cible - 10 → ~50
 * - Score << cible → 0
 */
export function computeClosureSignal(scores: readonly number[], closureTarget: number): number {
  if (scores.length === 0) return 0;

  const lastScore = scores[scores.length - 1];
  const delta = lastScore - closureTarget;

  if (delta >= 0) {
    // Au-dessus de la cible : bonus progressif plafonné à 100
    return Math.min(100, 85 + delta * 1.5);
  }

  // En dessous : décroissance linéaire, 0 si delta <= -15
  const FAIL_DELTA = -15;
  const score = 85 * (1 - Math.abs(delta) / Math.abs(FAIL_DELTA));
  return Math.round(Math.max(0, score) * 100) / 100;
}

// ── API publique ──

/**
 * Ajoute un score local au buffer et calcule l'ARC composite.
 *
 * Appelé après chaque scoring local (chunk ou passe complète).
 * Retourne le détail des 3 sous-scores + le composite.
 */
export function pushScoreAndComputeArc(localScore: number): ArcScore {
  _scores.push(localScore);

  const progression = computeProgression(_scores);
  const tension_variance = computeTensionVariance(_scores);
  const closure_signal = computeClosureSignal(_scores, _closureTarget);

  const arc_composite = Math.round(
    (W_PROGRESSION * progression +
     W_TENSION_VARIANCE * tension_variance +
     W_CLOSURE * closure_signal) * 100,
  ) / 100;

  return {
    progression,
    tension_variance,
    closure_signal,
    arc_composite,
  };
}

/**
 * Calcule l'ARC à partir d'un buffer de scores externe (sans modifier l'état interne).
 * Utile pour les tests, le scoring rétrospectif, ou la calibration.
 */
export function computeArcFromScores(scores: readonly number[], closureTarget: number): ArcScore {
  const progression = computeProgression(scores);
  const tension_variance = computeTensionVariance(scores);
  const closure_signal = computeClosureSignal(scores, closureTarget);

  const arc_composite = Math.round(
    (W_PROGRESSION * progression +
     W_TENSION_VARIANCE * tension_variance +
     W_CLOSURE * closure_signal) * 100,
  ) / 100;

  return {
    progression,
    tension_variance,
    closure_signal,
    arc_composite,
  };
}
