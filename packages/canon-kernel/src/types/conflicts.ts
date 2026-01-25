/**
 * OMEGA Canon Kernel — Conflicts
 * Conflict detection and resolution types.
 */

import type { EntityId, OpId, TxId, RootHash } from './identifiers';
import type { FieldPath, CanonOp } from './operations';
import type { EvidenceRef } from './evidence';

export type ConflictType =
  | 'concurrent_write'    // Two writes to same field
  | 'delete_update'       // Delete vs update
  | 'constraint_violation'// Invariant broken
  | 'critical_field'      // Critical field modified without gate
  | 'orphan_reference';   // Reference to deleted entity

export interface Conflict {
  readonly id: string;
  readonly type: ConflictType;
  readonly entity_id: EntityId;
  readonly field_path?: FieldPath;
  readonly op_a: OpId;
  readonly op_b: OpId;
  readonly tx_a: TxId;
  readonly tx_b: TxId;
  readonly description: string;
  readonly detected_at: RootHash;
}

export interface ConflictSet {
  readonly conflicts: readonly Conflict[];
  readonly root_hash: RootHash;
}

export type ResolutionStrategy =
  | 'accept_a'         // Accept op_a, reject op_b
  | 'accept_b'         // Accept op_b, reject op_a
  | 'merge'            // Merge both (if possible)
  | 'custom'           // Custom resolution
  | 'escalate';        // Escalate to human

export interface ResolutionOp {
  readonly conflict_id: string;
  readonly strategy: ResolutionStrategy;
  readonly resolved_value?: unknown;
  readonly actor: string;
  readonly reason: string;
  readonly evidence_refs: readonly EvidenceRef[];
}

export function createConflict(
  id: string,
  type: ConflictType,
  entity_id: EntityId,
  op_a: OpId,
  op_b: OpId,
  tx_a: TxId,
  tx_b: TxId,
  detected_at: RootHash,
  description: string,
  field_path?: FieldPath
): Conflict {
  return {
    id,
    type,
    entity_id,
    ...(field_path !== undefined && { field_path }),
    op_a,
    op_b,
    tx_a,
    tx_b,
    description,
    detected_at,
  };
}

export function isAutoResolvable(conflict: Conflict): boolean {
  // Critical fields and constraint violations require human intervention
  return conflict.type !== 'critical_field' && conflict.type !== 'constraint_violation';
}
