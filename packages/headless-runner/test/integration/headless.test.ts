/**
 * @fileoverview Integration tests for headless runner.
 */

import { describe, it, expect } from 'vitest';
import { DeterministicClock, SeededIdFactory, SimpleAdapterRegistry } from '@omega/orchestrator-core';
import { runHeadless, createDefaultAdapters } from '../../src/runner.js';
import { InMemoryOutputWriter } from '../../src/output.js';
import { planToPlanFile } from '../../src/loader.js';
import type { RunnerConfig } from '../../src/types.js';

describe('Headless Runner Integration', () => {
  const createTestConfig = (): RunnerConfig => ({
    seed: 'integration-test',
    planPath: 'integration.json',
    outputDir: '/test-output',
    verbosity: 2,
    verifyDeterminism: false,
    clock: new DeterministicClock(Date.UTC(2026, 0, 1, 12, 0, 0)),
    idFactory: new SeededIdFactory('integration-test', 'run'),
  });

  describe('full execution flow', () => {
    it('should execute multi-step plan', async () => {
      const config = createTestConfig();
      const plan = {
        steps: [
          { id: 'step1', kind: 'echo', input: { msg: 'first' } },
          { id: 'step2', kind: 'echo', input: { msg: 'second' }, depends_on: ['step1'] },
          { id: 'step3', kind: 'noop', input: {}, depends_on: ['step2'] },
        ],
      };
      const planContent = JSON.stringify(planToPlanFile(plan));
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.success).toBe(true);
      expect(result.stepsExecuted).toBe(3);
      expect(result.stepsSucceeded).toBe(3);
      expect(result.stepsFailed).toBe(0);
    });

    it('should stop on first failure', async () => {
      const config = createTestConfig();
      const plan = {
        steps: [
          { id: 'step1', kind: 'echo', input: { msg: 'ok' } },
          { id: 'step2', kind: 'fail', input: { message: 'boom' }, depends_on: ['step1'] },
          { id: 'step3', kind: 'noop', input: {}, depends_on: ['step2'] },
        ],
      };
      const planContent = JSON.stringify(planToPlanFile(plan));
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.success).toBe(false);
      expect(result.stepsFailed).toBeGreaterThan(0);
    });
  });

  describe('output generation', () => {
    it('should generate all output files', async () => {
      const config = createTestConfig();
      const plan = { steps: [{ id: 's1', kind: 'noop', input: {} }] };
      const planContent = JSON.stringify(planToPlanFile(plan));
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      // Check all expected files exist
      expect(outputWriter.exists(result.outputFiles.result)).toBe(true);
      expect(outputWriter.exists(result.outputFiles.log)).toBe(true);
      expect(outputWriter.exists(result.outputFiles.hash)).toBe(true);
    });

    it('should write valid JSON result', async () => {
      const config = createTestConfig();
      const plan = { steps: [] };
      const planContent = JSON.stringify(planToPlanFile(plan));
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      const resultContent = outputWriter.getFile(result.outputFiles.result);
      expect(() => JSON.parse(resultContent!)).not.toThrow();
    });

    it('should write log entries', async () => {
      const config = createTestConfig();
      const plan = {
        steps: [{ id: 's1', kind: 'echo', input: { test: true } }],
      };
      const planContent = JSON.stringify(planToPlanFile(plan));
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      const logContent = outputWriter.getFile(result.outputFiles.log);
      expect(logContent).toContain('INFO');
      expect(logContent).toContain('Starting execution');
    });
  });

  describe('determinism verification', () => {
    it('should verify determinism for deterministic plan', async () => {
      // Don't pass clock/idFactory for determinism tests - they get mutated during runs
      const config: RunnerConfig = {
        seed: 'determinism-test',
        planPath: 'test.json',
        outputDir: '/test-output',
        verbosity: 2,
        verifyDeterminism: true,
      };
      const plan = {
        id: 'det-plan',
        version: '1.0.0',
        steps: [
          { id: 's1', kind: 'noop', input: {} },
          { id: 's2', kind: 'echo', input: { x: 1 }, depends_on: ['s1'] },
        ],
      };
      const planContent = JSON.stringify(planToPlanFile(plan));
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.success).toBe(true);
      expect(result.determinismVerified).toBe(true);
    });
  });

  describe('custom adapters', () => {
    it('should work with custom adapter', async () => {
      const config = createTestConfig();
      const plan = {
        steps: [
          { id: 's1', kind: 'custom', input: { value: 42 } },
        ],
      };
      const planContent = JSON.stringify(planToPlanFile(plan));
      const outputWriter = new InMemoryOutputWriter();

      const adapters = new SimpleAdapterRegistry();
      adapters.register({
        kind: 'custom',
        execute: async (input) => {
          const { value } = input as { value: number };
          return { doubled: value * 2 };
        },
      });

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.success).toBe(true);
      expect(result.stepsSucceeded).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle adapter not found', async () => {
      const config = createTestConfig();
      const plan = {
        steps: [{ id: 's1', kind: 'nonexistent', input: {} }],
      };
      const planContent = JSON.stringify(planToPlanFile(plan));
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.success).toBe(false);
    });

    it('should still write output on failure', async () => {
      const config = createTestConfig();
      const plan = {
        steps: [{ id: 's1', kind: 'fail', input: {} }],
      };
      const planContent = JSON.stringify(planToPlanFile(plan));
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(outputWriter.getFiles().size).toBeGreaterThan(0);
    });
  });

  describe('plan file round-trip', () => {
    it('should preserve plan through serialization', async () => {
      const config = createTestConfig();
      const originalPlan = {
        steps: [
          { id: 'a', kind: 'noop', input: { x: 1 } },
          { id: 'b', kind: 'echo', input: { y: 2 }, depends_on: ['a'], timeout_ms: 5000 },
        ],
        hooks: {
          before_run: ['hook1'],
        },
      };

      const planFile = planToPlanFile(originalPlan, '2.0.0');
      const planContent = JSON.stringify(planFile);
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.success).toBe(true);
      expect(result.stepsExecuted).toBe(2);
    });
  });
});
