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
import { Operator, LogicalOperator, } from '../types.js';
// ═══════════════════════════════════════════════════════════════════════════════
// QUERY BUILDER CLASS
// ═══════════════════════════════════════════════════════════════════════════════
export class QueryBuilderImpl {
    conditions = [];
    logic = LogicalOperator.AND;
    options = {};
    /**
     * Add a condition to the query.
     */
    where(field, operator, value, value2) {
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
    and() {
        this.logic = LogicalOperator.AND;
        return this;
    }
    /**
     * Set logic to OR for subsequent conditions.
     */
    or() {
        this.logic = LogicalOperator.OR;
        return this;
    }
    /**
     * Set ordering.
     */
    orderBy(field, direction = 'ASC') {
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
    limit(n) {
        this.options = { ...this.options, limit: n };
        return this;
    }
    /**
     * Offset results.
     */
    offset(n) {
        this.options = { ...this.options, offset: n };
        return this;
    }
    /**
     * Build the final query.
     */
    build() {
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
    reset() {
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
export function query() {
    return new QueryBuilderImpl();
}
/**
 * Create a query for subject.
 */
export function bySubject(subject) {
    return query()
        .where('subject', Operator.EQUALS, subject)
        .build();
}
/**
 * Create a query for predicate.
 */
export function byPredicate(predicate) {
    return query()
        .where('predicate', Operator.EQUALS, predicate)
        .build();
}
/**
 * Create a query for subject and predicate.
 */
export function bySubjectAndPredicate(subject, predicate) {
    return query()
        .where('subject', Operator.EQUALS, subject)
        .and()
        .where('predicate', Operator.EQUALS, predicate)
        .build();
}
/**
 * Create a query for source.
 */
export function bySource(source) {
    return query()
        .where('source', Operator.EQUALS, source)
        .build();
}
/**
 * Create a query for high confidence facts.
 */
export function highConfidence(threshold = 0.8) {
    return query()
        .where('confidence', Operator.GREATER_EQUAL, threshold)
        .orderBy('confidence', 'DESC')
        .build();
}
/**
 * Create a query for recent facts.
 */
export function recent(limit = 10) {
    return query()
        .orderBy('createdAt', 'DESC')
        .limit(limit)
        .build();
}
/**
 * Create a text search query.
 */
export function textSearch(text) {
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
//# sourceMappingURL=builder.js.map