/**
 * OMEGA Memory Hook — Main Hook Tests
 * Phase 20.1 — v3.20.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryHook, createMemoryHook } from '../../src/memory-hook.js';
import {
  MemoryPolicy,
  SaveTrigger,
  createPolicyConfig,
} from '../../src/config/memory-policy.js';
import { MockMemoryService } from '../../src/memory-service.types.js';

describe('MemoryHook', () => {
  let memoryService: MockMemoryService;
  let hook: MemoryHook;

  beforeEach(() => {
    memoryService = new MockMemoryService();
    hook = createMemoryHook(memoryService, {
      policy: MemoryPolicy.AUTO,
      basePath: '/tmp/test',
      defaultSnapshotKey: 'test-snapshot',
      registerSignals: false, // Disable for tests
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Lifecycle', () => {
    it('starts successfully', async () => {
      const result = await hook.start();

      expect(result.success).toBe(true);
      expect(hook.getState().running).toBe(true);
      expect(hook.getState().initialized).toBe(true);
    });

    it('stops successfully', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await hook.start();

      const result = await hook.stop();

      expect(result.success).toBe(true);
      expect(hook.getState().running).toBe(false);
    });

    it('cannot start twice', async () => {
      await hook.start();
      const result = await hook.start();

      expect(result.success).toBe(false);
      expect(result.error).toContain('already running');
    });

    it('cannot stop if not running', async () => {
      const result = await hook.stop();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not running');
    });

    it('loads on start if snapshot exists', async () => {
      memoryService.getCanon().addFact('Preexisting', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');
      memoryService.getCanon().clear();

      await hook.start();

      expect(memoryService.getCanon().size).toBe(1);
      expect(hook.getState().lastLoad).toBeDefined();
    });

    it('saves on stop', async () => {
      await hook.start();
      memoryService.getCanon().addFact('New', 'p', 'v', 's');

      await hook.stop();

      expect(hook.getState().lastSave).toBeDefined();
      expect(hook.getState().lastSave?.trigger).toBe(SaveTrigger.SHUTDOWN);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Manual operations', () => {
    it('manual save works', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const result = await hook.save();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(true);
        expect(result.data.trigger).toBe(SaveTrigger.MANUAL);
      }
    });

    it('manual save with custom key', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const result = await hook.save('custom-key');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.snapshotKey).toBe('custom-key');
      }
    });

    it('manual load works', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');
      memoryService.getCanon().clear();

      const result = await hook.load();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(true);
      }
    });

    it('manual load with custom key', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('custom-key');
      memoryService.getCanon().clear();

      const result = await hook.load('custom-key');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.snapshotKey).toBe('custom-key');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFE MODE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Safe mode', () => {
    it('enters safe mode', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');

      const result = await hook.enterSafeMode('test-snapshot');

      expect(result.success).toBe(true);
      expect(hook.isInSafeMode()).toBe(true);
    });

    it('exits safe mode', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');
      await hook.enterSafeMode('test-snapshot');

      const result = hook.exitSafeMode();

      expect(result.success).toBe(true);
      expect(hook.isInSafeMode()).toBe(false);
    });

    it('cannot enter safe mode twice', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');
      await hook.enterSafeMode('test-snapshot');

      const result = await hook.enterSafeMode('test-snapshot');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Already in safe mode');
    });

    it('cannot exit safe mode if not in it', () => {
      const result = hook.exitSafeMode();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not in safe mode');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('State', () => {
    it('returns correct initial state', () => {
      const state = hook.getState();

      expect(state.initialized).toBe(false);
      expect(state.running).toBe(false);
      expect(state.policy).toBe(MemoryPolicy.AUTO);
      expect(state.autoSaveActive).toBe(false);
      expect(state.safeModeActive).toBe(false);
    });

    it('tracks last save', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await hook.save();

      const state = hook.getState();
      expect(state.lastSave).toBeDefined();
      expect(state.lastSave?.factCount).toBe(1);
    });

    it('tracks last load', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');
      memoryService.getCanon().clear();
      await hook.load();

      const state = hook.getState();
      expect(state.lastLoad).toBeDefined();
      expect(state.lastLoad?.factCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Getters', () => {
    it('returns memory service', () => {
      expect(hook.getMemoryService()).toBe(memoryService);
    });

    it('returns config', () => {
      const config = hook.getConfig();
      expect(config.policy).toBe(MemoryPolicy.AUTO);
      expect(config.basePath).toBe('/tmp/test');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Factory', () => {
    it('createMemoryHook works', () => {
      const hook = createMemoryHook(memoryService);
      expect(hook).toBeInstanceOf(MemoryHook);
    });

    it('uses default config if not provided', () => {
      const hook = createMemoryHook(memoryService);
      const config = hook.getConfig();
      expect(config.policy).toBe(MemoryPolicy.AUTO);
    });
  });
});
