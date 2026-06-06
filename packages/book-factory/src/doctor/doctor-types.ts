/**
 * OMEGA Book-Factory — C11 REWRITE_DOCTOR (BF-08) — types.
 *
 * CONCEPT-REWRITE-DOCTOR-001 (FOUND_EXISTING) : « l'utilisateur donne un roman
 * et OMEGA vérifie les cohérences et la qualité et réécrit ce qu'il y a besoin ».
 * Ancêtres : GO_B Architecte 2026-05-29 (ADR_V2_3_M0:125, human-in-the-loop) ;
 * audit C9 (OÙ réparer) ; rewritePrompt V2.3 (COMMENT régénérer) ; doctrine V1
 * Repair Pack prouvée sur le 88k (minimal-intervention, V0 intacte, diff total).
 *
 * DOCTRINE (BF-12 REWRITE_PRESERVE_INTENT) : le Doctor CONSERVE par défaut.
 * Trois classes d'action, par risque croissant :
 *   - MECHANICAL_SAFE : réparation déterministe prouvée (unification d'identité/
 *     lieu, couture cassée, dédup de reprise) — exécutée par le Doctor, diffée.
 *   - SURGICAL_LLM    : réécriture de segment (packet V2.3 préparé) — exécutée
 *     SEULEMENT si DOCTOR_LLM=1 (gated ; human-in-the-loop par défaut, GO_B).
 *   - SIGNAL_ONLY     : ambigu ou esthétique (tics, flashbacks possibles,
 *     REDITE) — JAMAIS exécuté automatiquement : signalé avec evidence.
 * Un proxy lexical ne déclenche jamais une réécriture automatique (leçon
 * faux-UNPAID lettre/registre) : tout LLM-repair et toute coupe = humain ou flag.
 */

import type { Result } from '../identity/identity-types.js';
import type { SentencePhysicsSignal, ChapterCoherenceSignal, ArcCoherenceReport, TicsReport } from '../coherence/coherence-types.js';

/* ── Import ──────────────────────────────────────────────────────────────── */

/** Stratégie de découpage détectée à l'import d'un manuscrit ARBITRAIRE. */
export type SplitStrategy =
  | 'OMEGA_HEADINGS' // « ## Chapitre N » (format runs OMEGA)
  | 'CHAPTER_WORDS' // « Chapitre 12 », « CHAPITRE XII », « Chapter 3 » en début de ligne
  | 'NUMERIC_HEADINGS' // « 12. », « XII », « — 12 — » seuls sur une ligne
  | 'SIZE_FALLBACK'; // aucun marqueur fiable : tranches ~N mots à frontière de paragraphe

export interface ChapterSlice {
  readonly chapter: number;
  readonly title: string;
  readonly prose: string;
  readonly words: number;
}

export interface ImportedManuscript {
  readonly strategy: SplitStrategy;
  readonly chapters: readonly ChapterSlice[];
  readonly totalWords: number;
  /** Casting auto-détecté (à confirmer en human-in-the-loop). */
  readonly castProposal: readonly CastEntry[];
}

export interface CastEntry {
  readonly name: string;
  readonly occurrences: number;
  readonly firstChapter: number;
  /** Variantes orthographiques proches détectées (candidates alias/typo). */
  readonly nearVariants: readonly string[];
}

/* ── Findings → actions ──────────────────────────────────────────────────── */

export type RepairClass = 'MECHANICAL_SAFE' | 'SURGICAL_LLM' | 'SIGNAL_ONLY';

/** Action de réparation — union discriminée exhaustive. */
export type RepairAction =
  | {
      readonly kind: 'UNIFY_IDENTITY';
      readonly cls: 'MECHANICAL_SAFE';
      readonly role: string;
      readonly keep: string; // nom retenu (dominant ou choisi)
      readonly replace: readonly string[]; // noms à remplacer
      readonly evidence: string;
    }
  | {
      readonly kind: 'UNIFY_LOCATION';
      readonly cls: 'MECHANICAL_SAFE';
      readonly keep: string;
      readonly replace: readonly string[];
      readonly evidence: string;
    }
  | {
      readonly kind: 'FIX_BROKEN_STITCH';
      readonly cls: 'MECHANICAL_SAFE';
      readonly chapter: number;
      /** Fragment pendu (« Elle l ») + reprise dupliquée — réparation trim+dedup. */
      readonly danglingFragment: string;
      readonly excerpt: string;
    }
  | {
      readonly kind: 'SURGICAL_REWRITE';
      readonly cls: 'SURGICAL_LLM';
      readonly chapter: number;
      readonly sentenceIndex: number;
      readonly reason: string; // ex. FOOTWEAR_CONTRADICTION
      readonly segmentExcerpt: string;
      /** Consigne de réparation FACTUELLE (gabarit N2-like, jamais esthétique). */
      readonly directive: string;
    }
  | {
      readonly kind: 'SIGNAL';
      readonly cls: 'SIGNAL_ONLY';
      readonly topic: 'TICS' | 'TIME_REGRESSION' | 'GHOST_SPEAKER' | 'LOCATION_JUMP' | 'REDITE' | 'SEED_UNPAID' | 'DOOR' | 'OBJECT';
      readonly detail: string;
      readonly count: number;
    };

export interface RepairPlan {
  readonly actions: readonly RepairAction[];
  readonly mechanicalCount: number;
  readonly surgicalCount: number;
  readonly signalCount: number;
}

/* ── Exécution ───────────────────────────────────────────────────────────── */

export interface AppliedRepair {
  readonly action: RepairAction;
  readonly replacements: number; // occurrences modifiées (0 pour SIGNAL)
  readonly applied: boolean;
}

export interface DoctorAudit {
  readonly physics: readonly SentencePhysicsSignal[];
  readonly chapterSignals: readonly ChapterCoherenceSignal[];
  readonly arc: ArcCoherenceReport;
  readonly tics: TicsReport;
}

export interface DoctorReport {
  readonly import: { readonly strategy: SplitStrategy; readonly chapters: number; readonly words: number };
  readonly auditBefore: DoctorAuditSummary;
  readonly plan: RepairPlan;
  readonly applied: readonly AppliedRepair[];
  readonly auditAfter: DoctorAuditSummary;
  /** V1 réparée — la V0 n'est JAMAIS modifiée (doctrine versioning). */
  readonly repairedProse: string;
}

export interface DoctorAuditSummary {
  readonly identityDrifts: number;
  readonly physicsSignals: number;
  readonly chapterSignals: number;
  readonly ticsFailShadow: number;
  readonly seedsUnpaid: number;
}

export type DoctorErrorCode = 'EMPTY_MANUSCRIPT' | 'IMPORT_FAILED' | 'AUDIT_FAILED';
export interface DoctorError { readonly code: DoctorErrorCode; readonly detail: string; }
export type DoctorResult<T> = Result<T, DoctorError>;
