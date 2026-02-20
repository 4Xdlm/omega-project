/**
 * OMEGA Canon Query Engine v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-QUERY-01: Query déterministe (même query = même résultat)
 * - INV-E-QUERY-02: Query sur index, pas full scan
 * - INV-E-READ-01: Index-based lookup
 * - INV-E-READ-03: Déterministe
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §10
 */

import { sha256 } from '../shared/canonical';
import type {
  CanonClaim,
  ClaimId,
  EntityId,
  PredicateType,
  ClaimStatus,
  ChainHash,
} from './types';
import type { CanonIndex, ClaimOffset } from './index-builder';
import {
  getClaimIdsBySubject,
  getClaimIdsByPredicate,
  getClaimIdsByStatus,
  getClaimIdsBySubjectAndPredicate,
  getClaimOffset,
} from './index-builder';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query options for filtering claims.
 */
export interface QueryOptions {
  readonly subject?: EntityId;
  readonly predicate?: PredicateType;
  readonly status?: ClaimStatus;
  readonly objectEntity?: EntityId;
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: 'timestamp' | 'id';
  readonly orderDir?: 'asc' | 'desc';
}

/**
 * Query result with metadata.
 */
export interface QueryResult {
  readonly claims: readonly CanonClaim[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly queryHash: ChainHash;
  readonly durationMs: number;
}

/**
 * Claim store interface for retrieval.
 */
export interface ClaimRetriever {
  getById(id: ClaimId): Promise<CanonClaim | null>;
  getByIds(ids: readonly ClaimId[]): Promise<readonly CanonClaim[]>;
  getByHash(hash: ChainHash): Promise<CanonClaim | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Executes a query against the index.
 *
 * INV-E-QUERY-01: Deterministic results
 * INV-E-QUERY-02: Uses index, not full scan
 */
export async function query(
  index: CanonIndex,
  retriever: ClaimRetriever,
  options: QueryOptions
): Promise<QueryResult> {
  const startTime = performance.now();

  // Compute query hash for caching/determinism
  const queryHash = computeQueryHash(options);

  // Get candidate claim IDs from index (INV-E-QUERY-02)
  let candidateIds = getCandidateIds(index, options);

  // Apply offset and limit (INV-E-QUERY-01: deterministic)
  const total = candidateIds.length;
  const offset = options.offset ?? 0;
  const limit = options.limit ?? total;

  candidateIds = candidateIds.slice(offset, offset + limit);

  // Retrieve claims
  const claims = await retriever.getByIds(candidateIds);

  // Apply additional filters that can't use index
  let filtered = [...claims];

  // Filter by status if specified (can also use index optimization above)
  if (options.status && !candidateIdsFilteredByStatus(options)) {
    filtered = filtered.filter((c) => c.status === options.status);
  }

  // Sort (INV-E-QUERY-01: deterministic order)
  filtered = sortClaims(filtered, options.orderBy ?? 'id', options.orderDir ?? 'asc');

  const durationMs = performance.now() - startTime;

  return {
    claims: Object.freeze(filtered),
    total,
    hasMore: offset + filtered.length < total,
    queryHash,
    durationMs,
  };
}

/**
 * Gets candidate claim IDs from the index based on query options.
 *
 * INV-E-QUERY-02: Index-based lookup
 */
function getCandidateIds(index: CanonIndex, options: QueryOptions): ClaimId[] {
  let ids: ClaimId[] | null = null;

  // Most specific query: subject + predicate
  if (options.subject && options.predicate) {
    ids = [...getClaimIdsBySubjectAndPredicate(index, options.subject, options.predicate)];
  }
  // Query by subject only
  else if (options.subject) {
    ids = [...getClaimIdsBySubject(index, options.subject)];
  }
  // Query by predicate only
  else if (options.predicate) {
    ids = [...getClaimIdsByPredicate(index, options.predicate)];
  }
  // Query by status only
  else if (options.status) {
    ids = [...getClaimIdsByStatus(index, options.status)];
  }
  // No filter: return all claim IDs
  else {
    ids = Array.from(index.claimOffsets.keys());
  }

  // Further filter by status if needed (and not already filtered)
  if (options.status && !candidateIdsFilteredByStatus(options)) {
    const statusIds = new Set(getClaimIdsByStatus(index, options.status));
    ids = ids.filter((id) => statusIds.has(id));
  }

  // Filter by object entity if specified
  if (options.objectEntity) {
    const objectIds = new Set(index.byObjectEntity.get(options.objectEntity as string) ?? []);
    ids = ids.filter((id) => objectIds.has(id));
  }

  // Sort for determinism (INV-E-QUERY-01)
  ids.sort();

  return ids;
}

/**
 * Check if candidate IDs are already filtered by status.
 */
function candidateIdsFilteredByStatus(options: QueryOptions): boolean {
  // If status is the only filter, IDs are already filtered
  return !options.subject && !options.predicate && !!options.status;
}

/**
 * Sorts claims by the specified field.
 *
 * INV-E-QUERY-01: Deterministic ordering
 */
function sortClaims(
  claims: CanonClaim[],
  orderBy: 'timestamp' | 'id',
  orderDir: 'asc' | 'desc'
): CanonClaim[] {
  const multiplier = orderDir === 'asc' ? 1 : -1;

  return claims.sort((a, b) => {
    if (orderBy === 'timestamp') {
      // Compare by mono_ns (bigint)
      if (a.mono_ns < b.mono_ns) return -1 * multiplier;
      if (a.mono_ns > b.mono_ns) return 1 * multiplier;
      return 0;
    } else {
      // Compare by id (string)
      return a.id.localeCompare(b.id) * multiplier;
    }
  });
}

/**
 * Computes a deterministic hash of query options.
 */
function computeQueryHash(options: QueryOptions): ChainHash {
  const normalized = {
    subject: options.subject ?? null,
    predicate: options.predicate ?? null,
    status: options.status ?? null,
    objectEntity: options.objectEntity ?? null,
    limit: options.limit ?? null,
    offset: options.offset ?? null,
    orderBy: options.orderBy ?? 'id',
    orderDir: options.orderDir ?? 'asc',
  };
  return sha256(JSON.stringify(normalized)) as ChainHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets a claim by ID.
 *
 * INV-E-READ-01: Direct lookup
 */
export async function getById(
  retriever: ClaimRetriever,
  id: ClaimId
): Promise<CanonClaim | null> {
  return retriever.getById(id);
}

/**
 * Gets a claim by hash.
 */
export async function getByHash(
  retriever: ClaimRetriever,
  hash: ChainHash
): Promise<CanonClaim | null> {
  return retriever.getByHash(hash);
}

/**
 * Gets all claims for a subject.
 */
export async function getClaimsForSubject(
  index: CanonIndex,
  retriever: ClaimRetriever,
  subject: EntityId
): Promise<readonly CanonClaim[]> {
  const ids = getClaimIdsBySubject(index, subject);
  return retriever.getByIds(ids);
}

/**
 * Gets active claims for a subject.
 */
export async function getActiveClaimsForSubject(
  index: CanonIndex,
  retriever: ClaimRetriever,
  subject: EntityId
): Promise<readonly CanonClaim[]> {
  const result = await query(index, retriever, {
    subject,
    status: 'ACTIVE' as ClaimStatus,
  });
  return result.claims;
}

/**
 * Gets claims by subject and predicate.
 */
export async function getClaimsBySubjectAndPredicate(
  index: CanonIndex,
  retriever: ClaimRetriever,
  subject: EntityId,
  predicate: PredicateType
): Promise<readonly CanonClaim[]> {
  const ids = getClaimIdsBySubjectAndPredicate(index, subject, predicate);
  return retriever.getByIds(ids);
}

/**
 * Gets active claims by subject and predicate.
 */
export async function getActiveClaimsBySubjectAndPredicate(
  index: CanonIndex,
  retriever: ClaimRetriever,
  subject: EntityId,
  predicate: PredicateType
): Promise<readonly CanonClaim[]> {
  const result = await query(index, retriever, {
    subject,
    predicate,
    status: 'ACTIVE' as ClaimStatus,
  });
  return result.claims;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY RETRIEVER (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory claim retriever for testing.
 */
export class InMemoryClaimRetriever implements ClaimRetriever {
  private readonly claims: Map<ClaimId, CanonClaim>;
  private readonly byHash: Map<ChainHash, CanonClaim>;

  constructor(claims: readonly CanonClaim[] = []) {
    this.claims = new Map(claims.map((c) => [c.id, c]));
    this.byHash = new Map(claims.map((c) => [c.hash, c]));
  }

  async getById(id: ClaimId): Promise<CanonClaim | null> {
    return this.claims.get(id) ?? null;
  }

  async getByIds(ids: readonly ClaimId[]): Promise<readonly CanonClaim[]> {
    return ids.map((id) => this.claims.get(id)).filter((c): c is CanonClaim => c !== undefined);
  }

  async getByHash(hash: ChainHash): Promise<CanonClaim | null> {
    return this.byHash.get(hash) ?? null;
  }

  /** Add a claim (test helper) */
  addClaim(claim: CanonClaim): void {
    this.claims.set(claim.id, claim);
    this.byHash.set(claim.hash, claim);
  }

  /** Get all claims (test helper) */
  getAllClaims(): readonly CanonClaim[] {
    return Array.from(this.claims.values());
  }
}
