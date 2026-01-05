/**
 * OMEGA Integration Layer — Canon Store
 * Phase 20 — v3.20.0
 *
 * Simplified Canon storage for integration.
 * Based on Phase 18 CANON_CORE concepts.
 */
import { createHash } from 'crypto';
// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
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
function canonicalStringify(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}
// ═══════════════════════════════════════════════════════════════════════════════
// CANON STORE
// ═══════════════════════════════════════════════════════════════════════════════
export class CanonStore {
    facts = new Map();
    idCounter = 0;
    version;
    constructor(config) {
        this.version = config?.version ?? '3.20.0';
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // FACT OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    addFact(subject, predicate, value, source, confidence = 1.0) {
        this.idCounter++;
        const id = `fact_${this.idCounter}`;
        const createdAt = new Date().toISOString();
        const factWithoutHash = {
            id,
            subject,
            predicate,
            value,
            confidence,
            source,
            createdAt,
        };
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
    getFactsBySubject(subject) {
        return this.getAllFacts().filter(f => f.subject === subject);
    }
    getFactsByPredicate(predicate) {
        return this.getAllFacts().filter(f => f.predicate === predicate);
    }
    removeFact(id) {
        return this.facts.delete(id);
    }
    clear() {
        this.facts.clear();
        this.idCounter = 0;
    }
    get size() {
        return this.facts.size;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════════════
    snapshot() {
        const facts = this.getAllFacts();
        const sources = [...new Set(facts.map(f => f.source))];
        const lastModified = facts.length > 0
            ? facts.reduce((latest, f) => f.createdAt > latest ? f.createdAt : latest, facts[0].createdAt)
            : new Date().toISOString();
        return {
            version: this.version,
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
    // ═══════════════════════════════════════════════════════════════════════════
    // RESTORE
    // ═══════════════════════════════════════════════════════════════════════════
    restore(snapshot) {
        // Verify root hash
        const computedHash = computeRootHash(snapshot.facts);
        if (computedHash !== snapshot.rootHash) {
            return {
                success: false,
                error: `Root hash mismatch: expected ${snapshot.rootHash}, got ${computedHash}`,
            };
        }
        // Verify each fact hash
        for (const fact of snapshot.facts) {
            const { hash, ...factWithoutHash } = fact;
            const expectedHash = computeFactHash(factWithoutHash);
            if (expectedHash !== hash) {
                return {
                    success: false,
                    error: `Fact hash mismatch for ${fact.id}: expected ${hash}, got ${expectedHash}`,
                };
            }
        }
        // Clear and restore
        this.clear();
        for (const fact of snapshot.facts) {
            this.facts.set(fact.id, fact);
            // Update counter to be higher than any restored ID
            const idNum = parseInt(fact.id.replace('fact_', ''), 10);
            if (!isNaN(idNum) && idNum >= this.idCounter) {
                this.idCounter = idNum;
            }
        }
        return { success: true };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // COMPARISON
    // ═══════════════════════════════════════════════════════════════════════════
    getRootHash() {
        return computeRootHash(this.getAllFacts());
    }
    equals(other) {
        return this.getRootHash() === other.getRootHash();
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
export function createCanonStore(config) {
    return new CanonStore(config);
}
//# sourceMappingURL=canon-store.js.map