/**
 * OMEGA Creation Pipeline — F2: Scribe (C.2)
 * Phase C.4 — Run scribe engine
 */

import { runScribe } from '@omega/scribe-engine';
import type { SConfig } from '@omega/scribe-engine';
import type { IntentPack, StageResult, GenesisPlan, ScribeOutput, ScribeReport } from '../types.js';

export function stageScribe(
  plan: GenesisPlan,
  input: IntentPack,
  sConfig: SConfig,
  timestamp: string,
): StageResult & { readonly scribeOutput: ScribeOutput; readonly scribeReport: ScribeReport } {
  const { output, report } = runScribe(
    plan,
    input.canon,
    input.genome,
    input.emotion,
    input.constraints,
    sConfig,
    timestamp,
  );

  return {
    stage: 'F2',
    verdict: 'PASS',
    input_hash: plan.plan_hash,
    output_hash: output.output_hash,
    duration_ms: 0,
    details: `Scribe output: ${output.final_prose.paragraphs.length} paragraphs, ${output.final_prose.total_word_count} words`,
    timestamp_deterministic: timestamp,
    scribeOutput: output,
    scribeReport: report,
  };
}
