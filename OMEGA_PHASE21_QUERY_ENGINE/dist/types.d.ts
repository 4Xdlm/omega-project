/**
 * OMEGA Query Engine — Types
 * Phase 21 — v3.21.0
 *
 * Types for querying the Canon intelligently.
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
export declare enum Operator {
    EQUALS = "EQUALS",
    NOT_EQUALS = "NOT_EQUALS",
    CONTAINS = "CONTAINS",
    NOT_CONTAINS = "NOT_CONTAINS",
    STARTS_WITH = "STARTS_WITH",
    ENDS_WITH = "ENDS_WITH",
    MATCHES = "MATCHES",// Regex
    GREATER_THAN = "GREATER_THAN",
    GREATER_EQUAL = "GREATER_EQUAL",
    LESS_THAN = "LESS_THAN",
    LESS_EQUAL = "LESS_EQUAL",
    BETWEEN = "BETWEEN",
    EXISTS = "EXISTS",
    NOT_EXISTS = "NOT_EXISTS",
    IN = "IN",
    NOT_IN = "NOT_IN"
}
export declare enum LogicalOperator {
    AND = "AND",
    OR = "OR",
    NOT = "NOT"
}
export type FactField = 'subject' | 'predicate' | 'value' | 'source' | 'confidence' | 'createdAt' | 'id' | 'hash';
export interface Condition {
    readonly field: FactField;
    readonly operator: Operator;
    readonly value: unknown;
    readonly value2?: unknown;
}
export interface Query {
    readonly conditions: readonly Condition[];
    readonly logic: LogicalOperator;
    readonly subQueries?: readonly Query[];
}
export interface QueryOptions {
    readonly limit?: number;
    readonly offset?: number;
    readonly orderBy?: FactField;
    readonly orderDirection?: 'ASC' | 'DESC';
}
export interface QueryResult {
    readonly facts: readonly CanonFact[];
    readonly total: number;
    readonly returned: number;
    readonly executionTime: number;
}
export interface AggregateResult {
    readonly count: number;
    readonly subjects: readonly string[];
    readonly predicates: readonly string[];
    readonly sources: readonly string[];
    readonly avgConfidence: number;
    readonly minConfidence: number;
    readonly maxConfidence: number;
    readonly newest?: CanonFact;
    readonly oldest?: CanonFact;
    readonly highestConfidence?: CanonFact;
}
export interface QueryBuilder {
    where(field: FactField, operator: Operator, value: unknown, value2?: unknown): QueryBuilder;
    and(): QueryBuilder;
    or(): QueryBuilder;
    orderBy(field: FactField, direction?: 'ASC' | 'DESC'): QueryBuilder;
    limit(n: number): QueryBuilder;
    offset(n: number): QueryBuilder;
    build(): {
        query: Query;
        options: QueryOptions;
    };
}
export interface IQueryEngine {
    execute(query: Query, options?: QueryOptions): QueryResult;
    aggregate(query?: Query): AggregateResult;
    findBySubject(subject: string): readonly CanonFact[];
    findByPredicate(predicate: string): readonly CanonFact[];
    findBySubjectAndPredicate(subject: string, predicate: string): CanonFact | undefined;
    search(text: string): readonly CanonFact[];
    ask(question: string): QueryResult;
}
//# sourceMappingURL=types.d.ts.map