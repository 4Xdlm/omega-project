/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 4: NECESSITY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/necessity.ts
 * Version: 2.0.0 (P5A — Multi-shot stabilization)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×1.0
 * Measures economy: every sentence justified, no filler.
 * LLM-judged — requires SovereignProvider.
 *
 * P5A: Multi-shot scoring (3 appels, médiane) pour éliminer la variance
 * stochastique du juge LLM. Empiriquement prouvé : necessity fluctue de
 * 4 à 75 sur la même prose entre deux appels (bench P4, scène menace).
 * La médiane absorbe les outliers mieux que la moyenne.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../../types.js';
import type { ForgePacket, AxisScore } from '../../types.js';
import { SOVEREIGN_CONFIG } from '../../config.js';

// P5A→P6: Number of LLM shots for necessity scoring (médiane)
// P5A used 3 shots. With extractLabeledScore fix, the "4" false matches are gone,
// but we still see spread ~20-30 on correct extractions. 5 shots gives a more
// stable median while only adding 2 parallel API calls (marginal latency impact).
const NECESSITY_SHOTS = 5;

/** P5B: Telemetry data for necessity multi-shot */
export interface NecessityTelemetry {
  readonly shots: readonly number[];
  readonly median: number;
  readonly mean: number;
  readonly stdev: number;
  readonly spread: number; // max - min
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdev(values: number[], mean: number): number {
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// P5B: Module-level telemetry for last scoring run
let _lastTelemetry: NecessityTelemetry | null = null;
export function getLastNecessityTelemetry(): NecessityTelemetry | null {
  return _lastTelemetry;
}

export async function scoreNecessity(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<AxisScore> {
  const beatCount = packet.beats.length;
  const beatActions = packet.beats.map((b) => b.action).join('; ');
  const sceneGoal = packet.intent.scene_goal;
  const conflictType = packet.intent.conflict_type;

  // P5A: Multi-shot — 3 appels parallèles, médiane
  const shotPromises = Array.from({ length: NECESSITY_SHOTS }, () =>
    provider.scoreNecessity(
      prose,
      beatCount,
      beatActions,
      sceneGoal,
      conflictType,
    ),
  );

  const shots = await Promise.all(shotPromises);
  const med = median(shots);
  const avg = shots.reduce((s, v) => s + v, 0) / shots.length;
  const sd = stdev(shots, avg);
  const spread = Math.max(...shots) - Math.min(...shots);

  // P5B: Record telemetry
  _lastTelemetry = { shots, median: med, mean: avg, stdev: sd, spread };

  // P5B: Log telemetry for bench visibility
  console.log(`[NECESSITY-MULTISHOT] shots=[${shots.join(', ')}] median=${med} mean=${avg.toFixed(1)} stdev=${sd.toFixed(1)} spread=${spread}`);

  // P5A: Use median as final score (absorbs outliers like 4.0)
  const score = med;

  return {
    name: 'necessity',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.necessity,
    method: 'LLM',
    details: `LLM-judged necessity ×${NECESSITY_SHOTS} shots median=${med} (${beatCount} beats, goal: ${sceneGoal}) [shots=${shots.join(',')} sd=${sd.toFixed(1)}]`,
  };
}
