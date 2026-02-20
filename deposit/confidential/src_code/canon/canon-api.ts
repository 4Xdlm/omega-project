/**
 * OMEGA Canon API v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-PIPELINE-01: Guard → Write → Receipt
 * - INV-E-PIPELINE-02: Bijection writes/receipts
 * - INV-E-CONFLICT-02: Guard FAIL = no write
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §11
 */

import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Clock } from '../shared/clock';
import { SystemClock } from '../shared/clock';
import { hashCanonical } from '../shared/canonical';
import type { ConfigResolver } from './config-symbol';
import { createTestConfigResolver } from './config-symbol';
import type {
  CanonClaim,
  ClaimId,
  EntityId,
  PredicateType,
  ChainHash,
  MonoNs,
  CanonVersion,
  CreateClaimParams,
} from './types';
import { CanonError, CanonErrorCode, ClaimStatus } from './types';
import { CanonGuard, ConflictResult, ClaimStore, ValidationResult } from './guard';
import { computePrevHash, GENESIS_HASH, verifyLineageChain, ChainVerificationResult } from './lineage';
import { validatePredicate } from './predicate-catalog';
import { containsNaN, normalizeForCanon, normalizeUndefined } from './semantic-equals';
import type { CanonIndex } from './index-builder';
import { buildIndex, createEmptyIndex, saveIndex, loadIndex, mergeIndexes } from './index-builder';
import type { QueryOptions, QueryResult, ClaimRetriever } from './query';
import { query, getById, InMemoryClaimRetriever } from './query';
import type { SegmentManifest } from './segment-manifest';
import { loadOrCreateManifest, saveManifest, getManifestStats } from './segment-manifest';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canon API configuration.
 */
export interface CanonConfig {
  readonly storageDir: string;
  readonly configResolver?: ConfigResolver;
  readonly clock?: Clock;
  readonly guardEnabled?: boolean;
}

/**
 * Canon storage statistics.
 */
export interface CanonStats {
  readonly claimCount: number;
  readonly segmentCount: number;
  readonly totalBytes: number;
  readonly indexSize: number;
  readonly lastClaimAt: MonoNs | null;
  readonly chainValid: boolean;
}

/**
 * Result type for operations that can fail.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Canon API interface.
 */
export interface CanonAPI {
  /** Initialize CANON storage */
  init(): Promise<void>;

  /** Create a new claim (with guard check) */
  createClaim(params: CreateClaimParams): Promise<Result<CanonClaim, CanonError>>;

  /** Get claim by ID */
  getClaim(id: ClaimId): Promise<CanonClaim | null>;

  /** Query claims */
  query(options: QueryOptions): Promise<QueryResult>;

  /** Get all claims for a subject */
  getClaimsForSubject(subject: EntityId): Promise<readonly CanonClaim[]>;

  /** Get active claims for a subject and predicate */
  getActiveClaimsBySubjectAndPredicate(
    subject: EntityId,
    predicate: PredicateType
  ): Promise<readonly CanonClaim[]>;

  /** Check for conflicts before insert */
  checkConflicts(params: CreateClaimParams): Promise<ConflictResult>;

  /** Verify chain integrity */
  verifyIntegrity(): Promise<ChainVerificationResult>;

  /** Get storage statistics */
  getStats(): Promise<CanonStats>;

  /** Close and cleanup */
  close(): Promise<void>;

  /** Get all claims (for testing/debugging) */
  getAllClaims(): Promise<readonly CanonClaim[]>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default Canon API implementation.
 *
 * INV-E-PIPELINE-01: All writes go through Guard first
 * INV-E-CONFLICT-02: Guard FAIL = no write
 */
export class DefaultCanonAPI implements CanonAPI, ClaimStore, ClaimRetriever {
  private readonly config: CanonConfig;
  private readonly clock: Clock;
  private readonly guard: CanonGuard;
  private readonly guardEnabled: boolean;

  private claims: Map<ClaimId, CanonClaim> = new Map();
  private claimsByHash: Map<ChainHash, CanonClaim> = new Map();
  private claimChain: CanonClaim[] = [];
  private index: CanonIndex | null = null;
  private manifest: SegmentManifest | null = null;
  private version: number = 0;
  private initialized: boolean = false;

