/**
 * Logger Tests
 * Standard: NASA-Grade L4
 *
 * Tests structured logger with injectable clock (VERROU 3)
 */

import { describe, test, expect } from 'vitest';
import {
  Logger,
  createLogger,
  createNullLogger,
  createTestLogger,
  type LogEntry,
  type LogLevel,
} from '../../nexus/shared/logging/index';

describe('Logger', () => {
  // ==========================================================================
  // Test 1: Logger creates log entries with correct structure
  // ==========================================================================
  test('creates log entries with correct structure', () => {
    const entries: LogEntry[] = [];
    const fixedTime = 1705766400000; // 2024-01-20T16:00:00.000Z

    const logger = new Logger({
      module: 'test-module',
      clock: () => fixedTime,
      minLevel: 'debug',
      output: (entry) => entries.push(entry),
    });

    logger.info('Test message', { key: 'value' });

    expect(entries.length).toBe(1);
    expect(entries[0]).toEqual({
      timestamp: '2024-01-20T16:00:00.000Z',
      level: 'info',
      module: 'test-module',
      message: 'Test message',
      context: { key: 'value' },
    });
  });

  // ==========================================================================
  // Test 2: Logger respects minimum log level
  // ==========================================================================
  test('respects minimum log level', () => {
    const entries: LogEntry[] = [];

    const logger = new Logger({
      module: 'level-test',
      clock: () => Date.now(),
      minLevel: 'warn',
      output: (entry) => entries.push(entry),
    });

    // Should NOT log (below min level)
    logger.debug('Debug message');
    logger.info('Info message');

    // Should log (at or above min level)
    logger.warn('Warn message');
    logger.error('Error message');

    expect(entries.length).toBe(2);
    expect(entries[0].level).toBe('warn');
    expect(entries[1].level).toBe('error');
  });

  // ==========================================================================
  // Test 3: Logger uses injectable clock (VERROU 3)
  // ==========================================================================
  test('uses injectable clock for deterministic timestamps', () => {
    const entries: LogEntry[] = [];
    let mockTime = 1000000000000; // Fixed start time

    const logger = new Logger({
      module: 'clock-test',
      clock: () => mockTime,
      minLevel: 'debug',
      output: (entry) => entries.push(entry),
    });

    logger.info('First message');
    mockTime += 1000; // Advance 1 second
    logger.info('Second message');
    mockTime += 5000; // Advance 5 seconds
    logger.info('Third message');

    expect(entries.length).toBe(3);
    expect(entries[0].timestamp).toBe('2001-09-09T01:46:40.000Z');
    expect(entries[1].timestamp).toBe('2001-09-09T01:46:41.000Z');
    expect(entries[2].timestamp).toBe('2001-09-09T01:46:46.000Z');
  });

  // ==========================================================================
  // Test 4: Child logger inherits config
  // ==========================================================================
  test('child logger inherits config from parent', () => {
    const entries: LogEntry[] = [];
    const fixedTime = 1705766400000;

    const parent = new Logger({
      module: 'parent',
      clock: () => fixedTime,
      minLevel: 'debug',
      output: (entry) => entries.push(entry),
    });

    const child = parent.child({ module: 'child' });

    parent.info('Parent message');
    child.info('Child message');

    expect(entries.length).toBe(2);
    expect(entries[0].module).toBe('parent');
    expect(entries[1].module).toBe('child');
    // Both should use same clock
    expect(entries[0].timestamp).toBe(entries[1].timestamp);
  });

  // ==========================================================================
  // Test 5: Correlation ID propagates
  // ==========================================================================
  test('correlation ID propagates through child loggers', () => {
    const entries: LogEntry[] = [];
    const correlationId = 'req-12345-abc';

    const logger = new Logger({
      module: 'api',
      clock: () => Date.now(),
      minLevel: 'debug',
      output: (entry) => entries.push(entry),
    });

    // Without correlation ID
    logger.info('Before correlation');

    // With correlation ID
    const requestLogger = logger.withCorrelationId(correlationId);
    requestLogger.info('With correlation');

    // Child of correlated logger
    const serviceLogger = requestLogger.child({ module: 'service' });
    serviceLogger.info('Service log');

    expect(entries.length).toBe(3);
    expect(entries[0].correlationId).toBeUndefined();
    expect(entries[1].correlationId).toBe(correlationId);
    expect(entries[2].correlationId).toBe(correlationId);
    expect(entries[2].module).toBe('service');
  });

  // ==========================================================================
  // Test 6: createTestLogger collects entries
  // ==========================================================================
  test('createTestLogger collects entries for assertions', () => {
    const fixedTime = 1705766400000;
    const { logger, entries } = createTestLogger('collector', () => fixedTime);

    logger.debug('Debug');
    logger.info('Info');
    logger.warn('Warn');
    logger.error('Error');

    expect(entries.length).toBe(4);
    expect(entries.map((e) => e.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(entries.every((e) => e.module === 'collector')).toBe(true);
    expect(entries.every((e) => e.timestamp === '2024-01-20T16:00:00.000Z')).toBe(true);
  });
});

describe('Logger factory functions', () => {
  test('createLogger creates configured logger', () => {
    const entries: LogEntry[] = [];

    const logger = createLogger({
      module: 'factory-test',
      minLevel: 'info',
      output: (entry) => entries.push(entry),
    });

    logger.info('Test');
    expect(entries.length).toBe(1);
    expect(logger.getModule()).toBe('factory-test');
    expect(logger.getMinLevel()).toBe('info');
  });

  test('createNullLogger produces no output', () => {
    const logger = createNullLogger('silent');

    // Should not throw
    logger.debug('Debug');
    logger.info('Info');
    logger.warn('Warn');
    logger.error('Error');

    expect(logger.getModule()).toBe('silent');
  });

  test('isLevelEnabled correctly checks level', () => {
    const logger = createLogger({
      module: 'level-check',
      minLevel: 'warn',
    });

    expect(logger.isLevelEnabled('debug')).toBe(false);
    expect(logger.isLevelEnabled('info')).toBe(false);
    expect(logger.isLevelEnabled('warn')).toBe(true);
    expect(logger.isLevelEnabled('error')).toBe(true);
  });
});

describe('Log entry edge cases', () => {
  test('handles empty context', () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      module: 'empty-ctx',
      output: (entry) => entries.push(entry),
    });

    logger.info('No context');
    logger.info('Empty context', {});

    expect(entries.length).toBe(2);
    expect(entries[0].context).toBeUndefined();
    expect(entries[1].context).toBeUndefined(); // Empty object not included
  });

  test('handles complex context objects', () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      module: 'complex-ctx',
      output: (entry) => entries.push(entry),
    });

    const complexContext = {
      nested: { deep: { value: 42 } },
      array: [1, 2, 3],
      null: null,
      boolean: true,
    };

    logger.info('Complex', complexContext);

    expect(entries.length).toBe(1);
    expect(entries[0].context).toEqual(complexContext);
  });
});
