/**
 * OMEGA Runner Verifier v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Verifies run directory integrity (read-only).
 *
 * INVARIANTS:
 * - I-INV-05: Verify does not call Forge/TruthGate/Delivery
 * - I-INV-10: Verify mode zero writes
 *
 * SPEC: RUNNER_SPEC v1.2 §I
 */

import type { VerifyResult, HashMismatch, ExitCode as ExitCodeType } from './types';
import { ExitCode, RUN_FILES, HASHABLE_FILES } from './types';
import {
  getRunDirectory,
  readRunFile,
  readHashesFile,
  readRunHash,
  listRunFiles,
} from './run-directory';
import { computeHash, computeChainHash } from './pipeline';

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifies a single file hash.
 *
 * @param content - File content
 * @param expectedHash - Expected hash
 * @returns true if hash matches
 */
export function verifyFileHash(content: string, expectedHash: string): boolean {
  const actualHash = computeHash(content);
  return actualHash === expectedHash;
}

/**
 * Verifies all file hashes in run directory.
 * I-INV-10: Read-only operation.
 *
 * @param runPath - Path to run directory
 * @returns Verification result
 */
export function verifyHashes(runPath: string): VerifyResult {
  const runDir = getRunDirectory(runPath);
  const mismatches: HashMismatch[] = [];
  let filesChecked = 0;
  let filesValid = 0;

  if (!runDir.exists) {
    return Object.freeze({
      success: false,
      exitCode: ExitCode.VERIFY_FAIL,
      mismatches: Object.freeze([{
        file: runPath,
        expected: 'directory',
        actual: 'not found',
      }]),
      filesChecked: 0,
      filesValid: 0,
    });
  }

  // Read recorded hashes
  const recordedHashes = readHashesFile(runDir);

  // Verify each recorded file
  for (const [filename, expectedHash] of recordedHashes) {
    filesChecked++;

    const content = readRunFile(runDir, filename);
    if (content === null) {
      mismatches.push({
        file: filename,
        expected: expectedHash,
        actual: 'file not found',
      });
      continue;
    }

    const actualHash = computeHash(content);
    if (actualHash !== expectedHash) {
      mismatches.push({
        file: filename,
        expected: expectedHash,
        actual: actualHash,
      });
      continue;
    }

    filesValid++;
  }

  return Object.freeze({
    success: mismatches.length === 0,
    exitCode: mismatches.length === 0 ? ExitCode.PASS : ExitCode.VERIFY_FAIL,
    mismatches: Object.freeze(mismatches),
    filesChecked,
    filesValid,
  });
}

/**
 * Verifies run hash integrity.
 * Recomputes hash chain and compares to recorded hash.
 *
 * @param runPath - Path to run directory
 * @returns Verification result
 */
export function verifyRunHash(runPath: string): VerifyResult {
  const runDir = getRunDirectory(runPath);

  if (!runDir.exists) {
    return Object.freeze({
      success: false,
      exitCode: ExitCode.VERIFY_FAIL,
      mismatches: Object.freeze([{
        file: runPath,
        expected: 'directory',
        actual: 'not found',
      }]),
      filesChecked: 0,
      filesValid: 0,
    });
  }

  // Read recorded run hash
  const recordedRunHash = readRunHash(runDir);
  if (!recordedRunHash) {
    return Object.freeze({
      success: false,
      exitCode: ExitCode.VERIFY_FAIL,
      mismatches: Object.freeze([{
        file: RUN_FILES.RUN_HASH,
        expected: 'hash file',
        actual: 'not found',
      }]),
      filesChecked: 1,
      filesValid: 0,
    });
  }

  // Read hashes file
  const hashesContent = readRunFile(runDir, RUN_FILES.HASHES);
  if (!hashesContent) {
    return Object.freeze({
      success: false,
      exitCode: ExitCode.VERIFY_FAIL,
      mismatches: Object.freeze([{
        file: RUN_FILES.HASHES,
        expected: 'hashes file',
        actual: 'not found',
      }]),
      filesChecked: 1,
      filesValid: 0,
    });
  }

  // Recompute run hash using same logic as pipeline.computeRunHash:
  // 1. Get hashes for HASHABLE_FILES (which includes hashes.txt itself)
  // 2. Get hashes for artifacts
  // 3. Sort all and compute chain hash
  const orderedHashes: string[] = [];

  // Get file hashes from the hashes file
  const recordedHashes = readHashesFile(runDir);

  // Add hashes for HASHABLE_FILES (must include hash of hashes.txt itself)
  for (const filename of HASHABLE_FILES) {
    if (filename === RUN_FILES.HASHES) {
      // Compute hash of the hashes file content
      const hashOfHashesFile = computeHash(hashesContent);
      orderedHashes.push(`${hashOfHashesFile}  ${filename}`);
    } else {
      const hash = recordedHashes.get(filename);
      if (hash) {
        orderedHashes.push(`${hash}  ${filename}`);
      }
    }
  }

  // Add artifact hashes
  for (const [filename, hash] of recordedHashes) {
    if (filename.startsWith(RUN_FILES.ARTIFACTS_DIR + '/')) {
      orderedHashes.push(`${hash}  ${filename}`);
    }
  }

  // Sort for determinism
  orderedHashes.sort();

  // Compute run hash
  const computedRunHash = computeChainHash(orderedHashes);

  if (computedRunHash !== recordedRunHash) {
    return Object.freeze({
      success: false,
      exitCode: ExitCode.VERIFY_FAIL,
      mismatches: Object.freeze([{
        file: RUN_FILES.RUN_HASH,
        expected: recordedRunHash,
        actual: computedRunHash,
      }]),
      filesChecked: 1,
      filesValid: 0,
    });
  }

  return Object.freeze({
    success: true,
    exitCode: ExitCode.PASS,
    mismatches: Object.freeze([]),
    filesChecked: 1,
    filesValid: 1,
  });
}

