/**
 * @fileoverview Integration tests for determinism verification.
 * Verifies that identical inputs produce identical outputs.
 */

import { describe, it, expect } from 'vitest';
import {
  createRunContext,
  createPlanBuilder,
  createExecutor,
  createDeterminismGuard,
  assertDeterministic,
  SimpleAdapterRegistry,
  DeterministicClock,
  SeededIdFactory,
  sha256,
  type StepAdapter,
} from '../../src/index.js';

// Deterministic adapter - always produces same output for same input
const deterministicAdapter: StepAdapter = {
  kind: 'deterministic',
  async execute(input: unknown) {
    const data = input as { value: number };
    return {
      doubled: data.value * 2,
      squared: data.value * data.value,
      hash: sha256(String(data.value)),
    };
  },
};

// Adapter that uses seeded RNG
const seededRngAdapter: StepAdapter = {
  kind: 'seeded-rng',
  async execute(input: unknown) {
    const { seed, count } = input as { seed: string; count: number };
    // Simple seeded "random" using hash
    const results: number[] = [];
    let current = seed;
    for (let i = 0; i < count; i++) {
      current = sha256(current);
      // Take first 8 hex chars and convert to number
      results.push(parseInt(current.substring(0, 8), 16));
    }
    return { values: results };
  },
};

