/**
 * @fileoverview Core type definitions for the Orchestrator.
 * @module @omega/orchestrator-core/core/types
 */

import type { Clock } from '../util/clock.js';

/**
 * Platform information captured at runtime.
 * Immutable after creation.
 */
export interface PlatformInfo {
  /** Node.js version */
  readonly nodeVersion: string;
  /** Operating system platform */
  readonly platform: string;
  /** Operating system architecture */
  readonly arch: string;
  /** Process ID */
  readonly pid: number;
}

/**
 * Factory for generating deterministic IDs.
 * Must produce the same sequence given the same seed.
 */
export interface IdFactory {
  /**
   * Generates the next ID in sequence.
   * @returns Unique identifier string
   */
  next(): string;

  /**
   * Resets the factory to initial state.
   */
  reset(): void;
}

/**
 * Seeded ID factory for deterministic ID generation.
 */
export class SeededIdFactory implements IdFactory {
  private counter: number = 0;
  private readonly prefix: string;

  /**
   * Creates an ID factory with a seed-based prefix.
   * @param seed - Seed string for determinism
   */
  constructor(seed: string) {
    // Use first 8 chars of seed hash as prefix
    this.prefix = seed.substring(0, 8);
  }

  next(): string {
    const id = `${this.prefix}-${String(this.counter).padStart(6, '0')}`;
    this.counter++;
    return id;
  }

  reset(): void {
    this.counter = 0;
  }
}

/**
 * Adapter interface for step execution.
 * Each step kind has a corresponding adapter.
 */
export interface StepAdapter<TInput = unknown, TOutput = unknown> {
  /** Unique kind identifier this adapter handles */
  readonly kind: string;

  /**
   * Executes the step with given input.
   * @param input - Step input data
   * @param ctx - Run context
   * @returns Step output
   */
  execute(input: TInput, ctx: RunContextData): Promise<TOutput>;
}

/**
 * Registry of step adapters by kind.
 */
export interface AdapterRegistry {
  /**
   * Gets adapter for specified kind.
   * @param kind - Step kind
   * @returns Adapter or undefined if not found
   */
  get(kind: string): StepAdapter | undefined;

  /**
   * Registers an adapter for a kind.
   * @param adapter - Adapter to register
   */
  register(adapter: StepAdapter): void;

  /**
   * Lists all registered kinds.
   * @returns Array of kind strings
   */
  kinds(): string[];
}

/**
 * Simple adapter registry implementation.
 */
export class SimpleAdapterRegistry implements AdapterRegistry {
  private readonly adapters: Map<string, StepAdapter> = new Map();

  get(kind: string): StepAdapter | undefined {
    return this.adapters.get(kind);
  }

  register(adapter: StepAdapter): void {
    if (this.adapters.has(adapter.kind)) {
      throw new Error(`Adapter for kind '${adapter.kind}' already registered`);
    }
    this.adapters.set(adapter.kind, adapter);
  }

  kinds(): string[] {
    return Array.from(this.adapters.keys()).sort();
  }
}

/**
 * Run context data (immutable after creation).
 */
export interface RunContextData {
  /** Unique run identifier */
  readonly run_id: string;
  /** Seed for determinism */
  readonly seed: string;
  /** Injectable clock */
  readonly clock: Clock;
  /** Platform information */
  readonly platform: PlatformInfo;
  /** Creation timestamp (ISO) */
  readonly created_at: string;
}

/**
 * Result of executing a single step.
 */
export interface StepResult {
  /** Step identifier */
  step_id: string;
  /** Step kind */
  kind: string;
  /** Execution status */
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'TIMEOUT';
  /** Step output (if successful) */
  output?: unknown;
  /** Error information (if failed) */
  error?: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
  };
  /** Start timestamp (ISO) */
  started_at: string;
  /** Completion timestamp (ISO) */
  completed_at: string;
  /** Duration in milliseconds */
  duration_ms: number;
}

/**
 * Overall run execution status.
 */
export type RunStatus = 'SUCCESS' | 'FAILURE' | 'PARTIAL';

/**
 * Result of executing an entire plan.
 */
export interface RunResult {
  /** Run identifier */
  run_id: string;
  /** Plan identifier */
  plan_id: string;
  /** Overall status */
  status: RunStatus;
  /** Results for each step */
  steps: StepResult[];
  /** Run start timestamp (ISO) */
  started_at: string;
  /** Run completion timestamp (ISO) */
  completed_at: string;
  /** Total duration in milliseconds */
  duration_ms: number;
  /** SHA-256 hash of serialized result (for determinism verification) */
  hash: string;
}

/**
 * Determinism verification report.
 */
export interface DeterminismReport {
  /** Whether the two runs are deterministically equivalent */
  is_deterministic: boolean;
  /** Run 1 hash */
  hash1: string;
  /** Run 2 hash */
  hash2: string;
  /** Differences found (if any) */
  differences: DeterminismDifference[];
}

/**
 * Single difference found between two runs.
 */
export interface DeterminismDifference {
  /** Path to the differing value */
  path: string;
  /** Value in run 1 */
  value1: unknown;
  /** Value in run 2 */
  value2: unknown;
}
