/**
 * @fileoverview Integration tests for plan execution.
 */

import { describe, it, expect } from 'vitest';
import {
  createRunContext,
  createPlanBuilder,
  createExecutor,
  SimpleAdapterRegistry,
  DeterministicClock,
  type StepAdapter,
  type RunContextData,
} from '../../src/index.js';

// Adapter that transforms input
const transformAdapter: StepAdapter = {
  kind: 'transform',
  async execute(input: unknown) {
    const data = input as { value: number };
    return { result: data.value * 2 };
  },
};

// Adapter that accumulates values
const accumulatorAdapter: StepAdapter = {
  kind: 'accumulate',
  async execute(input: unknown, ctx: RunContextData) {
    const data = input as { values: number[] };
    return {
      sum: data.values.reduce((a, b) => a + b, 0),
      run_id: ctx.run_id,
    };
  },
};

// Adapter that uses context timestamp
const timestampAdapter: StepAdapter = {
  kind: 'timestamp',
  async execute(_input: unknown, ctx: RunContextData) {
    return {
      recorded_at: ctx.clock.nowISO(),
      run_id: ctx.run_id,
    };
  },
};

describe('Plan Execution Integration', () => {
  it('should execute complete pipeline with multiple adapters', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'pipeline-test', clock });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(transformAdapter);
    adapters.register(accumulatorAdapter);

    const plan = createPlanBuilder('pipeline', '1.0.0')
      .addStep({ id: 'transform-1', kind: 'transform', input: { value: 10 } })
      .addStep({ id: 'transform-2', kind: 'transform', input: { value: 20 } })
      .addStep({ id: 'sum', kind: 'accumulate', input: { values: [1, 2, 3, 4, 5] } })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('SUCCESS');
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].output).toEqual({ result: 20 });
    expect(result.steps[1].output).toEqual({ result: 40 });
    expect(result.steps[2].output).toEqual({ sum: 15, run_id: ctx.run_id });
  });

  it('should pass context to adapters', async () => {
    const clock = new DeterministicClock(Date.UTC(2026, 0, 15, 12, 0, 0));
    const ctx = createRunContext({ seed: 'context-test', clock });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(timestampAdapter);

    const plan = createPlanBuilder('ctx-plan', '1.0.0')
      .addStep({ id: 'ts-1', kind: 'timestamp', input: {} })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('SUCCESS');
    const output = result.steps[0].output as { recorded_at: string; run_id: string };
    expect(output.recorded_at).toBe('2026-01-15T12:00:00.000Z');
    expect(output.run_id).toBe(ctx.run_id);
  });

  it('should track timing correctly', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'timing-test', clock });

    let stepCount = 0;
    const timedAdapter: StepAdapter = {
      kind: 'timed',
      async execute() {
        stepCount++;
        clock.advance(100); // Simulate 100ms per step
        return { step: stepCount };
      },
    };

    const adapters = new SimpleAdapterRegistry();
    adapters.register(timedAdapter);

    const plan = createPlanBuilder('timing', '1.0.0')
      .addStep({ id: 's1', kind: 'timed', input: {} })
      .addStep({ id: 's2', kind: 'timed', input: {} })
      .addStep({ id: 's3', kind: 'timed', input: {} })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('SUCCESS');
    expect(result.steps[0].duration_ms).toBe(100);
    expect(result.steps[1].duration_ms).toBe(100);
    expect(result.steps[2].duration_ms).toBe(100);
    expect(result.duration_ms).toBe(300);
  });

  it('should handle plan with dependencies', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'deps-test', clock });

    const executionOrder: string[] = [];
    const orderAdapter: StepAdapter = {
      kind: 'order',
      async execute(input: unknown) {
        const id = (input as { id: string }).id;
        executionOrder.push(id);
        return { executed: id };
      },
    };

    const adapters = new SimpleAdapterRegistry();
    adapters.register(orderAdapter);

    const plan = createPlanBuilder('deps', '1.0.0')
      .addStep({ id: 'first', kind: 'order', input: { id: 'A' } })
      .addStep({ id: 'second', kind: 'order', input: { id: 'B' }, depends_on: ['first'] })
      .addStep({ id: 'third', kind: 'order', input: { id: 'C' }, depends_on: ['second'] })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    expect(result.status).toBe('SUCCESS');
    expect(executionOrder).toEqual(['A', 'B', 'C']);
  });

  it('should collect hooks data', async () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'hooks-test', clock });

    const preStepIds: string[] = [];
    const postStepStatuses: string[] = [];

    const adapters = new SimpleAdapterRegistry();
    adapters.register({
      kind: 'simple',
      async execute() {
        return { ok: true };
      },
    });

    const plan = createPlanBuilder('hooks', '1.0.0')
      .addStep({ id: 'h1', kind: 'simple', input: {} })
      .addStep({ id: 'h2', kind: 'simple', input: {} })
      .onPreStep((step) => preStepIds.push(step.id))
      .onPostStep((_, result) => postStepStatuses.push(result.status))
      .build();

    const executor = createExecutor();
    await executor.execute(plan, ctx, adapters);

    expect(preStepIds).toEqual(['h1', 'h2']);
    expect(postStepStatuses).toEqual(['SUCCESS', 'SUCCESS']);
  });

  it('should produce correct run result structure', async () => {
    const clock = new DeterministicClock(1000);
    const ctx = createRunContext({ seed: 'structure-test', clock });

    const adapters = new SimpleAdapterRegistry();
    adapters.register({
      kind: 'echo',
      async execute(input) {
        clock.advance(50);
        return input;
      },
    });

    const plan = createPlanBuilder('structure', '2.0.0')
      .addStep({ id: 'echo-1', kind: 'echo', input: { msg: 'hello' } })
      .withMetadata({ test: true })
      .build();

    const executor = createExecutor();
    const result = await executor.execute(plan, ctx, adapters);

    // Verify all required fields
    expect(result.run_id).toBe(ctx.run_id);
    expect(result.plan_id).toBe('structure');
    expect(result.status).toBe('SUCCESS');
    expect(result.steps).toHaveLength(1);
    expect(result.started_at).toBeDefined();
    expect(result.completed_at).toBeDefined();
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);

    // Verify step structure
    const step = result.steps[0];
    expect(step.step_id).toBe('echo-1');
    expect(step.kind).toBe('echo');
    expect(step.status).toBe('SUCCESS');
    expect(step.output).toEqual({ msg: 'hello' });
    expect(step.error).toBeUndefined();
    expect(step.started_at).toBeDefined();
    expect(step.completed_at).toBeDefined();
    expect(step.duration_ms).toBe(50);
  });
});
