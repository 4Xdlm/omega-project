/**
 * OMEGA Query Engine — Main Index
 * Phase 21 — v3.21.0
 *
 * Intelligent querying of the Canon.
 *
 * Invariants:
 * - INV-QUERY-01: Pure functions (no mutations)
 * - INV-QUERY-02: Null handling explicit
 * - INV-QUERY-03: Query execution is deterministic
 * - INV-QUERY-04: Empty results are valid (not errors)
 */
export declare const QUERY_ENGINE_VERSION = "3.21.0";
export { Operator, LogicalOperator, type CanonFact, type FactField, type Condition, type Query, type QueryOptions, type QueryResult, type AggregateResult, type QueryBuilder, type IQueryEngine, } from './types.js';
export { applyOperator, getFieldValue, operators } from './operators/index.js';
export { QueryBuilderImpl, query, bySubject, byPredicate, bySubjectAndPredicate, bySource, highConfidence, recent, textSearch, } from './queries/index.js';
export { QueryEngine, createQueryEngine, type QueryEngineConfig, type FactProvider, } from './query-engine.js';
//# sourceMappingURL=index.d.ts.map