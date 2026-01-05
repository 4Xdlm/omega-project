/**
 * OMEGA Persistence Layer — Sync Engine
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * Invariants:
 * - INV-SYNC-01: Divergence => conflit explicite (pas de merge silencieux)
 * - INV-SYNC-02: Merge déterministe si non conflict
 * 
 * Stratégie MVP:
 * - Pull then merge
 * - Si divergence → conflict flag
 * - Résolution manuelle via user choice
 */

import {
  PersistenceAdapter,
  PersistResult,
  PersistErrorCode,
  SaveResult,
  SyncEngine as ISyncEngine,
  SyncState,
  SyncStatus,
  SyncConflict,
  MergeResult,
  PersistedEnvelope,
  createPersistError,
} from '../core/types.js';

import { canonicalEncodeWithHash } from '../core/canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC ENGINE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class SyncEngine implements ISyncEngine {
  private readonly localAdapter: PersistenceAdapter;
  private readonly remoteAdapter: PersistenceAdapter;
  private readonly conflicts: Map<string, SyncConflict> = new Map();

  constructor(
    localAdapter: PersistenceAdapter,
    remoteAdapter: PersistenceAdapter
  ) {
    this.localAdapter = localAdapter;
    this.remoteAdapter = remoteAdapter;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPARE
  // ═══════════════════════════════════════════════════════════════════════════

  async compare(key: string): Promise<PersistResult<SyncState>> {
    const [localResult, remoteResult] = await Promise.all([
      this.localAdapter.load(key),
      this.remoteAdapter.load(key),
    ]);

    const now = new Date().toISOString();

    // Cas: aucun des deux n'existe
    if (!localResult.success && !remoteResult.success) {
      return {
        success: true,
        data: {
          localSequence: 0,
          remoteSequence: 0,
          localHash: '',
          remoteHash: '',
          status: SyncStatus.IN_SYNC,
          lastSyncAt: now,
        },
      };
    }

    // Cas: seulement local existe
    if (localResult.success && !remoteResult.success) {
      return {
        success: true,
        data: {
          localSequence: localResult.data.envelope.metadata.sequence,
          remoteSequence: 0,
          localHash: localResult.data.sha256,
          remoteHash: '',
          status: SyncStatus.LOCAL_AHEAD,
          lastSyncAt: now,
        },
      };
    }

    // Cas: seulement remote existe
    if (!localResult.success && remoteResult.success) {
      return {
        success: true,
        data: {
          localSequence: 0,
          remoteSequence: remoteResult.data.envelope.metadata.sequence,
          localHash: '',
          remoteHash: remoteResult.data.sha256,
          status: SyncStatus.REMOTE_AHEAD,
          lastSyncAt: now,
        },
      };
    }

    // Les deux existent - type guard vérifié
    if (!localResult.success || !remoteResult.success) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.ADAPTER_ERROR,
          'Failed to load local or remote state',
        ),
      };
    }

    const localEnv = localResult.data.envelope;
    const remoteEnv = remoteResult.data.envelope;

    // Même DATA hash = synchronisé (on compare les données, pas l'envelope)
    if (localEnv.dataHash === remoteEnv.dataHash) {
      return {
        success: true,
        data: {
          localSequence: localEnv.metadata.sequence,
          remoteSequence: remoteEnv.metadata.sequence,
          localHash: localEnv.dataHash,
          remoteHash: remoteEnv.dataHash,
          status: SyncStatus.IN_SYNC,
          lastSyncAt: now,
        },
      };
    }

    // Séquences différentes - on utilise dataHash pour la comparaison
    if (localEnv.metadata.sequence > remoteEnv.metadata.sequence) {
      // Vérifier si local est basé sur remote (previousHash match)
      if (localEnv.metadata.previousHash === remoteResult.data.sha256) {
        return {
          success: true,
          data: {
            localSequence: localEnv.metadata.sequence,
            remoteSequence: remoteEnv.metadata.sequence,
            localHash: localEnv.dataHash,
            remoteHash: remoteEnv.dataHash,
            status: SyncStatus.LOCAL_AHEAD,
            lastSyncAt: now,
          },
        };
      }
    }

    if (remoteEnv.metadata.sequence > localEnv.metadata.sequence) {
      // Vérifier si remote est basé sur local
      if (remoteEnv.metadata.previousHash === localResult.data.sha256) {
        return {
          success: true,
          data: {
            localSequence: localEnv.metadata.sequence,
            remoteSequence: remoteEnv.metadata.sequence,
            localHash: localEnv.dataHash,
            remoteHash: remoteEnv.dataHash,
            status: SyncStatus.REMOTE_AHEAD,
            lastSyncAt: now,
          },
        };
      }
    }

    // Divergence détectée - INV-SYNC-01
    return {
      success: true,
      data: {
        localSequence: localEnv.metadata.sequence,
        remoteSequence: remoteEnv.metadata.sequence,
        localHash: localEnv.dataHash,
        remoteHash: remoteEnv.dataHash,
        status: SyncStatus.DIVERGED,
        lastSyncAt: now,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL
  // ═══════════════════════════════════════════════════════════════════════════

  async pull(key: string): Promise<PersistResult<MergeResult>> {
    const compareResult = await this.compare(key);
    if (!compareResult.success) {
      return compareResult;
    }

    const state = compareResult.data;

    switch (state.status) {
      case SyncStatus.IN_SYNC:
        return {
          success: true,
          data: { merged: true },
        };

      case SyncStatus.LOCAL_AHEAD:
        // Rien à pull
        return {
          success: true,
          data: { merged: true },
        };

      case SyncStatus.REMOTE_AHEAD: {
        // Pull remote vers local
        const remoteResult = await this.remoteAdapter.load(key);
        if (!remoteResult.success) {
          return remoteResult;
        }

        const saveResult = await this.localAdapter.save(
          key,
          remoteResult.data.envelope.data,
          remoteResult.data.envelope.metadata.source,
          { overwrite: true }
        );

        if (!saveResult.success) {
          return saveResult;
        }

        return {
          success: true,
          data: {
            merged: true,
            result: remoteResult.data.envelope,
          },
        };
      }

      case SyncStatus.DIVERGED:
      case SyncStatus.CONFLICT: {
        // INV-SYNC-01: Divergence => conflit explicite
        const [localResult, remoteResult] = await Promise.all([
          this.localAdapter.load(key),
          this.remoteAdapter.load(key),
        ]);

        if (!localResult.success || !remoteResult.success) {
          return {
            success: false,
            error: createPersistError(
              PersistErrorCode.CONFLICT_DETECTED,
              'Failed to load envelopes for conflict',
            ),
          };
        }

        const conflict: SyncConflict = {
          key,
          localEnvelope: localResult.data.envelope,
          remoteEnvelope: remoteResult.data.envelope,
          detectedAt: new Date().toISOString(),
          reason: 'Divergent modifications detected',
        };

        // Enregistrer le conflit
        this.conflicts.set(key, conflict);

        return {
          success: true,
          data: {
            merged: false,
            conflict,
          },
        };
      }

      default:
        return {
          success: false,
          error: createPersistError(
            PersistErrorCode.ADAPTER_ERROR,
            `Unknown sync status: ${state.status}`,
          ),
        };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUSH
  // ═══════════════════════════════════════════════════════════════════════════

  async push(key: string): Promise<PersistResult<SaveResult>> {
    const compareResult = await this.compare(key);
    if (!compareResult.success) {
      return compareResult;
    }

    const state = compareResult.data;

    // Ne peut pas push si divergé
    if (state.status === SyncStatus.DIVERGED || state.status === SyncStatus.CONFLICT) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.CONFLICT_DETECTED,
          'Cannot push: divergence detected. Resolve conflict first.',
          { status: state.status }
        ),
      };
    }

    // Rien à push si remote ahead ou in sync
    if (state.status === SyncStatus.REMOTE_AHEAD) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.DIVERGENCE,
          'Cannot push: remote is ahead. Pull first.',
        ),
      };
    }

    if (state.status === SyncStatus.IN_SYNC) {
      // Rien à faire
      const localResult = await this.localAdapter.load(key);
      if (!localResult.success) {
        return localResult;
      }

      return {
        success: true,
        data: {
          key,
          path: 'already-synced',
          bytesWritten: 0,
          sha256: localResult.data.sha256,
          timestamp: new Date().toISOString(),
          sequence: localResult.data.envelope.metadata.sequence,
        },
      };
    }

    // LOCAL_AHEAD - push vers remote
    const localResult = await this.localAdapter.load(key);
    if (!localResult.success) {
      return localResult;
    }

    const saveResult = await this.remoteAdapter.save(
      key,
      localResult.data.envelope.data,
      localResult.data.envelope.metadata.source,
      { overwrite: true }
    );

    return saveResult;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLVE CONFLICT
  // ═══════════════════════════════════════════════════════════════════════════

  async resolveConflict(
    key: string,
    winner: 'local' | 'remote' | 'merge',
    mergedData?: unknown
  ): Promise<PersistResult<SaveResult>> {
    const conflict = this.conflicts.get(key);
    
    if (!conflict) {
      return {
        success: false,
        error: createPersistError(
          PersistErrorCode.NOT_FOUND,
          `No conflict found for key: ${key}`,
        ),
      };
    }

    let dataToSave: unknown;
    let source = conflict.localEnvelope.metadata.source;

    switch (winner) {
      case 'local':
        dataToSave = conflict.localEnvelope.data;
        break;

      case 'remote':
        dataToSave = conflict.remoteEnvelope.data;
        source = conflict.remoteEnvelope.metadata.source;
        break;

      case 'merge':
        if (mergedData === undefined) {
          return {
            success: false,
            error: createPersistError(
              PersistErrorCode.INVALID_DATA,
              'Merged data is required when winner is "merge"',
            ),
          };
        }
        dataToSave = mergedData;
        break;

      default:
        return {
          success: false,
          error: createPersistError(
            PersistErrorCode.INVALID_DATA,
            `Invalid winner: ${winner}`,
          ),
        };
    }

    // Sauvegarder localement
    const localSaveResult = await this.localAdapter.save(
      key,
      dataToSave,
      source,
      { overwrite: true }
    );

    if (!localSaveResult.success) {
      return localSaveResult;
    }

    // Sauvegarder sur remote
    const remoteSaveResult = await this.remoteAdapter.save(
      key,
      dataToSave,
      source,
      { overwrite: true }
    );

    if (!remoteSaveResult.success) {
      return remoteSaveResult;
    }

    // Retirer le conflit
    this.conflicts.delete(key);

    return localSaveResult;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Récupère tous les conflits en cours
   */
  getConflicts(): readonly SyncConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Vérifie si une clé a un conflit
   */
  hasConflict(key: string): boolean {
    return this.conflicts.has(key);
  }

  /**
   * Récupère le conflit pour une clé
   */
  getConflict(key: string): SyncConflict | undefined {
    return this.conflicts.get(key);
  }

  /**
   * Efface tous les conflits
   */
  clearConflicts(): void {
    this.conflicts.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createSyncEngine(
  localAdapter: PersistenceAdapter,
  remoteAdapter: PersistenceAdapter
): SyncEngine {
  return new SyncEngine(localAdapter, remoteAdapter);
}
