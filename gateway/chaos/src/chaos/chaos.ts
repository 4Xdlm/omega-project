/**
 * OMEGA CHAOS_HARNESS — Core Implementation
 * Phase 16.4 — Fault Injection & Resilience Testing
 * 
 * Controlled chaos engineering for testing system resilience.
 * 
 * INVARIANTS:
 * - INV-CHA-01: Faults only injected when enabled
 * - INV-CHA-02: Original behavior preserved when disabled
 * - INV-CHA-03: Fault probability respected
 * - INV-CHA-04: Experiments isolated
 * - INV-CHA-05: Metrics accurate
 * - INV-CHA-06: Safe shutdown
 */

import {
  FaultType,
  ExperimentState,
  InjectionResult,
  DEFAULT_CONFIG,
  CHAOS_VERSION,
  DEFAULT_LATENCY_MS,
  DEFAULT_ERROR_MESSAGE,
} from './constants.js';

import type {
  ChaosConfig,
  FaultConfig,
  ActiveFault,
  InjectionContext,
  InjectionAttempt,
  ExperimentDef,
  Experiment,
  ChaosMetrics,
  FaultMetrics,
  AuditEntry,
  AuditAction,
  WrapOptions,
  WrapResult,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDED RANDOM
// ═══════════════════════════════════════════════════════════════════════════════

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS HARNESS CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CHAOS_HARNESS — Fault Injection & Resilience Testing
 * 
 * Provides controlled chaos engineering capabilities.
 */
export class ChaosHarness {
  private config: ChaosConfig;
  private startTime: number;
  private faults: Map<string, ActiveFault>;
  private experiments: Map<string, Experiment>;
  private auditLog: AuditEntry[];
  private random: SeededRandom | null;
  private idCounter: number;
  
  private metrics: {
    totalAttempts: number;
    totalInjections: number;
    totalSkipped: number;
    totalDisabled: number;
    byFaultType: Record<FaultType, number>;
    completedExperiments: number;
  };

  constructor(config: Partial<ChaosConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    this.faults = new Map();
    this.experiments = new Map();
    this.auditLog = [];
    this.idCounter = 0;
    
    this.random = this.config.seed !== null 
      ? new SeededRandom(this.config.seed) 
      : null;
    
    this.metrics = {
      totalAttempts: 0,
      totalInjections: 0,
      totalSkipped: 0,
      totalDisabled: 0,
      byFaultType: Object.values(FaultType).reduce(
        (acc, type) => ({ ...acc, [type]: 0 }),
        {} as Record<FaultType, number>
      ),
      completedExperiments: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENABLE/DISABLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enable chaos injection globally
   * INV-CHA-01: Faults only injected when enabled
   */
  enable(): void {
    this.config.enabled = true;
    this.addAuditEntry('ENABLE', undefined, 'Chaos injection enabled');
  }

  /**
   * Disable chaos injection globally
   * INV-CHA-02: Original behavior preserved when disabled
   */
  disable(): void {
    this.config.enabled = false;
    this.addAuditEntry('DISABLE', undefined, 'Chaos injection disabled');
  }

  /**
   * Check if enabled
   */
  get enabled(): boolean {
    return this.config.enabled;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAULT REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a fault for injection
   */
  registerFault(config: FaultConfig): string {
    const id = this.generateId('FLT');
    
    const fault: ActiveFault = {
      id,
      config: {
        ...config,
        probability: config.probability ?? this.config.defaultProbability,
      },
      registeredAt: new Date().toISOString(),
      injectionCount: 0,
      skipCount: 0,
      active: true,
    };
    
    this.faults.set(id, fault);
    this.addAuditEntry('REGISTER_FAULT', id, `Registered ${config.type} fault`);
    
    return id;
  }

  /**
   * Unregister a fault
   */
  unregisterFault(id: string): boolean {
    const deleted = this.faults.delete(id);
    if (deleted) {
      this.addAuditEntry('UNREGISTER_FAULT', id, 'Fault unregistered');
    }
    return deleted;
  }

  /**
   * Get fault by ID
   */
  getFault(id: string): ActiveFault | undefined {
    return this.faults.get(id);
  }

  /**
   * Get all active faults
   */
  getActiveFaults(): ActiveFault[] {
    return Array.from(this.faults.values()).filter(f => f.active);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INJECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Attempt to inject a fault
   * INV-CHA-01: Faults only injected when enabled
   * INV-CHA-03: Fault probability respected
   */
  inject(context: InjectionContext): InjectionAttempt {
    const timestamp = new Date().toISOString();
    const startTime = performance.now();
    
    this.metrics.totalAttempts++;

    // INV-CHA-01: Check if enabled
    if (!this.config.enabled) {
      this.metrics.totalDisabled++;
      return {
        result: InjectionResult.DISABLED,
        timestamp,
        durationMs: performance.now() - startTime,
        context,
      };
    }

    // Find matching fault
    const matchingFault = this.findMatchingFault(context.operation);
    
    if (!matchingFault) {
      return {
        result: InjectionResult.NO_MATCH,
        timestamp,
        durationMs: performance.now() - startTime,
        context,
      };
    }

    // INV-CHA-03: Check probability
    const probability = matchingFault.config.probability ?? this.config.defaultProbability;
    const roll = this.getRandom();
    
    if (roll > probability) {
      matchingFault.skipCount++;
      this.metrics.totalSkipped++;
      this.addAuditEntry('SKIP', matchingFault.id, `Skipped (roll: ${roll.toFixed(3)}, prob: ${probability})`);
      
      return {
        result: InjectionResult.SKIPPED,
        faultId: matchingFault.id,
        faultType: matchingFault.config.type,
        timestamp,
        durationMs: performance.now() - startTime,
        context,
      };
    }

    // Check max injections
    if (matchingFault.config.maxInjections !== undefined &&
        matchingFault.injectionCount >= matchingFault.config.maxInjections) {
      return {
        result: InjectionResult.SKIPPED,
        faultId: matchingFault.id,
        timestamp,
        durationMs: performance.now() - startTime,
        context,
      };
    }

    // Inject the fault
    matchingFault.injectionCount++;
    this.metrics.totalInjections++;
    this.metrics.byFaultType[matchingFault.config.type]++;
    
    this.addAuditEntry('INJECT', matchingFault.id, `Injected ${matchingFault.config.type}`);

    return {
      result: InjectionResult.INJECTED,
      faultId: matchingFault.id,
      faultType: matchingFault.config.type,
      timestamp,
      durationMs: performance.now() - startTime,
      context,
    };
  }

  /**
   * Inject with actual fault behavior
   */
  async injectWithBehavior<T>(
    context: InjectionContext,
    originalFn: () => T | Promise<T>
  ): Promise<WrapResult<T>> {
    const startTime = performance.now();
    const attempt = this.inject(context);
    
    // INV-CHA-02: If not injected, run original
    if (attempt.result !== InjectionResult.INJECTED) {
      try {
        const result = await originalFn();
        return {
          result,
          faultInjected: false,
          attempt,
          executionMs: performance.now() - startTime,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error : new Error(String(error)),
          faultInjected: false,
          attempt,
          executionMs: performance.now() - startTime,
        };
      }
    }

    // Apply fault behavior
    const fault = this.faults.get(attempt.faultId!);
    if (!fault) {
      const result = await originalFn();
      return {
        result,
        faultInjected: false,
        attempt,
        executionMs: performance.now() - startTime,
      };
    }

    try {
      switch (fault.config.type) {
        case FaultType.LATENCY: {
          const delay = fault.config.latencyMs ?? DEFAULT_LATENCY_MS;
          await new Promise(resolve => setTimeout(resolve, delay));
          const result = await originalFn();
          return {
            result,
            faultInjected: true,
            attempt,
            executionMs: performance.now() - startTime,
          };
        }

        case FaultType.ERROR: {
          const error = new Error(fault.config.errorMessage ?? DEFAULT_ERROR_MESSAGE);
          return {
            error,
            faultInjected: true,
            attempt,
            executionMs: performance.now() - startTime,
          };
        }

        case FaultType.NULL_RESPONSE: {
          return {
            result: null as T,
            faultInjected: true,
            attempt,
            executionMs: performance.now() - startTime,
          };
        }

        case FaultType.CORRUPT_DATA: {
          const result = await originalFn();
          const corrupted = fault.config.corruptor 
            ? fault.config.corruptor(result)
            : result;
          return {
            result: corrupted,
            faultInjected: true,
            attempt,
            executionMs: performance.now() - startTime,
          };
        }

        case FaultType.TIMEOUT: {
          // Never resolves (caller should handle timeout)
          await new Promise(() => {});
          return {
            faultInjected: true,
            attempt,
            executionMs: performance.now() - startTime,
          };
        }

        default: {
          const result = await originalFn();
          return {
            result,
            faultInjected: true,
            attempt,
            executionMs: performance.now() - startTime,
          };
        }
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error(String(error)),
        faultInjected: true,
        attempt,
        executionMs: performance.now() - startTime,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERIMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create and start an experiment
   * INV-CHA-04: Experiments isolated
   */
  startExperiment(definition: ExperimentDef): string {
    const id = this.generateId('EXP');
    
    // Register all faults for this experiment
    const faultIds: string[] = [];
    for (const faultConfig of definition.faults) {
      const faultId = this.registerFault({
        ...faultConfig,
        target: faultConfig.target ?? (definition.targets?.[0] as string | RegExp),
      });
      faultIds.push(faultId);
    }

    const experiment: Experiment = {
      id,
      definition,
      state: ExperimentState.RUNNING,
      startedAt: new Date().toISOString(),
      faultIds,
      attempts: [],
      successCount: 0,
      failureCount: 0,
    };

    this.experiments.set(id, experiment);
    this.addAuditEntry('START_EXPERIMENT', id, `Started experiment: ${definition.name}`);

    // Auto-stop if duration specified
    if (definition.durationMs && definition.durationMs > 0) {
      setTimeout(() => {
        this.stopExperiment(id);
      }, definition.durationMs);
    }

    return id;
  }

  /**
   * Stop an experiment
   */
  stopExperiment(id: string): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment) return false;

    if (experiment.state !== ExperimentState.RUNNING && 
        experiment.state !== ExperimentState.PAUSED) {
      return false;
    }

    // Unregister all faults
    for (const faultId of experiment.faultIds) {
      this.unregisterFault(faultId);
    }

    experiment.state = ExperimentState.COMPLETED;
    experiment.endedAt = new Date().toISOString();
    this.metrics.completedExperiments++;

    this.addAuditEntry('STOP_EXPERIMENT', id, `Stopped experiment: ${experiment.definition.name}`);
    
    return true;
  }

  /**
   * Pause an experiment
   */
  pauseExperiment(id: string): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment || experiment.state !== ExperimentState.RUNNING) {
      return false;
    }

    // Deactivate faults
    for (const faultId of experiment.faultIds) {
      const fault = this.faults.get(faultId);
      if (fault) fault.active = false;
    }

    experiment.state = ExperimentState.PAUSED;
    this.addAuditEntry('PAUSE_EXPERIMENT', id, 'Experiment paused');
    
    return true;
  }

  /**
   * Resume an experiment
   */
  resumeExperiment(id: string): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment || experiment.state !== ExperimentState.PAUSED) {
      return false;
    }

    // Reactivate faults
    for (const faultId of experiment.faultIds) {
      const fault = this.faults.get(faultId);
      if (fault) fault.active = true;
    }

    experiment.state = ExperimentState.RUNNING;
    this.addAuditEntry('RESUME_EXPERIMENT', id, 'Experiment resumed');
    
    return true;
  }

  /**
   * Get experiment by ID
   */
  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  /**
   * Get active experiments
   */
  getActiveExperiments(): Experiment[] {
    return Array.from(this.experiments.values()).filter(
      e => e.state === ExperimentState.RUNNING || e.state === ExperimentState.PAUSED
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRAPPER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Wrap a function with chaos injection
   */
  wrap<T>(fn: () => T | Promise<T>, options: WrapOptions): () => Promise<WrapResult<T>> {
    return async () => {
      const context: InjectionContext = {
        operation: options.operation,
        metadata: options.metadata,
      };
      
      return this.injectWithBehavior(context, fn);
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get chaos metrics
   * INV-CHA-05: Metrics accurate
   */
  getMetrics(): ChaosMetrics {
    const total = this.metrics.totalAttempts || 1;

    return {
      timestamp: new Date().toISOString(),
      version: CHAOS_VERSION,
      uptimeMs: Date.now() - this.startTime,
      enabled: this.config.enabled,
      totalAttempts: this.metrics.totalAttempts,
      totalInjections: this.metrics.totalInjections,
      totalSkipped: this.metrics.totalSkipped,
      totalDisabled: this.metrics.totalDisabled,
      activeFaults: this.getActiveFaults().length,
      activeExperiments: this.getActiveExperiments().length,
      completedExperiments: this.metrics.completedExperiments,
      injectionRate: (this.metrics.totalInjections / total) * 100,
      byFaultType: { ...this.metrics.byFaultType },
      config: { ...this.config },
    };
  }

  /**
   * Get metrics for a specific fault
   */
  getFaultMetrics(id: string): FaultMetrics | null {
    const fault = this.faults.get(id);
    if (!fault) return null;

    const total = fault.injectionCount + fault.skipCount || 1;

    return {
      id,
      type: fault.config.type,
      attempts: fault.injectionCount + fault.skipCount,
      injections: fault.injectionCount,
      skips: fault.skipCount,
      injectionRate: (fault.injectionCount / total) * 100,
      avgLatencyMs: fault.config.type === FaultType.LATENCY 
        ? fault.config.latencyMs 
        : undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get audit log
   */
  getAuditLog(limit?: number): AuditEntry[] {
    const log = [...this.auditLog];
    if (limit !== undefined) {
      return log.slice(-limit);
    }
    return log;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clear all state
   */
  clear(): void {
    this.faults.clear();
    this.experiments.clear();
    this.auditLog = [];
    this.metrics = {
      totalAttempts: 0,
      totalInjections: 0,
      totalSkipped: 0,
      totalDisabled: 0,
      byFaultType: Object.values(FaultType).reduce(
        (acc, type) => ({ ...acc, [type]: 0 }),
        {} as Record<FaultType, number>
      ),
      completedExperiments: 0,
    };
  }

  /**
   * Shutdown and cleanup
   * INV-CHA-06: Safe shutdown
   */
  shutdown(): void {
    // Stop all running experiments
    for (const experiment of this.experiments.values()) {
      if (experiment.state === ExperimentState.RUNNING) {
        this.stopExperiment(experiment.id);
      }
    }
    
    // Disable injection
    this.disable();
    
    // Clear faults
    this.faults.clear();
  }

  /**
   * Get configuration
   */
  getConfig(): ChaosConfig {
    return { ...this.config };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateId(prefix: string): string {
    this.idCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.idCounter.toString(36).padStart(4, '0');
    return `${prefix}-${timestamp}-${counter}`;
  }

  private getRandom(): number {
    if (this.random) {
      return this.random.next();
    }
    return Math.random();
  }

  private findMatchingFault(operation: string): ActiveFault | null {
    for (const fault of this.faults.values()) {
      if (!fault.active) continue;
      
      const target = fault.config.target;
      
      // No target means match all
      if (!target) return fault;
      
      // String match
      if (typeof target === 'string') {
        if (operation === target || operation.includes(target)) {
          return fault;
        }
      }
      
      // Regex match
      if (target instanceof RegExp) {
        if (target.test(operation)) {
          return fault;
        }
      }
    }
    
    return null;
  }

  private addAuditEntry(
    action: AuditAction,
    targetId: string | undefined,
    details: string
  ): void {
    if (!this.config.enableAuditLog) return;

    const entry: AuditEntry = {
      id: `AUD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      targetId,
      details,
      success: true,
    };

    this.auditLog.push(entry);

    // Keep bounded
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

/** Default chaos harness instance */
export const chaos = new ChaosHarness();

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Enable chaos using default instance */
export const enableChaos = (): void => chaos.enable();

/** Disable chaos using default instance */
export const disableChaos = (): void => chaos.disable();

/** Register a fault using default instance */
export const registerFault = (config: FaultConfig): string => chaos.registerFault(config);

/** Inject fault using default instance */
export const injectFault = (context: InjectionContext): InjectionAttempt => chaos.inject(context);

/** Get metrics using default instance */
export const getChaosMetrics = (): ChaosMetrics => chaos.getMetrics();
