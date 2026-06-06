/**
 * OMEGA Book-Factory — C1 ALIAS-RESOLVER (BF-08)
 * Fonction PURE de résolution d'une surface vers une identité — le cœur anti-hallucination
 * du futur Recall Bus (C2). ADR §8/§9 : « le resolver ne doit pas halluciner ».
 *
 * MÉCANISME : surface brute → normalisation canonique → pronom ? (liste fermée, C1 ne fait
 * pas de coréférence) → candidats = alias VALIDES au chapitre, dédupliqués par personnage →
 * 0 : UNKNOWN_NEW_ENTITY · 1 : RESOLVED_UNIQUE · >1 : désambiguïsation par contexte
 * EXPLICITE (inScene) sinon AMBIGUOUS / EPITHET_NEEDS_CONTEXT. Sorties TRIÉES par
 * compareStrings (déterminisme CROSS-MACHINE, P0-01 : jamais localeCompare).
 * JAMAIS de choix au score, JAMAIS de hasard (INV-CHAR-003/004).
 * LIMITES : la qualité dépend du registre d'alias vivant — une surface inédite est
 * UNKNOWN_NEW_ENTITY par contrat (escalade en aval, jamais silence).
 */

import type {
  AliasId,
  AliasRecord,
  AliasSurface,
  CharacterId,
  Resolution,
  ResolutionContext,
} from './identity-types.js';
import { asAliasSurface, compareStrings } from './identity-types.js';
import { isAliasValidAt } from './character-registry.js';

export interface ResolverIndex {
  readonly bySurface: ReadonlyMap<AliasSurface, readonly AliasId[]>;
  readonly aliases: ReadonlyMap<AliasId, AliasRecord>;
  readonly pronouns: ReadonlySet<string>;
}

export function resolveSurface(
  rawSurface: string,
  ctx: ResolutionContext,
  index: ResolverIndex,
): Resolution {
  const normalized = asAliasSurface(rawSurface);
  if (!normalized.ok) {
    // Surface vide : entité inconnue par définition (le scanner C2 ne devrait jamais émettre ça).
    return { kind: 'UNKNOWN_NEW_ENTITY', surface: '' as AliasSurface };
  }
  const surface = normalized.value;

  // Pronoms : liste FERMÉE → toujours non résolus en C1 (contrat : coréférence = C2+).
  if (index.pronouns.has(String(surface))) {
    return { kind: 'PRONOUN_UNRESOLVED', surface };
  }

  // Candidats : alias de cette surface, VALIDES au chapitre demandé.
  const validAliases = (index.bySurface.get(surface) ?? [])
    .map((aid) => index.aliases.get(aid))
    .filter((a): a is AliasRecord => a !== undefined && isAliasValidAt(a, ctx.chapter));

  // Déduplication par personnage : on retient le PREMIER alias rencontré dans l'ORDRE DU
  // JOURNAL (bySurface est append-only ⇒ ordre déterministe au replay — revue P2-03).
  // Sémantique assumée : « via » = le plus ancien alias valide, pas le plus confiant.
  const byCharacter = new Map<CharacterId, AliasRecord>();
  for (const a of validAliases) {
    if (!byCharacter.has(a.characterId)) byCharacter.set(a.characterId, a);
  }
  const candidates = [...byCharacter.keys()].sort((x, y) => compareStrings(String(x), String(y)));

  if (candidates.length === 0) return { kind: 'UNKNOWN_NEW_ENTITY', surface };

  if (candidates.length === 1) {
    const id = candidates[0] as CharacterId;
    const via = byCharacter.get(id) as AliasRecord; // INV-CHAR-009 : la preuve
    return { kind: 'RESOLVED_UNIQUE', id, via: via.aliasId, contextUsed: false };
  }

  // >1 porteur : SEULE la scène explicite peut départager (INV-CHAR-004). Jamais de score.
  if (ctx.inScene !== undefined) {
    const inScene = new Set(ctx.inScene);
    const filtered = candidates.filter((id) => inScene.has(id));
    if (filtered.length === 1) {
      const id = filtered[0] as CharacterId;
      const via = byCharacter.get(id) as AliasRecord;
      return { kind: 'RESOLVED_UNIQUE', id, via: via.aliasId, contextUsed: true };
    }
  }

  // Épithètes pures → demande de contexte dédiée (signal plus riche pour l'amont).
  const allEpithets = candidates.every((id) => byCharacter.get(id)?.kind === 'epithet');
  if (allEpithets) return { kind: 'EPITHET_NEEDS_CONTEXT', candidates };

  return { kind: 'AMBIGUOUS', candidates };
}
