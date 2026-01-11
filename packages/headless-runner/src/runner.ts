/**
 * @fileoverview Core runner for the OMEGA Headless Runner.
 */

import {
  RunContext,
  createExecutor,
  SimpleAdapterRegistry,
  DeterministicClock,
  SeededIdFactory,
  assertDeterministic,
  type OrchestratorPlan,
  type AdapterRegistry,
  type RunResult,
  type Clock,
  type IdFactory,
} from '@omega/orchestrator-core';
import type { RunnerConfig, HeadlessRunResult, OutputFiles } from './types.js';
import { planFileToPlan, parsePlanJson, PlanLoadError } from './loader.js';
import {
  createLogger,
  generateOutputPaths,
  writeOutputFiles,
  type Logger,
  type OutputWriter,
} from './output.js';

/**
 * Runner options for execution.
 */
export interface RunnerOptions {
  /** Configuration */
  readonly config: RunnerConfig;
  /** Plan JSON content */
  readonly planContent: string;
  /** Output writer */
  readonly outputWriter: OutputWriter;
  /** Adapter registry */
  readonly adapters: AdapterRegistry;
}

/**
 * Internal runner state.
 */
interface RunnerState {
  readonly clock: Clock;
  readonly idFactory: IdFactory;
  readonly logger: Logger;
  readonly plan: OrchestratorPlan;
  readonly outputFiles: OutputFiles;
}

/**
 * Creates a runner state from options.
 */
function createRunnerState(options: RunnerOptions): RunnerState {
  const { config, planContent } = options;

  // Create or use provided clock
  const clock = config.clock ?? new DeterministicClock(Date.now());

  // Create or use provided ID factory
  const idFactory = config.idFactory ?? new SeededIdFactory(config.seed, 'run');

  // Create logger
  const verbosityToLevel = {
    0: 'error' as const,
    1: 'info' as const,
    2: 'debug' as const,
  };
  const logger = createLogger(clock, verbosityToLevel[config.verbosity]);

  // Parse and convert plan
  const planFile = parsePlanJson(planContent, config.planPath);
  const plan = planFileToPlan(planFile);

  // Generate output paths
  const runId = idFactory.next();
  const outputFiles = generateOutputPaths(config.outputDir, runId);

  return { clock, idFactory, logger, plan, outputFiles };
}

/**
 * Executes a single run and returns the result.
 */
async function executeRun(
  plan: OrchestratorPlan,
  config: RunnerConfig,
  clock: Clock,
  idFactory: IdFactory,
  adapters: AdapterRegistry,
  logger: Logger
): Promise<RunResult> {
  const ctx = new RunContext({
    seed: config.seed,
    clock,
    idFactory,
  });

  const executor = createExecutor();

  logger.info('Starting execution', { runId: ctx.run_id, seed: ctx.seed });

  const result = await executor.execute(plan, ctx, adapters);

  logger.info('Execution complete', {
    runId: result.run_id,
    status: result.status,
    stepsExecuted: result.steps.length,
  });

  return result;
}

/**
 * Converts a RunResult to a HeadlessRunResult.
 */
function toHeadlessResult(
  result: RunResult,
  seed: string,
  startTime: string,
  endTime: string,
  durationMs: number,
  outputFiles: OutputFiles,
  determinismVerified?: boolean
): HeadlessRunResult {
  const stepsSucceeded = result.steps.filter((s) => s.status === 'SUCCESS').length;
  const stepsFailed = result.steps.filter((s) => s.status === 'FAILURE').length;

  // Extract error from first failed step if any
  const firstFailed = result.steps.find((s) => s.status === 'FAILURE');
  const errorMessage = firstFailed?.error?.message;

  return {
    success: result.status === 'SUCCESS',
    runId: result.run_id,
    seed,
    startedAt: startTime,
    completedAt: endTime,
    durationMs,
    stepsExecuted: result.steps.length,
    stepsSucceeded,
    stepsFailed,
    error: errorMessage,
    determinismVerified,
    outputFiles,
  };
}

/**
 * Runs a plan headlessly and returns the result.
 */
