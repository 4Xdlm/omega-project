/**
 * OMEGA Book-Factory — story-state  (P1.A — the mutable "Bible" as a PROJECTION)
 *
 * Event-sourcing: the canonical truth is the append-only narrative event log.
 * StoryState is a PURE FOLD of that log — never a primary store. Crash → replay → identical state.
 * Deterministic: same events → same `state_hash` (reuses canon-kernel canonicalize+sha256).
 *
 * Separation of concerns:
 *   - WHO-KNOWS-WHAT (epistemic) lives in BookCanonAdapter (P0.6b, proven SOUND).
 *   - WORLD/PLOT STRUCTURE (this module): characters' status/location/arc, places, threads,
 *     timeline, and the cross-chapter payoff_graph (seed→bloom) that resolves "clue in ch.2 → ch.25".
 *   The orchestrator composes both; `characterKnows()` bridges to the epistemic adapter.
 *
 * ZERO mutation of consumed packages. Additive.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { BookCanonAdapter } from './book-canon-adapter.js';

export type CharStatus = 'alive' | 'dead' | 'unknown';
export type PayoffStatus = 'planted' | 'reinforced' | 'bloomed' | 'OVERDUE';

export interface Relationship { readonly to: string; readonly type: string; readonly valence: number; }
export interface Character {
  readonly id: string; readonly name: string; readonly status: CharStatus;
  readonly location?: string; readonly arc_position?: string;
  readonly relationships: readonly Relationship[]; readonly last_seen_chapter: number;
}
export interface Place { readonly id: string; readonly name: string; readonly state: string; readonly last_changed_chapter: number; }
export interface Thread {
  readonly id: string; readonly question: string; readonly opened_chapter: number;
  readonly status: 'open' | 'resolved'; readonly resolved_chapter?: number;
}
export interface PayoffEdge {
  readonly seed_id: string; readonly desc: string;
  readonly planted_chapter: number; readonly bloom_target_chapter: number; readonly status: PayoffStatus;
}
export interface TimelineEntry { readonly chapter: number; readonly order: number; readonly event: string; }
export interface Violation { readonly chapter: number; readonly kind: string; readonly detail: string; }

export interface StoryState {
  readonly chapters_done: number;
  readonly characters: readonly Character[];
  readonly places: readonly Place[];
  readonly threads: readonly Thread[];
  readonly payoff_graph: readonly PayoffEdge[];
  readonly timeline: readonly TimelineEntry[];
  readonly violations: readonly Violation[];
  readonly state_hash: string;
}

export type NarrativeEvent =
  | { readonly kind: 'CHARACTER_INTRODUCE'; readonly chapter: number; readonly id: string; readonly name: string }
  | { readonly kind: 'CHARACTER_MOVE'; readonly chapter: number; readonly id: string; readonly location: string }
  | { readonly kind: 'CHARACTER_STATUS'; readonly chapter: number; readonly id: string; readonly status: CharStatus }
  | { readonly kind: 'CHARACTER_ARC'; readonly chapter: number; readonly id: string; readonly arc_position: string }
  | { readonly kind: 'RELATIONSHIP'; readonly chapter: number; readonly from: string; readonly to: string; readonly type: string; readonly valence: number }
  | { readonly kind: 'PLACE_STATE'; readonly chapter: number; readonly id: string; readonly name: string; readonly state: string }
  | { readonly kind: 'THREAD_OPEN'; readonly chapter: number; readonly id: string; readonly question: string }
  | { readonly kind: 'THREAD_CLOSE'; readonly chapter: number; readonly id: string }
  | { readonly kind: 'SEED_PLANT'; readonly chapter: number; readonly seed_id: string; readonly desc: string; readonly bloom_target_chapter: number }
  | { readonly kind: 'SEED_REINFORCE'; readonly chapter: number; readonly seed_id: string }
  | { readonly kind: 'SEED_BLOOM'; readonly chapter: number; readonly seed_id: string }
  | { readonly kind: 'TIMELINE'; readonly chapter: number; readonly event: string };

interface MutChar {
  id: string; name: string; status: CharStatus; location?: string; arc_position?: string;
  relationships: Relationship[]; last_seen_chapter: number;
}

/** Pure fold of the narrative event log into the Bible. Deterministic. */
export function projectStoryState(events: readonly NarrativeEvent[]): StoryState {
  const chars = new Map<string, MutChar>();
  const places = new Map<string, Place>();
  const threads = new Map<string, Thread>();
  const payoff = new Map<string, { seed_id: string; desc: string; planted_chapter: number; bloom_target_chapter: number; status: PayoffStatus }>();
  const timeline: TimelineEntry[] = [];
  const violations: Violation[] = [];
  let chaptersDone = 0;
  let order = 0;

  const touch = (id: string, name: string, chapter: number): MutChar => {
    let c = chars.get(id);
    if (c === undefined) {
      c = { id, name, status: 'alive', relationships: [], last_seen_chapter: chapter };
      chars.set(id, c);
    }
    if (chapter > c.last_seen_chapter) c.last_seen_chapter = chapter;
    return c;
  };

  for (const e of events) {
    if (e.chapter > chaptersDone) chaptersDone = e.chapter;
    switch (e.kind) {
      case 'CHARACTER_INTRODUCE': { const c = touch(e.id, e.name, e.chapter); c.name = e.name; break; }
      case 'CHARACTER_MOVE': { touch(e.id, e.id, e.chapter).location = e.location; break; }
      case 'CHARACTER_STATUS': {
        const c = touch(e.id, e.id, e.chapter);
        if (c.status === 'dead' && e.status !== 'dead') {
          violations.push({ chapter: e.chapter, kind: 'REVIVE_AFTER_DEATH', detail: `${e.id} set ${e.status} after death — ignored` });
        } else {
          c.status = e.status;
        }
        break;
      }
      case 'CHARACTER_ARC': { touch(e.id, e.id, e.chapter).arc_position = e.arc_position; break; }
      case 'RELATIONSHIP': {
        const c = touch(e.from, e.from, e.chapter);
        const idx = c.relationships.findIndex((r) => r.to === e.to && r.type === e.type);
        const rel: Relationship = { to: e.to, type: e.type, valence: e.valence };
        if (idx >= 0) c.relationships[idx] = rel; else c.relationships.push(rel);
        break;
      }
      case 'PLACE_STATE': { places.set(e.id, { id: e.id, name: e.name, state: e.state, last_changed_chapter: e.chapter }); break; }
      case 'THREAD_OPEN': {
        if (!threads.has(e.id)) threads.set(e.id, { id: e.id, question: e.question, opened_chapter: e.chapter, status: 'open' });
        break;
      }
      case 'THREAD_CLOSE': {
        const t = threads.get(e.id);
        if (t !== undefined) threads.set(e.id, { ...t, status: 'resolved', resolved_chapter: e.chapter });
        break;
      }
      case 'SEED_PLANT': {
        if (!payoff.has(e.seed_id)) {
          payoff.set(e.seed_id, { seed_id: e.seed_id, desc: e.desc, planted_chapter: e.chapter, bloom_target_chapter: e.bloom_target_chapter, status: 'planted' });
        }
        break;
      }
      case 'SEED_REINFORCE': { const p = payoff.get(e.seed_id); if (p !== undefined && p.status !== 'bloomed') p.status = 'reinforced'; break; }
      case 'SEED_BLOOM': { const p = payoff.get(e.seed_id); if (p !== undefined) p.status = 'bloomed'; break; }
      case 'TIMELINE': { timeline.push({ chapter: e.chapter, order: order++, event: e.event }); break; }
      default: { const _exhaustive: never = e; void _exhaustive; }
    }
  }

  // Derive OVERDUE: a seed whose bloom target is already past and that never bloomed.
  for (const p of payoff.values()) {
    if (p.status !== 'bloomed' && p.bloom_target_chapter < chaptersDone) p.status = 'OVERDUE';
  }

  // Tri par unités de code (doctrine P0-01 C1) : déterminisme CROSS-MACHINE du state_hash.
  // (Sur IDs ASCII l'ordre est identique à l'ancien localeCompare ⇒ zéro changement de hash.)
  const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  const characters: Character[] = [...chars.values()]
    .sort((a, b) => cmp(a.id, b.id))
    .map((c) => ({
      id: c.id, name: c.name, status: c.status,
      ...(c.location !== undefined ? { location: c.location } : {}),
      ...(c.arc_position !== undefined ? { arc_position: c.arc_position } : {}),
      relationships: [...c.relationships].sort((x, y) => cmp(x.to + x.type, y.to + y.type)),
      last_seen_chapter: c.last_seen_chapter,
    }));
  const placesArr = [...places.values()].sort((a, b) => cmp(a.id, b.id));
  const threadsArr = [...threads.values()].sort((a, b) => cmp(a.id, b.id));
  const payoffArr: PayoffEdge[] = [...payoff.values()].sort((a, b) => cmp(a.seed_id, b.seed_id));

  const body = { chapters_done: chaptersDone, characters, places: placesArr, threads: threadsArr, payoff_graph: payoffArr, timeline, violations };
  const state_hash = sha256(canonicalize(body));
  return { ...body, state_hash };
}

/** Ergonomic append-only wrapper around the pure fold. */
export class StoryStateLog {
  private readonly _events: NarrativeEvent[] = [];
  append(event: NarrativeEvent): void { this._events.push(event); }
  appendAll(events: readonly NarrativeEvent[]): void { for (const e of events) this._events.push(e); }
  events(): readonly NarrativeEvent[] { return this._events; }
  project(): StoryState { return projectStoryState(this._events); }
  /** Crash-safe snapshot: the event log + the resulting state hash. Replay = projectStoryState(events). */
  snapshot(): { readonly events: readonly NarrativeEvent[]; readonly state_hash: string } {
    return { events: [...this._events], state_hash: this.project().state_hash };
  }

  /** Bridge to the epistemic layer: does a character KNOW a claim (justified true belief)? */
  characterKnows(adapter: BookCanonAdapter, characterId: string, subject: string, predicate: string): boolean {
    return adapter.knows(characterId, subject, predicate);
  }
}
