/**
 * OMEGA — LONG_PERIOD_TEMPLATE : le gabarit de période longue.
 *
 * POURQUOI CE CAPTEUR EXISTE
 * ──────────────────────────
 * B0 (2026-08-02) a prouvé que l'opportunité PLAN fait tomber le plafond
 * syntaxique : 0/21 → 21/21 périodes ≥50 mots, à la bonne dose (1,55 % des
 * phrases contre 1,67 % au corpus publié). Mais en LISANT les sorties — pas en
 * les comptant — un défaut neuf est apparu : les périodes commencent toutes
 * pareil. « c'est alors que tout… » ouvre 4 sorties sur 21.
 *
 * Le pattern est connu du projet (AP-9) : on troque un défaut contre un gabarit.
 * Ce module transforme une découverte-par-lecture en MESURE reproductible, pour
 * qu'aucune campagne future ne puisse la manquer.
 *
 * SEUILS — DÉRIVÉS DU CORPUS, JAMAIS ARBITRAIRES
 * ──────────────────────────────────────────────
 * Mesuré sur 18 romans FR publiés (Thilliez, Chattam, Bussi, Loubry), phrases de
 * 50 mots et plus, bootstrap 2000 tirages de 21 périodes pour comparer à effectif
 * égal avec un bras de bench :
 *
 *     taux de répétition de tête : moyenne 0,0009 · médiane 0,0000
 *     IC95 [0,0000 ; 0,0000] · maximum observé sur 2000 tirages : 0,0952
 *
 * Autrement dit : chez un romancier, deux phrases longues ne commencent
 * pratiquement jamais de la même façon. Le seuil de détection est posé JUSTE
 * AU-DESSUS du maximum jamais observé chez les publiés.
 *
 * Mesures OMEGA au moment du gel de ces seuils :
 *     B1 (PLAN seul)      0,4286   p(baseline ≥) < 0,0005   → TEMPLATE_DETECTED
 *     B3 (PLAN+exemplar)  0,7273   p(baseline ≥) < 0,0005   → TEMPLATE_DETECTED
 * L'exemplar, inerte sur la longueur, AGGRAVE le gabarit — fait consigné.
 *
 * CE MODULE NE RÉPARE RIEN. Il mesure et il refuse. La correction est du ressort
 * du PLAN (pool de têtes, à la manière de `incipitPolicy`), jamais d'une
 * réécriture cosmétique a posteriori.
 */
import { normalizedHead } from './motif-repulsion.js';
// SSOT du decoupage de phrases FR (CONCEPT-SENTENCE-SPLITTER-FR-001, commit eee592ff).
// Reimplementer un split ici recreerait la dette remboursee le 2026-07-30 — et le
// premier test l'a prouve : ma version naive coupait « M. Dupont » en deux phrases.
import { splitSentencesFr, countWordsFr } from '../../../omega-p0/src/phonetic/sentence-splitter-fr.js';

/** Longueur à partir de laquelle une phrase compte comme « période ». */
export const LONG_PERIOD_MIN_WORDS = 50;

/**
 * Seuils gelés 2026-08-02, dérivés du corpus publié (voir en-tête).
 * `TEMPLATE` est posé au-dessus du maximum jamais observé chez les publiés
 * (0,0952 sur 2000 tirages) : un dépassement n'est pas une variation naturelle.
 */
export const TEMPLATE_THRESHOLDS = {
  /** Au-delà : à surveiller — au-dessus de l'IC95 publié, sous le maximum. */
  watch: 0.05,
  /** Au-delà : gabarit établi, hors de tout ce qu'un auteur publié produit. */
  template: 0.1,
  /** Référence documentaire (moyenne publiée à effectif égal). */
  publishedMean: 0.0009,
  publishedMaxObserved: 0.0952,
} as const;

export type TemplateVerdict = 'CLEAN' | 'WATCH' | 'TEMPLATE_DETECTED';

export interface RepeatedMotif {
  readonly motif: string;
  readonly count: number;
}

export interface TemplateReport {
  /** Nombre de périodes longues trouvées, tous textes confondus. */
  readonly periods: number;
  readonly uniqueHeads: number;
  /** Part des périodes dont la tête n'est PAS unique. C'est la mesure centrale. */
  readonly headRepeatRate: number;
  readonly repeatedHeads: readonly RepeatedMotif[];
  /** 4-grammes internes récurrents : le moule de raisonnement, pas juste la tête. */
  readonly repeatedNgrams: readonly RepeatedMotif[];
  readonly verdict: TemplateVerdict;
  /** Combien de fois la baseline publiée est dépassée. */
  readonly timesAbovePublished: number;
}

