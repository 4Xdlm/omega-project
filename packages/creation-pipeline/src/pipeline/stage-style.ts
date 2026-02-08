/**
 * OMEGA Creation Pipeline — F3: Style (C.3)
 * Phase C.4 — Run style emergence engine
 */

import { runStyleEmergence } from '@omega/style-emergence-engine';
import type { EConfig } from '@omega/style-emergence-engine';
import type { IntentPack, StageResult, ScribeOutput, StyledOutput, StyleReport } from '../types.js';

export function stageStyle(
  scribeOutput: ScribeOutput,
  input: IntentPack,
  eConfig: EConfig,
  timestamp: string,
): StageResult & { readonly styleOutput: StyledOutput; readonly styleReport: StyleReport } {
  const { output, report } = runStyleEmergence(
    scribeOutput,
    input.genome,
    input.constraints,
    eConfig,
    timestamp,
  );

  return {
    stage: 'F3',
    verdict: 'PASS',
    input_hash: scribeOutput.output_hash,
    output_hash: output.output_hash,
    duration_ms: 0,
    details: `Style output: ${output.paragraphs.length} paragraphs, tournament ${output.tournament.total_rounds} rounds`,
    timestamp_deterministic: timestamp,
    styleOutput: output,
    styleReport: report,
  };
}
