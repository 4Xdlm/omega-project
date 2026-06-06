/**
 * OMEGA Book-Factory — C1 CharacterRegistry — TYPES (BF-08 MAX_CODE_BAR)
 * ADR : DEC-20260606-021-R2 §8 · Roadmap : MEGA_ROADMAP_C0_C7 §C1 · Lois : BF-01 IDENTITY_MINT_ONCE
 *
 * INVARIANTS COUVERTS (chacun a ≥1 test nommé — voir tests/identity/) :
 *  INV-CHAR-001 id immuable           INV-CHAR-002 rename ne frappe jamais
 *  INV-CHAR-003 collision ⇒ AMBIGUOUS INV-CHAR-004 deux porteurs ⇒ contexte explicite
 *  INV-CHAR-005 aucun canon par nom   INV-CHAR-006 replay ⇒ même hash (CROSS-MACHINE)
 *  INV-CHAR-007 reveal lie sans fusion INV-CHAR-008 transfert de titre daté
 *  INV-CHAR-009 résolution porte la preuve
 *
 * MÉCANISME : l'identité est FRAPPÉE (mint par NONCE de naissance via canon-kernel
 * createDeterministicId) — jamais dérivée d'un nom/contenu. Le registre est une
 * PROJECTION PURE d'un journal append-only : replay natif, zéro horloge murale,
 * zéro aléa, zéro dépendance de LOCALE (revue adverse P0-01 : tout tri passe par
 * compareStrings, jamais localeCompare).
 * LIMITES : C1 ne fait PAS de coréférence pronominale (PRONOUN_UNRESOLVED systématique
 * — contrat : C2+) ; la désambiguïsation contextuelle exige un contexte EXPLICITE.
 */

/* ────────────────────────── BRANDS (zéro string/number nu) ───────────────────────── */
declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type CharacterId = Brand<string, 'CharacterId'>; // forme ent_<sha256> (frappe canon-kernel)
export type AliasId = Brand<string, 'AliasId'>;
export type EvidenceId = Brand<string, 'EvidenceId'>;
export type MintNonce = Brand<string, 'MintNonce'>; // unique par livre — JAMAIS le nom
export type AliasSurface = Brand<string, 'AliasSurface'>; // surface NORMALISÉE (NFC+casefold+espaces)
export type ChapterRef = Brand<number, 'ChapterRef'>; // temps DIÉGÉTIQUE (pas d'horloge murale en C1)
export type Confidence01 = Brand<number, 'Confidence01'>;
export type Seed = Brand<string, 'Seed'>;
export type Sha256Hex = Brand<string, 'Sha256Hex'>;

/* ──────────────────────────────── RESULT (échec = valeur) ────────────────────────── */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Ferme tout switch sur union discriminée — le compilateur garde la porte. */
export function assertNever(x: never): never {
  throw new Error(`assertNever: unreachable variant ${JSON.stringify(x)}`);
}

/**
 * Comparaison de chaînes DÉTERMINISTE CROSS-MACHINE (unités de code UTF-16, zéro ICU).
 * Revue adverse P0-01 : localeCompare() varie selon la locale système → INTERDIT
 * dans tout chemin qui alimente un hash ou un ordre observable. Les ids étant
 * ASCII (ent_/alias_ + hex), l'ordre par unités de code est total et stable partout.
 */
