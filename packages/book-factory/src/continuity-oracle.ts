/**
 * OMEGA Book-Factory — continuity-oracle  (P1.C — the inter-chapter gate)
 *
 * Given the CURRENT StoryState (projection before this chapter) + the proposed chapter delta
 * (+ optional ChapterSpec and the epistemic adapter), it returns PASS or RETRY(reasons).
 * CALC-first, deterministic. It is the inter-chapter analogue of the intra-chapter truth-gate.
 *
 * Checks:
 *   CHRONO        — events belong to this chapter and the chapter advances time.
 *   DEAD_ACTS     — a dead character cannot act (move / relate / change arc); cannot be revived.
 *   LEAK          — a character cannot reveal/act on a claim they do not KNOW (info asymmetry).
 *   REQUIREMENT   — a bloom chapter requires its seed to have been planted earlier.
 *   OVERDUE       — a planted seed whose bloom target has passed without blooming.
 *
 * Additive, zero mutation. Composes story-state (structure) + book-canon-adapter (epistemics).
 */

import type { NarrativeEvent, StoryState } from './story-state.js';
import type { ChapterSpec } from './book-planner.js';
import type { BookCanonAdapter } from './book-canon-adapter.js';

export interface ClaimRef { readonly character: string; readonly subject: string; readonly predicate: string; }

export interface ChapterDelta {
  readonly chapter: number;
  readonly events: readonly NarrativeEvent[];
  /** Claims a character reveals or acts upon this chapter (must be justified knowledge). */
  readonly reveals?: readonly ClaimRef[];
}

export interface OracleVerdict { readonly verdict: 'PASS' | 'RETRY'; readonly reasons: readonly string[]; }

function statusOf(state: StoryState, id: string): string | undefined {
  return state.characters.find((c) => c.id === id)?.status;
}

export function checkContinuity(
  current: StoryState,
  delta: ChapterDelta,
  spec?: ChapterSpec,
  adapter?: BookCanonAdapter,
): OracleVerdict {
  const reasons: string[] = [];

  // CHRONO — the chapter must advance, and events must belong to it.
  if (delta.chapter <= current.chapters_done) {
    reasons.push(`CHRONO: chapter ${delta.chapter} does not advance past ${current.chapters_done}`);
  }
  for (const e of delta.events) {
    if (e.chapter !== delta.chapter) reasons.push(`CHRONO: event in chapter ${e.chapter} attached to chapter ${delta.chapter}`);
  }

  // DEAD_ACTS — a dead character cannot act, and cannot be silently revived.
  for (const e of delta.events) {
    if (e.kind === 'CHARACTER_MOVE' || e.kind === 'CHARACTER_ARC') {
      if (statusOf(current, e.id) === 'dead') reasons.push(`DEAD_ACTS: ${e.id} acts while dead`);
    } else if (e.kind === 'RELATIONSHIP') {
      if (statusOf(current, e.from) === 'dead') reasons.push(`DEAD_ACTS: ${e.from} acts while dead`);
    } else if (e.kind === 'CHARACTER_STATUS') {
      if (statusOf(current, e.id) === 'dead' && e.status !== 'dead') reasons.push(`REVIVE: ${e.id} revived from death`);
    }
  }

  // LEAK — a character can only reveal/act on a claim they actually KNOW (justified true belief).
  if (delta.reveals !== undefined && adapter !== undefined) {
    for (const r of delta.reveals) {
      if (!adapter.knows(r.character, r.subject, r.predicate)) {
        reasons.push(`LEAK: ${r.character} reveals ${r.subject}.${r.predicate} without knowing it`);
      }
    }
  }

  // REQUIREMENT — a bloom chapter requires the seed to have been planted before now.
  const bloomingNow = new Set<string>();
  for (const e of delta.events) if (e.kind === 'SEED_BLOOM') bloomingNow.add(e.seed_id);
  if (spec !== undefined) {
    for (const s of spec.seeds_to_bloom) {
      const edge = current.payoff_graph.find((p) => p.seed_id === s);
      if (edge === undefined || edge.planted_chapter >= delta.chapter) {
        reasons.push(`REQUIREMENT: seed "${s}" blooms in ch${delta.chapter} but was not planted earlier`);
      }
    }
  }

  // OVERDUE — a planted seed whose bloom target already passed without blooming.
  for (const edge of current.payoff_graph) {
    const bloomed = edge.status === 'bloomed' || bloomingNow.has(edge.seed_id);
    if (!bloomed && edge.bloom_target_chapter < delta.chapter) {
      reasons.push(`OVERDUE: seed "${edge.seed_id}" should have bloomed by ch${edge.bloom_target_chapter}`);
    }
  }

  return reasons.length === 0 ? { verdict: 'PASS', reasons: [] } : { verdict: 'RETRY', reasons };
}
