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

/* ─────────────── FAMILLE TAIL — CANONICALISATION (2026-08-03) ─────────────── */

/**
 * POURQUOI : trois définitions incompatibles circulaient dans les campagnes —
 * `f26b_long_sent_rate` (> 40 mots, sovereign-engine), la loi de queue (≥ 50),
 * et l'opportunité du PLAN (50-90). Les chiffres n'étaient PAS comparables
 * (amendement ChatGPT 2026-08-03 : « aucune augmentation de dose avant cette
 * canonicalisation »). Cette famille fixe les seuils UNE FOIS, sur LE splitter
 * canonique et LE compteur de mots canonique. Toute mesure de queue passe ici.
 *
 * Étalonnage par livre, échelle passage (~1000 mots), corpus du 3 août :
 *   tail40 — thriller FR élite (18 livres) : méd 0,0120 [Q1 0,0080 - Q3 0,0200],
 *            frontière haute observée 0,0930 (Chattam, « Que ta volonté... ») ;
 *            maîtres FR contemporains hors thriller (8) : méd 0,146 ;
 *            N9 scribe V2 : 0,0081.
 *   AUC tail40 maîtres-contemp vs thriller : 0,90 (p_auteur 0,012) — marqueur de
 *   REGISTRE. Élite vs pop thriller : 0,57 (ns) — PAS un marqueur de qualité
 *   intra-genre. Ne jamais l'optimiser comme un score.
 */
export interface TailRates {
  readonly sentences: number;
  /** Part de phrases STRICTEMENT au-dessus de 30/40 mots (déf. f26b : `> 40`). */
  readonly tail30: number;
  readonly tail40: number;
  /** Part de phrases à 50/60/90 mots OU PLUS (déf. loi de queue : `≥`). */
  readonly tail50: number;
  readonly tail60: number;
  readonly tail90: number;
  readonly maxLen: number;
  /* ── FORME de la queue (amendement ChatGPT 2026-08-03) ──
   * Fait mesuré : N9 a tail50/tail40 = 0,75-0,82 quand le thriller élite est à
   * 0,330 méd [0,111-0,528, 18 livres]. Quand une phrase N9 dépasse 40 mots,
   * elle dépasse presque toujours 50 : le PLAN produit « phrase normale OU
   * grande période planifiée », sans la zone organique 41-49 qui fait deux
   * tiers des phrases longues humaines. La DOSE est bonne, la FORME ne l'est
   * pas. Ces bandes rendent l'artefact mesurable ; elles ne fixent aucun quota. */
  readonly band41_49: number;
  readonly band50_59: number;
  readonly band60_89: number;
  readonly band90plus: number;
  /** tail50 / tail40 — 0 si tail40 = 0 (jamais NaN). Humain ≈ 0,33 ; binaire → 1. */
  readonly shapeRatio: number;
}

export function measureTailRates(text: string): TailRates {
  const lens = splitSentences(text).map((s) => countWordsFr(s));
  const n = lens.length;
  if (n === 0) {
    return {
      sentences: 0, tail30: 0, tail40: 0, tail50: 0, tail60: 0, tail90: 0, maxLen: 0,
      band41_49: 0, band50_59: 0, band60_89: 0, band90plus: 0, shapeRatio: 0,
    };
  }
  const over = (k: number): number => lens.filter((l) => l > k).length / n;
  const atLeast = (k: number): number => lens.filter((l) => l >= k).length / n;
  const tail40 = over(40);
  const tail50 = atLeast(50);
  const tail60 = atLeast(60);
  const tail90 = atLeast(90);
  return {
    sentences: n,
    tail30: over(30),
    tail40,
    tail50,
    tail60,
    tail90,
    maxLen: Math.max(...lens),
    band41_49: tail40 - tail50,
    band50_59: tail50 - tail60,
    band60_89: tail60 - tail90,
    band90plus: tail90,
    shapeRatio: tail40 > 0 ? tail50 / tail40 : 0,
  };
}

/** Forme observée chez le thriller FR élite (18 livres pleins, par livre) :
 *  shapeRatio méd 0,330, min 0,111, max 0,528. N9 mesuré à 0,750 = HORS de la
 *  gamme observée. Diagnostic, pas quota. */
export const PUBLISHED_SHAPE_RATIO_ENVELOPE = {
  median: 0.33,
  min: 0.111,
  maxObserved: 0.528,
} as const;

/** Enveloppes par livre (échelle passage ~1000 mots), gelées le 2026-08-03.
 *  Sources : 18 thrillers FR élite pleins + 8 maîtres contemporains pleins.
 *  La strate pré-1950 est un CONTRÔLE, jamais une cible (biais d'époque). */
export const TAIL40_ENVELOPES = {
  thrillerElite: { q1: 0.008, median: 0.012, q3: 0.02, maxObserved: 0.093 },
  masterContemp: { q1: 0.0232, median: 0.1461, q3: 0.1672, maxObserved: 0.3928 },
} as const;

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