const WORD_RE = /[\p{L}\p{N}'’-]+/gu;

function words(s: string): readonly string[] {
  return s.toLowerCase().match(WORD_RE) ?? [];
}

/** Découpe en phrases — délègue au splitter canonique, jamais de règle locale. */
export function splitSentences(text: string): readonly string[] {
  return splitSentencesFr(text);
}

/** Les périodes longues d'un texte, dans l'ordre. */
export function extractLongPeriods(
  text: string,
  minWords: number = LONG_PERIOD_MIN_WORDS,
): readonly string[] {
  return splitSentences(text).filter((s) => countWordsFr(s) >= minWords);
}

/**
 * Tête de période — MÊME définition que la tête d'incipit (`normalizedHead`,
 * 4 tokens minuscules). Réutiliser la définition scellée garde les mesures
 * comparables entre l'ouverture de chapitre et l'ouverture de période.
 */
export function periodHead(period: string): string {
  return normalizedHead(period, true);
}

function countRepeats(items: readonly string[]): {
  repeated: RepeatedMotif[];
  unique: number;
  rate: number;
} {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  const repeated = [...counts.entries()]
    .filter(([, c]) => c > 1)
    .map(([motif, count]) => ({ motif, count }))
    .sort((a, b) => b.count - a.count);
  const repeatedTotal = repeated.reduce((a, r) => a + r.count, 0);
  return {
    repeated,
    unique: counts.size,
    rate: items.length === 0 ? 0 : repeatedTotal / items.length,
  };
}

/**
 * Mesure le gabarit sur un ENSEMBLE de sorties (un bras de bench, un livre).
 * Sur un texte unique le taux est structurellement 0 : le gabarit est une
 * propriété de la population, pas d'un échantillon isolé.
 */
export function measureTemplateEmergence(
  texts: readonly string[],
  opts: { readonly minWords?: number; readonly ngramSize?: number } = {},
): TemplateReport {
  const minWords = opts.minWords ?? LONG_PERIOD_MIN_WORDS;
  const n = opts.ngramSize ?? 4;

  const periods: string[] = [];
  for (const t of texts) periods.push(...extractLongPeriods(t, minWords));

  const heads = periods.map(periodHead);
  const { repeated, unique, rate } = countRepeats(heads);

  const grams: string[] = [];
  for (const p of periods) {
    const w = words(p);
    for (let i = 0; i + n <= w.length; i += 1) grams.push(w.slice(i, i + n).join(' '));
  }
  const gramCounts = new Map<string, number>();
  for (const g of grams) gramCounts.set(g, (gramCounts.get(g) ?? 0) + 1);
  const minGram = Math.max(3, Math.ceil(periods.length * 0.15));
  const repeatedNgrams = [...gramCounts.entries()]
    .filter(([, c]) => c >= minGram)
    .map(([motif, count]) => ({ motif, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const verdict: TemplateVerdict =
    rate > TEMPLATE_THRESHOLDS.template
      ? 'TEMPLATE_DETECTED'
      : rate > TEMPLATE_THRESHOLDS.watch
        ? 'WATCH'
        : 'CLEAN';

  return {
    periods: periods.length,
    uniqueHeads: unique,
    headRepeatRate: Number(rate.toFixed(4)),
    repeatedHeads: repeated,
    repeatedNgrams,
    verdict,
    timesAbovePublished: Number((rate / TEMPLATE_THRESHOLDS.publishedMean).toFixed(0)),
  };
}

/**
 * Densité de périodes longues — l'autre moitié du diagnostic. Le corpus publié
 * en met 1,67 % ; en produire trop peu, c'est le défaut d'origine, en produire
 * trop serait une sur-correction.
 */
export function longPeriodDensity(
  texts: readonly string[],
  minWords: number = LONG_PERIOD_MIN_WORDS,
): { readonly sentences: number; readonly long: number; readonly ratio: number } {
  let sentences = 0;
  let long = 0;
  for (const t of texts) {
    const ss = splitSentences(t);
    sentences += ss.length;
    long += ss.filter((s) => countWordsFr(s) >= minWords).length;
  }
  return { sentences, long, ratio: sentences === 0 ? 0 : Number((long / sentences).toFixed(4)) };
}

/** Référence publiée, gelée avec les seuils. */
export const PUBLISHED_LONG_PERIOD_DENSITY = 0.0167;
