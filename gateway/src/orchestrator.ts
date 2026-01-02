// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA ORCHESTRATOR — Version: 1.0.0 — NASA/SpaceX-Grade
// Invariants: ORCH-01 à ORCH-05
// ═══════════════════════════════════════════════════════════════════════════════

import { randomUUID } from 'crypto';
import { ExecutionState, ExecutionMode, ExecutionReport, ExecutionContext, PipelineSpec, ModuleSpec, ModuleResult, ModuleError, ArtifactRef, ArtifactKind, OmegaModule, CONSTANTS, TERMINAL_STATES } from './types';
import { ModuleRegistry, parseModuleKey } from './registry';
import { AuditAppender } from './gateway';

export const ORCHESTRATOR_REASON_CODES = {
  ORCH_NO_TOKEN: 'Missing execution token',
  ORCH_NO_SPEC: 'Missing pipeline spec',
  ORCH_BAD_DEADLINE: 'Invalid max_runtime_ms',
  ORCH_EMPTY_CHAIN: 'module_chain is empty',
  ORCH_MODULE_NOT_FOUND: 'Module not found in registry',
  ORCH_DET_UNSAFE_MODULE: 'Module not deterministic-safe',
  ORCH_STEP_CRASH: 'Module crashed during execution',
  ORCH_TIMEOUT: 'Execution exceeded deadline',
  ORCH_STATE_VIOLATION: 'Invalid state transition attempted',
  ORCH_VALIDATION_FAILED: 'Module validation failed',
  ORCH_CANCELLED: 'Execution was cancelled',
} as const;

export type OrchestratorReasonCode = keyof typeof ORCHESTRATOR_REASON_CODES;

const VALID_TRANSITIONS: Record<ExecutionState, ExecutionState[]> = {
  PENDING: ['INITIALIZING'],
  INITIALIZING: ['RUNNING', 'FAILED'],
  RUNNING: ['RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'],
  COMPLETED: [], FAILED: [], TIMED_OUT: [], CANCELLED: [],
};

function isValidTransition(from: ExecutionState, to: ExecutionState): boolean { return VALID_TRANSITIONS[from].includes(to); }
function isTerminal(state: ExecutionState): boolean { return TERMINAL_STATES.includes(state); }

export class OrchestratorError extends Error {
  constructor(public readonly code: OrchestratorReasonCode, message: string, public readonly details?: Record<string, unknown>) {
    super(message); this.name = 'OrchestratorError';
  }
}

interface ExecutionStateHolder {
  execution_token: string; pipeline_id: string; state: ExecutionState; current_step: number;
  start_time: string; end_time?: string; steps_completed: number; artifacts: ArtifactRef[];
  output?: unknown; error_trace?: { step: string; code: string; message: string; details?: string; retryable?: boolean; };
  metrics: { total_duration_ms: number; steps_duration_ms: Record<string, number>; };
}

export interface ModuleLoader { load(module_id: string, version: string): Promise<OmegaModule<unknown, unknown> | null>; }

export interface OrchestratorRequest {
  execution_token: string; pipeline_spec: PipelineSpec; payload: unknown; mode: ExecutionMode; trace: boolean;
}

export class Orchestrator {
  private readonly moduleRegistry: ModuleRegistry;
  private readonly moduleLoader: ModuleLoader;
  private readonly audit: AuditAppender;
  private cancelled: Set<string> = new Set();

  constructor(moduleRegistry: ModuleRegistry, moduleLoader: ModuleLoader, audit: AuditAppender) {
    this.moduleRegistry = moduleRegistry; this.moduleLoader = moduleLoader; this.audit = audit;
  }

