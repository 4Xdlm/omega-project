/**
 * OMEGA Persistence Layer — Sync Engine Tests
 * Phase 19 — v3.19.0
 * 
 * INV-SYNC-01: Divergence => conflit explicite (pas de merge silencieux)
 * INV-SYNC-02: Merge déterministe si non conflict
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';

import { SyncEngine, createSyncEngine } from '../../src/sync/sync-engine.js';
import { NodeFileAdapter, createNodeFileAdapter } from '../../src/adapters/node-file-adapter.js';
import { PersistSource, SyncStatus, PersistErrorCode } from '../../src/core/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const LOCAL_DIR = '/tmp/omega_sync_local';
const REMOTE_DIR = '/tmp/omega_sync_remote';

describe('SyncEngine', () => {
  let localAdapter: NodeFileAdapter;
  let remoteAdapter: NodeFileAdapter;
  let syncEngine: SyncEngine;

  beforeEach(() => {
    // Clean up
    [LOCAL_DIR, REMOTE_DIR].forEach(dir => {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
      mkdirSync(dir, { recursive: true });
    });

    localAdapter = createNodeFileAdapter({
      basePath: LOCAL_DIR,
      instanceId: 'local',
    });

    remoteAdapter = createNodeFileAdapter({
      basePath: REMOTE_DIR,
      instanceId: 'remote',
    });

    syncEngine = createSyncEngine(localAdapter, remoteAdapter);
  });

  afterEach(() => {
    [LOCAL_DIR, REMOTE_DIR].forEach(dir => {
      if (existsSync(dir)) rmSync(dir, { recursive: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPARE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('compare()', () => {
    it('returns IN_SYNC when neither exists', async () => {
      const result = await syncEngine.compare('nonexistent');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(SyncStatus.IN_SYNC);
        expect(result.data.localSequence).toBe(0);
        expect(result.data.remoteSequence).toBe(0);
      }
    });

    it('returns LOCAL_AHEAD when only local exists', async () => {
      await localAdapter.save('local-only', { v: 1 }, PersistSource.CANON_CORE);

      const result = await syncEngine.compare('local-only');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(SyncStatus.LOCAL_AHEAD);
        expect(result.data.localSequence).toBe(1);
        expect(result.data.remoteSequence).toBe(0);
      }
    });

    it('returns REMOTE_AHEAD when only remote exists', async () => {
      await remoteAdapter.save('remote-only', { v: 1 }, PersistSource.CANON_CORE);

      const result = await syncEngine.compare('remote-only');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(SyncStatus.REMOTE_AHEAD);
        expect(result.data.localSequence).toBe(0);
        expect(result.data.remoteSequence).toBe(1);
      }
    });

    it('returns IN_SYNC when both have same content', async () => {
      await localAdapter.save('same', { v: 1 }, PersistSource.CANON_CORE);
      await remoteAdapter.save('same', { v: 1 }, PersistSource.CANON_CORE);

      const result = await syncEngine.compare('same');
      expect(result.success).toBe(true);
      if (result.success) {
        // Same data, same hash = IN_SYNC
        expect(result.data.status).toBe(SyncStatus.IN_SYNC);
      }
    });

    it('returns DIVERGED when both have different content', async () => {
      await localAdapter.save('diverged', { local: true }, PersistSource.CANON_CORE);
      await remoteAdapter.save('diverged', { remote: true }, PersistSource.CANON_CORE);

      const result = await syncEngine.compare('diverged');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(SyncStatus.DIVERGED);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('pull()', () => {
    it('does nothing when in sync', async () => {
      const result = await syncEngine.pull('nonexistent');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.merged).toBe(true);
      }
    });

    it('pulls remote data when remote ahead', async () => {
      await remoteAdapter.save('pull-me', { from: 'remote' }, PersistSource.CANON_CORE);

      const result = await syncEngine.pull('pull-me');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.merged).toBe(true);
        expect(result.data.result?.data).toEqual({ from: 'remote' });
      }

      // Verify local now has the data
      const local = await localAdapter.load('pull-me');
      expect(local.success).toBe(true);
      if (local.success) {
        expect(local.data.envelope.data).toEqual({ from: 'remote' });
      }
    });

    it('does nothing when local ahead', async () => {
      await localAdapter.save('local-ahead', { v: 1 }, PersistSource.CANON_CORE);

      const result = await syncEngine.pull('local-ahead');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.merged).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-SYNC-01: DIVERGENCE = CONFLICT EXPLICIT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-SYNC-01: Divergence = Conflict Explicit', () => {
    it('detects divergence and creates conflict', async () => {
      await localAdapter.save('conflict', { local: 'data' }, PersistSource.CANON_CORE);
      await remoteAdapter.save('conflict', { remote: 'data' }, PersistSource.CANON_CORE);

      const result = await syncEngine.pull('conflict');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.merged).toBe(false);
        expect(result.data.conflict).toBeDefined();
        expect(result.data.conflict?.key).toBe('conflict');
        expect(result.data.conflict?.localEnvelope.data).toEqual({ local: 'data' });
        expect(result.data.conflict?.remoteEnvelope.data).toEqual({ remote: 'data' });
      }
    });

    it('stores conflict for later resolution', async () => {
      await localAdapter.save('stored-conflict', { a: 1 }, PersistSource.CANON_CORE);
      await remoteAdapter.save('stored-conflict', { b: 2 }, PersistSource.CANON_CORE);

      await syncEngine.pull('stored-conflict');

      expect(syncEngine.hasConflict('stored-conflict')).toBe(true);
      
      const conflict = syncEngine.getConflict('stored-conflict');
      expect(conflict).toBeDefined();
      expect(conflict?.key).toBe('stored-conflict');
    });

    it('never silently merges divergent data', async () => {
      await localAdapter.save('no-silent', { x: 1 }, PersistSource.CANON_CORE);
      await remoteAdapter.save('no-silent', { x: 2 }, PersistSource.CANON_CORE);

      const result = await syncEngine.pull('no-silent');

      // Must NOT be merged silently
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.merged).toBe(false);
        expect(result.data.conflict).toBeDefined();
      }

      // Local data must remain unchanged
      const local = await localAdapter.load('no-silent');
      expect(local.success).toBe(true);
      if (local.success) {
        expect(local.data.envelope.data).toEqual({ x: 1 });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PUSH TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('push()', () => {
    it('pushes local to remote when local ahead', async () => {
      await localAdapter.save('push-me', { local: 'data' }, PersistSource.CANON_CORE);

      const result = await syncEngine.push('push-me');
      expect(result.success).toBe(true);

      // Verify remote now has the data
      const remote = await remoteAdapter.load('push-me');
      expect(remote.success).toBe(true);
      if (remote.success) {
        expect(remote.data.envelope.data).toEqual({ local: 'data' });
      }
    });

    it('rejects push when diverged', async () => {
      await localAdapter.save('no-push', { local: 1 }, PersistSource.CANON_CORE);
      await remoteAdapter.save('no-push', { remote: 2 }, PersistSource.CANON_CORE);

      const result = await syncEngine.push('no-push');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.CONFLICT_DETECTED);
      }
    });

    it('rejects push when remote ahead', async () => {
      await remoteAdapter.save('remote-ahead', { v: 1 }, PersistSource.CANON_CORE);

      const result = await syncEngine.push('remote-ahead');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.DIVERGENCE);
      }
    });

    it('returns success when already in sync', async () => {
      // Nothing to push
      const result = await syncEngine.push('nonexistent');
      // This should fail because there's nothing local
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLVE CONFLICT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('resolveConflict()', () => {
    beforeEach(async () => {
      // Setup conflict
      await localAdapter.save('resolve-test', { winner: 'local' }, PersistSource.CANON_CORE);
      await remoteAdapter.save('resolve-test', { winner: 'remote' }, PersistSource.CANON_CORE);
      await syncEngine.pull('resolve-test');
    });

    it('resolves with local winner', async () => {
      const result = await syncEngine.resolveConflict('resolve-test', 'local');
      expect(result.success).toBe(true);

      // Both should now have local data
      const local = await localAdapter.load('resolve-test');
      const remote = await remoteAdapter.load('resolve-test');

      expect(local.success && local.data.envelope.data).toEqual({ winner: 'local' });
      expect(remote.success && remote.data.envelope.data).toEqual({ winner: 'local' });

      // Conflict should be cleared
      expect(syncEngine.hasConflict('resolve-test')).toBe(false);
    });

    it('resolves with remote winner', async () => {
      const result = await syncEngine.resolveConflict('resolve-test', 'remote');
      expect(result.success).toBe(true);

      const local = await localAdapter.load('resolve-test');
      expect(local.success && local.data.envelope.data).toEqual({ winner: 'remote' });
    });

    it('resolves with merged data', async () => {
      const mergedData = { winner: 'both', merged: true };
      const result = await syncEngine.resolveConflict('resolve-test', 'merge', mergedData);
      expect(result.success).toBe(true);

      const local = await localAdapter.load('resolve-test');
      expect(local.success && local.data.envelope.data).toEqual(mergedData);
    });

    it('fails without merged data for merge winner', async () => {
      const result = await syncEngine.resolveConflict('resolve-test', 'merge');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.INVALID_DATA);
      }
    });

    it('fails for unknown conflict', async () => {
      const result = await syncEngine.resolveConflict('unknown-conflict', 'local');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(PersistErrorCode.NOT_FOUND);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Utility Methods', () => {
    it('getConflicts returns all conflicts', async () => {
      // Create multiple conflicts
      await localAdapter.save('c1', { l: 1 }, PersistSource.CANON_CORE);
      await remoteAdapter.save('c1', { r: 1 }, PersistSource.CANON_CORE);
      await localAdapter.save('c2', { l: 2 }, PersistSource.CANON_CORE);
      await remoteAdapter.save('c2', { r: 2 }, PersistSource.CANON_CORE);

      await syncEngine.pull('c1');
      await syncEngine.pull('c2');

      const conflicts = syncEngine.getConflicts();
      expect(conflicts).toHaveLength(2);
    });

    it('clearConflicts removes all conflicts', async () => {
      await localAdapter.save('clear', { l: 1 }, PersistSource.CANON_CORE);
      await remoteAdapter.save('clear', { r: 1 }, PersistSource.CANON_CORE);
      await syncEngine.pull('clear');

      expect(syncEngine.hasConflict('clear')).toBe(true);

      syncEngine.clearConflicts();

      expect(syncEngine.hasConflict('clear')).toBe(false);
      expect(syncEngine.getConflicts()).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Factory', () => {
    it('createSyncEngine returns SyncEngine', () => {
      const engine = createSyncEngine(localAdapter, remoteAdapter);
      expect(engine).toBeInstanceOf(SyncEngine);
    });
  });
});
