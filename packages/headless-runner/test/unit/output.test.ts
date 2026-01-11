/**
 * @fileoverview Unit tests for output module.
 */

import { describe, it, expect } from 'vitest';
import { DeterministicClock } from '@omega/orchestrator-core';
import {
  createLogger,
  formatLogEntries,
  formatResult,
  generateOutputPaths,
  writeOutputFiles,
  formatDuration,
  InMemoryOutputWriter,
  createCollectingConsole,
} from '../../src/output.js';
import type { HeadlessRunResult, LogEntry } from '../../src/types.js';

describe('output', () => {
  describe('createLogger', () => {
    it('should create a logger with clock', () => {
      const clock = new DeterministicClock(0);
      const logger = createLogger(clock);

      logger.info('Test message');
      const entries = logger.getEntries();

      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe('info');
      expect(entries[0].message).toBe('Test message');
      expect(entries[0].timestamp).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should log with context', () => {
      const clock = new DeterministicClock(0);
      const logger = createLogger(clock);

      logger.info('Message', { key: 'value' });
      const entries = logger.getEntries();

      expect(entries[0].context).toEqual({ key: 'value' });
    });

    it('should respect minimum log level', () => {
      const clock = new DeterministicClock(0);
      const logger = createLogger(clock, 'warn');

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe('warn');
      expect(entries[1].level).toBe('error');
    });

    it('should use clock for timestamps', () => {
      const clock = new DeterministicClock(0);
      const logger = createLogger(clock);

      logger.info('First');
      clock.advance(1000);
      logger.info('Second');

      const entries = logger.getEntries();
      expect(entries[0].timestamp).toBe('1970-01-01T00:00:00.000Z');
      expect(entries[1].timestamp).toBe('1970-01-01T00:00:01.000Z');
    });

    it('should log debug level when set', () => {
      const clock = new DeterministicClock(0);
      const logger = createLogger(clock, 'debug');

      logger.debug('Debug message');

      expect(logger.getEntries()).toHaveLength(1);
    });
  });

  describe('formatLogEntries', () => {
    it('should format entries as text', () => {
      const entries: LogEntry[] = [
        { timestamp: '2026-01-01T00:00:00.000Z', level: 'info', message: 'Hello' },
        { timestamp: '2026-01-01T00:00:01.000Z', level: 'error', message: 'Error!' },
      ];

      const result = formatLogEntries(entries);

      expect(result).toContain('[2026-01-01T00:00:00.000Z] [INFO ]');
      expect(result).toContain('[2026-01-01T00:00:01.000Z] [ERROR]');
      expect(result).toContain('Hello');
      expect(result).toContain('Error!');
    });

    it('should include context as JSON', () => {
      const entries: LogEntry[] = [
        { timestamp: '2026-01-01T00:00:00.000Z', level: 'info', message: 'Test', context: { a: 1 } },
      ];

      const result = formatLogEntries(entries);

      expect(result).toContain('{"a":1}');
    });

    it('should handle empty entries', () => {
      const result = formatLogEntries([]);
      expect(result).toBe('');
    });
  });

  describe('formatResult', () => {
    it('should format result as JSON', () => {
      const result: HeadlessRunResult = {
        success: true,
        runId: 'test-run',
        seed: 'seed',
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:00:01.000Z',
        durationMs: 1000,
        stepsExecuted: 5,
        stepsSucceeded: 5,
        stepsFailed: 0,
        outputFiles: {
          result: '/output/result.json',
          log: '/output/log.txt',
          hash: '/output/hash.sha256',
        },
      };

      const formatted = formatResult(result);
      const parsed = JSON.parse(formatted);

      expect(parsed.success).toBe(true);
      expect(parsed.runId).toBe('test-run');
    });

    it('should produce stable JSON output', () => {
      const result: HeadlessRunResult = {
        success: true,
        runId: 'run1',
        seed: 'seed1',
        startedAt: 'a',
        completedAt: 'b',
        durationMs: 100,
        stepsExecuted: 1,
        stepsSucceeded: 1,
        stepsFailed: 0,
        outputFiles: { result: 'r', log: 'l', hash: 'h' },
      };

      const formatted1 = formatResult(result);
      const formatted2 = formatResult(result);

      expect(formatted1).toBe(formatted2);
    });
  });

  describe('generateOutputPaths', () => {
    it('should generate correct paths', () => {
      const paths = generateOutputPaths('/output', 'run-001');

      expect(paths.result).toBe('/output/run-001_result.json');
      expect(paths.log).toBe('/output/run-001.log');
      expect(paths.hash).toBe('/output/run-001.sha256');
    });
  });

  describe('InMemoryOutputWriter', () => {
    it('should write files', () => {
      const writer = new InMemoryOutputWriter();
      writer.write('/path/file.txt', 'content');

      expect(writer.getFile('/path/file.txt')).toBe('content');
    });

    it('should create directories', () => {
      const writer = new InMemoryOutputWriter();
      writer.mkdir('/path/dir');

      expect(writer.exists('/path/dir')).toBe(true);
    });

    it('should check existence', () => {
      const writer = new InMemoryOutputWriter();

      expect(writer.exists('/nonexistent')).toBe(false);

      writer.write('/file', 'data');
      expect(writer.exists('/file')).toBe(true);
    });

    it('should return all files', () => {
      const writer = new InMemoryOutputWriter();
      writer.write('/a', '1');
      writer.write('/b', '2');

      const files = writer.getFiles();
      expect(files.size).toBe(2);
    });

    it('should return all directories', () => {
      const writer = new InMemoryOutputWriter();
      writer.mkdir('/dir1');
      writer.mkdir('/dir2');

      const dirs = writer.getDirectories();
      expect(dirs.size).toBe(2);
    });
  });

  describe('writeOutputFiles', () => {
    it('should write all output files', () => {
      const writer = new InMemoryOutputWriter();
      const result: HeadlessRunResult = {
        success: true,
        runId: 'run1',
        seed: 'seed',
        startedAt: 'a',
        completedAt: 'b',
        durationMs: 100,
        stepsExecuted: 1,
        stepsSucceeded: 1,
        stepsFailed: 0,
        outputFiles: {
          result: '/output/run1_result.json',
          log: '/output/run1.log',
          hash: '/output/run1.sha256',
        },
      };
      const entries: LogEntry[] = [
        { timestamp: 't', level: 'info', message: 'msg' },
      ];

      writeOutputFiles(writer, result, entries);

      expect(writer.exists('/output/run1_result.json')).toBe(true);
      expect(writer.exists('/output/run1.log')).toBe(true);
      expect(writer.exists('/output/run1.sha256')).toBe(true);
    });

    it('should create output directory', () => {
      const writer = new InMemoryOutputWriter();
      const result: HeadlessRunResult = {
        success: true,
        runId: 'run1',
        seed: 's',
        startedAt: 'a',
        completedAt: 'b',
        durationMs: 0,
        stepsExecuted: 0,
        stepsSucceeded: 0,
        stepsFailed: 0,
        outputFiles: {
          result: '/new-dir/result.json',
          log: '/new-dir/log.txt',
          hash: '/new-dir/hash.sha256',
        },
      };

      writeOutputFiles(writer, result, []);

      expect(writer.exists('/new-dir')).toBe(true);
    });

    it('should write hashes in sha256sum format', () => {
      const writer = new InMemoryOutputWriter();
      const result: HeadlessRunResult = {
        success: true,
        runId: 'run1',
        seed: 's',
        startedAt: 'a',
        completedAt: 'b',
        durationMs: 0,
        stepsExecuted: 0,
        stepsSucceeded: 0,
        stepsFailed: 0,
        outputFiles: {
          result: '/out/result.json',
          log: '/out/log.txt',
          hash: '/out/hash.sha256',
        },
      };

      writeOutputFiles(writer, result, []);

      const hashContent = writer.getFile('/out/hash.sha256');
      expect(hashContent).toContain(' */out/result.json');
      expect(hashContent).toContain(' */out/log.txt');
    });
  });

  describe('createCollectingConsole', () => {
    it('should collect output', () => {
      const console = createCollectingConsole();
      console.write('Hello');
      console.write('World');

      expect(console.getOutput()).toBe('Hello\nWorld');
    });

    it('should collect errors', () => {
      const console = createCollectingConsole();
      console.writeError('Error 1');
      console.writeError('Error 2');

      expect(console.getErrors()).toBe('Error 1\nError 2');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(0)).toBe('0ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.00s');
      expect(formatDuration(5500)).toBe('5.50s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60000)).toBe('1m 0.00s');
      expect(formatDuration(90000)).toBe('1m 30.00s');
      expect(formatDuration(125000)).toBe('2m 5.00s');
    });
  });
});
