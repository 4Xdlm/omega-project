/**
 * @fileoverview Integration tests for replay engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeterministicClock, SeededIdFactory, SimpleAdapterRegistry } from '@omega/orchestrator-core';
import {
  runHeadless,
  createDefaultAdapters,
  createRecording,
  validateRecording,
  compareResults,
  createReplayContext,
  InMemoryRecordingStore,
  InMemoryOutputWriter,
  createLogger,
  type RunnerConfig,
  type HeadlessRunResult,
} from '../../src/index.js';

describe('Replay Engine Integration', () => {
  describe('recording a run and replaying', () => {
    it('should create valid recording from successful run', async () => {
      const config: RunnerConfig = {
        seed: 'recording-test',
        planPath: 'test.json',
        outputDir: '/output',
        verbosity: 1,
        verifyDeterminism: false,
      };
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [
          { id: 's1', kind: 'noop', input: {} },
          { id: 's2', kind: 'echo', input: { value: 42 }, depends_on: ['s1'] },
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

      // Create recording
      const recording = createRecording(
        result,
        [],
        planContent,
        config.seed,
        Date.now(),
        { createdAt: new Date().toISOString() }
      );

      expect(result.success).toBe(true);
      expect(validateRecording(recording)).toBe(true);
    });

    it('should replay with identical results', async () => {
      const seed = 'replay-identical';
      const startTimeMs = Date.UTC(2026, 0, 1, 12, 0, 0);
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [
          { id: 's1', kind: 'noop', input: {} },
          { id: 's2', kind: 'echo', input: { x: 1 } },
        ],
      });
      const adapters = createDefaultAdapters();

      // First run
      const config1: RunnerConfig = {
        seed,
        planPath: 'test.json',
        outputDir: '/output1',
        verbosity: 1,
        verifyDeterminism: false,
        clock: new DeterministicClock(startTimeMs),
        idFactory: new SeededIdFactory(seed, 'run'),
      };
      const result1 = await runHeadless({
        config: config1,
        planContent,
        outputWriter: new InMemoryOutputWriter(),
        adapters,
      });

      // Create recording
      const recording = createRecording(result1, [], planContent, seed, startTimeMs);

      // Replay
      const { clock, idFactory } = createReplayContext(recording);
      const config2: RunnerConfig = {
        seed,
        planPath: 'test.json',
        outputDir: '/output2',
        verbosity: 1,
        verifyDeterminism: false,
        clock,
        idFactory,
      };
      const result2 = await runHeadless({
        config: config2,
        planContent: recording.planContent,
        outputWriter: new InMemoryOutputWriter(),
        adapters,
      });

      // Compare
      const differences = compareResults(result1, result2);
      expect(differences).toHaveLength(0);
      expect(result2.success).toBe(result1.success);
      expect(result2.stepsExecuted).toBe(result1.stepsExecuted);
    });

    it('should detect differences when replay diverges', async () => {
      const seed = 'divergence-test';
      const startTimeMs = Date.UTC(2026, 0, 1, 12, 0, 0);
      const planContent1 = JSON.stringify({
        version: '1.0.0',
        steps: [{ id: 's1', kind: 'noop', input: {} }],
      });
      const adapters = createDefaultAdapters();

      // Original run
      const config1: RunnerConfig = {
        seed,
        planPath: 'test.json',
        outputDir: '/output1',
        verbosity: 1,
        verifyDeterminism: false,
        clock: new DeterministicClock(startTimeMs),
        idFactory: new SeededIdFactory(seed, 'run'),
      };
      const result1 = await runHeadless({
        config: config1,
        planContent: planContent1,
        outputWriter: new InMemoryOutputWriter(),
        adapters,
      });

      // Modified plan for "replay"
      const planContent2 = JSON.stringify({
        version: '1.0.0',
        steps: [
          { id: 's1', kind: 'noop', input: {} },
          { id: 's2', kind: 'noop', input: {} },
        ],
      });

      const config2: RunnerConfig = {
        seed,
        planPath: 'test.json',
        outputDir: '/output2',
        verbosity: 1,
        verifyDeterminism: false,
        clock: new DeterministicClock(startTimeMs),
        idFactory: new SeededIdFactory(seed, 'run'),
      };
      const result2 = await runHeadless({
        config: config2,
        planContent: planContent2,
        outputWriter: new InMemoryOutputWriter(),
        adapters,
      });

      // Should detect step count difference
      const differences = compareResults(result1, result2);
      expect(differences.length).toBeGreaterThan(0);
      expect(differences.some((d) => d.path === 'stepsExecuted')).toBe(true);
    });
  });

  describe('recording store', () => {
    let store: InMemoryRecordingStore;

    beforeEach(() => {
      store = new InMemoryRecordingStore();
    });

    it('should store and retrieve multiple recordings', async () => {
      const adapters = createDefaultAdapters();
      const ids: string[] = [];

      // Create and store multiple recordings
      for (let i = 0; i < 3; i++) {
        const config: RunnerConfig = {
          seed: `test-${i}`,
          planPath: 'test.json',
          outputDir: '/output',
          verbosity: 0,
          verifyDeterminism: false,
        };
        const planContent = JSON.stringify({
          version: '1.0.0',
          steps: [{ id: 's1', kind: 'noop', input: {} }],
        });

        const result = await runHeadless({
          config,
          planContent,
          outputWriter: new InMemoryOutputWriter(),
          adapters,
        });

        const recording = createRecording(result, [], planContent, config.seed, 0);
        ids.push(store.save(recording));
      }

      expect(store.list()).toHaveLength(3);
      ids.forEach((id) => {
        expect(store.exists(id)).toBe(true);
        expect(store.load(id)).toBeDefined();
      });
    });

    it('should maintain recording integrity in store', async () => {
      const config: RunnerConfig = {
        seed: 'integrity-test',
        planPath: 'test.json',
        outputDir: '/output',
        verbosity: 0,
        verifyDeterminism: false,
      };
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [{ id: 's1', kind: 'echo', input: { test: true } }],
      });

      const result = await runHeadless({
        config,
        planContent,
        outputWriter: new InMemoryOutputWriter(),
        adapters: createDefaultAdapters(),
      });

      const recording = createRecording(result, [], planContent, config.seed, Date.now());
      const id = store.save(recording);
      const loaded = store.load(id);

      expect(loaded).toBeDefined();
      expect(validateRecording(loaded!)).toBe(true);
    });
  });

  describe('full replay workflow', () => {
    it('should complete full record-store-replay workflow', async () => {
      const store = new InMemoryRecordingStore();
      const adapters = createDefaultAdapters();

      // Step 1: Initial run
      const seed = 'full-workflow';
      const startTimeMs = Date.UTC(2026, 0, 1, 12, 0, 0);
      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [
          { id: 'step1', kind: 'noop', input: {} },
          { id: 'step2', kind: 'echo', input: { data: 'test' } },
          { id: 'step3', kind: 'noop', input: {}, depends_on: ['step2'] },
        ],
      });

      const config1: RunnerConfig = {
        seed,
        planPath: 'workflow.json',
        outputDir: '/output1',
        verbosity: 2,
        verifyDeterminism: false,
        clock: new DeterministicClock(startTimeMs),
        idFactory: new SeededIdFactory(seed, 'run'),
      };
      const clock1 = new DeterministicClock(startTimeMs);
      const logger1 = createLogger(clock1, 'info');

      const result1 = await runHeadless({
        config: config1,
        planContent,
        outputWriter: new InMemoryOutputWriter(),
        adapters,
      });

      // Step 2: Create and store recording
      const recording = createRecording(
        result1,
        logger1.getEntries(),
        planContent,
        seed,
        startTimeMs,
        {
          createdAt: new Date().toISOString(),
          description: 'Full workflow test',
          tags: ['integration', 'workflow'],
        }
      );
      const recordingId = store.save(recording);

      // Step 3: Load recording
      const loadedRecording = store.load(recordingId);
      expect(loadedRecording).toBeDefined();
      expect(validateRecording(loadedRecording!)).toBe(true);

      // Step 4: Replay
      const { clock, idFactory, planContent: replayPlan } = createReplayContext(loadedRecording!);
      const config2: RunnerConfig = {
        seed: loadedRecording!.seed,
        planPath: 'workflow.json',
        outputDir: '/output2',
        verbosity: 2,
        verifyDeterminism: false,
        clock,
        idFactory,
      };

      const result2 = await runHeadless({
        config: config2,
        planContent: replayPlan,
        outputWriter: new InMemoryOutputWriter(),
        adapters,
      });

      // Step 5: Verify replay matches original
      const differences = compareResults(result1, result2);
      expect(differences).toHaveLength(0);
      expect(result2.success).toBe(result1.success);
      expect(result2.stepsExecuted).toBe(result1.stepsExecuted);
      expect(result2.runId).toBe(result1.runId);
    });

    it('should handle failed run recording and replay', async () => {
      const adapters = createDefaultAdapters();
      const seed = 'failed-run';
      const startTimeMs = Date.UTC(2026, 0, 1, 12, 0, 0);

      const planContent = JSON.stringify({
        version: '1.0.0',
        steps: [
          { id: 's1', kind: 'noop', input: {} },
          { id: 's2', kind: 'fail', input: { message: 'Intentional failure' } },
        ],
      });

      const config1: RunnerConfig = {
        seed,
        planPath: 'fail.json',
        outputDir: '/output1',
        verbosity: 1,
        verifyDeterminism: false,
        clock: new DeterministicClock(startTimeMs),
        idFactory: new SeededIdFactory(seed, 'run'),
      };

      const result1 = await runHeadless({
        config: config1,
        planContent,
        outputWriter: new InMemoryOutputWriter(),
        adapters,
      });

      expect(result1.success).toBe(false);

      // Record and replay the failure
      const recording = createRecording(result1, [], planContent, seed, startTimeMs);
      const { clock, idFactory } = createReplayContext(recording);

      const config2: RunnerConfig = {
        seed,
        planPath: 'fail.json',
        outputDir: '/output2',
        verbosity: 1,
        verifyDeterminism: false,
        clock,
        idFactory,
      };

      const result2 = await runHeadless({
        config: config2,
        planContent: recording.planContent,
        outputWriter: new InMemoryOutputWriter(),
        adapters,
      });

      expect(result2.success).toBe(false);
      const differences = compareResults(result1, result2);
      expect(differences).toHaveLength(0);
    });
  });
});
