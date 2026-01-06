/**
 * OMEGA Query Engine — Main Engine
 * Phase 21 — v3.21.0
 *
 * Intelligent querying of the Canon.
 *
 * Features:
 * - Complex queries with operators
 * - Aggregation functions
 * - Natural language style queries
 * - Full text search
 *
 * Invariants:
 * - INV-QUERY-01: Pure functions (no mutations)
 * - INV-QUERY-02: Null handling explicit
 * - INV-QUERY-03: Query execution is deterministic
 * - INV-QUERY-04: Empty results are valid (not errors)
 */
import { type CanonFact, type Query, type QueryOptions, type QueryResult, type AggregateResult, type IQueryEngine } from './types.js';
export interface QueryEngineConfig {
    /** Case-insensitive search by default */
    readonly caseInsensitive?: boolean;
}
export interface FactProvider {
    getAllFacts(): readonly CanonFact[];
}
export declare class QueryEngine implements IQueryEngine {
    private readonly factProvider;
    private readonly config;
    constructor(factProvider: FactProvider, config?: QueryEngineConfig);
    execute(query: Query, options?: QueryOptions): QueryResult;
    private applyQuery;
    private evaluateQuery;
    private evaluateCondition;
    private sortFacts;
    aggregate(query?: Query): AggregateResult;
    findBySubject(subject: string): readonly CanonFact[];
    findByPredicate(predicate: string): readonly CanonFact[];
    findBySubjectAndPredicate(subject: string, predicate: string): CanonFact | undefined;
    findBySource(source: string): readonly CanonFact[];
    search(text: string): readonly CanonFact[];
    ask(question: string): QueryResult;
    /**
     * Get summary of what the engine knows.
     */
    summary(): {
        totalFacts: number;
        subjects: number;
        predicates: number;
        sources: number;
    };
}
export declare function createQueryEngine(factProvider: FactProvider, config?: QueryEngineConfig): QueryEngine;
//# sourceMappingURL=query-engine.d.ts.map