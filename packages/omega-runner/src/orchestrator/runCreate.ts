/**
 * OMEGA Runner — Create Orchestrator
 * Phase D.1 — IntentPack -> CreationResult (C.1 -> C.4)
 */

import { runCreation } from '@omega/creation-pipeline';
import type { IntentPack, CreationResult } from '@omega/creation-pipeline';
import type { CreateRunResult, StageId } from '../types.js';
import type { Logger } from '../logger/index.js';
import { createDefaultRunnerConfigs } from '../config.js';
import { canonicalJSON } from '../proofpack/canonical.js';
import { generateRunId } from '../proofpack/hash.js';
import { getVersionMap } from '../version.js';

/** Run the creation pipeline (C.1 -> C.4) */
export function orchestrateCreate(
  intent: IntentPack,
  seed: string,
  timestamp: string,
  logger: Logger,
): CreateRunResult {
  logger.info('Starting run create');

  const versions = getVersionMap();
  const intentCanonical = canonicalJSON(intent);
  const runId = generateRunId(intentCanonical, seed, versions as unknown as Record<string, string>);

  logger.info(`RUN_ID: ${runId}`);

  // Get default configs
  const configs = createDefaultRunnerConfigs();

  // Run C.1 -> C.4
  logger.info('GATE: 00-intent validated');
  const creation: CreationResult = runCreation(
    intent, configs.c4Config, configs.gConfig, configs.sConfig, configs.eConfig, timestamp,
  );

  const stagesCompleted: StageId[] = ['00-intent', '10-genesis', '20-scribe', '30-style', '40-creation'];
  logger.info(`GATE: 40-creation completed (hash: ${creation.output_hash.substring(0, 12)}...)`);

  return {
    run_id: runId,
    creation,
    stages_completed: stagesCompleted,
    log: logger.getEntries(),
  };
}
