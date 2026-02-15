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

import type { ForgePacket, SovereignLoopResult, SovereignProvider, CorrectionPitch } from '../types.js';
import { generateDeltaReport } from '../delta/delta-report.js';
import { judgeAesthetic } from '../oracle/aesthetic-oracle.js';
import { generateTriplePitch } from './triple-pitch.js';
import { selectBestPitch } from './pitch-oracle.js';
import { applyPatch } from './patch-engine.js';
import { generatePrescriptions } from '../prescriptions/index.js';
import { SOVEREIGN_CONFIG } from '../config.js';

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
    };
  }

  let bestProse = currentProse;
  let bestScore = s_score_initial;

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

    const s_score_current = await judgeAesthetic(packet, currentProse, provider);

    if (s_score_current.composite > bestScore.composite) {
      bestProse = currentProse;
      bestScore = s_score_current;
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
  };
}
