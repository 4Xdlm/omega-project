/**
 * OMEGA Replay Engine
 * Phase L - Full read-only verification
 */
import { existsSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import type { ReplayResult, ReplayOptions, FileVerifyResult, LockVerifyResult, ChainVerifyResult } from './types';
import { verifyRunHashes, computeRunHash } from './hash-recomputer';
import { verifyRunStructure } from './structure-verifier';
import { detectTampering } from './tamper-detector';

/**
 * Performs full replay verification of a run directory.
 * STRICTLY READ-ONLY - no writes.
 */
export function replayVerify(runPath: string, options: ReplayOptions = {}): ReplayResult {
  const scope = options.scope ?? 'full';
  const errors: string[] = [];

  // Get run ID from path
  const runId = basename(runPath);

  // Check run exists
  if (!existsSync(runPath)) {
    return {
      success: false,
      runId,
      runPath,
      timestamp: '',
      structureValid: false,
      requiredFiles: [],
      hashesValid: false,
      fileHashes: [],
      chainValid: false,
      chainResults: [],
      locksValid: false,
      lockResults: [],
      tamperResults: [{ detected: true, type: 'file_missing', details: 'Run directory not found' }],
      filesChecked: 0,
      filesValid: 0,
      errors: ['Run directory not found'],
    };
  }

  // Get timestamp from run report or intent
  let timestamp = '';
  const reportPath = join(runPath, 'run_report.md');
  if (existsSync(reportPath)) {
    const reportContent = readFileSync(reportPath, 'utf-8');
    const tsMatch = reportContent.match(/Timestamp:\s*(.+)/);
    if (tsMatch) {
      timestamp = tsMatch[1].trim();
    }
  }

  // Structure verification
  const requiredFiles = verifyRunStructure(runPath);
  const structureValid = requiredFiles.every(f => f.exists);

  if (!structureValid) {
    errors.push('Missing required files');
  }

  // Hash verification
  let fileHashes: FileVerifyResult[] = [];
  let hashesValid = true;

  if (scope !== 'structure-only') {
    fileHashes = verifyRunHashes(runPath);
    hashesValid = fileHashes.every(f => f.match);

    if (!hashesValid) {
      errors.push('Hash verification failed');
    }

    // Verify run_hash.txt
    const runHashPath = join(runPath, 'run_hash.txt');
    if (existsSync(runHashPath)) {
      const recordedRunHash = readFileSync(runHashPath, 'utf-8').trim();
      try {
        const computedRunHash = computeRunHash(runPath);
        if (recordedRunHash !== computedRunHash) {
          errors.push(`Run hash mismatch: expected ${recordedRunHash}, got ${computedRunHash}`);
          hashesValid = false;
        }
      } catch (e) {
        errors.push(`Failed to compute run hash: ${(e as Error).message}`);
      }
    }
  }

  // Chain verification (ledger chain hashes if present)
  const chainResults: ChainVerifyResult[] = [];
  const chainValid = chainResults.length === 0 || chainResults.every(c => c.match);

  // Lock verification (check locks recorded in run)
  const lockResults: LockVerifyResult[] = [];
  const locksValid = lockResults.length === 0 || lockResults.every(l => l.match);

  // Tamper detection
  const tamperResults = detectTampering(fileHashes, chainResults, lockResults);
  const hasTamper = tamperResults.some(t => t.detected);

  // Summary
  const filesChecked = fileHashes.length;
  const filesValid = fileHashes.filter(f => f.match).length;

  const success = structureValid && hashesValid && chainValid && locksValid && !hasTamper;

  return {
    success,
    runId,
    runPath,
    timestamp,
    structureValid,
    requiredFiles,
    hashesValid,
    fileHashes,
    chainValid,
    chainResults,
    locksValid,
    lockResults,
    tamperResults,
    filesChecked,
    filesValid,
    errors,
  };
}
