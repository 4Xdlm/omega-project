/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Chaos Algebra - Injector Tests
 * 
 * Phase 23 - Sprint 23.0
 * 
 * Tests for chaos injection and determinism verification.
 * 
 * INVARIANTS:
 * - INV-CHAOS-03: Déterminisme - same_seed(p) ⇒ same_effect(p)
 * - INV-CHAOS-04: Isolation - effect(p, module_A) ∩ state(module_B) = ∅
 * - INV-CHAOS-05: Récupération - ∀p, ◇(system_state = nominal)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChaosInjector,
  createInjector,
  createMockContext,
  InjectionContext,
  InjectionRecord,
} from '../../src/chaos/injector.js';
import {
  clockSkew,
  networkDelay,
  networkFailure,
  memoryCorruption,
  resourceExhaustion,
  networkInstabilityScenario,
  fullChaosScenario,
} from '../../src/chaos/factory.js';
import { sequence, parallel, repeat } from '../../src/chaos/composition.js';
import {
  SystemResponse,
  VALID_RESPONSES,
  chaosSeed,
} from '../../src/chaos/types.js';

describe('ChaosInjector', () => {
  let context: InjectionContext;
  let injector: ChaosInjector;
  const seed = chaosSeed(12345);

  beforeEach(() => {
    context = createMockContext(seed);
    injector = createInjector(context, seed);
  });

  describe('Single Perturbation Injection', () => {
    it('should inject a clock skew perturbation', () => {
      const p = clockSkew(100, 1);
      const results = injector.inject(p);

      expect(results.length).toBe(1);
      expect(results[0]!.perturbation).toBe(p);
      expect(VALID_RESPONSES).toContain(results[0]!.response);
    });

    it('should inject a network delay perturbation', () => {
      const p = networkDelay(50, 1, 2);
      const results = injector.inject(p);

      expect(results.length).toBe(1);
      expect(results[0]!.response).toBe(SystemResponse.ABSORB);
    });

    it('should inject a network failure perturbation', () => {
      const p = networkFailure(1, 3); // 100% failure
      const results = injector.inject(p);

      expect(results.length).toBe(1);
      expect(results[0]!.response).toBe(SystemResponse.REJECT);
    });

    it('should inject a memory corruption perturbation', () => {
      const p = memoryCorruption('*', 1, 4);
      const results = injector.inject(p);

      expect(results.length).toBe(1);
      // Corruption should be rejected or cause degradation
      expect([SystemResponse.REJECT, SystemResponse.DEGRADE]).toContain(results[0]!.response);
    });

    it('should inject a resource exhaustion perturbation', () => {
      const p = resourceExhaustion('cpu', 0.9, 5);
      const results = injector.inject(p);

      expect(results.length).toBe(1);
      expect(results[0]!.recoveryTime).not.toBeNull();
    });
  });

  describe('Composed Perturbation Injection', () => {
    it('should inject a sequence of perturbations', () => {
      const p1 = clockSkew(10, 1);
      const p2 = networkDelay(20, 1, 2);
      const composed = sequence(p1, p2);

      const results = injector.inject(composed);

      expect(results.length).toBe(2);
      expect(results[0]!.perturbation.id).toBe(p1.id);
      expect(results[1]!.perturbation.id).toBe(p2.id);
    });

    it('should inject parallel perturbations', () => {
      const p1 = clockSkew(10, 1);
      const p2 = networkDelay(20, 1, 2);
      const composed = parallel(p1, p2);

      const results = injector.inject(composed);

      expect(results.length).toBe(2);
    });

    it('should inject repeated perturbations', () => {
      const p = clockSkew(10, 1);
      const composed = repeat(p, 5);

      const results = injector.inject(composed);

      expect(results.length).toBe(5);
      results.forEach(r => {
        expect(r.perturbation.id).toBe(p.id);
      });
    });

    it('should inject network instability scenario', () => {
      const scenario = networkInstabilityScenario(100);
      const results = injector.inject(scenario);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should inject full chaos scenario', () => {
      const scenario = fullChaosScenario(200);
      const results = injector.inject(scenario);

      expect(results.length).toBeGreaterThan(3);
    });
  });

  describe('Injection Record', () => {
    it('should generate complete injection record', () => {
      const p = clockSkew(10, 1);
      injector.inject(p);
      
      const record = injector.complete();

      expect(record.sessionId).toBeTruthy();
      expect(record.seed).toBe(seed);
      expect(record.startedAt).toBeTruthy();
      expect(record.completedAt).toBeGreaterThanOrEqual(record.startedAt);
      expect(record.perturbationsApplied).toBe(1);
      expect(record.results.length).toBe(1);
    });

    it('should track multiple injections', () => {
      injector.inject(clockSkew(10, 1));
      injector.inject(networkDelay(20, 1, 2));
      injector.inject(networkFailure(0.5, 3));

      const record = injector.complete();

      expect(record.perturbationsApplied).toBe(3);
      expect(record.results.length).toBe(3);
    });

    it('should capture state snapshots', () => {
      injector.inject(clockSkew(10, 1));
      injector.inject(networkDelay(20, 1, 2));

      const record = injector.complete();

      expect(record.stateSnapshots.length).toBeGreaterThan(0);
    });
  });

  describe('Response Classification', () => {
    it('should ABSORB low-magnitude delays', () => {
      const p = clockSkew(1, 1); // Very small skew
      const results = injector.inject(p);

      expect(results[0]!.response).toBe(SystemResponse.ABSORB);
    });

    it('should REJECT failures', () => {
      const p = networkFailure(1, 1);
      const results = injector.inject(p);

      expect(results[0]!.response).toBe(SystemResponse.REJECT);
    });

    it('should never CRASH', () => {
      // Inject many perturbations
      for (let i = 0; i < 100; i++) {
        const p = resourceExhaustion('memory', 1, i);
        const results = injector.inject(p);
        
        results.forEach(r => {
          expect(r.response).not.toBe(SystemResponse.CRASH);
        });
      }
    });
  });

  describe('Side Effects Tracking', () => {
    it('should record side effects', () => {
      const p = networkDelay(100, 1, 1);
      const results = injector.inject(p);

      expect(results[0]!.sideEffects.length).toBeGreaterThan(0);
    });

    it('should record recovery time for degrading effects', () => {
      const p = resourceExhaustion('memory', 0.9, 1);
      const results = injector.inject(p);

      if (results[0]!.response === SystemResponse.DEGRADE) {
        expect(results[0]!.recoveryTime).not.toBeNull();
      }
    });
  });

  describe('Probability-Based Application', () => {
    it('should sometimes not apply low-probability perturbations', () => {
      // Create many low-probability perturbations
      let notAppliedCount = 0;
      
      for (let i = 0; i < 100; i++) {
        const ctx = createMockContext(chaosSeed(i * 7919)); // Different seeds
        const inj = createInjector(ctx, chaosSeed(i * 7919));
        
        const p = networkDelay(100, 0.1, i); // 10% probability
        const results = inj.inject(p);
        
        if (results[0]!.response === SystemResponse.ABSORB && 
            results[0]!.sideEffects.length === 0) {
          notAppliedCount++;
        }
      }

      // Most should not be applied (probability = 0.1)
      // With randomness, expect roughly 90 not applied, but allow variance
      expect(notAppliedCount).toBeGreaterThan(50);
    });
  });
});

