/**
 * OMEGA Creation Pipeline — F1: Genesis (C.1)
 * Phase C.4 — Run genesis planner
 */

import { createGenesisPlan } from '@omega/genesis-planner';
import type { GConfig } from '@omega/genesis-planner';
import type { IntentPack, StageResult, GenesisPlan, GenesisReport } from '../types.js';

export function stageGenesis(
  input: IntentPack,
  inputHash: string,
  gConfig: GConfig,
  timestamp: string,
): StageResult & { readonly plan: GenesisPlan; readonly genesisReport: GenesisReport } {
  const { plan, report } = createGenesisPlan(
    input.intent,
    input.canon,
    input.constraints,
    input.genome,
    input.emotion,
    gConfig,
    timestamp,
  );

  return {
    stage: 'F1',
    verdict: 'PASS',
    input_hash: inputHash,
    output_hash: plan.plan_hash,
    duration_ms: 0,
    details: `Genesis plan created: ${plan.arcs.length} arcs, ${plan.scene_count} scenes, ${plan.beat_count} beats`,
    timestamp_deterministic: timestamp,
    plan,
    genesisReport: report,
  };
}