  constructor(config: CanonConfig) {
    this.config = config;
    this.clock = config.clock ?? SystemClock;
    this.guard = new CanonGuard();
    this.guardEnabled = config.guardEnabled ?? true;
  }

  // ─── Initialization ───

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create storage directory
    if (!existsSync(this.config.storageDir)) {
      await mkdir(this.config.storageDir, { recursive: true });
    }

    // Load manifest
    const timestamp = this.clock.nowMonoNs() as MonoNs;
    this.manifest = await loadOrCreateManifest(this.config.storageDir, timestamp);

    // Load or create index
    this.index = await loadIndex(this.config.storageDir);
    if (!this.index) {
      this.index = createEmptyIndex(timestamp);
    }

    this.initialized = true;
  }

  // ─── Write Operations ───

  async createClaim(params: CreateClaimParams): Promise<Result<CanonClaim, CanonError>> {
    this.ensureInitialized();

    // Step 1: Validate params
    const validation = this.guard.validateClaimParams(params);
    if (!validation.valid) {
      const firstError = validation.errors[0];
      return {
        ok: false,
        error: new CanonError(firstError.code, firstError.message),
      };
    }

    // Step 2: Check conflicts (INV-E-PIPELINE-01)
    if (this.guardEnabled) {
      const conflictResult = this.guard.checkDirectConflict(
        {
          subject: params.subject,
          predicate: params.predicate,
          value: params.value,
          supersedes: params.supersedes,
        },
        this
      );

      if (conflictResult.hasConflict) {
        return {
          ok: false,
          error: new CanonError(
            CanonErrorCode.CONTRADICTION_DIRECT,
            conflictResult.message ?? 'Conflict detected'
          ),
        };
      }
    }

    // Step 3: Build claim
    const timestamp = this.clock.nowMonoNs() as MonoNs;
    const prevHash = this.getLatestHash();

    // Generate claim ID
    const claimId = `CLM-${timestamp.toString(16)}-${Math.random().toString(16).slice(2, 10)}` as ClaimId;

    // Normalize value
    const normalizedValue = normalizeForCanon(params.value);

    // Build claim without hash first
    // Note: supersedes is omitted if undefined to avoid serialization issues
    const claimData: Record<string, unknown> = {
      id: claimId,
      subject: params.subject,
      predicate: params.predicate,
      value: normalizedValue,
      mono_ns: timestamp,
      version: (++this.version) as CanonVersion,
      lineage: params.lineage,
      evidence: params.evidence,
      status: params.status ?? ClaimStatus.ACTIVE,
      prevHash,
    };

    // Only add supersedes if defined
    if (params.supersedes !== undefined) {
      claimData.supersedes = params.supersedes;
    }

    // Normalize for canonicalization (handle any remaining undefined values)
    const normalizedClaimData = normalizeUndefined(claimData);

    // Compute hash
    const hash = hashCanonical(normalizedClaimData) as ChainHash;
    const claim: CanonClaim = { ...claimData, hash } as CanonClaim;

    // Step 4: Store claim
    this.claims.set(claim.id, claim);
    this.claimsByHash.set(claim.hash, claim);
    this.claimChain.push(claim);

    // Step 5: Update index
    this.index = buildIndex(
      [claim],
      'memory',
      timestamp
    );
    if (this.claimChain.length > 1) {
      const previousIndex = buildIndex(
        this.claimChain.slice(0, -1),
        'memory',
        timestamp
      );
      this.index = mergeIndexes(previousIndex, this.index, timestamp);
    }

    // Step 6: Handle supersession
    if (claim.supersedes) {
      const superseded = this.claims.get(claim.supersedes);
      if (superseded) {
        const updated: CanonClaim = { ...superseded, status: ClaimStatus.SUPERSEDED };
        this.claims.set(superseded.id, updated);
        // Update in chain too
        const chainIdx = this.claimChain.findIndex((c) => c.id === superseded.id);
        if (chainIdx >= 0) {
          this.claimChain[chainIdx] = updated;
        }
      }
    }

    return { ok: true, value: claim };
  }

  // ─── Read Operations ───

