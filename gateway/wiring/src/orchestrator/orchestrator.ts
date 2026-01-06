// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — ORCHESTRATOR
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INNOVATION: Single Entry Point avec Pipeline Observable
//
// L'Orchestrator est le SEUL point d'entrée pour exécuter des messages NEXUS.
// Il garantit:
// - Validation stricte
// - Policy enforcement
// - Replay protection
// - Version-pinned routing
// - Full observability (Chronicle)
// - Circuit breaker protection
//
// @invariant INV-ORCH-01: Single Entry Point
// @invariant INV-ORCH-02: Strict Validation
// @invariant INV-ORCH-03: Policy First
// @invariant INV-ORCH-04: Replay Guard
// @invariant INV-ORCH-05: Version Pinned Registry
// @invariant INV-ORCH-06: Chronicle Completeness
// @invariant INV-ORCH-07: Error Coding
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusEnvelope, NexusResult, Clock } from '../types.js';
import { ok, fail, isOk, isErr } from '../types.js';
import { validateEnvelopeStrict } from '../envelope.js';
import { adapterError, safeError } from '../errors.js';
import type { PolicyEngine, PolicyDecision } from '../policy.js';
import { HandlerRegistry } from './registry.js';
import type { Chronicle } from './chronicle.js';
import { ChronicleWriter, createChronicle } from './chronicle.js';
import { ReplayGuard } from './replay_guard.js';

const MODULE = 'orchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════

