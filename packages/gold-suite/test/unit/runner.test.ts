/**
 * @fileoverview Tests for suite runner.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  SuiteRunner,
  createSuiteRunner,
  runAllSuites,
  DEFAULT_SUITE_CONFIG,
} from '../../src/index.js';
import type { SuiteEvent } from '../../src/index.js';

describe('SuiteRunner', () => {
  it('should create with default config', () => {
    const runner = new SuiteRunner();
    expect(runner).toBeDefined();
  });

  it('should accept custom config', () => {
    const runner = new SuiteRunner({
      name: 'Custom Suite',
      version: '2.0.0',
      parallel: true,
    });
    expect(runner).toBeDefined();
  });

  it('should run all suites', async () => {
    const runner = new SuiteRunner({ packages: ['@omega/test-pkg'] });
    const result = await runner.run();

    expect(result.config).toBeDefined();
    expect(result.suites).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });

  it('should include all packages in result', async () => {
    const packages = ['@omega/pkg1', '@omega/pkg2', '@omega/pkg3'];
    const runner = new SuiteRunner({ packages });
    const result = await runner.run();

    expect(result.suites.length).toBe(3);
    expect(result.suites[0].package).toBe('@omega/pkg1');
    expect(result.suites[1].package).toBe('@omega/pkg2');
    expect(result.suites[2].package).toBe('@omega/pkg3');
  });

  it('should calculate summary correctly', async () => {
    const runner = new SuiteRunner({ packages: ['@omega/test'] });
    const result = await runner.run();

    expect(result.summary.totalSuites).toBe(1);
    expect(result.summary.totalTests).toBeGreaterThan(0);
    expect(result.summary.totalPassed).toBeGreaterThanOrEqual(0);
    expect(result.summary.totalFailed).toBeGreaterThanOrEqual(0);
    expect(result.summary.passRate).toBeGreaterThanOrEqual(0);
    expect(result.summary.passRate).toBeLessThanOrEqual(1);
  });

  it('should emit events', async () => {
    const events: SuiteEvent[] = [];
    const runner = new SuiteRunner({ packages: ['@omega/test'] });
    runner.on((event) => events.push(event));

    await runner.run();

    const types = events.map((e) => e.type);
    expect(types).toContain('run:start');
    expect(types).toContain('run:complete');
    expect(types).toContain('suite:start');
    expect(types).toContain('suite:complete');
    expect(types).toContain('test:start');
    expect(types).toContain('test:complete');
  });

  it('should support multiple event handlers', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const runner = new SuiteRunner({ packages: ['@omega/test'] });
    runner.on(handler1).on(handler2);

    await runner.run();

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('should generate unique test IDs', async () => {
    const runner = new SuiteRunner({ packages: ['@omega/test'] });
    const result = await runner.run();

    const ids = result.suites[0].tests.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should include test duration', async () => {
    const runner = new SuiteRunner({ packages: ['@omega/test'] });
    const result = await runner.run();

    for (const test of result.suites[0].tests) {
      expect(typeof test.duration).toBe('number');
      expect(test.duration).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('createSuiteRunner', () => {
  it('should create SuiteRunner instance', () => {
    const runner = createSuiteRunner();
    expect(runner).toBeInstanceOf(SuiteRunner);
  });

  it('should accept config', () => {
    const runner = createSuiteRunner({ name: 'Test' });
    expect(runner).toBeInstanceOf(SuiteRunner);
  });
});

describe('runAllSuites', () => {
  it('should return SuiteRunResult', async () => {
    const result = await runAllSuites();
    expect(result.config).toBeDefined();
    expect(result.suites).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('should use default config', async () => {
    const result = await runAllSuites();
    expect(result.config.name).toBe(DEFAULT_SUITE_CONFIG.name);
  });
});

describe('DEFAULT_SUITE_CONFIG', () => {
  it('should have expected defaults', () => {
    expect(DEFAULT_SUITE_CONFIG.name).toBe('OMEGA Gold Suite');
    expect(DEFAULT_SUITE_CONFIG.parallel).toBe(false);
    expect(DEFAULT_SUITE_CONFIG.timeout).toBe(30000);
    expect(DEFAULT_SUITE_CONFIG.retries).toBe(0);
  });

  it('should be frozen', () => {
    expect(Object.isFrozen(DEFAULT_SUITE_CONFIG)).toBe(true);
  });
});
