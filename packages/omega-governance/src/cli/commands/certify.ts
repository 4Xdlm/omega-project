/**
 * OMEGA Governance — CLI Certify Command
 * Phase D.2
 */

import { writeFileSync } from 'node:fs';
import type { GovParsedArgs } from '../parser.js';
import { readProofPack } from '../../core/reader.js';
import { validateProofPack } from '../../core/validator.js';
import { createConfig } from '../../core/config.js';
import { certifyRun } from '../../certify/certifier.js';
import { certificateToJSON } from '../../certify/template.js';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR, EXIT_PROOFPACK_INVALID, EXIT_IO_ERROR, EXIT_CERTIFICATION_FAIL } from '../../core/types.js';

/** Execute certify command */
export function executeCertify(args: GovParsedArgs): number {
  if (!args.run) {
    console.error('Error: --run is required');
    return EXIT_USAGE_ERROR;
  }

  try {
    const config = createConfig();
    const data = readProofPack(args.run);
    const validation = validateProofPack(data);
    if (!validation.valid) {
      console.error('Error: ProofPack invalid');
      return EXIT_PROOFPACK_INVALID;
    }

    const cert = certifyRun(data, config);
    const output = certificateToJSON(cert);

    if (args.out) {
      writeFileSync(args.out, output, 'utf-8');
      console.log(`Certificate written to ${args.out}`);
    } else {
      console.log(output);
    }

    if (cert.verdict === 'FAIL') {
      return EXIT_CERTIFICATION_FAIL;
    }

    return EXIT_SUCCESS;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_IO_ERROR;
  }
}
