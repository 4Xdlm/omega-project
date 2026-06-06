/**
 * OMEGA Book-Factory — C1 CHARACTERREGISTRY (BF-08 MAX_CODE_BAR)
 * ADR DEC-20260606-021-R2 §8 · BF-01 IDENTITY_MINT_ONCE · D3 signé.
 *
 * MÉCANISME : projection PURE d'un journal append-only (même doctrine que story-state).
 *  - La frappe (mint) dérive l'ID du NONCE de naissance via canon-kernel
 *    createDeterministicId('ent', mintSeed, 'CHARACTER_MINT', { nonce }) :
 *    rejouable (même journal ⇒ mêmes ids), JAMAIS fonction du nom (BF-01).
 *  - `apply` est une fonction de transition IMMUABLE : (registre, événement) → nouveau
 *    registre OU erreur typée. Aucun état partagé, aucune horloge murale, aucun aléa,
 *    AUCUNE dépendance de locale (P0-01 : tris par compareStrings, jamais localeCompare).
 *  - `stateHash` = sha256(canonicalize(projection triée)) : la preuve de replay CROSS-MACHINE.
 * LIMITES : structures recopiées à chaque apply (O(n) par événement — négligeable à
 * l'échelle d'un roman ; saga géante ⇒ structures persistantes, décision EMP-16).
 * `journalLength` est INTERNE et reconstruit par replay — toute persistance future du
 * registre DOIT persister le JOURNAL, jamais l'état projeté (sinon positions d'alias
 * recalculées faux — revue P2-05). Échec = Result, jamais d'exception de flux.
 */

import { canonicalize, createDeterministicId, sha256 } from '@omega/canon-kernel';

import type {
  AliasId,
  AliasRecord,
  AliasSurface,
  CharacterId,
  CharacterRecord,
  ChapterRef,
  EvidenceId,
  IdentityDeterminism,
  IdentityEvent,
  MintNonce,
  Resolution,
  ResolutionContext,
  Result,
  Sha256Hex,
} from './identity-types.js';
import { assertNever, compareStrings, err, ok, FR_PRONOUNS } from './identity-types.js';
import type { IdentityError } from './identity-errors.js';
import { resolveSurface } from './alias-resolver.js';

/* ─────────────────────────── état interne (immuable, privé) ─────────────────────── */
/** Fiche interne = fiche publique + chapitre de révélation (posé par REVEAL). */
type CharRow = CharacterRecord & { readonly revealedAtChapter?: ChapterRef };

interface RegistryState {
  readonly chars: ReadonlyMap<CharacterId, CharRow>;
  readonly aliases: ReadonlyMap<AliasId, AliasRecord>;
  readonly bySurface: ReadonlyMap<AliasSurface, readonly AliasId[]>;
  readonly nonces: ReadonlySet<MintNonce>;
  readonly journalLength: number;
}

const EMPTY_STATE: RegistryState = {
  chars: new Map(),
  aliases: new Map(),
  bySurface: new Map(),
  nonces: new Set(),
  journalLength: 0,
};

/* ────────────────────────────── frappe déterministe ─────────────────────────────── */
/** BF-01 : l'ID est fonction du (seed livre, NONCE) — jamais du nom. */
export function mintCharacterId(det: IdentityDeterminism, nonce: MintNonce): CharacterId {
  return createDeterministicId('ent', String(det.mintSeed), 'CHARACTER_MINT', {
    nonce: String(nonce),
  }) as CharacterId;
}

/** AliasId déterministe (dérivé du CONTENU de l'alias + position journal — replay-stable). */
export function deriveAliasId(
  surface: AliasSurface,
  characterId: CharacterId,
  journalPosition: number,
): AliasId {
  const h = sha256(
    canonicalize({ kind: 'ALIAS_ID', surface: String(surface), characterId: String(characterId), journalPosition }),
  );
  return `alias_${h}` as AliasId;
}

