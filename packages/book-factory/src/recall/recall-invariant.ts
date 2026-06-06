/**
 * OMEGA Book-Factory — C2 RECALL-INVARIANT (BF-08) — LA loi BF-02 appliquée.
 * « Entité canonique mentionnée ∧ pas de RecallPack actif ⇒ candidat INVALID. »
 *
 * MÉCANISME : double filet — le MÊME gate s'applique au ChapterSpec (pré-prose : tout
 * personnage requis a son pack AVANT génération) et au CANDIDAT (post-prose : toute
 * entité que la prose mentionne, y compris non prévue, est couverte ou le candidat
 * tombe). Les ambiguïtés et inconnues ne sont JAMAIS résolues en silence : signaux
 * typés (INV-RECALL-002), non bloquants V1 mais TOUJOURS rapportés.
 * LIMITES : pronoms hors périmètre (PRONOUN_UNRESOLVED ignoré par le gate — C1 contrat) ;
 * la sévérité des AMBIGUOUS (bloquant si entité critique) = décision C5/C6 (gate Lite).
 */

import type { ResolutionContext } from '../identity/identity-types.js';
import { assertNever } from '../identity/identity-types.js';
import type { CharacterRegistry } from '../identity/character-registry.js';
import { scanMentions } from './mention-scanner.js';
import type { Mention, RecallGateReport, RecallPack, RecallViolation } from './recall-types.js';

export function enforceRecallOrInvalid(
  rawText: string,
  packs: readonly RecallPack[],
  registry: CharacterRegistry,
  knownSurfaces: ReadonlySet<string>,
  ctx: ResolutionContext,
  maxSurfaceWords: number,
): RecallGateReport {
  const covered = new Set(packs.map((p) => String(p.entityId)));
  const mentions = scanMentions(rawText, registry, knownSurfaces, ctx, maxSurfaceWords);
  const violations: RecallViolation[] = [];

  for (const m of mentions) {
    violations.push(...violationsOf(m, covered));
  }

  const invalid = violations.some((v) => v.kind === 'MENTION_WITHOUT_PACK');
  return {
    verdict: invalid ? 'INVALID' : 'PASS',
    violations,
    mentionsScanned: mentions.length,
    packsChecked: packs.length,
  };
}

function violationsOf(m: Mention, covered: ReadonlySet<string>): readonly RecallViolation[] {
  switch (m.kind) {
    case 'KNOWN': {
      const r = m.resolution;
      switch (r.kind) {
        case 'RESOLVED_UNIQUE':
          return covered.has(String(r.id))
            ? []
            : [{ kind: 'MENTION_WITHOUT_PACK', id: r.id, surfaceRaw: m.surfaceRaw, offset: m.offset }];
        case 'AMBIGUOUS':
        case 'EPITHET_NEEDS_CONTEXT':
          // INV-RECALL-002 : signal explicite — l'amont décide (retry doux si critique).
          return [{ kind: 'AMBIGUOUS_MENTION', surfaceRaw: m.surfaceRaw, candidates: r.candidates, offset: m.offset }];
        case 'PRONOUN_UNRESOLVED':
          return []; // contrat C1 : la coréférence n'est pas gatée ici
        case 'UNKNOWN_NEW_ENTITY':
          return [{ kind: 'UNKNOWN_ENTITY_IN_PROSE', surfaceRaw: m.surfaceRaw, offset: m.offset }];
        default:
          return assertNever(r);
      }
    }
    case 'UNKNOWN_CANDIDATE':
      return [{ kind: 'UNKNOWN_ENTITY_IN_PROSE', surfaceRaw: m.surfaceRaw, offset: m.offset }];
    default:
      return assertNever(m);
  }
}
