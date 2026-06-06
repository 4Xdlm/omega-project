/**
 * OMEGA Book-Factory — C9 CONTRÔLEUR DE COHÉRENCE (BF-08) — types partagés.
 *
 * Ordre Architecte (2026-06-06) : « il manque un contrôleur de cohérence par
 * chapitre, un contrôleur qui contrôle la cohérence dans les phrases et ensuite
 * par chapitre voire par arc en plus ». Trois niveaux, trois modules :
 *   1. PHRASE   (sentence-physics)   — micro-physique : corps, objets, portes.
 *   2. CHAPITRE (chapter-coherence)  — lieu, temps interne, présence des personnages.
 *   3. ARC      (arc-coherence)      — identité trans-chapitres, fonction de chapitre,
 *                                      registre seed→payoff (mystery ledger).
 * + G5-TICS durci (tics-gate) — plafonds d'occurrences trans-chapitres.
 *
 * DOCTRINE : tous ces instruments sont ADVISORY/SHADOW (EMP-16 : aucun seuil
 * scellé sans 3 corpus indépendants ; un seul livre mesuré à ce jour). Ils
 * MESURENT et RAPPORTENT — ils ne rejettent rien. La préséance C6 reste : un
 * signal advisory ne peut JAMAIS écarter un candidat éligible aux gates durs.
 *
 * Pourquoi CALC et pas LLM : la cohérence micro-physique (bottes/pieds nus) a été
 * RATÉE par les 8 gates existants ET par le juge persona-lecteur (le chapitre 1
 * du run 60k est passé). Un détecteur lexical déterministe attrape la classe
 * d'erreur prouvée sur pièce, gratuitement, rejouable. Limites documentées par
 * module (faux positifs possibles — c'est le rôle d'ADVISORY).
 */

import type { Result } from '../identity/identity-types.js';

/** Position d'un signal : chapitre (1-based) + index de phrase (0-based). */
export interface SignalLocus {
  readonly chapter: number;
  readonly sentenceIndex: number;
  /** Extrait borné (≤120 chars) — preuve lisible, jamais la prose entière. */
  readonly excerpt: string;
}

/** Sévérité ADVISORY uniquement — il n'existe AUCUN niveau bloquant en C9. */
export type CoherenceSeverity = 'INFO' | 'WARN';

/** Signal niveau PHRASE (micro-physique). */
export type SentencePhysicsKind =
  | 'FOOTWEAR_CONTRADICTION' // pieds nus alors que chaussé, sans retrait entre les deux
  | 'OBJECT_REDRAWN' // objet sorti/saisi deux fois sans avoir été posé/rangé
  | 'DOOR_REOPENED'; // porte ouverte deux fois sans fermeture intermédiaire

export interface SentencePhysicsSignal {
  readonly kind: SentencePhysicsKind;
  readonly severity: CoherenceSeverity;
  readonly locus: SignalLocus;
  /** Les DEUX évidences : l'état établi et la contradiction (INV-PHYS-003). */
  readonly established: string;
  readonly contradiction: string;
}

/** Signal niveau CHAPITRE. */
export type ChapterCoherenceKind =
  | 'LOCATION_JUMP' // changement de lieu sans verbe de déplacement à proximité
  | 'TIME_REGRESSION' // soir→matin (etc.) sans marqueur de nouvelle journée
  | 'GHOST_SPEAKER'; // personnage sorti de scène qui parle sans être revenu

export interface ChapterCoherenceSignal {
  readonly kind: ChapterCoherenceKind;
  readonly severity: CoherenceSeverity;
  readonly locus: SignalLocus;
  readonly detail: string;
}

/** Niveau ARC — dérive d'identité d'un rôle trans-chapitres. */
export interface IdentityDriftSignal {
  /** Rôle observé (ex. « gardien »). */
  readonly role: string;
  /** Prénoms distincts associés à ce rôle dans la prose, ordre 1ʳᵉ apparition. */
  readonly names: readonly { readonly name: string; readonly firstChapter: number; readonly occurrences: number }[];
  readonly severity: CoherenceSeverity;
}

