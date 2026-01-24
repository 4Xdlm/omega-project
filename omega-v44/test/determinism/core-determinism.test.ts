/**
 * OMEGA V4.4 — Core Determinism Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * CRITICAL: Same input + same config = same output (always)
 */

import { describe, it, expect } from 'vitest';
import { CoreEngine, hashObject } from '../../src/phase2_core/index.js';
import type { TextInput } from '../../src/phase2_core/index.js';

describe('Core Engine — Determinism', () => {
  const engine = new CoreEngine();

  const createInput = (text: string): TextInput => ({
    text,
    timestamp: 1000000000000, // Fixed timestamp for determinism
    sourceId: 'test',
  });

  it('same text produces identical output (hash match)', () => {
    const input = createInput('Hello, world!');

    const output1 = engine.compute(input);
    const output2 = engine.compute(input);

    // Convert emotions Map to comparable format
    const emotions1 = Array.from(output1.emotions.entries());
    const emotions2 = Array.from(output2.emotions.entries());

    expect(emotions1).toEqual(emotions2);
    expect(output1.dominantEmotion).toBe(output2.dominantEmotion);
    expect(output1.axes).toEqual(output2.axes);
    expect(output1.totalIntensity).toBe(output2.totalIntensity);
    expect(output1.configHash).toBe(output2.configHash);
  });

  it('same text produces identical hash', () => {
    const input = createInput('Test determinism with this specific text.');

    const output1 = engine.compute(input);
    const output2 = engine.compute(input);

    // Hash the comparable parts
    const hash1 = hashObject({
      dominantEmotion: output1.dominantEmotion,
      axes: output1.axes,
      totalIntensity: output1.totalIntensity,
    });
    const hash2 = hashObject({
      dominantEmotion: output2.dominantEmotion,
      axes: output2.axes,
      totalIntensity: output2.totalIntensity,
    });

    expect(hash1).toBe(hash2);
  });

  it('different text produces different output', () => {
    const input1 = createInput('First text sample');
    const input2 = createInput('Second text sample');

    const output1 = engine.compute(input1);
    const output2 = engine.compute(input2);

    // At least one value should differ
    const axes1 = output1.axes;
    const axes2 = output2.axes;

    const differs =
      axes1.X !== axes2.X ||
      axes1.Y !== axes2.Y ||
      axes1.Z !== axes2.Z ||
      output1.totalIntensity !== output2.totalIntensity;

    expect(differs).toBe(true);
  });

  it('single character change produces different output', () => {
    const input1 = createInput('Hello World');
    const input2 = createInput('Hello world'); // lowercase 'w'

    const output1 = engine.compute(input1);
    const output2 = engine.compute(input2);

    // Outputs should be different
    const hash1 = hashObject(output1.axes);
    const hash2 = hashObject(output2.axes);

    expect(hash1).not.toBe(hash2);
  });

  it('multiple runs produce identical results', () => {
    const input = createInput('Consistency test');
    const results: string[] = [];

    for (let i = 0; i < 10; i++) {
      const output = engine.compute(input);
      results.push(hashObject({
        axes: output.axes,
        totalIntensity: output.totalIntensity,
      }));
    }

    // All results should be identical
    const firstResult = results[0];
    expect(results.every(r => r === firstResult)).toBe(true);
  });

  it('config hash is consistent', () => {
    const engine1 = new CoreEngine();
    const engine2 = new CoreEngine();

    expect(engine1.getConfigHash()).toBe(engine2.getConfigHash());
  });

  it('different config produces different config hash', () => {
    const engine1 = new CoreEngine();
    const engine2 = new CoreEngine({
      runtimeDefaults: {
        defaultC: 200,
        defaultOmega: 0,
        defaultPhi: 0,
      },
    });

    expect(engine1.getConfigHash()).not.toBe(engine2.getConfigHash());
  });

  it('handles unicode deterministically', () => {
    const input = createInput('Émotions: 喜怒哀楽 🎭');

    const output1 = engine.compute(input);
    const output2 = engine.compute(input);

    expect(output1.axes).toEqual(output2.axes);
    expect(output1.totalIntensity).toBe(output2.totalIntensity);
  });

  it('handles long text deterministically', () => {
    const longText = 'A'.repeat(10000) + 'B'.repeat(10000);
    const input = createInput(longText);

    const output1 = engine.compute(input);
    const output2 = engine.compute(input);

    expect(output1.axes).toEqual(output2.axes);
    expect(output1.totalIntensity).toBe(output2.totalIntensity);
  });
});
