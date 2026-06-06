/**
 * OMEGA Book-Factory — C2 RECALL BUS — TYPES (BF-08)
 * ADR DEC-20260606-021-R2 §9 · BF-02 RECALL_OR_INVALID · « la Bible ne peut pas oublier d'être consultée ».
 *
 * INVARIANTS : INV-RECALL-001 (mention canonique ⇒ pack, sinon candidat INVALID)
 *  INV-RECALL-002 (ambiguïté JAMAIS résolue silencieusement — signal typé)
 *  INV-RECALL-003 (tout pack porte les hashes de ses sources — replay)
 *  INV-RECALL-004 (les faits critiques ne sont JAMAIS élagués par délestage)
 *  INV-RECALL-005 (même texte + même index ⇒ mêmes mentions, ordre déterministe)
 *
 * MÉCANISME : le scanner (CALC pur) repère les surfaces connues + candidats inconnus ;
 * le résolveur C1 tranche (5 cas, jamais au score) ; le builder interroge les
 * « librarians » (StoryState, Registry, épistémique optionnel) et BORNE par budget via
 * les fonctions de délestage à seuil (héritage doctrinal CNC-054/075/055 : digest/tier/prune).
 * LIMITES : V1 entités = PERSONNAGES (lieux/objets passent par StoryState mais ne
 * déclenchent pas le gate) ; tokenCost = estimation CALC (mots×k), pas un comptage
 * tokenizer — suffisant pour le plafond physique, recalibrable EMP-19.
 */

import type {
  Brand,
  CharacterId,
  ChapterRef,
  Resolution,
  Result,
  Sha256Hex,
} from '../identity/identity-types.js';
import type { CharacterRegistry } from '../identity/character-registry.js';
import type { StoryState } from '../story-state.js';

export type RecallPackId = Brand<string, 'RecallPackId'>;
export type TokenCount = Brand<number, 'TokenCount'>;
export type NormalizedText = Brand<string, 'NormalizedText'>;

/* ───────────────────────────── MENTIONS (sortie scanner) ─────────────────────────── */
export interface KnownMention {
  readonly kind: 'KNOWN';
  readonly surfaceRaw: string;
  readonly offset: number; // offset dans le texte NORMALISÉ — déterministe
  readonly resolution: Resolution;
}
export interface UnknownMention {
  readonly kind: 'UNKNOWN_CANDIDATE'; // séquence capitalisée hors index — candidat entité neuve
  readonly surfaceRaw: string;
  readonly offset: number;
}
export type Mention = KnownMention | UnknownMention;

/* ───────────────────────────── RECALL PACK (ADR §9.3) ────────────────────────────── */
export interface CharacterFactsSummary {
  readonly status: string;
  readonly location?: string;
  readonly arcPosition?: string;
  readonly lastSeenChapter: number;
}
export interface RelationshipSummary { readonly to: string; readonly type: string; readonly valence: number; }
export interface ThreadSummary { readonly id: string; readonly question: string; readonly openedChapter: number; }
export interface DebtSummary {
  readonly seedId: string; readonly desc: string;
  readonly plantedChapter: number; readonly bloomTargetChapter: number; readonly status: string;
  readonly bloomsNow: boolean; // CRITIQUE si true — jamais élagué (INV-RECALL-004)
}
export interface EventSummary { readonly chapter: number; readonly text: string; }
/** Verrous anti-dérive — TOUJOURS critiques (rôle/lieu/état imposés par le plan). */
export interface DriftRule { readonly field: 'role' | 'location' | 'status'; readonly expected: string; }

export interface RecallPack {
  readonly packId: RecallPackId;
  readonly entityId: CharacterId;
  readonly displayName: string;
  readonly chapter: ChapterRef;
  readonly facts: CharacterFactsSummary | null;
  readonly knows: readonly string[]; // sujets que l'entité SAIT (épistémique, si fourni)
  readonly relationships: readonly RelationshipSummary[];
  readonly openThreads: readonly ThreadSummary[];
  readonly debts: readonly DebtSummary[];
  readonly recentEvents: readonly EventSummary[];
  readonly forbiddenDrifts: readonly DriftRule[];
  readonly degraded: readonly DormantTrigger[]; // délestages appliqués — traçabilité
  readonly tokenCost: TokenCount;
  readonly sourceHashes: readonly Sha256Hex[]; // INV-RECALL-003
}

/* ──────────────────────────── LIBRARIANS (sources injectées) ─────────────────────── */
/** Pont d'identité : StoryState parle en ids « story » (string), le bus en CharacterId. */
export interface Librarians {
  readonly registry: CharacterRegistry;
  readonly story: StoryState;
  /** mapping CharacterId → id story-state (convention du livre, injectée — jamais devinée). */
  readonly storyIdOf: (id: CharacterId) => string | undefined;
  /** épistémique optionnel : sujets connus de l'entité (adapter P0.6b). */
  readonly knownSubjectsOf?: (id: CharacterId) => readonly string[];
  /** verrous du chapitre (depuis ChapterSpec) — critiques par construction. */
  readonly driftRulesOf?: (id: CharacterId) => readonly DriftRule[];
}

/* ───────────────────────────── DÉLESTAGE À SEUIL (§9.6) ──────────────────────────── */
export type DormantTrigger =
  | 'too_many_facts'
  | 'context_budget_exceeded'
  | 'low_confidence_resolution';

export type RecallError =
  | { readonly code: 'UNKNOWN_ENTITY'; readonly id: CharacterId }
  | { readonly code: 'BUDGET_UNSATISFIABLE_CRITICAL'; readonly id: CharacterId; readonly needed: TokenCount; readonly budget: TokenCount };

/* ─────────────────────────────── VIOLATIONS (gate BF-02) ─────────────────────────── */
export type RecallViolation =
  | { readonly kind: 'MENTION_WITHOUT_PACK'; readonly id: CharacterId; readonly surfaceRaw: string; readonly offset: number } // INV-RECALL-001 → INVALID
  | { readonly kind: 'AMBIGUOUS_MENTION'; readonly surfaceRaw: string; readonly candidates: readonly CharacterId[]; readonly offset: number } // INV-RECALL-002 → signal
  | { readonly kind: 'UNKNOWN_ENTITY_IN_PROSE'; readonly surfaceRaw: string; readonly offset: number }; // entité neuve : escalade, jamais silence

export interface RecallGateReport {
  readonly verdict: 'PASS' | 'INVALID';
  readonly violations: readonly RecallViolation[]; // INVALID ⇔ ≥1 MENTION_WITHOUT_PACK
  readonly mentionsScanned: number;
  readonly packsChecked: number;
}

export type RecallResult<T> = Result<T, RecallError>;
