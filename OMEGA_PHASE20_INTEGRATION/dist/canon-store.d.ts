/**
 * OMEGA Integration Layer — Canon Store
 * Phase 20 — v3.20.0
 *
 * Simplified Canon storage for integration.
 * Based on Phase 18 CANON_CORE concepts.
 */
export interface CanonFact {
    readonly id: string;
    readonly subject: string;
    readonly predicate: string;
    readonly value: string;
    readonly confidence: number;
    readonly source: string;
    readonly createdAt: string;
    readonly hash: string;
}
export interface CanonSnapshot {
    readonly version: string;
    readonly timestamp: string;
    readonly facts: readonly CanonFact[];
    readonly rootHash: string;
    readonly metadata: CanonMetadata;
}
export interface CanonMetadata {
    readonly factCount: number;
    readonly sources: readonly string[];
    readonly lastModified: string;
}
export interface CanonStoreConfig {
    readonly version?: string;
}
export declare class CanonStore {
    private facts;
    private idCounter;
    private readonly version;
    constructor(config?: CanonStoreConfig);
    addFact(subject: string, predicate: string, value: string, source: string, confidence?: number): CanonFact;
    getFact(id: string): CanonFact | undefined;
    getAllFacts(): readonly CanonFact[];
    getFactsBySubject(subject: string): readonly CanonFact[];
    getFactsByPredicate(predicate: string): readonly CanonFact[];
    removeFact(id: string): boolean;
    clear(): void;
    get size(): number;
    snapshot(): CanonSnapshot;
    restore(snapshot: CanonSnapshot): {
        success: boolean;
        error?: string;
    };
    getRootHash(): string;
    equals(other: CanonStore): boolean;
}
export declare function createCanonStore(config?: CanonStoreConfig): CanonStore;
//# sourceMappingURL=canon-store.d.ts.map