export const OrchestratorErrorCodes = {
  VALIDATION_FAILED: 'ORCH_VALIDATION_FAILED',
  POLICY_REJECTED: 'ORCH_POLICY_REJECTED',
  REPLAY_REJECTED: 'ORCH_REPLAY_REJECTED',
  NO_HANDLER: 'ORCH_NO_HANDLER',
  EXECUTION_FAILED: 'ORCH_EXECUTION_FAILED',
  CIRCUIT_OPEN: 'ORCH_CIRCUIT_OPEN',
  TIMEOUT: 'ORCH_TIMEOUT',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * État du circuit breaker
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Configuration circuit breaker
 */
export interface CircuitBreakerConfig {
  /** Nombre de failures avant ouverture */
  failureThreshold: number;
  /** Temps avant tentative de récupération (ms) */
  recoveryTimeMs: number;
  /** Nombre de succès pour fermer en half-open */
  successThreshold: number;
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeMs: 30000,
  successThreshold: 3,
};

/**
 * Circuit Breaker par handler
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private readonly getNow: () => number;

  constructor(
    private readonly config: CircuitBreakerConfig,
    clock: { now(): number } | { nowMs(): number }
  ) {
    // Support both clock interfaces
    if ('nowMs' in clock) {
      this.getNow = () => clock.nowMs();
    } else {
      this.getNow = () => clock.now();
    }
  }

  /**
   * Vérifie si le circuit permet l'exécution
   */
  canExecute(): boolean {
    if (this.state === 'closed') return true;
    
    if (this.state === 'open') {
      // Check if recovery time has passed
      if (this.getNow() - this.lastFailureTime >= this.config.recoveryTimeMs) {
        this.state = 'half-open';
        this.successes = 0;
        return true;
      }
      return false;
    }
    
    // half-open: allow limited traffic
    return true;
  }

  /**
   * Enregistre un succès
   */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else if (this.state === 'closed') {
      this.failures = 0;
    }
  }

  /**
   * Enregistre un échec
   */
  recordFailure(): void {
    this.lastFailureTime = this.getNow();
    
    if (this.state === 'half-open') {
      this.state = 'open';
      this.failures++;
    } else if (this.state === 'closed') {
      this.failures++;
      if (this.failures >= this.config.failureThreshold) {
        this.state = 'open';
      }
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration de l'Orchestrator
 */
export interface OrchestratorConfig {
  /** Clock injectable */
  clock: Clock;
  /** Registry de handlers */
  registry: HandlerRegistry;
  /** Policy engine (optionnel - si absent, allow all) */
  policy?: PolicyEngine;
  /** Replay guard (optionnel) */
  replayGuard?: ReplayGuard;
  /** Chronicle (optionnel - créé si absent) */
  chronicle?: Chronicle;
  /** Circuit breaker config */
  circuitBreaker?: CircuitBreakerConfig;
  /** Timeout par défaut (ms) */
  defaultTimeoutMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCH RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résultat enrichi du dispatch
 */
export interface DispatchResult<T = unknown> {
  /** Résultat de l'exécution */
  result: NexusResult<T>;
  /** Métriques d'exécution */
  metrics: {
    totalDurationMs: number;
    validationDurationMs: number;
    executionDurationMs: number;
  };
  /** Trace ID pour corrélation */
  traceId: string;
  /** Message ID */
  messageId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Orchestrator — Point d'entrée unique pour NEXUS
 * 
 * @invariant INV-ORCH-01: Single Entry Point
 * @invariant INV-ORCH-02: Strict Validation
 * @invariant INV-ORCH-03: Policy First
 * @invariant INV-ORCH-04: Replay Guard
 * @invariant INV-ORCH-05: Version Pinned Registry
 * @invariant INV-ORCH-06: Chronicle Completeness
 * @invariant INV-ORCH-07: Error Coding
 */
export class Orchestrator {
  private readonly clock: Clock;
  private readonly registry: HandlerRegistry;
  private readonly policy?: PolicyEngine;
  private readonly replayGuard?: ReplayGuard;
  private readonly chronicle: Chronicle;
  private readonly chronicleWriter: ChronicleWriter;
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();
  private readonly circuitConfig: CircuitBreakerConfig;
  private readonly defaultTimeoutMs: number;

  constructor(config: OrchestratorConfig) {
    this.clock = config.clock;
    this.registry = config.registry;
    this.policy = config.policy;
    this.replayGuard = config.replayGuard;
    this.chronicle = config.chronicle ?? createChronicle();
    this.chronicleWriter = new ChronicleWriter(this.chronicle, config.clock);
    this.circuitConfig = config.circuitBreaker ?? DEFAULT_CIRCUIT_CONFIG;
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 30000;
  }

  /**
   * Dispatch un message NEXUS
   * 
   * @invariant INV-ORCH-01: Single Entry Point
   */
  async dispatch(raw: unknown): Promise<DispatchResult> {
    const startTime = this.clock.nowMs();
    let validationEndTime = startTime;
    let executionEndTime = startTime;
    let traceId = 'unknown';
    let messageId = 'unknown';

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 1: VALIDATION STRICTE
      // @invariant INV-ORCH-02
      // ═══════════════════════════════════════════════════════════════════════
      const validation = validateEnvelopeStrict(raw);
      validationEndTime = this.clock.nowMs();

      if (isErr(validation)) {
        // Validation failed - try to extract IDs from raw
        const rawObj = raw as Record<string, unknown> | null;
        traceId = typeof rawObj?.trace_id === 'string' ? rawObj.trace_id : 'unknown';
        messageId = typeof rawObj?.message_id === 'string' ? rawObj.message_id : 'unknown';

        this.chronicleWriter.validationFailed(
          traceId,
          messageId,
          null,
          validation.error.error_code,
          validation.error.message
        );

        return this.buildResult(
          fail(adapterError(MODULE, OrchestratorErrorCodes.VALIDATION_FAILED, validation.error.message, false)),
          startTime,
          validationEndTime,
          validationEndTime,
          traceId,
          messageId
        );
      }

      const env = validation.value;
      traceId = env.trace_id;
      messageId = env.message_id;

      // Chronicle: Dispatch received
      const receivedRecordId = this.chronicleWriter.dispatchReceived(env);

      // Chronicle: Validation OK
      const validationRecordId = this.chronicleWriter.validationOk(
        env,
        receivedRecordId,
        env.envelope_hash ?? 'N/A'
      );

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 2: POLICY
      // @invariant INV-ORCH-03
      // ═══════════════════════════════════════════════════════════════════════
      if (this.policy) {
        const decision = this.policy.check(env);
        if (!decision.allow) {
          this.chronicleWriter.policyRejected(
            env,
            validationRecordId,
            decision.code,
            decision.reason
          );

          return this.buildResult(
            fail(adapterError(MODULE, OrchestratorErrorCodes.POLICY_REJECTED, decision.reason, false)),
            startTime,
            validationEndTime,
            this.clock.nowMs(),
            traceId,
            messageId
          );
        }
        this.chronicleWriter.policyOk(env, validationRecordId);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 3: REPLAY GUARD
      // @invariant INV-ORCH-04
      // ═══════════════════════════════════════════════════════════════════════
      let lastRecordId = validationRecordId;

      if (this.replayGuard) {
        const replayCheck = this.replayGuard.checkAndRecord(env);
        
        if (isErr(replayCheck)) {
          this.chronicleWriter.replayRejected(env, lastRecordId);

          return this.buildResult(
            fail(adapterError(MODULE, OrchestratorErrorCodes.REPLAY_REJECTED, replayCheck.error.message, false)),
            startTime,
            validationEndTime,
            this.clock.nowMs(),
            traceId,
            messageId
          );
        }

        const checkResult = replayCheck.value;

        // Handle idempotent replay
        if (checkResult.status === 'duplicate_idempotent') {
          this.chronicleWriter.replayOk(env, lastRecordId);
          
          return this.buildResult(
            ok(checkResult.cachedResult),
            startTime,
            validationEndTime,
            this.clock.nowMs(),
            traceId,
            messageId
          );
        }

        // Handle rejected replay (should not reach here if check failed)
        if (checkResult.status === 'duplicate_rejected') {
          this.chronicleWriter.replayRejected(env, lastRecordId);
          
          return this.buildResult(
            fail(adapterError(MODULE, OrchestratorErrorCodes.REPLAY_REJECTED, 'Duplicate message', false)),
            startTime,
            validationEndTime,
            this.clock.nowMs(),
            traceId,
            messageId
          );
        }

        this.chronicleWriter.replayOk(env, lastRecordId);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 4: HANDLER RESOLUTION
      // @invariant INV-ORCH-05
      // ═══════════════════════════════════════════════════════════════════════
      const handlerResult = this.registry.resolve(env);
      const handlerKey = `${env.target_module}@${env.module_version}`;

      if (isErr(handlerResult)) {
        this.chronicleWriter.handlerNotFound(env, lastRecordId, handlerKey);

        return this.buildResult(
          fail(adapterError(MODULE, OrchestratorErrorCodes.NO_HANDLER, handlerResult.error.message, false)),
          startTime,
          validationEndTime,
          this.clock.nowMs(),
          traceId,
          messageId
        );
      }

      const { handler } = handlerResult.value;
      const resolvedRecordId = this.chronicleWriter.handlerResolved(env, lastRecordId, handlerKey);

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 5: CIRCUIT BREAKER CHECK
      // ═══════════════════════════════════════════════════════════════════════
      const circuit = this.getCircuitBreaker(handlerKey);
      
      if (!circuit.canExecute()) {
        return this.buildResult(
          fail(adapterError(MODULE, OrchestratorErrorCodes.CIRCUIT_OPEN, `Circuit open for ${handlerKey}`, true)),
          startTime,
          validationEndTime,
          this.clock.nowMs(),
          traceId,
          messageId
        );
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 6: EXECUTION
      // @invariant INV-ORCH-06, INV-ORCH-07
      // ═══════════════════════════════════════════════════════════════════════
      const execStartRecordId = this.chronicleWriter.executionStart(env, resolvedRecordId, handlerKey);
      const execStartTime = this.clock.nowMs();

      try {
        const result = await this.executeWithTimeout(handler.handle(env), this.defaultTimeoutMs);
        executionEndTime = this.clock.nowMs();
        const execDuration = executionEndTime - execStartTime;

        if (isOk(result)) {
          circuit.recordSuccess();
          this.chronicleWriter.executionOk(env, execStartRecordId, execDuration);

          // Update cached result for idempotent replay
          if (this.replayGuard) {
            this.replayGuard.updateCachedResult(env.replay_protection_key, result.value);
          }

          // Chronicle: Complete
          this.chronicleWriter.dispatchComplete(
            env,
            execStartRecordId,
            true,
            executionEndTime - startTime
          );

          return this.buildResult(result, startTime, validationEndTime, executionEndTime, traceId, messageId);
        }

        // Execution returned error
        circuit.recordFailure();
        this.chronicleWriter.executionError(
          env,
          execStartRecordId,
          result.error.error_code,
          execDuration,
          result.error.retryable
        );

        this.chronicleWriter.dispatchComplete(
          env,
          execStartRecordId,
          false,
          executionEndTime - startTime
        );

        return this.buildResult(result, startTime, validationEndTime, executionEndTime, traceId, messageId);

      } catch (execError) {
        // Execution threw
        executionEndTime = this.clock.nowMs();
        circuit.recordFailure();

        const safeErr = safeError(execError, MODULE, OrchestratorErrorCodes.EXECUTION_FAILED, true);
        
        this.chronicleWriter.executionError(
          env,
          execStartRecordId,
          safeErr.error_code,
          executionEndTime - execStartTime,
          safeErr.retryable
        );

        this.chronicleWriter.dispatchComplete(
          env,
          execStartRecordId,
          false,
          executionEndTime - startTime
        );

        return this.buildResult(
          fail(safeErr),
          startTime,
          validationEndTime,
          executionEndTime,
          traceId,
          messageId
        );
      }

    } catch (fatalError) {
      // Catch-all for unexpected errors
      executionEndTime = this.clock.nowMs();
      const safeErr = safeError(fatalError, MODULE, OrchestratorErrorCodes.EXECUTION_FAILED, true);

      return this.buildResult(
        fail(safeErr),
        startTime,
        validationEndTime,
        executionEndTime,
        traceId,
        messageId
      );
    }
  }

  /**
   * Execute avec timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Execution timeout after ${timeoutMs}ms`)),
        timeoutMs
      );
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (err) {
      clearTimeout(timeoutId!);
      throw err;
    }
  }

  /**
   * Construit le résultat enrichi
   */
  private buildResult<T>(
    result: NexusResult<T>,
    startTime: number,
    validationEndTime: number,
    executionEndTime: number,
    traceId: string,
    messageId: string
  ): DispatchResult<T> {
    return {
      result,
      metrics: {
        totalDurationMs: executionEndTime - startTime,
        validationDurationMs: validationEndTime - startTime,
        executionDurationMs: executionEndTime - validationEndTime,
      },
      traceId,
      messageId,
    };
  }

  /**
   * Obtient ou crée un circuit breaker pour un handler
   */
  private getCircuitBreaker(handlerKey: string): CircuitBreaker {
    let circuit = this.circuitBreakers.get(handlerKey);
    if (!circuit) {
      circuit = new CircuitBreaker(this.circuitConfig, this.clock);
      this.circuitBreakers.set(handlerKey, circuit);
    }
    return circuit;
  }

  /**
   * Retourne le chronicle pour inspection
   */
  getChronicle(): Chronicle {
    return this.chronicle;
  }

  /**
   * Retourne l'état des circuit breakers
   */
  getCircuitStates(): Map<string, CircuitState> {
    const states = new Map<string, CircuitState>();
    for (const [key, circuit] of this.circuitBreakers) {
      states.set(key, circuit.getState());
    }
    return states;
  }

  /**
   * Reset un circuit breaker
   */
  resetCircuit(handlerKey: string): void {
    const circuit = this.circuitBreakers.get(handlerKey);
    if (circuit) {
      circuit.reset();
    }
  }

  /**
   * Reset tous les circuit breakers
   */
  resetAllCircuits(): void {
    for (const circuit of this.circuitBreakers.values()) {
      circuit.reset();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un Orchestrator
 */
export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  return new Orchestrator(config);
}
