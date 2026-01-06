// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — QUERY ADAPTER
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS:
// @invariant INV-ADP-03: Query Search Bounded (timeout + limit)
// @invariant INV-WIRE-03: Version Pinning (mismatch = reject)
// @invariant INV-ADP-05: Error No Leak
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusEnvelope, NexusHandler, NexusResult } from '../types.js';
import { ok, fail } from '../types.js';
import { adapterError, AdapterErrorCodes, safeError } from '../errors.js';

const MODULE = 'query_adapter';

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY ENGINE INTERFACE (Contrat avec Query Engine existant)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interface minimale du Query Engine
 */
export interface QueryEngine {
  /**
   * Recherche avec requête texte
   */
  search(input: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<{ results: unknown[]; total: number }>;

  /**
   * Recherche par filtres structurés
   */
  find?(input: {
    filters: Record<string, unknown>;
    limit?: number;
    offset?: number;
    sort?: { field: string; order: 'asc' | 'desc' };
  }): Promise<{ results: unknown[]; total: number }>;

  /**
   * Agrégation / statistiques
   */
  aggregate?(input: {
    field: string;
    operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
    filters?: Record<string, unknown>;
  }): Promise<{ value: number }>;

  /**
   * Analyse en langage naturel
   */
  analyze?(input: {
    text: string;
  }): Promise<{ interpretation: unknown; confidence: number }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYLOAD TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Payload pour query.search */
export interface QuerySearchPayload {
  query: string;
  limit?: number;
  offset?: number;
}

/** Payload pour query.find */
export interface QueryFindPayload {
  filters: Record<string, unknown>;
  limit?: number;
  offset?: number;
  sort?: { field: string; order: 'asc' | 'desc' };
}

/** Payload pour query.aggregate */
export interface QueryAggregatePayload {
  field: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: Record<string, unknown>;
}

/** Payload pour query.analyze */
export interface QueryAnalyzePayload {
  text: string;
}

/** Réponse pour query.search et query.find */
export interface QuerySearchResponse {
  results: unknown[];
  total: number;
}

/** Réponse pour query.aggregate */
export interface QueryAggregateResponse {
  value: number;
}

/** Réponse pour query.analyze */
export interface QueryAnalyzeResponse {
  interpretation: unknown;
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS SUPPORTÉS
// ═══════════════════════════════════════════════════════════════════════════════

export const QUERY_SCHEMAS = {
  SEARCH: 'query.search',
  FIND: 'query.find',
  AGGREGATE: 'query.aggregate',
  ANALYZE: 'query.analyze',
} as const;

export type QuerySchema = typeof QUERY_SCHEMAS[keyof typeof QUERY_SCHEMAS];

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueryAdapterConfig {
  /** Limite maximale de résultats (défaut: 1000) */
  maxLimit: number;
  /** Limite par défaut si non spécifiée (défaut: 100) */
  defaultLimit: number;
  /** Timeout en ms (défaut: 30000) */
  timeoutMs: number;
}

const DEFAULT_CONFIG: QueryAdapterConfig = {
  maxLimit: 1000,
  defaultLimit: 100,
  timeoutMs: 30000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adapter Query Engine → NEXUS
 * 
 * @invariant INV-ADP-03: Query Search Bounded
 * @invariant INV-WIRE-03: Version Pinning
 * @invariant INV-ADP-05: Error No Leak
 */
export class QueryAdapter implements NexusHandler {
  private readonly config: QueryAdapterConfig;

  constructor(
    private readonly query: QueryEngine,
    private readonly moduleVersion: string,
    config?: Partial<QueryAdapterConfig>
  ) {
    if (!moduleVersion || !moduleVersion.includes('@')) {
      throw new Error('moduleVersion must be in format "module@version"');
    }
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  canHandle(env: NexusEnvelope): boolean {
    return env.target_module === 'query';
  }

  async handle(env: NexusEnvelope): Promise<NexusResult<unknown>> {
    // INV-WIRE-03: Version Pinning
    if (env.module_version !== this.moduleVersion) {
      return fail(
        adapterError(
          MODULE,
          AdapterErrorCodes.QUERY_FAILED,
          `Version mismatch: expected ${this.moduleVersion}, got ${env.module_version}`,
          false
        )
      );
    }

    try {
      // INV-ADP-03: Timeout wrapper
      const result = await this.withTimeout(
        this.dispatch(env),
        this.config.timeoutMs
      );
      return result;
    } catch (caught) {
      // Check if timeout
      if (caught instanceof Error && caught.message === 'QUERY_TIMEOUT') {
        return fail(
          adapterError(MODULE, AdapterErrorCodes.QUERY_TIMEOUT, 'Query timed out', true)
        );
      }
      // INV-ADP-05: Error No Leak
      return fail(safeError(caught, MODULE, AdapterErrorCodes.QUERY_FAILED, true));
    }
  }

  private async dispatch(env: NexusEnvelope): Promise<NexusResult<unknown>> {
    switch (env.payload_schema) {
      case QUERY_SCHEMAS.SEARCH:
        return this.handleSearch(env);

      case QUERY_SCHEMAS.FIND:
        return this.handleFind(env);

      case QUERY_SCHEMAS.AGGREGATE:
        return this.handleAggregate(env);

      case QUERY_SCHEMAS.ANALYZE:
        return this.handleAnalyze(env);

      default:
        return fail(
          adapterError(
            MODULE,
            AdapterErrorCodes.UNSUPPORTED_SCHEMA,
            `Unsupported schema: ${env.payload_schema}`,
            false
          )
        );
    }
  }

  /**
   * Traite query.search
   * @invariant INV-ADP-03: limit bounded
   */
  private async handleSearch(env: NexusEnvelope): Promise<NexusResult<QuerySearchResponse>> {
    const payload = env.payload as QuerySearchPayload;

    if (!payload || typeof payload.query !== 'string') {
      return fail(
        adapterError(MODULE, AdapterErrorCodes.QUERY_BAD_PAYLOAD, 'query.search requires query: string', false)
      );
    }

    // INV-ADP-03: Bound limit
    const limit = this.boundLimit(payload.limit);
    const offset = Math.max(0, payload.offset ?? 0);

    const result = await this.query.search({
      query: payload.query,
      limit,
      offset,
    });

    return ok({ results: result.results, total: result.total });
  }

  /**
   * Traite query.find
   */
  private async handleFind(env: NexusEnvelope): Promise<NexusResult<QuerySearchResponse>> {
    if (!this.query.find) {
      return fail(
        adapterError(MODULE, AdapterErrorCodes.UNSUPPORTED_SCHEMA, 'query.find not supported', false)
      );
    }

    const payload = env.payload as QueryFindPayload;

    if (!payload || typeof payload.filters !== 'object' || payload.filters === null) {
      return fail(
        adapterError(MODULE, AdapterErrorCodes.QUERY_BAD_PAYLOAD, 'query.find requires filters: object', false)
      );
    }

    const limit = this.boundLimit(payload.limit);
    const offset = Math.max(0, payload.offset ?? 0);

    const result = await this.query.find({
      filters: payload.filters,
      limit,
      offset,
      sort: payload.sort,
    });

    return ok({ results: result.results, total: result.total });
  }

  /**
   * Traite query.aggregate
   */
  private async handleAggregate(env: NexusEnvelope): Promise<NexusResult<QueryAggregateResponse>> {
    if (!this.query.aggregate) {
      return fail(
        adapterError(MODULE, AdapterErrorCodes.UNSUPPORTED_SCHEMA, 'query.aggregate not supported', false)
      );
    }

    const payload = env.payload as QueryAggregatePayload;

    if (!payload || typeof payload.field !== 'string' || !payload.operation) {
      return fail(
        adapterError(MODULE, AdapterErrorCodes.QUERY_BAD_PAYLOAD, 'query.aggregate requires field and operation', false)
      );
    }

    const validOps = ['count', 'sum', 'avg', 'min', 'max'];
    if (!validOps.includes(payload.operation)) {
      return fail(
        adapterError(MODULE, AdapterErrorCodes.QUERY_BAD_PAYLOAD, `Invalid operation: ${payload.operation}`, false)
      );
    }

    const result = await this.query.aggregate({
      field: payload.field,
      operation: payload.operation,
      filters: payload.filters,
    });

    return ok({ value: result.value });
  }

  /**
   * Traite query.analyze
   */
  private async handleAnalyze(env: NexusEnvelope): Promise<NexusResult<QueryAnalyzeResponse>> {
    if (!this.query.analyze) {
      return fail(
        adapterError(MODULE, AdapterErrorCodes.UNSUPPORTED_SCHEMA, 'query.analyze not supported', false)
      );
    }

    const payload = env.payload as QueryAnalyzePayload;

    if (!payload || typeof payload.text !== 'string') {
      return fail(
        adapterError(MODULE, AdapterErrorCodes.QUERY_BAD_PAYLOAD, 'query.analyze requires text: string', false)
      );
    }

    const result = await this.query.analyze({ text: payload.text });

    return ok({ interpretation: result.interpretation, confidence: result.confidence });
  }

  /**
   * Borne la limite aux valeurs configurées
   * @invariant INV-ADP-03
   */
  private boundLimit(requestedLimit?: number): number {
    if (requestedLimit === undefined || requestedLimit <= 0) {
      return this.config.defaultLimit;
    }
    return Math.min(requestedLimit, this.config.maxLimit);
  }

  /**
   * Wrapper timeout
   * @invariant INV-ADP-03
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('QUERY_TIMEOUT')), ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (err) {
      clearTimeout(timeoutId!);
      throw err;
    }
  }

  getModuleVersion(): string {
    return this.moduleVersion;
  }

  getConfig(): QueryAdapterConfig {
    return { ...this.config };
  }

  getSupportedSchemas(): string[] {
    const schemas = [QUERY_SCHEMAS.SEARCH];
    if (this.query.find) schemas.push(QUERY_SCHEMAS.FIND);
    if (this.query.aggregate) schemas.push(QUERY_SCHEMAS.AGGREGATE);
    if (this.query.analyze) schemas.push(QUERY_SCHEMAS.ANALYZE);
    return schemas;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createQueryAdapter(
  query: QueryEngine,
  moduleVersion: string,
  config?: Partial<QueryAdapterConfig>
): QueryAdapter {
  return new QueryAdapter(query, moduleVersion, config);
}
