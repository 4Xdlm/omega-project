/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Chaos Algebra - Injector
 * 
 * Phase 23 - Sprint 23.0
 * 
 * Applies perturbations to a target system deterministically.
 * Records all effects for proof generation.
 * 
 * INVARIANTS:
 * - INV-CHAOS-03: Déterminisme - same_seed(p) ⇒ same_effect(p)
 * - INV-CHAOS-04: Isolation - effect(p, module_A) ∩ state(module_B) = ∅
 * - INV-CHAOS-05: Récupération - ∀p, ◇(system_state = nominal)
 */

import {
  Perturbation,
  ComposedPerturbation,
  PerturbationResult,
  SystemResponse,
  PerturbationDomain,
  PerturbationEffect,
  isPerturbation,
  isComposedPerturbation,
  timestampMs,
  durationMs,
  magnitude,
  TimestampMs,
  DurationMs,
  Magnitude,
  ChaosSeed,
  CompositionOperator,
} from './types.js';
import { createRandom, DeterministicRandom } from './factory.js';
import { flatten } from './composition.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INJECTION CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Context for injection - provides deterministic time and randomness
 */
export interface InjectionContext {
  /** Current timestamp */
  readonly now: () => TimestampMs;
  /** Deterministic random generator */
  readonly random: DeterministicRandom;
  /** Module state accessor */
  readonly getModuleState: (moduleId: string) => ModuleState;
  /** Apply effect to module */
  readonly applyEffect: (moduleId: string, effect: AppliedEffect) => void;
}

/**
 * State of a module
 */
export interface ModuleState {
  readonly moduleId: string;
  readonly isHealthy: boolean;
  readonly lastOperation: string | null;
  readonly operationCount: number;
  readonly errorCount: number;
}

/**
 * Effect applied to a module
 */
export interface AppliedEffect {
  readonly perturbationId: string;
  readonly domain: PerturbationDomain;
  readonly effect: PerturbationEffect;
  readonly magnitude: Magnitude;
  readonly startedAt: TimestampMs;
  readonly expiresAt: TimestampMs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INJECTION RECORD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete record of an injection session
 */
export interface InjectionRecord {
  readonly sessionId: string;
  readonly seed: ChaosSeed;
  readonly startedAt: TimestampMs;
  readonly completedAt: TimestampMs;
  readonly perturbationsApplied: number;
  readonly results: ReadonlyArray<PerturbationResult>;
  readonly stateSnapshots: ReadonlyArray<StateSnapshot>;
  /** Determinism hash - same for identical runs */
  readonly deterministicHash: string;
}

/**
 * Snapshot of system state at a point in time
 */
export interface StateSnapshot {
  readonly timestamp: TimestampMs;
  readonly moduleStates: ReadonlyMap<string, ModuleState>;
  readonly activeEffects: ReadonlyArray<AppliedEffect>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS INJECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chaos Injector - applies perturbations deterministically
 */
export class ChaosInjector {
  private readonly context: InjectionContext;
  private readonly results: PerturbationResult[] = [];
  private readonly snapshots: StateSnapshot[] = [];
  private readonly activeEffects: Map<string, AppliedEffect> = new Map();
  private readonly sessionId: string;
  private readonly seed: ChaosSeed;
  private readonly startedAt: TimestampMs;

  constructor(context: InjectionContext, seed: ChaosSeed) {
    this.context = context;
    this.seed = seed;
    this.sessionId = `INJ_${seed}_${context.now()}`;
    this.startedAt = context.now();
  }

  /**
   * Inject a perturbation (or composed perturbation)
   */
  inject(p: Perturbation | ComposedPerturbation): PerturbationResult[] {
    if (isPerturbation(p)) {
      return [this.injectSingle(p)];
    }
    
    return this.injectComposed(p);
  }

  /**
   * Inject a single perturbation
   */
  private injectSingle(p: Perturbation): PerturbationResult {
    const now = this.context.now();
    
    // Take state snapshot before
    this.takeSnapshot();
    
    // Check if perturbation should apply (probability)
    const shouldApply = this.context.random.next() < p.target.probability;
    
    if (!shouldApply) {
      const result = this.createResult(p, SystemResponse.ABSORB, now, [], null);
      this.results.push(result);
      return result;
    }
    
    // Check target module
    const moduleState = this.context.getModuleState(p.target.moduleId);
    
    // Apply the perturbation
    const { response, sideEffects, recoveryTime } = this.applyPerturbation(p, moduleState);
    
    // Record the effect
    const effect: AppliedEffect = {
      perturbationId: p.id,
      domain: p.domain,
      effect: p.effect,
      magnitude: p.magnitude,
      startedAt: now,
      expiresAt: timestampMs(now + p.temporal.duration),
    };
    
    this.activeEffects.set(p.id, effect);
    this.context.applyEffect(p.target.moduleId, effect);
    
    // Take state snapshot after
    this.takeSnapshot();
    
    const result = this.createResult(p, response, now, sideEffects, recoveryTime);
    this.results.push(result);
    
    return result;
  }

