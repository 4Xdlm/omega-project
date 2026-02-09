/**
 * OMEGA Runner — CLI: verify
 * Phase D.1 — Verify ProofPack integrity
 */

import type { ParsedArgs } from '../../types.js';
import { EXIT_SUCCESS, EXIT_VERIFY_FAIL, EXIT_IO_ERROR } from '../../types.js';
import { verifyProofPack } from '../../proofpack/verify.js';

/** Execute the verify command */
export function executeVerify(args: ParsedArgs): number {
  try {
    const result = verifyProofPack(args.dir!, args.strict);

    if (result.valid) {
      return EXIT_SUCCESS;
    }
    return EXIT_VERIFY_FAIL;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ENOENT') || msg.includes('no such file')) return EXIT_IO_ERROR;
    return EXIT_VERIFY_FAIL;
  }
}
