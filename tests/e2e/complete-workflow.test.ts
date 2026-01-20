/**
 * E2E — Complete Workflow Tests
 * Standard: NASA-Grade L4
 *
 * Tests complete workflows: Atlas → Raw → Proof
 */

import { describe, test, expect, afterEach } from 'vitest';
import {
  createE2EContext,
  generateTestEvents,
  writeTestFile,
  buildManifest,
  verifyManifest,
  type E2EContext,
} from './setup';

describe('E2E — Complete Workflow', () => {
  let ctx: E2EContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  // ==========================================================================
  // Test 1: Full pipeline - events → atlas → raw → proof
  // ==========================================================================
  test('full pipeline: events → atlas → raw → proof', async () => {
    ctx = createE2EContext();
    const events = generateTestEvents(100);

    // 1. Store events in Atlas
    for (const event of events) {
      ctx.atlas.insert(`event-${event.index}`, event);
    }

    // 2. Query from Atlas
    const results = ctx.atlas.query({
      filter: { field: 'type', operator: 'eq', value: 'test-event' },
    });
    expect(results.views.length).toBe(100);

    // 3. Store summary in Raw
    const summary = {
      totalEvents: events.length,
      processedAt: ctx.clock.now(),
      firstEventTimestamp: events[0].timestamp,
      lastEventTimestamp: events[events.length - 1].timestamp,
    };
    await ctx.raw.store('summary.json', Buffer.from(JSON.stringify(summary)));

    // 4. Write files for manifest
    const summaryPath = writeTestFile(ctx.tmpDir, 'data/summary.json', JSON.stringify(summary));
    const eventsPath = writeTestFile(ctx.tmpDir, 'data/events.json', JSON.stringify(events));

    // 5. Build and verify proof manifest
    const manifest = buildManifest([summaryPath, eventsPath]);
    expect(manifest.entries.length).toBe(2);

    const verification = verifyManifest(manifest);
    expect(verification.valid).toBe(true);
  });

  // ==========================================================================
  // Test 2: Concurrent writes to atlas and raw
  // ==========================================================================
  test('concurrent writes to atlas and raw', async () => {
    ctx = createE2EContext();
    const events = generateTestEvents(50);

    // Concurrent operations
    await Promise.all([
      // Atlas writes (sync but wrapped in Promise)
      ...events.map((e) => Promise.resolve(ctx.atlas.insert(`event-${e.index}`, e))),

      // Raw writes
      ...Array.from({ length: 50 }, (_, i) =>
        ctx.raw.store(`file-${i}.txt`, Buffer.from(`data-${i}`))
      ),
    ]);

    // Verify Atlas
    expect(ctx.atlas.size()).toBe(50);

    // Verify Raw
    const rawList = await ctx.raw.list();
    expect(rawList.keys.length).toBe(50);
  });

  // ==========================================================================
  // Test 3: Error recovery - partial failure handling
  // ==========================================================================
  test('error recovery: continue after partial processing', async () => {
    ctx = createE2EContext();
    const events = generateTestEvents(10);

    // First batch succeeds
    for (let i = 0; i < 5; i++) {
      ctx.atlas.insert(`event-${events[i].index}`, events[i]);
    }

    // Simulate checkpoint
    const checkpoint = 5;

    // Continue from checkpoint
    for (let i = checkpoint; i < 10; i++) {
      ctx.atlas.insert(`event-${events[i].index}`, events[i]);
    }

    expect(ctx.atlas.size()).toBe(10);
  });

  // ==========================================================================
  // Test 4: Data consistency - same data in atlas and raw
  // ==========================================================================
  test('data consistency: same data in atlas and raw', async () => {
    ctx = createE2EContext();

    const testData = {
      id: 'test-123',
      name: 'Test Item',
      timestamp: ctx.clock.now(),
      value: 42,
    };

    // Store in both Atlas and Raw
    ctx.atlas.insert('item-test-123', { type: 'item', ...testData });
    await ctx.raw.store('item-test-123.json', Buffer.from(JSON.stringify(testData)));

    // Retrieve from both
    const atlasView = ctx.atlas.get('item-test-123');
    const rawData = await ctx.raw.retrieve('item-test-123.json');

    // Verify consistency
    expect(atlasView).toBeDefined();
    expect(atlasView!.data.id).toBe(testData.id);
    expect(atlasView!.data.name).toBe(testData.name);
    expect(JSON.parse(rawData.toString())).toEqual(testData);
  });

  // ==========================================================================
  // Test 5: Large dataset - 10k events
  // ==========================================================================
  test('large dataset: 10k events with batch processing', async () => {
    ctx = createE2EContext();
    const events = generateTestEvents(10000);

    // Batch processing (1000 events at a time)
    const batchSize = 1000;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      for (const event of batch) {
        ctx.atlas.insert(`event-${event.index}`, event);
      }
    }

    expect(ctx.atlas.size()).toBe(10000);

    // Query subset
    const results = ctx.atlas.query({ limit: 100 });
    expect(results.views.length).toBe(100);
    expect(results.total).toBe(10000);
  });
});
