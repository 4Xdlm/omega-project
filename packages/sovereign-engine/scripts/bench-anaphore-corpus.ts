/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — BENCH ANAPHORE GATE — CORPUS β (12 scènes calibration métrique)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   scripts/bench-anaphore-corpus.ts
 * Version:  v1 (2026-04-25 — bench Anaphore Gate calibration, Option β)
 * Standard: NASA-Grade L4 — correspond à OMEGA/outputs/BENCH_ANAPHORE_GATE_BETA_SPEC_DRAFT.md
 * Parent :  commit 9859659d (engine.ts WIP Anaphore Gate scellé shadow default)
 *
 * OBJECTIF :
 *   Calibrer la métrique opening_repetition_rate (delta-style.ts:160-175) et
 *   son seuil SOVEREIGN_CONFIG.OPENING_REPETITION_MAX = 0.10 AVANT toute
 *   implémentation REJECT réelle (Option α future).
 *
 * COMPOSITION (12 scènes) :
 *   - 6 adversariales (ANA01..ANA06) : sceneBriefs poussant à anaphore d'ouverture
 *     lourde (conjugaison-ressassée, adverbe-incipit, déictique-temporel,
 *     démonstratif-lourd, inversion-stéréotypée, conjonction-monotone)
 *   - 4 canoniques (CAN01..CAN04) : prose littéraire fluide (Flaubert / Duras /
 *     Proust / thriller action) où l'anaphore est minimale ou variée
 *   - 2 borderline (BRD01..BRD02) : anaphore artistique légitime (Hugo style /
 *     mixte signature) — zone grise critique, le seuil 0.10 ne doit PAS les rejeter
 *
 * USAGE :
 *   import { BENCH_CORPUS_ANAPHORE, getAnaphoreScenes } from './bench-anaphore-corpus.js';
 *
 * INVARIANT : ce fichier est un DATA MODULE — pas d'I/O, pas de side effects.
 *             Helpers EmotionContract dupliqués depuis bench-dedale-tprime-corpus.ts
 *             pour autonomie (corpus jetable une fois bench validé).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'node:crypto';
import type { EmotionContract } from '../src/types.js';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type AnaphoreClass = 'adversarial' | 'canonical' | 'borderline';

export interface BenchSceneAnaphore {
  /** Identifier unique (ex: "ANA01", "CAN01", "BRD01"). */
  readonly id: string;
  /** Famille descriptive (ex: "adv:conjugaison-ressassee"). */
  readonly family: string;
  /** Classe (adversarial/canonical/borderline) — détermine bin du critère PASS. */
  readonly anaphoreClass: AnaphoreClass;
  /** Pattern d'anaphore visé côté brief (descriptif). */
  readonly anaphorePattern: string;
  /** sceneBrief — texte narratif fourni au pipeline. */
  readonly sceneBrief: string;
  /** signatureWords — lexique signature imposé. */
  readonly signatureWords: readonly string[];
  /** Langue (FR only en v1). */
  readonly language: 'fr';
  /** EmotionContract complet (Q1-Q4 + valence + tension + rupture). */
  readonly emotionContract: EmotionContract;
  /** Rationale humaine (pourquoi ce sceneBrief, attente test). */
  readonly notes: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS EMOTIONCONTRACT — dupliqués depuis bench-dedale-tprime-corpus.ts
// ──────────────────────────────────────────────────────────────────────────────

function dominant14D(emotion: string, weight = 0.40): Record<string, number> {
  const keys = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger',
    'anticipation', 'love', 'submission', 'awe', 'disapproval', 'remorse', 'contempt',
  ];
  const rest = (1 - weight) / (keys.length - 1);
  const d: Record<string, number> = {};
  for (const k of keys) {
    d[k] = k === emotion ? weight : rest;
  }
  return d;
}

