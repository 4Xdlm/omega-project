/**
 * Proof Utils Types
 * Standard: NASA-Grade L4
 */

// ============================================================
// Core Interfaces
// ============================================================

export interface Clock {
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

export function mockClock(time: number): Clock & { advance(ms: number): void; set(t: number): void } {
  let current = time;
  return {
    now: () => current,
    advance: (ms: number) => { current += ms; },
    set: (t: number) => { current = t; },
  };
}

// ============================================================
// Manifest Types
// ============================================================

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

// ============================================================
// Snapshot Types
// ============================================================

export interface SnapshotEntry {
  readonly path: string;
  readonly sha256: string;
  readonly size: number;
  readonly content: string;  // Base64-encoded
}

export interface Snapshot {
  readonly id: string;
  readonly name: string;
  readonly entries: readonly SnapshotEntry[];
  readonly timestamp: number;
  readonly metadata: Record<string, unknown>;
}

export interface SnapshotOptions {
  readonly name?: string;
  readonly metadata?: Record<string, unknown>;
  readonly idGenerator?: () => string;
}

export interface RestoreResult {
  readonly success: boolean;
  readonly restoredFiles: readonly string[];
  readonly errors: readonly string[];
}

// ============================================================
// Diff Types
// ============================================================

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface DiffEntry {
  readonly path: string;
  readonly type: DiffType;
  readonly beforeHash?: string;
  readonly afterHash?: string;
  readonly beforeSize?: number;
  readonly afterSize?: number;
}

export interface DiffResult {
  readonly entries: readonly DiffEntry[];
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
  readonly unchanged: number;
}

// ============================================================
// Comparison Types
// ============================================================

export interface CompareOptions {
  readonly includeContent?: boolean;
  readonly ignorePatterns?: readonly string[];
}

export interface IntegrityReport {
  readonly timestamp: number;
  readonly totalFiles: number;
  readonly validFiles: number;
  readonly invalidFiles: number;
  readonly missingFiles: number;
  readonly details: readonly VerificationResult[];
}

// ============================================================
// Serialization Types
// ============================================================

export interface SerializedManifest {
  readonly version: string;
  readonly timestamp: number;
  readonly entries: readonly ManifestEntry[];
  readonly signature?: string;
}

export interface SerializedSnapshot {
  readonly id: string;
  readonly name: string;
  readonly timestamp: number;
  readonly metadata: Record<string, unknown>;
  readonly entries: readonly SnapshotEntry[];
}
