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

import type { ForgePacket, SovereignProvider, DuelResult, Draft, DuelCandidateScore } from '../types.js';
import { judgeAesthetic, judgeAestheticV3 } from '../oracle/aesthetic-oracle.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import { SOVEREIGN_CONFIG } from '../config.js';
import { scoreV2 } from '../oracle/s-oracle-v2.js';
import { sha256, canonicalize } from '@omega/canon-kernel';
// P0-03: Unified floor threshold — single source of truth
import { SEAL_FLOOR_MIN } from '../core/thresholds.js';
// P2-FIX: mode-specific instructions for duel drafts
import { getDraftModeInstruction } from './draft-modes.js';
// P3A: K2 chunked generation for all duel modes — volume equity
import { generateChunkedDraft, isChunkedV4Active } from '../generation/chunked-generator.js';
import { forgePacketToSceneBrief } from '../generation/forge-to-brief.js';
import { getDuelK2Persona, getDuelK2Rappel } from './draft-modes.js';

// ── CV Gate — Pre-filter for rhythm outliers ─────────────────────────────────
// Levier C: Reject drafts with CV_sent > threshold
// Étalonnage maîtres: Flaubert max=0.795, Proust max=0.784, Duras max=1.031
// HOTFIX BLOC7: Ollama CV moyen ~2.4 → seuil 1.05 cause FAIL-OPEN systématique.
// OMEGA_HYBRID_MODE=1 → seuil 2.5 (accepte rythme Ollama, bloque extrêmes >5)
// BLOC7: hybrid mode rejeté 3/3 IAs + Francky. Env var conservée pour compatibilité.

const CV_GATE_REJECT = process.env.OMEGA_HYBRID_MODE === '1' ? 2.50 : 1.05;
const CV_GATE_MAX_RETRIES = 2;

