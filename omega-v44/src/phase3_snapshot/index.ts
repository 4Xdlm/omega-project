/**
 * OMEGA V4.4 — Phase 3: Snapshot
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Forensic storage of emotional states.
 * Immutable. Hashable. Traceable.
 */

// Types
export type {
  SnapshotIdentity,
  SnapshotEmotionState,
  SnapshotEmotionEntry,
  SnapshotValidation,
  SnapshotContext,
  SnapshotIntegrity,
  SnapshotLinks,
  SnapshotData,
  SnapshotMeta,
  SerializedSnapshot,
} from './types.js';

export { SNAPSHOT_SCHEMA_VERSION } from './types.js';

// Snapshot class
export { Snapshot } from './Snapshot.js';
