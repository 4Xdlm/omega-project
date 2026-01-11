/**
 * @fileoverview Artifact Registry - Storage and retrieval of execution artifacts.
 * Provides deterministic artifact management with SHA-256 verification.
 * @module @omega/orchestrator-core/artifacts/ArtifactRegistry
 */
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
    store<T>(kind: string, content: T, options?: {
        tags?: string[];
        custom?: Record<string, unknown>;
    }): ArtifactMetadata;
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
    stats(): {
        total: number;
        byKind: Record<string, number>;
    };
}
/**
 * ID generator function type.
 */
export type IdGenerator = () => string;
/**
 * In-memory artifact registry implementation.
 */
export declare class InMemoryArtifactRegistry implements ArtifactRegistry {
    private readonly artifacts;
    private readonly clock;
    private readonly generateId;
    constructor(clock: Clock, idGenerator: IdGenerator);
    store<T>(kind: string, content: T, options?: {
        tags?: string[];
        custom?: Record<string, unknown>;
    }): ArtifactMetadata;
    get<T = unknown>(id: string): Artifact<T> | undefined;
    getMetadata(id: string): ArtifactMetadata | undefined;
    query(query: ArtifactQuery): ArtifactMetadata[];
    verify(id: string): boolean;
    list(): string[];
    stats(): {
        total: number;
        byKind: Record<string, number>;
    };
}
/**
 * Creates an in-memory artifact registry.
 * @param clock - Injectable clock
 * @param idGenerator - ID generator function
 * @returns ArtifactRegistry instance
 */
export declare function createArtifactRegistry(clock: Clock, idGenerator: IdGenerator): ArtifactRegistry;
//# sourceMappingURL=ArtifactRegistry.d.ts.map