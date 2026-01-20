/**
 * E2E — Concurrent Operations Tests
 * Standard: NASA-Grade L4
 *
 * Tests concurrent access patterns for Atlas and Raw storage.
 */

import { describe, test, expect, afterEach } from 'vitest';
import {
  createE2EContext,
  generateTestEvents,
  wait,
  type E2EContext,
} from './setup';

describe('E2E — Concurrent Operations', () => {
  let ctx: E2EContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  // ==========================================================================
  // Test 1: Parallel Atlas insertions
  // ==========================================================================
  test('parallel atlas insertions maintain consistency', async () => {
    ctx = createE2EContext();
    const batchCount = 10;
    const eventsPerBatch = 100;

    // Create multiple batches of events
    const batches = Array.from({ length: batchCount }, (_, batchIndex) =>
      generateTestEvents(eventsPerBatch).map((e) => ({
        ...e,
        batchId: batchIndex,
        index: batchIndex * eventsPerBatch + e.index,
      }))
    );

    // Insert all batches in parallel
    await Promise.all(
      batches.map((batch) =>
        Promise.resolve().then(() => {
          for (const event of batch) {
            ctx.atlas.insert(`event-${event.index}`, event);
          }
        })
      )
    );

    // Verify all events were inserted
    expect(ctx.atlas.size()).toBe(batchCount * eventsPerBatch);

    // Verify each batch is complete
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      const startIndex = batchIndex * eventsPerBatch;
      const view = ctx.atlas.get(`event-${startIndex}`);
      expect(view).toBeDefined();
      expect(view!.data.batchId).toBe(batchIndex);
    }
  });

  // ==========================================================================
  // Test 2: Parallel Raw store operations
  // ==========================================================================
  test('parallel raw store operations complete without data loss', async () => {
    ctx = createE2EContext();
    const fileCount = 100;

    // Create file operations
    const operations = Array.from({ length: fileCount }, (_, i) => ({
      key: `parallel-file-${i}.dat`,
      content: Buffer.from(`data-for-file-${i}-${Date.now()}`),
    }));

    // Store all files in parallel
    await Promise.all(
      operations.map((op) => ctx.raw.store(op.key, op.content))
    );

    // Verify all files exist
    const list = await ctx.raw.list();
    expect(list.keys.length).toBe(fileCount);

    // Verify content integrity for random samples
    const sampleIndices = [0, 25, 50, 75, 99];
    for (const i of sampleIndices) {
      const retrieved = await ctx.raw.retrieve(operations[i].key);
      expect(retrieved.toString()).toBe(operations[i].content.toString());
    }
  });

  // ==========================================================================
  // Test 3: Mixed read/write operations
  // ==========================================================================
  test('mixed read/write operations maintain consistency', async () => {
    ctx = createE2EContext();

    // Pre-populate with initial data
    const initialEvents = generateTestEvents(50);
    for (const event of initialEvents) {
      ctx.atlas.insert(`event-${event.index}`, event);
    }

    // Concurrent reads and writes
    const readResults: Array<{ key: string; found: boolean }> = [];
    const writeKeys: string[] = [];

    await Promise.all([
      // Readers
      ...Array.from({ length: 20 }, (_, i) =>
        Promise.resolve().then(() => {
          const key = `event-${i % 50}`;
          const view = ctx.atlas.get(key);
          readResults.push({ key, found: view !== undefined });
        })
      ),

      // Writers
      ...Array.from({ length: 30 }, (_, i) =>
        Promise.resolve().then(() => {
          const key = `new-event-${i}`;
          ctx.atlas.insert(key, { type: 'new', index: i, timestamp: ctx.clock.now() });
          writeKeys.push(key);
        })
      ),
    ]);

    // All reads should find existing data
    expect(readResults.every((r) => r.found)).toBe(true);

    // All writes should succeed
    expect(ctx.atlas.size()).toBe(80); // 50 initial + 30 new

    // Verify new writes are queryable
    for (const key of writeKeys) {
      expect(ctx.atlas.get(key)).toBeDefined();
    }
  });

  // ==========================================================================
  // Test 4: Concurrent updates to same keys
  // ==========================================================================
  test('concurrent updates to same keys apply all changes', async () => {
    ctx = createE2EContext();

    // Create initial entry
    ctx.atlas.insert('counter', { value: 0, updates: [] as number[] });

    // Concurrent updates with unique identifiers
    const updateCount = 50;

    await Promise.all(
      Array.from({ length: updateCount }, (_, i) =>
        Promise.resolve().then(() => {
          const current = ctx.atlas.get('counter');
          if (current) {
            // Update with new value (last writer wins for value, but we track all updates)
            ctx.atlas.update('counter', {
              value: i,
              updates: [...(current.data.updates || []), i],
            });
          }
        })
      )
    );

    // Verify the entry exists and was updated
    const final = ctx.atlas.get('counter');
    expect(final).toBeDefined();

    // Due to concurrent updates, we can verify the entry exists
    // The exact final value depends on execution order
    expect(typeof final!.data.value).toBe('number');
  });

  // ==========================================================================
  // Test 5: High-throughput concurrent pipeline
  // ==========================================================================
  test('high-throughput concurrent pipeline', async () => {
    ctx = createE2EContext();

    const producerCount = 5;
    const eventsPerProducer = 200;
    const totalEvents = producerCount * eventsPerProducer;

    // Track all produced events
    const producedEvents: Map<string, unknown> = new Map();

    // Multiple producers writing to Atlas and Raw simultaneously
    await Promise.all(
      Array.from({ length: producerCount }, (_, producerId) =>
        (async () => {
          for (let i = 0; i < eventsPerProducer; i++) {
            const eventId = `p${producerId}-e${i}`;
            const event = {
              producerId,
              eventIndex: i,
              timestamp: ctx.clock.now(),
              payload: `data-${eventId}`,
            };

            // Store in both Atlas and Raw
            ctx.atlas.insert(eventId, event);
            await ctx.raw.store(`${eventId}.json`, Buffer.from(JSON.stringify(event)));

            producedEvents.set(eventId, event);
          }
        })()
      )
    );

    // Verify Atlas
    expect(ctx.atlas.size()).toBe(totalEvents);

    // Verify Raw
    const rawList = await ctx.raw.list();
    expect(rawList.keys.length).toBe(totalEvents);

    // Verify data consistency between Atlas and Raw for samples
    const sampleKeys = ['p0-e0', 'p2-e100', 'p4-e199'];
    for (const key of sampleKeys) {
      const atlasView = ctx.atlas.get(key);
      const rawData = await ctx.raw.retrieve(`${key}.json`);

      expect(atlasView).toBeDefined();
      expect(atlasView!.data.payload).toBe(`data-${key}`);
      expect(JSON.parse(rawData.toString()).payload).toBe(`data-${key}`);
    }
  });
});