  async execute(request: OrchestratorRequest): Promise<ExecutionReport> {
    const startTime = Date.now();
    const state: ExecutionStateHolder = {
      execution_token: request.execution_token, pipeline_id: request.pipeline_spec.pipeline_id, state: 'PENDING',
      current_step: 0, start_time: new Date(startTime).toISOString(), steps_completed: 0, artifacts: [],
      metrics: { total_duration_ms: 0, steps_duration_ms: {} },
    };

    if (!request.execution_token) return this.failExecution(state, 'ORCH_NO_TOKEN', 'Missing execution token');
    if (!request.pipeline_spec) return this.failExecution(state, 'ORCH_NO_SPEC', 'Missing pipeline spec');
    const deadline = request.pipeline_spec.constraints.max_runtime_ms;
    if (!deadline || deadline < 1000) return this.failExecution(state, 'ORCH_BAD_DEADLINE', 'Invalid max_runtime_ms');
    const chain = request.pipeline_spec.module_chain;
    if (!chain || chain.length === 0) return this.failExecution(state, 'ORCH_EMPTY_CHAIN', 'module_chain is empty');

    this.transition(state, 'INITIALIZING');
    const modules: Array<{ key: string; spec: ModuleSpec; instance: OmegaModule<unknown, unknown> }> = [];
    
    for (const moduleKey of chain) {
      const parsed = parseModuleKey(moduleKey);
      if (!parsed) return this.failExecution(state, 'ORCH_MODULE_NOT_FOUND', `Invalid module key: ${moduleKey}`);
      const spec = this.moduleRegistry.get(parsed.module_id, parsed.version);
      if (!spec) return this.failExecution(state, 'ORCH_MODULE_NOT_FOUND', `Module not found: ${moduleKey}`);
      if (request.pipeline_spec.constraints.deterministic_required && !spec.limits.deterministic_safe)
        return this.failExecution(state, 'ORCH_DET_UNSAFE_MODULE', `Module ${moduleKey} not deterministic-safe`);
      const instance = await this.moduleLoader.load(parsed.module_id, parsed.version);
      if (!instance) return this.failExecution(state, 'ORCH_MODULE_NOT_FOUND', `Cannot load module: ${moduleKey}`);
      modules.push({ key: moduleKey, spec, instance });
    }

    this.auditAppend('ORCH_INIT_OK', state.execution_token, { pipeline_id: state.pipeline_id, module_count: modules.length });
    this.transition(state, 'RUNNING');
    const deadlineEpoch = startTime + deadline;
    let currentInput = request.payload;

    for (let i = 0; i < modules.length; i++) {
      const { key, instance } = modules[i];
      state.current_step = i;
      if (this.cancelled.has(request.execution_token)) return this.cancelExecution(state);
      if (Date.now() >= deadlineEpoch) return this.timeoutExecution(state, key);

      this.auditAppend('STEP_BEGIN', state.execution_token, { step: i, module: key });
      const stepStart = Date.now();

      try {
        const validationResult = instance.validate(currentInput);
        if (!validationResult.ok) {
          this.auditAppend('STEP_VALIDATE_FAIL', state.execution_token, { step: i, module: key });
          return this.failExecution(state, 'ORCH_VALIDATION_FAILED', `Validation failed at ${key}`, validationResult.error);
        }
        this.auditAppend('STEP_VALIDATE_OK', state.execution_token, { step: i, module: key });

        const ctx = this.createContext(state.execution_token, request.pipeline_spec, request.mode, request.trace, deadlineEpoch);
        const remainingTime = deadlineEpoch - Date.now();
        const result = await this.executeWithTimeout(instance.run(ctx, currentInput), remainingTime, key);
        const stepDuration = Date.now() - stepStart;
        state.metrics.steps_duration_ms[key] = stepDuration;

        if (!result.ok) {
          this.auditAppend('STEP_FAIL', state.execution_token, { step: i, module: key, duration_ms: stepDuration });
          return this.failExecution(state, 'ORCH_STEP_CRASH', `Step failed at ${key}`, result.error);
        }

        this.auditAppend('STEP_OK', state.execution_token, { step: i, module: key, duration_ms: stepDuration });
        if (result.artifacts) state.artifacts.push(...result.artifacts);
        currentInput = result.output;
        state.steps_completed = i + 1;
      } catch (error) {
        this.auditAppend('STEP_CRASH', state.execution_token, { step: i, module: key, error: error instanceof Error ? error.message : String(error) });
        return this.failExecution(state, 'ORCH_STEP_CRASH', `Module crashed: ${key}`, { code: 'MOD_INTERNAL_ERROR', message: error instanceof Error ? error.message : String(error), retryable: false, category: 'INTERNAL' });
      }
    }

    state.output = currentInput;
    state.metrics.total_duration_ms = Date.now() - startTime;
    return this.completeExecution(state);
  }

