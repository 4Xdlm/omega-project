/**
 * WAIVER REGISTRY TESTS — Phase F Non-Regression
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Tests for waiver_registry.ts module functions.
 * INV-REGR-004: WAIVER human-signed
 */

import { describe, it, expect } from 'vitest';
import {
  createWaiverRegistry,
  getActiveWaivers,
  findWaiversForBaseline,
  isGapWaived,
  isRegressionTypeWaived,
  determineWaiverStatus,
  validateWaiver,
  type RegressionWaiver,
  type WaiverRegistryState,
} from '../../../governance/regression/index.js';

// ─────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────

const TEST_WAIVER: RegressionWaiver = {
  waiver_id: 'WAIVER_001',
  baseline_id: 'BL_20260201_001',
  gap_id: 'GAP-TEST_COUNT_DECREASE',
  severity: 'minor',
  status: 'ACTIVE',
  approved_by: 'Francky',
  approved_at: '2026-02-01T00:00:00Z',
  reason: 'Intentional test removal for deprecated feature',
  scope_limitations: ['Only applies to legacy module tests'],
  expires_on_phase: 'D',
  proof_ref: 'waivers/PHASE_F/',
  hash_sha256: 'c'.repeat(64),
};

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('Waiver Registry — Phase F', () => {
  describe('Registry creation', () => {
    it('createWaiverRegistry computes status from sealed phases', () => {
      const sealedPhases = new Set(['D']);
      const registry = createWaiverRegistry([TEST_WAIVER], sealedPhases);

      // Waiver expires on phase D, which is sealed -> EXPIRED
      expect(registry.waivers[0].status).toBe('EXPIRED');
    });

    it('createWaiverRegistry counts active/expired/pending', () => {
      const activeWaiver: RegressionWaiver = { ...TEST_WAIVER, waiver_id: 'W1' };
      const pendingWaiver: RegressionWaiver = {
        ...TEST_WAIVER,
        waiver_id: 'W2',
        approved_by: '',
        expires_on_phase: 'Z',
      };
      const expiredWaiver: RegressionWaiver = {
        ...TEST_WAIVER,
        waiver_id: 'W3',
        expires_on_phase: 'A',
      };

      const sealedPhases = new Set(['A']);
      const registry = createWaiverRegistry(
        [activeWaiver, pendingWaiver, expiredWaiver],
        sealedPhases
      );

      expect(registry.active_count).toBe(1);
      expect(registry.pending_count).toBe(1);
      expect(registry.expired_count).toBe(1);
    });

    it('getActiveWaivers returns only ACTIVE waivers', () => {
      const activeWaiver: RegressionWaiver = { ...TEST_WAIVER, waiver_id: 'W1' };
      const pendingWaiver: RegressionWaiver = {
        ...TEST_WAIVER,
        waiver_id: 'W2',
        approved_by: '',
        expires_on_phase: 'Z',
      };

      const sealedPhases = new Set<string>();
      const registry = createWaiverRegistry([activeWaiver, pendingWaiver], sealedPhases);
      const activeWaivers = getActiveWaivers(registry);

      expect(activeWaivers).toHaveLength(1);
      expect(activeWaivers[0].waiver_id).toBe('W1');
    });
  });

  describe('Finding waivers', () => {
    it('findWaiversForBaseline returns matching waivers', () => {
      const waiver1: RegressionWaiver = { ...TEST_WAIVER, waiver_id: 'W1' };
      const waiver2: RegressionWaiver = {
        ...TEST_WAIVER,
        waiver_id: 'W2',
        baseline_id: 'BL_OTHER',
      };

      const registry = createWaiverRegistry([waiver1, waiver2], new Set<string>());
      const found = findWaiversForBaseline(registry, 'BL_20260201_001');

      expect(found).toHaveLength(1);
      expect(found[0].waiver_id).toBe('W1');
    });

    it('isGapWaived returns waiver when gap is waived', () => {
      const registry = createWaiverRegistry([TEST_WAIVER], new Set<string>());
      const result = isGapWaived(registry, 'BL_20260201_001', 'GAP-TEST_COUNT_DECREASE');

      expect(result).not.toBeNull();
      expect(result?.waiver_id).toBe('WAIVER_001');
    });

    it('isGapWaived returns null when not waived', () => {
      const registry = createWaiverRegistry([TEST_WAIVER], new Set<string>());
      const result = isGapWaived(registry, 'BL_20260201_001', 'GAP-NONEXISTENT');

      expect(result).toBeNull();
    });

    it('isRegressionTypeWaived checks GAP-{TYPE} format', () => {
      const registry = createWaiverRegistry([TEST_WAIVER], new Set<string>());
      const result = isRegressionTypeWaived(registry, 'BL_20260201_001', 'TEST_COUNT_DECREASE');

      expect(result).not.toBeNull();
      expect(result?.gap_id).toBe('GAP-TEST_COUNT_DECREASE');
    });
  });

  describe('Status determination', () => {
    it('determineWaiverStatus returns EXPIRED when phase sealed', () => {
      const sealedPhases = new Set(['D']);
      const status = determineWaiverStatus(TEST_WAIVER, sealedPhases);

      expect(status).toBe('EXPIRED');
    });

    it('determineWaiverStatus returns PENDING when no approved_by', () => {
      const pendingWaiver: RegressionWaiver = {
        ...TEST_WAIVER,
        approved_by: '',
      };
      const status = determineWaiverStatus(pendingWaiver, new Set<string>());

      expect(status).toBe('PENDING');
    });

    it('determineWaiverStatus returns ACTIVE when valid', () => {
      const status = determineWaiverStatus(TEST_WAIVER, new Set<string>());

      expect(status).toBe('ACTIVE');
    });
  });

  describe('Validation (INV-REGR-004)', () => {
    it('validateWaiver passes for valid waiver', () => {
      const result = validateWaiver(TEST_WAIVER);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validateWaiver fails without approved_by (human-signed)', () => {
      const invalidWaiver: RegressionWaiver = {
        ...TEST_WAIVER,
        approved_by: '',
      };
      const result = validateWaiver(invalidWaiver);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('INV-REGR-004: approved_by is required (human-signed)');
    });

    it('validateWaiver fails without reason', () => {
      const invalidWaiver: RegressionWaiver = {
        ...TEST_WAIVER,
        reason: '',
      };
      const result = validateWaiver(invalidWaiver);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('reason is required for traceability');
    });
  });
});