function makeContract(args: {
  readonly q1Dom: string;
  readonly q2Dom: string;
  readonly q3Dom: string;
  readonly q4Dom: string;
  readonly vStart: number;
  readonly vEnd: number;
  readonly slope: 'ascending' | 'descending' | 'arc' | 'reverse_arc';
  readonly direction: 'darkening' | 'brightening' | 'stable' | 'oscillating';
  readonly rupture: boolean;
}): EmotionContract {
  return {
    curve_quartiles: [
      { quartile: 'Q1', target_14d: dominant14D(args.q1Dom, 0.30), valence: args.vStart, arousal: 0.30, dominant: args.q1Dom, narrative_instruction: 'Installation / ancrage sensoriel' },
      { quartile: 'Q2', target_14d: dominant14D(args.q2Dom, 0.35), valence: (args.vStart + args.vEnd) / 2 - 0.1, arousal: 0.40, dominant: args.q2Dom, narrative_instruction: 'Montée / déplacement' },
      { quartile: 'Q3', target_14d: dominant14D(args.q3Dom, 0.45), valence: (args.vStart + args.vEnd) / 2 + 0.1, arousal: 0.60, dominant: args.q3Dom, narrative_instruction: 'Pivot / climax' },
      { quartile: 'Q4', target_14d: dominant14D(args.q4Dom, 0.40), valence: args.vEnd, arousal: 0.30, dominant: args.q4Dom, narrative_instruction: 'Résolution / fermeture' },
    ],
    intensity_range: { min: 0.20, max: 0.65 },
    tension: { slope_target: args.slope, pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
    terminal_state: { target_14d: dominant14D(args.q4Dom, 0.40), valence: args.vEnd, arousal: 0.30, dominant: args.q4Dom, reader_state: 'Resolution' },
    rupture: {
      exists: args.rupture,
      position_pct: args.rupture ? 0.70 : 0,
      before_dominant: args.q2Dom,
      after_dominant: args.q4Dom,
      delta_valence: args.rupture ? Math.abs(args.vEnd - args.vStart) : 0,
    },
    valence_arc: { start: args.vStart, end: args.vEnd, direction: args.direction },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// CORPUS ANAPHORE β — 12 scènes (6 adv + 4 canon + 2 borderline)
// ──────────────────────────────────────────────────────────────────────────────

export const BENCH_CORPUS_ANAPHORE: readonly BenchSceneAnaphore[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // ADVERSARIALES — briefs poussant à anaphore d'ouverture lourde
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'ANA01',
    family: 'adv:conjugaison-ressassee',
    anaphoreClass: 'adversarial',
    anaphorePattern: 'sujet+verbe quotidien répété (Il marchait. Il pensait. Il s\'arrêtait.)',
    sceneBrief: 'Un homme seul dans une chambre vide. Il accomplit des gestes quotidiens, mécaniques, répétitifs. Le récit doit décrire ces gestes par phrases courtes, sujet+verbe à l\'imparfait. Tout doit s\'enchaîner sans variation, dans une monotonie hypnotique. Mode incantatoire de l\'habitude.',
    signatureWords: ['silence', 'geste', 'temps', 'monotone'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'sadness', q2Dom: 'sadness', q3Dom: 'sadness', q4Dom: 'sadness', vStart: -0.3, vEnd: -0.5, slope: 'descending', direction: 'darkening', rupture: false }),
    notes: 'Cible : "Il" comme ouverture dominante. Si métrique fonctionne → opening_rep > 0.20 sur cette scène.',
  },
  {
    id: 'ANA02',
    family: 'adv:adverbe-incipit',
    anaphoreClass: 'adversarial',
    anaphorePattern: 'adverbe brutal en tête (Soudain... Brusquement... D\'un coup...)',
    sceneBrief: 'Une scène d\'urgence absolue. Événements brutaux qui se succèdent sans transition. Chaque phrase doit installer un nouveau choc instantané. Privilégie les adverbes en début de phrase pour ponctuer chaque rupture.',
    signatureWords: ['choc', 'urgence', 'rupture', 'soudain'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'fear', q2Dom: 'surprise', q3Dom: 'fear', q4Dom: 'sadness', vStart: -0.2, vEnd: -0.6, slope: 'descending', direction: 'darkening', rupture: true }),
    notes: 'Cible : "Soudain" / "Brusquement" répétés. Test si LLM suit le brief naturellement.',
  },
  {
    id: 'ANA03',
    family: 'adv:deictique-temporel',
    anaphoreClass: 'adversarial',
    anaphorePattern: 'déictique temporel répété (Maintenant... À cet instant... Désormais...)',
    sceneBrief: 'Le présent absolu d\'une crise existentielle. Chaque phrase est une instantanéité du temps qui se replie sur lui-même. Pas de futur projeté, pas de passé invoqué. Le récit doit se cristalliser dans un présent obsédant.',
    signatureWords: ['présent', 'instant', 'maintenant', 'éternité'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'awe', q2Dom: 'fear', q3Dom: 'awe', q4Dom: 'submission', vStart: 0.0, vEnd: -0.3, slope: 'arc', direction: 'oscillating', rupture: false }),
    notes: 'Cible : "Maintenant" / "À cet instant" en ouverture. Risque que LLM varie naturellement → métrique faible.',
  },
  {
    id: 'ANA04',
    family: 'adv:demonstratif-lourd',
    anaphoreClass: 'adversarial',
    anaphorePattern: 'démonstratif + nom répété (Ce silence. Ce regard. Cette nuit.)',
    sceneBrief: 'Une chambre déserte au crépuscule. Description par fragments. Chaque objet, chaque ombre, chaque détail évoqué porte une charge mémorielle absolue. Privilégie les phrases nominales courtes, ouvertes par un démonstratif pour souligner la singularité de chaque chose.',
    signatureWords: ['ombre', 'mémoire', 'objet', 'silence'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'sadness', q2Dom: 'awe', q3Dom: 'remorse', q4Dom: 'sadness', vStart: -0.2, vEnd: -0.4, slope: 'descending', direction: 'darkening', rupture: false }),
    notes: 'Cible : "Ce" / "Cette" répétés en ouverture. Pattern stylistique élégant mais détectable.',
  },
  {
    id: 'ANA05',
    family: 'adv:inversion-stereotypee',
    anaphoreClass: 'adversarial',
    anaphorePattern: 'inversion verbe+sujet répétée (Vint le jour. Vint la nuit. Vint l\'oubli.)',
    sceneBrief: 'Un mourant au seuil. Liste lyrique et cérémonielle des forces qui le traversent : visions, souvenirs, peurs, libérations. Style poétique à inversions verbales. Chaque force qui surgit doit ouvrir sa propre phrase par le verbe inversé.',
    signatureWords: ['vint', 'passa', 'monta', 'mort'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'fear', q2Dom: 'awe', q3Dom: 'submission', q4Dom: 'love', vStart: -0.4, vEnd: 0.2, slope: 'arc', direction: 'oscillating', rupture: true }),
    notes: 'Cible : "Vint" / "Passa" en ouverture. Pattern lyrique légitime mais détectable.',
  },
  {
    id: 'ANA06',
    family: 'adv:conjonction-monotone',
    anaphoreClass: 'adversarial',
    anaphorePattern: 'conjonction de coordination répétée (Et puis. Puis. Alors.)',
    sceneBrief: 'Récit oral d\'une journée banale par un vieil homme fatigué. Style relâché, presque enfantin, où chaque action s\'enchaîne par une conjonction. Voix qui se laisse aller, sans architecture. Chaque phrase commence par un mot de liaison.',
    signatureWords: ['banal', 'fatigue', 'jour', 'vieillesse'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'sadness', q2Dom: 'sadness', q3Dom: 'remorse', q4Dom: 'submission', vStart: -0.2, vEnd: -0.3, slope: 'descending', direction: 'darkening', rupture: false }),
    notes: 'Cible : "Et puis" / "Puis" / "Alors" en ouverture. Pattern de relâchement narratif.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CANONIQUES — prose fluide, sujets et ouvertures variés
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'CAN01',
    family: 'canon:flaubert-descriptif',
    anaphoreClass: 'canonical',
    anaphorePattern: 'aucun (variation lexicale en ouverture)',
    sceneBrief: 'Description d\'un paysage rural au petit matin, vue depuis la fenêtre d\'une maison ancienne. La lumière se déploie lentement sur les champs, les haies, le clocher au loin. Prose ample, ciselée, sentir l\'écoulement épais du temps. Phrases longues, articulations subtiles, vocabulaire précis.',
    signatureWords: ['lumière', 'champ', 'matin', 'épaisseur'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'awe', q2Dom: 'trust', q3Dom: 'love', q4Dom: 'awe', vStart: 0.2, vEnd: 0.5, slope: 'ascending', direction: 'brightening', rupture: false }),
    notes: 'Cible : prose Flaubert-style, sujets variés (la lumière / les champs / le clocher). Pas d\'anaphore.',
  },
  {
    id: 'CAN02',
    family: 'canon:duras-dialogue',
    anaphoreClass: 'canonical',
    anaphorePattern: 'aucun (alternance répliques, sujets pronoms variés)',
    sceneBrief: 'Deux amants en silence dans une chambre méditerranéenne. Échange minimal de quelques répliques brèves entre des passages descriptifs. Phrases courtes, blanches, avec espaces. Style Duras : économie, suspension, attente.',
    signatureWords: ['mer', 'silence', 'amant', 'attente'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'love', q2Dom: 'submission', q3Dom: 'awe', q4Dom: 'love', vStart: 0.3, vEnd: 0.4, slope: 'arc', direction: 'stable', rupture: false }),
    notes: 'Cible : alternance "Elle dit." / "Il répond." / "Le silence." → ouvertures variées.',
  },
  {
    id: 'CAN03',
    family: 'canon:proust-introspection',
    anaphoreClass: 'canonical',
    anaphorePattern: 'aucun (subordination longue avec sujets enchâssés)',
    sceneBrief: 'Souvenir d\'une saveur d\'enfance qui resurgit avec une force inattendue. Phrases longues, subordonnées multiples, méandres mémoriels. Style Proust : la pensée se déplie en spirale, chaque digression nourrit la centrale.',
    signatureWords: ['saveur', 'enfance', 'mémoire', 'spirale'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'awe', q2Dom: 'love', q3Dom: 'remorse', q4Dom: 'love', vStart: 0.1, vEnd: 0.3, slope: 'arc', direction: 'oscillating', rupture: false }),
    notes: 'Cible : phrases longues à sujets variés via subordination → ouvertures de phrases naturellement diverses.',
  },
  {
    id: 'CAN04',
    family: 'canon:thriller-action',
    anaphoreClass: 'canonical',
    anaphorePattern: 'aucun (alternance poursuivant/poursuivi, sujets variés)',
    sceneBrief: 'Course-poursuite urbaine de nuit. Alternance scènes : le poursuivant qui monte les marches, la victime qui se cache derrière une benne, un chien qui aboie au loin. Phrases courtes, impactantes, mais sujets et points de vue variés. Tension montante.',
    signatureWords: ['course', 'nuit', 'tension', 'urbain'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'fear', q2Dom: 'fear', q3Dom: 'anticipation', q4Dom: 'fear', vStart: -0.3, vEnd: -0.5, slope: 'ascending', direction: 'darkening', rupture: true }),
    notes: 'Cible : alternance "Il court." / "Elle se tapit." / "Le chien aboie." → ouvertures variées.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BORDERLINE — anaphore artistique légitime (zone grise critique)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'BRD01',
    family: 'border:hugo-anaphore-controle',
    anaphoreClass: 'borderline',
    anaphorePattern: 'anaphore stylistique 3-4 occurrences contrôlée (Demain... Demain... Demain...)',
    sceneBrief: 'Un veuf prépare son pèlerinage matinal vers la tombe de sa femme. Texte court, intimiste. Inspiré du ton "Demain dès l\'aube" de Hugo : promesse répétée, voyage évoqué, retour mémoriel. L\'anaphore signature 3-4 fois est légitime, voulue, structurante. Le reste de la prose doit varier.',
    signatureWords: ['demain', 'aube', 'tombe', 'fidélité'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'sadness', q2Dom: 'love', q3Dom: 'remorse', q4Dom: 'love', vStart: -0.1, vEnd: 0.2, slope: 'arc', direction: 'brightening', rupture: false }),
    notes: 'Cible : "Demain" en ouverture 3-4 fois sur ~30 phrases → opening_rep ≈ 0.10-0.15. Si gate rejette, faux positif sur prose littéraire légitime.',
  },
  {
    id: 'BRD02',
    family: 'border:guide-musee-mixte',
    anaphoreClass: 'borderline',
    anaphorePattern: 'mixte 80% varié + 20% signature stylistique discrète',
    sceneBrief: 'Récit déambulatoire d\'un guide expérimenté dans un musée d\'art moderne. Description des œuvres, anecdotes, transitions. Subtile reprise stylistique de phrasés (par exemple "Devant ce tableau" répété 2-3 fois sur ~25 phrases) sans devenir un pattern pesant. La majorité de la prose doit varier ses ouvertures.',
    signatureWords: ['tableau', 'œuvre', 'musée', 'regard'],
    language: 'fr',
    emotionContract: makeContract({ q1Dom: 'awe', q2Dom: 'trust', q3Dom: 'awe', q4Dom: 'love', vStart: 0.2, vEnd: 0.4, slope: 'ascending', direction: 'brightening', rupture: false }),
    notes: 'Cible : opening_rep ≈ 0.08-0.12 (juste sous ou sur le seuil). Test critique de calibration.',
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// EXPORTS HELPERS
// ──────────────────────────────────────────────────────────────────────────────

export function getAnaphoreScenes(): readonly BenchSceneAnaphore[] {
  return BENCH_CORPUS_ANAPHORE;
}

export function getAdversarialAnaphoreScenes(): readonly BenchSceneAnaphore[] {
  return BENCH_CORPUS_ANAPHORE.filter((s) => s.anaphoreClass === 'adversarial');
}

export function getCanonicalAnaphoreScenes(): readonly BenchSceneAnaphore[] {
  return BENCH_CORPUS_ANAPHORE.filter((s) => s.anaphoreClass === 'canonical');
}

export function getBorderlineAnaphoreScenes(): readonly BenchSceneAnaphore[] {
  return BENCH_CORPUS_ANAPHORE.filter((s) => s.anaphoreClass === 'borderline');
}

export function getAnaphoreSceneById(id: string): BenchSceneAnaphore {
  const found = BENCH_CORPUS_ANAPHORE.find((s) => s.id === id);
  if (!found) {
    throw new Error(`[bench-anaphore-corpus] Scene id introuvable : "${id}"`);
  }
  return found;
}

export function hashSceneAnaphore(s: BenchSceneAnaphore): string {
  const canonical = JSON.stringify({
    id: s.id,
    family: s.family,
    anaphoreClass: s.anaphoreClass,
    anaphorePattern: s.anaphorePattern,
    sceneBrief: s.sceneBrief,
    signatureWords: s.signatureWords,
    language: s.language,
  });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}
