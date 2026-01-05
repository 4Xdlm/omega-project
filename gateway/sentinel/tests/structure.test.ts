/**
 * OMEGA SENTINEL — Structure Validation Tests
 * Phase 16.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Sentinel, SentinelStatus, BlockReason } from '../src/sentinel/index.js';

describe('SENTINEL checkStructure', () => {
  let sentinel: Sentinel;

  beforeEach(() => {
    sentinel = new Sentinel();
  });

  describe('depth validation', () => {
    it('passes shallow objects', () => {
      const result = sentinel.checkStructure({ a: { b: { c: 1 } } });
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('blocks deeply nested objects', () => {
      const sentinel5 = new Sentinel({ maxDepth: 5 });
      let deep: any = { value: 'end' };
      for (let i = 0; i < 10; i++) {
        deep = { nested: deep };
      }
      const result = sentinel5.checkStructure(deep);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.reason).toBe(BlockReason.MAX_DEPTH_EXCEEDED);
    });

    it('passes at exactly max depth', () => {
      const sentinel3 = new Sentinel({ maxDepth: 3 });
      const atLimit = { a: { b: { c: 1 } } }; // depth 3
      const result = sentinel3.checkStructure(atLimit);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('blocks at max depth + 1', () => {
      const sentinel3 = new Sentinel({ maxDepth: 3 });
      const overLimit = { a: { b: { c: { d: 1 } } } }; // depth 4
      const result = sentinel3.checkStructure(overLimit);
      expect(result.status).toBe(SentinelStatus.BLOCK);
    });
  });

  describe('string length validation', () => {
    it('passes short strings', () => {
      const result = sentinel.checkStructure('hello world');
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('blocks very long strings', () => {
      const sentinel100 = new Sentinel({ maxStringLength: 100 });
      const result = sentinel100.checkStructure('x'.repeat(200));
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.reason).toBe(BlockReason.MAX_STRING_LENGTH_EXCEEDED);
    });

    it('blocks long strings in nested objects', () => {
      const sentinel100 = new Sentinel({ maxStringLength: 100 });
      const input = {
        user: {
          bio: 'x'.repeat(200),
        },
      };
      const result = sentinel100.checkStructure(input);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.structureViolations?.[0].path).toBe('user.bio');
    });
  });

  describe('array length validation', () => {
    it('passes small arrays', () => {
      const result = sentinel.checkStructure([1, 2, 3, 4, 5]);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('blocks very large arrays', () => {
      const sentinel100 = new Sentinel({ maxArrayLength: 100 });
      const result = sentinel100.checkStructure(Array(200).fill(1));
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.reason).toBe(BlockReason.MAX_ARRAY_LENGTH_EXCEEDED);
    });

    it('blocks large nested arrays', () => {
      const sentinel100 = new Sentinel({ maxArrayLength: 100 });
      const input = {
        data: {
          items: Array(200).fill({ id: 1 }),
        },
      };
      const result = sentinel100.checkStructure(input);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.structureViolations?.[0].path).toBe('data.items');
    });
  });

  describe('object keys validation', () => {
    it('passes objects with few keys', () => {
      const result = sentinel.checkStructure({ a: 1, b: 2, c: 3 });
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('blocks objects with too many keys', () => {
      const sentinel10 = new Sentinel({ maxObjectKeys: 10 });
      const manyKeys: Record<string, number> = {};
      for (let i = 0; i < 20; i++) {
        manyKeys[`key${i}`] = i;
      }
      const result = sentinel10.checkStructure(manyKeys);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      expect(result.reason).toBe(BlockReason.MAX_OBJECT_KEYS_EXCEEDED);
    });
  });

  describe('combined validations', () => {
    it('passes valid complex structure', () => {
      const input = {
        users: [
          { name: 'Alice', age: 30, tags: ['admin', 'user'] },
          { name: 'Bob', age: 25, tags: ['user'] },
        ],
        metadata: {
          created: '2025-01-01',
          updated: '2025-01-02',
        },
      };
      const result = sentinel.checkStructure(input);
      expect(result.status).toBe(SentinelStatus.PASS);
    });

    it('reports multiple violations', () => {
      const sentinel = new Sentinel({
        maxStringLength: 10,
        maxArrayLength: 5,
      });
      const input = {
        longString: 'x'.repeat(20),
        smallArray: [1, 2, 3],
      };
      const result = sentinel.checkStructure(input);
      expect(result.status).toBe(SentinelStatus.BLOCK);
      // Should catch at least the string length violation
      expect(result.structureViolations?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('primitive types', () => {
    it('passes numbers', () => {
      expect(sentinel.checkStructure(42).status).toBe(SentinelStatus.PASS);
      expect(sentinel.checkStructure(3.14).status).toBe(SentinelStatus.PASS);
      expect(sentinel.checkStructure(-100).status).toBe(SentinelStatus.PASS);
    });

    it('passes booleans', () => {
      expect(sentinel.checkStructure(true).status).toBe(SentinelStatus.PASS);
      expect(sentinel.checkStructure(false).status).toBe(SentinelStatus.PASS);
    });

    it('passes null', () => {
      expect(sentinel.checkStructure(null).status).toBe(SentinelStatus.PASS);
    });

    it('passes undefined', () => {
      expect(sentinel.checkStructure(undefined).status).toBe(SentinelStatus.PASS);
    });
  });

  describe('violation details', () => {
    it('includes path in violation', () => {
      const sentinel = new Sentinel({ maxStringLength: 5 });
      const input = { a: { b: { c: 'toolong' } } };
      const result = sentinel.checkStructure(input);
      expect(result.structureViolations?.[0].path).toBe('a.b.c');
    });

    it('includes actual value in violation', () => {
      const sentinel = new Sentinel({ maxStringLength: 5 });
      const input = 'toolong';
      const result = sentinel.checkStructure(input);
      expect(result.structureViolations?.[0].actual).toBe(7);
    });

    it('includes limit in violation', () => {
      const sentinel = new Sentinel({ maxStringLength: 5 });
      const input = 'toolong';
      const result = sentinel.checkStructure(input);
      expect(result.structureViolations?.[0].limit).toBe(5);
    });
  });
});
