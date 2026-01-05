/**
 * OMEGA Memory Hook — Shutdown Save Tests
 * Phase 20.1 — v3.20.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { onShutdown, isSaveAllowed } from '../../src/lifecycle/onShutdown.js';
import {
  MemoryPolicy,
  SaveTrigger,
  createPolicyConfig,
  type MemoryPolicyConfig,
} from '../../src/config/memory-policy.js';
import { MockMemoryService } from '../../src/memory-service.types.js';

describe('Shutdown Save', () => {
  let memoryService: MockMemoryService;
  let autoConfig: MemoryPolicyConfig;

  beforeEach(() => {
    memoryService = new MockMemoryService();
    autoConfig = createPolicyConfig(MemoryPolicy.AUTO, {
      basePath: '/tmp/test',
      defaultSnapshotKey: 'test-snapshot',
      retryAttempts: 3,
      retryDelay: 10,
      maxSnapshots: 5,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-HOOK-04: Save only if policy allows
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-HOOK-04: Policy-based saving', () => {
    it('saves on AUTO policy', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const result = await onShutdown(memoryService, autoConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(true);
        expect(result.data.factCount).toBe(1);
      }
    });

    it('does not save on SAFE_MODE policy', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const safeModeConfig = createPolicyConfig(MemoryPolicy.SAFE_MODE, {
        basePath: '/tmp/test',
        defaultSnapshotKey: 'test-snapshot',
      });

      const result = await onShutdown(memoryService, safeModeConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(false);
      }
    });

    it('does not save on MANUAL policy', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const manualConfig = createPolicyConfig(MemoryPolicy.MANUAL, {
        basePath: '/tmp/test',
        defaultSnapshotKey: 'test-snapshot',
      });

      const result = await onShutdown(memoryService, manualConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(false);
      }
    });

    it('does not save on DISABLED policy', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const disabledConfig = createPolicyConfig(MemoryPolicy.DISABLED, {
        basePath: '/tmp/test',
        defaultSnapshotKey: 'test-snapshot',
      });

      const result = await onShutdown(memoryService, disabledConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY CANON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty canon handling', () => {
    it('does not save if canon is empty', async () => {
      // Canon is empty
      const result = await onShutdown(memoryService, autoConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(false);
        expect(result.data.error).toContain('empty');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Options', () => {
    it('skipSave prevents saving', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const result = await onShutdown(memoryService, autoConfig, { skipSave: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(false);
      }
    });

    it('forceSave overrides policy', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const manualConfig = createPolicyConfig(MemoryPolicy.MANUAL, {
        basePath: '/tmp/test',
        defaultSnapshotKey: 'test-snapshot',
      });

      const result = await onShutdown(memoryService, manualConfig, { forceSave: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.saved).toBe(true);
      }
    });

    it('custom snapshotKey works', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const result = await onShutdown(memoryService, autoConfig, {
        snapshotKey: 'custom-key',
        forceSave: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.snapshotKey).toBe('custom-key');
      }
    });

    it('custom trigger is recorded', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const result = await onShutdown(memoryService, autoConfig, {
        trigger: SaveTrigger.INTERVAL,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trigger).toBe(SaveTrigger.INTERVAL);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGER TYPES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Trigger types', () => {
    it('default trigger is SHUTDOWN', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const result = await onShutdown(memoryService, autoConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trigger).toBe(SaveTrigger.SHUTDOWN);
      }
    });

    it('supports MANUAL trigger', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const result = await onShutdown(memoryService, autoConfig, {
        trigger: SaveTrigger.MANUAL,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trigger).toBe(SaveTrigger.MANUAL);
      }
    });

    it('supports INTERVAL trigger', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');

      const result = await onShutdown(memoryService, autoConfig, {
        trigger: SaveTrigger.INTERVAL,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trigger).toBe(SaveTrigger.INTERVAL);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isSaveAllowed()', () => {
    it('returns true for AUTO with saveOnShutdown', () => {
      expect(isSaveAllowed(autoConfig)).toBe(true);
    });

    it('returns false for SAFE_MODE', () => {
      const config = createPolicyConfig(MemoryPolicy.SAFE_MODE);
      expect(isSaveAllowed(config)).toBe(false);
    });

    it('returns false for MANUAL', () => {
      const config = createPolicyConfig(MemoryPolicy.MANUAL);
      expect(isSaveAllowed(config)).toBe(false);
    });

    it('returns false for DISABLED', () => {
      const config = createPolicyConfig(MemoryPolicy.DISABLED);
      expect(isSaveAllowed(config)).toBe(false);
    });
  });
});
