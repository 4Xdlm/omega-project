/**
 * OMEGA Book-Factory — C2 RECALL-PACK BUILDER + DÉLESTAGE À SEUIL (BF-08)
 * Construit le rappel BORNÉ d'une entité depuis les librarians, applique le délestage
 * (digest/prune) si le budget déborde — les FAITS CRITIQUES ne sont JAMAIS élagués
 * (INV-RECALL-004) : verrous anti-dérive, dettes qui éclosent CE chapitre, statut.
 *
 * MÉCANISME : coût = estimation CALC déterministe (mots ≈ tokens×0.75 → tokens = mots/0.75) ;
 * délestage ORDONNÉ (recentEvents → relationships → threads → knows) jusqu'à tenir le
 * budget ; si le NOYAU CRITIQUE seul dépasse → BUDGET_UNSATISFIABLE_CRITICAL (échec
 * typé, jamais de pack mutilé en silence). packId déterministe (hash du contenu).
 * LIMITES : estimation de tokens grossière (plafond physique, pas comptage exact —
 * recalibrable EMP-19) ; sources V1 = StoryState+Registry+épistémique optionnel
 * (l'ACL C3 s'ajoutera comme librarian supplémentaire sans changer ce contrat).
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';

import type { CharacterId, ChapterRef, Sha256Hex } from '../identity/identity-types.js';
import { err, ok } from '../identity/identity-types.js';
import type {
  DebtSummary,
  DormantTrigger,
  Librarians,
  RecallPack,
  RecallPackId,
  RecallResult,
  TokenCount,
} from './recall-types.js';

/* ─────────────────────────── estimation de coût (CALC) ───────────────────────────── */
const WORDS_PER_TOKEN = 0.75;

export function estimateTokens(words: number): TokenCount {
  return Math.ceil(words / WORDS_PER_TOKEN) as TokenCount;
}

function wordsOf(s: string): number {
  const t = s.trim();
  return t.length === 0 ? 0 : t.split(/\s+/u).length;
}

function packWords(p: Omit<RecallPack, 'packId' | 'tokenCost' | 'sourceHashes'>): number {
  let w = wordsOf(p.displayName) + 6; // entête fixe
  if (p.facts !== null) w += 8 + wordsOf(p.facts.location ?? '') + wordsOf(p.facts.arcPosition ?? '');
  for (const k of p.knows) w += wordsOf(k) + 1;
  for (const r of p.relationships) w += wordsOf(r.to) + wordsOf(r.type) + 2;
  for (const t of p.openThreads) w += wordsOf(t.question) + 2;
  for (const d of p.debts) w += wordsOf(d.desc) + 4;
  for (const e of p.recentEvents) w += wordsOf(e.text) + 2;
  for (const f of p.forbiddenDrifts) w += wordsOf(f.expected) + 3;
  return w;
}

/* ─────────────────────────────── délestage ordonné ───────────────────────────────── */
const PRUNE_KEEP = { recentEvents: 3, relationships: 4, openThreads: 3, knows: 5 } as const;

type Draft = Omit<RecallPack, 'packId' | 'tokenCost' | 'sourceHashes'> & {
  readonly degraded: readonly DormantTrigger[];
};

function prune(draft: Draft): Draft {
  return {
    ...draft,
    recentEvents: draft.recentEvents.slice(-PRUNE_KEEP.recentEvents),
    relationships: draft.relationships.slice(0, PRUNE_KEEP.relationships),
    openThreads: draft.openThreads.slice(0, PRUNE_KEEP.openThreads),
    knows: draft.knows.slice(0, PRUNE_KEEP.knows),
    // INV-RECALL-004 : facts, forbiddenDrifts et debts bloomsNow INTOUCHÉS.
    debts: draft.debts, // (les dettes non-bloomsNow sont élaguées à l'étape suivante seulement)
    degraded: [...draft.degraded, 'context_budget_exceeded'],
  };
}

function pruneNonCriticalDebts(draft: Draft): Draft {
  return {
    ...draft,
    debts: draft.debts.filter((d) => d.bloomsNow), // critiques conservées EXACTEMENT
    degraded: [...draft.degraded, 'too_many_facts'],
  };
}

/* ─────────────────────────────────── builder ─────────────────────────────────────── */
export function buildRecallPack(
  id: CharacterId,
  chapter: ChapterRef,
  lib: Librarians,
  budget: TokenCount,
): RecallResult<RecallPack> {
  const rec = lib.registry.character(id);
  const storyId = lib.storyIdOf(id);
  const sc = storyId === undefined ? undefined : lib.story.characters.find((c) => c.id === storyId);
  if (rec === undefined) return err({ code: 'UNKNOWN_ENTITY', id });

  const debts: DebtSummary[] = lib.story.payoff_graph
    .filter((p) => p.status !== 'bloomed')
    .map((p) => ({
      seedId: p.seed_id,
      desc: p.desc,
      plantedChapter: p.planted_chapter,
      bloomTargetChapter: p.bloom_target_chapter,
      status: p.status,
      bloomsNow: p.bloom_target_chapter === Number(chapter),
    }));

  let draft: Draft = {
    entityId: id,
    displayName: rec.currentDisplayName,
    chapter,
    facts: sc === undefined
      ? null
      : { status: sc.status, location: sc.location, arcPosition: sc.arc_position, lastSeenChapter: sc.last_seen_chapter },
    knows: lib.knownSubjectsOf?.(id) ?? [],
    relationships: (sc?.relationships ?? []).map((r) => ({ to: r.to, type: r.type, valence: r.valence })),
    openThreads: lib.story.threads
      .filter((t) => t.status === 'open')
      .map((t) => ({ id: t.id, question: t.question, openedChapter: t.opened_chapter })),
    debts,
    recentEvents: lib.story.timeline
      .filter((e) => e.chapter >= Number(chapter) - 2)
      .slice(-5)
      .map((e) => ({ chapter: e.chapter, text: e.event })),
    forbiddenDrifts: lib.driftRulesOf?.(id) ?? [],
    degraded: [],
  };

  // Délestage à seuil : on tente entier → prune listes → prune dettes non-critiques.
  if (estimateTokens(packWords(draft)) > budget) draft = prune(draft);
  if (estimateTokens(packWords(draft)) > budget) draft = pruneNonCriticalDebts(draft);

  const cost = estimateTokens(packWords(draft));
  if (cost > budget) {
    // Le noyau critique seul ne tient pas : échec TYPÉ (jamais de pack mutilé en silence).
    return err({ code: 'BUDGET_UNSATISFIABLE_CRITICAL', id, needed: cost, budget });
  }

  const sourceHashes: readonly Sha256Hex[] = [
    lib.story.state_hash as Sha256Hex,
    lib.registry.stateHash(),
  ];
  const packId = `rpack_${sha256(canonicalize({ v: 1, body: draft }))}` as RecallPackId;
  return ok({ ...draft, packId, tokenCost: cost, sourceHashes });
}
