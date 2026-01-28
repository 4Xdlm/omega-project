/**
 * OMEGA Canon Index Builder v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-IDX-01: Index 100% reconstructible from segments
 * - INV-E-IDX-02: Bijection claim_id <-> offset
 * - INV-E-IDX-03: Rebuild déterministe
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §6
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { withLock } from '../shared/lock';
import { sha256, canonicalize } from '../shared/canonical';
import type {
  CanonClaim,
  ClaimId,
  EntityId,
  PredicateType,
  ClaimStatus,
  ChainHash,
  MonoNs,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canon index structure.
 */
export interface CanonIndex {
  /** Claims by subject entity */
  readonly bySubject: ReadonlyMap<string, readonly ClaimId[]>;

  /** Claims by predicate type */
  readonly byPredicate: ReadonlyMap<string, readonly ClaimId[]>;

  /** Claims by status */
  readonly byStatus: ReadonlyMap<string, readonly ClaimId[]>;

  /** Claims by object entity (when value is entity reference) */
  readonly byObjectEntity: ReadonlyMap<string, readonly ClaimId[]>;

  /** Claim ID to segment offset mapping */
  readonly claimOffsets: ReadonlyMap<ClaimId, ClaimOffset>;

  /** Total claim count */
  readonly claimCount: number;

  /** Index hash for integrity */
  readonly indexHash: ChainHash;

  /** Build timestamp */
  readonly builtAt: MonoNs;
}

/**
 * Claim offset within storage.
 */
export interface ClaimOffset {
  readonly segmentId: string;
  readonly lineNumber: number;
}

/**
 * Mutable index for building.
 */
