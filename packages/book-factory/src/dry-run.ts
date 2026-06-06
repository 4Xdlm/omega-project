/**
 * OMEGA Book-Factory — dry-run  (P1.D — end-to-end integration, hors-LLM)
 *
 * Drives the whole CALC backbone on a REAL 30-chapter plan, with SYNTHETIC chapter deltas
 * derived from the plan's seed_schedule (no LLM generation): planner → story-state → continuity.
 * Proves: (a) every chapter passes the inter-chapter gate; (b) the cross-chapter payoff fires
 * (a clue planted in ch.2 blooms near the climax); (c) a rumor carried by 3 characters never
 * contaminates the truth over the whole book; (d) the oracle catches an injected contradiction;
 * (e) the run is deterministic (stable final state_hash).
 */

import { type BookPlan } from './book-planner.js';
import { StoryStateLog, type NarrativeEvent, type StoryState } from './story-state.js';
import { checkContinuity, type ChapterDelta, type OracleVerdict } from './continuity-oracle.js';
import { BookCanonAdapter } from './book-canon-adapter.js';

const PROOF = [{ type: 'human' as const, path: 'preuve:aveu', description: 'aveu signé' }];

export interface DryRunResult {
  readonly chapters: number;
  readonly verdicts: readonly OracleVerdict[];
  readonly allPassed: boolean;
  readonly finalState: StoryState;
  readonly firstSeedId: string | undefined;
  readonly firstSeedBloomed: boolean;
  readonly centralSeedBloomed: boolean;
  readonly truthCoupable: string | undefined;
  readonly rumorCarriers: number;
  readonly injectedFaultVerdict: OracleVerdict;
}

export function runDryRun(plan: BookPlan): DryRunResult {
  const log = new StoryStateLog();
  const adapter = new BookCanonAdapter();
  const prota = plan.chapters[0]?.pov_character ?? 'lena';
  const firstEdge = plan.seed_schedule[0];
  const central = plan.seed_schedule[plan.seed_schedule.length - 1];

  // Objective reality + a rumor carried by three villagers (must never contaminate the truth).
  adapter.recordTruth('affaire', 'coupable', 'garcia');
  adapter.recordBelief('temoin1', 'affaire', 'coupable', 'le_maire');
  adapter.recordBelief('temoin2', 'affaire', 'coupable', 'le_maire', 'temoin1');
  adapter.recordBelief('temoin3', 'affaire', 'coupable', 'le_maire', 'temoin2');

  const verdicts: OracleVerdict[] = [];
  for (const spec of plan.chapters) {
    const c = spec.index;
    const events: NarrativeEvent[] = [];
    if (c === 1) events.push({ kind: 'CHARACTER_INTRODUCE', chapter: 1, id: prota, name: prota });
    events.push({ kind: 'CHARACTER_MOVE', chapter: c, id: prota, location: `lieu_${c}` });
    for (const e of plan.seed_schedule) {
      if (e.planted_chapter === c) events.push({ kind: 'SEED_PLANT', chapter: c, seed_id: e.seed_id, desc: e.desc, bloom_target_chapter: e.bloom_target_chapter });
      if (e.reinforced_chapter === c) events.push({ kind: 'SEED_REINFORCE', chapter: c, seed_id: e.seed_id });
      if (e.bloom_target_chapter === c) events.push({ kind: 'SEED_BLOOM', chapter: c, seed_id: e.seed_id });
    }
    // The protagonist gains JUSTIFIED knowledge (with proof) when the central seed is reinforced.
    if (central !== undefined && c === central.reinforced_chapter) {
      adapter.recordRevelation(prota, 'affaire', 'coupable', 'garcia', PROOF);
    }
    const reveals = (central !== undefined && c === central.bloom_target_chapter)
      ? [{ character: prota, subject: 'affaire', predicate: 'coupable' }]
      : undefined;

    const current = log.project();
    const delta: ChapterDelta = reveals !== undefined ? { chapter: c, events, reveals } : { chapter: c, events };
    const v = checkContinuity(current, delta, spec, adapter);
    verdicts.push(v);
    if (v.verdict === 'PASS') log.appendAll(events);
  }

  const finalState = log.project();
  const firstBloomed = firstEdge !== undefined && finalState.payoff_graph.find((p) => p.seed_id === firstEdge.seed_id)?.status === 'bloomed';
  const centralBloomed = central !== undefined && finalState.payoff_graph.find((p) => p.seed_id === central.seed_id)?.status === 'bloomed';

  // Inject a contradiction onto the assembled book: a non-advancing chapter → must be caught.
  const injected = checkContinuity(finalState, { chapter: finalState.chapters_done, events: [{ kind: 'TIMELINE', chapter: finalState.chapters_done, event: 'paradoxe' }] });

  return {
    chapters: plan.chapters.length,
    verdicts,
    allPassed: verdicts.every((v) => v.verdict === 'PASS'),
    finalState,
    firstSeedId: firstEdge?.seed_id,
    firstSeedBloomed: firstBloomed,
    centralSeedBloomed: centralBloomed,
    truthCoupable: adapter.truthState().get('affaire.coupable'),
    rumorCarriers: adapter.rumorCarriers('affaire', 'coupable', 'le_maire'),
    injectedFaultVerdict: injected,
  };
}
