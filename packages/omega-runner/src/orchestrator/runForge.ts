/**
 * OMEGA Runner — Forge Orchestrator
 * Phase D.1 — CreationResult -> ForgeResult (C.5)
 */

import { runForge } from '@omega/omega-forge';
import type { CreationResult } from '@omega/creation-pipeline';
import type { ForgeResult } from '@omega/omega-forge';
import type { ForgeRunResult, StageId } from '../types.js';
import type { Logger } from '../logger/index.js';
import { createDefaultRunnerConfigs } from '../config.js';
import { canonicalJSON } from '../proofpack/canonical.js';
import { generateRunId } from '../proofpack/hash.js';
import { getVersionMap } from '../version.js';

/** Run the forge analysis (C.5) on existing CreationResult */
export function orchestrateForge(
  creation: CreationResult,
  seed: string,
  timestamp: string,
  logger: Logger,
): ForgeRunResult {
  logger.info('Starting run forge');

  const versions = getVersionMap();
  const inputCanonical = canonicalJSON({
    pipeline_id: creation.pipeline_id,
    output_hash: creation.output_hash,
  });
  const runId = generateRunId(inputCanonical, seed, versions as unknown as Record<string, string>);

  logger.info(`RUN_ID: ${runId}`);

  const configs = createDefaultRunnerConfigs();

  // Run C.5
  const forge: ForgeResult = runForge(creation, configs.f5Config, configs.canonicalTable, timestamp);
  const stagesCompleted: StageId[] = ['50-forge'];
  logger.info(`GATE: 50-forge completed (hash: ${forge.output_hash.substring(0, 12)}...)`);

  return {
    run_id: runId,
    forge,
    stages_completed: stagesCompleted,
    log: logger.getEntries(),
  };
}
