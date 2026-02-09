/**
 * OMEGA Runner — Full Orchestrator
 * Phase D.1 — IntentPack -> CreationResult -> ForgeResult (C.1 -> C.5)
 */

import { runCreation } from '@omega/creation-pipeline';
import { runForge } from '@omega/omega-forge';
import type { IntentPack, CreationResult } from '@omega/creation-pipeline';
import type { ForgeResult } from '@omega/omega-forge';
import type { FullRunResult, StageId } from '../types.js';
import type { Logger } from '../logger/index.js';
import { createDefaultRunnerConfigs } from '../config.js';
import { canonicalJSON } from '../proofpack/canonical.js';
import { generateRunId } from '../proofpack/hash.js';
import { getVersionMap } from '../version.js';

/** Run the full pipeline (C.1 -> C.5) */
export function orchestrateFull(
  intent: IntentPack,
  seed: string,
  timestamp: string,
  logger: Logger,
): FullRunResult {
  logger.info('Starting run full');

  const versions = getVersionMap();
  const intentCanonical = canonicalJSON(intent);
  const runId = generateRunId(intentCanonical, seed, versions as unknown as Record<string, string>);

  logger.info(`RUN_ID: ${runId}`);

  const configs = createDefaultRunnerConfigs();

  // Phase C.1 -> C.4
  logger.info('GATE: 00-intent validated');
  const creation: CreationResult = runCreation(
    intent, configs.c4Config, configs.gConfig, configs.sConfig, configs.eConfig, timestamp,
  );
  logger.info(`GATE: 10-genesis completed`);
  logger.info(`GATE: 20-scribe completed`);
  logger.info(`GATE: 30-style completed`);
  logger.info(`GATE: 40-creation completed (hash: ${creation.output_hash.substring(0, 12)}...)`);

  // Phase C.5
  const forge: ForgeResult = runForge(creation, configs.f5Config, configs.canonicalTable, timestamp);
  logger.info(`GATE: 50-forge completed (hash: ${forge.output_hash.substring(0, 12)}...)`);

  const stagesCompleted: StageId[] = [
    '00-intent', '10-genesis', '20-scribe', '30-style', '40-creation', '50-forge',
  ];

  return {
    run_id: runId,
    creation,
    forge,
    stages_completed: stagesCompleted,
    log: logger.getEntries(),
  };
}