/* ──────────────────────── helper de construction d'événements ───────────────────── */
export interface MintSpec {
  readonly nonce: MintNonce;
  readonly displayName: string;
  readonly introducedAt: ChapterRef;
  readonly createdBy: CharacterRecord['createdBy'];
  readonly evidence: EvidenceId;
}

/**
 * Construit les événements de naissance : MINT + alias « name » EXPLICITE.
 * (Le journal reste la seule vérité — rien d'implicite, INV-CHAR-006.)
 */
export function buildMintEvents(
  det: IdentityDeterminism,
  spec: MintSpec,
  surface: AliasSurface,
  confidence: AliasRecord['confidence'],
  journalPosition: number,
): readonly [IdentityEvent, IdentityEvent] {
  const id = mintCharacterId(det, spec.nonce);
  const mint: IdentityEvent = {
    kind: 'MINT',
    nonce: spec.nonce,
    displayName: spec.displayName,
    introducedAt: spec.introducedAt,
    createdBy: spec.createdBy,
    evidence: spec.evidence,
  };
  const alias: IdentityEvent = {
    kind: 'ALIAS',
    alias: {
      aliasId: deriveAliasId(surface, id, journalPosition),
      characterId: id,
      surface,
      kind: 'name',
      validFrom: spec.introducedAt,
      confidence,
      evidenceRefs: [spec.evidence],
    },
  };
  return [mint, alias];
}

/* ─────────────────────────────────── REGISTRE ───────────────────────────────────── */
export class CharacterRegistry {
  private constructor(
    private readonly det: IdentityDeterminism,
    private readonly state: RegistryState,
  ) {}

  static empty(det: IdentityDeterminism): CharacterRegistry {
    return new CharacterRegistry(det, EMPTY_STATE);
  }

  /** Projection pure : fold du journal. Même journal ⇒ même registre ⇒ même hash (INV-CHAR-006). */
  static fromJournal(
    det: IdentityDeterminism,
    events: readonly IdentityEvent[],
  ): Result<CharacterRegistry, IdentityError> {
    let reg = CharacterRegistry.empty(det);
    for (const e of events) {
      const next = reg.apply(e);
      if (!next.ok) return next;
      reg = next.value;
    }
    return ok(reg);
  }