/**
 * ENVELOPPE PUBLIÉE — et pourquoi la moyenne est un piège.
 *
 * J'ai d'abord retenu la moyenne AGRÉGÉE (1,67 %) et conclu, au vu d'un run de
 * livre à 0,80 %, à un « déficit de dose ». C'était faux. Mesuré par livre sur
 * les 18 romans :
 *
 *     0,02  0,09  0,09  0,14  0,24  0,24  0,35  0,39  0,42
 *     0,54  0,54  0,67  0,83  0,88  1,07  3,84  3,91  7,69   (en %)
 *
 *     médiane 0,48 %  ·  Q1 0,24 %  ·  Q3 0,88 %  ·  min 0,02 %  ·  max 7,69 %
 *
 * La distribution est massivement asymétrique : trois livres tirent la moyenne.
 * ZÉRO livre sur dix-huit ne se trouve entre 1,50 et 1,85 %. Viser 1,67 % aurait
 * donc été viser une valeur que presque aucun romancier ne produit — et aurait
 * conduit à sur-doser le moteur pour corriger un déficit inexistant.
 *
 * OMEGA à 0,80 % est DANS l'enveloppe, au-dessus de la médiane, dans le
 * troisième quartile. Il n'y a pas de déficit de dose.
 *
 * RÈGLE : comparer à l'enveloppe, jamais à la moyenne d'une distribution qu'on
 * n'a pas regardée.
 */
export const PUBLISHED_LONG_PERIOD_DENSITY_ENVELOPE = {
  min: 0.0002,
  q1: 0.0024,
  median: 0.0048,
  q3: 0.0088,
  max: 0.0769,
  /** Moyenne agrégée — conservée pour mémoire, NE PAS l'utiliser comme cible. */
  aggregateMeanMisleading: 0.0167,
} as const;

/** @deprecated Moyenne agrégée trompeuse — utiliser l'enveloppe ci-dessus. */
export const PUBLISHED_LONG_PERIOD_DENSITY = 0.0167;

export type DensityVerdict = 'UNDER' | 'IN_ENVELOPE' | 'OVER';

/**
 * Situe une densité mesurée dans l'enveloppe publiée. `IN_ENVELOPE` dès qu'on est
 * entre le premier et le dernier livre — c'est la seule comparaison honnête.
 */
export function situateDensity(ratio: number): {
  readonly verdict: DensityVerdict;
  readonly vsMedian: number;
  readonly quartile: string;
} {
  const e = PUBLISHED_LONG_PERIOD_DENSITY_ENVELOPE;
  const verdict: DensityVerdict = ratio < e.min ? 'UNDER' : ratio > e.max ? 'OVER' : 'IN_ENVELOPE';
  const quartile =
    ratio < e.q1 ? 'sous Q1' : ratio < e.median ? 'Q1-mediane' : ratio < e.q3 ? 'mediane-Q3' : 'au-dessus de Q3';
  return {
    verdict,
    vsMedian: Number((ratio / e.median).toFixed(2)),
    quartile,
  };
}

/* ══════════════════════════════════════════════════════════════════════════════
 * REFUS À LA SÉLECTION — le filet, complémentaire de la contrainte de prompt
 * ══════════════════════════════════════════════════════════════════════════════
 * N6 a montré qu'une interdiction écrite sur une scène ne protège pas la suivante :
 * la même denylist donne 0,08 sur la scène réflexive et 0,30 sur la scène de
 * révélation. Traiter le gabarit par énumération de formules est une course perdue.
 *
 * N7 a simulé le refus à la sélection sur 105 sorties déjà générées — pour le
 * chapitre i, si la tête de période a déjà servi, le candidat est refusé et on
 * régénère. Exactement ce que `motif-repulsion` fait pour les incipits de chapitre.
 *
 *   bras                      taux avant   rejets / 21   chapitres servis
 *   B1  PLAN nu                  0,476          7              14
 *   B3  PLAN + exemplar          0,667         10              11
 *   B1a PLAN + interdiction      0,095          1              20
 *   N6plan (autre scène)         0,333          4              17
 *
 * LECTURE : le coût du filet est proportionnel au taux résiduel, donc directement
 * réglé par la qualité du prompt. Les deux mécanismes ne sont pas concurrents :
 *   • la contrainte de prompt fait tomber le taux de collision à la source ;
 *   • le refus à la sélection garantit le zéro, à un coût que le prompt détermine.
 * Composés, prompt B1a + refus = une régénération sur vingt et un.
 *
 * Conforme à ADR-003 : CALC contrôle la SÉLECTION, pas la génération.
 */

export interface PeriodHeadSelection<T> {
  /** Le candidat retenu, ou null si tous sont des clones. */
  readonly chosen: T | null;
  /** Candidats refusés parce que leur tête de période avait déjà servi. */
  readonly rejected: readonly T[];
  /** La tête retenue, à ajouter au registre pour le chapitre suivant. */
  readonly head: string | null;
}

