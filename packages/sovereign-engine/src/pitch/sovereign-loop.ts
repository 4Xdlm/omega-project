/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SOVEREIGN LOOP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: pitch/sovereign-loop.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Main correction loop: delta → pitch → patch → rescore.
 * Max 2 passes.
 *
 * ALGORITHM:
 * 1. Compute initial DELTA + S_SCORE
 * 2. If score ≥92 → SEAL, exit
 * 3. Else:
 *    a. Generate TRIPLE_PITCH from delta
 *    b. PITCH_ORACLE selects best
 *    c. PATCH_ENGINE applies (LLM call)
 *    d. Re-compute DELTA + S_SCORE
 *    e. If score ≥92 → SEAL, exit
 *    f. If pass < max_passes → loop
 *    g. Else → if score ≥60 keep best, else REJECT
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignLoopResult, SovereignProvider, CorrectionPitch, ForensicData, ForensicRollbackEntry } from '../types.js';
import type { DeltaComputerOutput } from '../delta/delta-computer.js';
import type { PitchOp } from './triple-pitch-engine.js';
import { generateDeltaReport } from '../delta/delta-report.js';
import { judgeAesthetic } from '../oracle/aesthetic-oracle.js';
import { generateTriplePitch } from './triple-pitch.js';
import { generateTriplePitch as generateOfflineTriplePitch } from './triple-pitch-engine.js';
import { selectBestPitch, selectBestPitchStrategy } from './pitch-oracle.js';
import { applyPatch, applyOfflinePatch } from './patch-engine.js';
import { generatePrescriptions } from '../prescriptions/index.js';
import { SOVEREIGN_CONFIG } from '../config.js';
import { computeDelta } from '../delta/delta-computer.js';