  /* ───────────── transition immuable : valide PUIS projette, sinon erreur ─────────── */
  apply(event: IdentityEvent): Result<CharacterRegistry, IdentityError> {
    switch (event.kind) {
      case 'MINT': {
        if (this.state.nonces.has(event.nonce)) return err({ code: 'DUPLICATE_NONCE', nonce: event.nonce });
        if (event.displayName.trim().length === 0)
          return err({ code: 'EMPTY_DISPLAY_NAME', nonce: event.nonce });
        const id = mintCharacterId(this.det, event.nonce);
        const rec: CharRow = {
          id,
          mintNonce: event.nonce,
          currentDisplayName: event.displayName,
          introducedAt: event.introducedAt,
          revealedAs: null,
          status: 'active',
          createdBy: event.createdBy,
          creationEvidence: event.evidence,
          version: 1,
        };
        return ok(this.withState({ chars: mapSet(this.state.chars, id, rec) }));
      }

      case 'ALIAS': {
        const a = event.alias;
        if (!this.state.chars.has(a.characterId))
          return err({ code: 'UNKNOWN_CHARACTER', id: a.characterId, inEvent: 'ALIAS' });
        if (this.state.aliases.has(a.aliasId)) return err({ code: 'DUPLICATE_ALIAS_ID', aliasId: a.aliasId });
        if (a.evidenceRefs.length === 0) return err({ code: 'MISSING_EVIDENCE', aliasId: a.aliasId }); // INV-CHAR-009
        if (a.validFrom !== undefined && a.validTo !== undefined && a.validTo <= a.validFrom)
          return err({ code: 'INVALID_VALIDITY', aliasId: a.aliasId, from: a.validFrom, to: a.validTo });
        return ok(
          this.withState({
            aliases: mapSet(this.state.aliases, a.aliasId, a),
            bySurface: surfaceAdd(this.state.bySurface, a.surface, a.aliasId),
          }),
        );
      }

      case 'RENAME': {
        const rec = this.state.chars.get(event.id);
        if (rec === undefined) return err({ code: 'UNKNOWN_CHARACTER', id: event.id, inEvent: 'RENAME' });
        // INV-CHAR-001/002 : l'id ne bouge pas, AUCUNE frappe — seul l'affichage change.
        const next: CharRow = { ...rec, currentDisplayName: event.newDisplayName, version: rec.version + 1 };
        return ok(this.withState({ chars: mapSet(this.state.chars, event.id, next) }));
      }

      case 'REVEAL': {
        if (event.outerId === event.innerId) return err({ code: 'SELF_REVEAL', id: event.outerId });
        const outer = this.state.chars.get(event.outerId);
        if (outer === undefined) return err({ code: 'UNKNOWN_CHARACTER', id: event.outerId, inEvent: 'REVEAL' });
        if (!this.state.chars.has(event.innerId))
          return err({ code: 'UNKNOWN_CHARACTER', id: event.innerId, inEvent: 'REVEAL' });
        if (outer.revealedAs !== null) return err({ code: 'ALREADY_REVEALED', outerId: event.outerId });
        // INV-CHAR-007 : LIEN, pas fusion — les deux fiches persistent intégralement.
        const next: CharRow = {
          ...outer,
          revealedAs: event.innerId,
          revealedAtChapter: event.at,
          version: outer.version + 1,
        };
        return ok(this.withState({ chars: mapSet(this.state.chars, event.outerId, next) }));
      }

      case 'TITLE_TRANSFER': {
        if (!this.state.chars.has(event.toId))
          return err({ code: 'UNKNOWN_CHARACTER', id: event.toId, inEvent: 'TITLE_TRANSFER' });
        const holder = (this.state.bySurface.get(event.surface) ?? [])
          .map((aid) => this.state.aliases.get(aid))
          .find(
            (a): a is AliasRecord =>
              a !== undefined &&
              a.characterId === event.fromId &&
              a.kind === 'title' &&
              isAliasValidAt(a, event.at),
          );
        if (holder === undefined)
          return err({ code: 'TITLE_TRANSFER_MISMATCH', surface: event.surface, fromId: event.fromId, at: event.at });
        // INV-CHAR-008 : clôture DATÉE (validTo exclusif = at) + ouverture (validFrom = at).
        // Frontière PROPRE : au chapitre `at` exactement, l'ancien est invalide (>= validTo),
        // le nouveau est valide (>= validFrom) — ni trou ni chevauchement (testé aux 3 dates).
        const closed: AliasRecord = { ...holder, validTo: event.at };
        const opened: AliasRecord = {
          aliasId: deriveAliasId(event.surface, event.toId, this.state.journalLength),
          characterId: event.toId,
          surface: event.surface,
          kind: 'title',
          validFrom: event.at,
          confidence: holder.confidence,
          evidenceRefs: [event.evidence],
        };
        return ok(
          this.withState({
            aliases: mapSet(mapSet(this.state.aliases, closed.aliasId, closed), opened.aliasId, opened),
            bySurface: surfaceAdd(this.state.bySurface, opened.surface, opened.aliasId),
          }),
        );
      }

      case 'STATUS': {
        const rec = this.state.chars.get(event.id);
        if (rec === undefined) return err({ code: 'UNKNOWN_CHARACTER', id: event.id, inEvent: 'STATUS' });
        const next: CharRow = { ...rec, status: event.status, version: rec.version + 1 };
        return ok(this.withState({ chars: mapSet(this.state.chars, event.id, next) }));
      }

      default:
        return assertNever(event);
    }
  }

  /* ──────────────────────────────── lectures pures ────────────────────────────────── */
  character(id: CharacterId): CharacterRecord | undefined {
    return this.state.chars.get(id);
  }

  characterCount(): number {
    return this.state.chars.size;
  }

  aliasesOf(id: CharacterId): readonly AliasRecord[] {
    return [...this.state.aliases.values()]
      .filter((a) => a.characterId === id)
      .sort((a, b) => compareStrings(String(a.aliasId), String(b.aliasId)));
  }

