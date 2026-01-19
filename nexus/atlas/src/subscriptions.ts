/**
 * Atlas Subscription System
 * Standard: NASA-Grade L4
 *
 * Provides reactive subscriptions to view changes
 */

import type {
  AtlasView,
  QueryFilter,
  Subscription,
  SubscriptionCallback,
  SubscriptionEvent,
  RNG,
  systemRNG,
} from './types.js';
import {
  AtlasSubscriptionNotFoundError,
  AtlasSubscriptionCallbackError,
} from './errors.js';

// ============================================================
// Subscription Entry
// ============================================================

interface SubscriptionEntry {
  readonly id: string;
  readonly filter?: QueryFilter;
  readonly callback: SubscriptionCallback;
}

// ============================================================
// Filter Matching (reused from query)
// ============================================================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function matchesFilter(view: AtlasView, filter: QueryFilter): boolean {
  let fieldValue: unknown;

  if (filter.field === 'id' || filter.field === 'timestamp' || filter.field === 'version') {
    fieldValue = view[filter.field as keyof AtlasView];
  } else if (filter.field.startsWith('data.')) {
    fieldValue = getNestedValue(view.data, filter.field.slice(5));
  } else {
    fieldValue = getNestedValue(view.data, filter.field);
  }

  switch (filter.operator) {
    case 'eq':
      return fieldValue === filter.value;
    case 'ne':
      return fieldValue !== filter.value;
    case 'gt':
      return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue > filter.value;
    case 'gte':
      return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue >= filter.value;
    case 'lt':
      return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue < filter.value;
    case 'lte':
      return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue <= filter.value;
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(fieldValue);
    case 'nin':
      return Array.isArray(filter.value) && !filter.value.includes(fieldValue);
    case 'contains':
      return typeof fieldValue === 'string' && typeof filter.value === 'string' && fieldValue.includes(filter.value);
    case 'startsWith':
      return typeof fieldValue === 'string' && typeof filter.value === 'string' && fieldValue.startsWith(filter.value);
    case 'exists':
      return filter.value ? fieldValue !== undefined : fieldValue === undefined;
    default:
      return false;
  }
}

// ============================================================
// Subscription Manager
// ============================================================

export class SubscriptionManager {
  private readonly subscriptions: Map<string, SubscriptionEntry> = new Map();
  private readonly rng: RNG;

  constructor(rng: RNG = { random: Math.random, randomId: () => Math.random().toString(36).slice(2) }) {
    this.rng = rng;
  }

  subscribe(
    callback: SubscriptionCallback,
    filter?: QueryFilter
  ): Subscription {
    const id = this.rng.randomId();

    const entry: SubscriptionEntry = Object.freeze({
      id,
      filter,
      callback,
    });

    this.subscriptions.set(id, entry);

    return Object.freeze({
      id,
      filter,
      unsubscribe: () => {
        this.subscriptions.delete(id);
      },
    });
  }

  unsubscribe(id: string): void {
    if (!this.subscriptions.has(id)) {
      throw new AtlasSubscriptionNotFoundError(
        `Subscription not found: ${id}`,
        { subscriptionId: id }
      );
    }
    this.subscriptions.delete(id);
  }

  notifyInsert(view: AtlasView, timestamp: number): void {
    const event: SubscriptionEvent = Object.freeze({
      type: 'insert',
      view,
      timestamp,
    });

    this.notifyAll(event, view);
  }

  notifyUpdate(view: AtlasView, previousView: AtlasView, timestamp: number): void {
    const event: SubscriptionEvent = Object.freeze({
      type: 'update',
      view,
      previousView,
      timestamp,
    });

    this.notifyAll(event, view);
  }

  notifyDelete(view: AtlasView, timestamp: number): void {
    const event: SubscriptionEvent = Object.freeze({
      type: 'delete',
      view,
      timestamp,
    });

    this.notifyAll(event, view);
  }

  private notifyAll(event: SubscriptionEvent, view: AtlasView): void {
    // Sort by ID for deterministic order
    const sortedIds = [...this.subscriptions.keys()].sort();

    for (const id of sortedIds) {
      const entry = this.subscriptions.get(id);
      if (!entry) continue;

      // Check filter
      if (entry.filter && !matchesFilter(view, entry.filter)) {
        continue;
      }

      // Call callback with error handling
      try {
        entry.callback(event);
      } catch (error) {
        // Log but don't propagate - subscriptions should be resilient
        throw new AtlasSubscriptionCallbackError(
          `Callback error for subscription ${id}`,
          {
            subscriptionId: id,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  hasSubscription(id: string): boolean {
    return this.subscriptions.has(id);
  }

  getSubscriptionIds(): readonly string[] {
    return Object.freeze([...this.subscriptions.keys()].sort());
  }

  clearAll(): void {
    this.subscriptions.clear();
  }
}
