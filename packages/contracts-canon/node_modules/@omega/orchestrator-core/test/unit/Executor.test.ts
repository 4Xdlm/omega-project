/**
 * @fileoverview Unit tests for Executor.
 */

import { describe, it, expect, vi } from 'vitest';
import { createExecutor, DefaultExecutor } from '../../src/core/Executor.js';
import { createRunContext } from '../../src/core/RunContext.js';
import { createPlanBuilder } from '../../src/core/Plan.js';
import { SimpleAdapterRegistry, type StepAdapter } from '../../src/core/types.js';
import { DeterministicClock } from '../../src/util/clock.js';

// Helper to create a noop adapter
function createNoopAdapter(): StepAdapter {
  return {
    kind: 'noop',
    async execute(input) {
      return { received: input };
    },
  };
}

// Helper to create a failing adapter
function createFailingAdapter(): StepAdapter {
  return {
    kind: 'fail',
    async execute() {
      throw new Error('Intentional failure');
    },
  };
}

// Helper to create a slow adapter
function createSlowAdapter(delayMs: number): StepAdapter {
  return {
    kind: 'slow',
    async execute(input) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { delayed: true, input };
    },
  };
}

describe('DefaultExecutor', () => {
  it('should create with default options', () => {
    const executor = createExecutor();
    expect(executor).toBeInstanceOf(DefaultExecutor);
  });

  it('should execute a single step plan', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();
    adapters.register(createNoopAdapter());

    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 'step-1', kind: 'noop', input: { value: 42 } })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('SUCCESS');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].status).toBe('SUCCESS');
    expect(result.steps[0].output).toEqual({ received: { value: 42 } });
  });

  it('should execute multiple steps in order', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();

    let callOrder: string[] = [];
    adapters.register({
      kind: 'track',
      async execute(input) {
        callOrder.push((input as { id: string }).id);
        return { tracked: true };
      },
    });

    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 's1', kind: 'track', input: { id: 'first' } })
      .addStep({ id: 's2', kind: 'track', input: { id: 'second' } })
      .addStep({ id: 's3', kind: 'track', input: { id: 'third' } })
      .build();

    const executor = createExecutor();
    await executor.execute(plan, ctx, adapters);

    expect(callOrder).toEqual(['first', 'second', 'third']);
  });

  it('should stop on failure by default', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();
    adapters.register(createNoopAdapter());
    adapters.register(createFailingAdapter());

    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 's1', kind: 'noop', input: {} })
      .addStep({ id: 's2', kind: 'fail', input: {} })
      .addStep({ id: 's3', kind: 'noop', input: {} })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('PARTIAL');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].status).toBe('SUCCESS');
    expect(result.steps[1].status).toBe('FAILURE');
  });

  it('should continue on failure when configured', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();
    adapters.register(createNoopAdapter());
    adapters.register(createFailingAdapter());

    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 's1', kind: 'noop', input: {} })
      .addStep({ id: 's2', kind: 'fail', input: {} })
      .addStep({ id: 's3', kind: 'noop', input: {} })
      .build();

    const executor = createExecutor({ continueOnFailure: true });
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.steps).toHaveLength(3);
    expect(result.steps[2].status).toBe('SUCCESS');
  });

  it('should handle missing adapter', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();
    // No adapters registered

    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 's1', kind: 'unknown', input: {} })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('FAILURE');
    expect(result.steps[0].status).toBe('FAILURE');
    expect(result.steps[0].error?.code).toBe('OMEGA_ORCH_005');
  });

  it('should skip steps with failed dependencies', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();
    adapters.register(createNoopAdapter());
    adapters.register(createFailingAdapter());

    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 's1', kind: 'fail', input: {} })
      .addStep({ id: 's2', kind: 'noop', input: {}, depends_on: ['s1'] })
      .build();

    const executor = createExecutor({ continueOnFailure: true });
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.steps[1].status).toBe('SKIPPED');
  });

  it('should call pre-step hook', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();
    adapters.register(createNoopAdapter());

    const preHook = vi.fn();
    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 's1', kind: 'noop', input: {} })
      .onPreStep(preHook)
      .build();

    const executor = createExecutor();
    await executor.execute(plan, ctx, adapters);

    expect(preHook).toHaveBeenCalledTimes(1);
    expect(preHook).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1' }),
      expect.objectContaining({ run_id: ctx.run_id })
    );
  });

  it('should call post-step hook', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();
    adapters.register(createNoopAdapter());

    const postHook = vi.fn();
    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 's1', kind: 'noop', input: {} })
      .onPostStep(postHook)
      .build();

    const executor = createExecutor();
    await executor.execute(plan, ctx, adapters);

    expect(postHook).toHaveBeenCalledTimes(1);
    expect(postHook).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1' }),
      expect.objectContaining({ status: 'SUCCESS' })
    );
  });

  it('should compute result hash', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();
    adapters.register(createNoopAdapter());

    const plan = createPlanBuilder('plan', '1.0.0')
      .addStep({ id: 's1', kind: 'noop', input: {} })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should return FAILURE status for invalid plan', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const adapters = new SimpleAdapterRegistry();

    // Use buildUnsafe to create an invalid plan
    const plan = createPlanBuilder('', '1.0.0').buildUnsafe();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('FAILURE');
  });
});