// ── R7: Duel N=8 (Best-of-N selection) ──────────────────────────────────────
// OMEGA_DUEL_RUNS: Number of independent runs per duel mode.
//   '1' (default) = N=4 classic (1 loop_refined + 3 modes × 1 run)
//   '2' = N=7 (1 loop_refined + 3 modes × 2 runs with different seeds)
// MECHANISM: More candidates = higher probability that the best achievable
// prose for this scene appears in the pool. The hostile selector (composite
// minus min_axis penalty) picks the most balanced candidate.
// COST: Each additional run adds 4 K2 API calls (chunk generation) + 1 V3
// scoring pass. N=2 doubles duel generation cost but NOT post-processing.
const DUEL_RUNS = Math.max(1, Math.min(3, parseInt(process.env.OMEGA_DUEL_RUNS || '1', 10)));

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

  // Include existing loop prose as first candidate (preserves refinement work)
  if (existingProse) {
    const score = await judgeAesthetic(packet, existingProse, provider);
    drafts.push({
      draft_id: 'DRAFT_loop_refined',
      mode: 'loop_refined',
      prose: existingProse,
      score,
    });

    // Telemetry: DUEL_loop_refined snapshot
    try {
      const { telemetry } = await import('../telemetry/pipeline-telemetry.js');
      telemetry.recordFromProse('DUEL_loop_refined', existingProse, undefined, { mode: 'loop_refined' });
    } catch { /* telemetry is optional */ }
  }

  // P3A: K2 chunked generation for all duel modes — volume equity.
  // Each mode generates via 4×750w chunks with its own persona (Option A).
  // Fallback: if OMEGA_CHUNKED_V4 is not active, revert to single-shot + P2 word directive.
  const useK2ForDuel = isChunkedV4Active();

  // P2-FIX (retained as fallback for non-K2 mode):
  const targetWords = packet.intent.target_word_count ?? 2200;
  const wordCountDirective = `\n\n=== VOLUME OBLIGATOIRE ===\nMINIMUM ${targetWords} mots. Déploie chaque paragraphe largement. NE COUPE PAS COURT. Si tu produis moins de ${Math.round(targetWords * 0.8)} mots, c'est un ÉCHEC.`;

  // P3A: Pre-compute sceneBrief for K2 duel (same source as engine.ts loop_refined)
  const sceneBrief = useK2ForDuel ? forgePacketToSceneBrief(packet) : '';

  // R7: Outer loop — DUEL_RUNS independent runs per mode (seed diversity).
  // N=1 (default): 3 candidates from modes (classic behavior).
  // N=2: 6 candidates from modes (2 runs × 3 modes, different seeds).
  // N=3: 9 candidates from modes (3 runs × 3 modes).
  // Total candidates = DUEL_RUNS × modes.length + (existingProse ? 1 : 0)
  if (DUEL_RUNS > 1) {
    console.log(`[DUEL-R7] Best-of-N active: ${DUEL_RUNS} runs × ${modes.length} modes = ${DUEL_RUNS * modes.length} mode candidates`);
  }

  for (let runIdx = 0; runIdx < DUEL_RUNS; runIdx++) {
    for (let i = 0; i < modes.length; i++) {
      const mode = modes[i];
      let bestCandidate: { prose: string; cv: number } | null = null;

      for (let attempt = 0; attempt <= CV_GATE_MAX_RETRIES; attempt++) {
        // R7: Seed includes runIdx for diversity between runs of same mode.
        // run 0 = original seeds (backward compatible with N=1).
        const baseSeed = runIdx === 0
          ? `${packet.seeds.llm_seed}_${mode}`
          : `${packet.seeds.llm_seed}_${mode}_run${runIdx}`;
        const seed = attempt === 0
          ? baseSeed
          : `${baseSeed}_retry${attempt}`;

        let prose: string;

        if (useK2ForDuel) {
          // P3A: K2 chunked generation with mode-specific persona override
          const personaOverride = getDuelK2Persona(mode);
          const rappelOverride = getDuelK2Rappel(mode);
          const chunkedResult = await generateChunkedDraft(
            {
              sceneBrief,
              signatureWords: packet.style_genome.lexicon.signature_words,
              language: packet.language as 'fr' | 'en',
              seed,
              personaOverride,
              rappelOverride,
            },
            provider,
          );
          prose = chunkedResult.prose;
          if (attempt === 0) {
            const runTag = DUEL_RUNS > 1 ? ` run=${runIdx}` : '';
            console.log(`[DUEL-K2] mode=${mode}${runTag}: ${chunkedResult.total_words}w en ${chunkedResult.api_calls} chunks (${chunkedResult.words_per_chunk.join(', ')}w)`);
          }
        } else {
          // Fallback: single-shot with P2 word count directive
          const modeInstruction = getDraftModeInstruction(mode);
          const enrichedPrompt = `${prompt}\n\n=== MODE D'ÉCRITURE ===\n${modeInstruction}${wordCountDirective}`;
          prose = await provider.generateDraft(enrichedPrompt, mode, seed);
        }

        const cv = computeCVSent(prose);

        if (cv <= CV_GATE_REJECT) {
          console.log(`[DUEL] CV_GATE: mode=${mode}${DUEL_RUNS > 1 ? ` run=${runIdx}` : ''} CV=${cv.toFixed(2)} → PASS`);
          bestCandidate = { prose, cv };
          break;
        } else {
          console.log(`[DUEL] CV_GATE: mode=${mode}${DUEL_RUNS > 1 ? ` run=${runIdx}` : ''} CV=${cv.toFixed(2)} → REJECT (retry ${attempt + 1}/${CV_GATE_MAX_RETRIES})`);
          if (!bestCandidate || cv < bestCandidate.cv) {
            bestCandidate = { prose, cv };
          }
        }
      }

      const finalProse = bestCandidate!.prose;
      if (bestCandidate!.cv > CV_GATE_REJECT) {
        console.log(`[DUEL] CV_GATE: mode=${mode}${DUEL_RUNS > 1 ? ` run=${runIdx}` : ''} FAIL-OPEN CV=${bestCandidate!.cv.toFixed(2)} (best of ${CV_GATE_MAX_RETRIES + 1} attempts)`);
      }

      // R7: draft_id includes runIdx for traceability
      const draftSuffix = DUEL_RUNS > 1 ? `${mode}_run${runIdx}_${i}` : `${mode}_${i}`;
      const score = await judgeAesthetic(packet, finalProse, provider);
      drafts.push({
        draft_id: `DRAFT_${draftSuffix}`,
        mode,
        prose: finalProse,
        score,
      });

      // Telemetry: DUEL_CANDIDATE snapshot
      try {
        const { telemetry } = await import('../telemetry/pipeline-telemetry.js');
        telemetry.recordFromProse(`DUEL_${mode}${DUEL_RUNS > 1 ? `_run${runIdx}` : ''}`, finalProse, undefined, {
          mode, run: runIdx, cv: bestCandidate!.cv, cv_gate_pass: bestCandidate!.cv <= CV_GATE_REJECT,
          k2_duel: useK2ForDuel,
        });
      } catch { /* telemetry is optional */ }
    }
  }

  // ★ V4.3 Sprint 1: Hostile selection — min_axis priority + composite tiebreak
  // Convergence 3/3: Claude + ChatGPT + Gemini — composite-only selection lets
  // high-ECC/low-RCI drafts win. This penalizes axis imbalance.
  // Selection score = composite - 1.5 * max(0, 85 - min_axis)
  // Effect: a draft with (ECC 95, RCI 70) loses to (ECC 86, RCI 84)
  let winnerIdx = 0;
  let v3Scores: Awaited<ReturnType<typeof judgeAestheticV3>>[] | null = null;
  let duel_matrix: DuelCandidateScore[] | undefined;
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
    // P4E: Word count floor — penalize short drafts that score high due to density bias
    // K2 target = 4×750w = ~2500w minimum viable. Floor at 60% = 1500w.
    const WORD_COUNT_FLOOR = Math.round((packet.intent.target_word_count ?? 2200) * 0.60);
    const WORD_COUNT_PENALTY_RATE = 0.02; // -2 pts per 100 words below floor
    const selectionScores = v3Scores.map((s, idx) => {
      const floorPenalty = 1.5 * Math.max(0, SEAL_FLOOR_MIN - s.min_axis);
      const words = drafts[idx].prose.split(/\s+/).filter((w: string) => w.length > 0).length;
      const wordDeficit = Math.max(0, WORD_COUNT_FLOOR - words);
      const wordPenalty = wordDeficit * WORD_COUNT_PENALTY_RATE;
      if (wordPenalty > 0) {
        console.log(`[DUEL] WORD_FLOOR: mode=${drafts[idx].mode} words=${words} < floor=${WORD_COUNT_FLOOR} → penalty=-${wordPenalty.toFixed(1)}`);
      }
      return s.composite - floorPenalty - wordPenalty;
    });

    const maxSelection = Math.max(...selectionScores);
    winnerIdx = selectionScores.indexOf(maxSelection);
    console.log(`[DUEL] Winner: [${winnerIdx}] ${drafts[winnerIdx].mode} (selection_score=${maxSelection.toFixed(1)})`);

    // ★ P3C: Build duel matrix — full scoring telemetry for all candidates
    duel_matrix = drafts.map((d, idx) => {
      const s = v3Scores![idx];
      const words = d.prose.split(/\s+/).filter((w: string) => w.length > 0).length;
      return {
        mode: d.mode,
        words,
        composite: s.composite,
        min_axis: s.min_axis,
        selection_score: selectionScores[idx],
        ECC: s.ecc_score,
        RCI: s.macro_axes.rci.score,
        SII: s.macro_axes.sii.score,
        IFI: s.macro_axes.ifi.score,
        AAI: s.macro_axes.aai.score,
      };
    });
    // Log matrix for immediate visibility (even if bench-output.log is buffered)
    console.log(`[DUEL-MATRIX] ${JSON.stringify(duel_matrix)}`);
  } else {
    const scores = drafts.map((d) => d.score.composite);
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
        composite: symbolMap && v3Scores ? v3Scores[idx].composite : d.score.composite,
      })),
    });
  } catch { /* telemetry is optional */ }

  return {
    drafts,
    winner_id: winner.draft_id,
    winner_score: winner.score.composite,
    fusion_applied: false,
    final_prose: winner.prose,
    duel_matrix,
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
