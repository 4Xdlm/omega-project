/**
 * DEC-017 — IntrinsicQualityScore (advisory + sélecteur pairwise). SHADOW / télémétrie uniquement.
 * ============================================================================
 * Module STANDALONE, NON câblé dans le verdict de production (zéro impact min_axis/composite/SEAL).
 * Mesure la qualité littéraire intrinsèque (profondeur + style + voix) via un juge LLM, à granularité de SCÈNE.
 * Preuve : WS_D_R5 / R5-large (FR AUC ~0.85 @1500 mots, pairwise 0.81). Ratifié DEC-017 (Tribunal 2/2).
 *
 * Amendements ratifiés appliqués :
 *   A1 — pairwise joué dans les 2 ordres (A/B puis B/A) ; anti-biais de position.
 *   A2 — granularité valide ~1200-1800 mots (sinon advisory faible / diagnostic).
 *   A3 — pour la sélection, le pairwise prime ; le score absolu est secondaire (lecture du progrès).
 *
 * Flag : OMEGA_INTRINSIC_QUALITY ∈ {'0' (défaut, inactif), 'shadow' (logue)}. Aucun gate dur ici.
 * La logique d'agrégation est PURE (testable hors Ollama) ; les appels LLM sont isolés.
 */

export type QLang = 'fr' | 'en';

/** Interface minimale du provider (découplage : pas d'import lourd, testable par mock). */
export interface QualityProvider {
  generateStructuredJSON(prompt: string): Promise<unknown>;
}

export const QUALITY_DIMS = ['profondeur', 'style', 'voix'] as const;
export type QualityDim = (typeof QUALITY_DIMS)[number];

const DIM_TEXT: Record<QualityDim, { fr: string; en: string }> = {
  profondeur: {
    fr: "la PROFONDEUR : densité de sens et de pensée au-delà de l'action",
    en: 'DEPTH: density of meaning and thought beyond plot',
  },
  style: {
    fr: 'le STYLE : sophistication syntaxique, justesse lexicale, controle du registre, absence de facilite/cliche',
    en: 'STYLE: syntactic sophistication, lexical precision, register control, absence of cliché',
  },
  voix: {
    fr: 'la VOIX : singularite irremplacable (vs prose generique, interchangeable)',
    en: 'VOICE: irreplaceable singularity (vs generic, interchangeable prose)',
  },
};

export const QUALITY_MIN_WORDS = 1200;
export const QUALITY_MAX_WORDS = 1800;

/** A2 — granularité de scène. */
export function granularityOk(wordCount: number): boolean {
  return wordCount >= QUALITY_MIN_WORDS && wordCount <= QUALITY_MAX_WORDS;
}

export function countWords(s: string): number {
  return s.split(/\s+/).filter((w) => w.length > 0).length;
}

/** Agrégation PURE des 3 dimensions -> score advisory. */
export function aggregateQuality(profondeur: number, style: number, voix: number): number {
  return +((profondeur + style + voix) / 3).toFixed(2);
}

/** Parse robuste d'un {score:0-100} ; NaN si invalide. */
export function parseScore(j: unknown): number {
  if (j && typeof j === 'object' && 'score' in j) {
    const n = Number((j as { score: unknown }).score);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
  }
  return Number.NaN;
}

/** Parse robuste d'un {winner:'A'|'B'} ; null si invalide. */
export function parseWinner(j: unknown): 'A' | 'B' | null {
  if (j && typeof j === 'object' && 'winner' in j) {
    const w = String((j as { winner: unknown }).winner).toUpperCase().trim();
    if (w === 'A' || w === 'B') return w;
  }
  return null;
}

function absPrompt(lang: QLang, dim: QualityDim, prose: string): string {
  const d = DIM_TEXT[dim][lang];
  return lang === 'fr'
    ? `Tu es un critique litteraire exigeant. Evalue ${d}. IMPORTANT : note LARGE, ose les notes basses pour la prose mediocre (un roman de gare doit tomber a 20-40 ; seuls les maitres meritent 90+). Texte:\n${prose}\n\nReponds UNIQUEMENT en JSON : {"score":0-100}`
    : `You are a demanding literary critic. Rate ${d}. IMPORTANT: use the FULL range, dare low scores for mediocre prose (pulp 20-40; only masters earn 90+). Text:\n${prose}\n\nReply ONLY as JSON: {"score":0-100}`;
}

