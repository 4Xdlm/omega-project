/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SOVEREIGN PIPELINE (OFFLINE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: pipeline/sovereign-pipeline.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Full offline E2E pipeline:
 * ForgePacket → DeltaComputer → SovereignLoop → SOracle V2
 * → AntiClicheSweep → MusicalPolish → SignatureEnforcer
 * → SOracle V2 final → SEAL or REJECT
 *
 * 0 LLM — 100% deterministic — OFFLINE-HEURISTIC.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, DeltaReport } from '../types.js';
import type { DeltaComputerOutput } from '../delta/delta-computer.js';
import type { OfflineSovereignLoopResult } from '../pitch/sovereign-loop.js';
import type { SScoreV2 } from '../oracle/s-oracle-v2.js';
import type { ClicheSweepResult } from '../polish/anti-cliche-sweep.js';
import type { MusicalPolishResult } from '../polish/musical-engine.js';
import type { SignatureEnforcementResult } from '../polish/signature-enforcement.js';
import type { OfflineDuelResult } from '../duel/duel-engine.js';

import { computeDelta } from '../delta/delta-computer.js';
import { runOfflineSovereignLoop } from '../pitch/sovereign-loop.js';
import { scoreV2 } from '../oracle/s-oracle-v2.js';
import { sweepClichesOffline } from '../polish/anti-cliche-sweep.js';
import { applyMusicalPolishOffline } from '../polish/musical-engine.js';
import { enforceSignatureOffline } from '../polish/signature-enforcement.js';
import { duelProses } from '../duel/duel-engine.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SovereignRunResult {
  readonly forge_packet: ForgePacket;
  readonly delta_report: DeltaReport;
  readonly sovereign_loop: OfflineSovereignLoopResult;
  readonly s_score_initial: SScoreV2;
  readonly duel_result?: OfflineDuelResult;
  readonly anti_cliche: ClicheSweepResult;
  readonly musical_polish: MusicalPolishResult;
  readonly signature: SignatureEnforcementResult;
  readonly s_score_final: SScoreV2;
  readonly verdict: 'SEAL' | 'REJECT';
  readonly pipeline_hash: string;
  readonly run_at: string; // hors hash
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function runSovereignPipeline(
  prose: string,
  packet: ForgePacket,
): SovereignRunResult {
  // Step 1: Delta computation
  const deltaOutput: DeltaComputerOutput = computeDelta({ packet, prose });

  // Step 2: Sovereign correction loop (if needed)
  const loopResult: OfflineSovereignLoopResult = runOfflineSovereignLoop(
    prose,
    packet,
    deltaOutput,
  );

  let currentProse = loopResult.final_prose;

  // Step 3: Initial S-Score
  const initialScore = scoreV2(currentProse, packet, deltaOutput);

  // Step 4: Duel if score < 92
  let duelResult: OfflineDuelResult | undefined;
  if (initialScore.composite < 92) {
    // Generate variant by running loop on original prose with forced correction
    const variantDelta = { ...deltaOutput, needs_correction: true };
    const variantLoop = runOfflineSovereignLoop(prose, packet, variantDelta);
    duelResult = duelProses(currentProse, variantLoop.final_prose, packet, packet.seeds.llm_seed);
    currentProse = duelResult.winner;
  }

  // Step 5: Anti-cliché sweep
  const clicheResult = sweepClichesOffline(currentProse, packet);
  currentProse = clicheResult.swept_prose;

  // Step 6: Musical polish
  const musicalResult = applyMusicalPolishOffline(currentProse, packet);
  currentProse = musicalResult.polished_prose;

  // Step 7: Signature enforcement
  const signatureResult = enforceSignatureOffline(currentProse, packet);
  currentProse = signatureResult.enforced_prose;

  // Step 8: Final S-Score
  const finalDelta = computeDelta({ packet, prose: currentProse });
  const finalScore = scoreV2(currentProse, packet, finalDelta);

  // Step 9: Pipeline hash (excludes run_at)
  const hashable = {
    delta_hash: deltaOutput.report_hash,
    loop_passes: loopResult.nb_passes,
    initial_composite: initialScore.composite,
    final_composite: finalScore.composite,
    cliche_replacements: clicheResult.nb_replacements,
    musical_corrections: musicalResult.corrections_applied,
    signature_enforced: signatureResult.enforced,
    verdict: finalScore.verdict,
  };

  return {
    forge_packet: packet,
    delta_report: deltaOutput.report,
    sovereign_loop: loopResult,
    s_score_initial: initialScore,
    duel_result: duelResult,
    anti_cliche: clicheResult,
    musical_polish: musicalResult,
    signature: signatureResult,
    s_score_final: finalScore,
    verdict: finalScore.verdict,
    pipeline_hash: sha256(canonicalize(hashable)),
    run_at: new Date().toISOString(),
  };
}
