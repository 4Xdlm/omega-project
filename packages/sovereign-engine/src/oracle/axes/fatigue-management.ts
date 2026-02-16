/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — FATIGUE MANAGEMENT AXIS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/fatigue-management.ts
 * Sprint: 14.3
 * Invariant: ART-PHANTOM-03
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures how well the prose manages reader fatigue with breath points.
 * Score based on high_fatigue danger zones from PhantomRunner.
 * Bonus for well-distributed breath points.
 * Poids: 1.0 — Méthode: CALC — Macro-axe: IFI
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, AxisScore } from '../../types.js';
import { runPhantom } from '../../phantom/phantom-runner.js';

/**
 * Score fatigue management.
 *
 * 100 if fatigue never > 0.7 without breath in next 3 sentences
 *  80 if 1 high_fatigue danger zone
 *  60 if 2 danger zones
 *  40 if 3+ danger zones
 *
 * Bonus +10 if breath_points well distributed (low stddev of intervals).
 * Clamp [0, 100].
 */
export function scoreFatigueManagement(
  packet: ForgePacket,
  prose: string,
): AxisScore {
  const trace = runPhantom(prose);
  const highFatigueZones = trace.danger_zones.filter(z => z.type === 'high_fatigue');
  const zoneCount = highFatigueZones.length;

  let score: number;
  if (zoneCount === 0) {
    score = 100;
  } else if (zoneCount === 1) {
    score = 80;
  } else if (zoneCount === 2) {
    score = 60;
  } else {
    score = Math.max(0, 40 - (zoneCount - 3) * 10);
  }

  // Bonus for well-distributed breath points
  const breathBonus = computeBreathDistributionBonus(trace.breath_points, trace.states.length);
  score += breathBonus;

  score = Math.max(0, Math.min(100, score));

  const details = zoneCount === 0
    ? `Fatigue managed — no high_fatigue zones, breath_bonus=${breathBonus}`
    : `${zoneCount} high_fatigue zone(s), fatigue_max=${trace.fatigue_max.toFixed(3)} at sentence ${trace.fatigue_max_index}, breath_bonus=${breathBonus}`;

  return {
    name: 'fatigue_management',
    score,
    weight: 1.0,
    method: 'CALC',
    details,
  };
}

/**
 * Compute breath distribution bonus.
 * Well-distributed breath points (low coefficient of variation of intervals) → +10.
 * No breath points or too few → 0.
 */
function computeBreathDistributionBonus(
  breathPoints: readonly number[],
  totalSentences: number,
): number {
  if (breathPoints.length < 2 || totalSentences < 5) {
    return 0;
  }

  // Compute intervals between breath points
  const intervals: number[] = [];
  for (let i = 1; i < breathPoints.length; i++) {
    intervals.push(breathPoints[i] - breathPoints[i - 1]);
  }

  // Coefficient of variation (stddev / mean)
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean === 0) return 0;

  const variance = intervals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / intervals.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / mean;

  // Low CV (< 0.5) = well distributed → bonus +10
  // High CV (> 1.0) = poorly distributed → no bonus
  if (cv < 0.5) {
    return 10;
  } else if (cv < 0.75) {
    return 5;
  }
  return 0;
}