function pairPrompt(lang: QLang, a: string, b: string): string {
  return lang === 'fr'
    ? `Tu es un critique litteraire exigeant. Voici deux extraits de prose francaise de longueur comparable. Lequel est la prose la plus accomplie litterairement (profondeur, style, voix, justesse — PAS la quantite de peripeties) ?\n\n=== EXTRAIT A ===\n${a}\n\n=== EXTRAIT B ===\n${b}\n\nReponds UNIQUEMENT en JSON : {"winner":"A"|"B"}`
    : `You are a demanding literary critic. Two prose excerpts of comparable length. Which is the more accomplished literary prose (depth, style, voice, precision — NOT amount of plot)?\n\n=== EXCERPT A ===\n${a}\n\n=== EXCERPT B ===\n${b}\n\nReply ONLY as JSON: {"winner":"A"|"B"}`;
}

export interface IntrinsicQualityResult {
  readonly profondeur: number;
  readonly style: number;
  readonly voix: number;
  readonly mean: number;
  readonly words: number;
  readonly granularity_ok: boolean;
}

/** Score advisory profondeur/style/voix (3 appels LLM). NE gate rien. */
export async function scoreIntrinsicQuality(
  prose: string,
  lang: QLang,
  provider: QualityProvider,
): Promise<IntrinsicQualityResult> {
  const words = countWords(prose);
  const out: Record<QualityDim, number> = { profondeur: Number.NaN, style: Number.NaN, voix: Number.NaN };
  for (const dim of QUALITY_DIMS) {
    out[dim] = parseScore(await provider.generateStructuredJSON(absPrompt(lang, dim, prose)));
  }
  return {
    profondeur: out.profondeur,
    style: out.style,
    voix: out.voix,
    mean: aggregateQuality(out.profondeur, out.style, out.voix),
    words,
    granularity_ok: granularityOk(words),
  };
}

/** Comptage PURE des victoires par candidat. */
export function tallyWins(nCandidates: number, comparisons: ReadonlyArray<{ winner: number }>): number[] {
  const wins = new Array<number>(nCandidates).fill(0);
  for (const c of comparisons) {
    if (c.winner >= 0 && c.winner < nCandidates) wins[c.winner] = (wins[c.winner] ?? 0) + 1;
  }
  return wins;
}

/** indexOfMax PURE (premier max). */
export function indexOfMax(xs: ReadonlyArray<number>): number {
  let best = 0;
  for (let i = 1; i < xs.length; i++) if ((xs[i] ?? -Infinity) > (xs[best] ?? -Infinity)) best = i;
  return best;
}

export interface PickBestResult {
  readonly winner: number;
  readonly wins: ReadonlyArray<number>;
  readonly n_comparisons: number;
}

/**
 * Sélecteur best-of-N par tournoi pairwise (A3 : pairwise prime).
 * A1 : chaque paire jouée dans les 2 ordres. Le candidat gagne 1 point par comparaison remportée.
 */
export async function pickBestPairwise(
  candidates: ReadonlyArray<string>,
  lang: QLang,
  provider: QualityProvider,
): Promise<PickBestResult> {
  const comparisons: { winner: number }[] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      for (const order of [0, 1] as const) {
        const a = order === 0 ? candidates[i]! : candidates[j]!;
        const b = order === 0 ? candidates[j]! : candidates[i]!;
        const w = parseWinner(await provider.generateStructuredJSON(pairPrompt(lang, a, b)));
        if (w === 'A') comparisons.push({ winner: order === 0 ? i : j });
        else if (w === 'B') comparisons.push({ winner: order === 0 ? j : i });
      }
    }
  }
  const wins = tallyWins(candidates.length, comparisons);
  return { winner: indexOfMax(wins), wins, n_comparisons: comparisons.length };
}

/** Flag d'activation (défaut inactif). */
export function intrinsicQualityMode(): '0' | 'shadow' {
  return process.env.OMEGA_INTRINSIC_QUALITY === 'shadow' ? 'shadow' : '0';
}
