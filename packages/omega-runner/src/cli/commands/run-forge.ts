/**
 * OMEGA Runner — CLI: run forge
 * Phase D.1 — CreationResult -> ForgeReport
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CreationResult } from '@omega/creation-pipeline';
import type { ParsedArgs, StageId } from '../../types.js';
import { EXIT_SUCCESS, EXIT_IO_ERROR, EXIT_GENERIC_ERROR } from '../../types.js';
import { createLogger } from '../../logger/index.js';
import { orchestrateForge } from '../../orchestrator/runForge.js';
import { canonicalJSON } from '../../proofpack/canonical.js';
import { hashString } from '../../proofpack/hash.js';
import { writeProofPack, type StageArtifact } from '../../proofpack/write.js';
import { getVersionMap } from '../../version.js';

/** Execute the run-forge command */
export function executeRunForge(args: ParsedArgs): number {
  const logger = createLogger();

  try {
    const inputRaw = readFileSync(args.input!, 'utf8');
    const creation = JSON.parse(inputRaw) as CreationResult;
    const seed = args.seed ?? '';
    const timestamp = '2026-01-01T00:00:00.000Z';

    const result = orchestrateForge(creation, seed, timestamp, logger);
    const runDir = join(args.out!, 'runs', result.run_id);

    const forge = result.forge;

    const artifacts: StageArtifact[] = [
      { stage: '50-forge', filename: 'forge-report.json', content: canonicalJSON(forge.forge_report) },
    ];

    const inputHash = hashString(canonicalJSON(creation));
    const finalHash = forge.output_hash;
    const verdict = forge.verdict;
    const stagesCompleted: StageId[] = ['50-forge'];

    writeProofPack(
      runDir, result.run_id, seed, getVersionMap(),
      artifacts, inputHash, finalHash, verdict, stagesCompleted,
      canonicalJSON({ run_id: result.run_id, verdict }),
      `# Forge Run ${result.run_id}\n\nVerdict: ${verdict}\n`,
      logger.toText(),
      logger,
    );

    return EXIT_SUCCESS;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(msg);
    if (msg.includes('ENOENT') || msg.includes('no such file')) return EXIT_IO_ERROR;
    return EXIT_GENERIC_ERROR;
  }
}
