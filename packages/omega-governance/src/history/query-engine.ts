/**
 * OMEGA Governance — Query Engine
 * Phase D.2 — Filter events by date, run, status
 */

import type { RuntimeEvent, HistoryQuery } from './types.js';
import type { GovConfig } from '../core/config.js';

/** Query events with filters */
export function queryEvents(
  events: readonly RuntimeEvent[],
  query: HistoryQuery,
  config: GovConfig,
): readonly RuntimeEvent[] {
  let filtered = [...events];

  if (query.since) {
    const sinceDate = new Date(query.since).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= sinceDate);
  }

  if (query.until) {
    const untilDate = new Date(query.until).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= untilDate);
  }

  if (query.run_id) {
    filtered = filtered.filter((e) => e.run_id === query.run_id);
  }

  if (query.status) {
    filtered = filtered.filter((e) => e.status === query.status);
  }

  const limit = query.limit ?? config.HISTORY_MAX_RESULTS;
  if (filtered.length > limit) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

/** Count events by status */
export function countByStatus(events: readonly RuntimeEvent[]): Record<string, number> {
  const counts: Record<string, number> = { SUCCESS: 0, FAIL: 0 };
  for (const e of events) {
    counts[e.status] = (counts[e.status] ?? 0) + 1;
  }
  return counts;
}

/** Get unique run IDs from events */
export function getUniqueRunIds(events: readonly RuntimeEvent[]): readonly string[] {
  return [...new Set(events.map((e) => e.run_id))].sort();
}
