/**
 * validate_corpus_golden.ts
 * U-W1 — Validateur Corpus Golden v1
 *
 * Règles enforced:
 *   RULE-CG-01 : total_items = target_items (85)
 *   RULE-CG-02 : INV-U-02 — human_ratio >= 0.70
 *   RULE-CG-03 : IDs uniques (pas de collision)
 *   RULE-CG-04 : Champs obligatoires présents et non-vides
 *   RULE-CG-04b: category valide (human_top | human_public | omega_top25 | anti_ia)
 *   RULE-CG-04c: language valide (fr | en)
 *   RULE-CG-05 : Scores dans [0, 100] si renseignés
 *   RULE-CG-06 : anti_ia  → human_authored = false
 *   RULE-CG-07 : omega_top25 → human_authored = true
 *   RULE-CG-08 : ranking_v4_sha présent et non-vide
 *   RULE-CG-09 : version présente
 *
 * Standard: NASA-Grade L4 / DO-178C
 * Verdict: PASS ou FAIL — jamais entre les deux
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type Category = 'human_top' | 'human_public' | 'omega_top25' | 'anti_ia';
export type Language = 'fr' | 'en';

export interface RankingV4Scores {
  F22_index_litteraire: number | null;
  F24_contrast_budget:  number | null;
  F25_image_mentale:    number | null;
  F29_TTR:              number | null;
  ranking_v4_rejected:  boolean;
}

export interface ItemScores {
  D1_prose:      number | null;
  D2_impact:     number | null;
  D3_originalite: number | null;
  scorer_id:     string | null;
  scored_at:     string | null;
}

export interface CorpusItem {
  id:             string;
  category:       Category;
  human_authored: boolean;
  title:          string;
  author:         string;
  language:       Language;
  corpus:         string;
  source_file:    string;
  ranking_v4:     RankingV4Scores;
  human_scored:   boolean;
  scores:         ItemScores;
}

export interface CorpusRules {
  min_human_ratio:  number;
  target_items:     number;
  score_dimensions: string[];
  scale:            [number, number];
}

export interface CorpusGolden {
  version:         string;
  created_utc:     string;
  ranking_v4_sha:  string;
  rules:           CorpusRules;
  stats:           unknown;
  items:           CorpusItem[];
}

// ── Erreurs ──────────────────────────────────────────────────────────────────

export class CorpusValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'CorpusValidationError';
  }
}

// ── Résultat ─────────────────────────────────────────────────────────────────

export type ValidationVerdict = 'PASS' | 'FAIL';

export interface ValidationViolation {
  rule:      string;
  item_id?:  string;
  detail:    string;
}

export interface ValidationResult {
  verdict:    ValidationVerdict;
  violations: ValidationViolation[];
  stats: {
    total:                  number;
    human_authored:         number;
    human_ratio:            number;
    by_category:            Record<string, number>;
    duplicates:             number;
    missing_fields:         number;
    score_range_violations: number;
    inv_u02_pass:           boolean;
  };
}

// ── Constantes ───────────────────────────────────────────────────────────────

const VALID_CATEGORIES: Category[] = ['human_top', 'human_public', 'omega_top25', 'anti_ia'];
const VALID_LANGUAGES:  Language[] = ['fr', 'en'];
const SCORE_DIMENSIONS: (keyof ItemScores)[] = ['D1_prose', 'D2_impact', 'D3_originalite'];

// ── Validateur principal ─────────────────────────────────────────────────────

export function validateCorpusGolden(corpus: CorpusGolden): ValidationResult {
  const violations: ValidationViolation[] = [];
  const total = corpus.items.length;

  // RULE-CG-01
  if (total !== corpus.rules.target_items) {
    violations.push({
      rule:   'RULE-CG-01',
      detail: `total_items=${total} != target_items=${corpus.rules.target_items}`,
    });
  }

  // RULE-CG-02 — INV-U-02
  const humanCount = corpus.items.filter(i => i.human_authored).length;
  const humanRatio = total > 0 ? humanCount / total : 0;
  if (humanRatio < corpus.rules.min_human_ratio) {
    violations.push({
      rule:   'RULE-CG-02 [INV-U-02]',
      detail: `human_ratio=${humanRatio.toFixed(4)} < min=${corpus.rules.min_human_ratio}`,
    });
  }

  // RULE-CG-03 — IDs uniques
  const seenIds = new Set<string>();
  let duplicateCount = 0;
  for (const item of corpus.items) {
    if (seenIds.has(item.id)) {
      violations.push({ rule: 'RULE-CG-03', item_id: item.id, detail: `ID dupliqué: ${item.id}` });
      duplicateCount++;
    }
    seenIds.add(item.id);
  }

  // RULE-CG-04 — champs obligatoires
  let missingFieldsCount = 0;
  for (const item of corpus.items) {
    const required = ['id', 'category', 'title', 'author', 'language', 'corpus', 'source_file'] as const;
    for (const field of required) {
      const val = item[field as keyof CorpusItem];
      if (val === null || val === undefined || val === '') {
        violations.push({ rule: 'RULE-CG-04', item_id: item.id, detail: `Champ manquant: ${field}` });
        missingFieldsCount++;
      }
    }

    // RULE-CG-04b
    if (!VALID_CATEGORIES.includes(item.category)) {
      violations.push({ rule: 'RULE-CG-04b', item_id: item.id, detail: `category invalide: "${item.category}"` });
      missingFieldsCount++;
    }

    // RULE-CG-04c
    if (!VALID_LANGUAGES.includes(item.language)) {
      violations.push({ rule: 'RULE-CG-04c', item_id: item.id, detail: `language invalide: "${item.language}"` });
      missingFieldsCount++;
    }
  }

  // RULE-CG-05 — scores dans [0, 100]
  let scoreRangeViolations = 0;
  for (const item of corpus.items) {
    for (const dim of SCORE_DIMENSIONS) {
      const val = item.scores[dim] as number | null;
      if (val !== null && val !== undefined) {
        if (typeof val !== 'number' || !isFinite(val) || val < 0 || val > 100) {
          violations.push({ rule: 'RULE-CG-05', item_id: item.id, detail: `${dim}=${val} hors [0,100]` });
          scoreRangeViolations++;
        }
      }
    }
  }

  // RULE-CG-06 — anti_ia → human_authored = false
  for (const item of corpus.items) {
    if (item.category === 'anti_ia' && item.human_authored === true) {
      violations.push({ rule: 'RULE-CG-06', item_id: item.id, detail: `anti_ia avec human_authored=true` });
    }
  }

  // RULE-CG-07 — omega_top25 → human_authored = true
  for (const item of corpus.items) {
    if (item.category === 'omega_top25' && item.human_authored === false) {
      violations.push({ rule: 'RULE-CG-07', item_id: item.id, detail: `omega_top25 avec human_authored=false` });
    }
  }

  // RULE-CG-08 — ranking_v4_sha valide
  if (!corpus.ranking_v4_sha || corpus.ranking_v4_sha.length < 10) {
    violations.push({ rule: 'RULE-CG-08', detail: 'ranking_v4_sha absent ou invalide' });
  }

  // RULE-CG-09 — version présente
  if (!corpus.version) {
    violations.push({ rule: 'RULE-CG-09', detail: 'version absente' });
  }

  const byCategory: Record<string, number> = {};
  for (const cat of VALID_CATEGORIES) {
    byCategory[cat] = corpus.items.filter(i => i.category === cat).length;
  }

  return {
    verdict:    violations.length === 0 ? 'PASS' : 'FAIL',
    violations,
    stats: {
      total,
      human_authored:         humanCount,
      human_ratio:            Math.round(humanRatio * 10000) / 10000,
      by_category:            byCategory,
      duplicates:             duplicateCount,
      missing_fields:         missingFieldsCount,
      score_range_violations: scoreRangeViolations,
      inv_u02_pass:           humanRatio >= corpus.rules.min_human_ratio,
    },
  };
}

// ── Helper: parse + validate depuis JSON brut ─────────────────────────────────

export function validateCorpusFromJson(json: string): ValidationResult {
  let corpus: CorpusGolden;
  try {
    corpus = JSON.parse(json) as CorpusGolden;
  } catch (e) {
    throw new CorpusValidationError('PARSE_ERROR', `JSON invalide: ${String(e)}`);
  }
  if (!corpus.items || !Array.isArray(corpus.items)) {
    throw new CorpusValidationError('SCHEMA_ERROR', 'corpus.items absent ou non-tableau');
  }
  if (!corpus.rules) {
    throw new CorpusValidationError('SCHEMA_ERROR', 'corpus.rules absent');
  }
  return validateCorpusGolden(corpus);
}