export async function runSovereignLoop(
  initialProse: string,
  packet: ForgePacket,
  provider: SovereignProvider,
  physicsAudit?: import('../oracle/physics-audit.js').PhysicsAuditResult,
): Promise<SovereignLoopResult> {
  const max_passes = SOVEREIGN_CONFIG.MAX_CORRECTION_PASSES;

  let currentProse = initialProse;
  const pitches_applied: CorrectionPitch[] = [];

  const s_score_initial = await judgeAesthetic(packet, currentProse, provider);

  if (s_score_initial.verdict === 'SEAL') {
    return {
      final_prose: currentProse,
      s_score_initial,
      s_score_final: s_score_initial,
      pitches_applied: [],
      passes_executed: 0,
      verdict: 'SEAL',
      verdict_reason: `Initial score ${s_score_initial.composite.toFixed(1)} ≥ ${SOVEREIGN_CONFIG.SOVEREIGN_THRESHOLD}`,
      forensic_data: { rollback_count: 0, rollbacks: [] },
    };
  }

  let bestProse = currentProse;
  let bestScore = s_score_initial;
  const forensicRollbacks: ForensicRollbackEntry[] = [];

  for (let pass = 0; pass < max_passes; pass++) {
    const delta = generateDeltaReport(packet, currentProse, physicsAudit);

    // Sprint 4.3: Generate prescriptions from physics audit if enabled
    const prescriptions = SOVEREIGN_CONFIG.PRESCRIPTIONS_ENABLED && physicsAudit
      ? generatePrescriptions(physicsAudit, SOVEREIGN_CONFIG.PRESCRIPTIONS_TOP_K)
      : undefined;

    const triple_pitch = generateTriplePitch(delta, prescriptions);

    const pitch_result = selectBestPitch(triple_pitch);
    const selected_pitch = triple_pitch.find((p) => p.pitch_id === pitch_result.selected_pitch_id);

    if (!selected_pitch) break;

    const patched_prose = await applyPatch(currentProse, selected_pitch, packet, provider);

    pitches_applied.push(selected_pitch);
    currentProse = patched_prose;

    const judgeStart = Date.now();
    const s_score_current = await judgeAesthetic(packet, currentProse, provider);
    const judgeLatencyMs = Date.now() - judgeStart;

    if (s_score_current.composite > bestScore.composite) {
      bestProse = currentProse;
      bestScore = s_score_current;
    } else if (s_score_current.composite < bestScore.composite) {
      const currentAxes = Object.values(s_score_current.axes);
      const bestAxes = Object.values(bestScore.axes);
      const triggerAxes = currentAxes
        .map((ax, i) => ({
          axis: ax.name,
          score_before: bestAxes[i]?.score ?? 0,
          score_after: ax.score,
          delta: ax.score - (bestAxes[i]?.score ?? 0),
        }))
        .filter(a => a.delta < 0);
      forensicRollbacks.push({
        pass_index: pass,
        delta_composite: s_score_current.composite - bestScore.composite,
        trigger_axes: triggerAxes,
        judge_latency_ms: judgeLatencyMs,
      });
    }

    if (s_score_current.verdict === 'SEAL') {
      return {
        final_prose: currentProse,
        s_score_initial,
        s_score_final: s_score_current,
        pitches_applied,
        passes_executed: pass + 1,
        verdict: 'SEAL',
        verdict_reason: `Sealed after ${pass + 1} pass(es): score ${s_score_current.composite.toFixed(1)}`,
        forensic_data: { rollback_count: forensicRollbacks.length, rollbacks: forensicRollbacks },
      };
    }
  }

  const verdict = bestScore.composite >= SOVEREIGN_CONFIG.REJECT_BELOW ? 'SEAL' : 'REJECT';
  const verdict_reason =
    verdict === 'SEAL'
      ? `Best score ${bestScore.composite.toFixed(1)} after ${max_passes} passes (below 92 but above 60)`
      : `Rejected: best score ${bestScore.composite.toFixed(1)} below ${SOVEREIGN_CONFIG.REJECT_BELOW}`;

  return {
    final_prose: bestProse,
    s_score_initial,
    s_score_final: bestScore,
    pitches_applied,
    passes_executed: max_passes,
    verdict,
    verdict_reason,
    forensic_data: { rollback_count: forensicRollbacks.length, rollbacks: forensicRollbacks },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint S0-C — Offline Sovereign Loop (deterministic, 0 LLM)
// delta.needs_correction → pitch → oracle → patch → max 2 passes [INV-S-BOUND-01]
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoopPass {
  readonly pass_number: number;
  readonly strategy_id: string;
  readonly ops_applied: readonly PitchOp[];
}

export interface OfflineSovereignLoopResult {
  readonly final_prose: string;
  readonly nb_passes: 0 | 1 | 2;
  readonly loop_trace: readonly LoopPass[];
  readonly was_corrected: boolean;
  readonly forensic_data?: ForensicData;
}

export function runOfflineSovereignLoop(
  prose: string,
  packet: ForgePacket,
  delta: DeltaComputerOutput,
): OfflineSovereignLoopResult {
  if (!delta.needs_correction) {
    return {
      final_prose: prose,
      nb_passes: 0,
      loop_trace: [],
      was_corrected: false,
      forensic_data: { rollback_count: 0, rollbacks: [] },
    };
  }

  const maxPasses = SOVEREIGN_CONFIG.MAX_CORRECTION_PASSES;
  let currentProse = prose;
  const trace: LoopPass[] = [];

  for (let pass = 0; pass < maxPasses; pass++) {
    // Recompute delta for current prose
    const currentDelta = pass === 0
      ? delta
      : computeDelta({ packet, prose: currentProse });

    // Generate triple pitch
    const pitchOutput = generateOfflineTriplePitch(
      currentDelta.report,
      `${packet.run_id}_pass_${pass}`,
    );

    // Oracle selects best strategy
    const decision = selectBestPitchStrategy(
      pitchOutput.strategies,
      currentDelta.report,
    );

    // Apply patch
    const patchResult = applyOfflinePatch(
      currentProse,
      decision.selected_strategy,
      packet,
    );

    currentProse = patchResult.patched_prose;

    trace.push({
      pass_number: pass + 1,
      strategy_id: decision.selected_strategy.id,
      ops_applied: patchResult.ops_applied,
    });

    // Check if correction is still needed
    const postDelta = computeDelta({ packet, prose: currentProse });
    if (!postDelta.needs_correction) {
      break;
    }
  }

  return {
    final_prose: currentProse,
    nb_passes: trace.length as 0 | 1 | 2,
    loop_trace: trace,
    was_corrected: true,
    forensic_data: { rollback_count: 0, rollbacks: [] },
  };
}
