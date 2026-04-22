/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — ORACLE (ADR-005 r2 COMPOSITE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/dedale/oracle.ts
 * Version:  0.55.1 (ADR-005 r2)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Upstream: DEDALE_v0.55_SYNTHESE_3IA_ET_SPEC_AMENDED.md §D.1
 *           ADR-005 r2 — Dédale Bench Night Phase S recalibration (2026-04-22)
 *
 * Oracle multi-critère pour détection de boucles de génération.
 *
 * ─── ADR-005 r2 : RÈGLE COMPOSITE (2026-04-22, unanime gemini+chatgpt+me) ────
 *
 * Règle active :
 *   hard_fail  ⇔  (C1 > c1_high_threshold)
 *                 OR
 *                 (C1 > c1_threshold AND C4 < c4_threshold)
 *
 * Motivation (post-bench Phase S, 120 runs qwen3:32b) :
 *   - C1=0.15 produisait ~92% vrais positifs mais trop sensible sur scènes
 *     neutres (N02 déclencheur 60% des runs HF faux positifs).
 *   - C4 seul jamais déclencheur en pratique, mais utile comme renforcement.
 *   - C2 (repetition_score INV-FP-09) non-discriminant sur qwen3:32b
 *     → rétrogradé en info-tag (calculé, loggé, ne déclenche plus).
 *
 * Critères :
 *   C1 (trigram_ratio) — seuil bas = c1_threshold (0.15), seuil haut = c1_high_threshold (0.20)
 *        (miroir computeTrigramRepeatRatio de chunked-generator.ts:316-338)
 *   C2 (repetition_score) — DÉPRÉCIÉ comme trigger, conservé comme info-tag
 *        (miroir INV-FP-09 de validation/phase-u/audit/prose-fingerprint.ts:205)
 *   C4 (unique_ratio) — composite uniquement avec C1 (seuil 0.30)
 *        (calibration H5 — faiblesse auto-reconnue design §H)
 *
 * Critère retiré v0.55 (blocante unanime 3/3 IA) :
 *   C3 — hash_repeat (orphelin dans flow même-seed post-reset, réservé v0.6+)
 *
 * Ordre d'évaluation (première règle = raison dominante) :
 *   1. C1 > c1_high_threshold             → 'c1_trigram_ratio'
 *   2. C1 > c1_threshold AND C4 < c4_threshold → 'c1_c4_composite'
 *   Sinon → 'no_loop' (C2 info-tag évalué et tagué dans metrics.c2_info_elevated)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  DedaleDependencies,
  OracleResult,
  HardFailReason,
} from './types.js';

// ──────────────────────────────────────────────────────────────────────────────
// METRICS — CALC PUR (pas de dépendance externe, pas d'I/O)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * C1 — Trigram repeat ratio.
 * Équivalent strict de computeTrigramRepeatRatio (chunked-generator.ts:316-338).
 * Retourne le ratio de trigrammes (3-mots) en excès sur le total de trigrammes.
 * Loops pathologiques : ratio > 0.25. Prose saine : ratio < 0.08.
 */
export function computeTrigramRatio(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 10) return 0;

  const trigrams = new Map<string, number>();
  for (let i = 0; i <= words.length - 3; i++) {
    const tri = words.slice(i, i + 3).join(' ').toLowerCase();
    trigrams.set(tri, (trigrams.get(tri) || 0) + 1);
  }

  const totalTrigrams = words.length - 2;
  if (totalTrigrams <= 0) return 0;

  let repeatedCount = 0;
  for (const count of trigrams.values()) {
    if (count > 2) repeatedCount += count - 1;
  }

  return repeatedCount / totalTrigrams;
}

/**
 * C2 — Repetition score (INV-FP-09).
 * Fenêtre glissante de 5 phrases — compte paires de phrases partageant ≥1 bigramme.
 * Miroir fonctionnel de validation/phase-u/audit/prose-fingerprint.ts:205-238.
 */
