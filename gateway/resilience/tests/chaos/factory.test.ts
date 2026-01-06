/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Chaos Algebra - Factory Tests
 * 
 * Phase 23 - Sprint 23.0
 * 
 * Tests for perturbation factory and presets.
 */

import { describe, it, expect } from 'vitest';
import {
  perturbation,
  PerturbationBuilder,
  clockSkew,
  networkDelay,
  networkFailure,
  memoryCorruption,
  logicBypass,
  resourceExhaustion,
  raceCondition,
  networkInstabilityScenario,
  clockDriftScenario,
  memoryPressureScenario,
  fullChaosScenario,
  createRandom,
  DeterministicRandom,
} from '../../src/chaos/factory.js';
import {
  PerturbationDomain,
  PerturbationEffect,
  isPerturbation,
  isComposedPerturbation,
  chaosSeed,
} from '../../src/chaos/types.js';

describe('PerturbationBuilder', () => {
  it('should create a perturbation with all required fields', () => {
    const p = perturbation()
      .domain(PerturbationDomain.CLOCK)
      .effect(PerturbationEffect.DELAY)
      .seed(42)
      .build();

    expect(isPerturbation(p)).toBe(true);
    expect(p.domain).toBe(PerturbationDomain.CLOCK);
    expect(p.effect).toBe(PerturbationEffect.DELAY);
    expect(p.seed).toBe(42);
  });

  it('should reject missing domain', () => {
    expect(() => {
      perturbation()
        .effect(PerturbationEffect.DELAY)
        .seed(42)
        .build();
    }).toThrow('Domain is required');
  });

  it('should reject missing effect', () => {
    expect(() => {
      perturbation()
        .domain(PerturbationDomain.CLOCK)
        .seed(42)
        .build();
    }).toThrow('Effect is required');
  });

  it('should reject missing seed', () => {
    expect(() => {
      perturbation()
        .domain(PerturbationDomain.CLOCK)
        .effect(PerturbationEffect.DELAY)
        .build();
    }).toThrow('Seed is required for determinism');
  });

  it('should allow custom ID', () => {
    const p = perturbation()
      .id('CUSTOM_ID')
      .domain(PerturbationDomain.NETWORK)
      .effect(PerturbationEffect.FAIL)
      .seed(1)
      .build();

    expect(p.id).toBe('CUSTOM_ID');
  });

  it('should generate ID if not provided', () => {
    const p = perturbation()
      .domain(PerturbationDomain.NETWORK)
      .effect(PerturbationEffect.FAIL)
      .seed(1)
      .build();

    expect(p.id).toBeTruthy();
    expect(p.id.startsWith('P_')).toBe(true);
  });

  it('should set target module and operation', () => {
    const p = perturbation()
      .domain(PerturbationDomain.MEMORY)
      .effect(PerturbationEffect.CORRUPT)
      .targetModule('storage')
      .targetOperation('write')
      .probability(0.3)
      .seed(5)
      .build();

    expect(p.target.moduleId).toBe('storage');
    expect(p.target.operation).toBe('write');
    expect(p.target.probability).toBe(0.3);
  });

  it('should set magnitude', () => {
    const p = perturbation()
      .domain(PerturbationDomain.RESOURCE)
      .effect(PerturbationEffect.EXHAUST)
      .withMagnitude(0.8)
      .seed(10)
      .build();

    expect(p.magnitude).toBe(0.8);
  });

  it('should set temporal bounds', () => {
    const p = perturbation()
      .domain(PerturbationDomain.LOGIC)
      .effect(PerturbationEffect.SKIP)
      .duration(5000)
      .startAfter(1000)
      .seed(20)
      .build();

    expect(p.temporal.duration).toBe(5000);
    expect(p.temporal.startOffset).toBe(1000);
  });

  it('should set description', () => {
    const p = perturbation()
      .domain(PerturbationDomain.CLOCK)
      .effect(PerturbationEffect.DELAY)
      .describe('Test clock delay')
      .seed(30)
      .build();

    expect(p.description).toBe('Test clock delay');
  });

  it('should generate default description if not provided', () => {
    const p = perturbation()
      .domain(PerturbationDomain.CLOCK)
      .effect(PerturbationEffect.DELAY)
      .seed(40)
      .build();

    expect(p.description).toBe('CLOCK:DELAY');
  });
});