  cancel(execution_token: string): void { this.cancelled.add(execution_token); }

  private transition(state: ExecutionStateHolder, to: ExecutionState): void {
    if (!isValidTransition(state.state, to)) throw new OrchestratorError('ORCH_STATE_VIOLATION', `Invalid transition ${state.state} → ${to}`);
    const from = state.state; state.state = to;
    this.auditAppend('ORCH_STATE_CHANGE', state.execution_token, { from, to, step: state.current_step });
  }

  private completeExecution(state: ExecutionStateHolder): ExecutionReport {
    state.end_time = new Date().toISOString();
    this.transition(state, 'COMPLETED');
    this.auditAppend('ORCH_COMPLETED', state.execution_token, { pipeline_id: state.pipeline_id, duration_ms: state.metrics.total_duration_ms });
    return { execution_token: state.execution_token, pipeline_id: state.pipeline_id, status: 'COMPLETED', start_time: state.start_time, end_time: state.end_time, duration_ms: state.metrics.total_duration_ms, steps_completed: state.steps_completed, steps_total: state.steps_completed, artifacts: state.artifacts, metrics: state.metrics };
  }

  private failExecution(state: ExecutionStateHolder, code: OrchestratorReasonCode, message: string, moduleError?: ModuleError | Record<string, unknown>): ExecutionReport {
    state.end_time = new Date().toISOString();
    state.metrics.total_duration_ms = Date.now() - new Date(state.start_time).getTime();
    if (!isTerminal(state.state)) this.transition(state, 'FAILED');
    state.error_trace = { step: `step_${state.current_step}`, code, message, details: moduleError ? JSON.stringify(moduleError) : undefined, retryable: (moduleError as ModuleError)?.retryable ?? false };
    this.auditAppend('ORCH_FAILED', state.execution_token, { pipeline_id: state.pipeline_id, code, message });
    return { execution_token: state.execution_token, pipeline_id: state.pipeline_id, status: 'FAILED', start_time: state.start_time, end_time: state.end_time, duration_ms: state.metrics.total_duration_ms, steps_completed: state.steps_completed, steps_total: state.current_step + 1, artifacts: state.artifacts, error_trace: state.error_trace, metrics: state.metrics };
  }

  private timeoutExecution(state: ExecutionStateHolder, currentModule: string): ExecutionReport {
    state.end_time = new Date().toISOString();
    state.metrics.total_duration_ms = Date.now() - new Date(state.start_time).getTime();
    this.transition(state, 'TIMED_OUT');
    state.error_trace = { step: currentModule, code: 'ORCH_TIMEOUT', message: `Execution exceeded deadline at ${currentModule}`, retryable: false };
    this.auditAppend('ORCH_TIMEOUT', state.execution_token, { pipeline_id: state.pipeline_id, module: currentModule });
    return { execution_token: state.execution_token, pipeline_id: state.pipeline_id, status: 'TIMED_OUT', start_time: state.start_time, end_time: state.end_time, duration_ms: state.metrics.total_duration_ms, steps_completed: state.steps_completed, steps_total: state.current_step + 1, artifacts: state.artifacts, error_trace: state.error_trace, metrics: state.metrics };
  }

