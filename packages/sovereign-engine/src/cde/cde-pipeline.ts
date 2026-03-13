/**
 * cde-pipeline.ts — CDE-aware wrapper autour de runSovereignForge
 * Sprint V-PROTO
 *
 * Pipeline :
 *   1. distillBrief(cdeInput) -> SceneBrief
 *   2. Inject SceneBrief dans ForgePacketInput.scene.objective
 *      (APPEND — ne remplace pas, ajoute en suffixe compact)
 *   3. runSovereignForge(forgeInput, provider) -> SovereignForgeResult
 *   4. extractDelta(prose, context) -> StateDelta
 *   5. Retourner CDESceneResult complet
 *
 * Invariants :
 *   INV-PROTO-01 : Le SceneBrief est TOUJOURS logue avant generation
 *   INV-PROTO-02 : Le StateDelta est TOUJOURS extrait apres generation
 *   INV-PROTO-03 : ForgePacketInput original non mute — clone avant injection
 *   INV-PROTO-04 : Si distillBrief() echoue -> CDEError propagee (fail-closed)
 *   INV-PROTO-05 : Si extractDelta() echoue -> delta_error logue, pas d'exception
 *                  (generation reussie ne doit pas etre perdue pour un delta rate)
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import type { SovereignProvider } from '../types.js';
import type { ForgePacketInput } from '../input/forge-packet-assembler.js';
import { runSovereignForge, type SovereignForgeResult } from '../engine.js';
import type { CDEInput, SceneBrief, StateDelta } from './types.js';
import { distillBrief } from './distiller.js';
import { extractDelta } from './delta-extractor.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CDESceneResult {
  readonly scene_index:    number;                // 0-based dans la chaine
  readonly brief:          SceneBrief;            // brief injecte avant generation
  readonly forge_result:   SovereignForgeResult;  // resultat generation Phase U
  readonly delta:          StateDelta | null;      // delta extrait (null si INV-PROTO-05)
  readonly delta_error?:   string;                // erreur delta si applicable
  readonly created_at:     string;                // ISO 8601
}

export interface CDEPipelineConfig {
  readonly scene_index:  number;
  readonly cde_input:    CDEInput;
  readonly forge_input:  ForgePacketInput;
}

// ── Brief formatting ─────────────────────────────────────────────────────────

/**
 * Format a SceneBrief into a compact text block for injection.
 * INV-PROTO-01 : always logged before generation.
 */
export function formatBriefText(brief: SceneBrief): string {
  return [
    `RESTE VRAI: ${brief.must_remain_true}`,
    `TENSION: ${brief.in_tension}`,
    `BOUGER: ${brief.must_move}`,
    `INTERDIT: ${brief.must_not_break}`,
  ].join('\n');
}

/**
 * Inject SceneBrief into ForgePacketInput by cloning and appending to scene.objective.
 * INV-PROTO-03 : original input is never mutated.
 */
export function injectBriefIntoForgeInput(
  forgeInput: ForgePacketInput,
  brief: SceneBrief,
): ForgePacketInput {
  const briefText = formatBriefText(brief);
  const scene = forgeInput.scene;
  const injectedObjective = `${scene.objective}\n\n[CDE BRIEF]\n${briefText}`;

  return {
    ...forgeInput,
    scene: { ...scene, objective: injectedObjective },
  };
}

// ── Main pipeline function ───────────────────────────────────────────────────

/**
 * runCDEScene() — Execute the CDE-aware pipeline for a single scene.
 *
 * @throws CDEError if distillBrief() fails (INV-PROTO-04, fail-closed)
 * @throws Error if runSovereignForge() fails (propagated)
 */
export async function runCDEScene(
  config: CDEPipelineConfig,
  provider: SovereignProvider,
): Promise<CDESceneResult> {
  const now = new Date().toISOString();

  // 1. Distill brief — INV-PROTO-04 : fail-closed on error
  const brief = distillBrief(config.cde_input);

  // INV-PROTO-01 : log brief before generation
  console.log(`[CDE] Scene ${config.scene_index} | Brief ${brief.token_estimate}t | hash=${brief.input_hash.slice(0, 12)}`);

  // 2. Inject brief into forge input — INV-PROTO-03 : clone, no mutation
  const forgeInputWithBrief = injectBriefIntoForgeInput(config.forge_input, brief);

  // 3. Run generation
  const forgeResult = await runSovereignForge(forgeInputWithBrief, provider);

  // 4. Extract delta — INV-PROTO-05 : soft-fail on error
  let delta: StateDelta | null = null;
  let deltaError: string | undefined;

  try {
    delta = extractDelta(forgeResult.final_prose, {
      canon_facts: config.cde_input.canon_facts,
      open_debts:  config.cde_input.open_debts,
      arc_states:  config.cde_input.arc_states,
    });
  } catch (err) {
    // INV-PROTO-05 : generation succeeded — don't lose prose over delta failure
    deltaError = err instanceof Error ? err.message : String(err);
    console.warn(`[CDE] Delta extraction failed for scene ${config.scene_index}: ${deltaError}`);
  }

  return {
    scene_index: config.scene_index,
    brief,
    forge_result: forgeResult,
    delta,
    delta_error: deltaError,
    created_at:  now,
  };
}
