/**
 * OMEGA V4.4 — Phase 3: Snapshot Class
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * IMMUTABLE forensic artifact.
 * Created once, never modified.
 *
 * Metaphor: Flight recorder black box
 */

import { randomUUID } from 'node:crypto';
import type { EmotionId } from '../phase1_contract/index.js';
import type { CoreComputeOutput } from '../phase2_core/index.js';
import { hashObject, deterministicStringify } from '../phase2_core/hash.js';

import type {
  SnapshotData,
  SnapshotMeta,
  SnapshotEmotionEntry,
  SerializedSnapshot,
} from './types.js';

import { SNAPSHOT_SCHEMA_VERSION } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// SNAPSHOT CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Immutable Snapshot - forensic storage of emotional state
 */
export class Snapshot {
  private readonly data: SnapshotData;

  /**
   * Private constructor - use Snapshot.create()
   */
  private constructor(data: SnapshotData) {
    this.data = data;
    Object.freeze(this);
    Object.freeze(this.data);
  }

  /**
   * Create a new snapshot from CoreEngine output
   */
  static create(coreOutput: CoreComputeOutput, meta: SnapshotMeta): Snapshot {
    const snapshotId = randomUUID();
    const timestamp = coreOutput.timestamp;

    // Build emotion entries
    const emotions = new Map<EmotionId, SnapshotEmotionEntry>();
    for (const [id, emotion] of coreOutput.emotions) {
      emotions.set(id, {
        id,
        intensity: emotion.intensity,
        position: {
          x: emotion.position.x,
          y: emotion.position.y,
          z: emotion.position.z,
        },
        params: { ...emotion.params },
      });
    }

    // Build data without content hash first
    const dataWithoutHash: Omit<SnapshotData, 'integrity'> & { integrity: Omit<SnapshotData['integrity'], 'contentHash'> } = {
      identity: {
        snapshotId,
        timestamp,
        source: meta.source,
      },
      emotionState: {
        emotions,
        dominantEmotion: coreOutput.dominantEmotion,
        axes: { ...coreOutput.axes },
        totalIntensity: coreOutput.totalIntensity,
      },
      validation: {
        validationStatus: coreOutput.validationStatus,
        validationErrors: [...coreOutput.validationErrors],
      },
      context: {
        contractVersion: meta.contractVersion,
        coreVersion: meta.coreVersion,
        configHash: coreOutput.configHash,
      },
      integrity: {
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      },
      links: {
        prevSnapshotId: meta.prevSnapshotId ?? null,
        sequence: meta.sequence ?? 0,
      },
    };

    // Calculate content hash (exclude non-deterministic fields: snapshotId, prevSnapshotId)
    const contentHash = Snapshot.calculateContentHash({
      // Only include deterministic content
      timestamp,
      source: meta.source,
      emotionState: dataWithoutHash.emotionState,
      validation: dataWithoutHash.validation,
      context: dataWithoutHash.context,
      // links.sequence is deterministic, but links.prevSnapshotId is not
      sequence: dataWithoutHash.links.sequence,
    });

    // Build final data with hash
    const data: SnapshotData = {
      ...dataWithoutHash,
      integrity: {
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        contentHash,
      },
    };

    return new Snapshot(data);
  }

  /**
   * Calculate content hash for data
   */
  private static calculateContentHash(data: unknown): string {
    return hashObject(data);
  }

  /**
   * Restore snapshot from JSON
   */
  static fromJSON(json: string): Snapshot {
    const parsed = JSON.parse(json) as SerializedSnapshot;
    return Snapshot.fromSerialized(parsed);
  }

