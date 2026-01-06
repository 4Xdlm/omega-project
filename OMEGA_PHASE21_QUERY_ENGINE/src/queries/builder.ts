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

import {
  type Query,
  type QueryOptions,
  type Condition,
  type FactField,
  Operator,
  LogicalOperator,
} from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY BUILDER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class QueryBuilderImpl {
  private conditions: Condition[] = [];
  private logic: LogicalOperator = LogicalOperator.AND;
  private options: QueryOptions = {};

  /**
   * Add a condition to the query.
   */
  where(
    field: FactField,
    operator: Operator,
    value: unknown,
    value2?: unknown
  ): QueryBuilderImpl {
    this.conditions.push({
      field,
      operator,
      value,
      value2,
    });
    return this;
  }

  /**
   * Set logic to AND for subsequent conditions.
   */
  and(): QueryBuilderImpl {
    this.logic = LogicalOperator.AND;
    return this;
  }

  /**
   * Set logic to OR for subsequent conditions.
   */
  or(): QueryBuilderImpl {
    this.logic = LogicalOperator.OR;
    return this;
  }

  /**
   * Set ordering.
   */
  orderBy(field: FactField, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilderImpl {
    this.options = {
      ...this.options,
      orderBy: field,
      orderDirection: direction,
    };
    return this;
  }

  /**
   * Limit results.
   */
  limit(n: number): QueryBuilderImpl {
    this.options = { ...this.options, limit: n };
    return this;
  }

  /**
   * Offset results.
   */
  offset(n: number): QueryBuilderImpl {
    this.options = { ...this.options, offset: n };
    return this;
  }

  /**
   * Build the final query.
   */
  build(): { query: Query; options: QueryOptions } {
    return {
      query: {
        conditions: [...this.conditions],
        logic: this.logic,
      },
      options: { ...this.options },
    };
  }

  /**
   * Reset the builder.
   */
  reset(): QueryBuilderImpl {
    this.conditions = [];
    this.logic = LogicalOperator.AND;
    this.options = {};
    return this;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHORTHAND BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new query builder.
 */
export function query(): QueryBuilderImpl {
  return new QueryBuilderImpl();
}

/**
 * Create a query for subject.
 */
export function bySubject(subject: string): { query: Query; options: QueryOptions } {
  return query()
    .where('subject', Operator.EQUALS, subject)
    .build();
}

/**
 * Create a query for predicate.
 */
export function byPredicate(predicate: string): { query: Query; options: QueryOptions } {
  return query()
    .where('predicate', Operator.EQUALS, predicate)
    .build();
}

/**
 * Create a query for subject and predicate.
 */
export function bySubjectAndPredicate(
  subject: string,
  predicate: string
): { query: Query; options: QueryOptions } {
  return query()
    .where('subject', Operator.EQUALS, subject)
    .and()
    .where('predicate', Operator.EQUALS, predicate)
    .build();
}

/**
 * Create a query for source.
 */
export function bySource(source: string): { query: Query; options: QueryOptions } {
  return query()
    .where('source', Operator.EQUALS, source)
    .build();
}

/**
 * Create a query for high confidence facts.
 */
export function highConfidence(threshold = 0.8): { query: Query; options: QueryOptions } {
  return query()
    .where('confidence', Operator.GREATER_EQUAL, threshold)
    .orderBy('confidence', 'DESC')
    .build();
}

/**
 * Create a query for recent facts.
 */
export function recent(limit = 10): { query: Query; options: QueryOptions } {
  return query()
    .orderBy('createdAt', 'DESC')
    .limit(limit)
    .build();
}

/**
 * Create a text search query.
 */
export function textSearch(text: string): { query: Query; options: QueryOptions } {
  return {
    query: {
      conditions: [
        { field: 'subject', operator: Operator.CONTAINS, value: text },
        { field: 'predicate', operator: Operator.CONTAINS, value: text },
        { field: 'value', operator: Operator.CONTAINS, value: text },
      ],
      logic: LogicalOperator.OR,
    },
    options: {},
  };
}
