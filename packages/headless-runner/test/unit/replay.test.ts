/**
 * @fileoverview Unit tests for replay module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SeededIdFactory, DeterministicClock } from '@omega/orchestrator-core';
import {
  createRecording,
  validateRecording,
  compareResults,
  createReplayContext,
  filterRecordings,
  summarizeRecording,
  exportRecording,
  importRecording,
  InMemoryRecordingStore,
  type RunRecording,
  type HeadlessRunResult,
  type LogEntry,
} from '../../src/index.js';

describe('replay', () => {
  const createMockResult = (overrides: Partial<HeadlessRunResult> = {}): HeadlessRunResult => ({
    success: true,
    runId: 'run-000001',
    seed: 'test-seed',
    startedAt: '2026-01-01T00:00:00.000Z',
    completedAt: '2026-01-01T00:00:01.000Z',
    durationMs: 1000,
    stepsExecuted: 3,
    stepsSucceeded: 3,
    stepsFailed: 0,
    outputFiles: {
      result: '/output/result.json',
      log: '/output/log.txt',
      hash: '/output/hash.sha256',
    },
    ...overrides,
  });

  const createMockLogs = (): LogEntry[] => [
    { timestamp: '2026-01-01T00:00:00.000Z', level: 'info', message: 'Starting' },
    { timestamp: '2026-01-01T00:00:01.000Z', level: 'info', message: 'Completed' },
  ];

  describe('createRecording', () => {
    it('should create a recording with all fields', () => {
      const result = createMockResult();
      const logs = createMockLogs();
      const planContent = '{"version":"1.0.0","steps":[]}';
      const seed = 'test-seed';
      const startTimeMs = Date.UTC(2026, 0, 1, 0, 0, 0);

      const recording = createRecording(result, logs, planContent, seed, startTimeMs);

      expect(recording.version).toBe('1.0.0');
      expect(recording.result).toEqual(result);
      expect(recording.logs).toEqual(logs);
      expect(recording.planContent).toBe(planContent);
      expect(recording.seed).toBe(seed);
      expect(recording.startTimeMs).toBe(startTimeMs);
    });

    it('should include hash in recording', () => {
      const result = createMockResult();
      const recording = createRecording(result, [], '{}', 'seed', 0);

      expect(recording.hash).toBeDefined();
      expect(recording.hash!.length).toBe(64); // SHA-256 hex
    });

    it('should produce different hashes for different content', () => {
      const result1 = createMockResult({ runId: 'run-1' });
      const result2 = createMockResult({ runId: 'run-2' });

      const recording1 = createRecording(result1, [], '{}', 'seed', 0);
      const recording2 = createRecording(result2, [], '{}', 'seed', 0);

      expect(recording1.hash).not.toBe(recording2.hash);
    });

    it('should include metadata when provided', () => {
      const result = createMockResult();
      const metadata = {
        createdAt: '2026-01-01T00:00:00.000Z',
        description: 'Test recording',
        tags: ['test', 'unit'],
      };

      const recording = createRecording(result, [], '{}', 'seed', 0, metadata);

      expect(recording.metadata).toEqual(metadata);
    });

    it('should produce same hash for same content', () => {
      const result = createMockResult();
      const recording1 = createRecording(result, [], '{}', 'seed', 0);
      const recording2 = createRecording(result, [], '{}', 'seed', 0);

      expect(recording1.hash).toBe(recording2.hash);
    });
  });

  describe('validateRecording', () => {
    it('should return true for valid recording', () => {
      const result = createMockResult();
      const recording = createRecording(result, [], '{}', 'seed', 0);

      expect(validateRecording(recording)).toBe(true);
    });

    it('should return false for recording without hash', () => {
      const recording: RunRecording = {
        version: '1.0.0',
        result: createMockResult(),
        logs: [],
        planContent: '{}',
        seed: 'seed',
        startTimeMs: 0,
      };

      expect(validateRecording(recording)).toBe(false);
    });

    it('should return false for tampered recording', () => {
      const result = createMockResult();
      const recording = createRecording(result, [], '{}', 'seed', 0);

      // Tamper with the recording
      const tampered = { ...recording, seed: 'tampered-seed' };

      expect(validateRecording(tampered)).toBe(false);
    });
  });

  describe('compareResults', () => {
    it('should return empty array for identical results', () => {
      const result = createMockResult();
      const differences = compareResults(result, result);

      expect(differences).toEqual([]);
    });

    it('should detect success difference', () => {
      const original = createMockResult({ success: true });
      const replayed = createMockResult({ success: false });

      const differences = compareResults(original, replayed);

      expect(differences).toHaveLength(1);
      expect(differences[0].path).toBe('success');
      expect(differences[0].original).toBe(true);
      expect(differences[0].replayed).toBe(false);
    });

    it('should detect stepsExecuted difference', () => {
      const original = createMockResult({ stepsExecuted: 5 });
      const replayed = createMockResult({ stepsExecuted: 3 });

      const differences = compareResults(original, replayed);

      expect(differences.some((d) => d.path === 'stepsExecuted')).toBe(true);
    });

    it('should detect stepsSucceeded difference', () => {
      const original = createMockResult({ stepsSucceeded: 5 });
      const replayed = createMockResult({ stepsSucceeded: 4 });

      const differences = compareResults(original, replayed);

      expect(differences.some((d) => d.path === 'stepsSucceeded')).toBe(true);
    });

    it('should detect stepsFailed difference', () => {
      const original = createMockResult({ stepsFailed: 0 });
      const replayed = createMockResult({ stepsFailed: 1 });

      const differences = compareResults(original, replayed);

      expect(differences.some((d) => d.path === 'stepsFailed')).toBe(true);
    });

    it('should detect error difference', () => {
      const original = createMockResult({ error: undefined });
      const replayed = createMockResult({ error: 'Some error' });

      const differences = compareResults(original, replayed);

      expect(differences.some((d) => d.path === 'error')).toBe(true);
    });

    it('should detect multiple differences', () => {
      const original = createMockResult({
        success: true,
        stepsExecuted: 3,
        stepsFailed: 0,
      });
      const replayed = createMockResult({
        success: false,
        stepsExecuted: 2,
        stepsFailed: 1,
      });

      const differences = compareResults(original, replayed);

      expect(differences.length).toBeGreaterThan(1);
    });
  });

  describe('createReplayContext', () => {
    it('should create context with recording values', () => {
      const result = createMockResult();
      const recording = createRecording(
        result,
        [],
        '{"version":"1.0.0","steps":[]}',
        'replay-seed',
        12345
      );

      const context = createReplayContext(recording);

      expect(context.planContent).toBe('{"version":"1.0.0","steps":[]}');
      expect(context.clock.now()).toBe(12345);
    });

    it('should use custom clock when provided', () => {
      const result = createMockResult();
      const recording = createRecording(result, [], '{}', 'seed', 0);
      const customClock = new DeterministicClock(99999);

      const context = createReplayContext(recording, { clock: customClock });

      expect(context.clock).toBe(customClock);
    });

    it('should use custom ID factory when provided', () => {
      const result = createMockResult();
      const recording = createRecording(result, [], '{}', 'seed', 0);
      const customIdFactory = new SeededIdFactory('custom', 'id');

      const context = createReplayContext(recording, { idFactory: customIdFactory });

      expect(context.idFactory).toBe(customIdFactory);
    });
  });

  describe('filterRecordings', () => {
    const createRecordingWithMeta = (
      tags: string[],
      success: boolean,
      createdAt: string
    ): RunRecording => {
      return createRecording(
        createMockResult({ success }),
        [],
        '{}',
        'seed',
        0,
        { createdAt, tags }
      );
    };

    it('should filter by tags', () => {
      const recordings = [
        createRecordingWithMeta(['unit', 'fast'], true, '2026-01-01'),
        createRecordingWithMeta(['integration'], true, '2026-01-01'),
        createRecordingWithMeta(['unit', 'slow'], true, '2026-01-01'),
      ];

      const filtered = filterRecordings(recordings, { tags: ['unit'] });

      expect(filtered).toHaveLength(2);
    });

    it('should require all tags to match', () => {
      const recordings = [
        createRecordingWithMeta(['unit', 'fast'], true, '2026-01-01'),
        createRecordingWithMeta(['unit'], true, '2026-01-01'),
      ];

      const filtered = filterRecordings(recordings, { tags: ['unit', 'fast'] });

      expect(filtered).toHaveLength(1);
    });

    it('should filter by success', () => {
      const recordings = [
        createRecordingWithMeta([], true, '2026-01-01'),
        createRecordingWithMeta([], false, '2026-01-01'),
        createRecordingWithMeta([], true, '2026-01-01'),
      ];

      const filtered = filterRecordings(recordings, { success: false });

      expect(filtered).toHaveLength(1);
    });

    it('should filter by date range (after)', () => {
      const recordings = [
        createRecordingWithMeta([], true, '2026-01-01'),
        createRecordingWithMeta([], true, '2026-01-15'),
        createRecordingWithMeta([], true, '2026-02-01'),
      ];

      const filtered = filterRecordings(recordings, { after: '2026-01-10' });

      expect(filtered).toHaveLength(2);
    });

    it('should filter by date range (before)', () => {
      const recordings = [
        createRecordingWithMeta([], true, '2026-01-01'),
        createRecordingWithMeta([], true, '2026-01-15'),
        createRecordingWithMeta([], true, '2026-02-01'),
      ];

      const filtered = filterRecordings(recordings, { before: '2026-01-20' });

      expect(filtered).toHaveLength(2);
    });

    it('should limit results', () => {
      const recordings = [
        createRecordingWithMeta([], true, '2026-01-01'),
        createRecordingWithMeta([], true, '2026-01-02'),
        createRecordingWithMeta([], true, '2026-01-03'),
      ];

      const filtered = filterRecordings(recordings, { limit: 2 });

      expect(filtered).toHaveLength(2);
    });

    it('should combine filters', () => {
      const recordings = [
        createRecordingWithMeta(['unit'], true, '2026-01-01'),
        createRecordingWithMeta(['unit'], false, '2026-01-02'),
        createRecordingWithMeta(['integration'], true, '2026-01-03'),
      ];

      const filtered = filterRecordings(recordings, {
        tags: ['unit'],
        success: true,
      });

      expect(filtered).toHaveLength(1);
    });

    it('should return all recordings with empty query', () => {
      const recordings = [
        createRecordingWithMeta([], true, '2026-01-01'),
        createRecordingWithMeta([], false, '2026-01-02'),
      ];

      const filtered = filterRecordings(recordings, {});

      expect(filtered).toHaveLength(2);
    });
  });

  describe('summarizeRecording', () => {
    it('should create summary with all fields', () => {
      const result = createMockResult({
        runId: 'run-123',
        success: true,
        stepsExecuted: 5,
        durationMs: 2000,
      });
      const recording = createRecording(result, [], '{}', 'seed', 0, {
        createdAt: '2026-01-01T00:00:00.000Z',
        tags: ['test'],
      });

      const summary = summarizeRecording('rec-001', recording);

      expect(summary.id).toBe('rec-001');
      expect(summary.runId).toBe('run-123');
      expect(summary.success).toBe(true);
      expect(summary.stepsExecuted).toBe(5);
      expect(summary.durationMs).toBe(2000);
      expect(summary.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(summary.tags).toEqual(['test']);
    });

    it('should handle recording without metadata', () => {
      const result = createMockResult();
      const recording = createRecording(result, [], '{}', 'seed', 0);

      const summary = summarizeRecording('rec-001', recording);

      expect(summary.createdAt).toBeUndefined();
      expect(summary.tags).toBeUndefined();
    });
  });

  describe('exportRecording / importRecording', () => {
    it('should export recording to JSON', () => {
      const result = createMockResult();
      const recording = createRecording(result, [], '{}', 'seed', 0);

      const json = exportRecording(recording);

      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should import recording from JSON', () => {
      const result = createMockResult();
      const original = createRecording(result, [], '{}', 'seed', 0);
      const json = exportRecording(original);

      const imported = importRecording(json);

      expect(imported.version).toBe(original.version);
      expect(imported.seed).toBe(original.seed);
      expect(imported.hash).toBe(original.hash);
    });

    it('should round-trip recording', () => {
      const result = createMockResult();
      const logs = createMockLogs();
      const original = createRecording(result, logs, '{"test":true}', 'seed', 12345, {
        createdAt: '2026-01-01',
        description: 'Test',
      });

      const json = exportRecording(original);
      const imported = importRecording(json);

      expect(imported).toEqual(original);
    });

    it('should throw for invalid JSON', () => {
      expect(() => importRecording('not json')).toThrow();
    });

    it('should throw for missing required fields', () => {
      expect(() => importRecording('{}')).toThrow('missing required fields');
    });
  });

  describe('InMemoryRecordingStore', () => {
    let store: InMemoryRecordingStore;

    beforeEach(() => {
      store = new InMemoryRecordingStore();
    });

    it('should save and load recording', () => {
      const result = createMockResult();
      const recording = createRecording(result, [], '{}', 'seed', 0);

      const id = store.save(recording);
      const loaded = store.load(id);

      expect(loaded).toEqual(recording);
    });

    it('should generate unique IDs', () => {
      const recording = createRecording(createMockResult(), [], '{}', 'seed', 0);

      const id1 = store.save(recording);
      const id2 = store.save(recording);

      expect(id1).not.toBe(id2);
    });

    it('should list all recording IDs', () => {
      const recording = createRecording(createMockResult(), [], '{}', 'seed', 0);

      store.save(recording);
      store.save(recording);
      store.save(recording);

      const ids = store.list();

      expect(ids).toHaveLength(3);
    });

    it('should return sorted IDs', () => {
      const recording = createRecording(createMockResult(), [], '{}', 'seed', 0);

      store.save(recording);
      store.save(recording);

      const ids = store.list();

      expect(ids).toEqual([...ids].sort());
    });

    it('should delete recording', () => {
      const recording = createRecording(createMockResult(), [], '{}', 'seed', 0);
      const id = store.save(recording);

      const deleted = store.delete(id);

      expect(deleted).toBe(true);
      expect(store.load(id)).toBeUndefined();
    });

    it('should return false for deleting non-existent', () => {
      const deleted = store.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should check existence', () => {
      const recording = createRecording(createMockResult(), [], '{}', 'seed', 0);
      const id = store.save(recording);

      expect(store.exists(id)).toBe(true);
      expect(store.exists('nonexistent')).toBe(false);
    });

    it('should return undefined for unknown ID', () => {
      expect(store.load('unknown')).toBeUndefined();
    });

    it('should use custom ID factory', () => {
      const customFactory = new SeededIdFactory('custom', 'custom');
      const customStore = new InMemoryRecordingStore(customFactory);
      const recording = createRecording(createMockResult(), [], '{}', 'seed', 0);

      const id = customStore.save(recording);

      expect(id).toContain('custom');
    });
  });
});
