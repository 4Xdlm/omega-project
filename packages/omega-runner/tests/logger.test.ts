/**
 * OMEGA Runner — Logger Tests
 * Phase D.1 — 8 tests for internal logger
 */

import { describe, it, expect } from 'vitest';
import { createLogger } from '../src/logger/index.js';

describe('logger', () => {
  it('creates empty logger', () => {
    const logger = createLogger();
    expect(logger.getEntries()).toHaveLength(0);
  });

  it('records info entries', () => {
    const logger = createLogger();
    logger.info('test message');
    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('INFO');
    expect(entries[0].message).toBe('test message');
  });

  it('records all log levels', () => {
    const logger = createLogger();
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    const entries = logger.getEntries();
    expect(entries).toHaveLength(4);
    expect(entries[0].level).toBe('DEBUG');
    expect(entries[1].level).toBe('INFO');
    expect(entries[2].level).toBe('WARN');
    expect(entries[3].level).toBe('ERROR');
  });

  it('toText formats level | message', () => {
    const logger = createLogger();
    logger.info('hello');
    logger.error('fail');
    const text = logger.toText();
    expect(text).toBe('INFO | hello\nERROR | fail');
  });

  it('toText empty logger returns empty string', () => {
    const logger = createLogger();
    expect(logger.toText()).toBe('');
  });

  it('entries are ordered chronologically', () => {
    const logger = createLogger();
    logger.info('first');
    logger.info('second');
    logger.info('third');
    const entries = logger.getEntries();
    expect(entries[0].message).toBe('first');
    expect(entries[1].message).toBe('second');
    expect(entries[2].message).toBe('third');
  });

  it('no timestamps in log entries', () => {
    const logger = createLogger();
    logger.info('test');
    const text = logger.toText();
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(text).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('getEntries returns readonly copy', () => {
    const logger = createLogger();
    logger.info('a');
    const entries1 = logger.getEntries();
    logger.info('b');
    const entries2 = logger.getEntries();
    expect(entries2).toHaveLength(2);
    expect(entries1).toHaveLength(2); // same reference
  });
});
