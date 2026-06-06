/**
 * OMEGA Book-Factory — C13 MIXER — BINDINGS DES POTARDS (BF-08, BF-10 RATIFIÉE).
 *
 * FOUND_EXISTING : CONCEPT-MIXER-KNOBS-001 — VISION_FINALE_SCELLEE:282 (DÉCISION) :
 * « L'utilisateur peut ajuster des potards (tension, romance, mystère, violence,
 * espoir) qui modifient la TRAJECTOIRE, pas le texte directement. »
 * Les 5 potards V1 = EXACTEMENT ceux de la VISION. Pas un de plus (anti-inflation).
 *
 * BF-10 MIXER_KNOB_TRACEABILITY (RATIFIÉE 2026-06-06) : chaque potard est relié
 * à des features MESURABLES + effets attendus + limites + risque Goodhart.
 * BF-15 + RÉSERVE tribunale : un potard agit sur la SÉLECTION (re-pondération
 * des candidats ÉLIGIBLES), JAMAIS en injonction au Scribe (« rends le texte
 * plus peur » = INTERDIT, N3/FORBID-006).
 *
 * HONNÊTETÉ ROSETTA (lois IRM) : les features lexicales CALC ci-dessous sont des
 * PROXYS de surface — fiables pour COMPARER des candidats issus du même prompt
 * (même scène, profils différents), PAS pour mesurer une qualité absolue. C'est
 * exactement le périmètre de la sélection Best-of-N. Ce qui casserait : les
 * utiliser comme score absolu inter-œuvres (interdit, EMP-18-adjacent).
 */

import { compareStrings } from '../identity/identity-types.js';

export type KnobId = 'TENSION' | 'ROMANCE' | 'MYSTERE' | 'VIOLENCE' | 'ESPOIR';

export const KNOB_IDS: readonly KnobId[] = ['TENSION', 'ROMANCE', 'MYSTERE', 'VIOLENCE', 'ESPOIR'];

/** Position d'un potard : [-1, +1]. 0 = neutre (sélection inchangée). */
export type KnobSettings = Readonly<Partial<Record<KnobId, number>>>;

export interface KnobBinding {
  readonly knob: KnobId;
  /** Mécanisme documenté (BF-10) — POURQUOI ces features. */
  readonly mechanism: string;
  readonly limits: string;
  readonly goodhartRisk: string;
  /** Lexiques de densité (hits / 1000 mots). */
  readonly lexicons: readonly RegExp[];
}

/* Lexiques FR — chaque entrée est un opérateur de DENSITÉ, pas de vérité. */
const RE = (s: string): RegExp => new RegExp(s, 'giu');