/**
 * Fonction de chapitre — PROXY CALC (EXPERIMENTAL), jamais une vérité littéraire.
 * Classification ChatGPT A-E opérationnalisée par densités lexicales mesurables.
 */
export type ChapterFunction =
  | 'REVELATION' // marqueurs de révélation dominants
  | 'ACTION' // densité de verbes d'action forte
  | 'CONFRONTATION' // densité dialogue + marqueurs de conflit
  | 'TRANSITION' // rien de dominant, nouveauté correcte
  | 'REDITE'; // nouveauté trigrammes faible vs chapitres précédents

export interface ChapterFunctionRow {
  readonly chapter: number;
  readonly fn: ChapterFunction;
  /** Mesures brutes — le lecteur du rapport juge sur pièces. */
  readonly dialogueRatio: number;
  readonly actionDensity: number;
  readonly revelationHits: number;
  readonly noveltyVsPrev: number;
}

/** Mystery ledger — un seed planté doit être payé. TROIS états de payoff
 *  (NCR-MYC-001) : numéro de chapitre = PAID (marqueur de révélation trouvé) ;
 *  'UNCERTAIN_LATE_RECALL' = rappelé dans le DERNIER QUINTILE du livre sans
 *  marqueur — ambiguïté STRUCTURELLE (un fil actif en fin de livre est
 *  probablement soldé par le dénouement, le proxy lexical ne sait pas le lire) ;
 *  'UNPAID' = fil réellement abandonné. Règle principielle, PAS fittée au 88k :
 *  leçon des faux-UNPAID lettre/registre — l'ADN ne grave jamais un faux dur. */
export interface SeedLedgerRow {
  readonly seed: string;
  readonly plantedChapter: number | 'ABSENT';
  readonly recallChapters: readonly number[];
  readonly payoffChapter: number | 'UNPAID' | 'UNCERTAIN_LATE_RECALL';
}

export interface ArcCoherenceReport {
  readonly identityDrifts: readonly IdentityDriftSignal[];
  readonly chapterFunctions: readonly ChapterFunctionRow[];
  readonly seedLedger: readonly SeedLedgerRow[];
}

/** G5-TICS — verdict par n-gramme. Seuils = EXPERIMENTAL_DEFAULTS (EMP-16 : non scellés). */
export type TicLevel = 'OK' | 'WARN' | 'FAIL_SHADOW';

export interface TicRow {
  readonly gram: string;
  readonly occurrences: number;
  /** Normalisé par chapitre — comparable entre livres de tailles différentes. */
  readonly perChapter: number;
  readonly level: TicLevel;
}

export interface TicsReport {
  readonly rows: readonly TicRow[];
  readonly warnThresholdPerChapter: number;
  readonly failShadowThresholdPerChapter: number;
}

/** Erreurs typées du contrôleur (Result, jamais throw dans la logique). */
export type CoherenceErrorCode = 'EMPTY_INPUT' | 'INVALID_CHAPTER_NUMBER';
export interface CoherenceError {
  readonly code: CoherenceErrorCode;
  readonly detail: string;
}
export type CoherenceResult<T> = Result<T, CoherenceError>;

/**
 * Découpe en phrases partagée par les trois niveaux — UNE seule règle pour que
 * les index de phrase soient cohérents entre modules (même locus → même phrase).
 */
export function splitSentences(prose: string): readonly string[] {
  return prose
    .normalize('NFC')
    .split(/(?<=[.!?…])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Extrait borné pour les loci (preuve lisible, taille contrôlée). */
export function excerptOf(sentence: string, max = 120): string {
  return sentence.length <= max ? sentence : `${sentence.slice(0, max - 1)}…`;
}
