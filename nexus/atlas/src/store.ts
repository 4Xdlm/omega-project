/**
 * Atlas View Store
 * Standard: NASA-Grade L4
 *
 * Main store for managing views with query, index, and subscriptions
 */

import type {
  AtlasView,
  AtlasQuery,
  AtlasResult,
  IndexDefinition,
  IndexStats,
  QueryFilter,
  Subscription,
  SubscriptionCallback,
  Clock,
  RNG,
  systemClock,
  systemRNG,
  LedgerEvent,
  ProjectionDefinition,
  Projector,
} from './types.js';
import type { Logger } from '../../shared/logging/index.js';
import type { MetricsCollector } from '../../shared/metrics/index.js';
import {
  AtlasViewNotFoundError,
  AtlasViewAlreadyExistsError,
  AtlasViewVersionConflictError,
  AtlasProjectionFailedError,
} from './errors.js';
import { executeQuery, validateQuery } from './query.js';
import { IndexManager } from './indexManager.js';
import { SubscriptionManager } from './subscriptions.js';

// ============================================================
// Store Configuration
// ============================================================

export interface AtlasStoreConfig {
  readonly clock?: Clock;
  readonly rng?: RNG;
  readonly logger?: Logger;
  readonly metrics?: MetricsCollector;
}

// ============================================================
// Atlas Store
// ============================================================

export class AtlasStore {
  private readonly views: Map<string, AtlasView> = new Map();
  private readonly indexManager: IndexManager;
  private readonly subscriptionManager: SubscriptionManager;
  private readonly clock: Clock;
  private readonly rng: RNG;
  private readonly projections: Map<string, ProjectionDefinition> = new Map();
  private readonly logger?: Logger;
  private readonly metrics?: MetricsCollector;
  private readonly insertCounter?: ReturnType<MetricsCollector['counter']>;
  private readonly updateCounter?: ReturnType<MetricsCollector['counter']>;
  private readonly deleteCounter?: ReturnType<MetricsCollector['counter']>;
  private readonly viewsGauge?: ReturnType<MetricsCollector['gauge']>;

  constructor(config: AtlasStoreConfig = {}) {
    this.clock = config.clock ?? { now: () => Date.now() };
    this.rng = config.rng ?? {
      random: () => Math.random(),
      randomId: () => Math.random().toString(36).slice(2),
    };
    this.indexManager = new IndexManager();
    this.subscriptionManager = new SubscriptionManager(this.rng);
    this.logger = config.logger;
    this.metrics = config.metrics;

    if (this.metrics) {
      this.insertCounter = this.metrics.counter('atlas_inserts_total', 'Total view inserts');
      this.updateCounter = this.metrics.counter('atlas_updates_total', 'Total view updates');
      this.deleteCounter = this.metrics.counter('atlas_deletes_total', 'Total view deletes');
      this.viewsGauge = this.metrics.gauge('atlas_views_count', 'Current view count');
    }
  }

  // ============================================================
  // View CRUD Operations
  // ============================================================

  insert(id: string, data: Record<string, unknown>): AtlasView {
    if (this.views.has(id)) {
      throw new AtlasViewAlreadyExistsError(`View already exists: ${id}`, {
        viewId: id,
      });
    }

    const view: AtlasView = Object.freeze({
      id,
      data: Object.freeze({ ...data }),
      timestamp: this.clock.now(),
      version: 1,
    });

    this.views.set(id, view);
    this.indexManager.addToIndexes(view);
    this.subscriptionManager.notifyInsert(view, view.timestamp);

    this.logger?.debug('View inserted', { viewId: id, version: 1 });
    this.insertCounter?.inc();
    this.viewsGauge?.set(this.views.size);

    return view;
  }

  update(
    id: string,
    data: Record<string, unknown>,
    expectedVersion?: number
  ): AtlasView {
    const existing = this.views.get(id);
    if (!existing) {
      throw new AtlasViewNotFoundError(`View not found: ${id}`, { viewId: id });
    }

    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new AtlasViewVersionConflictError(
        `Version conflict: expected ${expectedVersion}, got ${existing.version}`,
        { viewId: id, expectedVersion, actualVersion: existing.version }
      );
    }

    const view: AtlasView = Object.freeze({
      id,
      data: Object.freeze({ ...data }),
      timestamp: this.clock.now(),
      version: existing.version + 1,
    });

    this.views.set(id, view);
    this.indexManager.updateIndexes(view);
    this.subscriptionManager.notifyUpdate(view, existing, view.timestamp);

    this.logger?.debug('View updated', { viewId: id, version: view.version });
    this.updateCounter?.inc();