  /**
   * Identité PROFONDE à un chapitre donné : suit les REVEAL déjà advenus.
   * SÉMANTIQUE DU GARDE ANTI-CYCLE (revue P0-02, documentée) : un cycle de REVEAL est
   * IMPOSSIBLE dans un journal valide (ALREADY_REVEALED interdit la double-révélation
   * d'un même outer). Si un état pathologique existait néanmoins (corruption externe),
   * la fonction TERMINE TOUJOURS et retourne le nœud où le cycle se referme — un
   * fail-safe déterministe, PAS une réponse sémantique ; le journal corrompu doit être
   * détecté en amont par le replay (fromJournal échoue ou hash diverge).
   */
  trueIdentityOf(id: CharacterId, chapter: ChapterRef): CharacterId {
    const seen = new Set<CharacterId>();
    let cur = id;
    for (;;) {
      if (seen.has(cur)) return cur;
      seen.add(cur);
      const rec = this.state.chars.get(cur);
      if (rec === undefined || rec.revealedAs === null) return cur;
      if (rec.revealedAtChapter === undefined || chapter < rec.revealedAtChapter) return cur;
      cur = rec.revealedAs;
    }
  }

  /** Résolution d'une surface — délégué pur (jamais de choix silencieux, INV-CHAR-003/004). */
  resolve(rawSurface: string, ctx: ResolutionContext): Resolution {
    return resolveSurface(rawSurface, ctx, {
      bySurface: this.state.bySurface,
      aliases: this.state.aliases,
      pronouns: FR_PRONOUNS,
    });
  }

  /**
   * Preuve de replay : hash canonique de la projection TRIÉE (INV-CHAR-006).
   * Tri par compareStrings (unités de code) — IDENTIQUE sur toute machine/locale (P0-01).
   * canonicalize (canon-kernel, scellé 67 tests) est en lecture seule sur ses entrées ;
   * les copies superficielles suffisent (revue P2-01, hypothèse adossée aux tests scellés).
   */
  stateHash(): Sha256Hex {
    const chars = [...this.state.chars.values()]
      .map((c) => ({ ...c }))
      .sort((a, b) => compareStrings(String(a.id), String(b.id)));
    const aliases = [...this.state.aliases.values()]
      .map((a) => ({ ...a }))
      .sort((a, b) => compareStrings(String(a.aliasId), String(b.aliasId)));
    return sha256(canonicalize({ v: 1, chars, aliases })) as Sha256Hex;
  }

  /* ────────────────────────────── interne (immuable) ─────────────────────────────── */
  private withState(patch: Partial<RegistryState>): CharacterRegistry {
    const nonces =
      patch.chars !== undefined
        ? new Set([...patch.chars.values()].map((c) => c.mintNonce))
        : this.state.nonces;
    return new CharacterRegistry(this.det, {
      chars: patch.chars ?? this.state.chars,
      aliases: patch.aliases ?? this.state.aliases,
      bySurface: patch.bySurface ?? this.state.bySurface,
      nonces,
      journalLength: this.state.journalLength + 1,
    });
  }
}

/* ─────────────────────────── utilitaires purs (privés au module) ─────────────────── */
function mapSet<K, V>(m: ReadonlyMap<K, V>, k: K, v: V): ReadonlyMap<K, V> {
  const next = new Map(m);
  next.set(k, v);
  return next;
}

function surfaceAdd(
  m: ReadonlyMap<AliasSurface, readonly AliasId[]>,
  s: AliasSurface,
  id: AliasId,
): ReadonlyMap<AliasSurface, readonly AliasId[]> {
  const next = new Map(m);
  next.set(s, [...(next.get(s) ?? []), id]);
  return next;
}

export function isAliasValidAt(a: AliasRecord, chapter: ChapterRef): boolean {
  if (a.validFrom !== undefined && chapter < a.validFrom) return false;
  if (a.validTo !== undefined && chapter >= a.validTo) return false; // validTo exclusif
  return true;
}
