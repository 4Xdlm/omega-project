/**
 * Atlas Index Manager Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IndexManager } from '../src/indexManager.js';
import type { AtlasView, IndexDefinition } from '../src/types.js';
import {
  AtlasIndexAlreadyExistsError,
  AtlasIndexNotFoundError,
} from '../src/errors.js';

const createView = (id: string, data: Record<string, unknown>): AtlasView => ({
  id,
  data,
  timestamp: Date.now(),
  version: 1,
});

describe('IndexManager', () => {
  let manager: IndexManager;

  beforeEach(() => {
    manager = new IndexManager();
  });

  describe('createIndex', () => {
    it('creates a hash index', () => {
      manager.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      expect(manager.hasIndex('idx_name')).toBe(true);
    });

    it('creates a btree index', () => {
      manager.createIndex({ name: 'idx_age', field: 'age', type: 'btree' });
      expect(manager.hasIndex('idx_age')).toBe(true);
    });

    it('creates a fulltext index', () => {
      manager.createIndex({ name: 'idx_desc', field: 'description', type: 'fulltext' });
      expect(manager.hasIndex('idx_desc')).toBe(true);
    });

    it('throws when index already exists', () => {
      manager.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      expect(() =>
        manager.createIndex({ name: 'idx_name', field: 'other', type: 'hash' })
      ).toThrow(AtlasIndexAlreadyExistsError);
    });
  });

  describe('dropIndex', () => {
    it('drops existing index', () => {
      manager.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      manager.dropIndex('idx_name');
      expect(manager.hasIndex('idx_name')).toBe(false);
    });

    it('throws when index not found', () => {
      expect(() => manager.dropIndex('nonexistent')).toThrow(
        AtlasIndexNotFoundError
      );
    });
  });

  describe('hash index operations', () => {
    beforeEach(() => {
      manager.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
    });

    it('adds view to index', () => {
      const view = createView('1', { name: 'Alice' });
      manager.addToIndexes(view);

      const result = manager.lookupByIndex('idx_name', 'Alice');
      expect(result).toContain('1');
    });

    it('removes view from index', () => {
      const view = createView('1', { name: 'Alice' });
      manager.addToIndexes(view);
      manager.removeFromIndexes('1');

      const result = manager.lookupByIndex('idx_name', 'Alice');
      expect(result).not.toContain('1');
    });

    it('updates view in index', () => {
      const view1 = createView('1', { name: 'Alice' });
      manager.addToIndexes(view1);

      const view2 = { ...view1, data: { name: 'Bob' } };
      manager.updateIndexes(view2);

      expect(manager.lookupByIndex('idx_name', 'Alice')).not.toContain('1');
      expect(manager.lookupByIndex('idx_name', 'Bob')).toContain('1');
    });

    it('handles multiple views with same value', () => {
      const view1 = createView('1', { name: 'Alice' });
      const view2 = createView('2', { name: 'Alice' });
      manager.addToIndexes(view1);
      manager.addToIndexes(view2);

      const result = manager.lookupByIndex('idx_name', 'Alice');
      expect(result).toContain('1');
      expect(result).toContain('2');
    });

    it('returns deterministic order', () => {
      const views = [
        createView('c', { name: 'Test' }),
        createView('a', { name: 'Test' }),
        createView('b', { name: 'Test' }),
      ];
      views.forEach((v) => manager.addToIndexes(v));

      const result = manager.lookupByIndex('idx_name', 'Test');
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  describe('btree index operations', () => {
    beforeEach(() => {
      manager.createIndex({ name: 'idx_age', field: 'age', type: 'btree' });
    });

    it('adds view to btree index', () => {
      const view = createView('1', { age: 30 });
      manager.addToIndexes(view);

      const result = manager.lookupByIndex('idx_age', 30);
      expect(result).toContain('1');
    });

    it('handles numeric ordering', () => {
      const views = [
        createView('1', { age: 30 }),
        createView('2', { age: 25 }),
        createView('3', { age: 35 }),
      ];
      views.forEach((v) => manager.addToIndexes(v));

      expect(manager.lookupByIndex('idx_age', 25)).toContain('2');
      expect(manager.lookupByIndex('idx_age', 30)).toContain('1');
      expect(manager.lookupByIndex('idx_age', 35)).toContain('3');
    });
  });

  describe('nested field indexing', () => {
    beforeEach(() => {
      manager.createIndex({
        name: 'idx_user_name',
        field: 'user.name',
        type: 'hash',
      });
    });

    it('indexes nested fields', () => {
      const view = createView('1', { user: { name: 'Alice' } });
      manager.addToIndexes(view);

      const result = manager.lookupByIndex('idx_user_name', 'Alice');
      expect(result).toContain('1');
    });

    it('handles missing nested path', () => {
      const view = createView('1', { other: 'value' });
      manager.addToIndexes(view);

      const result = manager.lookupByIndex('idx_user_name', undefined);
      expect(result).toContain('1');
    });
  });

  describe('data. prefix fields', () => {
    beforeEach(() => {
      manager.createIndex({
        name: 'idx_data_name',
        field: 'data.name',
        type: 'hash',
      });
    });

    it('indexes data. prefixed fields', () => {
      const view = createView('1', { name: 'Alice' });
      manager.addToIndexes(view);

      const result = manager.lookupByIndex('idx_data_name', 'Alice');
      expect(result).toContain('1');
    });
  });

  describe('top-level field indexing', () => {
    it('indexes id field', () => {
      manager.createIndex({ name: 'idx_id', field: 'id', type: 'hash' });
      const view = createView('test-id', { name: 'Test' });
      manager.addToIndexes(view);

      const result = manager.lookupByIndex('idx_id', 'test-id');
      expect(result).toContain('test-id');
    });

    it('indexes timestamp field', () => {
      manager.createIndex({ name: 'idx_ts', field: 'timestamp', type: 'btree' });
      const view: AtlasView = {
        id: '1',
        data: {},
        timestamp: 1000,
        version: 1,
      };
      manager.addToIndexes(view);

      const result = manager.lookupByIndex('idx_ts', 1000);
      expect(result).toContain('1');
    });
  });

  describe('getIndexNames', () => {
    it('returns empty array when no indexes', () => {
      expect(manager.getIndexNames()).toEqual([]);
    });

    it('returns sorted index names', () => {
      manager.createIndex({ name: 'z_idx', field: 'z', type: 'hash' });
      manager.createIndex({ name: 'a_idx', field: 'a', type: 'hash' });
      manager.createIndex({ name: 'm_idx', field: 'm', type: 'hash' });

      expect(manager.getIndexNames()).toEqual(['a_idx', 'm_idx', 'z_idx']);
    });
  });

  describe('getAllStats', () => {
    it('returns stats for all indexes', () => {
      manager.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      manager.createIndex({ name: 'idx_age', field: 'age', type: 'btree' });

      const view = createView('1', { name: 'Alice', age: 30 });
      manager.addToIndexes(view);

      const stats = manager.getAllStats();
      expect(stats).toHaveLength(2);
      expect(stats.some((s) => s.name === 'idx_name')).toBe(true);
      expect(stats.some((s) => s.name === 'idx_age')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('clears all index entries', () => {
      manager.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      const view = createView('1', { name: 'Alice' });
      manager.addToIndexes(view);

      manager.clearAll();

      const result = manager.lookupByIndex('idx_name', 'Alice');
      expect(result).toHaveLength(0);
    });
  });

  describe('lookupByIndex', () => {
    it('throws when index not found', () => {
      expect(() => manager.lookupByIndex('nonexistent', 'value')).toThrow(
        AtlasIndexNotFoundError
      );
    });
  });
});