export async function runHeadless(options: RunnerOptions): Promise<HeadlessRunResult> {
  const { config, outputWriter, adapters } = options;

  let state: RunnerState;
  try {
    state = createRunnerState(options);
  } catch (err) {
    if (err instanceof PlanLoadError) {
      // Create minimal failure result
      const clock = config.clock ?? new DeterministicClock(Date.now());
      const now = clock.nowISO();
      return {
        success: false,
        runId: 'error',
        seed: config.seed,
        startedAt: now,
        completedAt: now,
        durationMs: 0,
        stepsExecuted: 0,
        stepsSucceeded: 0,
        stepsFailed: 0,
        error: err.message,
        outputFiles: {
          result: `${config.outputDir}/error_result.json`,
          log: `${config.outputDir}/error.log`,
          hash: `${config.outputDir}/error.sha256`,
        },
      };
    }
    throw err;
  }

  const { clock, idFactory, logger, plan, outputFiles } = state;

  const startTime = clock.nowISO();
  const startMs = clock.now();

  logger.info('Plan loaded', {
    path: config.planPath,
    steps: plan.steps.length,
  });

  try {
    let determinismVerified: boolean | undefined;
    let mainResult: RunResult;

    // Verify determinism if requested - run twice with fresh state each time
    if (config.verifyDeterminism) {
      logger.info('Running with determinism verification');

      // First run with fresh clock and ID factory
      const clock1 = new DeterministicClock(startMs);
      const idFactory1 = new SeededIdFactory(config.seed, 'run');
      const result1 = await executeRun(plan, config, clock1, idFactory1, adapters, logger);

      // Second run with fresh clock and ID factory (same initial state)
      const clock2 = new DeterministicClock(startMs);
      const idFactory2 = new SeededIdFactory(config.seed, 'run');
      const result2 = await executeRun(plan, config, clock2, idFactory2, adapters, logger);

      try {
        assertDeterministic(result1, result2);
        determinismVerified = true;
        logger.info('Determinism verified');
      } catch (err) {
        determinismVerified = false;
        logger.error('Determinism verification failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      mainResult = result1;
    } else {
      // Single run without determinism verification
      mainResult = await executeRun(plan, config, clock, idFactory, adapters, logger);
    }

    const endTime = clock.nowISO();
    const durationMs = clock.now() - startMs;

    const headlessResult = toHeadlessResult(
      mainResult,
      config.seed,
      startTime,
      endTime,
      durationMs,
      outputFiles,
      determinismVerified
    );

    // Write output files
    writeOutputFiles(outputWriter, headlessResult, logger.getEntries());

    return headlessResult;
  } catch (err) {
    const endTime = clock.nowISO();
    const durationMs = clock.now() - startMs;

    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Execution failed', { error: errorMessage });

    const headlessResult: HeadlessRunResult = {
      success: false,
      runId: outputFiles.result.split('/').pop()?.replace('_result.json', '') ?? 'error',
      seed: config.seed,
      startedAt: startTime,
      completedAt: endTime,
      durationMs,
      stepsExecuted: 0,
      stepsSucceeded: 0,
      stepsFailed: 0,
      error: errorMessage,
      outputFiles,
    };

    // Write output files even on failure
    writeOutputFiles(outputWriter, headlessResult, logger.getEntries());

    return headlessResult;
  }
}

/**
 * Creates a default adapter registry with a no-op adapter.
 */
export function createDefaultAdapters(): AdapterRegistry {
  const registry = new SimpleAdapterRegistry();

  // Register a no-op adapter for testing
  registry.register({
    kind: 'noop',
    execute: async (_input, _ctx) => ({ result: 'noop' }),
  });

  // Register an echo adapter
  registry.register({
    kind: 'echo',
    execute: async (input, _ctx) => ({ echoed: input }),
  });

  // Register a fail adapter for testing error paths
  registry.register({
    kind: 'fail',
    execute: async (input, _ctx) => {
      const message = typeof input === 'object' && input !== null && 'message' in input
        ? String((input as { message: unknown }).message)
        : 'Intentional failure';
      throw new Error(message);
    },
  });

  return registry;
}
