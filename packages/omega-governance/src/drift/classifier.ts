/**
 * OMEGA Governance — Drift Classifier
 * Phase D.2 — Classify drift details into overall level
 *
 * INV-GOV-04: Every classification uses explicit rules.
 */

import type { DriftDetail, DriftLevel, DriftType } from './types.js';
import { maxDriftLevel } from './rules.js';

/** Classify overall drift from a list of details */
export function classifyOverallDrift(details: readonly DriftDetail[]): {
  level: DriftLevel;
  types: readonly DriftType[];
  verdict: string;
} {
  if (details.length === 0) {
    return {
      level: 'NO_DRIFT',
      types: [],
      verdict: 'No drift detected — runs are identical',
    };
  }

  const levels = details.map((d) => classifyDetailLevel(d));
  const level = maxDriftLevel(levels);
  const types = [...new Set(details.map((d) => d.type))].sort() as DriftType[];

  const verdict = buildVerdict(level, types, details.length);

  return { level, types, verdict };
}

/** Classify a single drift detail into its level (for aggregation) */
function classifyDetailLevel(detail: DriftDetail): DriftLevel {
  if (detail.rule.includes('CRITICAL')) return 'CRITICAL_DRIFT';
  if (detail.rule.includes('HARD') || detail.rule.includes('functional drift') || detail.rule.includes('structural drift')) return 'HARD_DRIFT';
  if (detail.rule.includes('SOFT')) return 'SOFT_DRIFT';
  if (detail.rule.includes('stage count mismatch')) return 'CRITICAL_DRIFT';
  if (detail.rule.includes('differ')) return 'HARD_DRIFT';
  return 'NO_DRIFT';
}

/** Build human-readable verdict */
function buildVerdict(level: DriftLevel, types: readonly DriftType[], detailCount: number): string {
  switch (level) {
    case 'NO_DRIFT':
      return 'No drift detected — runs are identical';
    case 'SOFT_DRIFT':
      return `Soft drift detected: ${detailCount} difference(s) in [${types.join(', ')}] — within acceptable range`;
    case 'HARD_DRIFT':
      return `Hard drift detected: ${detailCount} difference(s) in [${types.join(', ')}] — requires attention`;
    case 'CRITICAL_DRIFT':
      return `CRITICAL drift detected: ${detailCount} difference(s) in [${types.join(', ')}] — action required`;
  }
}