describe('Determinism Double Run Integration', () => {
  it('should produce identical results for same seed', async () => {
    const seed = 'determinism-test-seed';

    // Run 1
    const clock1 = new DeterministicClock(0);
    const ctx1 = createRunContext({ seed, clock: clock1 });
    const adapters1 = new SimpleAdapterRegistry();
    adapters1.register(deterministicAdapter);

    const plan = createPlanBuilder('det-plan', '1.0.0')
      .addStep({ id: 's1', kind: 'deterministic', input: { value: 42 } })
      .addStep({ id: 's2', kind: 'deterministic', input: { value: 100 } })
      .build();

    const executor = createExecutor();
    const result1 = await executor.execute(plan, ctx1, adapters1);

    // Run 2 - identical setup
    const clock2 = new DeterministicClock(0);
    const ctx2 = createRunContext({ seed, clock: clock2 });
    const adapters2 = new SimpleAdapterRegistry();
    adapters2.register(deterministicAdapter);

    const result2 = await executor.execute(plan, ctx2, adapters2);

    // Verify determinism
    expect(result1.hash).toBe(result2.hash);
    expect(result1.run_id).toBe(result2.run_id);
    expect(result1.status).toBe(result2.status);
    expect(result1.steps.length).toBe(result2.steps.length);

    for (let i = 0; i < result1.steps.length; i++) {
      expect(result1.steps[i].output).toEqual(result2.steps[i].output);
    }
  });

  it('should pass assertDeterministic for identical runs', async () => {
    const seed = 'assert-test';

    const clock1 = new DeterministicClock(0);
    const ctx1 = createRunContext({ seed, clock: clock1 });

    const clock2 = new DeterministicClock(0);
    const ctx2 = createRunContext({ seed, clock: clock2 });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(deterministicAdapter);

    const plan = createPlanBuilder('assert-plan', '1.0.0')
      .addStep({ id: 's1', kind: 'deterministic', input: { value: 7 } })
      .build();

    const executor = createExecutor();
    const result1 = await executor.execute(plan, ctx1, adapters);
    const result2 = await executor.execute(plan, ctx2, adapters);

    // Should not throw
    expect(() => assertDeterministic(result1, result2)).not.toThrow();
  });

  it('should detect non-determinism with different seeds', async () => {
    const clock1 = new DeterministicClock(0);
    const ctx1 = createRunContext({ seed: 'seed-A', clock: clock1 });

    const clock2 = new DeterministicClock(0);
    const ctx2 = createRunContext({ seed: 'seed-B', clock: clock2 });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(deterministicAdapter);

    const plan = createPlanBuilder('diff-seeds', '1.0.0')
      .addStep({ id: 's1', kind: 'deterministic', input: { value: 5 } })
      .build();

    const executor = createExecutor();
    const result1 = await executor.execute(plan, ctx1, adapters);
    const result2 = await executor.execute(plan, ctx2, adapters);

    // Different seeds = different run_ids = different hashes
    expect(result1.hash).not.toBe(result2.hash);
    expect(result1.run_id).not.toBe(result2.run_id);

    const guard = createDeterminismGuard();
    const report = guard.verify(result1, result2);
    expect(report.is_deterministic).toBe(false);
  });

  it('should produce deterministic seeded random numbers', async () => {
    const seed = 'rng-test';

    // Run 1
    const clock1 = new DeterministicClock(0);
    const ctx1 = createRunContext({ seed, clock: clock1 });
    const adapters1 = new SimpleAdapterRegistry();
    adapters1.register(seededRngAdapter);

    const plan = createPlanBuilder('rng-plan', '1.0.0')
      .addStep({ id: 'rng', kind: 'seeded-rng', input: { seed: 'random-seed', count: 10 } })
      .build();

    const executor = createExecutor();
    const result1 = await executor.execute(plan, ctx1, adapters1);

    // Run 2
    const clock2 = new DeterministicClock(0);
    const ctx2 = createRunContext({ seed, clock: clock2 });
    const adapters2 = new SimpleAdapterRegistry();
    adapters2.register(seededRngAdapter);

    const result2 = await executor.execute(plan, ctx2, adapters2);

    // Same "random" values
    const output1 = result1.steps[0].output as { values: number[] };
    const output2 = result2.steps[0].output as { values: number[] };
    expect(output1.values).toEqual(output2.values);
    expect(result1.hash).toBe(result2.hash);
  });

  it('should handle complex multi-step determinism', async () => {
    const seed = 'complex-test';

    const complexAdapter: StepAdapter = {
      kind: 'complex',
      async execute(input: unknown) {
        const { a, b, op } = input as { a: number; b: number; op: string };
        let result: number;
        switch (op) {
          case 'add': result = a + b; break;
          case 'mul': result = a * b; break;
          case 'sub': result = a - b; break;
          default: result = 0;
        }
        return { operation: op, result, hash: sha256(`${a}${op}${b}`) };
      },
    };

    const plan = createPlanBuilder('complex', '1.0.0')
      .addStep({ id: 'op1', kind: 'complex', input: { a: 10, b: 5, op: 'add' } })
      .addStep({ id: 'op2', kind: 'complex', input: { a: 10, b: 5, op: 'mul' } })
      .addStep({ id: 'op3', kind: 'complex', input: { a: 10, b: 5, op: 'sub' } })
      .build();

    // Run twice
    const results: unknown[] = [];
    for (let i = 0; i < 2; i++) {
      const clock = new DeterministicClock(0);
      const ctx = createRunContext({ seed, clock });
      const adapters = new SimpleAdapterRegistry();
      adapters.register(complexAdapter);

      const executor = createExecutor();
      results.push(await executor.execute(plan, ctx, adapters));
    }

    assertDeterministic(results[0] as any, results[1] as any);
  });

  it('should maintain determinism with hooks', async () => {
    const seed = 'hooks-det-test';
    const hookCalls: string[][] = [[], []];

    for (let run = 0; run < 2; run++) {
      const clock = new DeterministicClock(0);
      const ctx = createRunContext({ seed, clock });
      const adapters = new SimpleAdapterRegistry();
      adapters.register(deterministicAdapter);

      const plan = createPlanBuilder('hooks-plan', '1.0.0')
        .addStep({ id: 's1', kind: 'deterministic', input: { value: 1 } })
        .addStep({ id: 's2', kind: 'deterministic', input: { value: 2 } })
        .onPreStep((step) => hookCalls[run].push(`pre:${step.id}`))
        .onPostStep((step) => hookCalls[run].push(`post:${step.id}`))
        .build();

      const executor = createExecutor();
      await executor.execute(plan, ctx, adapters);
    }

    // Hook calls should be identical
    expect(hookCalls[0]).toEqual(hookCalls[1]);
    expect(hookCalls[0]).toEqual(['pre:s1', 'post:s1', 'pre:s2', 'post:s2']);
  });

  it('should verify guard report details', async () => {
    const seed = 'guard-report';

    const clock1 = new DeterministicClock(0);
    const ctx1 = createRunContext({ seed, clock: clock1 });

    const clock2 = new DeterministicClock(0);
    const ctx2 = createRunContext({ seed, clock: clock2 });

    const adapters = new SimpleAdapterRegistry();
    adapters.register(deterministicAdapter);

    const plan = createPlanBuilder('report-plan', '1.0.0')
      .addStep({ id: 's1', kind: 'deterministic', input: { value: 99 } })
      .build();

    const executor = createExecutor();
    const result1 = await executor.execute(plan, ctx1, adapters);
    const result2 = await executor.execute(plan, ctx2, adapters);

    const guard = createDeterminismGuard();
    const report = guard.verify(result1, result2);

    expect(report.is_deterministic).toBe(true);
    expect(report.hash1).toBe(result1.hash);
    expect(report.hash2).toBe(result2.hash);
    expect(report.differences).toHaveLength(0);
  });
});