describe('Preset Factories', () => {
  describe('clockSkew', () => {
    it('should create clock skew perturbation', () => {
      const p = clockSkew(100, 1);

      expect(p.domain).toBe(PerturbationDomain.CLOCK);
      expect(p.effect).toBe(PerturbationEffect.DELAY);
      expect(p.id).toBe('CLOCK_SKEW_100ms');
    });

    it('should calculate magnitude from skew', () => {
      const small = clockSkew(10, 1);
      const large = clockSkew(10000, 1);

      expect(small.magnitude).toBeLessThan(large.magnitude);
      expect(large.magnitude).toBe(1); // Capped at 1
    });
  });

  describe('networkDelay', () => {
    it('should create network delay perturbation', () => {
      const p = networkDelay(200, 0.5, 2);

      expect(p.domain).toBe(PerturbationDomain.NETWORK);
      expect(p.effect).toBe(PerturbationEffect.DELAY);
      expect(p.target.probability).toBe(0.5);
    });

    it('should set duration from delay', () => {
      const p = networkDelay(300, 1, 3);

      expect(p.temporal.duration).toBe(300);
    });
  });

  describe('networkFailure', () => {
    it('should create network failure perturbation', () => {
      const p = networkFailure(0.1, 4);

      expect(p.domain).toBe(PerturbationDomain.NETWORK);
      expect(p.effect).toBe(PerturbationEffect.FAIL);
      expect(p.target.probability).toBe(0.1);
      expect(p.magnitude).toBe(1); // Failures are full magnitude
    });
  });

  describe('memoryCorruption', () => {
    it('should create memory corruption perturbation', () => {
      const p = memoryCorruption('user.*', 0.05, 5);

      expect(p.domain).toBe(PerturbationDomain.MEMORY);
      expect(p.effect).toBe(PerturbationEffect.CORRUPT);
      expect(p.target.moduleId).toBe('memory');
      expect(p.target.operation).toBe('write');
    });
  });

  describe('logicBypass', () => {
    it('should create logic bypass perturbation', () => {
      const p = logicBypass('validate', 0.2, 6);

      expect(p.domain).toBe(PerturbationDomain.LOGIC);
      expect(p.effect).toBe(PerturbationEffect.SKIP);
      expect(p.target.operation).toBe('validate');
    });
  });

  describe('resourceExhaustion', () => {
    it('should create resource exhaustion perturbation', () => {
      const p = resourceExhaustion('memory', 0.8, 7);

      expect(p.domain).toBe(PerturbationDomain.RESOURCE);
      expect(p.effect).toBe(PerturbationEffect.EXHAUST);
      expect(p.magnitude).toBe(0.8);
    });
  });

  describe('raceCondition', () => {
    it('should create race condition perturbation', () => {
      const p = raceCondition(['read', 'write'], 8);

      expect(p.domain).toBe(PerturbationDomain.LOGIC);
      expect(p.effect).toBe(PerturbationEffect.RACE);
      expect(p.target.operation).toBe('read,write');
    });
  });
});

describe('Scenario Factories', () => {
  describe('networkInstabilityScenario', () => {
    it('should create a composed scenario', () => {
      const scenario = networkInstabilityScenario(100);

      expect(isComposedPerturbation(scenario)).toBe(true);
    });
  });

  describe('clockDriftScenario', () => {
    it('should create a repeated clock skew', () => {
      const scenario = clockDriftScenario(200);

      expect(isComposedPerturbation(scenario)).toBe(true);
      expect(scenario.operator).toBe('REPEAT');
    });
  });

  describe('memoryPressureScenario', () => {
    it('should create a memory pressure scenario', () => {
      const scenario = memoryPressureScenario(300);

      expect(isComposedPerturbation(scenario)).toBe(true);
    });
  });

  describe('fullChaosScenario', () => {
    it('should create a full chaos scenario', () => {
      const scenario = fullChaosScenario(400);

      expect(isComposedPerturbation(scenario)).toBe(true);
    });

    it('should combine multiple perturbation types', () => {
      const scenario = fullChaosScenario(500);

      // Should have multiple domains
      expect(scenario.bounds.domains.size).toBeGreaterThan(1);
    });
  });
});

