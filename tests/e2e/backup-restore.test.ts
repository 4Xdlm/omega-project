/**
 * E2E — Backup/Restore Tests
 * Standard: NASA-Grade L4
 *
 * Tests backup and restore workflows for Atlas and Raw storage.
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
import * as path from 'path';
import * as fs from 'fs';

describe('E2E — Backup/Restore', () => {
  let ctx: E2EContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  // ==========================================================================
  // Test 1: Atlas state snapshot and restore
  // ==========================================================================
  test('atlas state snapshot and restore', async () => {
    ctx = createE2EContext();
    const events = generateTestEvents(50);

    // Insert events into Atlas
    for (const event of events) {
      ctx.atlas.insert(`event-${event.index}`, event);
    }

    // Take snapshot (serialize all data)
    const snapshot: Array<{ key: string; data: unknown }> = [];
    const allResults = ctx.atlas.query({});
    for (const view of allResults.views) {
      snapshot.push({ key: view.id, data: view.data });
    }

    // Write snapshot to file
    const snapshotPath = writeTestFile(
      ctx.tmpDir,
      'backup/atlas-snapshot.json',
      JSON.stringify(snapshot)
    );

    // Clear Atlas (simulate fresh start)
    for (const view of allResults.views) {
      ctx.atlas.delete(view.id);
    }
    expect(ctx.atlas.size()).toBe(0);

    // Restore from snapshot
    const restoredData = JSON.parse(readTestFile(snapshotPath).toString());
    for (const item of restoredData) {
      ctx.atlas.insert(item.key, item.data);
    }

    // Verify restore
    expect(ctx.atlas.size()).toBe(50);
    const restored = ctx.atlas.get('event-0');
    expect(restored).toBeDefined();
    expect(restored!.data.index).toBe(0);
  });

  // ==========================================================================
  // Test 2: Raw storage backup with manifest
  // ==========================================================================
  test('raw storage backup with manifest', async () => {
    ctx = createE2EContext();

    // Store multiple files in Raw
    const files = [
      { key: 'config.json', content: JSON.stringify({ version: '1.0' }) },
      { key: 'data/users.json', content: JSON.stringify([{ id: 1, name: 'Alice' }]) },
      { key: 'data/items.json', content: JSON.stringify([{ id: 100, name: 'Item A' }]) },
    ];

    for (const file of files) {
      await ctx.raw.store(file.key, Buffer.from(file.content));
    }

    // Create backup directory and write files
    const backupDir = path.join(ctx.tmpDir, 'backup');
    fs.mkdirSync(backupDir, { recursive: true });

    const backupPaths: string[] = [];
    for (const file of files) {
      const data = await ctx.raw.retrieve(file.key);
      const backupPath = writeTestFile(ctx.tmpDir, `backup/${file.key}`, data);
      backupPaths.push(backupPath);
    }

    // Build manifest for backup
    const manifest = buildManifest(backupPaths);
    expect(manifest.entries.length).toBe(3);

    // Verify manifest
    const verification = verifyManifest(manifest);
    expect(verification.valid).toBe(true);
  });

  // ==========================================================================
  // Test 3: Incremental backup (only changed files)
  // ==========================================================================
  test('incremental backup: only changed files', async () => {
    ctx = createE2EContext();

    // Initial state
    const initialFiles = [
      { key: 'file1.txt', content: 'content1' },
      { key: 'file2.txt', content: 'content2' },
      { key: 'file3.txt', content: 'content3' },
    ];

    for (const file of initialFiles) {
      await ctx.raw.store(file.key, Buffer.from(file.content));
    }

    // Get initial checksums
    const initialChecksums: Map<string, string> = new Map();
    for (const file of initialFiles) {
      const data = await ctx.raw.retrieve(file.key);
      const checksum = simpleChecksum(data);
      initialChecksums.set(file.key, checksum);
    }

    // Modify one file
    await ctx.raw.store('file2.txt', Buffer.from('content2-modified'));

    // Check which files changed
    const changedFiles: string[] = [];
    for (const file of initialFiles) {
      const data = await ctx.raw.retrieve(file.key);
      const newChecksum = simpleChecksum(data);
      if (newChecksum !== initialChecksums.get(file.key)) {
        changedFiles.push(file.key);
      }
    }

    expect(changedFiles).toHaveLength(1);
    expect(changedFiles[0]).toBe('file2.txt');

    // Backup only changed files
    const backupPaths: string[] = [];
    for (const key of changedFiles) {
      const data = await ctx.raw.retrieve(key);
      const backupPath = writeTestFile(ctx.tmpDir, `incremental-backup/${key}`, data);
      backupPaths.push(backupPath);
    }

    expect(backupPaths).toHaveLength(1);
  });

  // ==========================================================================
  // Test 4: Full system restore from backup
  // ==========================================================================
  test('full system restore from backup', async () => {
    ctx = createE2EContext();

    // Setup initial system state
    const events = generateTestEvents(20);
    for (const event of events) {
      ctx.atlas.insert(`event-${event.index}`, event);
    }

    const rawFiles = [
      { key: 'meta.json', content: JSON.stringify({ eventCount: 20 }) },
      { key: 'log.txt', content: 'System initialized\n' },
    ];

    for (const file of rawFiles) {
      await ctx.raw.store(file.key, Buffer.from(file.content));
    }

    // Create full backup
    const backup = {
      atlas: [] as Array<{ key: string; data: unknown }>,
      raw: [] as Array<{ key: string; content: string }>,
      timestamp: ctx.clock.now(),
    };

    // Backup Atlas
    const atlasResults = ctx.atlas.query({});
    for (const view of atlasResults.views) {
      backup.atlas.push({ key: view.id, data: view.data });
    }

    // Backup Raw
    const rawList = await ctx.raw.list();
    for (const key of rawList.keys) {
      const data = await ctx.raw.retrieve(key);
      backup.raw.push({ key, content: data.toString('base64') });
    }

    // Write backup file
    const backupPath = writeTestFile(
      ctx.tmpDir,
      'full-backup.json',
      JSON.stringify(backup)
    );

    // Simulate system crash (clear everything)
    for (const view of atlasResults.views) {
      ctx.atlas.delete(view.id);
    }
    for (const key of rawList.keys) {
      await ctx.raw.delete(key);
    }

    expect(ctx.atlas.size()).toBe(0);
    expect((await ctx.raw.list()).keys.length).toBe(0);

    // Restore from backup
    const restoredBackup = JSON.parse(readTestFile(backupPath).toString());

    // Restore Atlas
    for (const item of restoredBackup.atlas) {
      ctx.atlas.insert(item.key, item.data);
    }

    // Restore Raw
    for (const item of restoredBackup.raw) {
      await ctx.raw.store(item.key, Buffer.from(item.content, 'base64'));
    }

    // Verify restoration
    expect(ctx.atlas.size()).toBe(20);
    expect((await ctx.raw.list()).keys.length).toBe(2);

    const metaData = await ctx.raw.retrieve('meta.json');
    expect(JSON.parse(metaData.toString())).toEqual({ eventCount: 20 });
  });
});

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Simple checksum for change detection (not cryptographic)
 */
function simpleChecksum(data: Buffer): string {
  let hash = 0;
  for (const byte of data) {
    hash = ((hash << 5) - hash + byte) | 0;
  }
  return hash.toString(16);
}
