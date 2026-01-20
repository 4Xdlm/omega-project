/**
 * E2E — Error Handling Tests
 * Standard: NASA-Grade L4
 *
 * Tests error handling and recovery workflows.
 */

import { describe, test, expect, afterEach } from 'vitest';
import {
  createE2EContext,
  generateTestEvents,
  type E2EContext,
} from './setup';

describe('E2E — Error Handling', () => {
  let ctx: E2EContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  // ==========================================================================
  // Test 1: Handle missing key gracefully
  // ==========================================================================
  test('handle missing key gracefully', async () => {
    ctx = createE2EContext();

    // Insert some data
    ctx.atlas.insert('existing-key', { value: 42 });

    // Try to get non-existent key - returns undefined
    const missingView = ctx.atlas.get('non-existent-key');
    expect(missingView).toBeUndefined();

    // has() method allows safe existence checks
    expect(ctx.atlas.has('non-existent-key')).toBe(false);
    expect(ctx.atlas.has('existing-key')).toBe(true);

    // Try to update non-existent key - throws AtlasViewNotFoundError
    expect(() => ctx.atlas.update('non-existent-key', { value: 100 })).toThrow();

    // Try to delete non-existent key - throws AtlasViewNotFoundError
    expect(() => ctx.atlas.delete('non-existent-key')).toThrow();

    // Original data should be intact
    const existing = ctx.atlas.get('existing-key');
    expect(existing).toBeDefined();
    expect(existing!.data.value).toBe(42);
  });

  // ==========================================================================
  // Test 2: Handle Raw storage key not found
  // ==========================================================================
  test('handle raw storage key not found', async () => {
    ctx = createE2EContext();

    // Store some data
    await ctx.raw.store('existing.txt', Buffer.from('hello'));

    // Try to retrieve non-existent key
    await expect(ctx.raw.retrieve('non-existent.txt')).rejects.toThrow();

    // Original data should be intact
    const existing = await ctx.raw.retrieve('existing.txt');
    expect(existing.toString()).toBe('hello');
  });

  // ==========================================================================
  // Test 3: Graceful degradation with partial failures
  // ==========================================================================
  test('graceful degradation with partial failures', async () => {
    ctx = createE2EContext();
    const events = generateTestEvents(20);

    // Track successful and failed operations
    const results: Array<{ key: string; success: boolean; error?: string }> = [];

    // Process events with simulated random failures
    for (const event of events) {
      const key = `event-${event.index}`;

      try {
        // Simulate failure for certain indices
        if (event.index % 5 === 3) {
          throw new Error(`Simulated failure for index ${event.index}`);
        }

        ctx.atlas.insert(key, event);
        results.push({ key, success: true });
      } catch (err) {
        results.push({
          key,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Count successes and failures
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // 4 failures at indices 3, 8, 13, 18
    expect(failures.length).toBe(4);
    expect(successes.length).toBe(16);

    // Atlas should contain only successful inserts
    expect(ctx.atlas.size()).toBe(16);

    // Failed keys should not exist
    expect(ctx.atlas.get('event-3')).toBeUndefined();
    expect(ctx.atlas.get('event-8')).toBeUndefined();
    expect(ctx.atlas.get('event-13')).toBeUndefined();
    expect(ctx.atlas.get('event-18')).toBeUndefined();

    // Successful keys should exist
    expect(ctx.atlas.get('event-0')).toBeDefined();
    expect(ctx.atlas.get('event-4')).toBeDefined();
    expect(ctx.atlas.get('event-19')).toBeDefined();
  });

  // ==========================================================================
  // Test 4: Recovery after error - retry logic
  // ==========================================================================
  test('recovery after error - retry logic', async () => {
    ctx = createE2EContext();

    // Simulate operation that fails first but succeeds on retry
    interface RetryableOperation {
      key: string;
      data: unknown;
      attempts: number;
      maxAttempts: number;
    }

    const operations: RetryableOperation[] = [
      { key: 'op-1', data: { value: 1 }, attempts: 0, maxAttempts: 3 },
      { key: 'op-2', data: { value: 2 }, attempts: 0, maxAttempts: 3 },
      { key: 'op-3', data: { value: 3 }, attempts: 0, maxAttempts: 3 },
    ];

    // Failure simulation state
    const failureCount: Map<string, number> = new Map([
      ['op-1', 2], // Fail 2 times, succeed on 3rd
      ['op-2', 0], // Succeed immediately
      ['op-3', 5], // Always fail (exceeds max attempts)
    ]);

    function attemptOperation(op: RetryableOperation): boolean {
      op.attempts++;
      const remainingFailures = failureCount.get(op.key) || 0;

      if (remainingFailures > 0) {
        failureCount.set(op.key, remainingFailures - 1);
        return false; // Simulate failure
      }

      // Success - actually insert
      ctx.atlas.insert(op.key, op.data);
      return true;
    }

    // Execute with retry logic
    const results: Array<{
      key: string;
      success: boolean;
      attempts: number;
    }> = [];

    for (const op of operations) {
      let success = false;

      while (op.attempts < op.maxAttempts && !success) {
        success = attemptOperation(op);
      }

      results.push({
        key: op.key,
        success,
        attempts: op.attempts,
      });
    }

    // op-1: succeeded after 3 attempts
    expect(results[0]).toEqual({ key: 'op-1', success: true, attempts: 3 });

    // op-2: succeeded after 1 attempt
    expect(results[1]).toEqual({ key: 'op-2', success: true, attempts: 1 });

    // op-3: failed after 3 attempts
    expect(results[2]).toEqual({ key: 'op-3', success: false, attempts: 3 });

    // Verify Atlas state
    expect(ctx.atlas.size()).toBe(2);
    expect(ctx.atlas.get('op-1')).toBeDefined();
    expect(ctx.atlas.get('op-2')).toBeDefined();
    expect(ctx.atlas.get('op-3')).toBeUndefined();
  });
});
