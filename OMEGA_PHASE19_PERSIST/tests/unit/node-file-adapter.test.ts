/**
 * OMEGA Persistence Layer — Node File Adapter Tests
 * Phase 19 — v3.19.0
 * 
 * INV-PER-01: Write atomique (jamais état partiel)
 * INV-PER-02: Reload == original (sha/bytes identiques)
 * INV-PER-03: Crash mid-write => ancien OU nouveau, jamais mix
 * INV-PER-05: Hash intégrité post-load
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import {
  NodeFileAdapter,
  createNodeFileAdapter,
} from '../../src/adapters/node-file-adapter.js';

import {
  PersistSource,
  PersistErrorCode,
  PERSIST_MAGIC,
} from '../../src/core/types.js';

import { canonicalEncodeWithHash } from '../../src/core/canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = '/tmp/omega_persist_test';

describe('NodeFileAdapter', () => {
  let adapter: NodeFileAdapter;

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    adapter = createNodeFileAdapter({
      basePath: TEST_DIR,
      instanceId: 'test-instance',
    });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('save()', () => {
    it('saves data and returns success', async () => {
      const data = { test: 'data', value: 42 };
      const result = await adapter.save('test-key', data, PersistSource.CANON_CORE);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe('test-key');
        expect(result.data.bytesWritten).toBeGreaterThan(0);
        expect(result.data.sha256).toHaveLength(64);
        expect(result.data.sequence).toBe(1);
      }
    });

    it('creates file on disk', async () => {
      await adapter.save('disk-test', { data: 'test' }, PersistSource.CANON_CORE);
      
      const filePath = join(TEST_DIR, 'disk-test.omega.json');
      expect(existsSync(filePath)).toBe(true);
    });

    it('increments sequence on each save', async () => {
      const r1 = await adapter.save('seq-1', {}, PersistSource.CANON_CORE);
      const r2 = await adapter.save('seq-2', {}, PersistSource.CANON_CORE);
      const r3 = await adapter.save('seq-3', {}, PersistSource.CANON_CORE);

      expect(r1.success && r1.data.sequence).toBe(1);
      expect(r2.success && r2.data.sequence).toBe(2);
      expect(r3.success && r3.data.sequence).toBe(3);
    });

    it('rejects invalid keys', async () => {
      const result = await adapter.save('invalid/key', {}, PersistSource.CANON_CORE);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.INVALID_KEY);
      }
    });

    it('rejects empty key', async () => {
      const result = await adapter.save('', {}, PersistSource.CANON_CORE);
      expect(result.success).toBe(false);
    });

    it('overwrites by default', async () => {
      await adapter.save('overwrite-key', { v: 1 }, PersistSource.CANON_CORE);
      const r2 = await adapter.save('overwrite-key', { v: 2 }, PersistSource.CANON_CORE);

      expect(r2.success).toBe(true);

      const loaded = await adapter.load('overwrite-key');
      expect(loaded.success && loaded.data.envelope.data).toEqual({ v: 2 });
    });

    it('respects overwrite: false option', async () => {
      await adapter.save('no-overwrite', { v: 1 }, PersistSource.CANON_CORE);
      const result = await adapter.save('no-overwrite', { v: 2 }, PersistSource.CANON_CORE, {
        overwrite: false,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.WRITE_FAILED);
      }
    });

    it('stores previousHash from existing file', async () => {
      const r1 = await adapter.save('chain-test', { v: 1 }, PersistSource.CANON_CORE);
      expect(r1.success).toBe(true);

      await adapter.save('chain-test', { v: 2 }, PersistSource.CANON_CORE);

      const loaded = await adapter.load('chain-test');
      expect(loaded.success).toBe(true);
      if (loaded.success) {
        expect(loaded.data.envelope.metadata.previousHash).toBe(
          r1.success ? r1.data.sha256 : null
        );
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('load()', () => {
    it('loads saved data correctly', async () => {
      const data = { complex: { nested: [1, 2, 3] } };
      await adapter.save('load-test', data, PersistSource.INTENT_MACHINE);

      const result = await adapter.load('load-test');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.envelope.data).toEqual(data);
        expect(result.data.envelope.magic).toBe(PERSIST_MAGIC);
        expect(result.data.verified).toBe(true);
      }
    });

    it('returns NOT_FOUND for missing key', async () => {
      const result = await adapter.load('nonexistent');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.NOT_FOUND);
      }
    });

    it('validates envelope magic', async () => {
      // Create a corrupted file
      const filePath = join(TEST_DIR, 'bad-magic.omega.json');
      writeFileSync(filePath, JSON.stringify({ magic: 'WRONG', data: {} }));

      const result = await adapter.load('bad-magic');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.MAGIC_MISMATCH);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-PER-02: RELOAD == ORIGINAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-PER-02: Reload == Original', () => {
    it('loaded data equals saved data', async () => {
      const data = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: { a: { b: { c: 'deep' } } },
      };

      await adapter.save('roundtrip', data, PersistSource.CONTEXT_ENGINE);
      const loaded = await adapter.load('roundtrip');

      expect(loaded.success).toBe(true);
      if (loaded.success) {
        expect(loaded.data.envelope.data).toEqual(data);
      }
    });

    it('hash is identical on roundtrip', async () => {
      const data = { test: 'hash-roundtrip' };
      const saveResult = await adapter.save('hash-rt', data, PersistSource.CANON_CORE);
      const loadResult = await adapter.load('hash-rt');

      expect(saveResult.success).toBe(true);
      expect(loadResult.success).toBe(true);

      if (saveResult.success && loadResult.success) {
        expect(loadResult.data.sha256).toBe(saveResult.data.sha256);
      }
    });

    it('100 roundtrips produce identical hashes', async () => {
      const data = { stability: 'test', value: 123 };
      const saveResult = await adapter.save('stability', data, PersistSource.CANON_CORE);

      expect(saveResult.success).toBe(true);
      if (!saveResult.success) return;

      const originalHash = saveResult.data.sha256;

      for (let i = 0; i < 100; i++) {
        const loaded = await adapter.load('stability');
        expect(loaded.success).toBe(true);
        if (loaded.success) {
          expect(loaded.data.sha256).toBe(originalHash);
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('verify()', () => {
    it('verifies valid file', async () => {
      const saveResult = await adapter.save('verify-ok', { data: 'test' }, PersistSource.CANON_CORE);
      expect(saveResult.success).toBe(true);

      const verifyResult = await adapter.verify('verify-ok');
      expect(verifyResult.success).toBe(true);
      if (verifyResult.success) {
        expect(verifyResult.data.valid).toBe(true);
        expect(verifyResult.data.errors).toHaveLength(0);
      }
    });

    it('verifies with expected hash', async () => {
      const saveResult = await adapter.save('verify-hash', {}, PersistSource.CANON_CORE);
      expect(saveResult.success).toBe(true);
      if (!saveResult.success) return;

      const verifyResult = await adapter.verify('verify-hash', saveResult.data.sha256);
      expect(verifyResult.success).toBe(true);
      if (verifyResult.success) {
        expect(verifyResult.data.valid).toBe(true);
      }
    });

    it('fails verification with wrong hash', async () => {
      await adapter.save('verify-wrong', {}, PersistSource.CANON_CORE);

      const wrongHash = 'a'.repeat(64);
      const verifyResult = await adapter.verify('verify-wrong', wrongHash);

      expect(verifyResult.success).toBe(true);
      if (verifyResult.success) {
        expect(verifyResult.data.valid).toBe(false);
        expect(verifyResult.data.errors.length).toBeGreaterThan(0);
      }
    });

    it('returns invalid for corrupted file', async () => {
      const filePath = join(TEST_DIR, 'corrupted.omega.json');
      writeFileSync(filePath, 'not valid json{{{');

      const result = await adapter.verify('corrupted');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valid).toBe(false);
      }
    });

    it('returns invalid for missing file', async () => {
      const result = await adapter.verify('missing');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valid).toBe(false);
        expect(result.data.errors).toContain('File not found');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('list()', () => {
    it('lists all keys', async () => {
      await adapter.save('key-a', {}, PersistSource.CANON_CORE);
      await adapter.save('key-b', {}, PersistSource.CANON_CORE);
      await adapter.save('key-c', {}, PersistSource.CANON_CORE);

      const result = await adapter.list();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keys).toContain('key-a');
        expect(result.data.keys).toContain('key-b');
        expect(result.data.keys).toContain('key-c');
        expect(result.data.count).toBe(3);
      }
    });

    it('filters by prefix', async () => {
      // Note: Using underscore instead of colon for Windows compatibility
      await adapter.save('user_1', {}, PersistSource.CANON_CORE);
      await adapter.save('user_2', {}, PersistSource.CANON_CORE);
      await adapter.save('config_main', {}, PersistSource.CANON_CORE);

      const result = await adapter.list('user_');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keys).toHaveLength(2);
        expect(result.data.keys).toContain('user_1');
        expect(result.data.keys).toContain('user_2');
        expect(result.data.prefix).toBe('user_');
      }
    });

    it('returns empty array for no matches', async () => {
      await adapter.save('something', {}, PersistSource.CANON_CORE);

      const result = await adapter.list('nonexistent:');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keys).toHaveLength(0);
        expect(result.data.count).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('delete()', () => {
    it('deletes existing key', async () => {
      await adapter.save('to-delete', {}, PersistSource.CANON_CORE);
      expect(await adapter.exists('to-delete')).toBe(true);

      const result = await adapter.delete('to-delete');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deleted).toBe(true);
      }

      expect(await adapter.exists('to-delete')).toBe(false);
    });

    it('returns deleted: false for missing key', async () => {
      const result = await adapter.delete('nonexistent');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deleted).toBe(false);
      }
    });

    it('performs soft delete (renamed file exists)', async () => {
      await adapter.save('soft-delete', {}, PersistSource.CANON_CORE);
      await adapter.delete('soft-delete');

      // Original file gone
      expect(existsSync(join(TEST_DIR, 'soft-delete.omega.json'))).toBe(false);

      // But a deleted file should exist
      const files = require('fs').readdirSync(TEST_DIR);
      const deletedFiles = files.filter((f: string) => f.startsWith('.deleted_'));
      expect(deletedFiles.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('exists()', () => {
    it('returns true for existing key', async () => {
      await adapter.save('exists-test', {}, PersistSource.CANON_CORE);
      expect(await adapter.exists('exists-test')).toBe(true);
    });

    it('returns false for missing key', async () => {
      expect(await adapter.exists('missing')).toBe(false);
    });

    it('returns false for invalid key', async () => {
      expect(await adapter.exists('')).toBe(false);
      expect(await adapter.exists('invalid/key')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-PER-05: HASH INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-PER-05: Hash Integrity', () => {
    it('detects corrupted data hash', async () => {
      await adapter.save('integrity', { value: 'original' }, PersistSource.CANON_CORE);

      // Manually corrupt the file
      const filePath = join(TEST_DIR, 'integrity.omega.json');
      const content = JSON.parse(readFileSync(filePath, 'utf8'));
      content.data = { value: 'corrupted' }; // Change data without updating hash
      writeFileSync(filePath, JSON.stringify(content));

      const result = await adapter.load('integrity', { verify: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.HASH_MISMATCH);
      }
    });

    it('passes verification on untampered file', async () => {
      await adapter.save('untampered', { sensitive: 'data' }, PersistSource.CANON_CORE);

      const result = await adapter.load('untampered', { verify: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.verified).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Factory', () => {
    it('createNodeFileAdapter returns adapter', () => {
      const a = createNodeFileAdapter({ basePath: TEST_DIR });
      expect(a).toBeInstanceOf(NodeFileAdapter);
      expect(a.name).toBe('NodeFileAdapter');
    });

    it('uses default config values', () => {
      const a = createNodeFileAdapter();
      expect(a.config.lockTimeout).toBe(5000);
      expect(a.config.maxFileSize).toBe(50 * 1024 * 1024);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LARGE DATA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Large Data', () => {
    it('handles 1MB of data', async () => {
      // Create ~1MB string
      const largeString = 'x'.repeat(1024 * 1024);
      const data = { large: largeString };

      const saveResult = await adapter.save('large-data', data, PersistSource.CANON_CORE);
      expect(saveResult.success).toBe(true);

      const loadResult = await adapter.load('large-data');
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.envelope.data).toEqual(data);
      }
    });

    it('rejects data exceeding max size', async () => {
      const smallAdapter = createNodeFileAdapter({
        basePath: TEST_DIR,
        maxFileSize: 1000, // 1KB limit
      });

      const largeData = { data: 'x'.repeat(2000) };
      const result = await smallAdapter.save('too-large', largeData, PersistSource.CANON_CORE);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.STORAGE_FULL);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Metadata', () => {
    it('stores correct source', async () => {
      await adapter.save('source-test', {}, PersistSource.CONFLICT_RESOLVER);

      const result = await adapter.load('source-test');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.envelope.metadata.source).toBe(PersistSource.CONFLICT_RESOLVER);
      }
    });

    it('stores tags', async () => {
      await adapter.save('tags-test', {}, PersistSource.CANON_CORE, {
        tags: ['important', 'v1'],
      });

      const result = await adapter.load('tags-test');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.envelope.metadata.tags).toEqual(['important', 'v1']);
      }
    });

    it('stores instance ID', async () => {
      await adapter.save('instance-test', {}, PersistSource.CANON_CORE);

      const result = await adapter.load('instance-test');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.envelope.metadata.instanceId).toBe('test-instance');
      }
    });
  });
});
