/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — BANALITY BUDGET [U-W3]
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: filter/banality-budget.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: INV-U-07
 *
 * Thermostat anti-banalité. 100% CALC — 0 token — déterministe.
 * Palier 1 du pipeline Top-K : appliqué AVANT tout juge LLM.
 *
 * TROIS TIERS :
 *   ACCEPTABLE  (2pts, max 1/scène) — cliché usuel toléré une seule fois
 *   TOXIC       (5pts)              — cliché émotionnel explicite interdit
 *   IA_GENERIC  (veto immédiat)     — marqueur IA-creuse → REJECT garanti
 *
 * RÈGLE BUDGET :
 *   budget_used = Σ(cost × capped_hits)  [acceptable plafonné à 1 hit max]
 *   veto = ia_generic_hits > 0  OR  budget_used > BUDGET_MAX (6)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const BUDGET_MAX = 6;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BanalityTier = 'acceptable' | 'toxic' | 'ia_generic';

export interface BanalityEntry {
  readonly pattern: string;
  readonly cost: number;
  readonly tier: BanalityTier;
  /** Only for 'acceptable' tier — max hits before veto (default: 1) */
  readonly max_per_scene?: number;
}

export interface BanalityConfig {
  readonly entries: readonly BanalityEntry[];
  readonly budget_max: number;
}

export interface BanalityHit {
  readonly pattern: string;
  readonly tier: BanalityTier;
  readonly cost: number;
  readonly raw_hits: number;    // actual occurrences in prose
  readonly capped_hits: number; // after max_per_scene cap
  readonly pts_charged: number; // cost * capped_hits
}

