/**
 * OMEGA Book-Factory — REPETITION_SENSOR (BF-08). SOURCE UNIQUE DE VÉRITÉ sur la
 * répétition (mandat tribunal 2/2 + Architecte 2026-06-09, Phase 2 homogénéisation).
 *
 * POURQUOI : la mesure de répétition était ÉCLATÉE — `tics-gate` (n-grammes),
 * `tic-forensic-v3` (phrase trans-chap), `cross-chapter-repeat` (Jaccard),
 * `build-canonical.maxTicPer1000w` (5 phrases atmosphériques), + le SHADOW Python
 * AP-9. Conséquence MESURÉE (dry-run V3) : corriger les tics GESTUELS sans capteur
 * global déplaçait la « moisissure » vers l'axe ATMOSPHÉRIQUE (1.481 → 1.611).
 * Ce module agrège TOUTES les familles en UNE matrice normalisée /1000 mots, à
 * deux échelles (livre + chapitre), avec une règle d'acceptation de patch stricte :
 * AUCUN axe ne doit monter (Δ ≤ 0 partout, et l'axe ciblé baisse).
 *
 * DOCTRINE : ce module MESURE et JUGE l'admissibilité d'une réparation. Il ne
 * répare RIEN (c'est le tic-weaver, gardé par seam-surgeon). Les seuils sont des
 * EXPERIMENTAL_DEFAULTS — NON SCELLÉS (EMP-16 : 3 corpus requis ; un seul livre
 * mesuré). `clean` est un RAPPORT, pas une gate bloquante tant que non scellé.
 *
 * INVARIANTS :
 *   INV-RS-01 : toute mesure normalisée /1000 mots (comparable entre livres).
 *   INV-RS-02 : familles disjointes, agrégées par MAX intra-famille puis listées.
 *   INV-RS-03 : `patchAdmissible` ⇔ aucun axe famille ne monte ET la cible baisse
 *               ET le nombre de répétitions exactes ne monte pas.
 */

/* ─────────────────────────── TAXONOMIE DES FAMILLES ────────────────────────── */

export type TicFamily = 'GESTURAL' | 'ATMOSPHERIC' | 'SATURATION' | 'PHRASE';

export interface FamilyPatterns {
  readonly family: TicFamily;
  /** Motifs littéraux (insensibles à la casse) OU regex si `regex:true`. */
  readonly patterns: readonly string[];
  readonly regex: boolean;
}

/** Familles par défaut — fusionne DEFAULT_TICS (build-canonical), les tics
 *  gestuels AP-9, la saturation atmosphérique (« L'air saturé » ×52, trouvée
 *  par le scan de fatigue AP-9), et les 4-grammes-tic dominants (AP-4). */
export const DEFAULT_FAMILIES: readonly FamilyPatterns[] = [
  {
    family: 'GESTURAL',
    regex: false,
    patterns: [
      'esquissa un sourire', 'ne cilla pas', 'ne bougea pas', 'se crispa',
      'fronça les sourcils', 'ne répondit', 'ferma les yeux', 'haussa les épaules',
      'hocha la tête', 'eut un rictus', 'ne recula pas', 'ne dit rien',
    ],
  },
  {
    family: 'ATMOSPHERIC',
    regex: false,
    patterns: ['le gardien', 'le silence', 'il y a', 'la pluie', 'le village'],
  },
  {
    family: 'SATURATION',
    regex: true,
    patterns: ["l'air\\b[^.]*saturé", 'le mot tomba comme', 'comme un couperet'],
  },
  {
    family: 'PHRASE',
    regex: false,
    patterns: ['fit un pas vers', 'fit un pas en avant', 'le silence qui suivit', 'comme un coup de feu', 'près de la fenêtre'],
  },
];

/* ─────────────────────────────── INSTRUMENTS ───────────────────────────────── */

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
function wordCount(text: string): number {
  return text.split(/\s+/u).filter((w) => w.length > 0).length;
}
function countPattern(text: string, pat: string, regex: boolean): number {
  const re = new RegExp(regex ? pat : escapeRe(pat), 'giu');
  return (text.match(re) ?? []).length;
}
function sentences(text: string): readonly string[] {
  return text.split(/(?<=[.!?…»])\s+/u).map((s) => s.trim()).filter((s) => s.split(/\s+/u).length >= 5);
}
function normSentence(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[^a-zàâäéèêëïîôöûüç ]/gu, '').replace(/\s+/gu, ' ').trim();
}

/* ──────────────────────────── CONTRAT DE SORTIE ────────────────────────────── */

export interface FamilyProfile {
  readonly family: TicFamily;
  /** Densité du motif le plus représenté de la famille, /1000 mots (INV-RS-01/02). */
  readonly maxDensityPer1000w: number;
  /** Somme des occurrences de tous les motifs de la famille. */
  readonly total: number;
  /** Motif dominant + son compte (traçabilité). */
  readonly topPattern: string;
  readonly topCount: number;
}