  /**
   * Inject a composed perturbation
   */
  private injectComposed(cp: ComposedPerturbation): PerturbationResult[] {
    switch (cp.operator) {
      case CompositionOperator.SEQUENCE:
        return this.injectSequence(cp);
      case CompositionOperator.PARALLEL:
        return this.injectParallel(cp);
      case CompositionOperator.CHOICE:
        return this.injectChoice(cp);
      case CompositionOperator.REPEAT:
        return this.injectRepeat(cp);
      case CompositionOperator.CONDITIONAL:
        return this.injectConditional(cp);
      default:
        throw new Error(`Unknown operator: ${cp.operator}`);
    }
  }

  private injectSequence(cp: ComposedPerturbation): PerturbationResult[] {
    const results: PerturbationResult[] = [];
    const params = cp.params as { type: 'SEQUENCE'; gap: DurationMs };
    
    for (let i = 0; i < cp.operands.length; i++) {
      const operand = cp.operands[i]!;
      
      if (i > 0 && params.gap > 0) {
        // Simulate gap
        this.simulateDelay(params.gap);
      }
      
      results.push(...this.inject(operand));
    }
    
    return results;
  }

  private injectParallel(cp: ComposedPerturbation): PerturbationResult[] {
    // In parallel, we inject all at the "same" time
    // For determinism, we process in order but mark same timestamp
    const results: PerturbationResult[] = [];
    
    for (const operand of cp.operands) {
      results.push(...this.inject(operand));
    }
    
    return results;
  }

  private injectChoice(cp: ComposedPerturbation): PerturbationResult[] {
    const params = cp.params as { type: 'CHOICE'; weights: ReadonlyArray<number> };
    
    // Select based on weights
    const rand = this.context.random.next();
    let cumulative = 0;
    
    for (let i = 0; i < cp.operands.length; i++) {
      cumulative += params.weights[i]!;
      if (rand < cumulative) {
        return this.inject(cp.operands[i]!);
      }
    }
    
    // Fallback to last (shouldn't happen if weights sum to 1)
    return this.inject(cp.operands[cp.operands.length - 1]!);
  }

  private injectRepeat(cp: ComposedPerturbation): PerturbationResult[] {
    const params = cp.params as { type: 'REPEAT'; count: number; interval: DurationMs };
    const results: PerturbationResult[] = [];
    
    for (let i = 0; i < params.count; i++) {
      if (i > 0 && params.interval > 0) {
        this.simulateDelay(params.interval);
      }
      
      results.push(...this.inject(cp.operands[0]!));
    }
    
    return results;
  }

  private injectConditional(cp: ComposedPerturbation): PerturbationResult[] {
    const params = cp.params as { type: 'CONDITIONAL'; condition: string };
    
    // Evaluate condition (simplified - just check if it's truthy)
    // In production, this would be a proper expression evaluator
    const conditionMet = this.evaluateCondition(params.condition);
    
    if (conditionMet) {
      return this.inject(cp.operands[0]!);
    }
    
    return [];
  }

