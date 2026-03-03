/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SOUL LAYER [U-W3]
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: filter/soul-layer.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: INV-U-03 (soul_layer présent 100%)
 *
 * Détecteur de présence d'âme. 100% CALC — 0 token — déterministe.
 * Vérifie qu'une prose possède au moins un ancrage subjectif non-dit.
 *
 * TROIS FAMILLES DE MARQUEURS :
 *   F1 — INTÉRIORITÉ  : verbes de perception/cognition subjective
 *   F2 — CORPORÉITÉ   : réaction physique non-émotionnelle nommée
 *   F3 — IMPLICATION  : blanc narratif / ellipse / phrase courte après tension
 *
 * RÈGLE PRÉSENCE :
 *   soul_present = F1 >= 1 OR F2 >= 1 OR F3 >= 1
 *   human_warmth = (F1*2 + F2 + F3) / word_count * 1000
 *   floor : human_warmth >= 0.5  (calibré RANKING_V4)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const SOUL_WARMTH_FLOOR = 0.5;
export const SOUL_MIN_WORD_COUNT = 30; // prose trop courte → non évaluable

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SoulFamily = 'interiorite' | 'corporeite' | 'implication';

export interface SoulMarker {
  readonly pattern: string;
  readonly family: SoulFamily;
  readonly weight: number; // contribution au human_warmth score
}

