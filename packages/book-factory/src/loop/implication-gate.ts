/**
 * OMEGA Book-Factory — C8.2 GATE D'IMPLICATION DE RÔLE (BF-08) — la prise D1 de la revue.
 * Cas réel : Léna (enquêtrice verrouillée) « essuie ses mains sur son tablier » dans
 * « la cuisine de la boulangerie » — ni move ni status ⇒ invisible à G2. Ce gate
 * détecte la dérive PAR IMPLICATION : un faisceau lexical de métier INCOMPATIBLE
 * autour de la mention d'une entité au rôle verrouillé.
 *
 * MODE : **ADVISORY (shadow) d'abord** — décision de revue ; passage en dur = après
 * mesure multi-livres (EMP-16). MÉCANISME : fenêtre locale autour de chaque mention
 * résolue (C2 scanner) ; ≥ MIN_HITS termes d'un MÊME métier étranger ⇒ signal
 * ROLE_IMPLICATION_DRIFT avec faisceau cité. Lexiques = table FERMÉE versionnée
 * (faux positifs bornés : 1 terme isolé ne suffit jamais).
 * LIMITES : couverture = métiers de la table (extensible) ; une scène JUSTIFIÉE
 * (enquêtrice DANS une boulangerie pour enquêter) peut déclencher — c'est VOULU en
 * advisory : le signal dit « vérifie », il ne rejette pas.
 */

import type { ResolutionContext } from '../identity/identity-types.js';
import type { CharacterRegistry } from '../identity/character-registry.js';
import { normalizeText, scanMentions } from '../recall/mention-scanner.js';
import type { DriftRule } from '../recall/recall-types.js';

export const MIN_IMPLICATION_HITS = 2; // EXPERIMENTAL_DEFAULT — 1 terme isolé ne signale jamais

/** Table FERMÉE v1 : métier → faisceau lexical d'implication (FR, normalisé). */
export const ROLE_IMPLICATION_LEXICON: ReadonlyMap<string, readonly string[]> = new Map([
  ['boulanger', ['tablier', 'fournil', 'pétrin', 'levure', 'pâton', 'enfourner', 'boulangerie', 'farine']],
  ['pêcheur', ['filet', 'casier', 'chalut', 'criée', 'appât', 'palangre']],
  ['médecin', ['stéthoscope', 'ordonnance', 'patient', 'consultation', 'blouse blanche']],
  ['notaire', ['étude notariale', 'acte authentique', 'minute', 'clerc']],
]);

/** Compatibilités explicites : rôle verrouillé → métiers NON suspects (évite l'absurde). */
const COMPATIBLE: ReadonlyMap<string, readonly string[]> = new Map([
  ['enquêtrice', []], // une enquêtrice n'EXERCE aucun de ces métiers — tout faisceau = signal
  ['enquêteur', []],
]);

export interface ImplicationSignal {
  readonly kind: 'ROLE_IMPLICATION_DRIFT';
  readonly storyId: string;
  readonly lockedRole: string;
  readonly impliedTrade: string;
  readonly hits: readonly string[]; // le faisceau cité (≥ MIN_IMPLICATION_HITS)
  readonly offset: number;
}

export function scanRoleImplications(
  prose: string,
  registry: CharacterRegistry,
  knownSurfaces: ReadonlySet<string>,
  ctx: ResolutionContext,
  maxSurfaceWords: number,
  locksByStoryId: ReadonlyMap<string, readonly DriftRule[]>,
  storyIdOf: (id: import('../identity/identity-types.js').CharacterId) => string,
): readonly ImplicationSignal[] {
  const norm = String(normalizeText(prose));
  const signals: ImplicationSignal[] = [];
  const mentions = scanMentions(prose, registry, knownSurfaces, ctx, maxSurfaceWords);

  for (const m of mentions) {
    if (m.kind !== 'KNOWN' || m.resolution.kind !== 'RESOLVED_UNIQUE') continue;
    const storyId = storyIdOf(m.resolution.id);
    const roleLock = (locksByStoryId.get(storyId) ?? []).find((r) => r.field === 'role');
    if (roleLock === undefined) continue;
    const compatible = new Set(COMPATIBLE.get(roleLock.expected.normalize('NFC').toLowerCase()) ?? []);
    const window = norm.slice(Math.max(0, m.offset - 80), m.offset + 240); // fenêtre locale

    for (const [trade, lexicon] of ROLE_IMPLICATION_LEXICON) {
      if (compatible.has(trade)) continue;
      const hits = lexicon.filter((t) => window.includes(t.normalize('NFC').toLowerCase()));
      if (hits.length >= MIN_IMPLICATION_HITS) {
        signals.push({
          kind: 'ROLE_IMPLICATION_DRIFT',
          storyId,
          lockedRole: roleLock.expected,
          impliedTrade: trade,
          hits,
          offset: m.offset,
        });
      }
    }
  }
  // déterminisme : ordre par offset puis métier
  return [...signals].sort((a, b) => a.offset - b.offset || (a.impliedTrade < b.impliedTrade ? -1 : 1));
}