interface MutableIndex {
  bySubject: Map<string, ClaimId[]>;
  byPredicate: Map<string, ClaimId[]>;
  byStatus: Map<string, ClaimId[]>;
  byObjectEntity: Map<string, ClaimId[]>;
  claimOffsets: Map<ClaimId, ClaimOffset>;
  claimCount: number;
  indexHash: ChainHash;
  builtAt: MonoNs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX BUILDING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds an index from a list of claims.
 *
 * INV-E-IDX-01: Index reconstructible from claims
 * INV-E-IDX-03: Deterministic result
 */
export function buildIndex(
  claims: readonly CanonClaim[],
  segmentId: string,
  timestamp: MonoNs
): CanonIndex {
  const index: MutableIndex = {
    bySubject: new Map(),
    byPredicate: new Map(),
    byStatus: new Map(),
    byObjectEntity: new Map(),
    claimOffsets: new Map(),
    claimCount: 0,
    indexHash: '' as ChainHash,
    builtAt: timestamp,
  };

  // Index each claim
  for (let lineNumber = 0; lineNumber < claims.length; lineNumber++) {
    const claim = claims[lineNumber];
    indexClaim(index, claim, segmentId, lineNumber);
  }

  // Compute index hash (INV-E-IDX-03: deterministic)
  index.indexHash = computeIndexHash(index);

  return freezeIndex(index);
}

/**
 * Indexes a single claim into the mutable index.
 */
function indexClaim(
  index: MutableIndex,
  claim: CanonClaim,
  segmentId: string,
  lineNumber: number
): void {
  // Store offset (INV-E-IDX-02)
  index.claimOffsets.set(claim.id, { segmentId, lineNumber });
  index.claimCount++;

  // Index by subject
  const subjectKey = claim.subject as string;
  if (!index.bySubject.has(subjectKey)) {
    index.bySubject.set(subjectKey, []);
  }
  index.bySubject.get(subjectKey)!.push(claim.id);

  // Index by predicate
  const predicateKey = claim.predicate as string;
  if (!index.byPredicate.has(predicateKey)) {
    index.byPredicate.set(predicateKey, []);
  }
  index.byPredicate.get(predicateKey)!.push(claim.id);

  // Index by status
  const statusKey = claim.status;
  if (!index.byStatus.has(statusKey)) {
    index.byStatus.set(statusKey, []);
  }
  index.byStatus.get(statusKey)!.push(claim.id);

  // Index by object entity (if value is an entity reference)
  if (typeof claim.value === 'string' && claim.value.startsWith('ENT-')) {
    const entityKey = claim.value;
    if (!index.byObjectEntity.has(entityKey)) {
      index.byObjectEntity.set(entityKey, []);
    }
    index.byObjectEntity.get(entityKey)!.push(claim.id);
  }
}

/**
 * Freezes a mutable index into an immutable one.
 */
function freezeIndex(index: MutableIndex): CanonIndex {
  return {
    bySubject: new Map(
      Array.from(index.bySubject.entries()).map(([k, v]) => [k, Object.freeze([...v])])
    ),
    byPredicate: new Map(
      Array.from(index.byPredicate.entries()).map(([k, v]) => [k, Object.freeze([...v])])
    ),
    byStatus: new Map(
      Array.from(index.byStatus.entries()).map(([k, v]) => [k, Object.freeze([...v])])
    ),
    byObjectEntity: new Map(
      Array.from(index.byObjectEntity.entries()).map(([k, v]) => [k, Object.freeze([...v])])
    ),
    claimOffsets: new Map(index.claimOffsets),
    claimCount: index.claimCount,
    indexHash: index.indexHash,
    builtAt: index.builtAt,
  };
}

/**
 * Computes a deterministic hash of the index.
 *
 * INV-E-IDX-03: Same claims = same hash
 */
function computeIndexHash(index: MutableIndex): ChainHash {
  // Sort all claim IDs for determinism
  const allClaimIds = Array.from(index.claimOffsets.keys()).sort();
  const hashData = allClaimIds.join(',');
  return sha256(hashData) as ChainHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX MERGING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Merges two indexes into one.
 *
 * INV-E-IDX-03: Merge is deterministic
 */
export function mergeIndexes(a: CanonIndex, b: CanonIndex, timestamp: MonoNs): CanonIndex {
  const merged: MutableIndex = {
    bySubject: new Map(),
    byPredicate: new Map(),
    byStatus: new Map(),
    byObjectEntity: new Map(),
    claimOffsets: new Map(),
    claimCount: 0,
    indexHash: '' as ChainHash,
    builtAt: timestamp,
  };

  // Merge claim offsets from both indexes
  for (const [id, offset] of a.claimOffsets) {
    merged.claimOffsets.set(id, offset);
  }
  for (const [id, offset] of b.claimOffsets) {
    merged.claimOffsets.set(id, offset);
  }
  merged.claimCount = merged.claimOffsets.size;

  // Merge bySubject
  mergeMapLists(merged.bySubject, a.bySubject);
  mergeMapLists(merged.bySubject, b.bySubject);

  // Merge byPredicate
  mergeMapLists(merged.byPredicate, a.byPredicate);
  mergeMapLists(merged.byPredicate, b.byPredicate);

  // Merge byStatus
  mergeMapLists(merged.byStatus, a.byStatus);
  mergeMapLists(merged.byStatus, b.byStatus);

  // Merge byObjectEntity
  mergeMapLists(merged.byObjectEntity, a.byObjectEntity);
  mergeMapLists(merged.byObjectEntity, b.byObjectEntity);

  // Compute hash
  merged.indexHash = computeIndexHash(merged);

  return freezeIndex(merged);
}

/**
 * Merges a source map into a target map.
 */
function mergeMapLists(
  target: Map<string, ClaimId[]>,
  source: ReadonlyMap<string, readonly ClaimId[]>
): void {
  for (const [key, ids] of source) {
    if (!target.has(key)) {
      target.set(key, []);
    }
    for (const id of ids) {
      if (!target.get(key)!.includes(id)) {
        target.get(key)!.push(id);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets claim IDs by subject.
 */
export function getClaimIdsBySubject(index: CanonIndex, subject: EntityId): readonly ClaimId[] {
  return index.bySubject.get(subject as string) ?? [];
}

/**
 * Gets claim IDs by predicate.
 */
export function getClaimIdsByPredicate(
  index: CanonIndex,
  predicate: PredicateType
): readonly ClaimId[] {
  return index.byPredicate.get(predicate as string) ?? [];
}

/**
 * Gets claim IDs by status.
 */
export function getClaimIdsByStatus(index: CanonIndex, status: ClaimStatus): readonly ClaimId[] {
  return index.byStatus.get(status) ?? [];
}

/**
 * Gets claim IDs by subject AND predicate.
 */
export function getClaimIdsBySubjectAndPredicate(
  index: CanonIndex,
  subject: EntityId,
  predicate: PredicateType
): readonly ClaimId[] {
  const bySubject = new Set(index.bySubject.get(subject as string) ?? []);
  const byPredicate = index.byPredicate.get(predicate as string) ?? [];
  return byPredicate.filter((id) => bySubject.has(id));
}

/**
 * Gets claim offset by ID.
 */
export function getClaimOffset(index: CanonIndex, id: ClaimId): ClaimOffset | undefined {
  return index.claimOffsets.get(id);
}

/**
 * Checks if index contains a claim ID.
 */
export function hasClaimId(index: CanonIndex, id: ClaimId): boolean {
  return index.claimOffsets.has(id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

const INDEX_FILENAME = 'index.json';

/**
 * Serializable index format.
 */
interface SerializedIndex {
  bySubject: Record<string, string[]>;
  byPredicate: Record<string, string[]>;
  byStatus: Record<string, string[]>;
  byObjectEntity: Record<string, string[]>;
  claimOffsets: Record<string, ClaimOffset>;
  claimCount: number;
  indexHash: string;
  builtAt: string;
}

/**
 * Saves an index to disk.
 */
export async function saveIndex(storageDir: string, index: CanonIndex): Promise<void> {
  const indexPath = join(storageDir, INDEX_FILENAME);

  if (!existsSync(storageDir)) {
    await mkdir(storageDir, { recursive: true });
  }

  const serialized: SerializedIndex = {
    bySubject: mapToRecord(index.bySubject),
    byPredicate: mapToRecord(index.byPredicate),
    byStatus: mapToRecord(index.byStatus),
    byObjectEntity: mapToRecord(index.byObjectEntity),
    claimOffsets: Object.fromEntries(index.claimOffsets),
    claimCount: index.claimCount,
    indexHash: index.indexHash,
    builtAt: index.builtAt.toString(),
  };

  const content = JSON.stringify(serialized, null, 2);

  await withLock(indexPath, async () => {
    await writeFile(indexPath, content, 'utf-8');
  });
}

/**
 * Loads an index from disk.
 */
export async function loadIndex(storageDir: string): Promise<CanonIndex | null> {
  const indexPath = join(storageDir, INDEX_FILENAME);

  if (!existsSync(indexPath)) {
    return null;
  }

  const content = await readFile(indexPath, 'utf-8');
  const serialized = JSON.parse(content) as SerializedIndex;

  return {
    bySubject: recordToMap(serialized.bySubject),
    byPredicate: recordToMap(serialized.byPredicate),
    byStatus: recordToMap(serialized.byStatus),
    byObjectEntity: recordToMap(serialized.byObjectEntity),
    claimOffsets: new Map(Object.entries(serialized.claimOffsets)) as Map<ClaimId, ClaimOffset>,
    claimCount: serialized.claimCount,
    indexHash: serialized.indexHash as ChainHash,
    builtAt: BigInt(serialized.builtAt) as MonoNs,
  };
}

/**
 * Converts a Map to a plain object.
 */
function mapToRecord(map: ReadonlyMap<string, readonly ClaimId[]>): Record<string, string[]> {
  const record: Record<string, string[]> = {};
  for (const [key, value] of map) {
    record[key] = [...value];
  }
  return record;
}

/**
 * Converts a plain object to a Map.
 */
function recordToMap(record: Record<string, string[]>): ReadonlyMap<string, readonly ClaimId[]> {
  return new Map(Object.entries(record).map(([k, v]) => [k, Object.freeze(v as ClaimId[])]));
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY INDEX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates an empty index.
 */
export function createEmptyIndex(timestamp: MonoNs): CanonIndex {
  const index: MutableIndex = {
    bySubject: new Map(),
    byPredicate: new Map(),
    byStatus: new Map(),
    byObjectEntity: new Map(),
    claimOffsets: new Map(),
    claimCount: 0,
    indexHash: '' as ChainHash,
    builtAt: timestamp,
  };

  index.indexHash = computeIndexHash(index);
  return freezeIndex(index);
}

/**
 * Verifies index integrity.
 */
export function verifyIndex(index: CanonIndex): boolean {
  // Recompute hash
  const recomputedHash = sha256(Array.from(index.claimOffsets.keys()).sort().join(','));
  return recomputedHash === index.indexHash;
}
