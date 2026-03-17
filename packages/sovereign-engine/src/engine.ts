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
// ★ Sprint 1: Instrumentation — measure rhythm CALC before/after each polish pass
import { scoreRhythm } from './oracle/axes/rhythm.js';
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
import { buildQualityReport, type QualityM12Report } from './quality/quality-bridge.js';
// ★ V3: Constraint Compiler
import { compilePartition, isV3Active } from './compiler/prompt-compiler.js';
import { analyzePreFlight, dumpPartition } from './compiler/static-analyzer.js';
import type { CompiledPartition } from './compiler/types.js';
import { DEFAULT_COMPILER_CONFIG } from './compiler/types.js';
import { LOT1_INSTRUCTIONS } from './prose-directive/lot1-instructions.js';
import { LOT2_INSTRUCTIONS } from './prose-directive/lot2-instructions.js';
import { LOT3_INSTRUCTIONS } from './prose-directive/lot3-instructions.js';
import type { CDEInput } from './cde/types.js';
// ★ P5: Targeted Patch
import { runTargetedPatch, isTargetedPatchActive } from './polish/targeted-patch.js';
// ★ V4: Native Prompt
import { isV4Active, buildSovereignPrompt_V4 } from './input/prompt-assembler-v4.js';
// ★ V4.3 Sprint 2: Semantic Slicer replaces paragraph guard (CALC pure, 0 API)
import { applySemanticSlicing } from './guards/semantic-slicer.js';
// ★ V4.3 Sprint 3C: Micro-surgeon — targeted tension_14d interventions
import { runMicroSurgery } from './microsurgery/micro-surgeon.js';

export interface SovereignForgeResult {
  readonly version: '2.0.0'; // Sprint 6.3 (Roadmap 4.4): Version field for compat guard
  readonly final_prose: string;
  readonly s_score: SScore;
  readonly macro_score: MacroSScore | null; // v3: 4 macro-axes ECC/RCI/SII/IFI
  readonly verdict: 'SEAL' | 'REJECT';
  readonly loop_result: SovereignLoopResult;
  readonly passes_executed: number;
  readonly symbol_map?: SymbolMap;
  readonly physics_audit?: PhysicsAuditResult; // Sprint 3.1: Physics Audit (informatif)
  readonly prescriptions?: import('./prescriptions/types.js').Prescription[]; // Sprint 3.3: Prescriptions chirurgicales
  readonly quality_m12?: QualityM12Report; // Sprint 6.1 (Roadmap 4.1): Quality M1-M12 rapport annexe (INFORMATIF)
  /** U-ROSETTE-10: expose le ForgePacket enrichi pour le Polish Engine post-génération */
  readonly forge_packet?: import('./types.js').ForgePacket;
}

