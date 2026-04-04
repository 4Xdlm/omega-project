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
// P0-03: Unified floor threshold — single source of truth
import { SEAL_FLOOR_MIN } from '../core/thresholds.js';

// ── CV Gate — Pre-filter for rhythm outliers ─────────────────────────────────
// Levier C: Reject drafts with CV_sent > threshold
// Étalonnage maîtres: Flaubert max=0.795, Proust max=0.784, Duras max=1.031
// HOTFIX BLOC7: Ollama CV moyen ~2.4 → seuil 1.05 cause FAIL-OPEN systématique.
// OMEGA_HYBRID_MODE=1 → seuil 2.5 (accepte rythme Ollama, bloque extrêmes >5)
// BLOC7: hybrid mode rejeté 3/3 IAs + Francky. Env var conservée pour compatibilité.

const CV_GATE_REJECT = process.env.OMEGA_HYBRID_MODE === '1' ? 2.50 : 1.05;
const CV_GATE_MAX_RETRIES = 2;

export function computeCVSent(prose: string): number {
  const sentences = prose.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const wordCounts = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
  if (wordCounts.length < 2) return 0;
  const mean = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  if (mean === 0) return 0;
  const variance = wordCounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / wordCounts.length;
  return Math.sqrt(variance) / mean;
}