export interface BanalityResult {
  readonly budget_used: number;
  readonly budget_max: number;
  readonly veto: boolean;
  readonly veto_reason: 'ia_generic' | 'budget_exceeded' | 'acceptable_overflow' | '';
  readonly hits: readonly BanalityHit[];
  readonly acceptable_hits: number;
  readonly toxic_hits: number;
  readonly ia_generic_hits: number;
  readonly details: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// Calibré sur RANKING_V4 (158 œuvres, F1–F30)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_BANALITY_CONFIG: BanalityConfig = {
  budget_max: BUDGET_MAX,
  entries: [
    // ─── TIER ACCEPTABLE (2pts, max 1/scène) ───────────────────────────────
    // Tolérés une fois : ancrage corporel naturel, respiration narrative
    { pattern: "son cœur se serra",         cost: 2, tier: 'acceptable', max_per_scene: 1 },
    { pattern: "un silence lourd",           cost: 2, tier: 'acceptable', max_per_scene: 1 },
    { pattern: "la gorge serrée",            cost: 2, tier: 'acceptable', max_per_scene: 1 },
    { pattern: "les mains tremblaient",      cost: 2, tier: 'acceptable', max_per_scene: 1 },
    { pattern: "la fatigue",                 cost: 2, tier: 'acceptable', max_per_scene: 1 },
    { pattern: "la chaleur",                 cost: 2, tier: 'acceptable', max_per_scene: 1 },
    { pattern: "dans le silence",            cost: 2, tier: 'acceptable', max_per_scene: 1 },
    { pattern: "la lumière filtrait",        cost: 2, tier: 'acceptable', max_per_scene: 1 },

    // ─── TIER TOXIC (5pts) ─────────────────────────────────────────────────
    // Clichés émotionnels explicites — prose plate garantie
    { pattern: "une vague d'émotion",        cost: 5, tier: 'toxic' },
    { pattern: "comme un coup de tonnerre",  cost: 5, tier: 'toxic' },
    { pattern: "les larmes coulaient",       cost: 5, tier: 'toxic' },
    { pattern: "les larmes lui montèrent",   cost: 5, tier: 'toxic' },
    { pattern: "son cœur battait fort",      cost: 5, tier: 'toxic' },
    { pattern: "son cœur s'emballa",         cost: 5, tier: 'toxic' },
    { pattern: "elle ne put retenir",        cost: 5, tier: 'toxic' },
    { pattern: "il ne put retenir",          cost: 5, tier: 'toxic' },
    { pattern: "les larmes aux yeux",        cost: 5, tier: 'toxic' },

    // ─── TIER IA_GENERIC (veto immédiat) ──────────────────────────────────
    // Marqueurs IA-creuse : prose jolie mais vide, signe d'hallucination stylistique
    { pattern: "il ressentit une étrange sensation", cost: 6, tier: 'ia_generic' },
    { pattern: "elle ressentit une étrange sensation", cost: 6, tier: 'ia_generic' },
    { pattern: "une étrange sensation",      cost: 6, tier: 'ia_generic' },
    { pattern: "tout semblait irréel",       cost: 6, tier: 'ia_generic' },
    { pattern: "tout paraissait irréel",     cost: 6, tier: 'ia_generic' },
    { pattern: "il ne savait pas pourquoi",  cost: 6, tier: 'ia_generic' },
    { pattern: "elle ne savait pas pourquoi", cost: 6, tier: 'ia_generic' },
    { pattern: "quelque chose d'indéfinissable", cost: 6, tier: 'ia_generic' },
    { pattern: "un sentiment étrange",      cost: 6, tier: 'ia_generic' },
    { pattern: "comme dans un rêve",        cost: 6, tier: 'ia_generic' },
    { pattern: "comme dans un songe",       cost: 6, tier: 'ia_generic' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Évalue le budget banalité d'une prose.
 * 100% CALC — 0 token — déterministe.
 *
 * Ordre de scan : ia_generic d'abord (veto court-circuit), puis toxic, puis acceptable.
 * Normalisation : lowercase + NFD + collapse accents pour matching robuste.
 *
 * INV-U-07 : appelé AVANT tout juge LLM dans le pipeline Top-K.
 */
export function scoreBanalityBudget(
  prose: string,
  config: BanalityConfig = DEFAULT_BANALITY_CONFIG,
): BanalityResult {
  const normalizedProse = normalizeProse(prose);
  const hits: BanalityHit[] = [];

  let budget_used = 0;
  let acceptable_hits = 0;
  let toxic_hits = 0;
  let ia_generic_hits = 0;

  // Scan order: ia_generic first (fail-fast), then toxic, then acceptable
  const ordered = [
    ...config.entries.filter((e) => e.tier === 'ia_generic'),
    ...config.entries.filter((e) => e.tier === 'toxic'),
    ...config.entries.filter((e) => e.tier === 'acceptable'),
  ];

  for (const entry of ordered) {
    const normalizedPattern = normalizePattern(entry.pattern);
    const regex = new RegExp(escapeRegex(normalizedPattern), 'gi');
    const found = normalizedProse.match(regex);
    const raw_hits = found ? found.length : 0;

    if (raw_hits === 0) continue;

    const max_allowed = entry.tier === 'acceptable'
      ? (entry.max_per_scene ?? 1)
      : Infinity;

    const capped_hits = Math.min(raw_hits, max_allowed);
    const pts_charged = entry.cost * capped_hits;

    hits.push({
      pattern: entry.pattern,
      tier: entry.tier,
      cost: entry.cost,
      raw_hits,
      capped_hits,
      pts_charged,
    });

    budget_used += pts_charged;

    if (entry.tier === 'acceptable') acceptable_hits += capped_hits;
    else if (entry.tier === 'toxic') toxic_hits += capped_hits;
    else if (entry.tier === 'ia_generic') ia_generic_hits += capped_hits;
  }

  // Veto rules
  let veto = false;
  let veto_reason: BanalityResult['veto_reason'] = '';

  if (ia_generic_hits > 0) {
    veto = true;
    veto_reason = 'ia_generic';
  } else if (budget_used > config.budget_max) {
    veto = true;
    veto_reason = 'budget_exceeded';
  } else if (acceptable_hits > 1) {
    // Multiple acceptable = prose plate (>1 cliché "soft" = pattern IA détecté)
    veto = true;
    veto_reason = 'acceptable_overflow';
  }

  const details = buildDetails(hits, budget_used, config.budget_max, veto, veto_reason);

  return {
    budget_used,
    budget_max: config.budget_max,
    veto,
    veto_reason,
    hits,
    acceptable_hits,
    toxic_hits,
    ia_generic_hits,
    details,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeProse(prose: string): string {
  return prose.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0152/g, 'oe').replace(/\u0153/g, 'oe').replace(/\u00c6/g, 'ae').replace(/\u00e6/g, 'ae').toLowerCase();
}

function normalizePattern(pattern: string): string {
  return pattern.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0152/g, 'oe').replace(/\u0153/g, 'oe').replace(/\u00c6/g, 'ae').replace(/\u00e6/g, 'ae').toLowerCase();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildDetails(
  hits: readonly BanalityHit[],
  budget_used: number,
  budget_max: number,
  veto: boolean,
  veto_reason: string,
): string {
  if (hits.length === 0) {
    return `BanalityBudget: 0/${budget_max}pts — PASS (0 hits)`;
  }
  const hitSummary = hits
    .map((h) => `[${h.tier}] "${h.pattern}" ×${h.raw_hits} → ${h.pts_charged}pts`)
    .join(', ');
  const verdict = veto ? `VETO (${veto_reason})` : 'PASS';
  return `BanalityBudget: ${budget_used}/${budget_max}pts — ${verdict} | ${hitSummary}`;
}



