/**
 * OMEGA Governance — CLI Drift Command
 * Phase D.2
 */

import { writeFileSync } from 'node:fs';
import type { GovParsedArgs } from '../parser.js';
import { readProofPack } from '../../core/reader.js';
import { validateProofPack } from '../../core/validator.js';
import { createConfig } from '../../core/config.js';
import { detectDrift } from '../../drift/detector.js';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR, EXIT_PROOFPACK_INVALID, EXIT_IO_ERROR, EXIT_DRIFT_DETECTED } from '../../core/types.js';

/** Execute drift command */
export function executeDrift(args: GovParsedArgs): number {
  if (!args.baseline || !args.candidate) {
    console.error('Error: --baseline and --candidate are required');
    return EXIT_USAGE_ERROR;
  }

  try {
    const config = createConfig();

    const baselineData = readProofPack(args.baseline);
    const baselineValidation = validateProofPack(baselineData);
    if (!baselineValidation.valid) {
      console.error(`Error: Baseline ProofPack invalid`);
      return EXIT_PROOFPACK_INVALID;
    }

    const candidateData = readProofPack(args.candidate);
    const candidateValidation = validateProofPack(candidateData);
    if (!candidateValidation.valid) {
      console.error(`Error: Candidate ProofPack invalid`);
      return EXIT_PROOFPACK_INVALID;
    }

    const report = detectDrift(baselineData, candidateData, config);
    const output = JSON.stringify(report, null, 2);

    if (args.out) {
      writeFileSync(args.out, output, 'utf-8');
      console.log(`Drift report written to ${args.out}`);
    } else {
      console.log(output);
    }

    if (report.level !== 'NO_DRIFT') {
      return EXIT_DRIFT_DETECTED;
    }

    return EXIT_SUCCESS;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_IO_ERROR;
  }
}
