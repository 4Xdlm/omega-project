/**
 * OMEGA Integration Layer — End-to-End Tests
 * Phase 20 — v3.20.0
 * 
 * Critical tests proving:
 * - INV-INT-01: Atomic writes
 * - INV-INT-02: Reload == original
 * - INV-INT-03: Conflict never silent
 * - INV-INT-04: Roundtrip determinism
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  createMemoryService,
  createCanonStore,
  SyncStatus,
  type MemoryService,
} from '../../src/index.js';

const TEST_DIR = '/tmp/omega_phase20_e2e_test';

describe('End-to-End Integration', () => {
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
  // COMPLETE WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complete Workflow', () => {
    it('create facts → save → wipe → load → verify equality', async () => {
      const canon = service.getCanon();

      // 1. Create facts
      canon.addFact('Jean', 'name', 'Jean Dupont', 'user-input');
      canon.addFact('Jean', 'age', '35', 'user-input');
      canon.addFact('Jean', 'city', 'Paris', 'inference');
      canon.addFact('Marie', 'name', 'Marie Martin', 'user-input');

      const originalHash = canon.getRootHash();
      const originalCount = canon.size;

      // 2. Save
      const saveResult = await service.saveSnapshot('workflow-test');
      expect(saveResult.success).toBe(true);

      // 3. Wipe
      canon.clear();
      expect(canon.size).toBe(0);
      expect(canon.getRootHash()).not.toBe(originalHash);

      // 4. Load
      const loadResult = await service.loadSnapshot('workflow-test');
      expect(loadResult.success).toBe(true);

      // 5. Verify equality
      expect(canon.size).toBe(originalCount);
      expect(canon.getRootHash()).toBe(originalHash);

      // Verify specific facts
      const jeanFacts = canon.getFactsBySubject('Jean');
      expect(jeanFacts).toHaveLength(3);

      const marieFacts = canon.getFactsBySubject('Marie');
      expect(marieFacts).toHaveLength(1);
    });

    it('multiple save/load cycles maintain integrity', async () => {
      const canon = service.getCanon();

      // Cycle 1
      canon.addFact('A', 'p', 'v1', 's');
      await service.saveSnapshot('cycle-1');
      const hash1 = canon.getRootHash();

      // Cycle 2
      canon.addFact('B', 'p', 'v2', 's');
      await service.saveSnapshot('cycle-2');
      const hash2 = canon.getRootHash();

      // Cycle 3
      canon.addFact('C', 'p', 'v3', 's');
      await service.saveSnapshot('cycle-3');
      const hash3 = canon.getRootHash();

      // Verify all snapshots exist
      const snapshots = await service.listSnapshots();
      expect(snapshots.success && snapshots.data).toHaveLength(3);

      // Load cycle-1 and verify
      await service.loadSnapshot('cycle-1');
      expect(canon.getRootHash()).toBe(hash1);
      expect(canon.size).toBe(1);

      // Load cycle-2 and verify
      await service.loadSnapshot('cycle-2');
      expect(canon.getRootHash()).toBe(hash2);
      expect(canon.size).toBe(2);

      // Load cycle-3 and verify
      await service.loadSnapshot('cycle-3');
      expect(canon.getRootHash()).toBe(hash3);
      expect(canon.size).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-INT-02: ROUNDTRIP DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-INT-02 & INV-INT-04: Roundtrip Determinism', () => {
    it('100 roundtrips produce identical hash', async () => {
      const canon = service.getCanon();
      canon.addFact('Test', 'stability', 'value', 'source');
      canon.addFact('Test', 'number', '42', 'source');

      const originalHash = canon.getRootHash();

      for (let i = 0; i < 100; i++) {
        await service.saveSnapshot('determinism-test');
        canon.clear();
        await service.loadSnapshot('determinism-test');

        expect(canon.getRootHash()).toBe(originalHash);
      }
    });

    it('restored data produces same hash as original', async () => {
      // Create initial state
      const canon = service.getCanon();
      canon.addFact('A', 'p', 'v', 's');
      canon.addFact('B', 'p', 'v', 's');
      
      const originalHash = canon.getRootHash();
      
      // Save
      await service.saveSnapshot('restore-hash-test');
      
      // Clear and reload
      canon.clear();
      await service.loadSnapshot('restore-hash-test');
      
      // Same facts restored = same hash
      expect(canon.getRootHash()).toBe(originalHash);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-INT-03: CONFLICT NEVER SILENT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-INT-03: Conflict Never Silent', () => {
    it('divergent modifications create explicit conflict', async () => {
      const canon = service.getCanon();

      // Initial state
      canon.addFact('Base', 'state', 'initial', 's');
      await service.saveSnapshot('diverge-test');

      // Local modification
      canon.addFact('Local', 'mod', 'value', 's');

      // Create "remote" with different modification
      const remoteCanon = createCanonStore();
      remoteCanon.addFact('Base', 'state', 'initial', 's');
      remoteCanon.addFact('Remote', 'mod', 'value', 's');
      const remoteSnapshot = remoteCanon.snapshot();

      // Sync should detect conflict
      const syncResult = await service.sync('diverge-test', remoteSnapshot);

      expect(syncResult.success).toBe(true);
      if (syncResult.success) {
        expect(syncResult.data.status).toBe(SyncStatus.CONFLICT);
        expect(syncResult.data.merged).toBe(false);
        expect(syncResult.data.conflict).toBeDefined();

        // Verify conflict contains both versions
        expect(syncResult.data.conflict?.localSnapshot.facts.length).toBe(2);
        expect(syncResult.data.conflict?.remoteSnapshot.facts.length).toBe(2);
      }
    });

    it('identical states sync without conflict', async () => {
      const canon = service.getCanon();
      canon.addFact('Same', 'data', 'value', 's');

      // Create identical remote
      const remoteCanon = createCanonStore();
      remoteCanon.addFact('Same', 'data', 'value', 's');

      const syncResult = await service.sync('no-conflict', remoteCanon.snapshot());

      expect(syncResult.success).toBe(true);
      if (syncResult.success) {
        expect(syncResult.data.status).toBe(SyncStatus.IN_SYNC);
      }
    });

    it('conflict resolution preserves winner data', async () => {
      const canon = service.getCanon();
      canon.addFact('Local', 'winner', 'local-value', 's');

      const remoteCanon = createCanonStore();
      remoteCanon.addFact('Remote', 'winner', 'remote-value', 's');

      await service.sync('resolve-winner', remoteCanon.snapshot());

      // Resolve with remote
      await service.resolveConflict('resolve-winner', 'remote');

      // Verify canon now has remote data
      const facts = canon.getAllFacts();
      expect(facts).toHaveLength(1);
      expect(facts[0]?.subject).toBe('Remote');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Data Integrity', () => {
    it('detects corrupted file on load', async () => {
      const canon = service.getCanon();
      canon.addFact('Test', 'integrity', 'value', 's');

      await service.saveSnapshot('corrupt-test');

      // Manually corrupt the file
      const filePath = join(TEST_DIR, 'corrupt-test.omega.json');
      const content = JSON.parse(readFileSync(filePath, 'utf8'));
      content.data.facts[0].value = 'CORRUPTED';
      writeFileSync(filePath, JSON.stringify(content));

      // Load should fail with integrity error
      canon.clear();
      const loadResult = await service.loadSnapshot('corrupt-test');

      expect(loadResult.success).toBe(false);
      if (!loadResult.success) {
        expect(loadResult.error).toContain('integrity');
      }
    });

    it('preserves complex nested data', async () => {
      const canon = service.getCanon();

      // Add facts with special characters
      canon.addFact('User', 'bio', 'Hello "world" with <special> & chars', 's');
      canon.addFact('User', 'unicode', '日本語 中文 العربية', 's');
      canon.addFact('User', 'emoji', '🚀💻🎯', 's');

      await service.saveSnapshot('special-chars');
      canon.clear();
      await service.loadSnapshot('special-chars');

      const facts = canon.getAllFacts();
      expect(facts.some(f => f.value.includes('"world"'))).toBe(true);
      expect(facts.some(f => f.value.includes('日本語'))).toBe(true);
      expect(facts.some(f => f.value.includes('🚀'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STRESS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Stress Tests', () => {
    it('handles 1000 facts', async () => {
      const canon = service.getCanon();

      for (let i = 0; i < 1000; i++) {
        canon.addFact(`Entity${i}`, 'property', `value${i}`, 'bulk-load');
      }

      expect(canon.size).toBe(1000);
      const originalHash = canon.getRootHash();

      // Save and reload
      await service.saveSnapshot('bulk-test');
      canon.clear();
      await service.loadSnapshot('bulk-test');

      expect(canon.size).toBe(1000);
      expect(canon.getRootHash()).toBe(originalHash);
    });

    it('handles concurrent operations', async () => {
      const promises = [];

      // Create 10 different services saving simultaneously
      for (let i = 0; i < 10; i++) {
        const localService = createMemoryService({ basePath: TEST_DIR });
        localService.getCanon().addFact(`Concurrent${i}`, 'test', 'value', 's');
        promises.push(localService.saveSnapshot(`concurrent-${i}`));
      }

      const results = await Promise.all(promises);
      expect(results.every(r => r.success)).toBe(true);

      // Verify all saved
      const list = await service.listSnapshots('concurrent-');
      expect(list.success && list.data).toHaveLength(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WINDOWS COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Windows Path Compatibility', () => {
    it('rejects keys with Windows-forbidden characters', async () => {
      const forbiddenKeys = [
        'test:key',
        'test<key',
        'test>key',
        'test|key',
        'test?key',
        'test*key',
        'test"key',
        'test\\key',
        'test/key',
      ];

      for (const key of forbiddenKeys) {
        const result = await service.saveSnapshot(key);
        expect(result.success).toBe(false);
      }
    });

    it('accepts safe keys', async () => {
      const safeKeys = [
        'test_key',
        'test-key',
        'test.key',
        'testKey',
        'test123',
        'TEST_KEY_2',
      ];

      for (const key of safeKeys) {
        const result = await service.saveSnapshot(key);
        expect(result.success).toBe(true);
      }
    });
  });
});
