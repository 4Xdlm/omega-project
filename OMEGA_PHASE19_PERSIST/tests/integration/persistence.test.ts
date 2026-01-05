/**
 * OMEGA Persistence Layer — Integration Tests
 * Phase 19 — v3.19.0
 * 
 * End-to-end tests covering all invariants
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  NodeFileAdapter,
  createNodeFileAdapter,
  createSyncEngine,
  SyncEngine,
  PersistSource,
  SyncStatus,
  canonicalEncodeWithHash,
  computeHash,
} from '../../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_DIR = '/tmp/omega_persist_integration';
const LOCAL_DIR = join(TEST_DIR, 'local');
const REMOTE_DIR = join(TEST_DIR, 'remote');

describe('Persistence Layer Integration', () => {
  let adapter: NodeFileAdapter;

  beforeEach(() => {
    [TEST_DIR, LOCAL_DIR, REMOTE_DIR].forEach(dir => {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
      mkdirSync(dir, { recursive: true });
    });

    adapter = createNodeFileAdapter({
      basePath: TEST_DIR,
      instanceId: 'integration-test',
    });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complete Workflow', () => {
    it('save -> load -> verify -> delete cycle', async () => {
      const data = {
        canon: {
          facts: [
            { id: 'f1', subject: 'Jean', predicate: 'name', value: 'Jean Dupont' },
            { id: 'f2', subject: 'Jean', predicate: 'age', value: '35' },
          ],
        },
        metadata: { version: '1.0.0', author: 'test' },
      };

      // Save
      const saveResult = await adapter.save('workflow-test', data, PersistSource.CANON_CORE);
      expect(saveResult.success).toBe(true);
      if (!saveResult.success) return;

      const savedHash = saveResult.data.sha256;

      // Load
      const loadResult = await adapter.load('workflow-test');
      expect(loadResult.success).toBe(true);
      if (!loadResult.success) return;

      expect(loadResult.data.envelope.data).toEqual(data);
      expect(loadResult.data.sha256).toBe(savedHash);

      // Verify
      const verifyResult = await adapter.verify('workflow-test', savedHash);
      expect(verifyResult.success).toBe(true);
      if (!verifyResult.success) return;

      expect(verifyResult.data.valid).toBe(true);

      // Delete
      const deleteResult = await adapter.delete('workflow-test');
      expect(deleteResult.success).toBe(true);

      // Verify deleted
      expect(await adapter.exists('workflow-test')).toBe(false);
    });

    it('multiple saves maintain hash chain', async () => {
      // Save v1
      const r1 = await adapter.save('chain', { v: 1 }, PersistSource.CANON_CORE);
      expect(r1.success).toBe(true);
      if (!r1.success) return;

      // Save v2
      const r2 = await adapter.save('chain', { v: 2 }, PersistSource.CANON_CORE);
      expect(r2.success).toBe(true);
      if (!r2.success) return;

      // Load and check previousHash
      const loaded = await adapter.load('chain');
      expect(loaded.success).toBe(true);
      if (!loaded.success) return;

      expect(loaded.data.envelope.metadata.previousHash).toBe(r1.data.sha256);
      expect(loaded.data.envelope.data).toEqual({ v: 2 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ALL INVARIANTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('All Invariants', () => {
    it('INV-PER-01: Atomic write (no partial state)', async () => {
      // If write succeeds, file must be complete
      const result = await adapter.save('atomic', { complete: true }, PersistSource.CANON_CORE);
      expect(result.success).toBe(true);

      const filePath = join(TEST_DIR, 'atomic.omega.json');
      expect(existsSync(filePath)).toBe(true);

      // File must be valid JSON
      const content = readFileSync(filePath, 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('INV-PER-02: Reload == Original', async () => {
      const original = {
        complex: {
          array: [1, 2, { nested: 'value' }],
          unicode: '日本語',
        },
      };

      await adapter.save('reload', original, PersistSource.CANON_CORE);
      const loaded = await adapter.load('reload');

      expect(loaded.success).toBe(true);
      if (loaded.success) {
        expect(loaded.data.envelope.data).toEqual(original);
      }
    });

    it('INV-PER-04: Deterministic JSON', async () => {
      const data = { z: 1, a: 2, m: 3 }; // Unordered keys

      // Save twice
      await adapter.save('det1', data, PersistSource.CANON_CORE);
      
      // Use new adapter instance
      const adapter2 = createNodeFileAdapter({ basePath: TEST_DIR });
      await adapter2.save('det2', data, PersistSource.CANON_CORE);

      // Read raw files
      const file1 = readFileSync(join(TEST_DIR, 'det1.omega.json'), 'utf8');
      const file2 = readFileSync(join(TEST_DIR, 'det2.omega.json'), 'utf8');

      // Both should have sorted keys in data
      const parsed1 = JSON.parse(file1);
      const parsed2 = JSON.parse(file2);

      // Data should be canonical (sorted)
      expect(JSON.stringify(parsed1.data)).toBe('{"a":2,"m":3,"z":1}');
      expect(JSON.stringify(parsed2.data)).toBe('{"a":2,"m":3,"z":1}');
    });

    it('INV-PER-05: Hash integrity post-load', async () => {
      await adapter.save('integrity', { secret: 'data' }, PersistSource.CANON_CORE);

      // Corrupt the file manually
      const filePath = join(TEST_DIR, 'integrity.omega.json');
      const content = JSON.parse(readFileSync(filePath, 'utf8'));
      content.data = { secret: 'CORRUPTED' };
      writeFileSync(filePath, JSON.stringify(content));

      // Load should detect corruption
      const result = await adapter.load('integrity', { verify: true });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sync Integration', () => {
    let localAdapter: NodeFileAdapter;
    let remoteAdapter: NodeFileAdapter;
    let sync: SyncEngine;

    beforeEach(() => {
      localAdapter = createNodeFileAdapter({
        basePath: LOCAL_DIR,
        instanceId: 'local',
      });
      remoteAdapter = createNodeFileAdapter({
        basePath: REMOTE_DIR,
        instanceId: 'remote',
      });
      sync = createSyncEngine(localAdapter, remoteAdapter);
    });

    it('full sync workflow: local -> remote -> verify', async () => {
      // Create locally
      await localAdapter.save('sync-test', { from: 'local' }, PersistSource.CANON_CORE);

      // Push to remote
      const pushResult = await sync.push('sync-test');
      expect(pushResult.success).toBe(true);

      // Verify remote has data
      const remote = await remoteAdapter.load('sync-test');
      expect(remote.success).toBe(true);
      if (remote.success) {
        expect(remote.data.envelope.data).toEqual({ from: 'local' });
      }

      // Compare should show in sync
      const compare = await sync.compare('sync-test');
      expect(compare.success).toBe(true);
      if (compare.success) {
        expect(compare.data.status).toBe(SyncStatus.IN_SYNC);
      }
    });

    it('INV-SYNC-01: Divergence creates explicit conflict', async () => {
      // Create different data on both sides
      await localAdapter.save('diverge', { side: 'local' }, PersistSource.CANON_CORE);
      await remoteAdapter.save('diverge', { side: 'remote' }, PersistSource.CANON_CORE);

      // Pull should detect conflict
      const pullResult = await sync.pull('diverge');
      expect(pullResult.success).toBe(true);
      if (pullResult.success) {
        expect(pullResult.data.merged).toBe(false);
        expect(pullResult.data.conflict).toBeDefined();
      }

      // Conflict should be registered
      expect(sync.hasConflict('diverge')).toBe(true);
    });

    it('conflict resolution updates both sides', async () => {
      await localAdapter.save('resolve', { v: 'local' }, PersistSource.CANON_CORE);
      await remoteAdapter.save('resolve', { v: 'remote' }, PersistSource.CANON_CORE);

      // Pull to detect conflict
      await sync.pull('resolve');

      // Resolve with merged data
      const merged = { v: 'merged', resolvedAt: 'test' };
      await sync.resolveConflict('resolve', 'merge', merged);

      // Both should have merged data
      const local = await localAdapter.load('resolve');
      const remote = await remoteAdapter.load('resolve');

      expect(local.success && local.data.envelope.data).toEqual(merged);
      expect(remote.success && remote.data.envelope.data).toEqual(merged);

      // Conflict should be cleared
      expect(sync.hasConflict('resolve')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STRESS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Stress Tests', () => {
    it('100 save/load roundtrips', async () => {
      for (let i = 0; i < 100; i++) {
        const data = { iteration: i, random: Math.random() };
        const key = `stress-${i}`;

        await adapter.save(key, data, PersistSource.CANON_CORE);
        const loaded = await adapter.load(key);

        expect(loaded.success).toBe(true);
        if (loaded.success) {
          expect(loaded.data.envelope.data).toEqual(data);
        }
      }
    });

    it('handles concurrent saves to different keys', async () => {
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          adapter.save(`concurrent-${i}`, { i }, PersistSource.CANON_CORE)
        );
      }

      const results = await Promise.all(promises);
      expect(results.every(r => r.success)).toBe(true);

      const listResult = await adapter.list('concurrent-');
      expect(listResult.success).toBe(true);
      if (listResult.success) {
        expect(listResult.data.count).toBe(20);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR RECOVERY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Recovery', () => {
    it('recovers from corrupted file gracefully', async () => {
      // Create valid file
      await adapter.save('corrupt-recover', { v: 1 }, PersistSource.CANON_CORE);

      // Corrupt it
      const filePath = join(TEST_DIR, 'corrupt-recover.omega.json');
      writeFileSync(filePath, 'NOT VALID JSON AT ALL {{{');

      // Load should fail gracefully
      const result = await adapter.load('corrupt-recover');
      expect(result.success).toBe(false);

      // But we can still overwrite it
      const saveResult = await adapter.save('corrupt-recover', { v: 2 }, PersistSource.CANON_CORE);
      expect(saveResult.success).toBe(true);

      // And load the new version
      const newLoad = await adapter.load('corrupt-recover');
      expect(newLoad.success).toBe(true);
      if (newLoad.success) {
        expect(newLoad.data.envelope.data).toEqual({ v: 2 });
      }
    });
  });
});
