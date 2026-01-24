/**
 * OMEGA V4.4 — Core Performance Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Benchmarks:
 * - Calcul état émotionnel: <10ms
 * - Injection runtime: <2ms
 */

import { describe, it, expect } from 'vitest';
import { CoreEngine } from '../../src/phase2_core/index.js';
import type { TextInput } from '../../src/phase2_core/index.js';

describe('Core Engine — Performance', () => {
  const engine = new CoreEngine();

  const createInput = (text: string): TextInput => ({
    text,
    timestamp: Date.now(),
    sourceId: 'perf-test',
  });

  it('computes small text in <10ms', () => {
    const input = createInput('Small text for performance test.');

    const start = performance.now();
    engine.compute(input);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('computes medium text (1KB) in <10ms', () => {
    const text = 'A'.repeat(1024);
    const input = createInput(text);

    const start = performance.now();
    engine.compute(input);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('computes large text (10KB) in <50ms', () => {
    const text = 'A'.repeat(10 * 1024);
    const input = createInput(text);

    const start = performance.now();
    engine.compute(input);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });

  it('engine instantiation in <2ms', () => {
    const start = performance.now();
    new CoreEngine();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(2);
  });

  it('batch processing maintains performance', () => {
    const iterations = 100;
    const inputs = Array.from({ length: iterations }, (_, i) =>
      createInput(`Test text ${i} for batch processing`)
    );

    const start = performance.now();
    for (const input of inputs) {
      engine.compute(input);
    }
    const totalDuration = performance.now() - start;
    const avgDuration = totalDuration / iterations;

    // Average should be well under 10ms
    expect(avgDuration).toBeLessThan(5);
  });

  it('memory does not grow excessively', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Run many iterations
    for (let i = 0; i < 1000; i++) {
      const input = createInput(`Iteration ${i} text content`);
      engine.compute(input);
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;

    // Memory growth should be reasonable (< 50MB)
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });
});
