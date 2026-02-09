import { describe, it, expect } from 'vitest';
import { queryEvents, countByStatus, getUniqueRunIds } from '../../src/history/query-engine.js';
import { DEFAULT_GOV_CONFIG } from '../../src/core/config.js';
import { createRuntimeEvent } from '../fixtures/helpers.js';

describe('Query Engine', () => {
  const events = [
    createRuntimeEvent({ run_id: 'run-1', timestamp: '2026-01-10T10:00:00.000Z', status: 'SUCCESS' }),
    createRuntimeEvent({ run_id: 'run-2', timestamp: '2026-01-15T10:00:00.000Z', status: 'FAIL' }),
    createRuntimeEvent({ run_id: 'run-3', timestamp: '2026-01-20T10:00:00.000Z', status: 'SUCCESS' }),
    createRuntimeEvent({ run_id: 'run-1', timestamp: '2026-01-25T10:00:00.000Z', status: 'SUCCESS' }),
  ];

  it('returns all events with empty query', () => {
    const result = queryEvents(events, {}, DEFAULT_GOV_CONFIG);
    expect(result).toHaveLength(4);
  });

  it('filters by since date', () => {
    const result = queryEvents(events, { since: '2026-01-15T00:00:00.000Z' }, DEFAULT_GOV_CONFIG);
    expect(result).toHaveLength(3);
  });

  it('filters by until date', () => {
    const result = queryEvents(events, { until: '2026-01-15T23:59:59.000Z' }, DEFAULT_GOV_CONFIG);
    expect(result).toHaveLength(2);
  });

  it('filters by run_id', () => {
    const result = queryEvents(events, { run_id: 'run-1' }, DEFAULT_GOV_CONFIG);
    expect(result).toHaveLength(2);
  });

  it('filters by status', () => {
    const result = queryEvents(events, { status: 'FAIL' }, DEFAULT_GOV_CONFIG);
    expect(result).toHaveLength(1);
    expect(result[0].run_id).toBe('run-2');
  });

  it('applies limit', () => {
    const result = queryEvents(events, { limit: 2 }, DEFAULT_GOV_CONFIG);
    expect(result).toHaveLength(2);
  });

  it('countByStatus counts correctly', () => {
    const counts = countByStatus(events);
    expect(counts['SUCCESS']).toBe(3);
    expect(counts['FAIL']).toBe(1);
  });

  it('getUniqueRunIds returns sorted unique IDs', () => {
    const ids = getUniqueRunIds(events);
    expect(ids).toEqual(['run-1', 'run-2', 'run-3']);
  });
});
