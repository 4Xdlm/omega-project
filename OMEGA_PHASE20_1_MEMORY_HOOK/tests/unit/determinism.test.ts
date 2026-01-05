/**
 * OMEGA Memory Hook — Determinism Tests
 * Phase 20.1 — v3.20.1
 * 
 * Verifies that the memory hook produces deterministic results.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryHook, createMemoryHook } from '../../src/memory-hook.js';
import { MemoryPolicy } from '../../src/config/memory-policy.js';
import { MockMemoryService } from '../../src/memory-service.types.js';

describe('Determinism', () => {
  let memoryService: MockMemoryService;
  let hook: MemoryHook;

  beforeEach(() => {
    memoryService = new MockMemoryService();
    hook = createMemoryHook(memoryService, {
      policy: MemoryPolicy.AUTO,
      basePath: '/tmp/test',
      defaultSnapshotKey: 'determinism-test',
      registerSignals: false,
    });
  });

  describe('Roundtrip determinism', () => {
    it('save → load → save produces same hash', async () => {
      // Add facts
      memoryService.getCanon().addFact('User', 'name', 'Jean', 'test');
      memoryService.getCanon().addFact('User', 'age', '35', 'test');

      // First save
      const save1 = await hook.save('test-key');
      expect(save1.success).toBe(true);
      const hash1 = save1.success ? save1.data.rootHash : '';

      // Clear and reload
      memoryService.getCanon().clear();
      await hook.load('test-key');

      // Second save
      const save2 = await hook.save('test-key-2');
      expect(save2.success).toBe(true);
      const hash2 = save2.success ? save2.data.rootHash : '';

      // Same hash
      expect(hash1).toBe(hash2);
    });

    it('10 roundtrips produce identical hashes', async () => {
      memoryService.getCanon().addFact('Stability', 'test', 'value', 'source');

      const hashes: string[] = [];

      for (let i = 0; i < 10; i++) {
        const saveResult = await hook.save('cycle-test');
        expect(saveResult.success).toBe(true);
        
        if (saveResult.success) {
          hashes.push(saveResult.data.rootHash!);
        }

        memoryService.getCanon().clear();
        await hook.load('cycle-test');
      }

      // All hashes should be identical
      const firstHash = hashes[0];
      expect(hashes.every(h => h === firstHash)).toBe(true);
    });

    it('restored state equals original state', async () => {
      // Create complex state
      const canon = memoryService.getCanon();
      canon.addFact('Person', 'name', 'Jean Dupont', 'user');
      canon.addFact('Person', 'age', '35', 'user');
      canon.addFact('Person', 'city', 'Paris', 'inference');
      canon.addFact('Config', 'theme', 'dark', 'settings');

      const originalHash = canon.getRootHash();
      const originalCount = canon.size;

      // Save
      await hook.save();

      // Clear
      canon.clear();
      expect(canon.size).toBe(0);

      // Load
      await hook.load();

      // Verify
      expect(canon.size).toBe(originalCount);
      expect(canon.getRootHash()).toBe(originalHash);
    });
  });

  describe('Policy consistency', () => {
    it('AUTO policy produces consistent behavior', async () => {
      const hook1 = createMemoryHook(new MockMemoryService(), {
        policy: MemoryPolicy.AUTO,
        registerSignals: false,
      });

      const hook2 = createMemoryHook(new MockMemoryService(), {
        policy: MemoryPolicy.AUTO,
        registerSignals: false,
      });

      // Both should have same config behavior
      expect(hook1.getConfig().saveOnShutdown).toBe(hook2.getConfig().saveOnShutdown);
      expect(hook1.getConfig().loadOnStartup).toBe(hook2.getConfig().loadOnStartup);
    });

    it('SAFE_MODE policy produces consistent behavior', async () => {
      const hook1 = createMemoryHook(new MockMemoryService(), {
        policy: MemoryPolicy.SAFE_MODE,
        registerSignals: false,
      });

      const hook2 = createMemoryHook(new MockMemoryService(), {
        policy: MemoryPolicy.SAFE_MODE,
        registerSignals: false,
      });

      // Both should have same config behavior
      expect(hook1.getConfig().saveOnShutdown).toBe(hook2.getConfig().saveOnShutdown);
      expect(hook1.getConfig().loadOnStartup).toBe(hook2.getConfig().loadOnStartup);
    });
  });

  describe('State tracking consistency', () => {
    it('lastSave reflects actual save', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      
      await hook.save('tracked-save');

      const state = hook.getState();
      expect(state.lastSave).toBeDefined();
      expect(state.lastSave?.snapshotKey).toBe('tracked-save');
      expect(state.lastSave?.factCount).toBe(1);
    });

    it('lastLoad reflects actual load', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('tracked-load');
      memoryService.getCanon().clear();

      await hook.load('tracked-load');

      const state = hook.getState();
      expect(state.lastLoad).toBeDefined();
      expect(state.lastLoad?.snapshotKey).toBe('tracked-load');
      expect(state.lastLoad?.factCount).toBe(1);
    });
  });
});
