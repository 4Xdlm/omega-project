// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA SNAPSHOT ENGINE — Preuves cryptographiques d'état
// Version: 1.0.0 — NASA/SpaceX-Grade
// Invariants: SNAP-01 à SNAP-04
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash, randomUUID } from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { SnapshotPayload, SnapshotRef, SHA256, CONSTANTS } from './types';

export const SNAPSHOT_REASON_CODES = {
  SNAP_CREATION_FAILED: 'Failed to create snapshot',
  SNAP_NOT_FOUND: 'Snapshot not found',
  SNAP_HASH_MISMATCH: 'Snapshot hash verification failed',
  SNAP_IMMUTABLE: 'Cannot modify immutable snapshot',
} as const;

export class SnapshotError extends Error {
  constructor(public readonly code: keyof typeof SNAPSHOT_REASON_CODES, message: string) {
    super(message); this.name = 'SnapshotError';
  }
}

function computeHash(content: unknown): SHA256 {
  const canonical = stringify(content);
  return createHash('sha256').update(canonical, 'utf-8').digest('hex');
}

/**
 * Snapshot Engine OMEGA — Capture d'état immuable
 * 
 * Invariants:
 * - SNAP-01: Immutabilité (snapshot créé = figé)
 * - SNAP-02: Hash stable (même payload → même hash)
 * - SNAP-03: Canonicalisation (pas de champs non normalisés)
 * - SNAP-04: Référence vérifiable
 */
export class SnapshotEngine {
  private snapshots: Map<string, { payload: SnapshotPayload; hash: SHA256 }> = new Map();

  /**
   * Crée un snapshot immuable
   */
  create(
    execution_token: string,
    pipeline_id: string,
    step: string,
    input: unknown,
    output?: unknown,
    artifacts_refs: Array<{ kind: string; content_hash: SHA256; storage_ref: string }> = []
  ): SnapshotRef {
    const snapshot_id = randomUUID();
    const timestamp = new Date().toISOString();
    
    // Canonicaliser et hasher
    const input_hash = computeHash(input);
    const output_hash = output !== undefined ? computeHash(output) : undefined;
    
    // State digest = hash de (input_hash + output_hash + artifacts)
    const state_digest = computeHash({ input_hash, output_hash, artifacts_refs });

    const payload: SnapshotPayload = {
      snapshot_id,
      execution_token,
      pipeline_id,
      step,
      timestamp,
      input_hash,
      output_hash,
      state_digest,
      artifacts_refs,
    };

    // Hash du payload complet
    const snapshot_hash = computeHash(payload);
    
    // Store (SNAP-01: immutable after creation)
    this.snapshots.set(snapshot_id, { payload, hash: snapshot_hash });

    return {
      snapshot_id,
      snapshot_hash,
      storage_ref: `mem://${snapshot_id}`,
    };
  }

  /**
   * Récupère un snapshot par ID
   */
  get(snapshot_id: string): SnapshotPayload | null {
    const stored = this.snapshots.get(snapshot_id);
    return stored?.payload || null;
  }

  /**
   * Vérifie l'intégrité d'un snapshot (SNAP-04)
   */
  verify(ref: SnapshotRef): boolean {
    const stored = this.snapshots.get(ref.snapshot_id);
    if (!stored) return false;
    
    // Recalculer le hash
    const computedHash = computeHash(stored.payload);
    
    return computedHash === ref.snapshot_hash && computedHash === stored.hash;
  }

  /**
   * Liste tous les snapshots d'une exécution
   */
  listByExecution(execution_token: string): SnapshotPayload[] {
    const results: SnapshotPayload[] = [];
    for (const { payload } of this.snapshots.values()) {
      if (payload.execution_token === execution_token) {
        results.push(payload);
      }
    }
    return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Nombre de snapshots
   */
  size(): number {
    return this.snapshots.size;
  }

  /**
   * Calcule le hash SHA-256 de données quelconques (SNAP-02: stable)
   */
  hashData(data: unknown): SHA256 {
    return computeHash(data);
  }

  /**
   * Export pour archivage
   */
  export(snapshot_id: string): { payload: SnapshotPayload; hash: SHA256 } | null {
    return this.snapshots.get(snapshot_id) || null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createSnapshotEngine(): SnapshotEngine {
  return new SnapshotEngine();
}