    return view;
  }

  upsert(id: string, data: Record<string, unknown>): AtlasView {
    if (this.views.has(id)) {
      return this.update(id, data);
    }
    return this.insert(id, data);
  }

  delete(id: string): AtlasView {
    const existing = this.views.get(id);
    if (!existing) {
      throw new AtlasViewNotFoundError(`View not found: ${id}`, { viewId: id });
    }

    this.views.delete(id);
    this.indexManager.removeFromIndexes(id);
    this.subscriptionManager.notifyDelete(existing, this.clock.now());

    this.logger?.debug('View deleted', { viewId: id });
    this.deleteCounter?.inc();
    this.viewsGauge?.set(this.views.size);

    return existing;
  }

  get(id: string): AtlasView | undefined {
    return this.views.get(id);
  }

  has(id: string): boolean {
    return this.views.has(id);
  }

  // ============================================================
  // Query Operations
  // ============================================================

  query(query: AtlasQuery = {}): AtlasResult {
    validateQuery(query);
    const allViews = [...this.views.values()];
    return executeQuery(allViews, query);
  }

  findOne(filter: QueryFilter): AtlasView | undefined {
    const result = this.query({ filter, limit: 1 });
    return result.views[0];
  }

  findMany(filter: QueryFilter, limit?: number): readonly AtlasView[] {
    const result = this.query({ filter, limit });
    return result.views;
  }

  count(filter?: QueryFilter): number {
    if (!filter) {
      return this.views.size;
    }
    const result = this.query({ filter });
    return result.total;
  }

  // ============================================================
  // Index Operations
  // ============================================================

  createIndex(definition: IndexDefinition): void {
    this.indexManager.createIndex(definition);

    // Index existing views
    for (const view of this.views.values()) {
      this.indexManager.addToIndexes(view);
    }
  }

  dropIndex(name: string): void {
    this.indexManager.dropIndex(name);
  }

  hasIndex(name: string): boolean {
    return this.indexManager.hasIndex(name);
  }

  lookupByIndex(name: string, value: unknown): readonly AtlasView[] {
    const ids = this.indexManager.lookupByIndex(name, value);
    const views: AtlasView[] = [];

    for (const id of ids) {
      const view = this.views.get(id);
      if (view) {
        views.push(view);
      }
    }

    return Object.freeze(views);
  }

  getIndexStats(): readonly IndexStats[] {
    return this.indexManager.getAllStats();
  }

  getIndexNames(): readonly string[] {
    return this.indexManager.getIndexNames();
  }

  // ============================================================
  // Subscription Operations
  // ============================================================

  subscribe(
    callback: SubscriptionCallback,
    filter?: QueryFilter
  ): Subscription {
    return this.subscriptionManager.subscribe(callback, filter);
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptionManager.unsubscribe(subscriptionId);
  }

  getSubscriptionCount(): number {
    return this.subscriptionManager.getSubscriptionCount();
  }

  // ============================================================
  // Projection Operations (Ledger Integration)
  // ============================================================

  registerProjection<T extends AtlasView>(definition: ProjectionDefinition<T>): void {
    this.projections.set(definition.name, definition as ProjectionDefinition);
  }

  unregisterProjection(name: string): void {
    this.projections.delete(name);
  }

  applyEvent(event: LedgerEvent): void {
    for (const projection of this.projections.values()) {
      if (!projection.sourceEventTypes.includes(event.type)) {
        continue;
      }

      try {
        // Determine view ID from event
        const viewId = this.extractViewId(event);
        if (!viewId) continue;

        const currentState = this.views.get(viewId);
        const newState = projection.projector(event, currentState);

        if (newState === undefined) {
          // Projector wants to delete
          if (currentState) {
            this.delete(viewId);
          }
        } else if (currentState) {
          // Update existing
          this.update(viewId, newState.data);
        } else {
          // Insert new
          this.insert(viewId, newState.data);
        }
      } catch (error) {
        throw new AtlasProjectionFailedError(
          `Projection ${projection.name} failed for event ${event.type}`,
          {
            projectionName: projection.name,
            eventType: event.type,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }
  }

  private extractViewId(event: LedgerEvent): string | undefined {
    // Try common patterns for extracting ID
    if (typeof event.payload.id === 'string') {
      return event.payload.id;
    }
    if (typeof event.payload.viewId === 'string') {
      return event.payload.viewId;
    }
    if (typeof event.payload.entityId === 'string') {
      return event.payload.entityId;
    }
    if (event.sourceId) {
      return event.sourceId;
    }
    return undefined;
  }

  // ============================================================
  // Utility Operations
  // ============================================================

  getAll(): readonly AtlasView[] {
    // Sort by ID for deterministic order
    const sorted = [...this.views.values()].sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    return Object.freeze(sorted);
  }

  size(): number {
    return this.views.size;
  }

  clear(): void {
    const timestamp = this.clock.now();

    // Notify deletions for all views
    for (const view of this.views.values()) {
      this.subscriptionManager.notifyDelete(view, timestamp);
    }

    this.views.clear();
    this.indexManager.clearAll();
  }

  /**
   * @internal TEST ONLY
   */
  __clearForTests(): void {
    this.views.clear();
    this.indexManager.__dropAllForTests();
    this.subscriptionManager.clearAll();
    this.projections.clear();
  }
}
