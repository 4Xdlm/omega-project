/**
 * OMEGA Query Engine — Query Builder
 * Phase 21 — v3.21.0
 *
 * Fluent API for building queries.
 *
 * Example:
 *   query()
 *     .where('subject', EQUALS, 'Jean')
 *     .and()
 *     .where('predicate', EQUALS, 'age')
 *     .orderBy('createdAt', 'DESC')
 *     .limit(10)
 *     .build()
 */
import { type Query, type QueryOptions, type FactField, Operator } from '../types.js';
export declare class QueryBuilderImpl {
    private conditions;
    private logic;
    private options;
    /**
     * Add a condition to the query.
     */
    where(field: FactField, operator: Operator, value: unknown, value2?: unknown): QueryBuilderImpl;
    /**
     * Set logic to AND for subsequent conditions.
     */
    and(): QueryBuilderImpl;
    /**
     * Set logic to OR for subsequent conditions.
     */
    or(): QueryBuilderImpl;
    /**
     * Set ordering.
     */
    orderBy(field: FactField, direction?: 'ASC' | 'DESC'): QueryBuilderImpl;
    /**
     * Limit results.
     */
    limit(n: number): QueryBuilderImpl;
    /**
     * Offset results.
     */
    offset(n: number): QueryBuilderImpl;
    /**
     * Build the final query.
     */
    build(): {
        query: Query;
        options: QueryOptions;
    };
    /**
     * Reset the builder.
     */
    reset(): QueryBuilderImpl;
}
/**
 * Create a new query builder.
 */
export declare function query(): QueryBuilderImpl;
/**
 * Create a query for subject.
 */
export declare function bySubject(subject: string): {
    query: Query;
    options: QueryOptions;
};
/**
 * Create a query for predicate.
 */
export declare function byPredicate(predicate: string): {
    query: Query;
    options: QueryOptions;
};
/**
 * Create a query for subject and predicate.
 */
export declare function bySubjectAndPredicate(subject: string, predicate: string): {
    query: Query;
    options: QueryOptions;
};
/**
 * Create a query for source.
 */
export declare function bySource(source: string): {
    query: Query;
    options: QueryOptions;
};
/**
 * Create a query for high confidence facts.
 */
export declare function highConfidence(threshold?: number): {
    query: Query;
    options: QueryOptions;
};
/**
 * Create a query for recent facts.
 */
export declare function recent(limit?: number): {
    query: Query;
    options: QueryOptions;
};
/**
 * Create a text search query.
 */
export declare function textSearch(text: string): {
    query: Query;
    options: QueryOptions;
};
//# sourceMappingURL=builder.d.ts.map