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

import {
  type CanonFact,
  type Query,
  type QueryOptions,
  type QueryResult,
  type AggregateResult,
  type Condition,
  type IQueryEngine,
  LogicalOperator,
  Operator,
} from './types.js';
import { applyOperator, getFieldValue } from './operators/index.js';
import { query as queryBuilder, textSearch } from './queries/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueryEngineConfig {
  /** Case-insensitive search by default */
  readonly caseInsensitive?: boolean;
}

export interface FactProvider {
  getAllFacts(): readonly CanonFact[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class QueryEngine implements IQueryEngine {
  private readonly factProvider: FactProvider;
  private readonly config: QueryEngineConfig;

  constructor(factProvider: FactProvider, config?: QueryEngineConfig) {
    this.factProvider = factProvider;
    this.config = {
      caseInsensitive: true,
      ...config,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE QUERY
  // ═══════════════════════════════════════════════════════════════════════════

  execute(query: Query, options?: QueryOptions): QueryResult {
    const startTime = performance.now();
    
    let facts = this.factProvider.getAllFacts();
    
    // Apply conditions
    facts = this.applyQuery(facts, query);
    
    const total = facts.length;
    
    // Apply ordering
    if (options?.orderBy) {
      facts = this.sortFacts(facts, options.orderBy, options.orderDirection);
    }
    
    // Apply pagination
    if (options?.offset !== undefined && options.offset > 0) {
      facts = facts.slice(options.offset);
    }
    
    if (options?.limit !== undefined && options.limit > 0) {
      facts = facts.slice(0, options.limit);
    }
    
    const executionTime = performance.now() - startTime;
    
    return {
      facts,
      total,
      returned: facts.length,
      executionTime,
    };
  }

  private applyQuery(facts: readonly CanonFact[], query: Query): readonly CanonFact[] {
    if (query.conditions.length === 0) {
      return facts;
    }

    return facts.filter(fact => this.evaluateQuery(fact, query));
  }

  private evaluateQuery(fact: CanonFact, query: Query): boolean {
    const results = query.conditions.map(condition => 
      this.evaluateCondition(fact, condition)
    );

    // Include sub-queries if present
    if (query.subQueries) {
      for (const subQuery of query.subQueries) {
        results.push(this.evaluateQuery(fact, subQuery));
      }
    }

    switch (query.logic) {
      case LogicalOperator.AND:
        return results.every(r => r);
      case LogicalOperator.OR:
        return results.some(r => r);
      case LogicalOperator.NOT:
        return results.length > 0 && !results[0];
      default:
        return results.every(r => r);
    }
  }

  private evaluateCondition(fact: CanonFact, condition: Condition): boolean {
    const fieldValue = getFieldValue(fact, condition.field);
    return applyOperator(
      condition.operator,
      fieldValue,
      condition.value,
      condition.value2
    );
  }

  private sortFacts(
    facts: readonly CanonFact[],
    field: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): readonly CanonFact[] {
    const sorted = [...facts].sort((a, b) => {
      const aVal = getFieldValue(a, field as any);
      const bVal = getFieldValue(b, field as any);
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = String(aVal).localeCompare(String(bVal));
      return direction === 'ASC' ? comparison : -comparison;
    });
    
    return sorted;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGGREGATE
  // ═══════════════════════════════════════════════════════════════════════════

  aggregate(query?: Query): AggregateResult {
    let facts = this.factProvider.getAllFacts();
    
    if (query) {
      facts = this.applyQuery(facts, query);
    }
    
    if (facts.length === 0) {
      return {
        count: 0,
        subjects: [],
        predicates: [],
        sources: [],
        avgConfidence: 0,
        minConfidence: 0,
        maxConfidence: 0,
      };
    }
    
    const subjects = [...new Set(facts.map(f => f.subject))];
    const predicates = [...new Set(facts.map(f => f.predicate))];
    const sources = [...new Set(facts.map(f => f.source))];
    
    const confidences = facts.map(f => f.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const minConfidence = Math.min(...confidences);
    const maxConfidence = Math.max(...confidences);
    
    // Sort for newest/oldest
    const sortedByDate = [...facts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const sortedByConfidence = [...facts].sort((a, b) => 
      b.confidence - a.confidence
    );
    
    return {
      count: facts.length,
      subjects,
      predicates,
      sources,
      avgConfidence,
      minConfidence,
      maxConfidence,
      newest: sortedByDate[0],
      oldest: sortedByDate[sortedByDate.length - 1],
      highestConfidence: sortedByConfidence[0],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVENIENCE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  findBySubject(subject: string): readonly CanonFact[] {
    return this.factProvider.getAllFacts().filter(f => 
      f.subject.toLowerCase() === subject.toLowerCase()
    );
  }

  findByPredicate(predicate: string): readonly CanonFact[] {
    return this.factProvider.getAllFacts().filter(f => 
      f.predicate.toLowerCase() === predicate.toLowerCase()
    );
  }

  findBySubjectAndPredicate(subject: string, predicate: string): CanonFact | undefined {
    return this.factProvider.getAllFacts().find(f => 
      f.subject.toLowerCase() === subject.toLowerCase() &&
      f.predicate.toLowerCase() === predicate.toLowerCase()
    );
  }

  findBySource(source: string): readonly CanonFact[] {
    return this.factProvider.getAllFacts().filter(f => 
      f.source.toLowerCase() === source.toLowerCase()
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  search(text: string): readonly CanonFact[] {
    const { query } = textSearch(text);
    const result = this.execute(query);
    return result.facts;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NATURAL LANGUAGE QUERY (simple implementation)
  // ═══════════════════════════════════════════════════════════════════════════

  ask(question: string): QueryResult {
    const startTime = performance.now();
    const q = question.toLowerCase().trim();
    
    // Pattern: "what is the Y of X" (more specific, check first)
    const whatIsPattern2 = /what is the (\w+) of (\w+)/i;
    let match = q.match(whatIsPattern2);
    if (match) {
      const predicate = match[1]!;
      const subject = match[2]!;
      const fact = this.findBySubjectAndPredicate(subject, predicate);
      return {
        facts: fact ? [fact] : [],
        total: fact ? 1 : 0,
        returned: fact ? 1 : 0,
        executionTime: performance.now() - startTime,
      };
    }
    
    // Pattern: "what is X's Y" or "what's X's Y"
    const whatIsPattern1 = /what(?:'s| is) (\w+)(?:'s) (\w+)/i;
    match = q.match(whatIsPattern1);
    if (match) {
      const subject = match[1]!;
      const predicate = match[2]!;
      const fact = this.findBySubjectAndPredicate(subject, predicate);
      return {
        facts: fact ? [fact] : [],
        total: fact ? 1 : 0,
        returned: fact ? 1 : 0,
        executionTime: performance.now() - startTime,
      };
    }
    
    // Pattern: "tell me about X" or "who is X"
    const aboutPattern = /(?:tell me about|who is|what do you know about) (\w+)/i;
    match = q.match(aboutPattern);
    if (match) {
      const subject = match[1]!;
      const facts = this.findBySubject(subject);
      return {
        facts,
        total: facts.length,
        returned: facts.length,
        executionTime: performance.now() - startTime,
      };
    }
    
    // Pattern: "how many X" or "count X"
    const countPattern = /(?:how many|count) (\w+)/i;
    match = q.match(countPattern);
    if (match) {
      const term = match[1]!;
      const facts = this.search(term);
      // Return empty array but with total count
      return {
        facts: [],
        total: facts.length,
        returned: 0,
        executionTime: performance.now() - startTime,
      };
    }
    
    // Fallback: full text search on each word
    const searchTerms = q.split(/\s+/).filter(w => w.length > 2);
    if (searchTerms.length > 0) {
      // Search each term individually and combine results
      const allResults: CanonFact[] = [];
      const seenIds = new Set<string>();
      
      for (const term of searchTerms) {
        const results = this.search(term);
        for (const fact of results) {
          if (!seenIds.has(fact.id)) {
            seenIds.add(fact.id);
            allResults.push(fact);
          }
        }
      }
      
      return {
        facts: allResults,
        total: allResults.length,
        returned: allResults.length,
        executionTime: performance.now() - startTime,
      };
    }
    
    return {
      facts: [],
      total: 0,
      returned: 0,
      executionTime: performance.now() - startTime,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get summary of what the engine knows.
   */
  summary(): {
    totalFacts: number;
    subjects: number;
    predicates: number;
    sources: number;
  } {
    const agg = this.aggregate();
    return {
      totalFacts: agg.count,
      subjects: agg.subjects.length,
      predicates: agg.predicates.length,
      sources: agg.sources.length,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createQueryEngine(
  factProvider: FactProvider,
  config?: QueryEngineConfig
): QueryEngine {
  return new QueryEngine(factProvider, config);
}
