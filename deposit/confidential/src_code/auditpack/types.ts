/**
 * OMEGA Auditpack Types
 * Phase M - NASA-Grade L4
 */
import type { ReplayResult } from '../replay/types';

// Zip entry info
export interface ZipEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
  isDirectory: boolean;
}

// Zip validation result
export interface ZipValidationResult {
  valid: boolean;
  entries: ZipEntry[];
  errors: string[];
  hasZipSlip: boolean; // Path traversal attack detected
  hasDangerousFiles: boolean; // Symlinks, etc.
}

// Capsule verification result
export interface CapsuleVerifyResult {
  success: boolean;
  capsulePath: string;
  capsuleHash: string;

  // Zip structure
  zipValid: boolean;
  zipValidation: ZipValidationResult;

  // Extraction
  extractedPath: string | null;
  extractionError: string | null;

  // Replay verification (Phase L)
  replayResult: ReplayResult | null;

  // Summary
  verdict: 'PASS' | 'FAIL' | 'ERROR';
  errors: string[];
}

// Capsule verify options
export interface CapsuleVerifyOptions {
  keepExtracted?: boolean; // Don't delete temp dir (for debugging)
  verbose?: boolean;
}

// Exit codes (align with runner)
export const CapsuleExitCode = {
  PASS: 0,
  ZIP_INVALID: 71,
  ZIP_SLIP: 72,
  EXTRACT_FAIL: 73,
  VERIFY_FAIL: 74,
} as const;
