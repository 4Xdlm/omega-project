/**
 * OMEGA Memory Hook — Memory Service Types
 * Phase 20.1 — v3.20.1
 *
 * Interfaces for integrating with Phase 20 MemoryService.
 * These types allow the hook to work with any compatible memory service.
 */
import { createHash } from 'crypto';
// ═══════════════════════════════════════════════════════════════════════════════
// MOCK IMPLEMENTATION (for standalone testing)
// ═══════════════════════════════════════════════════════════════════════════════
function computeHash(data) {
    return createHash('sha256').update(data).digest('hex');
}
function computeFactHash(fact) {
    const payload = `${fact.id}|${fact.subject}|${fact.predicate}|${fact.value}|${fact.confidence}|${fact.source}|${fact.createdAt}`;
    return computeHash(payload);
}
function computeRootHash(facts) {
    if (facts.length === 0)
        return computeHash('EMPTY_CANON');
    const sortedHashes = [...facts]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(f => f.hash)
        .join('|');
    return computeHash(sortedHashes);
}
export class MockCanonStore {
    facts = new Map();
    idCounter = 0;
    get size() {
        return this.facts.size;
    }
    addFact(subject, predicate, value, source, confidence = 1.0) {
        this.idCounter++;
        const id = `fact_${this.idCounter}`;
        const createdAt = new Date().toISOString();
        const factWithoutHash = { id, subject, predicate, value, confidence, source, createdAt };
        const hash = computeFactHash(factWithoutHash);
        const fact = { ...factWithoutHash, hash };
        this.facts.set(id, fact);
        return fact;
    }
    getFact(id) {
        return this.facts.get(id);
    }
    getAllFacts() {
        return Array.from(this.facts.values());
    }
    removeFact(id) {
        return this.facts.delete(id);
    }
    clear() {
        this.facts.clear();
        this.idCounter = 0;
    }
    snapshot() {
        const facts = this.getAllFacts();
        const sources = [...new Set(facts.map(f => f.source))];
        const lastModified = facts.length > 0
            ? facts.reduce((latest, f) => f.createdAt > latest ? f.createdAt : latest, facts[0].createdAt)
            : new Date().toISOString();
        return {
            version: '3.20.1',
            timestamp: new Date().toISOString(),
            facts,
            rootHash: computeRootHash(facts),
            metadata: {
                factCount: facts.length,
                sources,
                lastModified,
            },
        };
    }
    restore(snapshot) {
        const computedHash = computeRootHash(snapshot.facts);
        if (computedHash !== snapshot.rootHash) {
            return { success: false, error: `Root hash mismatch` };
        }
        this.clear();
        for (const fact of snapshot.facts) {
            this.facts.set(fact.id, fact);
            const idNum = parseInt(fact.id.replace('fact_', ''), 10);
            if (!isNaN(idNum) && idNum >= this.idCounter) {
                this.idCounter = idNum;
            }
        }
        return { success: true };
    }
    getRootHash() {
        return computeRootHash(this.getAllFacts());
    }
}
// Simple in-memory mock for testing
export class MockMemoryService {
    canon = new MockCanonStore();
    snapshots = new Map();
    getCanon() {
        return this.canon;
    }
    async saveSnapshot(key) {
        const snapshot = this.canon.snapshot();
        this.snapshots.set(key, snapshot);
        return {
            success: true,
            data: {
                key,
                rootHash: snapshot.rootHash,
                factCount: snapshot.metadata.factCount,
                bytesWritten: JSON.stringify(snapshot).length,
                path: `/mock/${key}`,
            },
        };
    }
    async loadSnapshot(key) {
        const snapshot = this.snapshots.get(key);
        if (!snapshot) {
            return { success: false, error: `Snapshot not found: ${key}` };
        }
        const result = this.canon.restore(snapshot);
        if (!result.success) {
            return { success: false, error: result.error ?? 'Restore failed' };
        }
        return {
            success: true,
            data: {
                key,
                rootHash: snapshot.rootHash,
                factCount: snapshot.metadata.factCount,
                verified: true,
            },
        };
    }
    async listSnapshots(prefix) {
        let keys = Array.from(this.snapshots.keys());
        if (prefix) {
            keys = keys.filter(k => k.startsWith(prefix));
        }
        return { success: true, data: keys };
    }
    async exists(key) {
        return this.snapshots.has(key);
    }
    async delete(key) {
        const deleted = this.snapshots.delete(key);
        return { success: true, data: deleted };
    }
}
//# sourceMappingURL=memory-service.types.js.map