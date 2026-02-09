/**
 * OMEGA Governance — Drift Rules
 * Phase D.2 — Explicit rules for drift classification
 *
 * INV-GOV-04: Every drift is classified with an explicit rule cited.
 */

import type { GovConfig } from '../core/config.js';
import type { DriftLevel } from './types.js';

/**
 * Classify a numeric delta into a drift level using config thresholds.
 * Rule: delta is compared against DRIFT_SOFT, DRIFT_HARD, DRIFT_CRITICAL thresholds.
 */
export function classifyNumericDrift(delta: number, config: GovConfig): { level: DriftLevel; rule: string } {
  const absDelta = Math.abs(delta);

  if (absDelta >= config.DRIFT_CRITICAL_THRESHOLD) {
    return {
      level: 'CRITICAL_DRIFT',
      rule: `|delta|=${absDelta.toFixed(4)} >= DRIFT_CRITICAL_THRESHOLD=${config.DRIFT_CRITICAL_THRESHOLD}`,
    };
  }
  if (absDelta >= config.DRIFT_HARD_THRESHOLD) {
    return {
      level: 'HARD_DRIFT',
      rule: `|delta|=${absDelta.toFixed(4)} >= DRIFT_HARD_THRESHOLD=${config.DRIFT_HARD_THRESHOLD}`,
    };
  }
  if (absDelta >= config.DRIFT_SOFT_THRESHOLD) {
    return {
      level: 'SOFT_DRIFT',
      rule: `|delta|=${absDelta.toFixed(4)} >= DRIFT_SOFT_THRESHOLD=${config.DRIFT_SOFT_THRESHOLD}`,
    };
  }
  return {
    level: 'NO_DRIFT',
    rule: `|delta|=${absDelta.toFixed(4)} < DRIFT_SOFT_THRESHOLD=${config.DRIFT_SOFT_THRESHOLD}`,
  };
}

/**
 * Classify hash comparison: identical = NO_DRIFT, different = HARD_DRIFT (functional).
 */
export function classifyHashDrift(baselineHash: string, candidateHash: string): { level: DriftLevel; rule: string } {
  if (baselineHash === candidateHash) {
    return { level: 'NO_DRIFT', rule: 'hashes identical' };
  }
  return { level: 'HARD_DRIFT', rule: 'hashes differ (functional drift)' };
}

/**
 * Classify structural drift based on manifest fields.
 */
export function classifyStructuralDrift(
  baselineMerkle: string,
  candidateMerkle: string,
  baselineStageCount: number,
  candidateStageCount: number,
): { level: DriftLevel; rule: string } {
  if (baselineStageCount !== candidateStageCount) {
    return {
      level: 'CRITICAL_DRIFT',
      rule: `stage count mismatch: baseline=${baselineStageCount}, candidate=${candidateStageCount}`,
    };
  }
  if (baselineMerkle !== candidateMerkle) {
    return {
      level: 'HARD_DRIFT',
      rule: 'merkle root differs (structural drift)',
    };
  }
  return { level: 'NO_DRIFT', rule: 'structure identical' };
}

/** Get the highest drift level from a list */
export function maxDriftLevel(levels: readonly DriftLevel[]): DriftLevel {
  const order: DriftLevel[] = ['NO_DRIFT', 'SOFT_DRIFT', 'HARD_DRIFT', 'CRITICAL_DRIFT'];
  let maxIdx = 0;
  for (const level of levels) {
    const idx = order.indexOf(level);
    if (idx > maxIdx) maxIdx = idx;
  }
  return order[maxIdx];
}
