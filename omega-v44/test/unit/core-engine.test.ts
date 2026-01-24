/**
 * OMEGA V4.4 — CoreEngine Unit Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { CoreEngine, DEFAULT_BOUNDS, DEFAULT_RUNTIME_CONFIG } from '../../src/phase2_core/index.js';
import { EMOTION_IDS } from '../../src/phase1_contract/index.js';
import type { TextInput } from '../../src/phase2_core/index.js';

describe('CoreEngine', () => {
  const createInput = (text: string): TextInput => ({
    text,
    timestamp: 1000000000000,
    sourceId: 'test',
  });

  describe('constructor', () => {
    it('creates engine with default config', () => {
      const engine = new CoreEngine();
      const config = engine.getConfig();

      expect(config.bounds).toEqual(DEFAULT_BOUNDS);
      expect(config.runtimeDefaults).toEqual(DEFAULT_RUNTIME_CONFIG);
    });

    it('creates engine with custom config', () => {
      const engine = new CoreEngine({
        runtimeDefaults: {
          defaultC: 200,
          defaultOmega: 1,
          defaultPhi: 0.5,
        },
      });
      const config = engine.getConfig();

      expect(config.runtimeDefaults.defaultC).toBe(200);
      expect(config.runtimeDefaults.defaultOmega).toBe(1);
      expect(config.runtimeDefaults.defaultPhi).toBe(0.5);
    });

    it('generates config hash', () => {
      const engine = new CoreEngine();
      const hash = engine.getConfigHash();

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('compute()', () => {
    const engine = new CoreEngine();

    it('returns valid output for valid input', () => {
      const input = createInput('Test text for emotional analysis');
      const output = engine.compute(input);

      expect(output.validationStatus).toBe('VALID');
      expect(output.validationErrors).toHaveLength(0);
    });

    it('returns all 16 emotions', () => {
      const input = createInput('Test text');
      const output = engine.compute(input);

      expect(output.emotions.size).toBe(16);

      for (const id of EMOTION_IDS) {
        expect(output.emotions.has(id)).toBe(true);
      }
    });

    it('returns INVALID for empty text', () => {
      const input = createInput('');
      const output = engine.compute(input);

      expect(output.validationStatus).toBe('INVALID');
      expect(output.validationErrors).toContain('Empty text input');
    });

    it('returns INVALID for whitespace-only text', () => {
      const input = createInput('   \t\n  ');
      const output = engine.compute(input);

      expect(output.validationStatus).toBe('INVALID');
    });

    it('includes config hash in output', () => {
      const input = createInput('Test');
      const output = engine.compute(input);

      expect(output.configHash).toBe(engine.getConfigHash());
    });

    it('includes timestamp in output', () => {
      const input = createInput('Test');
      const output = engine.compute(input);

      expect(output.timestamp).toBe(input.timestamp);
    });

    it('calculates axes within bounds', () => {
      const input = createInput('Test emotional content');
      const output = engine.compute(input);

      expect(output.axes.X).toBeGreaterThanOrEqual(-10);
      expect(output.axes.X).toBeLessThanOrEqual(10);
      expect(output.axes.Y).toBeGreaterThanOrEqual(0);
      expect(output.axes.Y).toBeLessThanOrEqual(100);
      expect(output.axes.Z).toBeGreaterThanOrEqual(0);
      expect(output.axes.Z).toBeLessThanOrEqual(1);
    });

    it('identifies dominant emotion', () => {
      const input = createInput('Test');
      const output = engine.compute(input);

      expect(EMOTION_IDS).toContain(output.dominantEmotion);

      // Dominant should have highest intensity
      const dominantEmotion = output.emotions.get(output.dominantEmotion);
      expect(dominantEmotion).toBeDefined();

      if (dominantEmotion) {
        for (const [id, emotion] of output.emotions) {
          expect(dominantEmotion.intensity).toBeGreaterThanOrEqual(emotion.intensity);
        }
      }
    });

    it('calculates total intensity', () => {
      const input = createInput('Test');
      const output = engine.compute(input);

      let sum = 0;
      for (const emotion of output.emotions.values()) {
        sum += Math.abs(emotion.intensity);
      }

      expect(output.totalIntensity).toBeCloseTo(sum, 5);
    });

    it('each emotion has valid params', () => {
      const input = createInput('Test text');
      const output = engine.compute(input);

      for (const emotion of output.emotions.values()) {
        // Canon params
        expect(emotion.params.M).toBeGreaterThan(0);
        expect(emotion.params.lambda).toBeGreaterThan(0);
        expect(emotion.params.kappa).toBeGreaterThanOrEqual(0.6);
        expect(emotion.params.kappa).toBeLessThanOrEqual(1.8);
        expect(emotion.params.zeta).toBeGreaterThanOrEqual(0);
        expect(emotion.params.mu).toBeGreaterThanOrEqual(0);
        expect(emotion.params.mu).toBeLessThanOrEqual(1);

        // Runtime params
        expect(emotion.params.C).toBeGreaterThan(0);
        expect(emotion.params.omega).toBeGreaterThanOrEqual(0);
        expect(typeof emotion.params.phi).toBe('number');
      }
    });

    it('each emotion position is within bounds', () => {
      const input = createInput('Test text with emotional content');
      const output = engine.compute(input);

      for (const emotion of output.emotions.values()) {
        expect(emotion.position.x).toBeGreaterThanOrEqual(-10);
        expect(emotion.position.x).toBeLessThanOrEqual(10);
        expect(emotion.position.y).toBeGreaterThanOrEqual(0);
        expect(emotion.position.y).toBeLessThanOrEqual(100);
        expect(emotion.position.z).toBeGreaterThanOrEqual(0);
        expect(emotion.position.z).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('hash utilities', () => {
    it('produces consistent config hash', () => {
      const engine1 = new CoreEngine();
      const engine2 = new CoreEngine();

      expect(engine1.getConfigHash()).toBe(engine2.getConfigHash());
    });
  });
});
