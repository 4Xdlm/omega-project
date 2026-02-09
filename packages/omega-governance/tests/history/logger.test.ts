import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { appendEvent, readEvents, createEventId, verifyLogIntegrity } from '../../src/history/logger.js';
import { createTempDir, createRuntimeEvent } from '../fixtures/helpers.js';

describe('History Logger', () => {
  let tempDir: string;
  let logPath: string;

  beforeEach(() => {
    tempDir = createTempDir('logger');
    logPath = join(tempDir, 'governance.ndjson');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates event ID deterministically', () => {
    const id1 = createEventId('run1', 'full', 'SUCCESS', '2026-01-01T00:00:00.000Z');
    const id2 = createEventId('run1', 'full', 'SUCCESS', '2026-01-01T00:00:00.000Z');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('different inputs produce different event IDs', () => {
    const id1 = createEventId('run1', 'full', 'SUCCESS', '2026-01-01T00:00:00.000Z');
    const id2 = createEventId('run2', 'full', 'SUCCESS', '2026-01-01T00:00:00.000Z');
    expect(id1).not.toBe(id2);
  });

  it('appends event to log file', () => {
    const event = createRuntimeEvent();
    appendEvent(logPath, event);
    expect(existsSync(logPath)).toBe(true);
    const events = readEvents(logPath);
    expect(events).toHaveLength(1);
    expect(events[0].run_id).toBe(event.run_id);
  });

  it('appends multiple events (append-only)', () => {
    appendEvent(logPath, createRuntimeEvent({ run_id: 'run-1' }));
    appendEvent(logPath, createRuntimeEvent({ run_id: 'run-2' }));
    appendEvent(logPath, createRuntimeEvent({ run_id: 'run-3' }));
    const events = readEvents(logPath);
    expect(events).toHaveLength(3);
  });

  it('readEvents returns empty for non-existent file', () => {
    const events = readEvents(join(tempDir, 'nonexistent.ndjson'));
    expect(events).toHaveLength(0);
  });

  it('readEvents parses NDJSON correctly', () => {
    const event = createRuntimeEvent({ forge_score: 0.92 });
    appendEvent(logPath, event);
    const events = readEvents(logPath);
    expect(events[0].forge_score).toBe(0.92);
  });

  it('verifyLogIntegrity passes when line count matches', () => {
    appendEvent(logPath, createRuntimeEvent());
    appendEvent(logPath, createRuntimeEvent({ run_id: 'run-2' }));
    const result = verifyLogIntegrity(logPath, 2);
    expect(result.valid).toBe(true);
    expect(result.actual_lines).toBe(2);
  });

  it('INV-GOV-07: verifyLogIntegrity fails when lines decrease', () => {
    appendEvent(logPath, createRuntimeEvent());
    const result = verifyLogIntegrity(logPath, 5);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid event', () => {
    const invalidEvent = { event_id: 'not-hex', run_id: '', command: 'invalid', status: 'UNKNOWN' } as unknown;
    expect(() => appendEvent(logPath, invalidEvent as import('../../src/history/types.js').RuntimeEvent)).toThrow();
  });
});
