/**
 * OMEGA V4.4 — Sentinel Unit Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Sentinel } from '../../src/phase4_sentinel/index.js';
import type { SentinelRequest, ReadonlyState } from '../../src/phase4_sentinel/index.js';
import { INVARIANT_IDS } from '../../src/phase1_contract/index.js';

describe('Sentinel', () => {
  let sentinel: Sentinel;
  let validRequest: SentinelRequest;
  let validState: ReadonlyState;

  beforeEach(() => {
    sentinel = new Sentinel();

    validRequest = {
      requestId: 'req-123',
      module: 'core',
      action: 'READ',
      target: 'emotional_state',
      params: {},
      timestamp: Date.now(),
    };

    validState = {
      contractVersion: '4.4.0',
      coreVersion: '1.0.0',
      configHash: 'abc123',
      currentTimestamp: Date.now(),
      allowedModules: ['core', 'snapshot', 'mycelium', 'cli'],
      invariants: [...INVARIANT_IDS],
    };
  });

  describe('ALLOW decisions', () => {
    it('returns ALLOW for valid request', () => {
      const decision = sentinel.decide(validRequest, validState);

      expect(decision.verdict).toBe('ALLOW');
      expect(decision.proof).toBeDefined();
      expect(decision.denialReason).toBeUndefined();
    });

    it('ALLOW includes complete proof', () => {
      const decision = sentinel.decide(validRequest, validState);

      expect(decision.proof?.level1_structural).toBe('PASS');
      expect(decision.proof?.level2_contractual).toBe('PASS');
      expect(decision.proof?.level3_contextual).toBe('PASS');
      expect(decision.proof?.level4_semantic).toBe('PASS');
    });

    it('ALLOW includes checked invariants', () => {
      const decision = sentinel.decide(validRequest, validState);

      expect(decision.proof?.invariantsChecked).toBeDefined();
      expect(decision.proof?.invariantsChecked.length).toBeGreaterThan(0);
    });

    it('ALLOW includes performed checks', () => {
      const decision = sentinel.decide(validRequest, validState);

      expect(decision.proof?.checksPerformed).toBeDefined();
      expect(decision.proof?.checksPerformed.length).toBeGreaterThan(0);
    });
  });

  describe('Level 1 - Structural validation', () => {
    it('DENY for missing requestId', () => {
      const request = { ...validRequest, requestId: '' };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(1);
      expect(decision.denialReason?.failedCheck).toContain('requestId');
    });

    it('DENY for missing module', () => {
      const request = { ...validRequest, module: '' };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(1);
      expect(decision.denialReason?.failedCheck).toContain('module');
    });

    it('DENY for invalid action', () => {
      const request = { ...validRequest, action: 'INVALID' as never };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(1);
      expect(decision.denialReason?.failedCheck).toContain('action');
    });

    it('DENY for missing target', () => {
      const request = { ...validRequest, target: '' };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(1);
      expect(decision.denialReason?.failedCheck).toContain('target');
    });

    it('DENY for invalid timestamp', () => {
      const request = { ...validRequest, timestamp: -1 };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(1);
      expect(decision.denialReason?.failedCheck).toContain('timestamp');
    });
  });

  describe('Level 2 - Contractual validation', () => {
    it('DENY for L2 violation (mu out of bounds)', () => {
      const request = {
        ...validRequest,
        params: { mu: 200 }, // Out of bounds
      };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(2);
      expect(decision.denialReason?.violatedInvariant).toBe('L2_BOUNDED_INTENSITY');
    });

    it('DENY for L3 violation (Z out of bounds)', () => {
      const request = {
        ...validRequest,
        params: { Z: 2 }, // Out of bounds
      };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(2);
      expect(decision.denialReason?.violatedInvariant).toBe('L3_BOUNDED_PERSISTENCE');
    });

    it('DENY for L5 violation (C <= 0)', () => {
      const request = {
        ...validRequest,
        params: { C: 0 },
      };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(2);
      expect(decision.denialReason?.violatedInvariant).toBe('L5_HYSTERIC_DAMPING');
    });

    it('DENY for L6 violation (totalIntensity too high)', () => {
      const request = {
        ...validRequest,
        params: { totalIntensity: 2000 }, // > 1600
      };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(2);
      expect(decision.denialReason?.violatedInvariant).toBe('L6_CONSERVATION');
    });
  });

  describe('Level 3 - Contextual validation', () => {
    it('DENY for unauthorized module', () => {
      const request = { ...validRequest, module: 'unauthorized' };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(3);
      expect(decision.denialReason?.failedCheck).toContain('not authorized');
    });

    it('DENY for expired request', () => {
      const oldRequest = {
        ...validRequest,
        timestamp: validState.currentTimestamp - 120000, // 2 minutes ago
      };
      const decision = sentinel.decide(oldRequest, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(3);
      expect(decision.denialReason?.failedCheck).toContain('too old');
    });

    it('DENY for future timestamp', () => {
      const futureRequest = {
        ...validRequest,
        timestamp: validState.currentTimestamp + 60000, // 1 minute in future
      };
      const decision = sentinel.decide(futureRequest, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(3);
      expect(decision.denialReason?.failedCheck).toContain('future');
    });
  });

  describe('Level 4 - Semantic validation', () => {
    it('DENY for WRITE to immutable target', () => {
      const request = {
        ...validRequest,
        action: 'WRITE' as const,
        target: 'immutable',
      };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(4);
      expect(decision.denialReason?.failedCheck).toContain('immutable');
    });

    it('DENY for READ with side-effect params', () => {
      const request = {
        ...validRequest,
        action: 'READ' as const,
        params: { modify: true },
      };
      const decision = sentinel.decide(request, validState);

      expect(decision.verdict).toBe('DENY');
      expect(decision.denialReason?.level).toBe(4);
      expect(decision.denialReason?.failedCheck).toContain('side-effect');
    });
  });

  describe('Decision metadata', () => {
    it('includes decision ID', () => {
      const decision = sentinel.decide(validRequest, validState);
      expect(decision.decisionId).toBeDefined();
      expect(decision.decisionId.length).toBeGreaterThan(0);
    });

    it('includes timestamp', () => {
      const decision = sentinel.decide(validRequest, validState);
      expect(decision.timestamp).toBeDefined();
      expect(decision.timestamp).toBeGreaterThan(0);
    });

    it('includes request in decision', () => {
      const decision = sentinel.decide(validRequest, validState);
      expect(decision.request).toEqual(validRequest);
    });

    it('includes decision hash', () => {
      const decision = sentinel.decide(validRequest, validState);
      expect(decision.decisionHash).toBeDefined();
      expect(decision.decisionHash.length).toBe(64); // SHA-256 hex
    });

    it('includes processing time', () => {
      const decision = sentinel.decide(validRequest, validState);
      expect(decision.processingTimeMs).toBeDefined();
      expect(decision.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Determinism', () => {
    it('same request + state = same verdict', () => {
      const d1 = sentinel.decide(validRequest, validState);
      const d2 = sentinel.decide(validRequest, validState);

      expect(d1.verdict).toBe(d2.verdict);
    });

    it('ALLOW proof is consistent', () => {
      const d1 = sentinel.decide(validRequest, validState);
      const d2 = sentinel.decide(validRequest, validState);

      expect(d1.proof?.level1_structural).toBe(d2.proof?.level1_structural);
      expect(d1.proof?.level2_contractual).toBe(d2.proof?.level2_contractual);
      expect(d1.proof?.level3_contextual).toBe(d2.proof?.level3_contextual);
      expect(d1.proof?.level4_semantic).toBe(d2.proof?.level4_semantic);
    });

    it('DENY reason is consistent', () => {
      const invalidRequest = { ...validRequest, requestId: '' };
      const d1 = sentinel.decide(invalidRequest, validState);
      const d2 = sentinel.decide(invalidRequest, validState);

      expect(d1.denialReason?.level).toBe(d2.denialReason?.level);
      expect(d1.denialReason?.failedCheck).toBe(d2.denialReason?.failedCheck);
    });
  });

  describe('Statelessness', () => {
    it('sentinel has no internal state', () => {
      const s1 = new Sentinel();
      const s2 = new Sentinel();

      const d1 = s1.decide(validRequest, validState);
      const d2 = s2.decide(validRequest, validState);

      expect(d1.verdict).toBe(d2.verdict);
    });

    it('decisions are independent', () => {
      // Make a failing decision
      const failingRequest = { ...validRequest, requestId: '' };
      sentinel.decide(failingRequest, validState);

      // Make a passing decision
      const passingDecision = sentinel.decide(validRequest, validState);

      // Passing decision should still pass
      expect(passingDecision.verdict).toBe('ALLOW');
    });
  });

  describe('Performance', () => {
    it('decision in <10ms', () => {
      const start = performance.now();
      sentinel.decide(validRequest, validState);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('reported processing time matches reality', () => {
      const decision = sentinel.decide(validRequest, validState);

      // Processing time should be reasonable
      expect(decision.processingTimeMs).toBeLessThan(10);
    });
  });
});
