/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — MAIN ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: engine.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Main entry point: runSovereignForge()
 * Full pipeline from GenesisPlan to sealed prose with 92/100 threshold.
 *
 * PIPELINE:
 * 1. Assemble FORGE_PACKET from GenesisPlan + inputs
 * 2. Validate FORGE_PACKET (FAIL HARD if incomplete)
 * 3. Generate SCENE_BATTLE_PLAN (0 token)
 * 4. Build SOVEREIGN_PROMPT
 * 5. Generate initial draft (via provider)
 * 6. Run SOVEREIGN_LOOP (delta → pitch → patch, max 2 passes)
 * 7. If still <92, run DUEL (3 drafts)
 * 8. Final POLISH (rhythm + cliché + signature)
 * 9. Final S_SCORE → SEAL or REJECT
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  SovereignProvider,
  SovereignLoopResult,
  SScore,
} from './types.js';

import { assembleForgePacket, type ForgePacketInput } from './input/forge-packet-assembler.js';
import { validateForgePacket } from './input/pre-write-validator.js';
import { simulateSceneBattle } from './input/pre-write-simulator.js';
import { buildSovereignPrompt } from './input/prompt-assembler-v2.js';
import { runSovereignLoop } from './pitch/sovereign-loop.js';
import { runDuel } from './duel/duel-engine.js';
import { polishRhythm } from './polish/musical-engine.js';
import { sweepCliches } from './polish/anti-cliche-sweep.js';
import { enforceSignature } from './polish/signature-enforcement.js';
import { judgeAesthetic, judgeAestheticV3 } from './oracle/aesthetic-oracle.js';
import { generateSymbolMap } from './symbol/symbol-mapper.js';
import type { SymbolMap } from './symbol/symbol-map-types.js';
import type { MacroSScore } from './oracle/s-score.js';
import { SOVEREIGN_CONFIG } from './config.js';
import { bridgeSignatureFromSymbolMap } from './input/signature-bridge.js';
import { runPhysicsAudit, type PhysicsAuditResult } from './oracle/physics-audit.js';
import { generatePrescriptions } from './prescriptions/index.js';
import { buildEmotionBriefFromPacket } from './input/emotion-brief-bridge.js';
import { DEFAULT_CANONICAL_TABLE } from '@omega/omega-forge';

export interface SovereignForgeResult {
  readonly final_prose: string;
  readonly s_score: SScore;
  readonly macro_score: MacroSScore | null; // v3: 4 macro-axes ECC/RCI/SII/IFI
  readonly verdict: 'SEAL' | 'REJECT';
  readonly loop_result: SovereignLoopResult;
  readonly passes_executed: number;
  readonly symbol_map?: SymbolMap;
  readonly physics_audit?: PhysicsAuditResult; // Sprint 3.1: Physics Audit (informatif)
  readonly prescriptions?: import('./prescriptions/types.js').Prescription[]; // Sprint 3.3: Prescriptions chirurgicales
}

