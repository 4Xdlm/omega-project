/**
 * Proof Utils Types
 * Standard: NASA-Grade L4
 */

export interface ManifestEntry {
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
}

export interface Manifest {
  readonly entries: readonly ManifestEntry[];
  readonly timestamp: number;
  readonly version: string;
}

export interface VerificationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly tamperedFiles: readonly string[];
}
