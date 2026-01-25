/**
 * OMEGA Canon Kernel — Operations
 * Operations are the atomic units of change in the Canon.
 */

import type { EntityId, OpId, RootHash } from './identifiers';
import type { EvidenceRef } from './evidence';

export type OpType =
  | 'SET'           // Create/Update field
  | 'UNSET'         // Remove field
  | 'PATCH'         // Partial update (merge)
  | 'LINK'          // Create relation
  | 'UNLINK'        // Remove relation
  | 'TOMBSTONE'     // Soft delete (never hard delete in Canon)
  | 'RESTORE'       // Restore tombstoned entity (requires gate approval)
  | 'MERGE_RESOLVE' // Resolve conflict
  | 'PROMOTE';      // Interpretation → Truth rail

export type FieldPath = readonly string[];

export interface CanonOp {
  readonly op_id: OpId;
  readonly type: OpType;
  readonly target: EntityId;
  readonly field_path?: FieldPath;
  readonly value?: unknown;
  readonly previous_hash?: RootHash;
  readonly evidence_refs: readonly EvidenceRef[];
}

export function createCanonOp(
  op_id: OpId,
  type: OpType,
  target: EntityId,
  options?: {
    field_path?: FieldPath;
    value?: unknown;
    previous_hash?: RootHash;
    evidence_refs?: readonly EvidenceRef[];
  }
): CanonOp {
  return {
    op_id,
    type,
    target,
    ...(options?.field_path !== undefined && { field_path: options.field_path }),
    ...(options?.value !== undefined && { value: options.value }),
    ...(options?.previous_hash !== undefined && { previous_hash: options.previous_hash }),
    evidence_refs: options?.evidence_refs ?? [],
  };
}

export function sortOps(ops: readonly CanonOp[]): readonly CanonOp[] {
  return [...ops].sort((a, b) => a.op_id.localeCompare(b.op_id));
}
