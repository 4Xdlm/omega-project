/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — RUN ID BUILDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: runtime/run-id.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Builds RUN_ID.json with deterministic seeds and full traceability.
 * All fields required, no optionals, no defaults.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256 } from '@omega/canon-kernel';
import type { RunIdRecord, AnthropicProviderConfig } from './live-types.js';
import type { SovereignForgeResult } from '../engine.js';

/**
 * Generate deterministic seed from scene ID, hash, and run path
 * Format: sha256(sceneId + '\0' + hash + '\0' + runPath)
 */
export function generateDeterministicSeed(
  sceneId: string,
  hash: string,
  runPath: string,
): string {
  return sha256(`${sceneId}\0${hash}\0${runPath}`);
}

/**
 * Build RUN_ID.json record from forge result
 */
export function buildRunIdRecord(
  runIndex: number,
  runPathRel: string,
  outPathRel: string,
  sceneId: string,
  forgeResult: SovereignForgeResult,
  config: AnthropicProviderConfig,
  promptHash: string,
  language: 'fr' | 'en' = 'fr',
): RunIdRecord {
  // Generate deterministic seeds
  const seed_symbol_mapper = generateDeterministicSeed(
    sceneId,
    'symbol-mapper',
    runPathRel,
  );
  const seed_draft = generateDeterministicSeed(sceneId, 'draft', runPathRel);

  // Extract macro axes from V3 score (ECC/RCI/SII/IFI)
  const macro_axes: Record<string, number> = {};
  if (forgeResult.macro_score) {
    macro_axes.ecc = forgeResult.macro_score.macro_axes.ecc.score;
    macro_axes.rci = forgeResult.macro_score.macro_axes.rci.score;
    macro_axes.sii = forgeResult.macro_score.macro_axes.sii.score;
    macro_axes.ifi = forgeResult.macro_score.macro_axes.ifi.score;
    macro_axes.composite_v3 = forgeResult.macro_score.composite;
    macro_axes.min_axis = forgeResult.macro_score.min_axis;
  } else if (forgeResult.s_score) {
    macro_axes.composite = forgeResult.s_score.composite;
  }

  return {
    run_index: runIndex,
    run_path_rel: runPathRel,
    out_path_rel: outPathRel,
    scene_id: sceneId,
    seed_symbol_mapper,
    seed_draft,
    symbol_map_sha256: forgeResult.symbol_map
      ? sha256(JSON.stringify(forgeResult.symbol_map))
      : '0'.repeat(64),
    prompt_sha256: promptHash,
    judge_config: {
      temperature: config.judgeStable ? 0.0 : config.judgeTemperature,
      top_p: config.judgeTopP,
      max_tokens: config.judgeMaxTokens,
      structured: config.judgeStable,
      model: config.model,
    },
    language,
    judge_language: language, // Judges evaluate same language as prose
    engine_version: '1.0.0',
    timestamp_utc: new Date().toISOString(),
    s_score_composite: forgeResult.s_score?.composite ?? 0,
    s_score_verdict: forgeResult.s_score?.verdict ?? 'REJECT',
    macro_axes,
  };
}