export function compareStrings(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/* ─────────────────────────────── SMART CONSTRUCTORS ──────────────────────────────── */
export type SurfaceError = { readonly code: 'EMPTY_SURFACE'; readonly raw: string };

/**
 * Normalisation canonique d'une surface : NFC, casefold, trim, espaces internes réduits.
 * NOTE locale (revue P2-02) : toLowerCase() sans locale = mapping Unicode par défaut,
 * correct pour le FRANÇAIS (périmètre V1). Support turc/islandais ⇒ revisiter (décision EMP-16).
 */
export function asAliasSurface(raw: string): Result<AliasSurface, SurfaceError> {
  const normalized = raw.normalize('NFC').toLowerCase().trim().replace(/\s+/gu, ' ');
  if (normalized.length === 0) return err({ code: 'EMPTY_SURFACE', raw });
  return ok(normalized as AliasSurface);
}

export type ConfidenceError = { readonly code: 'INVALID_CONFIDENCE'; readonly raw: number };

export function asConfidence01(raw: number): Result<Confidence01, ConfidenceError> {
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return err({ code: 'INVALID_CONFIDENCE', raw });
  return ok(raw as Confidence01);
}

export function asChapterRef(n: number): ChapterRef {
  if (!Number.isInteger(n) || n < 0) throw new Error(`ChapterRef invalide: ${n}`); // assert frontière
  return n as ChapterRef;
}

/* ──────────────────────────────────── RECORDS ────────────────────────────────────── */
export type AliasKind = 'name' | 'nickname' | 'title' | 'epithet' | 'cover_identity' | 'misdirection';
export type CharacterStatus = 'active' | 'dead' | 'missing' | 'unknown';
export type CreatedBy = 'planner' | 'extractor' | 'architect';

export interface AliasRecord {
  readonly aliasId: AliasId;
  readonly characterId: CharacterId;
  readonly surface: AliasSurface;
  readonly kind: AliasKind;
  readonly validFrom?: ChapterRef;
  readonly validTo?: ChapterRef; // exclusif : valide sur [validFrom, validTo)
  readonly revealedAt?: ChapterRef;
  readonly confidence: Confidence01;
  readonly evidenceRefs: readonly EvidenceId[]; // INV-CHAR-009 : jamais vide (validé à l'event)
}

export interface CharacterRecord {
  readonly id: CharacterId;
  readonly mintNonce: MintNonce;
  readonly currentDisplayName: string; // affichage SEUL — jamais une clé (INV-CHAR-005)
  readonly introducedAt: ChapterRef;
  readonly revealedAs: CharacterId | null; // INV-CHAR-007 : lien, pas fusion
  readonly status: CharacterStatus;
  readonly createdBy: CreatedBy;
  readonly creationEvidence: EvidenceId;
  readonly version: number; // nombre d'événements appliqués à CE personnage
}

/* ───────────────────────── JOURNAL (source de vérité du registre) ────────────────── */
export type IdentityEvent =
  | {
      readonly kind: 'MINT';
      readonly nonce: MintNonce;
      readonly displayName: string;
      readonly introducedAt: ChapterRef;
      readonly createdBy: CreatedBy;
      readonly evidence: EvidenceId;
    }
  | { readonly kind: 'ALIAS'; readonly alias: AliasRecord }
  | {
      readonly kind: 'RENAME'; // change l'AFFICHAGE — ne frappe JAMAIS (INV-CHAR-002)
      readonly id: CharacterId;
      readonly newDisplayName: string;
      readonly at: ChapterRef;
      readonly evidence: EvidenceId;
    }
  | {
      readonly kind: 'REVEAL'; // fausse identité : outer était inner (INV-CHAR-007)
      readonly outerId: CharacterId;
      readonly innerId: CharacterId;
      readonly at: ChapterRef;
      readonly evidence: EvidenceId;
    }
  | {
      readonly kind: 'TITLE_TRANSFER'; // « le maire » change de porteur (INV-CHAR-008)
      readonly surface: AliasSurface;
      readonly fromId: CharacterId;
      readonly toId: CharacterId;
      readonly at: ChapterRef;
      readonly evidence: EvidenceId;
    }
  | {
      readonly kind: 'STATUS';
      readonly id: CharacterId;
      readonly status: CharacterStatus;
      readonly at: ChapterRef;
      readonly evidence: EvidenceId;
    };

/* ───────────────────────────────── RÉSOLUTION (5 cas) ────────────────────────────── */
export interface ResolutionContext {
  readonly chapter: ChapterRef;
  /** Entités explicitement « en scène » (fournies par l'appelant) — SEULE base de
   *  désambiguïsation autorisée (INV-CHAR-004). Jamais de choix au score. */
  readonly inScene?: readonly CharacterId[];
}

export type Resolution =
  | {
      readonly kind: 'RESOLVED_UNIQUE';
      readonly id: CharacterId;
      readonly via: AliasId; // INV-CHAR-009 : la preuve de résolution
      readonly contextUsed: boolean; // true ⇔ désambiguïsation inScene (explicite, traçable)
    }
  | { readonly kind: 'AMBIGUOUS'; readonly candidates: readonly CharacterId[] }
  | { readonly kind: 'UNKNOWN_NEW_ENTITY'; readonly surface: AliasSurface }
  | { readonly kind: 'EPITHET_NEEDS_CONTEXT'; readonly candidates: readonly CharacterId[] }
  | { readonly kind: 'PRONOUN_UNRESOLVED'; readonly surface: AliasSurface };

/** Pronoms FR fermés — TOUJOURS PRONOUN_UNRESOLVED en C1 (coréférence = C2+, contrat). */
export const FR_PRONOUNS: ReadonlySet<string> = new Set([
  'il', 'elle', 'ils', 'elles', 'lui', 'eux', 'celui-ci', 'celle-ci', 'ceux-ci', 'celles-ci',
]);

/* ─────────────────────────────── DÉTERMINISME INJECTÉ ────────────────────────────── */
export interface IdentityDeterminism {
  /** Graine de frappe du LIVRE — toute frappe en dérive (replay : même journal ⇒ mêmes ids). */
  readonly mintSeed: Seed;
}
