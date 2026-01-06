/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Chaos Algebra - Perturbation Factory
 * 
 * Phase 23 - Sprint 23.0
 * 
 * Type-safe factory for creating perturbations.
 * Ensures all perturbations are well-formed and deterministic.
 * 
 * INVARIANT: INV-CHAOS-03 - same_seed(p) ⇒ same_effect(p)
 */

import {
  Perturbation,
  PerturbationDomain,
  PerturbationEffect,
  PerturbationTarget,
  TemporalBounds,
  perturbationId,
  chaosSeed,
  magnitude,
  durationMs,
  DEFAULT_TEMPORAL_BOUNDS,
  PerturbationId,
  ChaosSeed,
  Magnitude,
  DurationMs,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER PATTERN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fluent builder for creating perturbations
 */
export class PerturbationBuilder {
  private _id?: PerturbationId;
  private _domain?: PerturbationDomain;
  private _effect?: PerturbationEffect;
  private _target: Partial<PerturbationTarget> = {};
  private _magnitude: Magnitude = magnitude(0.5);
  private _temporal: TemporalBounds = DEFAULT_TEMPORAL_BOUNDS;
  private _seed?: ChaosSeed;
  private _description: string = '';

  /**
   * Set the perturbation ID
   */
  id(value: string): this {
    this._id = perturbationId(value);
    return this;
  }

  /**
   * Set the perturbation domain
   */
  domain(value: PerturbationDomain): this {
    this._domain = value;
    return this;
  }

  /**
   * Set the perturbation effect
   */
  effect(value: PerturbationEffect): this {
    this._effect = value;
    return this;
  }

  /**
   * Set the target module
   */
  targetModule(moduleId: string): this {
    this._target.moduleId = moduleId;
    return this;
  }

  /**
   * Set the target operation
   */
  targetOperation(operation: string): this {
    this._target.operation = operation;
    return this;
  }

  /**
   * Set the target probability
   */
  probability(value: number): this {
    this._target.probability = magnitude(value);
    return this;
  }

  /**
   * Set the effect magnitude
   */
  withMagnitude(value: number): this {
    this._magnitude = magnitude(value);
    return this;
  }

  /**
   * Set temporal bounds
   */
  temporal(bounds: Partial<TemporalBounds>): this {
    this._temporal = {
      startOffset: bounds.startOffset ?? this._temporal.startOffset,
      duration: bounds.duration ?? this._temporal.duration,
      repeatInterval: bounds.repeatInterval ?? this._temporal.repeatInterval,
      maxRepetitions: bounds.maxRepetitions ?? this._temporal.maxRepetitions,
    };
    return this;
  }

  /**
   * Set the duration
   */
  duration(ms: number): this {
    this._temporal = { ...this._temporal, duration: durationMs(ms) };
    return this;
  }

  /**
   * Set the start offset
   */
  startAfter(ms: number): this {
    this._temporal = { ...this._temporal, startOffset: durationMs(ms) };
    return this;
  }

  /**
   * Set the seed for deterministic generation
   */
  seed(value: number): this {
    this._seed = chaosSeed(value);
    return this;
  }

  /**
   * Set the description
   */
  describe(value: string): this {
    this._description = value;
    return this;
  }

  /**
   * Build the perturbation
   */
  build(): Perturbation {
    if (!this._domain) {
      throw new Error('Domain is required');
    }
    if (!this._effect) {
      throw new Error('Effect is required');
    }
    if (this._seed === undefined) {
      throw new Error('Seed is required for determinism');
    }

    const id = this._id ?? this.generateId();
    const target: PerturbationTarget = {
      moduleId: this._target.moduleId ?? '*',
      operation: this._target.operation ?? '*',
      probability: this._target.probability ?? magnitude(1.0),
    };

    return {
      id,
      domain: this._domain,
      effect: this._effect,
      target,
      magnitude: this._magnitude,
      temporal: this._temporal,
      seed: this._seed,
      description: this._description || `${this._domain}:${this._effect}`,
    };
  }

  private generateId(): PerturbationId {
    const base = `${this._domain}_${this._effect}_${this._seed}`;
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return perturbationId(`P_${Math.abs(hash).toString(16).toUpperCase()}`);
  }
}

/**
 * Start building a perturbation
 */
export function perturbation(): PerturbationBuilder {
  return new PerturbationBuilder();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET FACTORIES - Common perturbation patterns
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clock skew perturbation
 * Injects time drift into the system clock
 * 
 * @param skewMs Amount of skew in milliseconds
 * @param seed Deterministic seed
 */
export function clockSkew(skewMs: number, seed: number): Perturbation {
  return perturbation()
    .id(`CLOCK_SKEW_${skewMs}ms`)
    .domain(PerturbationDomain.CLOCK)
    .effect(PerturbationEffect.DELAY)
    .withMagnitude(Math.min(1, Math.abs(skewMs) / 10000))
    .seed(seed)
    .describe(`Clock skew: ${skewMs}ms`)
    .build();
}

/**
 * Network delay perturbation
 * Adds latency to network operations
 * 
 * @param delayMs Delay in milliseconds
 * @param probability Probability of application [0, 1]
 * @param seed Deterministic seed
 */
export function networkDelay(delayMs: number, probability: number, seed: number): Perturbation {
  return perturbation()
    .id(`NET_DELAY_${delayMs}ms`)
    .domain(PerturbationDomain.NETWORK)
    .effect(PerturbationEffect.DELAY)
    .probability(probability)
    .withMagnitude(Math.min(1, delayMs / 5000))
    .duration(delayMs)
    .seed(seed)
    .describe(`Network delay: ${delayMs}ms @ ${probability * 100}%`)
    .build();
}

/**
 * Network failure perturbation
 * Causes network operations to fail
 * 
 * @param probability Probability of failure [0, 1]
 * @param seed Deterministic seed
 */
export function networkFailure(probability: number, seed: number): Perturbation {
  return perturbation()
    .id(`NET_FAIL_${Math.round(probability * 100)}`)
    .domain(PerturbationDomain.NETWORK)
    .effect(PerturbationEffect.FAIL)
    .probability(probability)
    .withMagnitude(1.0)
    .seed(seed)
    .describe(`Network failure: ${probability * 100}%`)
    .build();
}

/**
 * Memory corruption perturbation
 * Corrupts data in memory/storage
 * 
 * @param targetKey Key pattern to target
 * @param probability Probability of corruption [0, 1]
 * @param seed Deterministic seed
 */
export function memoryCorruption(targetKey: string, probability: number, seed: number): Perturbation {
  return perturbation()
    .id(`MEM_CORRUPT_${targetKey}`)
    .domain(PerturbationDomain.MEMORY)
    .effect(PerturbationEffect.CORRUPT)
    .targetModule('memory')
    .targetOperation('write')
    .probability(probability)
    .withMagnitude(0.8)
    .seed(seed)
    .describe(`Memory corruption: ${targetKey} @ ${probability * 100}%`)
    .build();
}

/**
 * Logic bypass perturbation
 * Causes operations to be skipped
 * 
 * @param operation Operation to skip
 * @param probability Probability of skip [0, 1]
 * @param seed Deterministic seed
 */
export function logicBypass(operation: string, probability: number, seed: number): Perturbation {
  return perturbation()
    .id(`LOGIC_SKIP_${operation}`)
    .domain(PerturbationDomain.LOGIC)
    .effect(PerturbationEffect.SKIP)
    .targetOperation(operation)
    .probability(probability)
    .withMagnitude(1.0)
    .seed(seed)
    .describe(`Logic bypass: ${operation} @ ${probability * 100}%`)
    .build();
}

/**
 * Resource exhaustion perturbation
 * Depletes system resources
 * 
 * @param resourceType Type of resource (cpu, memory, file_handles, etc.)
 * @param percentage Percentage to exhaust [0, 1]
 * @param seed Deterministic seed
 */
export function resourceExhaustion(resourceType: string, percentage: number, seed: number): Perturbation {
  return perturbation()
    .id(`RES_EXHAUST_${resourceType}`)
    .domain(PerturbationDomain.RESOURCE)
    .effect(PerturbationEffect.EXHAUST)
    .targetModule(resourceType)
    .withMagnitude(percentage)
    .seed(seed)
    .describe(`Resource exhaustion: ${resourceType} @ ${percentage * 100}%`)
    .build();
}

/**
 * Race condition perturbation
 * Creates timing-dependent behavior
 * 
 * @param operations Operations to race
 * @param seed Deterministic seed
 */
export function raceCondition(operations: string[], seed: number): Perturbation {
  return perturbation()
    .id(`RACE_${operations.join('_')}`)
    .domain(PerturbationDomain.LOGIC)
    .effect(PerturbationEffect.RACE)
    .targetOperation(operations.join(','))
    .withMagnitude(0.9)
    .seed(seed)
    .describe(`Race condition: ${operations.join(' vs ')}`)
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO FACTORIES - Pre-built chaos scenarios
// ═══════════════════════════════════════════════════════════════════════════════

import { sequence, parallel, choice, repeat } from './composition.js';

/**
 * Network instability scenario
 * Combines delays, failures, and recovery
 */
export function networkInstabilityScenario(seed: number): Perturbation | ReturnType<typeof sequence> {
  const delay = networkDelay(100, 0.3, seed);
  const fail = networkFailure(0.1, seed + 1);
  
  return sequence(
    parallel(delay, fail),
    networkDelay(50, 0.1, seed + 2)
  );
}

/**
 * Clock drift scenario
 * Progressive clock skew over time
 */
export function clockDriftScenario(seed: number): ReturnType<typeof repeat> {
  const smallSkew = clockSkew(10, seed);
  return repeat(smallSkew, 5, durationMs(100));
}

/**
 * Memory pressure scenario
 * Combination of corruption and exhaustion
 */
export function memoryPressureScenario(seed: number): ReturnType<typeof sequence> {
  const corruption = memoryCorruption('*', 0.05, seed);
  const exhaustion = resourceExhaustion('memory', 0.8, seed + 1);
  
  return sequence(exhaustion, corruption);
}

/**
 * Full chaos scenario
 * Combination of all perturbation types
 */
export function fullChaosScenario(seed: number): ReturnType<typeof parallel> {
  return parallel(
    networkInstabilityScenario(seed),
    parallel(
      clockDriftScenario(seed + 100),
      memoryPressureScenario(seed + 200)
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC RANDOM GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Seeded random number generator for deterministic chaos
 * Uses mulberry32 algorithm
 */
export class DeterministicRandom {
  private state: number;

  constructor(seed: ChaosSeed) {
    this.state = seed;
  }

  /**
   * Get next random number in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Get random integer in [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Get random boolean with given probability
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Select random element from array
   */
  nextElement<T>(array: ReadonlyArray<T>): T {
    if (array.length === 0) {
      throw new Error('Cannot select from empty array');
    }
    return array[this.nextInt(0, array.length - 1)]!;
  }

  /**
   * Shuffle array (deterministically)
   */
  shuffle<T>(array: ReadonlyArray<T>): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}

/**
 * Create a deterministic random generator
 */
export function createRandom(seed: ChaosSeed): DeterministicRandom {
  return new DeterministicRandom(seed);
}
