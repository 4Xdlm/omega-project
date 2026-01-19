/**
 * Atlas Query Engine Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import { executeQuery, validateQuery } from '../src/query.js';
import type { AtlasView, AtlasQuery } from '../src/types.js';
import { AtlasQueryInvalidFilterError, AtlasQueryInvalidOperatorError } from '../src/errors.js';

const createView = (id: string, data: Record<string, unknown>, timestamp = 1000): AtlasView => ({
  id,
  data,
  timestamp,
  version: 1,
});

describe('Atlas Query Engine', () => {
  const views: AtlasView[] = [
    createView('1', { name: 'Alice', age: 30, tags: ['admin'] }, 1000),
    createView('2', { name: 'Bob', age: 25, tags: ['user'] }, 2000),
    createView('3', { name: 'Charlie', age: 35, tags: ['admin', 'user'] }, 3000),
    createView('4', { name: 'Diana', age: 28, tags: ['user'] }, 4000),
    createView('5', { name: 'Eve', age: 30, tags: ['guest'] }, 5000),
  ];

  describe('executeQuery', () => {
    describe('no filter', () => {
      it('returns all views sorted by timestamp', () => {
        const result = executeQuery(views, {});
        expect(result.views).toHaveLength(5);
        expect(result.total).toBe(5);
        expect(result.hasMore).toBe(false);
        expect(result.views[0].id).toBe('1');
        expect(result.views[4].id).toBe('5');
      });
    });

    describe('filter operators', () => {
      it('eq: equals', () => {
        const result = executeQuery(views, {
          filter: { field: 'name', operator: 'eq', value: 'Alice' },
        });
        expect(result.views).toHaveLength(1);
        expect(result.views[0].id).toBe('1');
      });

      it('ne: not equals', () => {
        const result = executeQuery(views, {
          filter: { field: 'name', operator: 'ne', value: 'Alice' },
        });
        expect(result.views).toHaveLength(4);
        expect(result.views.every((v) => v.data.name !== 'Alice')).toBe(true);
      });

      it('gt: greater than', () => {
        const result = executeQuery(views, {
          filter: { field: 'age', operator: 'gt', value: 30 },
        });
        expect(result.views).toHaveLength(1);
        expect(result.views[0].data.age).toBe(35);
      });

      it('gte: greater than or equal', () => {
        const result = executeQuery(views, {
          filter: { field: 'age', operator: 'gte', value: 30 },
        });
        expect(result.views).toHaveLength(3);
      });

      it('lt: less than', () => {
        const result = executeQuery(views, {
          filter: { field: 'age', operator: 'lt', value: 28 },
        });
        expect(result.views).toHaveLength(1);
        expect(result.views[0].data.age).toBe(25);
      });

      it('lte: less than or equal', () => {
        const result = executeQuery(views, {
          filter: { field: 'age', operator: 'lte', value: 28 },
        });
        expect(result.views).toHaveLength(2);
      });

      it('in: value in array', () => {
        const result = executeQuery(views, {
          filter: { field: 'age', operator: 'in', value: [25, 30] },
        });
        expect(result.views).toHaveLength(3);
      });

      it('nin: value not in array', () => {
        const result = executeQuery(views, {
          filter: { field: 'age', operator: 'nin', value: [25, 30] },
        });
        expect(result.views).toHaveLength(2);
      });

      it('contains: string contains', () => {
        const result = executeQuery(views, {
          filter: { field: 'name', operator: 'contains', value: 'li' },
        });
        expect(result.views).toHaveLength(2);
        expect(result.views.map((v) => v.data.name)).toContain('Alice');
        expect(result.views.map((v) => v.data.name)).toContain('Charlie');
      });

      it('startsWith: string starts with', () => {
        const result = executeQuery(views, {
          filter: { field: 'name', operator: 'startsWith', value: 'D' },
        });
        expect(result.views).toHaveLength(1);
        expect(result.views[0].data.name).toBe('Diana');
      });

      it('exists: field exists', () => {
        const viewsWithOptional = [
          ...views,
          createView('6', { name: 'Frank' }, 6000),
        ];
        const result = executeQuery(viewsWithOptional, {
          filter: { field: 'age', operator: 'exists', value: true },
        });
        expect(result.views).toHaveLength(5);
      });

      it('exists false: field does not exist', () => {
        const viewsWithOptional = [
          ...views,
          createView('6', { name: 'Frank' }, 6000),
        ];
        const result = executeQuery(viewsWithOptional, {
          filter: { field: 'age', operator: 'exists', value: false },
        });
        expect(result.views).toHaveLength(1);
        expect(result.views[0].id).toBe('6');
      });
    });

    describe('nested fields', () => {
      it('handles data. prefix for nested fields', () => {
        const result = executeQuery(views, {
          filter: { field: 'data.name', operator: 'eq', value: 'Alice' },
        });
        expect(result.views).toHaveLength(1);
      });

      it('handles deeply nested fields', () => {
        const nestedViews = [
          createView('1', { user: { profile: { name: 'Test' } } }),
        ];
        const result = executeQuery(nestedViews, {
          filter: { field: 'user.profile.name', operator: 'eq', value: 'Test' },
        });
        expect(result.views).toHaveLength(1);
      });
    });

    describe('top-level fields', () => {
      it('filters by id', () => {
        const result = executeQuery(views, {
          filter: { field: 'id', operator: 'eq', value: '3' },
        });
        expect(result.views).toHaveLength(1);
        expect(result.views[0].id).toBe('3');
      });

      it('filters by timestamp', () => {
        const result = executeQuery(views, {
          filter: { field: 'timestamp', operator: 'gte', value: 4000 },
        });
        expect(result.views).toHaveLength(2);
      });

      it('filters by version', () => {
        const result = executeQuery(views, {
          filter: { field: 'version', operator: 'eq', value: 1 },
        });
        expect(result.views).toHaveLength(5);
      });
    });

    describe('sorting', () => {
      it('sorts by field ascending', () => {
        const result = executeQuery(views, {
          sort: { field: 'name', direction: 'asc' },
        });
        const names = result.views.map((v) => v.data.name);
        expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
      });

      it('sorts by field descending', () => {
        const result = executeQuery(views, {
          sort: { field: 'name', direction: 'desc' },
        });
        const names = result.views.map((v) => v.data.name);
        expect(names).toEqual(['Eve', 'Diana', 'Charlie', 'Bob', 'Alice']);
      });

      it('sorts by numeric field', () => {
        const result = executeQuery(views, {
          sort: { field: 'age', direction: 'asc' },
        });
        const ages = result.views.map((v) => v.data.age);
        expect(ages).toEqual([25, 28, 30, 30, 35]);
      });

      it('sorts by timestamp', () => {
        const result = executeQuery(views, {
          sort: { field: 'timestamp', direction: 'desc' },
        });
        expect(result.views[0].id).toBe('5');
        expect(result.views[4].id).toBe('1');
      });
    });

    describe('pagination', () => {
      it('applies limit', () => {
        const result = executeQuery(views, { limit: 2 });
        expect(result.views).toHaveLength(2);
        expect(result.total).toBe(5);
        expect(result.hasMore).toBe(true);
      });

      it('applies offset', () => {
        const result = executeQuery(views, { offset: 2 });
        expect(result.views).toHaveLength(3);
        expect(result.views[0].id).toBe('3');
      });

      it('applies limit and offset', () => {
        const result = executeQuery(views, { limit: 2, offset: 1 });
        expect(result.views).toHaveLength(2);
        expect(result.views[0].id).toBe('2');
        expect(result.views[1].id).toBe('3');
        expect(result.hasMore).toBe(true);
      });

      it('hasMore is false when at end', () => {
        const result = executeQuery(views, { limit: 2, offset: 4 });
        expect(result.views).toHaveLength(1);
        expect(result.hasMore).toBe(false);
      });
    });

    describe('combined operations', () => {
      it('filter + sort + pagination', () => {
        const result = executeQuery(views, {
          filter: { field: 'age', operator: 'gte', value: 28 },
          sort: { field: 'age', direction: 'desc' },
          limit: 2,
          offset: 1,
        });
        expect(result.total).toBe(4);
        expect(result.views).toHaveLength(2);
        expect(result.views[0].data.age).toBe(30);
      });
    });
  });

  describe('validateQuery', () => {
    it('accepts valid query', () => {
      expect(() =>
        validateQuery({
          filter: { field: 'name', operator: 'eq', value: 'test' },
          limit: 10,
          offset: 0,
        })
      ).not.toThrow();
    });

    it('rejects invalid operator', () => {
      expect(() =>
        validateQuery({
          filter: { field: 'name', operator: 'invalid' as any, value: 'test' },
        })
      ).toThrow(AtlasQueryInvalidOperatorError);
    });

    it('rejects empty field', () => {
      expect(() =>
        validateQuery({
          filter: { field: '', operator: 'eq', value: 'test' },
        })
      ).toThrow(AtlasQueryInvalidFilterError);
    });

    it('rejects negative limit', () => {
      expect(() => validateQuery({ limit: -1 })).toThrow(AtlasQueryInvalidFilterError);
    });

    it('rejects negative offset', () => {
      expect(() => validateQuery({ offset: -1 })).toThrow(AtlasQueryInvalidFilterError);
    });
  });
});
