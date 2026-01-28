/**
 * OMEGA Replay Engine Types
 * Phase L - NASA-Grade L4
 */

// Verification scope
export type VerifyScope = 'full' | 'hashes-only' | 'structure-only';

// File verification result
export interface FileVerifyResult {
  path: string;
  exists: boolean;
  expectedHash?: string;
  actualHash?: string;
  match: boolean;
  error?: string;
}

// Lock verification result
export interface LockVerifyResult {
  lockType: 'policy' | 'delivery' | 'provider';
  lockPath: string;
  expectedHash: string;
  actualHash: string;
  match: boolean;
}

// Chain hash verification
export interface ChainVerifyResult {
  chainId: string;
  entries: number;
  recomputedHash: string;
  recordedHash: string;
  match: boolean;
  brokenAt?: number; // Index where chain breaks, if any
}

// Tamper detection result
export interface TamperResult {
  detected: boolean;
  type?: 'file_modified' | 'file_missing' | 'file_added' | 'chain_broken' | 'lock_invalid';
  details?: string;
  affectedFiles?: string[];
}

// Full replay verification result
export interface ReplayResult {
  success: boolean;
  runId: string;
  runPath: string;
  timestamp: string; // Read from run, not generated

  // Structure verification
  structureValid: boolean;
  requiredFiles: FileVerifyResult[];

  // Hash verification
  hashesValid: boolean;
  fileHashes: FileVerifyResult[];

  // Chain verification
  chainValid: boolean;
  chainResults: ChainVerifyResult[];

  // Lock verification (were locks valid at generation time?)
  locksValid: boolean;
  lockResults: LockVerifyResult[];

  // Tamper detection
  tamperResults: TamperResult[];

  // Summary
  filesChecked: number;
  filesValid: number;
  errors: string[];
}

// Replay options
export interface ReplayOptions {
  scope?: VerifyScope;
  verbose?: boolean;
}

// Expected run structure
export const EXPECTED_RUN_FILES = [
  'intent.json',
  'contract.json',
  'truthgate_verdict.json',
  'truthgate_proof.json',
  'delivery_manifest.json',
  'artifacts/output.txt',
  'hashes.txt',
  'run_hash.txt',
] as const;
