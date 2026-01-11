/**
 * @fileoverview Unit tests for ArtifactRegistry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createArtifactRegistry,
  InMemoryArtifactRegistry,
  type ArtifactRegistry,
} from '../../src/artifacts/ArtifactRegistry.js';
import { DeterministicClock } from '../../src/util/clock.js';
import { sha256 } from '../../src/util/hash.js';
import { stableStringify } from '../../src/util/stableJson.js';

describe('ArtifactRegistry', () => {
  let registry: ArtifactRegistry;
  let clock: DeterministicClock;
  let idCounter: number;

  beforeEach(() => {
    clock = new DeterministicClock(0);
    idCounter = 0;
    registry = createArtifactRegistry(clock, () => `artifact-${String(++idCounter).padStart(4, '0')}`);
  });

  describe('store', () => {
    it('should store artifact and return metadata', () => {
      const content = { value: 42 };
      const metadata = registry.store('test', content);

      expect(metadata.id).toBe('artifact-0001');
      expect(metadata.kind).toBe('test');
      expect(metadata.created_at).toBe('1970-01-01T00:00:00.000Z');
      expect(metadata.hash).toBe(sha256(stableStringify(content)));
      expect(metadata.size).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const m1 = registry.store('test', { a: 1 });
      const m2 = registry.store('test', { b: 2 });
      const m3 = registry.store('test', { c: 3 });

      expect(m1.id).not.toBe(m2.id);
      expect(m2.id).not.toBe(m3.id);
    });

    it('should store with tags', () => {
      const metadata = registry.store('test', { data: 'value' }, {
        tags: ['important', 'reviewed'],
      });

      expect(metadata.tags).toEqual(['important', 'reviewed']);
    });

    it('should sort tags alphabetically', () => {
      const metadata = registry.store('test', {}, {
        tags: ['zebra', 'apple', 'mango'],
      });

      expect(metadata.tags).toEqual(['apple', 'mango', 'zebra']);
    });

    it('should store with custom metadata', () => {
      const metadata = registry.store('test', {}, {
        custom: { author: 'test', version: 1 },
      });

      expect(metadata.custom).toEqual({ author: 'test', version: 1 });
    });

    it('should use clock for timestamp', () => {
      clock.setTime(Date.UTC(2026, 0, 15, 12, 0, 0));
      const metadata = registry.store('test', {});

      expect(metadata.created_at).toBe('2026-01-15T12:00:00.000Z');
    });
  });

  describe('get', () => {
    it('should retrieve stored artifact', () => {
      const content = { message: 'hello' };
      const metadata = registry.store('message', content);

      const artifact = registry.get(metadata.id);

      expect(artifact).toBeDefined();
      expect(artifact?.content).toEqual(content);
      expect(artifact?.metadata).toEqual(metadata);
    });

    it('should return undefined for unknown ID', () => {
      const artifact = registry.get('nonexistent');
      expect(artifact).toBeUndefined();
    });
  });

  describe('getMetadata', () => {
    it('should retrieve only metadata', () => {
      const metadata = registry.store('test', { large: 'data' });

      const retrieved = registry.getMetadata(metadata.id);

      expect(retrieved).toEqual(metadata);
    });

    it('should return undefined for unknown ID', () => {
      expect(registry.getMetadata('unknown')).toBeUndefined();
    });
  });

  describe('query', () => {
    beforeEach(() => {
      clock.setTime(1000);
      registry.store('log', { msg: 'a' }, { tags: ['error'] });
      clock.advance(1000);
      registry.store('metric', { value: 1 }, { tags: ['cpu'] });
      clock.advance(1000);
      registry.store('log', { msg: 'b' }, { tags: ['error', 'critical'] });
      clock.advance(1000);
      registry.store('metric', { value: 2 }, { tags: ['memory'] });
      clock.advance(1000);
      registry.store('log', { msg: 'c' }, { tags: ['info'] });
    });

    it('should query by kind', () => {
      const results = registry.query({ kind: 'log' });
      expect(results).toHaveLength(3);
      results.forEach(m => expect(m.kind).toBe('log'));
    });

    it('should query by tags', () => {
      const results = registry.query({ tags: ['error'] });
      expect(results).toHaveLength(2);
    });

    it('should require all tags to match', () => {
      const results = registry.query({ tags: ['error', 'critical'] });
      expect(results).toHaveLength(1);
    });

    it('should limit results', () => {
      const results = registry.query({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should sort by created_at descending', () => {
      const results = registry.query({});
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].created_at >= results[i].created_at).toBe(true);
      }
    });

    it('should combine filters', () => {
      const results = registry.query({ kind: 'metric', limit: 1 });
      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('metric');
    });
  });

  describe('verify', () => {
    it('should verify valid artifact', () => {
      const metadata = registry.store('test', { secure: 'data' });
      expect(registry.verify(metadata.id)).toBe(true);
    });

    it('should return false for unknown ID', () => {
      expect(registry.verify('unknown')).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all artifact IDs', () => {
      registry.store('a', {});
      registry.store('b', {});
      registry.store('c', {});

      const ids = registry.list();

      expect(ids).toHaveLength(3);
      expect(ids).toContain('artifact-0001');
      expect(ids).toContain('artifact-0002');
      expect(ids).toContain('artifact-0003');
    });

    it('should return sorted IDs', () => {
      registry.store('a', {});
      registry.store('b', {});

      const ids = registry.list();

      expect(ids).toEqual([...ids].sort());
    });

    it('should return empty array when empty', () => {
      expect(registry.list()).toEqual([]);
    });
  });

  describe('stats', () => {
    it('should return correct statistics', () => {
      registry.store('log', {});
      registry.store('log', {});
      registry.store('metric', {});
      registry.store('trace', {});

      const stats = registry.stats();

      expect(stats.total).toBe(4);
      expect(stats.byKind).toEqual({
        log: 2,
        metric: 1,
        trace: 1,
      });
    });

    it('should return zeros when empty', () => {
      const stats = registry.stats();
      expect(stats.total).toBe(0);
      expect(stats.byKind).toEqual({});
    });
  });

  describe('determinism', () => {
    it('should produce same hash for same content', () => {
      const content = { deterministic: true, value: 123 };

      const r1 = createArtifactRegistry(new DeterministicClock(0), () => 'id1');
      const r2 = createArtifactRegistry(new DeterministicClock(0), () => 'id2');

      const m1 = r1.store('test', content);
      const m2 = r2.store('test', content);

      expect(m1.hash).toBe(m2.hash);
    });

    it('should produce different hash for different content', () => {
      const m1 = registry.store('test', { a: 1 });
      const m2 = registry.store('test', { a: 2 });

      expect(m1.hash).not.toBe(m2.hash);
    });
  });
});
