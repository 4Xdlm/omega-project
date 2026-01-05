/**
 * OMEGA Memory Hook — Integration Tests
 * Phase 20.1 — v3.20.1
 * 
 * End-to-end tests for the memory hook system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemoryHook,
  createMemoryHook,
  MemoryPolicy,
  SaveTrigger,
  createPolicyConfig,
  validatePolicyConfig,
} from '../../src/index.js';
import { MockMemoryService } from '../../src/memory-service.types.js';

describe('Integration', () => {
  let memoryService: MockMemoryService;

  beforeEach(() => {
    memoryService = new MockMemoryService();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complete workflow', () => {
    it('full session lifecycle: start → work → save → stop → restart → resume', async () => {
      // Session 1: Create and work
      const hook1 = createMemoryHook(memoryService, {
        policy: MemoryPolicy.AUTO,
        defaultSnapshotKey: 'session-state',
        registerSignals: false,
      });

      await hook1.start();
      expect(hook1.getState().running).toBe(true);

      // Add some facts
      memoryService.getCanon().addFact('User', 'name', 'Jean', 'input');
      memoryService.getCanon().addFact('User', 'preference', 'dark-mode', 'settings');

      // Save mid-session
      const midSave = await hook1.save();
      expect(midSave.success).toBe(true);

      // Stop (auto-saves)
      await hook1.stop();
      expect(hook1.getState().running).toBe(false);

      // Session 2: Resume
      const hook2 = createMemoryHook(memoryService, {
        policy: MemoryPolicy.AUTO,
        defaultSnapshotKey: 'session-state',
        registerSignals: false,
      });

      // Clear canon to simulate fresh start
      memoryService.getCanon().clear();
      expect(memoryService.getCanon().size).toBe(0);

      // Start should load
      await hook2.start();
      expect(hook2.getState().running).toBe(true);
      expect(memoryService.getCanon().size).toBe(2);

      // Verify facts are restored
      const facts = memoryService.getCanon().getAllFacts();
      expect(facts.some(f => f.subject === 'User' && f.predicate === 'name')).toBe(true);
    });

    it('safe mode workflow: enter → inspect → exit', async () => {
      const hook = createMemoryHook(memoryService, {
        policy: MemoryPolicy.AUTO,
        defaultSnapshotKey: 'safe-test',
        registerSignals: false,
      });

      // Create data
      memoryService.getCanon().addFact('Important', 'data', 'value', 'source');
      await hook.save();
      const originalHash = memoryService.getCanon().getRootHash();

      // Enter safe mode
      const enterResult = await hook.enterSafeMode('safe-test');
      expect(enterResult.success).toBe(true);
      expect(hook.isInSafeMode()).toBe(true);

      // Modify in safe mode (allowed but not persisted)
      memoryService.getCanon().addFact('Temp', 'data', 'will-not-persist', 'safe');

      // Exit safe mode
      const exitResult = hook.exitSafeMode();
      expect(exitResult.success).toBe(true);
      expect(hook.isInSafeMode()).toBe(false);

      // Note: In a real scenario, exiting safe mode would discard changes
      // This test just verifies the state transitions
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POLICY CONFIGURATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Policy configurations', () => {
    it('AUTO policy: loads and saves automatically', async () => {
      const hook = createMemoryHook(memoryService, {
        policy: MemoryPolicy.AUTO,
        registerSignals: false,
      });

      memoryService.getCanon().addFact('Auto', 'test', 'value', 's');
      await memoryService.saveSnapshot('current');
      memoryService.getCanon().clear();

      // Start should load
      await hook.start();
      expect(memoryService.getCanon().size).toBe(1);

      // Add more data
      memoryService.getCanon().addFact('New', 'fact', 'data', 's');

      // Stop should save
      await hook.stop();
      expect(hook.getState().lastSave).toBeDefined();
    });

    it('MANUAL policy: does not auto-load or auto-save', async () => {
      const hook = createMemoryHook(memoryService, {
        policy: MemoryPolicy.MANUAL,
        registerSignals: false,
      });

      memoryService.getCanon().addFact('Manual', 'test', 'value', 's');
      await memoryService.saveSnapshot('current');
      memoryService.getCanon().clear();

      // Start should NOT load
      await hook.start();
      expect(memoryService.getCanon().size).toBe(0);

      // Manually load
      await hook.load('current');
      expect(memoryService.getCanon().size).toBe(1);

      // Add data
      memoryService.getCanon().addFact('New', 'fact', 'data', 's');

      // Stop should NOT save
      await hook.stop();
      // But we can manually save
    });

    it('SAFE_MODE policy: loads but never saves', async () => {
      const hook = createMemoryHook(memoryService, {
        policy: MemoryPolicy.SAFE_MODE,
        registerSignals: false,
      });

      memoryService.getCanon().addFact('Safe', 'test', 'value', 's');
      await memoryService.saveSnapshot('current');
      const originalSize = memoryService.getCanon().size;
      memoryService.getCanon().clear();

      // Start should load
      await hook.start();
      expect(memoryService.getCanon().size).toBe(originalSize);

      // Add data
      memoryService.getCanon().addFact('Temp', 'data', 'value', 's');

      // Stop should NOT save
      const stopResult = await hook.stop();
      expect(stopResult.success).toBe(true);
      if (stopResult.success) {
        expect(stopResult.data.saved).toBe(false);
      }
    });

    it('DISABLED policy: no loading or saving', async () => {
      const hook = createMemoryHook(memoryService, {
        policy: MemoryPolicy.DISABLED,
        registerSignals: false,
      });

      memoryService.getCanon().addFact('Disabled', 'test', 'value', 's');
      await memoryService.saveSnapshot('current');
      memoryService.getCanon().clear();

      // Start should NOT load
      const startResult = await hook.start();
      expect(startResult.success).toBe(true);
      if (startResult.success) {
        expect(startResult.data.loaded).toBe(false);
      }

      // Stop should NOT save
      memoryService.getCanon().addFact('Temp', 'data', 'value', 's');
      const stopResult = await hook.stop();
      expect(stopResult.success).toBe(true);
      if (stopResult.success) {
        expect(stopResult.data.saved).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Config validation', () => {
    it('validates valid config', () => {
      const config = createPolicyConfig(MemoryPolicy.AUTO);
      const result = validatePolicyConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects SAFE_MODE with saveOnShutdown', () => {
      const config = createPolicyConfig(MemoryPolicy.SAFE_MODE, {
        saveOnShutdown: true,
      });
      const result = validatePolicyConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('SAFE_MODE'))).toBe(true);
    });

    it('detects DISABLED with load enabled', () => {
      const config = createPolicyConfig(MemoryPolicy.DISABLED, {
        loadOnStartup: true,
      });
      const result = validatePolicyConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('DISABLED'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error handling', () => {
    it('handles missing snapshot gracefully', async () => {
      const hook = createMemoryHook(memoryService, {
        policy: MemoryPolicy.AUTO,
        defaultSnapshotKey: 'nonexistent',
        registerSignals: false,
      });

      // Start should succeed even with no snapshot
      const result = await hook.start();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(false);
      }
    });

    it('handles empty canon gracefully', async () => {
      const hook = createMemoryHook(memoryService, {
        policy: MemoryPolicy.AUTO,
        registerSignals: false,
      });

      await hook.start();
      // Canon is empty

      const stopResult = await hook.stop();
      expect(stopResult.success).toBe(true);
      if (stopResult.success) {
        expect(stopResult.data.saved).toBe(false);
        expect(stopResult.data.error).toContain('empty');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGER TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Trigger tracking', () => {
    it('tracks MANUAL trigger', async () => {
      const hook = createMemoryHook(memoryService, {
        policy: MemoryPolicy.AUTO,
        registerSignals: false,
      });

      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await hook.save();

      expect(hook.getState().lastSave?.trigger).toBe(SaveTrigger.MANUAL);
    });

    it('tracks SHUTDOWN trigger', async () => {
      const hook = createMemoryHook(memoryService, {
        policy: MemoryPolicy.AUTO,
        registerSignals: false,
      });

      await hook.start();
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await hook.stop();

      expect(hook.getState().lastSave?.trigger).toBe(SaveTrigger.SHUTDOWN);
    });
  });
});