export function computeRepetitionScore(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  if (sentences.length < 2) return 0;

  const getBigrams = (s: string): Set<string> => {
    const words = s.toLowerCase()
      .replace(/[.,;:!?…«»"'""''()\[\]{}\-–—]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    const bigrams = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]}|${words[i + 1]}`);
    }
    return bigrams;
  };

  const sentenceBigrams = sentences.map(getBigrams);

  let totalRepeated = 0;
  let totalPairs = 0;
  const windowSize = 5;

  for (let i = 0; i < sentenceBigrams.length; i++) {
    const windowEnd = Math.min(i + windowSize, sentenceBigrams.length);
    for (let j = i + 1; j < windowEnd; j++) {
      totalPairs++;
      const setA = sentenceBigrams[i];
      const setB = sentenceBigrams[j];
      if (!setA || !setB) continue;
      let intersect = 0;
      for (const b of setA) {
        if (setB.has(b)) { intersect = 1; break; }
      }
      if (intersect > 0) totalRepeated++;
    }
  }

  if (totalPairs === 0) return 0;
  return Math.round((totalRepeated / totalPairs) * 1000) / 1000;
}

/**
 * C4 — Unique word ratio.
 * Ratio = mots_uniques / mots_total. Prose saine : > 0.45. Loops : < 0.25.
 * Seuil par défaut 0.30 — calibration H5 (faiblesse auto-reconnue §H §H.5).
 * NB4 : calibrer avant passage `on` prod.
 */
export function computeUniqueRatio(text: string): number {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length < 10) return 1;  // texte trop court → pas de jugement

  const unique = new Set(words);
  return unique.size / words.length;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG DEFAULTS (ENV-OVERRIDABLE)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Seuils par défaut. Les tests et le prod peuvent override via env vars :
 *   OMEGA_DEDALE_C1_THRESHOLD       (default 0.15, composite bas, aligné REPEAT_TRIGRAM_THRESHOLD)
 *   OMEGA_DEDALE_C1_HIGH_THRESHOLD  (default 0.20, ADR-005 r2, déclenche seul)
 *   OMEGA_DEDALE_C2_THRESHOLD       (default 0.60, info-tag uniquement r2)
 *   OMEGA_DEDALE_C4_THRESHOLD       (default 0.30, composite avec C1, calibration H5)
 */
export function resolveDefaultOracleThresholds(): {
  c1_threshold: number;
  c1_high_threshold: number;
  c2_threshold: number;
  c4_threshold: number;
} {
  return {
    c1_threshold: parseFloat(process.env.OMEGA_DEDALE_C1_THRESHOLD ?? '0.15'),
    c1_high_threshold: parseFloat(process.env.OMEGA_DEDALE_C1_HIGH_THRESHOLD ?? '0.20'),
    c2_threshold: parseFloat(process.env.OMEGA_DEDALE_C2_THRESHOLD ?? '0.60'),
    c4_threshold: parseFloat(process.env.OMEGA_DEDALE_C4_THRESHOLD ?? '0.30'),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// ORACLE FACTORY (DI)
// ──────────────────────────────────────────────────────────────────────────────

export interface Oracle {
  /**
   * Évalue un chunk de prose. Retourne verdict + raison + métriques.
   *
   * ADR-005 r2 — Ordre d'évaluation (première règle = raison dominante) :
   *   1. C1 > c1_high_threshold             → 'c1_trigram_ratio'
   *   2. C1 > c1_threshold AND C4 < c4_threshold → 'c1_c4_composite'
   *   Sinon → 'no_loop' (C2 tagué dans metrics.c2_info_elevated, ne déclenche pas)
   */
  evaluate(text: string, thresholds?: {
    c1_threshold?: number;
    c1_high_threshold?: number;
    c2_threshold?: number;
    c4_threshold?: number;
  }): OracleResult;
}

/**
 * Factory oracle — consomme deps.clock pour timestamping déterministe.
 */
export function createOracle(
  deps: Pick<DedaleDependencies, 'clock' | 'logger'>
): Oracle {
  return {
    evaluate(text, thresholdsOverride): OracleResult {
      const defaults = resolveDefaultOracleThresholds();
      const thresholds = {
        c1_threshold: thresholdsOverride?.c1_threshold ?? defaults.c1_threshold,
        c1_high_threshold: thresholdsOverride?.c1_high_threshold ?? defaults.c1_high_threshold,
        c2_threshold: thresholdsOverride?.c2_threshold ?? defaults.c2_threshold,
        c4_threshold: thresholdsOverride?.c4_threshold ?? defaults.c4_threshold,
      };

      const c1 = computeTrigramRatio(text);
      const c2 = computeRepetitionScore(text);
      const c4 = computeUniqueRatio(text);

      // ADR-005 r2 — Règle composite (première règle = raison dominante) :
      //   1. C1 > c1_high_threshold              → 'c1_trigram_ratio'
      //   2. C1 > c1_threshold AND C4 < c4_threshold → 'c1_c4_composite'
      //   Sinon → 'no_loop' (C2 info-tag, ne déclenche pas)
      let reason: HardFailReason | undefined;
      if (c1 > thresholds.c1_high_threshold) {
        reason = 'c1_trigram_ratio';
      } else if (c1 > thresholds.c1_threshold && c4 < thresholds.c4_threshold) {
        reason = 'c1_c4_composite';
      }

      // C2 info-tag : calculé, loggé dans metrics, mais ne déclenche pas hard_fail
      const c2_info_elevated = c2 > thresholds.c2_threshold;

      const verdict = reason === undefined ? 'no_loop' : 'hard_fail';
      const evaluated_at_ms = deps.clock();

      if (verdict === 'hard_fail') {
        deps.logger.warn('[dedale.oracle] hard_fail detected (ADR-005 r2)', {
          reason,
          c1, c2, c4,
          c2_info_elevated,
          thresholds,
        });
      } else if (c2_info_elevated) {
        // Info-tag C2 élevé mais pas de hard_fail — diagnostic télémétrie
        deps.logger.info('[dedale.oracle] c2_info_elevated (no hard_fail)', {
          c1, c2, c4,
          thresholds,
        });
      }

      return {
        verdict,
        reason,
        metrics: {
          c1_trigram_ratio: c1,
          c2_repetition_score: c2,
          c4_unique_ratio: c4,
          c2_info_elevated,
        },
        thresholds_used: thresholds,
        evaluated_at_ms,
      };
    },
  };
}