/**
 * Choisit le premier candidat dont la tête de période n'a pas déjà servi.
 * Un candidat SANS période longue est admissible (il n'ajoute aucun gabarit) et
 * ne consomme aucune tête.
 *
 * NE MODIFIE RIEN : rend une décision, le consommateur en fait ce qu'il veut.
 * En mode SHADOW, on compare simplement `chosen` au gagnant de production.
 */
export function selectDistinctPeriodHead<T>(
  candidates: readonly T[],
  proseOf: (c: T) => string,
  usedHeads: ReadonlySet<string>,
): PeriodHeadSelection<T> {
  const rejected: T[] = [];
  for (const c of candidates) {
    const periods = extractLongPeriods(proseOf(c));
    if (periods.length === 0) return { chosen: c, rejected, head: null };
    const h = periodHead(periods[0] ?? '');
    if (!usedHeads.has(h)) return { chosen: c, rejected, head: h };
    rejected.push(c);
  }
  return { chosen: null, rejected, head: null };
}

/* ══════════════════════════════════════════════════════════════════════════════
 * LE MOULE DE RAISONNEMENT — la période récapitule-t-elle l'intrigue ?
 * ══════════════════════════════════════════════════════════════════════════════
 * B1a a ramené le gabarit d'OUVERTURE dans l'enveloppe humaine. Restait le défaut
 * plus profond, signalé par la lecture et par les deux relecteurs externes : la
 * période n'est pas une pensée, c'est un résumé de dossier déguisé en intériorité.
 * Le personnage n'y découvre rien, il réexplique l'intrigue au lecteur.
 *
 * BASELINE — le discriminant le plus net mesuré sur ce projet
 * ──────────────────────────────────────────────────────────
 * Connecteurs de récapitulation causale comptés dans les périodes ≥50 mots :
 *
 *   source                  n periodes   moyenne   % a zero   % avec >=2
 *   PUBLIÉ (18 romans)          1384       0,01      99,2 %      0,0 %
 *   B1  (PLAN nu)                 21       1,62      14,3 %     57,1 %
 *   B1b (PLAN + pool)             22       1,73       9,1 %     59,1 %
 *   B1a (PLAN + interdit tête)    26       0,69      57,7 %     19,2 %
 *
 * UNE PÉRIODE À DEUX CONNECTEURS OU PLUS N'EXISTE PAS DANS LE CORPUS PUBLIÉ :
 * zéro sur mille trois cent quatre-vingt-quatre. Le seuil de rejet est donc posé
 * là où le corpus dit qu'un romancier ne va jamais.
 *
 * Effet secondaire mesuré : l'interdiction de tête réduit DÉJÀ le moule de moitié
 * (1,62 → 0,69). Les deux gabarits sont liés, pas indépendants.
 */

/** Connecteurs qui enchaînent une déduction sur une autre — le tissu du résumé. */
const RECAP_CONNECTORS =
  /\b(car si|ce qui signifiait|ce qui voulait dire|transformant ainsi|faisant de|obligeant|par conséquent|dès lors que|autrement dit|signifiait que|impliquait que|prouvait que|n'était pas\s+\w+\s+mais|non pas\s+\w+\s+mais)\b/giu;

export const RECAP_THRESHOLDS = {
  /** Au-delà : à surveiller. 0,8 % des périodes publiées ont un connecteur. */
  watch: 1,
  /** À partir de là : rejet. ZÉRO période publiée sur 1384 atteint ce niveau. */
  reject: 2,
  publishedMean: 0.01,
  publishedPctZero: 99.2,
  publishedPctTwoPlus: 0,
} as const;

export type RecapVerdict = 'CLEAN' | 'WATCH' | 'PLOT_RECAP_AS_THOUGHT';

export interface RecapReport {
  readonly connectors: number;
  readonly matched: readonly string[];
  readonly verdict: RecapVerdict;
}

/** Mesure la récapitulation causale d'UNE période. */
export function measurePlotRecap(period: string): RecapReport {
  const matched = period.match(RECAP_CONNECTORS) ?? [];
  const n = matched.length;
  return {
    connectors: n,
    matched: matched.map((m) => m.toLowerCase()),
    verdict:
      n >= RECAP_THRESHOLDS.reject
        ? 'PLOT_RECAP_AS_THOUGHT'
        : n >= RECAP_THRESHOLDS.watch
          ? 'WATCH'
          : 'CLEAN',
  };
}

/** Le pire verdict parmi les périodes d'un texte — un seul résumé suffit à salir. */
export function measureTextRecap(text: string): RecapReport {
  const periods = extractLongPeriods(text);
  let worst: RecapReport = { connectors: 0, matched: [], verdict: 'CLEAN' };
  for (const p of periods) {
    const r = measurePlotRecap(p);
    if (r.connectors > worst.connectors) worst = r;
  }
  return worst;
}
