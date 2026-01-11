/**
 * @fileoverview Artifact Registry - Storage and retrieval of execution artifacts.
 * Provides deterministic artifact management with SHA-256 verification.
 * @module @omega/orchestrator-core/artifacts/ArtifactRegistry
 */

import { sha256 } from '../util/hash.js';
import { stableStringify } from '../util/stableJson.js';
import type { Clock } from '../util/clock.js';

/**
 * Artifact metadata.
 */
export interface ArtifactMetadata {
  /** Unique artifact identifier */
  id: string;
  /** Artifact type/kind */
  kind: string;
  /** Creation timestamp (ISO) */
  created_at: string;
  /** SHA-256 hash of content */
  hash: string;
  /** Content size in bytes */
  size: number;
  /** Optional tags for categorization */
  tags?: string[];
  /** Optional custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Stored artifact with content.
 */
export interface Artifact<T = unknown> {
  /** Artifact metadata */
  metadata: ArtifactMetadata;
  /** Artifact content */
  content: T;
}

/**
 * Artifact query options.
 */
export interface ArtifactQuery {
  /** Filter by kind */
  kind?: string;
  /** Filter by tags (all must match) */
  tags?: string[];
  /** Filter by creation time range */
  created_after?: string;
  created_before?: string;
  /** Maximum results */
  limit?: number;
}

/**
 * Artifact Registry interface.
 */
export interface ArtifactRegistry {
  /**
   * Stores an artifact.
   * @param kind - Artifact kind
   * @param content - Artifact content
   * @param options - Optional metadata
   * @returns Artifact metadata
   */
  store<T>(kind: string, content: T, options?: { tags?: string[]; custom?: Record<string, unknown> }): ArtifactMetadata;

  /**
   * Retrieves an artifact by ID.
   * @param id - Artifact ID
   * @returns Artifact or undefined if not found
   */
  get<T = unknown>(id: string): Artifact<T> | undefined;

  /**
   * Retrieves artifact metadata by ID.
   * @param id - Artifact ID
   * @returns Metadata or undefined if not found
   */
  getMetadata(id: string): ArtifactMetadata | undefined;

  /**
   * Queries artifacts by criteria.
   * @param query - Query options
   * @returns Array of matching artifact metadata
   */
  query(query: ArtifactQuery): ArtifactMetadata[];

  /**
   * Verifies artifact integrity.
   * @param id - Artifact ID
   * @returns true if hash matches content
   */
  verify(id: string): boolean;

  /**
   * Lists all artifact IDs.
   * @returns Array of artifact IDs
   */
  list(): string[];

  /**
   * Returns registry statistics.
   */
  stats(): { total: number; byKind: Record<string, number> };
}

/**
 * ID generator function type.
 */
export type IdGenerator = () => string;

/**
 * In-memory artifact registry implementation.
 */
export class InMemoryArtifactRegistry implements ArtifactRegistry {
  private readonly artifacts: Map<string, Artifact> = new Map();
  private readonly clock: Clock;
  private readonly generateId: IdGenerator;

  constructor(clock: Clock, idGenerator: IdGenerator) {
    this.clock = clock;
    this.generateId = idGenerator;
  }

  store<T>(kind: string, content: T, options?: { tags?: string[]; custom?: Record<string, unknown> }): ArtifactMetadata {
    const id = this.generateId();
    const serialized = stableStringify(content);
    const hash = sha256(serialized);
    const size = Buffer.byteLength(serialized, 'utf8');

    const metadata: ArtifactMetadata = {
      id,
      kind,
      created_at: this.clock.nowISO(),
      hash,
      size,
    };

    if (options?.tags && options.tags.length > 0) {
      metadata.tags = [...options.tags].sort();
    }
    if (options?.custom) {
      metadata.custom = options.custom;
    }

    this.artifacts.set(id, { metadata, content });
    return metadata;
  }

  get<T = unknown>(id: string): Artifact<T> | undefined {
    const artifact = this.artifacts.get(id);
    return artifact as Artifact<T> | undefined;
  }

  getMetadata(id: string): ArtifactMetadata | undefined {
    return this.artifacts.get(id)?.metadata;
  }

  query(query: ArtifactQuery): ArtifactMetadata[] {
    let results = Array.from(this.artifacts.values()).map(a => a.metadata);

    if (query.kind) {
      results = results.filter(m => m.kind === query.kind);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(m =>
        m.tags && query.tags!.every(t => m.tags!.includes(t))
      );
    }

    if (query.created_after) {
      results = results.filter(m => m.created_at >= query.created_after!);
    }

    if (query.created_before) {
      results = results.filter(m => m.created_at <= query.created_before!);
    }

    // Sort by created_at descending
    results.sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  verify(id: string): boolean {
    const artifact = this.artifacts.get(id);
    if (!artifact) return false;

    const serialized = stableStringify(artifact.content);
    const computedHash = sha256(serialized);
    return computedHash === artifact.metadata.hash;
  }

  list(): string[] {
    return Array.from(this.artifacts.keys()).sort();
  }

  stats(): { total: number; byKind: Record<string, number> } {
    const byKind: Record<string, number> = {};
    for (const artifact of this.artifacts.values()) {
      const kind = artifact.metadata.kind;
      byKind[kind] = (byKind[kind] || 0) + 1;
    }
    return { total: this.artifacts.size, byKind };
  }
}

/**
 * Creates an in-memory artifact registry.
 * @param clock - Injectable clock
 * @param idGenerator - ID generator function
 * @returns ArtifactRegistry instance
 */
export function createArtifactRegistry(clock: Clock, idGenerator: IdGenerator): ArtifactRegistry {
  return new InMemoryArtifactRegistry(clock, idGenerator);
}