export const KNOB_BINDINGS: Readonly<Record<KnobId, KnobBinding>> = {
  TENSION: {
    knob: 'TENSION',
    mechanism: "Densité de confrontation + urgence corporelle + adverbes de rafale — la tension se manifeste lexicalement (menace, ultimatum) et physiologiquement (souffle, coeur, mains).",
    limits: "Compare des candidats de la MÊME scène ; insensible à la tension purement situationnelle (dramaturgie sans marqueurs).",
    goodhartRisk: "Pousser à +1 en permanence ⇒ « monotonie dramatique » (audit C9 : 72% TRANSITION était le défaut INVERSE) — le potard est par CHAPITRE, le plan garde l'alternance.",
    lexicons: [
      RE(String.raw`\b(menace|menaça|ultimatum|exige|exigea|accuse|accusa|affronte|défie|défia|hausse le ton|coupe la parole|serre les poings|claque|sursauta?)\b`),
      RE(String.raw`\b(souffle court|cœur (?:qui )?bat|battait|tempes|poings serrés|mâchoire|nuque raide|s'immobilise|se fige|figea)\b`),
      RE(String.raw`\b(soudain|brusquement|d'un coup|aussitôt|immédiatement)\b`),
    ],
  },
  ROMANCE: {
    knob: 'ROMANCE',
    mechanism: "Densité de proximité relationnelle et de tendresse — gestes (main, étreinte), regards soutenus, lexique affectif non violent.",
    limits: "Ne distingue pas amour naissant/conjugal/filial ; un thriller froid score bas partout (normal).",
    goodhartRisk: "Sur-sélection de candidats sentimentaux hors sujet ⇒ borné par l'éligibilité (G2 fidélité au plan intact).",
    lexicons: [
      RE(String.raw`\b(tendresse|tendre(?:ment)?|caresse|étreinte|enlace|enlaça|effleure|effleura|embrasse|embrassa|frôle|frôla)\b`),
      RE(String.raw`\b(main dans la main|prend sa main|prit sa main|contre son épaule|tout contre (?:elle|lui)|leurs regards)\b`),
      RE(String.raw`\b(sourit doucement|voix douce|chaleur|apaisé[es]?|réconfort)\b`),
    ],
  },
  MYSTERE: {
    knob: 'MYSTERE',
    mechanism: "Densité d'inconnu actif — questions ouvertes, indices matériels non résolus, dissimulation (cache, tait, secret), perception incomplète (ombre, silhouette).",
    limits: "Mesure le mystère AFFICHÉ, pas la qualité de l'énigme (le ledger seed/payoff mesure la structure, lui).",
    goodhartRisk: "À +1 permanent ⇒ accumulation de questions jamais payées — surveiller seedLedger UNPAID en parallèle.",
    lexicons: [
      RE(String.raw`\b(secret|énigme|mystère|mystérieu[sx]e?|inexpliqué[es]?|étrange(?:ment)?|sans réponse)\b`),
      RE(String.raw`\b(cache|cachait|dissimule|dissimulait|se tait|taisait|ne dit rien|éluda|esquiva)\b`),
      RE(String.raw`\b(silhouette|ombre|à peine visible|indistinct[es]?|on aurait dit|sembla(?:it)?)\b`),
      RE(String.raw`\?`), // densité interrogative brute
    ],
  },
  VIOLENCE: {
    knob: 'VIOLENCE',
    mechanism: "Densité d'impact physique — coups, blessures, sang, destruction matérielle. Potard surtout utile en NÉGATIF (-1 : adoucir la sélection).",
    limits: "Violence SUGGÉRÉE (hors-champ) invisible au lexique — c'est voulu : le potard pilote l'explicite.",
    goodhartRisk: "À +1 ⇒ surenchère gore si les candidats le permettent — l'éligibilité (locks canon) reste le mur.",
    lexicons: [
      RE(String.raw`\b(frappe|frappa|cogne|cogna|brise|brisa|fracasse|fracassa|gifle|gifla|étrangle|étrangla|empoigne|empoigna)\b`),
      RE(String.raw`\b(sang|plaie|blessure|hématome|fracture|cadavre|hurlement|hurle(?:ment)?s?)\b`),
    ],
  },
  ESPOIR: {
    knob: 'ESPOIR',
    mechanism: "Densité de valence positive prospective — promesse, lumière, répit, résolution d'avancer. L'axe E₀ positif de la physique V4.4 en proxy lexical.",
    limits: "Ironie invisible (un « espoir » sarcastique compte) ; faux positifs en fin heureuse de scène sombre.",
    goodhartRisk: "À +1 ⇒ mièvrerie si le plan ne contraint pas — réservé aux chapitres de respiration (recommandation audit C9).",
    lexicons: [
      RE(String.raw`\b(espoir|espère|espéra(?:it)?|promesse|promet|demain|enfin|renaît|renaissait|s'apaise|apaisa)\b`),
      RE(String.raw`\b(lumière|éclaircie|soleil|aube nouvelle|sourire|rire|chaleur retrouvée|soulagement|soulagé[es]?)\b`),
    ],
  },
};

export interface KnobFeatures {
  readonly TENSION: number; readonly ROMANCE: number; readonly MYSTERE: number;
  readonly VIOLENCE: number; readonly ESPOIR: number;
}

/** Mesure les densités (hits/1000 mots) d'une prose. Pur, déterministe. */
export function measureKnobFeatures(prose: string): KnobFeatures {
  const text = prose.normalize('NFC');
  const words = Math.max(1, text.split(/\s+/u).filter((w) => w.length > 0).length);
  const densityOf = (b: KnobBinding): number => {
    let hits = 0;
    for (const re of b.lexicons) {
      re.lastIndex = 0;
      hits += (text.match(re) ?? []).length;
    }
    return (hits / words) * 1000;
  };
  return {
    TENSION: densityOf(KNOB_BINDINGS.TENSION),
    ROMANCE: densityOf(KNOB_BINDINGS.ROMANCE),
    MYSTERE: densityOf(KNOB_BINDINGS.MYSTERE),
    VIOLENCE: densityOf(KNOB_BINDINGS.VIOLENCE),
    ESPOIR: densityOf(KNOB_BINDINGS.ESPOIR),
  };
}

/** Table de traçabilité (BF-10) — exportable telle quelle dans les rapports. */
export function traceabilityTable(): readonly { readonly knob: KnobId; readonly mechanism: string; readonly limits: string; readonly goodhartRisk: string; readonly lexiconCount: number }[] {
  return [...KNOB_IDS].sort(compareStrings).map((k) => {
    const b = KNOB_BINDINGS[k];
    return { knob: k, mechanism: b.mechanism, limits: b.limits, goodhartRisk: b.goodhartRisk, lexiconCount: b.lexicons.length };
  });
}