export async function runSovereignForge(
  input: ForgePacketInput,
  provider: SovereignProvider,
  cdeInput?: CDEInput,
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

  // ★ V3: Compile partition if flag active (skip if V4)
  let partition: CompiledPartition | undefined;
  if (!isV4Active() && isV3Active()) {
    const allInstructions = [
      ...LOT1_INSTRUCTIONS,
      ...LOT2_INSTRUCTIONS,
      ...LOT3_INSTRUCTIONS,
    ];

    partition = compilePartition(
      enrichedPacket,
      cdeInput ?? null,
      {
        ...DEFAULT_COMPILER_CONFIG,
        shape: enrichedPacket.intent?.conflict_type ?? 'Confrontation',
      },
      allInstructions,
    );

    const preflight = analyzePreFlight(partition);
    console.log(`[V3] PreFlight: verdict=${preflight.verdict} cognitive_load=${preflight.cognitive_load_score} conflicts=${preflight.conflict_score}`);
    if (preflight.verdict === 'RED') {
      console.warn('[V3] PreFlight RED — partition may produce suboptimal results');
    }

    const dump = dumpPartition(partition);
    console.log(`[V3] Partition: ${partition.total_tokens}t | hash=${partition.partition_hash.slice(0, 12)}`);
  }

  // ★ Prompt selection: V4 > V3 > V2
  let prompt: import('./types.js').SovereignPrompt;
  if (isV4Active()) {
    prompt = buildSovereignPrompt_V4(enrichedPacket, symbolMap);
    console.log(`[V4] Prompt: ${Math.ceil(prompt.total_length / 4)}t | hash=${prompt.prompt_hash.slice(0, 12)}`);
  } else {
    prompt = buildSovereignPrompt(enrichedPacket, symbolMap, emotionBrief, partition);
  }

  let initialDraft = await provider.generateDraft(
    prompt.sections.map((s) => s.content).join('\n\n'),
    SOVEREIGN_CONFIG.DRAFT_MODES[0],
    enrichedPacket.seeds.llm_seed,
  );

  // ★ V4.3 Sprint 2: Semantic Slicer — CALC pure, 0 API calls
  // Guarantees >= 4 paragraphs for tension_14d scorer by splitting at sentence boundaries.
  // Replaces V4.2 paragraph guard (which used LLM retry = wasted API calls).
  if (isV4Active()) {
    const slicerResult = applySemanticSlicing(initialDraft);
    if (slicerResult.sliced) {
      console.log(`[V4.3] Slicer: ${slicerResult.original_paragraph_count} → ${slicerResult.final_paragraph_count} paragraphs`);
    }
    initialDraft = slicerResult.prose;
  }

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
    const seal_score_v3 = await judgeAestheticV3(enrichedPacket, loop_result.final_prose, provider, symbolMap, physicsAudit);

    if (seal_score_v3.verdict === 'SEAL') {
      // V1 SEAL + V3 SEAL = genuine SEAL
      // Sprint 6.1: Quality M1-M12 rapport annexe (INFORMATIF)
      const quality_m12 = buildQualityReport(loop_result.final_prose, enrichedPacket);

      return {
        version: '2.0.0',
        final_prose: loop_result.final_prose,
        s_score: loop_result.s_score_final,
        macro_score: seal_score_v3,
        verdict: 'SEAL',
        loop_result,
        passes_executed: loop_result.passes_executed,
        symbol_map: symbolMap,
        physics_audit: physicsAudit,
        prescriptions,
        quality_m12,
        forge_packet: enrichedPacket, // U-ROSETTE-10
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

  // ★ V4.3 Sprint 2: Semantic Slicer on duel winner
  if (isV4Active()) {
    const slicerResult = applySemanticSlicing(final_prose);
    if (slicerResult.sliced) {
      console.log(`[V4.3] Slicer (post-duel): ${slicerResult.original_paragraph_count} → ${slicerResult.final_paragraph_count} paragraphs`);
    }
    final_prose = slicerResult.prose;
  }

  // ★ Sprint 1 INSTRUMENTATION — measure rhythm CALC (kept for telemetry)
  const rhythmPrePolish = scoreRhythm(enrichedPacket, final_prose);
  console.log(`[POLISH-AUDIT] PRE-POLISH  | rhythm=${rhythmPrePolish.score.toFixed(1)} | ${rhythmPrePolish.details}`);

  // ★ Sprint 2: Polish DISABLED — proven NO-OP (delta 0.0 on ALL runs, V3 and V4)
  // polishRhythm, sweepCliches, enforceSignature all returned delta=0.0
  // Saving 3 API calls per run. Will be replaced by micro-surgery in Sprint 3.
  // final_prose = await polishRhythm(enrichedPacket, final_prose, provider);
  // final_prose = await sweepCliches(enrichedPacket, final_prose, provider);
  // final_prose = await enforceSignature(enrichedPacket, final_prose, provider);
  console.log(`[POLISH-AUDIT] Polish DISABLED (Sprint 2 — NO-OP proven). Saved 3 API calls.`);

  // ★ Sprint 3C: Micro-surgeon — targeted tension_14d interventions
  // Replaces the disabled polish with precision interventions.
  // Max 2 micro-LLM calls (~50 tokens each) on weakest quartiles.
  // Only triggers if keyword-based diagnostic finds similarity < 0.45.
  if (isV4Active()) {
    const surgeryResult = await runMicroSurgery(enrichedPacket, final_prose, provider, 'BALANCED');
    if (surgeryResult.interventions_applied > 0) {
      console.log(`[MICRO-SURGEON] ${surgeryResult.interventions_applied} applied, ${surgeryResult.interventions_rejected} rejected`);
      final_prose = surgeryResult.prose;
    }
  }

  // ★ NOUVEAU v3: Utiliser judgeAestheticV3 avec macro-axes
  const final_score_v3 = await judgeAestheticV3(enrichedPacket, final_prose, provider, symbolMap, physicsAudit);

  // ★ Sprint 3 PREP: Sub-score autopsy for RCI and SII
  // This telemetry identifies EXACTLY which sub-component drags each macro-axis down.
  // Required before any micro-surgery intervention.
  const ma = final_score_v3.macro_axes;
  console.log(`[AUTOPSY] ═══ SUB-SCORE DETAIL ═══`);
  console.log(`[AUTOPSY] RCI=${ma.rci.score.toFixed(1)} | sub-scores:`);
  for (const sub of ma.rci.sub_scores) {
    console.log(`  ${sub.name}=${sub.score.toFixed(1)} (w=${sub.weight}) [${sub.method}]`);
  }
  console.log(`  reasons+ ${ma.rci.reasons.top_contributors.join(', ')}`);
  console.log(`  reasons- ${ma.rci.reasons.top_penalties.join(', ')}`);
  console.log(`[AUTOPSY] SII=${ma.sii.score.toFixed(1)} | sub-scores:`);
  for (const sub of ma.sii.sub_scores) {
    console.log(`  ${sub.name}=${sub.score.toFixed(1)} (w=${sub.weight}) [${sub.method}]`);
  }
  console.log(`  reasons+ ${ma.sii.reasons.top_contributors.join(', ')}`);
  console.log(`  reasons- ${ma.sii.reasons.top_penalties.join(', ')}`);
  console.log(`[AUTOPSY] ECC=${ma.ecc.score.toFixed(1)} | sub-scores:`);
  for (const sub of ma.ecc.sub_scores) {
    console.log(`  ${sub.name}=${sub.score.toFixed(1)} (w=${sub.weight}) [${sub.method}]`);
  }
  console.log(`[AUTOPSY] IFI=${ma.ifi.score.toFixed(1)} | sub-scores:`);
  for (const sub of ma.ifi.sub_scores) {
    console.log(`  ${sub.name}=${sub.score.toFixed(1)} (w=${sub.weight}) [${sub.method}]`);
  }
  if (ma.ifi.bonuses.length > 0) {
    for (const b of ma.ifi.bonuses) {
      console.log(`  bonus: ${b.type}=${b.value} (triggered=${b.triggered}) ${b.detail}`);
    }
  }
  console.log(`[AUTOPSY] AAI=${ma.aai.score.toFixed(1)} | sub-scores:`);
  for (const sub of ma.aai.sub_scores) {
    console.log(`  ${sub.name}=${sub.score.toFixed(1)} (w=${sub.weight}) [${sub.method}]`);
  }
  console.log(`[AUTOPSY] ═══════════════════════`);

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

  // ★ P5: Targeted Patch — surgical pass on weakest axis
  let patchedProse = final_prose;
  let patchedScore = final_score_v3;
  let patchedSScore = final_score;

  if (isTargetedPatchActive() && final_score.verdict !== 'SEAL') {
    console.log('[P5] Targeted Patch active — attempting surgical pass...');
    const patchResult = await runTargetedPatch(
      enrichedPacket, final_prose, final_score_v3, provider,
      undefined, symbolMap, physicsAudit,
    );

    if (patchResult.accepted) {
      console.log(`[P5] Patch ACCEPTED: ${patchResult.target_axis} +${patchResult.target_delta.toFixed(1)}, composite ${patchResult.composite_before.toFixed(1)} → ${patchResult.composite_after.toFixed(1)}`);
      // Re-score the patched prose
      patchedProse = patchResult.patched_prose;
      patchedScore = await judgeAestheticV3(enrichedPacket, patchedProse, provider, symbolMap, physicsAudit);
      patchedSScore = {
        score_id: patchedScore.score_id,
        score_hash: patchedScore.score_hash,
        scene_id: patchedScore.scene_id,
        seed: patchedScore.seed,
        axes: {} as any,
        composite: patchedScore.composite,
        verdict: patchedScore.verdict === 'PITCH' ? 'REJECT' : patchedScore.verdict,
        emotion_weight_pct: patchedScore.emotion_weight_pct,
      };
    } else {
      console.log(`[P5] Patch REJECTED: ${patchResult.rollback_reason}`);
    }
  }

  // Sprint 6.1: Quality M1-M12 rapport annexe (INFORMATIF)
  const quality_m12 = buildQualityReport(patchedProse, enrichedPacket);

  return {
    version: '2.0.0',
    final_prose: patchedProse,
    s_score: patchedSScore,
    macro_score: patchedScore,
    verdict: patchedSScore.verdict,
    loop_result,
    passes_executed: loop_result.passes_executed + SOVEREIGN_CONFIG.MAX_DRAFTS,
    symbol_map: symbolMap,
    physics_audit: physicsAudit,
    prescriptions,
    quality_m12,
    forge_packet: enrichedPacket, // U-ROSETTE-10
  };
}