export interface RepetitionProfile {
  readonly words: number;
  readonly families: readonly FamilyProfile[];
  /** Phrases (≥5 mots) répétées EXACTEMENT ≥ `exactRepeatMin` fois. */
  readonly exactRepeats: readonly { readonly sentence: string; readonly count: number }[];
  readonly exactRepeatCount: number;
  /** Pire densité toutes familles confondues (miroir de l'ancien maxTicPer1000w). */
  readonly worstFamilyDensity: number;
  /** Score unifié (somme des densités familles + pénalité répétition exacte) —
   *  plus bas = plus propre. Monotone, pour le ranking et le suivi avant/après. */
  readonly score: number;
  /** RAPPORT (non bloquant tant que seuils non scellés). */
  readonly clean: boolean;
}

export interface SensorConfig {
  readonly families?: readonly FamilyPatterns[];
  readonly densityThresholdPer1000w?: number; // défaut 1.5 (hérité NARRATIVE_CLEAN)
  readonly exactRepeatMin?: number;           // défaut 3
}

/* ─────────────────────────────── LE CAPTEUR ────────────────────────────────── */

export function measureRepetition(text: string, config: SensorConfig = {}): RepetitionProfile {
  const families = config.families ?? DEFAULT_FAMILIES;
  const threshold = config.densityThresholdPer1000w ?? 1.5;
  const exactMin = config.exactRepeatMin ?? 3;
  const words = Math.max(1, wordCount(text));

  const profiles: FamilyProfile[] = families.map((f) => {
    let topCount = 0;
    let topPattern = '';
    let total = 0;
    for (const p of f.patterns) {
      const n = countPattern(text, p, f.regex);
      total += n;
      if (n > topCount) { topCount = n; topPattern = p; }
    }
    return { family: f.family, maxDensityPer1000w: (topCount * 1000) / words, total, topPattern, topCount };
  });

  const counts = new Map<string, number>();
  for (const s of sentences(text)) {
    const k = normSentence(s);
    if (k.length === 0) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const exactRepeats = [...counts.entries()]
    .filter(([, c]) => c >= exactMin)
    .map(([sentence, count]) => ({ sentence, count }))
    .sort((a, b) => b.count - a.count);

  const worstFamilyDensity = Math.max(0, ...profiles.map((p) => p.maxDensityPer1000w));
  const score =
    profiles.reduce((a, p) => a + p.maxDensityPer1000w, 0) +
    (exactRepeats.reduce((a, r) => a + r.count, 0) * 1000) / words;
  const clean = worstFamilyDensity <= threshold && exactRepeats.length === 0;

  return { words, families: profiles, exactRepeats, exactRepeatCount: exactRepeats.length, worstFamilyDensity, score, clean };
}

/* ───────────────── RÈGLE D'ACCEPTATION D'UN PATCH (INV-RS-03) ───────────────── */

export interface AdmissibilityResult {
  readonly admissible: boolean;
  readonly reasons: readonly string[];
  readonly deltaScore: number;
}

/** Un patch (texte avant → après) est admissible SSI : aucun axe famille ne MONTE,
 *  la famille CIBLE baisse strictement, et le nombre de répétitions exactes ne
 *  monte pas. C'est la règle « on ne déplace pas la moisissure » (mandat ChatGPT). */
export function patchAdmissible(
  before: string,
  after: string,
  targetFamily: TicFamily,
  config: SensorConfig = {},
): AdmissibilityResult {
  const b = measureRepetition(before, config);
  const a = measureRepetition(after, config);
  const reasons: string[] = [];

  // COMPTES (total par famille), pas densités : invariants à la longueur du texte
  // (leçon dry-run TS — raccourcir un passage gonflait les densités → faux FAMILY_ROSE).
  const byFam = (prof: RepetitionProfile, fam: TicFamily): number =>
    prof.families.find((p) => p.family === fam)?.total ?? 0;

  for (const fam of new Set([...b.families, ...a.families].map((p) => p.family))) {
    if (byFam(a, fam) > byFam(b, fam)) reasons.push(`FAMILY_ROSE:${fam} ${byFam(b, fam)}→${byFam(a, fam)}`);
  }
  if (byFam(a, targetFamily) >= byFam(b, targetFamily)) reasons.push(`TARGET_NOT_REDUCED:${targetFamily}`);
  if (a.exactRepeatCount > b.exactRepeatCount) reasons.push(`EXACT_REPEATS_ROSE:${b.exactRepeatCount}→${a.exactRepeatCount}`);

  const tot = (p: RepetitionProfile): number => p.families.reduce((s, f) => s + f.total, 0) + p.exactRepeatCount;
  return { admissible: reasons.length === 0, reasons, deltaScore: tot(a) - tot(b) };
}
