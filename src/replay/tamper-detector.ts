/**
 * OMEGA Tamper Detector
 * Phase L - Detects various forms of tampering
 */
import type { TamperResult, FileVerifyResult, ChainVerifyResult, LockVerifyResult } from './types';

/**
 * Analyzes verification results to detect tampering.
 */
export function detectTampering(
  fileResults: FileVerifyResult[],
  chainResults: ChainVerifyResult[],
  lockResults: LockVerifyResult[]
): TamperResult[] {
  const tampers: TamperResult[] = [];

  // Check file modifications
  const modifiedFiles = fileResults.filter(f => f.exists && !f.match);
  if (modifiedFiles.length > 0) {
    tampers.push({
      detected: true,
      type: 'file_modified',
      details: `${modifiedFiles.length} file(s) modified after generation`,
      affectedFiles: modifiedFiles.map(f => f.path),
    });
  }

  // Check missing files
  const missingFiles = fileResults.filter(f => !f.exists && f.expectedHash);
  if (missingFiles.length > 0) {
    tampers.push({
      detected: true,
      type: 'file_missing',
      details: `${missingFiles.length} expected file(s) missing`,
      affectedFiles: missingFiles.map(f => f.path),
    });
  }

  // Check chain breaks
  const brokenChains = chainResults.filter(c => !c.match);
  if (brokenChains.length > 0) {
    tampers.push({
      detected: true,
      type: 'chain_broken',
      details: `${brokenChains.length} hash chain(s) broken`,
    });
  }

  // Check invalid locks
  const invalidLocks = lockResults.filter(l => !l.match);
  if (invalidLocks.length > 0) {
    tampers.push({
      detected: true,
      type: 'lock_invalid',
      details: `${invalidLocks.length} lock(s) invalid at generation time`,
    });
  }

  return tampers;
}
