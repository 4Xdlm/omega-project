/**
 * OMEGA Integration Layer — Memory Service Tests
 * Phase 20 — v3.20.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import {
  MemoryService,
  createMemoryService,
  SyncStatus,
} from '../../src/memory-service.js';
import { createCanonStore } from '../../src/canon-store.js';

const TEST_DIR = '/tmp/omega_phase20_memory_test';

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    service = createMemoryService({ basePath: TEST_DIR });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CANON ACCESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getCanon()', () => {
    it('returns the canon store', () => {
      const canon = service.getCanon();
      expect(canon).toBeDefined();
      expect(canon.size).toBe(0);
    });

    it('uses injected canon if provided', () => {
      const injectedCanon = createCanonStore();
      injectedCanon.addFact('A', 'p', 'v', 's');

      const service = createMemoryService({ basePath: TEST_DIR }, injectedCanon);
      expect(service.getCanon().size).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE SNAPSHOT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('saveSnapshot()', () => {
    it('saves canon state to file', async () => {
      const canon = service.getCanon();
      canon.addFact('Jean', 'name', 'Jean Dupont', 'user');
      canon.addFact('Jean', 'age', '35', 'user');

      const result = await service.saveSnapshot('state-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.key).toBe('state-1');
        expect(result.data.factCount).toBe(2);
        expect(result.data.rootHash).toHaveLength(64);
        expect(result.data.bytesWritten).toBeGreaterThan(0);
      }
    });

    it('creates file on disk', async () => {
      await service.saveSnapshot('disk-check');

      const filePath = `${TEST_DIR}/disk-check.omega.json`;
      expect(existsSync(filePath)).toBe(true);
    });

    it('rejects invalid key', async () => {
      const result = await service.saveSnapshot('invalid/key');
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD SNAPSHOT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('loadSnapshot()', () => {
    it('loads and restores canon state', async () => {
      const canon = service.getCanon();
      canon.addFact('Jean', 'name', 'Jean Dupont', 'user');
      canon.addFact('Jean', 'age', '35', 'user');

      await service.saveSnapshot('load-test');

      // Clear canon
      canon.clear();
      expect(canon.size).toBe(0);

      // Load
      const result = await service.loadSnapshot('load-test');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.factCount).toBe(2);
        expect(result.data.verified).toBe(true);
      }

      // Canon restored
      expect(canon.size).toBe(2);
    });

    it('returns error for missing key', async () => {
      const result = await service.loadSnapshot('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST SNAPSHOTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('listSnapshots()', () => {
    it('lists all snapshots', async () => {
      await service.saveSnapshot('snap-a');
      await service.saveSnapshot('snap-b');
      await service.saveSnapshot('snap-c');

      const result = await service.listSnapshots();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toContain('snap-a');
        expect(result.data).toContain('snap-b');
        expect(result.data).toContain('snap-c');
      }
    });

    it('filters by prefix', async () => {
      await service.saveSnapshot('game_save1');
      await service.saveSnapshot('game_save2');
      await service.saveSnapshot('config_main');

      const result = await service.listSnapshots('game_');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC
  // ═══════════════════════════════════════════════════════════════════════════

  describe('sync()', () => {
    it('returns LOCAL_ONLY when no persisted state', async () => {
      service.getCanon().addFact('A', 'p', 'v', 's');

      const result = await service.sync('new-state');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(SyncStatus.LOCAL_ONLY);
      }
    });

    it('returns IN_SYNC when canon matches persisted', async () => {
      const canon = service.getCanon();
      canon.addFact('A', 'p', 'v', 's');

      await service.saveSnapshot('synced');

      const result = await service.sync('synced');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(SyncStatus.IN_SYNC);
      }
    });

    it('returns CONFLICT when canon differs from persisted', async () => {
      const canon = service.getCanon();
      canon.addFact('A', 'p', 'v', 's');

      await service.saveSnapshot('conflict-test');

      // Modify canon
      canon.addFact('B', 'p', 'v', 's');

      const result = await service.sync('conflict-test');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(SyncStatus.CONFLICT);
        expect(result.data.conflict).toBeDefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-INT-03: CONFLICT NEVER SILENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-INT-03: Conflict Never Silent', () => {
    it('detects conflict with remote snapshot', async () => {
      const canon = service.getCanon();
      canon.addFact('local', 'type', 'data', 's');

      // Create a "remote" snapshot with different data
      const remoteCanon = createCanonStore();
      remoteCanon.addFact('remote', 'type', 'data', 's');
      const remoteSnapshot = remoteCanon.snapshot();

      const result = await service.sync('test-key', remoteSnapshot);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(SyncStatus.CONFLICT);
        expect(result.data.merged).toBe(false);
        expect(result.data.conflict).toBeDefined();
        expect(result.data.conflict?.localSnapshot).toBeDefined();
        expect(result.data.conflict?.remoteSnapshot).toBeDefined();
      }
    });

    it('stores conflict for later resolution', async () => {
      const canon = service.getCanon();
      canon.addFact('local', 'p', 'v', 's');

      const remoteCanon = createCanonStore();
      remoteCanon.addFact('remote', 'p', 'v', 's');
      const remoteSnapshot = remoteCanon.snapshot();

      await service.sync('conflict-store', remoteSnapshot);

      expect(service.hasConflict('conflict-store')).toBe(true);
      expect(service.getConflict('conflict-store')).toBeDefined();
    });

    it('returns IN_SYNC when remote matches local', async () => {
      const canon = service.getCanon();
      canon.addFact('same', 'p', 'v', 's');

      // Create identical remote
      const remoteCanon = createCanonStore();
      remoteCanon.addFact('same', 'p', 'v', 's');
      const remoteSnapshot = remoteCanon.snapshot();

      const result = await service.sync('same-key', remoteSnapshot);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(SyncStatus.IN_SYNC);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFLICT RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('resolveConflict()', () => {
    beforeEach(async () => {
      const canon = service.getCanon();
      canon.addFact('local', 'p', 'v', 's');

      const remoteCanon = createCanonStore();
      remoteCanon.addFact('remote', 'p', 'v', 's');

      await service.sync('resolve-test', remoteCanon.snapshot());
    });

    it('resolves with local winner', async () => {
      const result = await service.resolveConflict('resolve-test', 'local');

      expect(result.success).toBe(true);
      expect(service.hasConflict('resolve-test')).toBe(false);

      // Canon should have local data
      const facts = service.getCanon().getAllFacts();
      expect(facts.some(f => f.subject === 'local')).toBe(true);
    });

    it('resolves with remote winner', async () => {
      const result = await service.resolveConflict('resolve-test', 'remote');

      expect(result.success).toBe(true);
      expect(service.hasConflict('resolve-test')).toBe(false);

      // Canon should have remote data
      const facts = service.getCanon().getAllFacts();
      expect(facts.some(f => f.subject === 'remote')).toBe(true);
    });

    it('fails for unknown conflict', async () => {
      const result = await service.resolveConflict('unknown', 'local');
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('exists()', () => {
    it('returns true for saved snapshot', async () => {
      await service.saveSnapshot('exists-check');
      expect(await service.exists('exists-check')).toBe(true);
    });

    it('returns false for missing snapshot', async () => {
      expect(await service.exists('missing')).toBe(false);
    });
  });

  describe('delete()', () => {
    it('deletes snapshot', async () => {
      await service.saveSnapshot('to-delete');
      expect(await service.exists('to-delete')).toBe(true);

      const result = await service.delete('to-delete');

      expect(result.success).toBe(true);
      expect(await service.exists('to-delete')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createMemoryService()', () => {
    it('creates service', () => {
      const service = createMemoryService({ basePath: TEST_DIR });
      expect(service).toBeInstanceOf(MemoryService);
    });
  });
});
