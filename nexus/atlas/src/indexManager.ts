/**
 * Atlas Index System
 * Standard: NASA-Grade L4
 *
 * Provides indexing capabilities for fast view lookups
 */

import type {
  AtlasView,
  IndexDefinition,
  IndexStats,
  IndexType,
} from './types.js';
import {
  AtlasIndexAlreadyExistsError,
  AtlasIndexNotFoundError,
} from './errors.js';

// ============================================================
// Index Interface
// ============================================================

interface Index {
  readonly definition: IndexDefinition;
  add(view: AtlasView): void;
  remove(viewId: string): void;
  update(view: AtlasView): void;
  lookup(value: unknown): readonly string[];
  getStats(): IndexStats;
  clear(): void;
}

// ============================================================
// Hash Index Implementation
// ============================================================

class HashIndex implements Index {
  readonly definition: IndexDefinition;
  private readonly index: Map<unknown, Set<string>> = new Map();
  private readonly viewValues: Map<string, unknown> = new Map();

  constructor(definition: IndexDefinition) {
    this.definition = definition;
  }

  private extractValue(view: AtlasView): unknown {
    const field = this.definition.field;

    if (field === 'id' || field === 'timestamp' || field === 'version') {
      return view[field as keyof AtlasView];
    }

    if (field.startsWith('data.')) {
      return this.getNestedValue(view.data, field.slice(5));
    }

    return this.getNestedValue(view.data, field);
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
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

  add(view: AtlasView): void {
    const value = this.extractValue(view);
    this.viewValues.set(view.id, value);

    if (!this.index.has(value)) {
      this.index.set(value, new Set());
    }
    this.index.get(value)!.add(view.id);
  }

  remove(viewId: string): void {
    const value = this.viewValues.get(viewId);
    if (value === undefined) return;

    const ids = this.index.get(value);
    if (ids) {
      ids.delete(viewId);
      if (ids.size === 0) {
        this.index.delete(value);
      }
    }

    this.viewValues.delete(viewId);
  }

  update(view: AtlasView): void {
    this.remove(view.id);
    this.add(view);
  }

  lookup(value: unknown): readonly string[] {
    const ids = this.index.get(value);
    if (!ids) return [];
    return [...ids].sort(); // Deterministic order
  }

  getStats(): IndexStats {
    let sizeBytes = 0;
    let entries = 0;

    for (const [, ids] of this.index) {
      entries += ids.size;
      sizeBytes += ids.size * 32; // Estimate 32 bytes per ID
    }

    return Object.freeze({
      name: this.definition.name,
      entries,
      sizeBytes,
    });
  }

  clear(): void {
    this.index.clear();
    this.viewValues.clear();
  }
}

// ============================================================
// BTree Index Implementation (Simplified)
// ============================================================

class BTreeIndex implements Index {
  readonly definition: IndexDefinition;
  private readonly entries: Array<{ value: unknown; id: string }> = [];
  private readonly viewValues: Map<string, unknown> = new Map();

  constructor(definition: IndexDefinition) {
    this.definition = definition;
  }

  private extractValue(view: AtlasView): unknown {
    const field = this.definition.field;

    if (field === 'id' || field === 'timestamp' || field === 'version') {
      return view[field as keyof AtlasView];
    }

    if (field.startsWith('data.')) {
      return this.getNestedValue(view.data, field.slice(5));
    }

    return this.getNestedValue(view.data, field);
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
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

  private compare(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a === undefined || a === null) return 1;
    if (b === undefined || b === null) return -1;

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    return String(a).localeCompare(String(b));
  }

  private insertSorted(value: unknown, id: string): void {
    let low = 0;
    let high = this.entries.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.compare(this.entries[mid].value, value) < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    this.entries.splice(low, 0, { value, id });
  }

  add(view: AtlasView): void {
    const value = this.extractValue(view);
    this.viewValues.set(view.id, value);
    this.insertSorted(value, view.id);
  }

  remove(viewId: string): void {
    const idx = this.entries.findIndex((e) => e.id === viewId);
    if (idx !== -1) {
      this.entries.splice(idx, 1);
    }
    this.viewValues.delete(viewId);
  }

  update(view: AtlasView): void {
    this.remove(view.id);
    this.add(view);
  }

  lookup(value: unknown): readonly string[] {
    const result: string[] = [];

    for (const entry of this.entries) {
      if (entry.value === value) {
        result.push(entry.id);
      } else if (this.compare(entry.value, value) > 0) {
        break; // Sorted, so no more matches possible
      }
    }

    return result.sort(); // Deterministic order
  }

  getStats(): IndexStats {
    return Object.freeze({
      name: this.definition.name,
      entries: this.entries.length,
      sizeBytes: this.entries.length * 48, // Estimate
    });
  }

  clear(): void {
    this.entries.length = 0;
    this.viewValues.clear();
  }
}

// ============================================================
// Index Manager
// ============================================================

export class IndexManager {
  private readonly indexes: Map<string, Index> = new Map();

  createIndex(definition: IndexDefinition): void {
    if (this.indexes.has(definition.name)) {
      throw new AtlasIndexAlreadyExistsError(
        `Index already exists: ${definition.name}`,
        { indexName: definition.name }
      );
    }

    const index = this.createIndexInstance(definition);
    this.indexes.set(definition.name, index);
  }

  private createIndexInstance(definition: IndexDefinition): Index {
    switch (definition.type) {
      case 'hash':
        return new HashIndex(definition);
      case 'btree':
        return new BTreeIndex(definition);
      case 'fulltext':
        // Fulltext uses hash for simplicity in Phase A
        return new HashIndex(definition);
      default: {
        const _exhaustive: never = definition.type;
        throw new Error(`Unknown index type: ${_exhaustive}`);
      }
    }
  }

  dropIndex(name: string): void {
    if (!this.indexes.has(name)) {
      throw new AtlasIndexNotFoundError(`Index not found: ${name}`, {
        indexName: name,
      });
    }
    this.indexes.delete(name);
  }

  getIndex(name: string): Index | undefined {
    return this.indexes.get(name);
  }

  hasIndex(name: string): boolean {
    return this.indexes.has(name);
  }

  addToIndexes(view: AtlasView): void {
    for (const index of this.indexes.values()) {
      index.add(view);
    }
  }

  removeFromIndexes(viewId: string): void {
    for (const index of this.indexes.values()) {
      index.remove(viewId);
    }
  }

  updateIndexes(view: AtlasView): void {
    for (const index of this.indexes.values()) {
      index.update(view);
    }
  }

  lookupByIndex(name: string, value: unknown): readonly string[] {
    const index = this.indexes.get(name);
    if (!index) {
      throw new AtlasIndexNotFoundError(`Index not found: ${name}`, {
        indexName: name,
      });
    }
    return index.lookup(value);
  }

  getAllStats(): readonly IndexStats[] {
    const stats: IndexStats[] = [];
    for (const index of this.indexes.values()) {
      stats.push(index.getStats());
    }
    return Object.freeze(stats);
  }

  getIndexNames(): readonly string[] {
    return Object.freeze([...this.indexes.keys()].sort());
  }

  clearAll(): void {
    for (const index of this.indexes.values()) {
      index.clear();
    }
  }

  /**
   * @internal TEST ONLY
   * Removes all indexes entirely
   */
  __dropAllForTests(): void {
    this.indexes.clear();
  }
}

// Re-export types
export type { IndexDefinition, IndexStats, IndexType };
