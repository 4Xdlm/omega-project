/**
 * OMEGA Canon Lineage v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-LINEAGE-01: lineage_hash = SHA256(canonical(parent)) or SHA256("GENESIS")
 * - INV-E-LINEAGE-02: Chain verification via parent hashes
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §7
 */

import { hashCanonical, sha256 } from '../shared/canonical';
import type { CanonClaim, ChainHash, Lineage, LineageSource } from './types';
import { isLineageSource, isValidConfidence, CanonError, CanonErrorCode } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genesis hash for first claim in chain.
 * SHA256("GENESIS")
 */
export const GENESIS_HASH: ChainHash = sha256('GENESIS') as ChainHash;

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parameters for creating lineage.
 */
export interface CreateLineageParams {
  readonly source: LineageSource;
  readonly sourceId?: string;
  readonly confidence?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Creates a validated Lineage object.
 * @param params - Lineage parameters
 * @returns Validated Lineage
 * @throws CanonError if validation fails
 */
export function createLineage(params: CreateLineageParams): Lineage {
  // Validate source (INV-E-LINEAGE-01)
  if (!isLineageSource(params.source)) {
    throw new CanonError(
      CanonErrorCode.INVALID_LINEAGE,
      `Invalid source: ${params.source}`,
      { source: params.source }
    );
  }

  // Validate confidence
  const confidence = params.confidence ?? 1.0;
  if (!isValidConfidence(confidence)) {
    throw new CanonError(
      CanonErrorCode.INVALID_LINEAGE,
      `Invalid confidence: ${confidence} (must be 0.0-1.0)`,
      { confidence }
    );
  }

  return {
    source: params.source,
    sourceId: params.sourceId,
    confidence,
    metadata: params.metadata,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes the hash for chain linking.
 * - For genesis claim: SHA256("GENESIS")
 * - For subsequent claims: hash of previous claim
 *
 * INV-E-LINEAGE-01
 *
 * @param parentClaim - Parent claim (null for genesis)
 * @returns Chain hash for prevHash field
 */
export function computePrevHash(parentClaim: CanonClaim | null): ChainHash {
  if (parentClaim === null) {
    return GENESIS_HASH;
  }
  return parentClaim.hash;
}

/**
 * Computes the lineage hash from parent claim data.
 * This is the hash of the canonical form of the parent claim.
 *
 * @param parentClaim - Parent claim (null for genesis)
 * @returns Lineage hash
 */
export function computeLineageHash(parentClaim: CanonClaim | null): ChainHash {
  if (parentClaim === null) {
    return sha256('GENESIS') as ChainHash;
  }
  return hashCanonical(parentClaim) as ChainHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of chain verification.
 */
export interface ChainVerificationResult {
  readonly valid: boolean;
  readonly claimCount: number;
  readonly brokenAt?: number;
  readonly expectedHash?: ChainHash;
  readonly actualHash?: ChainHash;
  readonly message?: string;
}

/**
 * Verifies the integrity of a claim chain.
 *
 * INV-E-LINEAGE-02
 *
 * @param claims - Ordered array of claims (oldest first)
 * @returns Verification result
 */
export function verifyLineageChain(claims: readonly CanonClaim[]): ChainVerificationResult {
  if (claims.length === 0) {
    return { valid: true, claimCount: 0 };
  }

  // First claim must have GENESIS prevHash
  const firstClaim = claims[0];
  if (firstClaim.prevHash !== GENESIS_HASH) {
    return {
      valid: false,
      claimCount: claims.length,
      brokenAt: 0,
      expectedHash: GENESIS_HASH,
      actualHash: firstClaim.prevHash ?? undefined,
      message: 'First claim prevHash must be GENESIS_HASH',
    };
  }

  // Verify chain continuity
  for (let i = 1; i < claims.length; i++) {
    const current = claims[i];
    const previous = claims[i - 1];

    if (current.prevHash !== previous.hash) {
      return {
        valid: false,
        claimCount: claims.length,
        brokenAt: i,
        expectedHash: previous.hash,
        actualHash: current.prevHash ?? undefined,
        message: `Chain broken at index ${i}: prevHash mismatch`,
      };
    }
  }

  return { valid: true, claimCount: claims.length };
}

/**
 * Gets the parent claim from a catalog by following prevHash.
 *
 * @param claim - Claim to find parent of
 * @param claimIndex - Index of claims by hash
 * @returns Parent claim or null if genesis
 */
export function getParentClaim(
  claim: CanonClaim,
  claimIndex: Map<ChainHash, CanonClaim>
): CanonClaim | null {
  if (claim.prevHash === null || claim.prevHash === GENESIS_HASH) {
    return null;
  }
  return claimIndex.get(claim.prevHash) ?? null;
}

/**
 * Builds a hash index from claims.
 *
 * @param claims - Array of claims
 * @returns Map from hash to claim
 */
export function buildHashIndex(claims: readonly CanonClaim[]): Map<ChainHash, CanonClaim> {
  const index = new Map<ChainHash, CanonClaim>();
  for (const claim of claims) {
    index.set(claim.hash, claim);
  }
  return index;
}

/**
 * Verifies a single claim's hash matches its content.
 *
 * @param claim - Claim to verify
 * @returns true if hash is valid
 */
export function verifyClaimHash(claim: CanonClaim): boolean {
  // Compute hash excluding the hash field itself
  const { hash, ...claimWithoutHash } = claim;
  const computedHash = hashCanonical(claimWithoutHash);
  return computedHash === hash;
}

/**
 * Verifies all claims in a chain have valid hashes.
 *
 * @param claims - Array of claims
 * @returns Index of first invalid claim, or -1 if all valid
 */
export function verifyAllClaimHashes(claims: readonly CanonClaim[]): number {
  for (let i = 0; i < claims.length; i++) {
    if (!verifyClaimHash(claims[i])) {
      return i;
    }
  }
  return -1;
}
