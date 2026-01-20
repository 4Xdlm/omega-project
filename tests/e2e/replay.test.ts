/**
 * E2E — Replay Tests
 * Standard: NASA-Grade L4
 *
 * Tests event replay and deterministic processing workflows.
 */

import { describe, test, expect, afterEach } from 'vitest';
import {
  createE2EContext,
  generateTestEvents,
  writeTestFile,
  readTestFile,
  buildManifest,
  verifyManifest,
  type E2EContext,
} from './setup';

describe('E2E — Replay', () => {
  let ctx: E2EContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  // ==========================================================================
  // Test 1: Event log replay produces same state
  // ==========================================================================
  test('event log replay produces same state', async () => {
    ctx = createE2EContext();

    // Event log with deterministic events
    const eventLog: Array<{
      type: 'insert' | 'update' | 'delete';
      key: string;
      data?: unknown;
      timestamp: number;
    }> = [
      { type: 'insert', key: 'item-1', data: { name: 'A', value: 10 }, timestamp: 1000 },
      { type: 'insert', key: 'item-2', data: { name: 'B', value: 20 }, timestamp: 2000 },
      { type: 'update', key: 'item-1', data: { name: 'A', value: 15 }, timestamp: 3000 },
      { type: 'insert', key: 'item-3', data: { name: 'C', value: 30 }, timestamp: 4000 },
      { type: 'delete', key: 'item-2', timestamp: 5000 },
      { type: 'update', key: 'item-3', data: { name: 'C', value: 35 }, timestamp: 6000 },
    ];

    // Function to apply event log
    function applyEventLog(
      log: typeof eventLog,
      atlas: typeof ctx.atlas
    ): void {
      for (const event of log) {
        switch (event.type) {
          case 'insert':
            atlas.insert(event.key, event.data);
            break;
          case 'update':
            atlas.update(event.key, event.data);
            break;
          case 'delete':
            atlas.delete(event.key);
            break;
        }
      }
    }

    // First execution
    applyEventLog(eventLog, ctx.atlas);

    // Capture state
    const firstState = {
      size: ctx.atlas.size(),
      items: ctx.atlas.query({}).views.map((v) => ({ key: v.id, data: v.data })),
    };

    // Clear and replay - get IDs first then delete
    const viewIds = ctx.atlas.query({}).views.map((v) => v.id);
    for (const id of viewIds) {
      ctx.atlas.delete(id);
    }
    expect(ctx.atlas.size()).toBe(0);

    // Replay
    applyEventLog(eventLog, ctx.atlas);

    // Capture second state
    const secondState = {
      size: ctx.atlas.size(),
      items: ctx.atlas.query({}).views.map((v) => ({ key: v.id, data: v.data })),
    };

    // States should be identical
    expect(secondState.size).toBe(firstState.size);
    expect(secondState.items.length).toBe(firstState.items.length);

    // Sort and compare
    const sortByKey = (a: { key: string }, b: { key: string }) =>
      a.key.localeCompare(b.key);
    firstState.items.sort(sortByKey);
    secondState.items.sort(sortByKey);

    expect(secondState.items).toEqual(firstState.items);
  });

  // ==========================================================================
  // Test 2: Checkpoint and resume from point in time
  // ==========================================================================
  test('checkpoint and resume from point in time', async () => {
    ctx = createE2EContext();

    const events = generateTestEvents(100);

    // Process first 50 events
    for (let i = 0; i < 50; i++) {
      ctx.atlas.insert(`event-${events[i].index}`, events[i]);
    }

    // Create checkpoint
    const checkpoint = {
      processedCount: 50,
      lastProcessedIndex: 49,
      atlasSnapshot: ctx.atlas.query({}).views.map((v) => ({
        key: v.id,
        data: v.data,
      })),
    };

    // Write checkpoint to disk
    const checkpointPath = writeTestFile(
      ctx.tmpDir,
      'checkpoint.json',
      JSON.stringify(checkpoint)
    );

    // Clear Atlas (simulate restart) - get IDs first then delete
    const viewIds = ctx.atlas.query({}).views.map((v) => v.id);
    for (const id of viewIds) {
      ctx.atlas.delete(id);
    }
    expect(ctx.atlas.size()).toBe(0);

    // Restore from checkpoint
    const restored = JSON.parse(readTestFile(checkpointPath).toString());

    for (const item of restored.atlasSnapshot) {
      ctx.atlas.insert(item.key, item.data);
    }

    // Resume processing from checkpoint
    for (let i = restored.processedCount; i < events.length; i++) {
      ctx.atlas.insert(`event-${events[i].index}`, events[i]);
    }

    // Verify complete processing
    expect(ctx.atlas.size()).toBe(100);

    // Verify both pre-checkpoint and post-checkpoint events exist
    expect(ctx.atlas.get('event-0')).toBeDefined();
    expect(ctx.atlas.get('event-49')).toBeDefined();
    expect(ctx.atlas.get('event-50')).toBeDefined();
    expect(ctx.atlas.get('event-99')).toBeDefined();
  });

  // ==========================================================================
  // Test 3: Audit trail with proof verification
  // ==========================================================================
  test('audit trail with proof verification', async () => {
    ctx = createE2EContext();

    // Create audit trail
    const auditTrail: Array<{
      action: string;
      target: string;
      timestamp: number;
      details: unknown;
    }> = [];

    // Perform operations and log them
    const operations = [
      { action: 'create', key: 'doc-1', data: { title: 'Document 1' } },
      { action: 'create', key: 'doc-2', data: { title: 'Document 2' } },
      { action: 'modify', key: 'doc-1', data: { title: 'Document 1 (Updated)' } },
      { action: 'archive', key: 'doc-2', data: { archived: true } },
    ];

    for (const op of operations) {
      const timestamp = ctx.clock.now();

      if (op.action === 'create') {
        ctx.atlas.insert(op.key, op.data);
      } else if (op.action === 'modify') {
        ctx.atlas.update(op.key, op.data);
      } else if (op.action === 'archive') {
        const existing = ctx.atlas.get(op.key);
        if (existing) {
          ctx.atlas.update(op.key, { ...existing.data, ...op.data });
        }
      }

      // Store in Raw for durability
      await ctx.raw.store(
        `audit/${timestamp}-${op.action}-${op.key}.json`,
        Buffer.from(JSON.stringify({ ...op, timestamp }))
      );

      auditTrail.push({
        action: op.action,
        target: op.key,
        timestamp,
        details: op.data,
      });
    }

    // Write audit trail to file
    const auditPath = writeTestFile(
      ctx.tmpDir,
      'audit/trail.json',
      JSON.stringify(auditTrail)
    );

    // Write final state snapshot
    const statePath = writeTestFile(
      ctx.tmpDir,
      'audit/final-state.json',
      JSON.stringify(ctx.atlas.query({}).views.map((v) => ({ key: v.key, data: v.data })))
    );

    // Build proof manifest
    const manifest = buildManifest([auditPath, statePath]);
    expect(manifest.entries.length).toBe(2);

    // Verify manifest
    const verification = verifyManifest(manifest);
    expect(verification.valid).toBe(true);

    // Verify Raw audit entries
    const rawList = await ctx.raw.list();
    const auditKeys = rawList.keys.filter((k) => k.startsWith('audit/'));
    expect(auditKeys.length).toBe(4); // 4 operations logged
  });
});