  private cancelExecution(state: ExecutionStateHolder): ExecutionReport {
    state.end_time = new Date().toISOString();
    state.metrics.total_duration_ms = Date.now() - new Date(state.start_time).getTime();
    this.transition(state, 'CANCELLED');
    state.error_trace = { step: `step_${state.current_step}`, code: 'ORCH_CANCELLED', message: 'Execution was cancelled', retryable: true };
    return { execution_token: state.execution_token, pipeline_id: state.pipeline_id, status: 'CANCELLED', start_time: state.start_time, end_time: state.end_time, duration_ms: state.metrics.total_duration_ms, steps_completed: state.steps_completed, steps_total: state.current_step + 1, artifacts: state.artifacts, error_trace: state.error_trace, metrics: state.metrics };
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number, moduleKey: string): Promise<T> {
    if (timeoutMs <= 0) throw new OrchestratorError('ORCH_TIMEOUT', `Timeout before executing ${moduleKey}`);
    return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new OrchestratorError('ORCH_TIMEOUT', `Module ${moduleKey} exceeded timeout`)), timeoutMs))]);
  }

  private createContext(execution_token: string, spec: PipelineSpec, mode: ExecutionMode, trace: boolean, deadlineEpoch: number): ExecutionContext {
    const self = this;
    return { execution_token, pipeline_id: spec.pipeline_id, mode, trace, deterministic_required: spec.constraints.deterministic_required, deadline_epoch_ms: deadlineEpoch, audit: { append(event_type: string, payload: Record<string, unknown>): void { self.auditAppend(event_type, execution_token, payload); } }, artifacts: { async put() { throw new Error('Not implemented'); }, async get() { throw new Error('Not implemented'); }, async verify() { throw new Error('Not implemented'); } }, rng: createDeterministicRNG(CONSTANTS.DETERMINISTIC_SEED) };
  }

  private auditAppend(event_type: string, execution_token: string, payload: Record<string, unknown>): void {
    this.audit.append({ event_type, timestamp: new Date().toISOString(), execution_token, payload });
  }
}

function createDeterministicRNG(seed: number) {
  let state = seed;
  function next(): number { state = (state * 1664525 + 1013904223) >>> 0; return state / 0xFFFFFFFF; }
  return { seed, next, nextInt(min: number, max: number): number { return Math.floor(next() * (max - min + 1)) + min; } };
}

export function createOrchestrator(moduleRegistry: ModuleRegistry, moduleLoader: ModuleLoader, audit: AuditAppender): Orchestrator { return new Orchestrator(moduleRegistry, moduleLoader, audit); }

export class MockModuleLoader implements ModuleLoader {
  private modules: Map<string, OmegaModule<unknown, unknown>> = new Map();
  register(module_id: string, version: string, module: OmegaModule<unknown, unknown>): void { this.modules.set(`${module_id}@${version}`, module); }
  async load(module_id: string, version: string): Promise<OmegaModule<unknown, unknown> | null> { return this.modules.get(`${module_id}@${version}`) || null; }
}

export function createPassthroughModule(id: string, version: string): OmegaModule<unknown, unknown> { return { id, version, limits: { deterministic_safe: true }, validate: () => ({ ok: true }), run: async (ctx, input) => ({ ok: true, output: input }) }; }
export function createFailingModule(id: string, version: string, errorCode: string = 'MOD_EXECUTION_ERROR'): OmegaModule<unknown, unknown> { return { id, version, limits: { deterministic_safe: true }, validate: () => ({ ok: true }), run: async () => ({ ok: false, error: { code: errorCode, message: 'Module intentionally failed', retryable: false, category: 'EXECUTION' } }) }; }
export function createSlowModule(id: string, version: string, delayMs: number): OmegaModule<unknown, unknown> { return { id, version, limits: { deterministic_safe: true }, validate: () => ({ ok: true }), run: async (ctx, input) => { await new Promise(r => setTimeout(r, delayMs)); return { ok: true, output: input }; } }; }
