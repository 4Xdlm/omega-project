/**
 * orchestrator/scribe-orchestrator.ts — Scribe Orchestrator MODE SAFE v3.1.0
 * Sprint S2 — SCRIBE ORCHESTRÉ
 *
 * Pipeline:
 *   1. Compile DRAMATURGE partition (filtered PDB instructions)
 *   2. Compile MUSICIEN partition (filtered PDB instructions)
 *   3. Generate draft A with DRAMATURGE prompt
 *   4. Generate draft B with MUSICIEN prompt
 *   5. Score both drafts with calcComposite (0 API, 5 CALC axes)
 *   6. Select winner: CALC if margin ≥ 3.0, LLM tiebreak if < 3.0
 *
 * Invariants:
 *   INV-ORCH-01 : Both drafts generated from same enrichedPacket + symbolMap
 *   INV-ORCH-02 : calcComposite uses 0 API calls (pure CALC)
 *   INV-ORCH-03 : MODE SAFE = whole draft selection (no fusion)
 *   INV-ORCH-04 : Tiebreak margin configurable (default 3.0)
 *   INV-ORCH-05 : symbolMap shared across both drafts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { ForgePacket, SovereignProvider } from '../types.js';
import type { CDEInput } from '../cde/types.js';
import type { PDBInstruction } from '../prose-directive/lot1-instructions.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import type { CompiledPartition } from '../compiler/types.js';
import type {
  CalcCompositeResult,
  OrchestratorResult,
} from './types.js';
import { ORCHESTRATOR_CONFIG } from './types.js';
import type { ProfileName } from '../compiler/partition-profiles.js';
import {
  compileWithProfile,
  PROFILE_DRAMATURGE,
  PROFILE_MUSICIEN,
} from '../compiler/partition-profiles.js';
import { buildSovereignPrompt } from '../input/prompt-assembler-v2.js';
import { scoreTension14D } from '../oracle/axes/tension-14d.js';
import { scoreEmotionCoherence } from '../oracle/axes/emotion-coherence.js';
import { scoreRhythm } from '../oracle/axes/rhythm.js';
import { scoreSignature } from '../oracle/axes/signature.js';
import { scoreAntiCliche } from '../oracle/axes/anti-cliche.js';
import { SOVEREIGN_CONFIG } from '../config.js';

// ── CALC Composite ────────────────────────────────────────────────────────────

/**
 * calcComposite() — Score a draft using 5 CALC-only axes.
 * INV-ORCH-02 : 0 API calls.
 *
 * Axes and weights (CALC-only pre-duel selection, NOT the same as macro-axes):
 *   tension_14d        × 3.0
 *   emotion_coherence  × 2.5
 *   rhythm             × 1.5  (note: macro-axes RCI uses rhythm×conf, different system)
 *   signature          × 1.0
 *   anti_cliche        × 1.5
 */