  async getClaim(id: ClaimId): Promise<CanonClaim | null> {
    this.ensureInitialized();
    return this.claims.get(id) ?? null;
  }

  async query(options: QueryOptions): Promise<QueryResult> {
    this.ensureInitialized();
    return query(this.index!, this, options);
  }

  async getClaimsForSubject(subject: EntityId): Promise<readonly CanonClaim[]> {
    this.ensureInitialized();
    const result = await this.query({ subject });
    return result.claims;
  }

  async getActiveClaimsBySubjectAndPredicate(
    subject: EntityId,
    predicate: PredicateType
  ): Promise<readonly CanonClaim[]> {
    this.ensureInitialized();
    const result = await this.query({
      subject,
      predicate,
      status: ClaimStatus.ACTIVE,
    });
    return result.claims;
  }

  async getAllClaims(): Promise<readonly CanonClaim[]> {
    this.ensureInitialized();
    return [...this.claimChain];
  }

  // ─── Conflict Check ───

  async checkConflicts(params: CreateClaimParams): Promise<ConflictResult> {
    this.ensureInitialized();
    return this.guard.checkDirectConflict(
      {
        subject: params.subject,
        predicate: params.predicate,
        value: params.value,
        supersedes: params.supersedes,
      },
      this
    );
  }

  // ─── Integrity ───

  async verifyIntegrity(): Promise<ChainVerificationResult> {
    this.ensureInitialized();
    return verifyLineageChain(this.claimChain);
  }

  // ─── Statistics ───

  async getStats(): Promise<CanonStats> {
    this.ensureInitialized();
    const integrity = await this.verifyIntegrity();

    return {
      claimCount: this.claims.size,
      segmentCount: this.manifest?.segments.length ?? 0,
      totalBytes: this.manifest?.totalBytes ?? 0,
      indexSize: this.index?.claimCount ?? 0,
      lastClaimAt: this.claimChain.length > 0 ? this.claimChain[this.claimChain.length - 1].mono_ns : null,
      chainValid: integrity.valid,
    };
  }

  // ─── Lifecycle ───

  async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    // Save index
    if (this.index) {
      await saveIndex(this.config.storageDir, this.index);
    }

    // Save manifest
    if (this.manifest) {
      await saveManifest(this.config.storageDir, this.manifest);
    }

    this.initialized = false;
  }

  // ─── ClaimStore Interface ───

  getById(id: ClaimId): CanonClaim | undefined {
    return this.claims.get(id);
  }

  getBySubjectAndPredicate(subject: EntityId, predicate: PredicateType): readonly CanonClaim[] {
    return this.claimChain.filter(
      (c) => c.subject === subject && c.predicate === predicate
    );
  }

  getAllEntityIds(): readonly EntityId[] {
    const entities = new Set<EntityId>();
    for (const claim of this.claimChain) {
      entities.add(claim.subject);
    }
    return Array.from(entities);
  }

  // ─── ClaimRetriever Interface ───

  async getByIds(ids: readonly ClaimId[]): Promise<readonly CanonClaim[]> {
    return ids.map((id) => this.claims.get(id)).filter((c): c is CanonClaim => c !== undefined);
  }

  async getByHash(hash: ChainHash): Promise<CanonClaim | null> {
    return this.claimsByHash.get(hash) ?? null;
  }

  // ─── Private Helpers ───

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new CanonError(CanonErrorCode.STORAGE_FAILED, 'Canon API not initialized. Call init() first.');
    }
  }

  private getLatestHash(): ChainHash | null {
    if (this.claimChain.length === 0) {
      return GENESIS_HASH;
    }
    return this.claimChain[this.claimChain.length - 1].hash;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates and initializes a Canon API instance.
 */
export async function createCanonAPI(config: CanonConfig): Promise<CanonAPI> {
  const api = new DefaultCanonAPI(config);
  await api.init();
  return api;
}

/**
 * Creates a Canon API for testing (in-memory).
 */
export function createTestCanonAPI(storageDir: string = '/tmp/canon-test'): DefaultCanonAPI {
  return new DefaultCanonAPI({
    storageDir,
    guardEnabled: true,
  });
}
