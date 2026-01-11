/**
 * @fileoverview Unit tests for RunContext.
 */

import { describe, it, expect } from 'vitest';
import {
  RunContext,
  createRunContext,
  isValidRunContextData,
} from '../../src/core/RunContext.js';
import { DeterministicClock } from '../../src/util/clock.js';
import { SeededIdFactory } from '../../src/core/types.js';

describe('RunContext', () => {
  it('should create with required seed', () => {
    const ctx = createRunContext({ seed: 'test-seed' });
    expect(ctx.seed).toBe('test-seed');
  });

  it('should throw on empty seed', () => {
    expect(() => createRunContext({ seed: '' })).toThrow('RunContext requires a non-empty seed');
  });

  it('should throw on whitespace-only seed', () => {
    expect(() => createRunContext({ seed: '   ' })).toThrow('RunContext requires a non-empty seed');
  });

  it('should generate run_id', () => {
    const ctx = createRunContext({ seed: 'test-seed' });
    expect(ctx.run_id).toBeDefined();
    expect(typeof ctx.run_id).toBe('string');
    expect(ctx.run_id.length).toBeGreaterThan(0);
  });

  it('should use injected clock', () => {
    const clock = new DeterministicClock(1000);
    const ctx = createRunContext({ seed: 'test', clock });
    expect(ctx.clock).toBe(clock);
    expect(ctx.clock.now()).toBe(1000);
  });

  it('should capture created_at from clock', () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    expect(ctx.created_at).toBe('1970-01-01T00:00:00.000Z');
  });

  it('should capture platform info', () => {
    const ctx = createRunContext({ seed: 'test' });
    expect(ctx.platform).toBeDefined();
    expect(ctx.platform.nodeVersion).toBe(process.version);
    expect(ctx.platform.platform).toBe(process.platform);
    expect(ctx.platform.arch).toBe(process.arch);
    expect(ctx.platform.pid).toBe(process.pid);
  });

  it('should generate deterministic IDs with same seed', () => {
    const clock1 = new DeterministicClock(0);
    const clock2 = new DeterministicClock(0);
    const ctx1 = createRunContext({ seed: 'same-seed', clock: clock1 });
    const ctx2 = createRunContext({ seed: 'same-seed', clock: clock2 });

    // First IDs should match (run_id)
    expect(ctx1.run_id).toBe(ctx2.run_id);

    // Subsequent generated IDs should also match
    expect(ctx1.generateId()).toBe(ctx2.generateId());
    expect(ctx1.generateId()).toBe(ctx2.generateId());
  });

  it('should generate different IDs with different seeds', () => {
    const ctx1 = createRunContext({ seed: 'seed-1' });
    const ctx2 = createRunContext({ seed: 'seed-2' });
    expect(ctx1.run_id).not.toBe(ctx2.run_id);
  });

  it('should use custom ID factory', () => {
    const factory = new SeededIdFactory('custom');
    const ctx = createRunContext({
      seed: 'test',
      idFactory: factory,
    });
    expect(ctx.run_id).toBe('custom-000000');
  });

  it('should return timestamp from clock', () => {
    const clock = new DeterministicClock(5000);
    const ctx = createRunContext({ seed: 'test', clock });
    expect(ctx.timestamp()).toBe('1970-01-01T00:00:05.000Z');
  });

  it('should convert to data object', () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    const data = ctx.toData();

    expect(data.run_id).toBe(ctx.run_id);
    expect(data.seed).toBe(ctx.seed);
    expect(data.clock).toBe(ctx.clock);
    expect(data.platform).toBe(ctx.platform);
    expect(data.created_at).toBe(ctx.created_at);
  });
});

describe('isValidRunContextData', () => {
  it('should return true for valid context data', () => {
    const clock = new DeterministicClock(0);
    const ctx = createRunContext({ seed: 'test', clock });
    expect(isValidRunContextData(ctx.toData())).toBe(true);
  });

  it('should return false for null', () => {
    expect(isValidRunContextData(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidRunContextData(undefined)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isValidRunContextData(123)).toBe(false);
    expect(isValidRunContextData('string')).toBe(false);
    expect(isValidRunContextData(true)).toBe(false);
  });

  it('should return false for missing run_id', () => {
    expect(isValidRunContextData({ seed: 'test', created_at: '', clock: {}, platform: {} })).toBe(false);
  });

  it('should return false for missing seed', () => {
    expect(isValidRunContextData({ run_id: 'id', created_at: '', clock: {}, platform: {} })).toBe(false);
  });
});
