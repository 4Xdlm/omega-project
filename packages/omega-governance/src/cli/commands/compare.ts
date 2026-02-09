/**
 * OMEGA Governance — CLI Compare Command
 * Phase D.2
 */

import { writeFileSync } from 'node:fs';
import type { GovParsedArgs } from '../parser.js';
import { readProofPack } from '../../core/reader.js';
import { validateProofPack } from '../../core/validator.js';
import { compareMultipleRuns } from '../../compare/run-differ.js';
import { buildCompareReport } from '../../compare/report-builder.js';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR, EXIT_PROOFPACK_INVALID, EXIT_IO_ERROR } from '../../core/types.js';

/** Execute compare command */
export function executeCompare(args: GovParsedArgs): number {
  if (!args.runs) {
    console.error('Error: --runs is required (comma-separated directories)');
    return EXIT_USAGE_ERROR;
  }

  const runDirs = args.runs.split(',').map((d) => d.trim());
  if (runDirs.length < 2) {
    console.error('Error: at least 2 runs required for comparison');
    return EXIT_USAGE_ERROR;
  }

  try {
    const packs = runDirs.map((dir) => {
      const data = readProofPack(dir);
      const validation = validateProofPack(data);
      if (!validation.valid) {
        throw new Error(`ProofPack invalid at ${dir}: ${validation.checks.filter((c) => c.status === 'FAIL').map((c) => c.message).join('; ')}`);
      }
      return data;
    });

    const results = compareMultipleRuns(packs);
    const report = buildCompareReport(results);
    const output = JSON.stringify(report, null, 2);

    if (args.out) {
      writeFileSync(args.out, output, 'utf-8');
      console.log(`Compare report written to ${args.out}`);
    } else {
      console.log(output);
    }

    return EXIT_SUCCESS;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('ProofPack invalid')) {
      console.error(`Error: ${msg}`);
      return EXIT_PROOFPACK_INVALID;
    }
    console.error(`Error: ${msg}`);
    return EXIT_IO_ERROR;
  }
}
