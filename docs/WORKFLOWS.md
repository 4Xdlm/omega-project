# OMEGA Workflows Documentation

**Version**: 1.0.0
**Standard**: NASA-Grade L4
**Last Updated**: 2026-01-20

---

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Complete Pipeline Workflow](#complete-pipeline-workflow)
4. [Backup and Restore](#backup-and-restore)
5. [Concurrent Operations](#concurrent-operations)
6. [Replay and Checkpointing](#replay-and-checkpointing)
7. [Error Handling](#error-handling)
8. [Testing Workflows](#testing-workflows)

---

## Overview

OMEGA workflows integrate three core modules:

- **Atlas**: In-memory view store with query, indexing, and subscriptions
- **Raw**: Blob storage with pluggable backends
- **Proof-utils**: Manifest building and verification for audit trails

All workflows support:
- Injectable dependencies (ClockFn, CorrelationProvider)
- Deterministic testing
- Observable operations (logging, metrics, tracing)

---

## Core Components

### Atlas Store

```typescript
import { AtlasStore } from 'nexus/atlas';

const atlas = new AtlasStore({
  clock: { now: () => Date.now() },
  logger,   // Optional: Logger instance
  metrics,  // Optional: MetricsCollector instance
  tracer,   // Optional: Tracer instance
});

// Insert
const view = atlas.insert('key', { field: 'value' });

// Update
atlas.update('key', { field: 'updated' });

// Upsert (insert or update)
atlas.upsert('key', { field: 'value' });

// Get
const view = atlas.get('key');  // Returns AtlasView | undefined

// Has
const exists = atlas.has('key');  // Returns boolean

// Delete
atlas.delete('key');  // Throws if not found

// Query
const result = atlas.query({
  filter: { field: 'type', operator: 'eq', value: 'event' },
  limit: 100,
  offset: 0,
});
```

### Raw Storage

```typescript
import { RawStorage } from 'nexus/raw';
import { MemoryBackend } from 'nexus/raw/backends/memoryBackend';

const raw = new RawStorage({
  backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
  clock: { now: () => Date.now() },
  logger,
  metrics,
  tracer,
});

// Store
await raw.store('path/to/file.json', Buffer.from(content));

// Retrieve
const data = await raw.retrieve('path/to/file.json');

// List
const { keys } = await raw.list();

// Delete
await raw.delete('path/to/file.json');
```

### Proof Utils

```typescript
import { buildManifest, verifyManifest } from 'nexus/proof-utils';

// Build manifest from file paths
const manifest = buildManifest([
  '/path/to/file1.json',
  '/path/to/file2.json',
]);

// Verify manifest integrity
const result = verifyManifest(manifest);
// { valid: boolean, errors: readonly string[] }
```

---

## Complete Pipeline Workflow

The complete pipeline processes events through Atlas, stores summaries in Raw, and generates proof manifests.

### Workflow Steps

```
1. Ingest Events → 2. Store in Atlas → 3. Query/Aggregate → 4. Store in Raw → 5. Build Proof
```

### Implementation

```typescript
import { createE2EContext, generateTestEvents, writeTestFile, buildManifest, verifyManifest } from 'tests/e2e/setup';

// 1. Create context
const ctx = createE2EContext();

// 2. Generate and store events in Atlas
const events = generateTestEvents(100);
for (const event of events) {
  ctx.atlas.insert(`event-${event.index}`, event);
}

// 3. Query events
const results = ctx.atlas.query({
  filter: { field: 'type', operator: 'eq', value: 'test-event' },
});

// 4. Create and store summary in Raw
const summary = {
  totalEvents: events.length,
  processedAt: ctx.clock.now(),
  firstEventTimestamp: events[0].timestamp,
  lastEventTimestamp: events[events.length - 1].timestamp,
};
await ctx.raw.store('summary.json', Buffer.from(JSON.stringify(summary)));

// 5. Write files and build proof manifest
const summaryPath = writeTestFile(ctx.tmpDir, 'data/summary.json', JSON.stringify(summary));
const eventsPath = writeTestFile(ctx.tmpDir, 'data/events.json', JSON.stringify(events));

const manifest = buildManifest([summaryPath, eventsPath]);
const verification = verifyManifest(manifest);

// 6. Cleanup
ctx.cleanup();
```

---

## Backup and Restore

### Atlas Snapshot

```typescript
// Take snapshot
const snapshot: Array<{ key: string; data: unknown }> = [];
const allViews = ctx.atlas.query({});
for (const view of allViews.views) {
  snapshot.push({ key: view.id, data: view.data });
}

// Save to file
fs.writeFileSync('backup/atlas-snapshot.json', JSON.stringify(snapshot));

// Restore from snapshot
const restored = JSON.parse(fs.readFileSync('backup/atlas-snapshot.json', 'utf8'));
for (const item of restored) {
  ctx.atlas.insert(item.key, item.data);
}
```

### Raw Storage Backup

```typescript
// List all keys
const { keys } = await ctx.raw.list();

// Backup each file
for (const key of keys) {
  const data = await ctx.raw.retrieve(key);
  fs.writeFileSync(`backup/${key}`, data);
}

// Build manifest for backup
const backupPaths = keys.map(k => `backup/${k}`);
const manifest = buildManifest(backupPaths);
```

### Full System Backup

```typescript
const backup = {
  atlas: [] as Array<{ key: string; data: unknown }>,
  raw: [] as Array<{ key: string; content: string }>,
  timestamp: Date.now(),
};

// Backup Atlas
const atlasViews = ctx.atlas.query({});
for (const view of atlasViews.views) {
  backup.atlas.push({ key: view.id, data: view.data });
}

// Backup Raw (base64 encoded)
const { keys } = await ctx.raw.list();
for (const key of keys) {
  const data = await ctx.raw.retrieve(key);
  backup.raw.push({ key, content: data.toString('base64') });
}

// Save backup
fs.writeFileSync('full-backup.json', JSON.stringify(backup));
```

### Restore from Full Backup

```typescript
const backup = JSON.parse(fs.readFileSync('full-backup.json', 'utf8'));

// Restore Atlas
for (const item of backup.atlas) {
  ctx.atlas.insert(item.key, item.data);
}

// Restore Raw
for (const item of backup.raw) {
  await ctx.raw.store(item.key, Buffer.from(item.content, 'base64'));
}
```

---

## Concurrent Operations

### Parallel Atlas Insertions

```typescript
const batches = Array.from({ length: 10 }, (_, batchIndex) =>
  generateTestEvents(100).map((e) => ({
    ...e,
    batchId: batchIndex,
    index: batchIndex * 100 + e.index,
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
```

### Parallel Raw Operations

```typescript
const files = Array.from({ length: 100 }, (_, i) => ({
  key: `file-${i}.dat`,
  content: Buffer.from(`data-${i}`),
}));

// Store all files in parallel
await Promise.all(
  files.map((f) => ctx.raw.store(f.key, f.content))
);
```

### Mixed Read/Write Operations

```typescript
await Promise.all([
  // Readers
  ...Array.from({ length: 20 }, (_, i) =>
    Promise.resolve().then(() => ctx.atlas.get(`event-${i}`))
  ),

  // Writers
  ...Array.from({ length: 30 }, (_, i) =>
    Promise.resolve().then(() =>
      ctx.atlas.insert(`new-${i}`, { index: i })
    )
  ),
]);
```

---

## Replay and Checkpointing

### Event Log Replay

```typescript
interface EventLogEntry {
  type: 'insert' | 'update' | 'delete';
  key: string;
  data?: unknown;
  timestamp: number;
}

function applyEventLog(log: EventLogEntry[], atlas: AtlasStore): void {
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

// Replay produces deterministic state
applyEventLog(eventLog, atlas);
```

### Checkpoint and Resume

```typescript
// Process first batch
for (let i = 0; i < 50; i++) {
  ctx.atlas.insert(`event-${i}`, events[i]);
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

fs.writeFileSync('checkpoint.json', JSON.stringify(checkpoint));

// --- Later: Resume from checkpoint ---

const restored = JSON.parse(fs.readFileSync('checkpoint.json', 'utf8'));

// Restore state
for (const item of restored.atlasSnapshot) {
  ctx.atlas.insert(item.key, item.data);
}

// Continue processing
for (let i = restored.processedCount; i < events.length; i++) {
  ctx.atlas.insert(`event-${i}`, events[i]);
}
```

### Audit Trail

```typescript
const auditTrail: Array<{
  action: string;
  target: string;
  timestamp: number;
  details: unknown;
}> = [];

// Log operations
function logOperation(action: string, key: string, data: unknown) {
  const timestamp = Date.now();

  // Perform operation
  if (action === 'create') {
    ctx.atlas.insert(key, data);
  } else if (action === 'modify') {
    ctx.atlas.update(key, data);
  }

  // Store in Raw for durability
  await ctx.raw.store(
    `audit/${timestamp}-${action}-${key}.json`,
    Buffer.from(JSON.stringify({ action, key, data, timestamp }))
  );

  auditTrail.push({ action, target: key, timestamp, details: data });
}

// Build audit proof
const manifest = buildManifest(auditFiles);
const verification = verifyManifest(manifest);
```

---

## Error Handling

### Safe Key Access

```typescript
// get() returns undefined for missing keys
const view = ctx.atlas.get('non-existent');
if (!view) {
  console.log('Key not found');
}

// Use has() for existence checks
if (ctx.atlas.has('key')) {
  ctx.atlas.update('key', newData);
}
```

### Handling Throws

```typescript
// update() and delete() throw AtlasViewNotFoundError
try {
  ctx.atlas.update('non-existent', data);
} catch (error) {
  if (error instanceof AtlasViewNotFoundError) {
    // Handle missing view
  }
}

// Raw retrieve() throws for missing keys
try {
  const data = await ctx.raw.retrieve('non-existent.txt');
} catch (error) {
  // Handle missing file
}
```

### Graceful Degradation

```typescript
const results: Array<{ key: string; success: boolean; error?: string }> = [];

for (const event of events) {
  try {
    ctx.atlas.insert(`event-${event.index}`, event);
    results.push({ key: `event-${event.index}`, success: true });
  } catch (error) {
    results.push({
      key: `event-${event.index}`,
      success: false,
      error: error.message,
    });
  }
}

const successes = results.filter((r) => r.success);
const failures = results.filter((r) => !r.success);
```

### Retry Logic

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(100 * attempt); // Exponential backoff
      }
    }
  }

  throw lastError;
}

// Usage
const data = await withRetry(() => ctx.raw.retrieve('file.txt'));
```

---

## Testing Workflows

### E2E Test Context

```typescript
import {
  createE2EContext,
  generateTestEvents,
  writeTestFile,
  readTestFile,
  buildManifest,
  verifyManifest,
  type E2EContext,
} from 'tests/e2e/setup';

describe('My Workflow', () => {
  let ctx: E2EContext;

  afterEach(() => {
    ctx?.cleanup();
  });

  test('workflow test', async () => {
    ctx = createE2EContext();

    // Test implementation
  });
});
```

### Context Options

```typescript
const ctx = createE2EContext({
  maxRawSize: 50 * 1024 * 1024,  // 50MB max
  enableLogging: true,
  enableMetrics: true,
  enableTracing: true,
});
```

### Test Utilities

| Function | Description |
|----------|-------------|
| `createE2EContext(options?)` | Create test context with Atlas, Raw, clock |
| `generateTestEvents(count)` | Generate deterministic test events |
| `writeTestFile(dir, name, content)` | Write file, return path |
| `readTestFile(path)` | Read file as Buffer |
| `buildManifest(paths)` | Build proof manifest |
| `verifyManifest(manifest)` | Verify manifest integrity |
| `wait(ms)` | Async delay |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Claude Opus 4.5 | Initial documentation |