  /**
   * Restore snapshot from serialized format
   */
  static fromSerialized(serialized: SerializedSnapshot): Snapshot {
    // Rebuild emotions map
    const emotions = new Map<EmotionId, SnapshotEmotionEntry>();
    for (const entry of serialized.emotions) {
      emotions.set(entry.id, {
        id: entry.id,
        intensity: entry.intensity,
        position: { ...entry.position },
        params: { ...entry.params },
      });
    }

    const data: SnapshotData = {
      identity: {
        snapshotId: serialized.snapshotId,
        timestamp: serialized.timestamp,
        source: serialized.source,
      },
      emotionState: {
        emotions,
        dominantEmotion: serialized.dominantEmotion,
        axes: { ...serialized.axes },
        totalIntensity: serialized.totalIntensity,
      },
      validation: {
        validationStatus: serialized.validationStatus,
        validationErrors: [...serialized.validationErrors],
      },
      context: {
        contractVersion: serialized.contractVersion,
        coreVersion: serialized.coreVersion,
        configHash: serialized.configHash,
      },
      integrity: {
        schemaVersion: serialized.schemaVersion,
        contentHash: serialized.contentHash,
      },
      links: {
        prevSnapshotId: serialized.prevSnapshotId,
        sequence: serialized.sequence,
      },
    };

    return new Snapshot(data);
  }

  /**
   * Serialize snapshot to JSON
   */
  toJSON(): string {
    return deterministicStringify(this.toSerialized());
  }

  /**
   * Convert to serialized format
   */
  toSerialized(): SerializedSnapshot {
    const emotionEntries: Array<{
      id: EmotionId;
      intensity: number;
      position: { x: number; y: number; z: number };
      params: typeof this.data.emotionState.emotions extends ReadonlyMap<EmotionId, infer E> ? E['params'] : never;
    }> = [];

    for (const [id, entry] of this.data.emotionState.emotions) {
      emotionEntries.push({
        id,
        intensity: entry.intensity,
        position: { ...entry.position },
        params: { ...entry.params },
      });
    }

    return {
      snapshotId: this.data.identity.snapshotId,
      timestamp: this.data.identity.timestamp,
      source: this.data.identity.source,
      dominantEmotion: this.data.emotionState.dominantEmotion,
      axes: { ...this.data.emotionState.axes },
      totalIntensity: this.data.emotionState.totalIntensity,
      emotions: emotionEntries,
      validationStatus: this.data.validation.validationStatus,
      validationErrors: [...this.data.validation.validationErrors],
      contractVersion: this.data.context.contractVersion,
      coreVersion: this.data.context.coreVersion,
      configHash: this.data.context.configHash,
      schemaVersion: this.data.integrity.schemaVersion,
      contentHash: this.data.integrity.contentHash,
      prevSnapshotId: this.data.links.prevSnapshotId,
      sequence: this.data.links.sequence,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GETTERS (Read-only access)
  // ═══════════════════════════════════════════════════════════════════════

  get snapshotId(): string {
    return this.data.identity.snapshotId;
  }

  get timestamp(): number {
    return this.data.identity.timestamp;
  }

  get source(): string {
    return this.data.identity.source;
  }

  get dominantEmotion(): EmotionId {
    return this.data.emotionState.dominantEmotion;
  }

  get axes(): { readonly X: number; readonly Y: number; readonly Z: number } {
    return this.data.emotionState.axes;
  }

  get totalIntensity(): number {
    return this.data.emotionState.totalIntensity;
  }

  get emotions(): ReadonlyMap<EmotionId, SnapshotEmotionEntry> {
    return this.data.emotionState.emotions;
  }

  get validationStatus(): string {
    return this.data.validation.validationStatus;
  }

  get validationErrors(): readonly string[] {
    return this.data.validation.validationErrors;
  }

  get contentHash(): string {
    return this.data.integrity.contentHash;
  }

  get schemaVersion(): string {
    return this.data.integrity.schemaVersion;
  }

  get configHash(): string {
    return this.data.context.configHash;
  }

  get prevSnapshotId(): string | null {
    return this.data.links.prevSnapshotId;
  }

  get sequence(): number {
    return this.data.links.sequence;
  }

  /**
   * Verify content hash matches stored hash
   */
  verifyIntegrity(): boolean {
    // Same hash calculation as in create() - exclude non-deterministic fields
    const hashContent = {
      timestamp: this.data.identity.timestamp,
      source: this.data.identity.source,
      emotionState: this.data.emotionState,
      validation: this.data.validation,
      context: this.data.context,
      sequence: this.data.links.sequence,
    };

    const calculatedHash = hashObject(hashContent);
    return calculatedHash === this.data.integrity.contentHash;
  }
}