export async function runDuel(
  packet: ForgePacket,
  prompt: string,
  provider: SovereignProvider,
  existingProse?: string,
  symbolMap?: SymbolMap,
): Promise<DuelResult> {
  const modes = SOVEREIGN_CONFIG.DRAFT_MODES;
  const drafts: Draft[] = [];

  // ── P2-03b: V1 SKIP — économise ~12 appels LLM (3 modes × 4 axes V1) ────
  // Condition sécurisée: skip V1 seulement si V3 est réellement disponible.
  // INV-DUEL-V1-01: symbolMap absent → V1 FORCÉ (pas de sélection aveugle).
  // Directive Francky: garder V1 sur existingProse dans tous les cas.
  const skipV1ForModes = process.env.OMEGA_DUEL_SKIP_V1 === '1' && !!symbolMap;
  if (skipV1ForModes) {
    console.log(`[DUEL] V1 scoring SKIPPED for mode drafts (OMEGA_DUEL_SKIP_V1=1, symbolMap present). Saved ~${modes.length * 4} LLM calls.`);
  }

  // Include existing loop prose as first candidate (preserves refinement work)
  // V1 scoring ALWAYS runs on existingProse (diagnostic baseline)
  if (existingProse) {
    const score = await judgeAesthetic(packet, existingProse, provider);
    drafts.push({
      draft_id: 'DRAFT_loop_refined',
      mode: 'loop_refined',
      prose: existingProse,
      score,
      v1_skipped: false,
    });

    // Telemetry: DUEL_loop_refined snapshot
    try {
      const { telemetry } = await import('../telemetry/pipeline-telemetry.js');
      telemetry.recordFromProse('DUEL_loop_refined', existingProse, undefined, { mode: 'loop_refined' });
    } catch { /* telemetry is optional */ }
  }

  for (let i = 0; i < modes.length; i++) {
    const mode = modes[i];
    let bestCandidate: { prose: string; cv: number } | null = null;

    for (let attempt = 0; attempt <= CV_GATE_MAX_RETRIES; attempt++) {
      const seed = attempt === 0
        ? `${packet.seeds.llm_seed}_${mode}`
        : `${packet.seeds.llm_seed}_${mode}_retry${attempt}`;

      const prose = await provider.generateDraft(prompt, mode, seed);
      const cv = computeCVSent(prose);

      if (cv <= CV_GATE_REJECT) {
        console.log(`[DUEL] CV_GATE: mode=${mode} CV=${cv.toFixed(2)} → PASS`);
        bestCandidate = { prose, cv };
        break;
      } else {
        console.log(`[DUEL] CV_GATE: mode=${mode} CV=${cv.toFixed(2)} → REJECT (retry ${attempt + 1}/${CV_GATE_MAX_RETRIES})`);
        if (!bestCandidate || cv < bestCandidate.cv) {
          bestCandidate = { prose, cv };
        }
      }
    }

    const finalProse = bestCandidate!.prose;
    if (bestCandidate!.cv > CV_GATE_REJECT) {
      console.log(`[DUEL] CV_GATE: mode=${mode} FAIL-OPEN CV=${bestCandidate!.cv.toFixed(2)} (best of ${CV_GATE_MAX_RETRIES + 1} attempts)`);
    }

    // P2-03b: skip V1 scoring when V3 handles selection
    if (skipV1ForModes) {
      drafts.push({
        draft_id: `DRAFT_${mode}_${i}`,
        mode,
        prose: finalProse,
        score: null,
        v1_skipped: true,
      });
    } else {
      const score = await judgeAesthetic(packet, finalProse, provider);
      drafts.push({
        draft_id: `DRAFT_${mode}_${i}`,
        mode,
        prose: finalProse,
        score,
        v1_skipped: false,
      });
    }

    // Telemetry: DUEL_CANDIDATE snapshot
    try {
      const { telemetry } = await import('../telemetry/pipeline-telemetry.js');
      telemetry.recordFromProse(`DUEL_${mode}`, finalProse, undefined, {
        mode, cv: bestCandidate!.cv, cv_gate_pass: bestCandidate!.cv <= CV_GATE_REJECT,
      });
    } catch { /* telemetry is optional */ }
  }

  // ★ V4.3 Sprint 1: Hostile selection — min_axis priority + composite tiebreak
  // Convergence 3/3: Claude + ChatGPT + Gemini — composite-only selection lets
  // high-ECC/low-RCI drafts win. This penalizes axis imbalance.
  // Selection score = composite - 1.5 * max(0, 85 - min_axis)
  // Effect: a draft with (ECC 95, RCI 70) loses to (ECC 86, RCI 84)
  let winnerIdx = 0;
  let v3Scores: Awaited<ReturnType<typeof judgeAestheticV3>>[] | null = null;
  if (symbolMap) {
    v3Scores = await Promise.all(
      drafts.map((d) => judgeAestheticV3(packet, d.prose, provider, symbolMap)),
    );

    // Log all candidates for audit (Sprint 1 instrumentation)
    console.log('[DUEL] Candidates:');
    for (let i = 0; i < v3Scores.length; i++) {
      const s = v3Scores[i];
      console.log(`  [${i}] ${drafts[i].mode} | composite=${s.composite.toFixed(1)} min_axis=${s.min_axis.toFixed(1)} ECC=${s.ecc_score.toFixed(1)} RCI=${s.macro_axes.rci.score.toFixed(1)}`);
    }

    // Hostile selection: penalize low min_axis heavily
    // floorPenalty multiplier 1.5 : empirique Sprint hostile selection — ADR-FLOOR-01
    const selectionScores = v3Scores.map((s) => {
      const floorPenalty = 1.5 * Math.max(0, SEAL_FLOOR_MIN - s.min_axis);
      return s.composite - floorPenalty;
    });

    const maxSelection = Math.max(...selectionScores);
    winnerIdx = selectionScores.indexOf(maxSelection);
    console.log(`[DUEL] Winner: [${winnerIdx}] ${drafts[winnerIdx].mode} (selection_score=${maxSelection.toFixed(1)})`);
  } else {
    // Fallback V1 selection — INV-DUEL-V1-01: requires non-null V1 scores
    // If V1 was skipped without symbolMap, this is a logic error — should never happen
    // because skipV1ForModes requires !!symbolMap.
    const scores = drafts.map((d) => d.score?.composite ?? -Infinity);
    const maxScore = Math.max(...scores);
    winnerIdx = scores.indexOf(maxScore);
  }

  const winner = drafts[winnerIdx];

  // Telemetry: DUEL_WINNER snapshot with scores
  try {
    const { telemetry } = await import('../telemetry/pipeline-telemetry.js');
    const ws = symbolMap && v3Scores ? v3Scores[winnerIdx] : null;
    telemetry.recordFromProse('DUEL_WINNER', winner.prose, ws ? {
      composite: ws.composite, min_axis: ws.min_axis,
      ECC: ws.ecc_score, RCI: ws.macro_axes.rci.score,
      SII: ws.macro_axes.sii.score, IFI: ws.macro_axes.ifi.score,
      AAI: ws.macro_axes.aai.score,
    } : undefined, {
      winner_mode: winner.mode, winner_idx: winnerIdx,
      all_candidates: drafts.map((d, idx) => ({
        mode: d.mode, words: d.prose.split(/\s+/).length,
        composite: symbolMap && v3Scores ? v3Scores[idx].composite : (d.score?.composite ?? 0),
        v1_skipped: d.v1_skipped,
      })),
    });
  } catch { /* telemetry is optional */ }

  // P2-03b: winner_score from V3 when V1 skipped, from V1 otherwise
  const winnerScore = symbolMap && v3Scores
    ? v3Scores[winnerIdx].composite
    : (winner.score?.composite ?? 0);

  return {
    drafts,
    winner_id: winner.draft_id,
    winner_score: winnerScore,
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
