/**
 * OMEGA Book-Factory — REGISTRE D'ENTITÉS TYPÉ UNIQUE (BF-08) — P0-A.
 * GO tribunal 2/2 (2026-06-07). Tue la représentation 4× (CharacterRegistry /
 * annotator inline / cast génome / cibles GPS) : UNE source mintée, les
 * consommateurs reçoivent des PROJECTIONS (`toAnnotatorEntities()`), jamais
 * leur propre carte du monde. « Cinq cerveaux, zéro vérité » = interdit.
 *
 * FOUND_EXISTING : CONCEPT-CHARACTER-REGISTRY-001 (C1, mint par NONCE) reste
 * INTACT — ce registre généralise la DISCIPLINE de mint (id déterministe,
 * zéro doublon, alias tracés) aux kinds CHARACTER/PLACE/EVENT/OBJECT.
 *
 * LOI CASTING TOTAL (leçon « Dubois », mandat Gemini) : toute mention du texte
 * qui ne pointe pas vers un ID minté = erreur système IDENTITY_UNDEFINED —
 * jamais silencieuse. C'est la gate d'écriture du Studio V2 : on mint AVANT
 * d'écrire le chapitre 1.
 */

import { sha256 } from '@omega/canon-kernel';

import { err, ok, compareStrings } from './identity-types.js';
import type { Result } from './identity-types.js';
import { annotateMentions } from './mention-annotator.js';
import type { AnnotatorEntity, EntityKind } from './mention-annotator.js';

export type { EntityKind } from './mention-annotator.js';

const KIND_PREFIX: Readonly<Record<EntityKind, string>> = {
  CHARACTER: 'ent', PLACE: 'loc', EVENT: 'evt', OBJECT: 'obj',
};

export interface EntityMintSpec {
  readonly kind: EntityKind;
  readonly canonical: string;
  readonly aliases?: readonly string[];
  readonly vital?: 'ALIVE' | 'DEAD' | 'MISSING';
}

export interface EntityRecord {
  readonly entityId: string;
  readonly kind: EntityKind;
  readonly canonical: string;
  readonly aliases: readonly string[];
  readonly vital: 'ALIVE' | 'DEAD' | 'MISSING';
}

export type RegistryError =
  | { readonly code: 'EMPTY_CANONICAL'; readonly detail: string }
  | { readonly code: 'DUPLICATE_SURFACE'; readonly detail: string };

export interface IdentityUndefined {
  readonly code: 'IDENTITY_UNDEFINED';
  readonly chapter: number;
  readonly name: string;
  readonly count: number;
}

/** Registre unique. Mint DÉTERMINISTE : id = préfixe(kind) + slug + hash(seed|kind|canonical). */
export class EntityRegistry {
  private readonly seed: string;
  private readonly records = new Map<string, EntityRecord>(); // par entityId
  private readonly surfaces = new Map<string, string>(); // surface NFC-lower → entityId

  constructor(seed: string) { this.seed = seed; }

  mint(spec: EntityMintSpec): Result<EntityRecord, RegistryError> {
    const canonical = spec.canonical.normalize('NFC').trim();
    if (canonical.length === 0) return err({ code: 'EMPTY_CANONICAL', detail: 'canonical vide' });
    const aliases = (spec.aliases ?? []).map((a) => a.normalize('NFC').trim()).filter((a) => a.length > 0);
    for (const surface of [canonical, ...aliases]) {
      const key = surface.toLowerCase();
      const holder = this.surfaces.get(key);
      if (holder !== undefined) {
        return err({ code: 'DUPLICATE_SURFACE', detail: `« ${surface} » déjà tenu par ${holder} — une surface, UN id (loi anti-Thomas/Henri).` });
      }
    }
    const slug = canonical.toLowerCase().replace(/[^a-z0-9]+/gu, '').slice(0, 12) || 'x';
    const h = String(sha256(`${this.seed}|${spec.kind}|${canonical}`)).slice(0, 8);
    const entityId = `${KIND_PREFIX[spec.kind]}_${slug}_${h}`;
    const rec: EntityRecord = { entityId, kind: spec.kind, canonical, aliases, vital: spec.vital ?? 'ALIVE' };
    this.records.set(entityId, rec);
    for (const surface of [canonical, ...aliases]) this.surfaces.set(surface.toLowerCase(), entityId);
    return ok(rec);
  }

  resolve(surface: string): EntityRecord | null {
    const id = this.surfaces.get(surface.normalize('NFC').trim().toLowerCase());
    return id !== undefined ? (this.records.get(id) ?? null) : null;
  }

  byId(entityId: string): EntityRecord | null { return this.records.get(entityId) ?? null; }
  all(): readonly EntityRecord[] { return [...this.records.values()].sort((a, b) => compareStrings(a.entityId, b.entityId)); }
  byKind(kind: EntityKind): readonly EntityRecord[] { return this.all().filter((r) => r.kind === kind); }

  /** PROJECTION pour l'annotateur — le consommateur ne tient jamais sa propre carte. */
  toAnnotatorEntities(): readonly AnnotatorEntity[] {
    return this.all().map((r) => ({ charId: r.entityId, canonical: r.canonical, aliases: r.aliases, vital: r.vital, kind: r.kind }));
  }
}

/** LOI CASTING TOTAL : toute mention non mintée = IDENTITY_UNDEFINED (système,
 *  jamais silencieux). Réutilise la machinerie de l'annotateur — UNE mécanique. */
export function verifyManuscriptIdentities(
  chapters: readonly { readonly chapter: number; readonly prose: string }[],
  registry: EntityRegistry,
): Result<{ readonly undefinedMentions: readonly IdentityUndefined[]; readonly resolvedRate: number }, { readonly code: 'EMPTY' | 'NO_ENTITIES'; readonly detail: string }> {
  const r = annotateMentions(chapters, registry.toAnnotatorEntities());
  if (!r.ok) return err({ code: r.error.code === 'NO_ENTITIES' ? 'NO_ENTITIES' : 'EMPTY', detail: r.error.detail });
  const undefinedMentions: IdentityUndefined[] = r.value.unresolved.map((u) => ({ code: 'IDENTITY_UNDEFINED', chapter: u.chapter, name: u.name, count: u.count }));
  return ok({ undefinedMentions, resolvedRate: r.value.resolvedRate });
}

/** GATE Studio V2 : interdit d'écrire tant que le casting n'est pas TOTAL. */
export function assertCastingTotal(
  chapters: readonly { readonly chapter: number; readonly prose: string }[],
  registry: EntityRegistry,
): Result<true, { readonly code: 'IDENTITY_UNDEFINED'; readonly entries: readonly IdentityUndefined[] }> {
  const v = verifyManuscriptIdentities(chapters, registry);
  if (!v.ok) return err({ code: 'IDENTITY_UNDEFINED', entries: [] });
  if (v.value.undefinedMentions.length > 0) return err({ code: 'IDENTITY_UNDEFINED', entries: v.value.undefinedMentions });
  return ok(true);
}
