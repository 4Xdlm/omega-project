/**
 * OMEGA Integration Layer — Persistence Adapter Tests
 * Phase 20 — v3.20.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { PersistenceAdapter, createPersistenceAdapter } from '../../src/persistence-adapter.js';

const TEST_DIR = '/tmp/omega_phase20_persist_test';

describe('PersistenceAdapter', () => {
  let adapter: PersistenceAdapter;

  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    adapter = createPersistenceAdapter({ basePath: TEST_DIR });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('save()', () => {
    it('saves data and returns success', async () => {
      const data = { test: 'value', number: 42 };
      const result = await adapter.save('test-key', data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe('test-key');
        expect(result.data.hash).toHaveLength(64);
        expect(result.data.bytesWritten).toBeGreaterThan(0);
      }
    });

    it('creates file on disk', async () => {
      await adapter.save('disk-test', { value: 1 });

      const filePath = `${TEST_DIR}/disk-test.omega.json`;
      expect(existsSync(filePath)).toBe(true);
    });

    it('rejects invalid keys', async () => {
      const result = await adapter.save('invalid/key', {});
      expect(result.success).toBe(false);
    });

    it('rejects empty key', async () => {
      const result = await adapter.save('', {});
      expect(result.success).toBe(false);
    });

    it('overwrites existing key', async () => {
      await adapter.save('overwrite', { v: 1 });
      const result = await adapter.save('overwrite', { v: 2 });

      expect(result.success).toBe(true);

      const loaded = await adapter.load('overwrite');
      expect(loaded.success && loaded.data.data).toEqual({ v: 2 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD
  // ═══════════════════════════════════════════════════════════════════════════

  describe('load()', () => {
    it('loads saved data', async () => {
      const data = { complex: { nested: [1, 2, 3] } };
      await adapter.save('load-test', data);

      const result = await adapter.load('load-test');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toEqual(data);
        expect(result.data.verified).toBe(true);
      }
    });

    it('returns error for missing key', async () => {
      const result = await adapter.load('nonexistent');
      expect(result.success).toBe(false);
    });

    it('verifies data integrity', async () => {
      await adapter.save('integrity', { value: 'test' });

      const result = await adapter.load('integrity');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.verified).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-INT-02: RELOAD == ORIGINAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-INT-02: Reload == Original', () => {
    it('roundtrip preserves data exactly', async () => {
      const original = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: { a: { b: 'deep' } },
      };

      await adapter.save('roundtrip', original);
      const result = await adapter.load('roundtrip');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toEqual(original);
      }
    });

    it('100 roundtrips produce identical data', async () => {
      const data = { stability: 'test', iteration: 0 };

      for (let i = 0; i < 100; i++) {
        await adapter.save('stability', { ...data, iteration: i });
        const result = await adapter.load('stability');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.data).toEqual({ ...data, iteration: i });
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════════════════════════════

  describe('list()', () => {
    it('lists all keys', async () => {
      await adapter.save('key-a', {});
      await adapter.save('key-b', {});
      await adapter.save('key-c', {});

      const result = await adapter.list();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toContain('key-a');
        expect(result.data).toContain('key-b');
        expect(result.data).toContain('key-c');
        expect(result.data).toHaveLength(3);
      }
    });

    it('filters by prefix', async () => {
      await adapter.save('user_1', {});
      await adapter.save('user_2', {});
      await adapter.save('config_main', {});

      const result = await adapter.list('user_');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data).toContain('user_1');
        expect(result.data).toContain('user_2');
      }
    });

    it('returns empty array for no matches', async () => {
      await adapter.save('something', {});

      const result = await adapter.list('nonexistent_');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('exists()', () => {
    it('returns true for existing key', async () => {
      await adapter.save('exists-test', {});
      expect(await adapter.exists('exists-test')).toBe(true);
    });

    it('returns false for missing key', async () => {
      expect(await adapter.exists('missing')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('delete()', () => {
    it('deletes existing key', async () => {
      await adapter.save('to-delete', {});
      expect(await adapter.exists('to-delete')).toBe(true);

      const result = await adapter.delete('to-delete');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
      expect(await adapter.exists('to-delete')).toBe(false);
    });

    it('returns false for missing key', async () => {
      const result = await adapter.delete('nonexistent');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createPersistenceAdapter()', () => {
    it('creates adapter', () => {
      const adapter = createPersistenceAdapter({ basePath: TEST_DIR });
      expect(adapter).toBeInstanceOf(PersistenceAdapter);
    });
  });
});
