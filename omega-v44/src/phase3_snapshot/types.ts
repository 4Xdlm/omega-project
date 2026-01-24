/**
 * OMEGA V4.4 — Phase 3: Snapshot Types
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Snapshot = Forensic artifact = Photo brute immutable
 * NO LOGIC. NO DECISION. STORAGE ONLY.
 */

import type {
  EmotionId,
  ValidationStatus,
  RawAxes,
  EmotionParamsFull,
} from '../phase1_contract/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// SNAPSHOT STRUCTURE (6 SECTIONS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 1. IDENTITY - Unique identification
 */
export interface SnapshotIdentity {
  readonly snapshotId: string;
  readonly timestamp: number;
  readonly source: string;
}

/**
 * 2. EMOTION STATE - Raw emotional data
 */
export interface SnapshotEmotionState {
  readonly emotions: ReadonlyMap<EmotionId, SnapshotEmotionEntry>;
  readonly dominantEmotion: EmotionId;
  readonly axes: RawAxes;
  readonly totalIntensity: number;
}

/**
 * Single emotion entry in snapshot
 */
export interface SnapshotEmotionEntry {
  readonly id: EmotionId;
  readonly intensity: number;
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly params: EmotionParamsFull;
}

/**
 * 3. VALIDATION - Validation status
 */
export interface SnapshotValidation {
  readonly validationStatus: ValidationStatus;
  readonly validationErrors: readonly string[];
}

/**
 * 4. TECHNICAL CONTEXT
 */
export interface SnapshotContext {
  readonly contractVersion: string;
  readonly coreVersion: string;
  readonly configHash: string;
}

/**
 * 5. INTEGRITY
 */
export interface SnapshotIntegrity {
  readonly schemaVersion: string;
  readonly contentHash: string;
}

/**
 * 6. TEMPORAL LINKS
 */
export interface SnapshotLinks {
  readonly prevSnapshotId: string | null;
  readonly sequence: number;
}

/**
 * Complete Snapshot structure
 */
export interface SnapshotData {
  // Section 1: Identity
  readonly identity: SnapshotIdentity;

  // Section 2: Emotion State
  readonly emotionState: SnapshotEmotionState;

  // Section 3: Validation
  readonly validation: SnapshotValidation;

  // Section 4: Technical Context
  readonly context: SnapshotContext;

  // Section 5: Integrity
  readonly integrity: SnapshotIntegrity;

  // Section 6: Temporal Links
  readonly links: SnapshotLinks;
}

/**
 * Metadata for creating a snapshot
 */
export interface SnapshotMeta {
  readonly source: string;
  readonly contractVersion: string;
  readonly coreVersion: string;
  readonly prevSnapshotId?: string;
  readonly sequence?: number;
}

/**
 * Serialized snapshot format (JSON-compatible)
 */
export interface SerializedSnapshot {
  readonly snapshotId: string;
  readonly timestamp: number;
  readonly source: string;
  readonly dominantEmotion: EmotionId;
  readonly axes: RawAxes;
  readonly totalIntensity: number;
  readonly emotions: ReadonlyArray<{
    readonly id: EmotionId;
    readonly intensity: number;
    readonly position: { readonly x: number; readonly y: number; readonly z: number };
    readonly params: EmotionParamsFull;
  }>;
  readonly validationStatus: ValidationStatus;
  readonly validationErrors: readonly string[];
  readonly contractVersion: string;
  readonly coreVersion: string;
  readonly configHash: string;
  readonly schemaVersion: string;
  readonly contentHash: string;
  readonly prevSnapshotId: string | null;
  readonly sequence: number;
}

/**
 * Current schema version
 */
export const SNAPSHOT_SCHEMA_VERSION = '1.0.0';
