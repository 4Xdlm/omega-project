/**
 * OMEGA Runner — CLI: run full
 * Phase D.1 — IntentPack -> CreationResult -> ForgeReport
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IntentPack } from '@omega/creation-pipeline';
import type { ParsedArgs, StageId } from '../../types.js';
import { EXIT_SUCCESS, EXIT_IO_ERROR, EXIT_GENERIC_ERROR } from '../../types.js';
import { createLogger } from '../../logger/index.js';
import { orchestrateFull } from '../../orchestrator/runFull.js';
import { canonicalJSON } from '../../proofpack/canonical.js';
import { hashString } from '../../proofpack/hash.js';
import { writeProofPack, type StageArtifact } from '../../proofpack/write.js';
import { getVersionMap } from '../../version.js';

/** Execute the run-full command */
export function executeRunFull(args: ParsedArgs): number {
  const logger = createLogger();

  try {
    const intentRaw = readFileSync(args.intent!, 'utf8');
    const intent = JSON.parse(intentRaw) as IntentPack;
    const seed = args.seed ?? '';
    const timestamp = '2026-01-01T00:00:00.000Z';

    const result = orchestrateFull(intent, seed, timestamp, logger);
    const runDir = join(args.out!, 'runs', result.run_id);

    const creation = result.creation;
    const forge = result.forge;
    const intentCanonical = canonicalJSON(intent);

    const artifacts: StageArtifact[] = [
      { stage: '00-intent', filename: 'intent.json', content: intentCanonical },
      { stage: '10-genesis', filename: 'genesis-plan.json', content: canonicalJSON(creation.genesis_plan) },
      { stage: '20-scribe', filename: 'scribe-output.json', content: canonicalJSON(creation.scribe_output) },
      { stage: '30-style', filename: 'styled-output.json', content: canonicalJSON(creation.style_output) },
      { stage: '40-creation', filename: 'creation-result.json', content: canonicalJSON(creation) },
      { stage: '50-forge', filename: 'forge-report.json', content: canonicalJSON(forge.forge_report) },
    ];

    const intentHash = hashString(intentCanonical);
    const finalHash = forge.output_hash;
    const verdict = forge.verdict;
    const stagesCompleted: StageId[] = [
      '00-intent', '10-genesis', '20-scribe', '30-style', '40-creation', '50-forge',
    ];

    writeProofPack(
      runDir, result.run_id, seed, getVersionMap(),
      artifacts, intentHash, finalHash, verdict, stagesCompleted,
      canonicalJSON({ run_id: result.run_id, verdict }),
      `# Full Run ${result.run_id}\n\nVerdict: ${verdict}\n`,
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