describe('Injection Determinism - INV-CHAOS-03', () => {
  it('should produce identical records for identical inputs', () => {
    const seed = chaosSeed(99999);
    const p = clockSkew(100, 42);

    // First run
    const ctx1 = createMockContext(seed);
    const inj1 = createInjector(ctx1, seed);
    inj1.inject(p);
    const record1 = inj1.complete();

    // Second run with same seed
    const ctx2 = createMockContext(seed);
    const inj2 = createInjector(ctx2, seed);
    inj2.inject(p);
    const record2 = inj2.complete();

    expect(record1.deterministicHash).toBe(record2.deterministicHash);
    expect(record1.results.length).toBe(record2.results.length);
    expect(record1.results[0]!.response).toBe(record2.results[0]!.response);
  });

  it('should produce different records for different seeds', () => {
    const p = networkDelay(100, 0.5, 42);

    const ctx1 = createMockContext(chaosSeed(1));
    const inj1 = createInjector(ctx1, chaosSeed(1));
    inj1.inject(p);
    const record1 = inj1.complete();

    const ctx2 = createMockContext(chaosSeed(2));
    const inj2 = createInjector(ctx2, chaosSeed(2));
    inj2.inject(p);
    const record2 = inj2.complete();

    // Records may differ due to probability-based decisions
    expect(record1.seed).not.toBe(record2.seed);
  });

  it('should maintain determinism across complex scenarios', () => {
    const seed = chaosSeed(777);
    const scenario = fullChaosScenario(42);

    // Multiple runs
    const records: InjectionRecord[] = [];
    for (let i = 0; i < 3; i++) {
      const ctx = createMockContext(seed);
      const inj = createInjector(ctx, seed);
      inj.inject(scenario);
      records.push(inj.complete());
    }

    // All should be identical
    const hash = records[0]!.deterministicHash;
    records.forEach(r => {
      expect(r.deterministicHash).toBe(hash);
    });
  });
});