export interface SoulResult {
  readonly soul_present: boolean;
  readonly human_warmth: number;       // score [0, ∞) — floor = 0.5
  readonly warmth_floor_pass: boolean; // human_warmth >= SOUL_WARMTH_FLOOR
  readonly f1_interiorite: number;     // count
  readonly f2_corporeite: number;
  readonly f3_implication: number;
  readonly word_count: number;
  readonly too_short: boolean;         // prose < SOUL_MIN_WORD_COUNT mots
  readonly details: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKERS — calibrés sur corpus FR RANKING_V4
// ═══════════════════════════════════════════════════════════════════════════════

const SOUL_MARKERS: readonly SoulMarker[] = [
  // ─── F1 INTÉRIORITÉ (weight 2) ──────────────────────────────────────────
  // Verbes subjectifs : perception/cognition interne non déclarée
  { pattern: "remarqua",        family: 'interiorite', weight: 2 },
  { pattern: "remarquait",      family: 'interiorite', weight: 2 },
  { pattern: "pensa",           family: 'interiorite', weight: 2 },
  { pattern: "pensait",         family: 'interiorite', weight: 2 },
  { pattern: "songea",          family: 'interiorite', weight: 2 },
  { pattern: "songeait",        family: 'interiorite', weight: 2 },
  { pattern: "comprit",         family: 'interiorite', weight: 2 },
  { pattern: "comprenait",      family: 'interiorite', weight: 2 },
  { pattern: "sut",             family: 'interiorite', weight: 2 },
  { pattern: "savait",          family: 'interiorite', weight: 2 },
  { pattern: "percevait",       family: 'interiorite', weight: 2 },
  { pattern: "perçut",          family: 'interiorite', weight: 2 },
  { pattern: "devinait",        family: 'interiorite', weight: 2 },
  { pattern: "devina",          family: 'interiorite', weight: 2 },
  { pattern: "reconnut",        family: 'interiorite', weight: 2 },
  { pattern: "reconnaissait",   family: 'interiorite', weight: 2 },
  { pattern: "nota",            family: 'interiorite', weight: 2 },
  { pattern: "notait",          family: 'interiorite', weight: 2 },
  { pattern: "il vit",          family: 'interiorite', weight: 2 },
  { pattern: "elle vit",        family: 'interiorite', weight: 2 },
  { pattern: "il entendait",    family: 'interiorite', weight: 2 },
  { pattern: "elle entendait",  family: 'interiorite', weight: 2 },

  // ─── F2 CORPORÉITÉ (weight 1) ───────────────────────────────────────────
  // Réactions physiques concrètes non-émotionnelles — ancrage dans le corps réel
  { pattern: "la gorge",        family: 'corporeite', weight: 1 },
  { pattern: "les mains",       family: 'corporeite', weight: 1 },
  { pattern: "le souffle",      family: 'corporeite', weight: 1 },
  { pattern: "son souffle",     family: 'corporeite', weight: 1 },
  { pattern: "les épaules",     family: 'corporeite', weight: 1 },
  { pattern: "ses épaules",     family: 'corporeite', weight: 1 },
  { pattern: "le regard",       family: 'corporeite', weight: 1 },
  { pattern: "son regard",      family: 'corporeite', weight: 1 },
  { pattern: "les yeux",        family: 'corporeite', weight: 1 },
  { pattern: "ses yeux",        family: 'corporeite', weight: 1 },
  { pattern: "la nuque",        family: 'corporeite', weight: 1 },
  { pattern: "les doigts",      family: 'corporeite', weight: 1 },
  { pattern: "ses doigts",      family: 'corporeite', weight: 1 },
  { pattern: "la mâchoire",     family: 'corporeite', weight: 1 },
  { pattern: "sa mâchoire",     family: 'corporeite', weight: 1 },
  { pattern: "les pieds",       family: 'corporeite', weight: 1 },
  { pattern: "ses pieds",       family: 'corporeite', weight: 1 },
  { pattern: "la respiration",  family: 'corporeite', weight: 1 },
  { pattern: "sa respiration",  family: 'corporeite', weight: 1 },

  // ─── F3 IMPLICATION (weight 1) ──────────────────────────────────────────
  // Blanc narratif : ellipse, non-dit, sous-texte par l'absence
  { pattern: "il ne dit rien",  family: 'implication', weight: 1 },
  { pattern: "elle ne dit rien", family: 'implication', weight: 1 },
  { pattern: "il se tut",       family: 'implication', weight: 1 },
  { pattern: "elle se tut",     family: 'implication', weight: 1 },
  { pattern: "rien ne",         family: 'implication', weight: 1 },
  { pattern: "sans un mot",     family: 'implication', weight: 1 },
  { pattern: "sans rien dire",  family: 'implication', weight: 1 },
  { pattern: "n'ajouta rien",   family: 'implication', weight: 1 },
  { pattern: "laissa passer",   family: 'implication', weight: 1 },
  { pattern: "ne répondit pas", family: 'implication', weight: 1 },
  { pattern: "ne répondit rien", family: 'implication', weight: 1 },
  { pattern: "il attendit",     family: 'implication', weight: 1 },
  { pattern: "elle attendit",   family: 'implication', weight: 1 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détecte la présence de Soul Layer dans une prose.
 * 100% CALC — 0 token — déterministe.
 *
 * soul_present = au moins 1 marqueur parmi F1/F2/F3
 * human_warmth = score pondéré / word_count * 1000
 */
export function scoreSoulLayer(prose: string): SoulResult {
  const word_count = countWords(prose);
  const too_short = word_count < SOUL_MIN_WORD_COUNT;

  const normalized = normalizeProse(prose);

  let f1 = 0;
  let f2 = 0;
  let f3 = 0;
  let warmth_raw = 0;

  for (const marker of SOUL_MARKERS) {
    const normalizedPattern = normalizePattern(marker.pattern);
    const regex = new RegExp(escapeRegex(normalizedPattern), 'gi');
    const found = normalized.match(regex);
    if (!found) continue;

    const count = found.length;
    warmth_raw += marker.weight * count;

    if (marker.family === 'interiorite') f1 += count;
    else if (marker.family === 'corporeite') f2 += count;
    else if (marker.family === 'implication') f3 += count;
  }

  const soul_present = f1 >= 1 || f2 >= 1 || f3 >= 1;
  const human_warmth = word_count > 0
    ? (warmth_raw / word_count) * 1000
    : 0;
  const warmth_floor_pass = human_warmth >= SOUL_WARMTH_FLOOR;

  const details = buildDetails(
    soul_present, human_warmth, warmth_floor_pass,
    f1, f2, f3, word_count, too_short,
  );

  return {
    soul_present,
    human_warmth: round3(human_warmth),
    warmth_floor_pass,
    f1_interiorite: f1,
    f2_corporeite: f2,
    f3_implication: f3,
    word_count,
    too_short,
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

function countWords(prose: string): number {
  return prose.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function buildDetails(
  soul_present: boolean,
  human_warmth: number,
  warmth_floor_pass: boolean,
  f1: number, f2: number, f3: number,
  word_count: number,
  too_short: boolean,
): string {
  const verdict = soul_present ? 'SOUL_PRESENT' : 'SOUL_ABSENT';
  const warmthVerdict = warmth_floor_pass ? 'warmth_OK' : 'warmth_LOW';
  const shortTag = too_short ? ' [TOO_SHORT]' : '';
  return `SoulLayer: ${verdict} | warmth=${human_warmth.toFixed(3)} (floor=${SOUL_WARMTH_FLOOR}) ${warmthVerdict} | F1=${f1} F2=${f2} F3=${f3} | words=${word_count}${shortTag}`;
}