export async function calcComposite(
  packet: ForgePacket,
  prose: string,
  profile: ProfileName,
): Promise<CalcCompositeResult> {
  // All called without provider → pure CALC fallback
  const [tension, emotion] = await Promise.all([
    scoreTension14D(packet, prose),
    scoreEmotionCoherence(packet, prose),
  ]);
  const rhythm = scoreRhythm(packet, prose);
  const signature = scoreSignature(packet, prose);
  const antiCliche = scoreAntiCliche(packet, prose);

  // Weighted composite (same weights as main oracle)
  const weighted =
    tension.score * 3.0 +
    emotion.score * 2.5 +
    rhythm.score * 1.5 +
    signature.score * 1.0 +
    antiCliche.score * 1.5;
  const totalWeight = 3.0 + 2.5 + 1.5 + 1.0 + 1.5; // 9.5
  const composite = weighted / totalWeight;

  return {
    profile,
    tension_14d: tension.score,
    emotion_coherence: emotion.score,
    rhythm: rhythm.score,
    signature: signature.score,
    anti_cliche: antiCliche.score,
    composite,
  };
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export interface OrchestratorInput {
  readonly packet: ForgePacket;
  readonly cdeInput: CDEInput | null;
  readonly allInstructions: readonly PDBInstruction[];
  readonly symbolMap?: SymbolMap;
  readonly emotionBrief?: import('@omega/omega-forge').ForgeEmotionBrief;
  readonly shape?: string;
}

/**
 * runOrchestrator() — Execute MODE SAFE orchestrated generation.
 *
 * Generates 2 drafts (DRAMATURGE + MUSICIEN), scores both with CALC,
 * selects winner. If margin < 3.0, invokes LLM tiebreak.
 */
export async function runOrchestrator(
  input: OrchestratorInput,
  provider: SovereignProvider,
): Promise<OrchestratorResult> {
  const { packet, cdeInput, allInstructions, symbolMap, emotionBrief, shape } = input;

  // 1+2. Compile both partitions
  const dramPartition = compileWithProfile(
    PROFILE_DRAMATURGE, packet, cdeInput, allInstructions, shape,
  );
  const musicPartition = compileWithProfile(
    PROFILE_MUSICIEN, packet, cdeInput, allInstructions, shape,
  );

  // 3+4. Build prompts and generate drafts (INV-ORCH-01: same packet + symbolMap)
  const dramPrompt = buildSovereignPrompt(packet, symbolMap, emotionBrief, dramPartition);
  const musicPrompt = buildSovereignPrompt(packet, symbolMap, emotionBrief, musicPartition);

  const [dramDraft, musicDraft] = await Promise.all([
    provider.generateDraft(
      dramPrompt.sections.map(s => s.content).join('\n\n'),
      SOVEREIGN_CONFIG.DRAFT_MODES[0],
      packet.seeds.llm_seed,
    ),
    provider.generateDraft(
      musicPrompt.sections.map(s => s.content).join('\n\n'),
      SOVEREIGN_CONFIG.DRAFT_MODES[0],
      packet.seeds.llm_seed,
    ),
  ]);

  // 5. Score both with CALC (INV-ORCH-02: 0 API)
  const [dramScore, musicScore] = await Promise.all([
    calcComposite(packet, dramDraft, 'DRAMATURGE'),
    calcComposite(packet, musicDraft, 'MUSICIEN'),
  ]);

  // 6. Select winner (INV-ORCH-03: whole draft, INV-ORCH-04: margin check)
  const margin = Math.abs(dramScore.composite - musicScore.composite);
  let selectedProfile: ProfileName;
  let selectionMethod: 'CALC' | 'TIEBREAK' = 'CALC';
  let tiebreakWinner: ProfileName | undefined;

  if (margin >= ORCHESTRATOR_CONFIG.TIEBREAK_MARGIN) {
    // Clear winner
    selectedProfile = dramScore.composite >= musicScore.composite ? 'DRAMATURGE' : 'MUSICIEN';
  } else {
    // Tiebreak: ask LLM to compare
    selectionMethod = 'TIEBREAK';
    tiebreakWinner = await llmTiebreak(dramDraft, musicDraft, provider);
    selectedProfile = tiebreakWinner;
  }

  const selectedProse = selectedProfile === 'DRAMATURGE' ? dramDraft : musicDraft;
  const selectedPartition = selectedProfile === 'DRAMATURGE' ? dramPartition : musicPartition;

  return {
    mode: 'SAFE',
    selected_profile: selectedProfile,
    selected_prose: selectedProse,
    selected_partition: selectedPartition,
    scores: {
      dramaturge: dramScore,
      musicien: musicScore,
    },
    margin,
    selection_method: selectionMethod,
    tiebreak_winner: tiebreakWinner,
  };
}

// ── LLM Tiebreak ──────────────────────────────────────────────────────────────

async function llmTiebreak(
  draftA: string,
  draftB: string,
  provider: SovereignProvider,
): Promise<ProfileName> {
  const prompt = `Compare ces deux extraits littéraires. Lequel est stylistiquement supérieur ?

EXTRAIT A:
${draftA.slice(0, 2000)}

EXTRAIT B:
${draftB.slice(0, 2000)}

Réponds UNIQUEMENT par "A" ou "B".`;

  const response = await provider.generateDraft(prompt, 'default', '0');
  const trimmed = response.trim().toUpperCase();

  if (trimmed.includes('A')) return 'DRAMATURGE';
  return 'MUSICIEN';
}
