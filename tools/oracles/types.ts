/**
 * OMEGA Oracles - Shared Types
 * Part of the ignition gate system for deterministic verification
 */

export interface ManifestEntry {
  hash: string;
  path: string;
  size: number;
}

export interface Manifest {
  version: string;
  generatedAt: string; // ISO timestamp (removed in canonical form)
  entries: ManifestEntry[];
}

export interface OracleResult {
  success: boolean;
  manifestPath: string;
  hashPath: string;
  hash: string;
  entryCount: number;
}

export interface BaselineComparisonResult {
  oracle: string;
  pass: boolean;
  expectedHash: string;
  actualHash: string;
  diff?: string;
}

export interface CanonicalTestResult {
  file: string;
  suite: string;
  name: string;
  status: 'pass' | 'fail' | 'skip';
  // NO duration, NO timestamp, NO seed - volatile fields excluded
}

export interface CanonicalTestReport {
  version: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: CanonicalTestResult[];
}