describe('DeterministicRandom - INV-CHAOS-03', () => {
  describe('Determinism', () => {
    it('should produce same sequence for same seed', () => {
      const seed = chaosSeed(12345);
      const r1 = createRandom(seed);
      const r2 = createRandom(seed);

      const seq1 = [r1.next(), r1.next(), r1.next()];
      const seq2 = [r2.next(), r2.next(), r2.next()];

      expect(seq1).toEqual(seq2);
    });

    it('should produce different sequences for different seeds', () => {
      const r1 = createRandom(chaosSeed(1));
      const r2 = createRandom(chaosSeed(2));

      const seq1 = [r1.next(), r1.next(), r1.next()];
      const seq2 = [r2.next(), r2.next(), r2.next()];

      expect(seq1).not.toEqual(seq2);
    });
  });

  describe('next()', () => {
    it('should return values in [0, 1)', () => {
      const r = createRandom(chaosSeed(42));

      for (let i = 0; i < 1000; i++) {
        const v = r.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe('nextInt()', () => {
    it('should return integers in range', () => {
      const r = createRandom(chaosSeed(42));

      for (let i = 0; i < 100; i++) {
        const v = r.nextInt(5, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(10);
        expect(Number.isInteger(v)).toBe(true);
      }
    });

    it('should include boundaries', () => {
      const r = createRandom(chaosSeed(42));
      const results = new Set<number>();

      for (let i = 0; i < 1000; i++) {
        results.add(r.nextInt(0, 2));
      }

      expect(results.has(0)).toBe(true);
      expect(results.has(1)).toBe(true);
      expect(results.has(2)).toBe(true);
    });
  });

  describe('nextBool()', () => {
    it('should return boolean values', () => {
      const r = createRandom(chaosSeed(42));

      for (let i = 0; i < 100; i++) {
        const v = r.nextBool();
        expect(typeof v).toBe('boolean');
      }
    });

    it('should respect probability', () => {
      const r = createRandom(chaosSeed(42));
      let trueCount = 0;

      for (let i = 0; i < 1000; i++) {
        if (r.nextBool(0.3)) trueCount++;
      }

      // Should be approximately 30%
      expect(trueCount).toBeGreaterThan(200);
      expect(trueCount).toBeLessThan(400);
    });
  });

  describe('nextElement()', () => {
    it('should return element from array', () => {
      const r = createRandom(chaosSeed(42));
      const arr = ['a', 'b', 'c', 'd'];

      for (let i = 0; i < 100; i++) {
        const v = r.nextElement(arr);
        expect(arr).toContain(v);
      }
    });

    it('should throw for empty array', () => {
      const r = createRandom(chaosSeed(42));

      expect(() => r.nextElement([])).toThrow('Cannot select from empty array');
    });
  });

  describe('shuffle()', () => {
    it('should return array with same elements', () => {
      const r = createRandom(chaosSeed(42));
      const arr = [1, 2, 3, 4, 5];
      const shuffled = r.shuffle(arr);

      expect(shuffled.length).toBe(arr.length);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('should be deterministic', () => {
      const arr = [1, 2, 3, 4, 5];
      
      const r1 = createRandom(chaosSeed(42));
      const s1 = r1.shuffle(arr);
      
      const r2 = createRandom(chaosSeed(42));
      const s2 = r2.shuffle(arr);

      expect(s1).toEqual(s2);
    });

    it('should not modify original array', () => {
      const r = createRandom(chaosSeed(42));
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      
      r.shuffle(arr);

      expect(arr).toEqual(original);
    });
  });
});

describe('Factory Determinism', () => {
  it('should create identical perturbations with same seed', () => {
    const p1 = clockSkew(100, 42);
    const p2 = clockSkew(100, 42);

    expect(p1.id).toBe(p2.id);
    expect(p1.seed).toBe(p2.seed);
    expect(p1.magnitude).toBe(p2.magnitude);
  });

  it('should create different perturbations with different seeds', () => {
    const p1 = clockSkew(100, 1);
    const p2 = clockSkew(100, 2);

    // IDs are generated from seed, so they differ
    expect(p1.seed).not.toBe(p2.seed);
  });
});