/**
 * Full verification of run directory.
 * I-INV-05: Does not call Forge/TruthGate/Delivery.
 * I-INV-10: Zero writes.
 *
 * @param runPath - Path to run directory
 * @returns Verification result
 */
export function verifyRun(runPath: string): VerifyResult {
  const runDir = getRunDirectory(runPath);

  if (!runDir.exists) {
    return Object.freeze({
      success: false,
      exitCode: ExitCode.VERIFY_FAIL,
      mismatches: Object.freeze([{
        file: runPath,
        expected: 'directory',
        actual: 'not found',
      }]),
      filesChecked: 0,
      filesValid: 0,
    });
  }

  // First verify all file hashes
  const hashesResult = verifyHashes(runPath);
  if (!hashesResult.success) {
    return hashesResult;
  }

  // Then verify run hash
  const runHashResult = verifyRunHash(runPath);
  if (!runHashResult.success) {
    return Object.freeze({
      ...runHashResult,
      filesChecked: hashesResult.filesChecked + runHashResult.filesChecked,
      filesValid: hashesResult.filesValid,
    });
  }

  // Verify required files exist
  const requiredFiles = [
    RUN_FILES.INTENT,
    RUN_FILES.CONTRACT,
    RUN_FILES.TRUTHGATE_VERDICT,
    RUN_FILES.DELIVERY_MANIFEST,
    RUN_FILES.HASHES,
    RUN_FILES.RUN_HASH,
  ];

  const missingFiles: HashMismatch[] = [];
  for (const filename of requiredFiles) {
    const content = readRunFile(runDir, filename);
    if (content === null) {
      missingFiles.push({
        file: filename,
        expected: 'exists',
        actual: 'not found',
      });
    }
  }

  if (missingFiles.length > 0) {
    return Object.freeze({
      success: false,
      exitCode: ExitCode.VERIFY_FAIL,
      mismatches: Object.freeze(missingFiles),
      filesChecked: hashesResult.filesChecked + requiredFiles.length,
      filesValid: hashesResult.filesValid,
    });
  }

  return Object.freeze({
    success: true,
    exitCode: ExitCode.PASS,
    mismatches: Object.freeze([]),
    filesChecked: hashesResult.filesChecked + requiredFiles.length,
    filesValid: hashesResult.filesValid + requiredFiles.length,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAMPERING DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detects if any file has been tampered with.
 *
 * @param runPath - Path to run directory
 * @returns Array of tampered files
 */
export function detectTampering(runPath: string): readonly string[] {
  const result = verifyHashes(runPath);
  return Object.freeze(result.mismatches.map(m => m.file));
}

/**
 * Checks if run is intact (no tampering).
 *
 * @param runPath - Path to run directory
 * @returns true if run is intact
 */
export function isRunIntact(runPath: string): boolean {
  return verifyRun(runPath).success;
}
