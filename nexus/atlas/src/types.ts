/**
 * Atlas View Model Types
 * Standard: NASA-Grade L4
 *
 * Phase A: Full implementation with query, index, subscriptions
 */

// ============================================================
// Core Types
// ============================================================

export interface AtlasView {
  readonly id: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: number;
  readonly version: number;
}

export interface AtlasQuery {
  readonly filter?: QueryFilter;
  readonly sort?: SortSpec;
  readonly limit?: number;
  readonly offset?: number;
}

export interface QueryFilter {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: unknown;
}

export type FilterOperator =
  | 'eq'     // equals
  | 'ne'     // not equals
  | 'gt'     // greater than
  | 'gte'    // greater than or equal
  | 'lt'     // less than
  | 'lte'    // less than or equal
  | 'in'     // in array
  | 'nin'    // not in array
  | 'contains' // string contains
  | 'startsWith' // string starts with
  | 'exists'; // field exists

export interface SortSpec {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

export interface AtlasResult<T = AtlasView> {
  readonly views: readonly T[];
  readonly total: number;
  readonly hasMore: boolean;
}

// ============================================================
// Index Types
// ============================================================

export interface IndexDefinition {
  readonly name: string;
  readonly field: string;
  readonly type: IndexType;
}

export type IndexType = 'hash' | 'btree' | 'fulltext';

export interface IndexStats {
  readonly name: string;
  readonly entries: number;
  readonly sizeBytes: number;
}

// ============================================================
// Subscription Types
// ============================================================

export type SubscriptionCallback<T = AtlasView> = (
  event: SubscriptionEvent<T>
) => void;

export interface SubscriptionEvent<T = AtlasView> {
  readonly type: 'insert' | 'update' | 'delete';
  readonly view: T;
  readonly previousView?: T;
  readonly timestamp: number;
}

export interface Subscription {
  readonly id: string;
  readonly filter?: QueryFilter;
  unsubscribe(): void;
}

// ============================================================
// Projection Types (Ledger Integration)
// ============================================================

export interface ProjectionDefinition<T = AtlasView> {
  readonly name: string;
  readonly sourceEventTypes: readonly string[];
  readonly projector: Projector<T>;
}

export type Projector<T = AtlasView> = (
  event: LedgerEvent,
  currentState: T | undefined
) => T | undefined;

export interface LedgerEvent {
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: number;
  readonly sourceId?: string;
}

// ============================================================
// Clock Interface (Determinism)
// ============================================================

export interface Clock {
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

// ============================================================
// RNG Interface (Determinism)
// ============================================================

export interface RNG {
  random(): number;
  randomId(): string;
}

export function seededRNG(seed: number): RNG {
  let state = seed;
  return {
    random() {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    },
    randomId() {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 16; i++) {
        result += chars[Math.floor(this.random() * chars.length)];
      }
      return result;
    },
  };
}

export const systemRNG: RNG = {
  random: () => Math.random(),
  randomId: () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  },
};
