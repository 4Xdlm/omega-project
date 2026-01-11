/**
 * @fileoverview Integration tests for error handling scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  createRunContext,
  createPlanBuilder,
  createExecutor,
  SimpleAdapterRegistry,
  DeterministicClock,
  OrchestratorErrorCode,
  type StepAdapter,
} from '../../src/index.js';

// Adapter that always fails
const failingAdapter: StepAdapter = {
  kind: 'fail',
  async execute(input: unknown) {
    const { message } = input as { message?: string };
    throw new Error(message ?? 'Step failed');
  },
};

// Adapter that fails conditionally
const conditionalAdapter: StepAdapter = {
  kind: 'conditional',
  async execute(input: unknown) {
    const { shouldFail, value } = input as { shouldFail: boolean; value: number };
    if (shouldFail) {
      throw new Error('Conditional failure triggered');
    }
    return { processed: value };
  },
};

// Adapter that succeeds
const successAdapter: StepAdapter = {
  kind: 'success',
  async execute(input: unknown) {
    return { received: input };
  },
};

describe('Error Handling Integration', () => {
  it('should capture step error details', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'error-test', clock });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(failingAdapter);

    const plan = createPlanBuilder('error-plan', '1.0.0')
      .addStep({ id: 'failing', kind: 'fail', input: { message: 'Test error message' } })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('FAILURE');
    expect(result.steps[0].status).toBe('FAILURE');
    expect(result.steps[0].error).toBeDefined();
    expect(result.steps[0].error?.code).toBe(OrchestratorErrorCode.OMEGA_ORCH_STEP_FAILED);
    expect(result.steps[0].error?.message).toContain('Test error message');
  });

  it('should handle missing adapter gracefully', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'missing-adapter', clock });

    const adapters = new SimpleAdapterRegistry();
    // No adapters registered

    const plan = createPlanBuilder('missing', '1.0.0')
      .addStep({ id: 'unknown', kind: 'nonexistent-adapter', input: {} })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('FAILURE');
    expect(result.steps[0].status).toBe('FAILURE');
    expect(result.steps[0].error?.code).toBe(OrchestratorErrorCode.OMEGA_ORCH_ADAPTER_NOT_FOUND);
    expect(result.steps[0].error?.context?.kind).toBe('nonexistent-adapter');
  });

  it('should recover and continue after error when configured', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'continue-on-error', clock });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(successAdapter);
    adapters.register(failingAdapter);

    const plan = createPlanBuilder('recovery', '1.0.0')
      .addStep({ id: 's1', kind: 'success', input: { v: 1 } })
      .addStep({ id: 's2', kind: 'fail', input: {} })
      .addStep({ id: 's3', kind: 'success', input: { v: 3 } })
      .build();

    const executor = createExecutor({ continueOnFailure: true });
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('PARTIAL');
    expect(result.steps[0].status).toBe('SUCCESS');
    expect(result.steps[1].status).toBe('FAILURE');
    expect(result.steps[2].status).toBe('SUCCESS');
  });

  it('should skip dependent steps when dependency fails', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'dependency-fail', clock });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(successAdapter);
    adapters.register(failingAdapter);

    const plan = createPlanBuilder('deps', '1.0.0')
      .addStep({ id: 'root', kind: 'fail', input: {} })
      .addStep({ id: 'child1', kind: 'success', input: {}, depends_on: ['root'] })
      .addStep({ id: 'child2', kind: 'success', input: {}, depends_on: ['child1'] })
      .build();

    const executor = createExecutor({ continueOnFailure: true });
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.steps[0].status).toBe('FAILURE');
    expect(result.steps[1].status).toBe('SKIPPED');
    expect(result.steps[2].status).toBe('SKIPPED');
  });

  it('should handle partial dependency chains', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'partial-deps', clock });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(successAdapter);
    adapters.register(conditionalAdapter);

    const plan = createPlanBuilder('partial', '1.0.0')
      .addStep({ id: 'a', kind: 'success', input: {} })
      .addStep({ id: 'b', kind: 'conditional', input: { shouldFail: true, value: 1 } })
      .addStep({ id: 'c', kind: 'success', input: {}, depends_on: ['a'] }) // Should succeed
      .addStep({ id: 'd', kind: 'success', input: {}, depends_on: ['b'] }) // Should skip
      .build();

    const executor = createExecutor({ continueOnFailure: true });
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.steps[0].status).toBe('SUCCESS');
    expect(result.steps[1].status).toBe('FAILURE');
    expect(result.steps[2].status).toBe('SUCCESS'); // Depends on 'a' which succeeded
    expect(result.steps[3].status).toBe('SKIPPED'); // Depends on 'b' which failed
  });

  it('should produce deterministic errors', async () => {
    const seed = 'det-error';

    // Run twice with same setup
    const results = [];
    for (let i = 0; i < 2; i++) {
      const clock = new DeterministicClock(0);
      const ctx = createRunContext({ seed, clock });

      const adapters = new SimpleAdapterRegistry();
      adapters.register(failingAdapter);

      const plan = createPlanBuilder('det-fail', '1.0.0')
        .addStep({ id: 'fail', kind: 'fail', input: { message: 'consistent error' } })
        .build();

      const executor = createExecutor();
      results.push(await executor.execute(plan, ctx, adapters));
    }

    // Error structure should be identical
    expect(results[0].hash).toBe(results[1].hash);
    expect(results[0].steps[0].error).toEqual(results[1].steps[0].error);
  });

  it('should handle hooks that throw without affecting execution', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'hook-error', clock });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(successAdapter);

    const plan = createPlanBuilder('hook-fail', '1.0.0')
      .addStep({ id: 's1', kind: 'success', input: { v: 1 } })
      .addStep({ id: 's2', kind: 'success', input: { v: 2 } })
      .onPreStep(() => {
        throw new Error('Pre-step hook error');
      })
      .onPostStep(() => {
        throw new Error('Post-step hook error');
      })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    // Execution should succeed despite hook errors
    expect(result.status).toBe('SUCCESS');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].status).toBe('SUCCESS');
    expect(result.steps[1].status).toBe('SUCCESS');
  });

  it('should handle empty error message', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'empty-error', clock });

    const emptyErrorAdapter: StepAdapter = {
      kind: 'empty-error',
      async execute() {
        throw new Error('');
      },
    };

    const adapters = new SimpleAdapterRegistry();
    adapters.register(emptyErrorAdapter);

    const plan = createPlanBuilder('empty', '1.0.0')
      .addStep({ id: 's1', kind: 'empty-error', input: {} })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('FAILURE');
    expect(result.steps[0].error).toBeDefined();
  });
});
