"use strict";
/**
 * @fileoverview Artifact Registry - Storage and retrieval of execution artifacts.
 * Provides deterministic artifact management with SHA-256 verification.
 * @module @omega/orchestrator-core/artifacts/ArtifactRegistry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryArtifactRegistry = void 0;
exports.createArtifactRegistry = createArtifactRegistry;
const hash_js_1 = require("../util/hash.js");
const stableJson_js_1 = require("../util/stableJson.js");
/**
 * In-memory artifact registry implementation.
 */
class InMemoryArtifactRegistry {
    artifacts = new Map();
    clock;
    generateId;
    constructor(clock, idGenerator) {
        this.clock = clock;
        this.generateId = idGenerator;
    }
    store(kind, content, options) {
        const id = this.generateId();
        const serialized = (0, stableJson_js_1.stableStringify)(content);
        const hash = (0, hash_js_1.sha256)(serialized);
        const size = Buffer.byteLength(serialized, 'utf8');
        const metadata = {
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
    get(id) {
        const artifact = this.artifacts.get(id);
        return artifact;
    }
    getMetadata(id) {
        return this.artifacts.get(id)?.metadata;
    }
    query(query) {
        let results = Array.from(this.artifacts.values()).map(a => a.metadata);
        if (query.kind) {
            results = results.filter(m => m.kind === query.kind);
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter(m => m.tags && query.tags.every(t => m.tags.includes(t)));
        }
        if (query.created_after) {
            results = results.filter(m => m.created_at >= query.created_after);
        }
        if (query.created_before) {
            results = results.filter(m => m.created_at <= query.created_before);
        }
        // Sort by created_at descending
        results.sort((a, b) => b.created_at.localeCompare(a.created_at));
        if (query.limit && query.limit > 0) {
            results = results.slice(0, query.limit);
        }
        return results;
    }
    verify(id) {
        const artifact = this.artifacts.get(id);
        if (!artifact)
            return false;
        const serialized = (0, stableJson_js_1.stableStringify)(artifact.content);
        const computedHash = (0, hash_js_1.sha256)(serialized);
        return computedHash === artifact.metadata.hash;
    }
    list() {
        return Array.from(this.artifacts.keys()).sort();
    }
    stats() {
        const byKind = {};
        for (const artifact of this.artifacts.values()) {
            const kind = artifact.metadata.kind;
            byKind[kind] = (byKind[kind] || 0) + 1;
        }
        return { total: this.artifacts.size, byKind };
    }
}
exports.InMemoryArtifactRegistry = InMemoryArtifactRegistry;
/**
 * Creates an in-memory artifact registry.
 * @param clock - Injectable clock
 * @param idGenerator - ID generator function
 * @returns ArtifactRegistry instance
 */
function createArtifactRegistry(clock, idGenerator) {
    return new InMemoryArtifactRegistry(clock, idGenerator);
}
//# sourceMappingURL=ArtifactRegistry.js.map