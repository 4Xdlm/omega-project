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

  // Select winner by V3 macro-axes if symbol map available, else V1
  let winnerIdx = 0;
  if (symbolMap) {
    const v3Scores = await Promise.all(
      drafts.map((d) => judgeAestheticV3(packet, d.prose, provider, symbolMap)),
    );
    const v3Composites = v3Scores.map((s) => s.composite);
    const maxV3 = Math.max(...v3Composites);
    winnerIdx = v3Composites.indexOf(maxV3);
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
