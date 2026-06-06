/**
 * C1 — Fixtures de test partagées (déterministes, zéro aléa non seedé).
 * Brands construits ICI une seule fois — les suites restent lisibles et typées.
 */
import type {
  AliasRecord,
  AliasSurface,
  CharacterId,
  ChapterRef,
  Confidence01,
  EvidenceId,
  IdentityDeterminism,
  IdentityEvent,
  MintNonce,
  Seed,
} from '../../src/identity/identity-types.js';
import { asAliasSurface, asChapterRef, asConfidence01 } from '../../src/identity/identity-types.js';
import {
  buildMintEvents,
  CharacterRegistry,
  deriveAliasId,
} from '../../src/identity/character-registry.js';

export const DET: IdentityDeterminism = { mintSeed: 'C1-TEST-SEED' as Seed };

export const ch = (n: number): ChapterRef => asChapterRef(n);
export const nonce = (s: string): MintNonce => s as MintNonce;
export const ev = (s: string): EvidenceId => s as EvidenceId;

export function surf(raw: string): AliasSurface {
  const r = asAliasSurface(raw);
  if (!r.ok) throw new Error(`fixture surf("${raw}") invalide`);
  return r.value;
}

export function conf(n: number): Confidence01 {
  const r = asConfidence01(n);
  if (!r.ok) throw new Error(`fixture conf(${n}) invalide`);
  return r.value;
}

/** Naissance complète (MINT + alias name) appliquée — échec de fixture = throw (jamais silencieux). */
export function mintInto(
  reg: CharacterRegistry,
  n: string,
  displayName: string,
  at: number,
): { readonly reg: CharacterRegistry; readonly id: CharacterId } {
  const events = buildMintEvents(
    DET,
    { nonce: nonce(n), displayName, introducedAt: ch(at), createdBy: 'planner', evidence: ev(`E-${n}`) },
    surf(displayName),
    conf(1),
    0,
  );
  let cur = reg;
  for (const e of events) {
    const r = cur.apply(e);
    if (!r.ok) throw new Error(`fixture mintInto(${n}) a échoué: ${r.error.code}`);
    cur = r.value;
  }
  const id = events[0].kind === 'MINT' ? mintedIdOf(events[1]) : (undefined as never);
  return { reg: cur, id };
}

function mintedIdOf(aliasEvent: IdentityEvent): CharacterId {
  if (aliasEvent.kind !== 'ALIAS') throw new Error('fixture: événement alias attendu');
  return aliasEvent.alias.characterId;
}

/** Alias additionnel appliqué (kind paramétrable) — throw si refus (fixture stricte). */
export function aliasInto(
  reg: CharacterRegistry,
  id: CharacterId,
  surface: string,
  kind: AliasRecord['kind'],
  opts: { from?: number; to?: number; evidence?: string; pos?: number } = {},
): CharacterRegistry {
  const s = surf(surface);
  const alias: AliasRecord = {
    aliasId: deriveAliasId(s, id, opts.pos ?? 100 + surface.length),
    characterId: id,
    surface: s,
    kind,
    validFrom: opts.from === undefined ? undefined : ch(opts.from),
    validTo: opts.to === undefined ? undefined : ch(opts.to),
    confidence: conf(0.95),
    evidenceRefs: [ev(opts.evidence ?? `E-alias-${surface}`)],
  };
  const r = reg.apply({ kind: 'ALIAS', alias });
  if (!r.ok) throw new Error(`fixture aliasInto(${surface}) a échoué: ${r.error.code}`);
  return r.value;
}