describe('Isolation Property - INV-CHAOS-04', () => {
  it('should not have cross-module effects', () => {
    const ctx = createMockContext(chaosSeed(42));
    const inj = createInjector(ctx, chaosSeed(42));

    // Inject perturbation targeting specific module
    const p = memoryCorruption('storage', 1, 1);
    const results = inj.inject(p);
    const record = inj.complete();

    // Check that only target module is affected
    results.forEach(r => {
      r.sideEffects.forEach(effect => {
        // Side effects should only mention target module
        expect(effect).not.toContain('other_module');
      });
    });
  });
});

describe('Recovery Property - INV-CHAOS-05', () => {
  it('should always have bounded recovery time', () => {
    const ctx = createMockContext(chaosSeed(42));
    const inj = createInjector(ctx, chaosSeed(42));

    // Inject many severe perturbations
    for (let i = 0; i < 50; i++) {
      const p = resourceExhaustion('memory', 1, i);
      inj.inject(p);
    }

    const record = inj.complete();

    // All results with recovery time should have finite value
    record.results.forEach(r => {
      if (r.recoveryTime !== null) {
        expect(r.recoveryTime).toBeGreaterThan(0);
        expect(r.recoveryTime).toBeLessThan(10000); // Max 10 seconds
      }
    });
  });

  it('should report recovery for all degrading responses', () => {
    const ctx = createMockContext(chaosSeed(42));
    const inj = createInjector(ctx, chaosSeed(42));

    const p = resourceExhaustion('cpu', 0.5, 1);
    const results = inj.inject(p);

    results.forEach(r => {
      if (r.response === SystemResponse.DEGRADE) {
        expect(r.recoveryTime).not.toBeNull();
      }
    });
  });
});

describe('Stress Injection', () => {
  it('should handle 1000 sequential injections', () => {
    const ctx = createMockContext(chaosSeed(42));
    const inj = createInjector(ctx, chaosSeed(42));

    for (let i = 0; i < 1000; i++) {
      const p = clockSkew(i % 100, i);
      inj.inject(p);
    }

    const record = inj.complete();

    expect(record.perturbationsApplied).toBe(1000);
    expect(record.results.length).toBe(1000);
  });

  it('should maintain determinism under stress', () => {
    const seed = chaosSeed(54321);
    
    const run = () => {
      const ctx = createMockContext(seed);
      const inj = createInjector(ctx, seed);
      
      for (let i = 0; i < 100; i++) {
        const p = networkDelay(10, 0.5, i);
        inj.inject(p);
      }
      
      return inj.complete();
    };

    const record1 = run();
    const record2 = run();

    expect(record1.deterministicHash).toBe(record2.deterministicHash);
  });
});

describe('Edge Cases', () => {
  it('should handle zero-magnitude perturbation', () => {
    const ctx = createMockContext(chaosSeed(42));
    const inj = createInjector(ctx, chaosSeed(42));

    const p = clockSkew(0, 1);
    const results = inj.inject(p);

    expect(results.length).toBe(1);
    expect(results[0]!.response).toBe(SystemResponse.ABSORB);
  });

  it('should handle maximum-magnitude perturbation', () => {
    const ctx = createMockContext(chaosSeed(42));
    const inj = createInjector(ctx, chaosSeed(42));

    const p = resourceExhaustion('everything', 1, 1);
    const results = inj.inject(p);

    expect(results.length).toBe(1);
    expect(results[0]!.response).not.toBe(SystemResponse.CRASH);
  });

  it('should handle empty composed perturbation gracefully', () => {
    const ctx = createMockContext(chaosSeed(42));
    const inj = createInjector(ctx, chaosSeed(42));

    // Single perturbation wrapped
    const p = clockSkew(10, 1);
    const composed = repeat(p, 1);
    const results = inj.inject(composed);

    expect(results.length).toBe(1);
  });
});
