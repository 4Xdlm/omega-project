/**
 * OMEGA Memory Hook — Startup Load Tests
 * Phase 20.1 — v3.20.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { onStart, isLoadAllowed } from '../../src/lifecycle/onStart.js';
import {
  MemoryPolicy,
  createPolicyConfig,
  type MemoryPolicyConfig,
} from '../../src/config/memory-policy.js';
import { MockMemoryService } from '../../src/memory-service.types.js';

describe('Startup Load', () => {
  let memoryService: MockMemoryService;
  let autoConfig: MemoryPolicyConfig;

  beforeEach(() => {
    memoryService = new MockMemoryService();
    autoConfig = createPolicyConfig(MemoryPolicy.AUTO, {
      basePath: '/tmp/test',
      defaultSnapshotKey: 'test-snapshot',
      retryAttempts: 3,
      retryDelay: 10,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-HOOK-01: Load only if policy allows
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-HOOK-01: Policy-based loading', () => {
    it('loads on AUTO policy', async () => {
      // Setup: save a snapshot first
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');
      memoryService.getCanon().clear();

      const result = await onStart(memoryService, autoConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(true);
        expect(result.data.factCount).toBe(1);
      }
    });

    it('loads on SAFE_MODE policy', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');
      memoryService.getCanon().clear();

      const safeModeConfig = createPolicyConfig(MemoryPolicy.SAFE_MODE, {
        basePath: '/tmp/test',
        defaultSnapshotKey: 'test-snapshot',
      });

      const result = await onStart(memoryService, safeModeConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(true);
      }
    });

    it('does not load on MANUAL policy', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');

      const manualConfig = createPolicyConfig(MemoryPolicy.MANUAL, {
        basePath: '/tmp/test',
        defaultSnapshotKey: 'test-snapshot',
      });

      const result = await onStart(memoryService, manualConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(false);
      }
    });

    it('does not load on DISABLED policy', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');

      const disabledConfig = createPolicyConfig(MemoryPolicy.DISABLED, {
        basePath: '/tmp/test',
        defaultSnapshotKey: 'test-snapshot',
      });

      const result = await onStart(memoryService, disabledConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-HOOK-02: Graceful fallback on missing snapshot
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-HOOK-02: Graceful fallback', () => {
    it('handles missing snapshot gracefully', async () => {
      // No snapshot saved
      const result = await onStart(memoryService, autoConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(false);
        expect(result.data.error).toContain('not found');
      }
    });

    it('returns success even on fresh start', async () => {
      const result = await onStart(memoryService, autoConfig);

      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Options', () => {
    it('skipLoad prevents loading', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');

      const result = await onStart(memoryService, autoConfig, { skipLoad: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(false);
      }
    });

    it('forceLoad overrides policy', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('test-snapshot');
      memoryService.getCanon().clear();

      const manualConfig = createPolicyConfig(MemoryPolicy.MANUAL, {
        basePath: '/tmp/test',
        defaultSnapshotKey: 'test-snapshot',
      });

      const result = await onStart(memoryService, manualConfig, { forceLoad: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(true);
      }
    });

    it('custom snapshotKey works', async () => {
      memoryService.getCanon().addFact('Test', 'p', 'v', 's');
      await memoryService.saveSnapshot('custom-key');
      memoryService.getCanon().clear();

      const result = await onStart(memoryService, autoConfig, {
        snapshotKey: 'custom-key',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.loaded).toBe(true);
        expect(result.data.snapshotKey).toBe('custom-key');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isLoadAllowed()', () => {
    it('returns true for AUTO with loadOnStartup', () => {
      expect(isLoadAllowed(autoConfig)).toBe(true);
    });

    it('returns false for DISABLED', () => {
      const config = createPolicyConfig(MemoryPolicy.DISABLED);
      expect(isLoadAllowed(config)).toBe(false);
    });
  });
});
