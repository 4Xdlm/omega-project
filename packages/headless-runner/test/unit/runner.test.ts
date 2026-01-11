/**
 * @fileoverview Unit tests for runner module.
 */

import { describe, it, expect } from 'vitest';
import { DeterministicClock, SeededIdFactory, SimpleAdapterRegistry } from '@omega/orchestrator-core';
import { runHeadless, createDefaultAdapters } from '../../src/runner.js';
import { InMemoryOutputWriter } from '../../src/output.js';
import type { RunnerConfig } from '../../src/types.js';

describe('runner', () => {
  describe('runHeadless', () => {
    const createConfig = (overrides: Partial<RunnerConfig> = {}): RunnerConfig => ({
      seed: 'test-seed',
      planPath: 'test.json',
      outputDir: '/output',
      verbosity: 1,
      verifyDeterminism: false,
      clock: new DeterministicClock(0),
      idFactory: new SeededIdFactory('test-seed', 'run'),
      ...overrides,
    });

    it('should execute a simple plan successfully', async () => {
      const config = createConfig();
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [
          { id: 'step1', kind: 'noop', input: {} },
        ],
      });
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.success).toBe(true);
      expect(result.stepsExecuted).toBe(1);
      expect(result.stepsSucceeded).toBe(1);
      expect(result.stepsFailed).toBe(0);
    });

    it('should handle empty plan (validation fails)', async () => {
      const config = createConfig();
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [],
      });
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      // Empty plans fail validation in orchestrator-core
      expect(result.success).toBe(false);
      expect(result.stepsExecuted).toBe(0);
    });

    it('should handle failing step', async () => {
      const config = createConfig();
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [
          { id: 'step1', kind: 'fail', input: { message: 'Intentional failure' } },
        ],
      });
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

    it('should write output files', async () => {
      const config = createConfig();
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [{ id: 'step1', kind: 'noop', input: {} }],
      });
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      const files = outputWriter.getFiles();
      expect(files.size).toBeGreaterThan(0);
    });

    it('should handle invalid plan JSON', async () => {
      const config = createConfig();
      const planContent = 'not valid json';
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should handle invalid plan structure', async () => {
      const config = createConfig();
      const planContent = JSON.stringify({ invalid: true });
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

    it('should use echo adapter', async () => {
      const config = createConfig();
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [
          { id: 'step1', kind: 'echo', input: { message: 'hello' } },
        ],
      });
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.success).toBe(true);
    });

    it('should verify determinism when enabled', async () => {
      // Don't pass clock/idFactory - let runner create fresh ones for determinism
      const config: RunnerConfig = {
        seed: 'test-seed',
        planPath: 'test.json',
        outputDir: '/output',
        verbosity: 1,
        verifyDeterminism: true,
      };
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [
          { id: 'step1', kind: 'noop', input: {} },
        ],
      });
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

    it('should include run ID in result', async () => {
      const config = createConfig();
      const planContent = JSON.stringify({ version: '1.0.0', steps: [] });
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.runId).toBeDefined();
      expect(result.runId.length).toBeGreaterThan(0);
    });

    it('should include seed in result', async () => {
      const config = createConfig({ seed: 'my-seed' });
      const planContent = JSON.stringify({ version: '1.0.0', steps: [] });
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.seed).toBe('my-seed');
    });

    it('should include timestamps', async () => {
      const config = createConfig();
      const planContent = JSON.stringify({ version: '1.0.0', steps: [] });
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    it('should calculate duration', async () => {
      const clock = new DeterministicClock(0);
      const config = createConfig({ clock });
      const planContent = JSON.stringify({ version: '1.0.0', steps: [] });
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.durationMs).toBeDefined();
      expect(typeof result.durationMs).toBe('number');
    });

    it('should include output file paths', async () => {
      const config = createConfig({ outputDir: '/my/output' });
      const planContent = JSON.stringify({ version: '1.0.0', steps: [] });
      const outputWriter = new InMemoryOutputWriter();
      const adapters = createDefaultAdapters();

      const result = await runHeadless({
        config,
        planContent,
        outputWriter,
        adapters,
      });

      expect(result.outputFiles.result).toContain('/my/output');
      expect(result.outputFiles.log).toContain('/my/output');
      expect(result.outputFiles.hash).toContain('/my/output');
    });
  });

  describe('createDefaultAdapters', () => {
    it('should create adapter registry with noop adapter', () => {
      const adapters = createDefaultAdapters();
      expect(adapters.get('noop')).toBeDefined();
    });

    it('should create adapter registry with echo adapter', () => {
      const adapters = createDefaultAdapters();
      expect(adapters.get('echo')).toBeDefined();
    });

    it('should create adapter registry with fail adapter', () => {
      const adapters = createDefaultAdapters();
      expect(adapters.get('fail')).toBeDefined();
    });

    it('noop adapter should return result', async () => {
      const adapters = createDefaultAdapters();
      const noop = adapters.get('noop')!;
      const result = await noop.execute({}, {} as any);
      expect(result).toEqual({ result: 'noop' });
    });

    it('echo adapter should echo input', async () => {
      const adapters = createDefaultAdapters();
      const echo = adapters.get('echo')!;
      const result = await echo.execute({ test: 'value' }, {} as any);
      expect(result).toEqual({ echoed: { test: 'value' } });
    });

    it('fail adapter should throw', async () => {
      const adapters = createDefaultAdapters();
      const fail = adapters.get('fail')!;
      await expect(fail.execute({}, {} as any)).rejects.toThrow();
    });

    it('fail adapter should use custom message', async () => {
      const adapters = createDefaultAdapters();
      const fail = adapters.get('fail')!;
      await expect(fail.execute({ message: 'Custom error' }, {} as any)).rejects.toThrow('Custom error');
    });
  });
});