export async function runSovereignForge(
  input: ForgePacketInput,
  provider: SovereignProvider,
): Promise<SovereignForgeResult> {
  const packet = assembleForgePacket(input);

  const validation = validateForgePacket(packet);
  if (!validation.valid) {
    throw new Error(`FORGE_PACKET validation failed: ${validation.errors.map((e) => e.message).join(', ')}`);
  }

  simulateSceneBattle(packet);

  // ★ NOUVEAU v3: Symbol Mapper (FAIL-CLOSED si échec)
  const symbolMap = await generateSymbolMap(packet, provider);

  // ★ BRIDGE: Enrich packet with signature hooks from symbol map
  // Extracts quartile hooks → style_genome.lexicon.signature_words
  // Extracts recurrent motifs → style_genome.imagery.recurrent_motifs
  const enrichedPacket = bridgeSignatureFromSymbolMap(packet, symbolMap);

  // ★ Sprint 4: Compute ForgeEmotionBrief from packet emotion_contract (SSOT omega-forge)
  let emotionBrief: import('@omega/omega-forge').ForgeEmotionBrief | undefined;
  try {
    emotionBrief = buildEmotionBriefFromPacket(enrichedPacket);
  } catch {
    // If emotion_contract incomplete, physics audit gracefully skipped (ENABLED check handles it)
    emotionBrief = undefined;
  }

  // Prompt avec symbol map + physics section injecté
  const prompt = buildSovereignPrompt(enrichedPacket, symbolMap, emotionBrief);

  const initialDraft = await provider.generateDraft(
    prompt.sections.map((s) => s.content).join('\n\n'),
    SOVEREIGN_CONFIG.DRAFT_MODES[0],
    enrichedPacket.seeds.llm_seed,
  );

  // ★ NOUVEAU Sprint 3.1: Physics Audit (post-generation, informatif)
  // Runs after draft generation, before sovereign loop
  // Physics audit provides prescriptions for the correction loop
  let physicsAudit: PhysicsAuditResult | undefined;
  if (emotionBrief && SOVEREIGN_CONFIG.PHYSICS_AUDIT_ENABLED) {
    physicsAudit = runPhysicsAudit(
      initialDraft,
      emotionBrief,
      DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      {
        enabled: SOVEREIGN_CONFIG.PHYSICS_AUDIT_ENABLED,
        ...SOVEREIGN_CONFIG.PHYSICS_AUDIT_WEIGHTS,
      },
    );
  }

  // ★ NOUVEAU Sprint 3.3: Prescriptions chirurgicales top-K
  const prescriptions = SOVEREIGN_CONFIG.PRESCRIPTIONS_ENABLED
    ? generatePrescriptions(physicsAudit, SOVEREIGN_CONFIG.PRESCRIPTIONS_TOP_K)
    : undefined;

  const loop_result = await runSovereignLoop(initialDraft, enrichedPacket, provider, physicsAudit);

  if (loop_result.verdict === 'SEAL') {
    // V3 is the AUTHORITY — check macro-axes before accepting SEAL
    const seal_score_v3 = await judgeAestheticV3(enrichedPacket, loop_result.final_prose, provider, symbolMap);

    if (seal_score_v3.verdict === 'SEAL') {
      // V1 SEAL + V3 SEAL = genuine SEAL
      return {
        final_prose: loop_result.final_prose,
        s_score: loop_result.s_score_final,
        macro_score: seal_score_v3,
        verdict: 'SEAL',
        loop_result,
        passes_executed: loop_result.passes_executed,
        symbol_map: symbolMap,
        physics_audit: physicsAudit,
        prescriptions,
      };
    }
    // V1 says SEAL but V3 says REJECT/PITCH → V3 wins, continue to duel+polish
    // Fall through to duel path
  }

  // Pass loop's refined prose as candidate + symbolMap for V3 selection
  const loopProse = loop_result.final_prose;
  const duel_result = await runDuel(
    enrichedPacket,
    prompt.sections.map((s) => s.content).join('\n\n'),
    provider,
    loopProse,
    symbolMap,
  );

  let final_prose = duel_result.final_prose;

  final_prose = polishRhythm(enrichedPacket, final_prose);
  final_prose = sweepCliches(enrichedPacket, final_prose);
  final_prose = enforceSignature(enrichedPacket, final_prose);

  // ★ NOUVEAU v3: Utiliser judgeAestheticV3 avec macro-axes
  const final_score_v3 = await judgeAestheticV3(enrichedPacket, final_prose, provider, symbolMap);

  // Convertir en SScore pour backward compatibility
  const final_score: SScore = {
    score_id: final_score_v3.score_id,
    score_hash: final_score_v3.score_hash,
    scene_id: final_score_v3.scene_id,
    seed: final_score_v3.seed,
    axes: {} as any, // Non utilisé en v3
    composite: final_score_v3.composite,
    verdict: final_score_v3.verdict === 'PITCH' ? 'REJECT' : final_score_v3.verdict,
    emotion_weight_pct: final_score_v3.emotion_weight_pct,
  };

  return {
    final_prose,
    s_score: final_score,
    macro_score: final_score_v3,
    verdict: final_score.verdict,
    loop_result,
    passes_executed: loop_result.passes_executed + SOVEREIGN_CONFIG.MAX_DRAFTS,
    symbol_map: symbolMap,
    physics_audit: physicsAudit,
    prescriptions,
  };
}
