/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — DUEL ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: duel/duel-engine.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Multi-draft generation + scoring + selection.
 * 3 modes: tranchant_minimaliste, sensoriel_dense, experimental_signature.
 * Select winner by S-Score, optionally fuse best elements.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider, DuelResult, Draft } from '../types.js';
import { judgeAesthetic, judgeAestheticV3 } from '../oracle/aesthetic-oracle.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import { SOVEREIGN_CONFIG } from '../config.js';
import { scoreV2 } from '../oracle/s-oracle-v2.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

export async function runDuel(
  packet: ForgePacket,
  prompt: string,
  provider: SovereignProvider,
  existingProse?: string,
  symbolMap?: SymbolMap,
): Promise<DuelResult> {
  const modes = SOVEREIGN_CONFIG.DRAFT_MODES;
  const drafts: Draft[] = [];

  // Include existing loop prose as first candidate (preserves refinement work)
  if (existingProse) {
    const score = await judgeAesthetic(packet, existingProse, provider);
    drafts.push({
      draft_id: 'DRAFT_loop_refined',
      mode: 'loop_refined',
      prose: existingProse,
      score,
    });
  }

  for (let i = 0; i < modes.length; i++) {
    const mode = modes[i];
    const prose = await provider.generateDraft(prompt, mode, `${packet.seeds.llm_seed}_${mode}`);
    const score = await judgeAesthetic(packet, prose, provider);

    drafts.push({
      draft_id: `DRAFT_${mode}_${i}`,
      mode,
      prose,
      score,
    });
  }

  // ★ V4.3 Sprint 1: Hostile selection — min_axis priority + composite tiebreak
  // Convergence 3/3: Claude + ChatGPT + Gemini — composite-only selection lets
  // high-ECC/low-RCI drafts win. This penalizes axis imbalance.
  // Selection score = composite - 1.5 * max(0, 85 - min_axis)
  // Effect: a draft with (ECC 95, RCI 70) loses to (ECC 86, RCI 84)
  let winnerIdx = 0;
  if (symbolMap) {
    const v3Scores = await Promise.all(
      drafts.map((d) => judgeAestheticV3(packet, d.prose, provider, symbolMap)),
    );

    // Log all candidates for audit (Sprint 1 instrumentation)
    console.log('[DUEL] Candidates:');
    for (let i = 0; i < v3Scores.length; i++) {
      const s = v3Scores[i];
      console.log(`  [${i}] ${drafts[i].mode} | composite=${s.composite.toFixed(1)} min_axis=${s.min_axis.toFixed(1)} ECC=${s.ecc_score.toFixed(1)} RCI=${s.macro_axes.rci.score.toFixed(1)}`);
    }

    // Hostile selection: penalize low min_axis heavily
    const selectionScores = v3Scores.map((s) => {
      const floorPenalty = 1.5 * Math.max(0, 85 - s.min_axis);
      return s.composite - floorPenalty;
    });

    const maxSelection = Math.max(...selectionScores);
    winnerIdx = selectionScores.indexOf(maxSelection);
    console.log(`[DUEL] Winner: [${winnerIdx}] ${drafts[winnerIdx].mode} (selection_score=${maxSelection.toFixed(1)})`);
  } else {
    const scores = drafts.map((d) => d.score.composite);
    const maxScore = Math.max(...scores);
    winnerIdx = scores.indexOf(maxScore);
  }

  const winner = drafts[winnerIdx];

  return {
    drafts,
    winner_id: winner.draft_id,
    winner_score: winner.score.composite,
    fusion_applied: false,
    final_prose: winner.prose,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint S2 — Offline Duel Engine (deterministic, 0 LLM) [INV-S-DUEL-01]
// ═══════════════════════════════════════════════════════════════════════════════

export interface OfflineDuelResult {
  readonly winner: string;
  readonly winner_index: 0 | 1;
  readonly scores: readonly [number, number];
  readonly duel_trace: string;
  readonly winner_hash: string;
}

/**
 * OFFLINE deterministic duel: scores both proses using scoreV2, selects winner.
 * Tie-break: index 0 wins.
 */
export function duelProses(
  prose_a: string,
  prose_b: string,
  packet: ForgePacket,
  seed: string,
): OfflineDuelResult {
  const scoreA = scoreV2(prose_a, packet);
  const scoreB = scoreV2(prose_b, packet);

  const compositeA = scoreA.composite;
  const compositeB = scoreB.composite;

  // Tie-break: index 0
  const winnerIndex: 0 | 1 = compositeA >= compositeB ? 0 : 1;
  const winner = winnerIndex === 0 ? prose_a : prose_b;

  const trace = `score_a=${compositeA.toFixed(2)}, score_b=${compositeB.toFixed(2)}, winner_index=${winnerIndex}, seed=${seed}`;

  const hashable = {
    score_a: compositeA,
    score_b: compositeB,
    winner_index: winnerIndex,
    seed,
  };

  return {
    winner,
    winner_index: winnerIndex,
    scores: [compositeA, compositeB],
    duel_trace: trace,
    winner_hash: sha256(canonicalize(hashable)),
  };
}