  /**
   * Apply a perturbation and determine system response
   */
  private applyPerturbation(
    p: Perturbation,
    moduleState: ModuleState
  ): { response: SystemResponse; sideEffects: string[]; recoveryTime: DurationMs | null } {
    const sideEffects: string[] = [];
    let response: SystemResponse;
    let recoveryTime: DurationMs | null = null;
    
    // Determine response based on perturbation type and magnitude
    switch (p.effect) {
      case PerturbationEffect.DELAY:
        // Delays are always absorbed
        response = SystemResponse.ABSORB;
        sideEffects.push(`latency_increase:${p.magnitude * 1000}ms`);
        break;
        
      case PerturbationEffect.SKIP:
        // Skips may be rejected or cause degradation
        if (p.magnitude < 0.5) {
          response = SystemResponse.ABSORB;
          sideEffects.push('operation_skipped_gracefully');
        } else {
          response = SystemResponse.DEGRADE;
          sideEffects.push('operation_skipped_with_fallback');
          recoveryTime = durationMs(Math.round(p.magnitude * 1000));
        }
        break;
        
      case PerturbationEffect.CORRUPT:
        // Corruption should be detected and rejected
        if (p.magnitude < 0.3) {
          response = SystemResponse.REJECT;
          sideEffects.push('corruption_detected_and_rejected');
        } else {
          response = SystemResponse.DEGRADE;
          sideEffects.push('partial_corruption_handled');
          recoveryTime = durationMs(Math.round(p.magnitude * 2000));
        }
        break;
        
      case PerturbationEffect.FAIL:
        // Failures are explicitly rejected
        response = SystemResponse.REJECT;
        sideEffects.push('failure_injected_and_handled');
        recoveryTime = durationMs(Math.round(p.magnitude * 500));
        break;
        
      case PerturbationEffect.EXHAUST:
        // Resource exhaustion causes degradation
        if (p.magnitude < 0.7) {
          response = SystemResponse.DEGRADE;
          sideEffects.push(`resource_pressure:${p.magnitude * 100}%`);
        } else {
          response = SystemResponse.REJECT;
          sideEffects.push('resource_exhaustion_rejected');
        }
        recoveryTime = durationMs(Math.round(p.magnitude * 3000));
        break;
        
      case PerturbationEffect.RACE:
        // Race conditions may or may not be detected
        if (this.context.random.next() < 0.8) {
          response = SystemResponse.ABSORB;
          sideEffects.push('race_condition_avoided');
        } else {
          response = SystemResponse.DEGRADE;
          sideEffects.push('race_condition_detected');
          recoveryTime = durationMs(500);
        }
        break;
        
      default:
        response = SystemResponse.ABSORB;
    }
    
    return { response, sideEffects, recoveryTime };
  }

  /**
   * Create a perturbation result
   */
  private createResult(
    p: Perturbation,
    response: SystemResponse,
    appliedAt: TimestampMs,
    sideEffects: string[],
    recoveryTime: DurationMs | null
  ): PerturbationResult {
    return {
      perturbation: p,
      response,
      appliedAt,
      measuredMagnitude: p.magnitude,
      sideEffects,
      recoveryTime,
    };
  }

  /**
   * Take a snapshot of current state
   */
  private takeSnapshot(): void {
    const moduleStates = new Map<string, ModuleState>();
    
    // Collect all known module states
    for (const effect of this.activeEffects.values()) {
      const state = this.context.getModuleState(effect.perturbationId);
      moduleStates.set(state.moduleId, state);
    }
    
    this.snapshots.push({
      timestamp: this.context.now(),
      moduleStates,
      activeEffects: [...this.activeEffects.values()],
    });
  }

  /**
   * Simulate a delay (for testing purposes)
   */
  private simulateDelay(_duration: DurationMs): void {
    // In real implementation, this would advance the clock
    // For now, it's a no-op since we use injected clock
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: string): boolean {
    // Simplified condition evaluation
    // In production, this would be a proper expression evaluator
    return condition.toLowerCase() !== 'false' && condition !== '0' && condition !== '';
  }

  /**
   * Complete the injection session and generate record
   */
  complete(): InjectionRecord {
    const completedAt = this.context.now();
    
    // Calculate deterministic hash
    const hashInput = this.results.map(r => 
      `${r.perturbation.id}:${r.response}:${r.appliedAt}`
    ).join('|');
    
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return {
      sessionId: this.sessionId,
      seed: this.seed,
      startedAt: this.startedAt,
      completedAt,
      perturbationsApplied: this.results.length,
      results: [...this.results],
      stateSnapshots: [...this.snapshots],
      deterministicHash: `0x${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a chaos injector with given seed
 */
export function createInjector(context: InjectionContext, seed: ChaosSeed): ChaosInjector {
  return new ChaosInjector(context, seed);
}

/**
 * Create a mock injection context for testing
 */
export function createMockContext(seed: ChaosSeed): InjectionContext {
  let currentTime = 1704067200000; // 2024-01-01 00:00:00 UTC
  const moduleStates = new Map<string, ModuleState>();
  const appliedEffects: AppliedEffect[] = [];
  
  return {
    now: () => timestampMs(currentTime++),
    random: createRandom(seed),
    getModuleState: (moduleId: string): ModuleState => {
      let state = moduleStates.get(moduleId);
      if (!state) {
        state = {
          moduleId,
          isHealthy: true,
          lastOperation: null,
          operationCount: 0,
          errorCount: 0,
        };
        moduleStates.set(moduleId, state);
      }
      return state;
    },
    applyEffect: (_moduleId: string, effect: AppliedEffect): void => {
      appliedEffects.push(effect);
    },
  };
}
