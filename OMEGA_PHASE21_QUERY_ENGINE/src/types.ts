/**
 * OMEGA Query Engine — Types
 * Phase 21 — v3.21.0
 * 
 * Types for querying the Canon intelligently.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FACT TYPES (compatible with Phase 18/20)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export enum Operator {
  // String operators
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  MATCHES = 'MATCHES', // Regex
  
  // Numeric operators (for confidence, parsed values)
  GREATER_THAN = 'GREATER_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  BETWEEN = 'BETWEEN',
  
  // Existence
  EXISTS = 'EXISTS',
  NOT_EXISTS = 'NOT_EXISTS',
  
  // List operators
  IN = 'IN',
  NOT_IN = 'NOT_IN',
}

export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type FactField = 'subject' | 'predicate' | 'value' | 'source' | 'confidence' | 'createdAt' | 'id' | 'hash';

export interface Condition {
  readonly field: FactField;
  readonly operator: Operator;
  readonly value: unknown;
  readonly value2?: unknown; // For BETWEEN
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

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueryBuilder {
  where(field: FactField, operator: Operator, value: unknown, value2?: unknown): QueryBuilder;
  and(): QueryBuilder;
  or(): QueryBuilder;
  orderBy(field: FactField, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(n: number): QueryBuilder;
  offset(n: number): QueryBuilder;
  build(): { query: Query; options: QueryOptions };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface IQueryEngine {
  execute(query: Query, options?: QueryOptions): QueryResult;
  aggregate(query?: Query): AggregateResult;
  findBySubject(subject: string): readonly CanonFact[];
  findByPredicate(predicate: string): readonly CanonFact[];
  findBySubjectAndPredicate(subject: string, predicate: string): CanonFact | undefined;
  search(text: string): readonly CanonFact[];
  ask(question: string): QueryResult;
}
