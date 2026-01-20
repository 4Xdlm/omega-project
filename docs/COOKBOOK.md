# OMEGA Cookbook — Common Patterns

**Version**: 1.0.0
**Standard**: NASA-Grade L4

This cookbook provides practical examples for common OMEGA operations.

---

## Table of Contents

1. [Atlas — View Store](#atlas--view-store)
2. [Raw — Storage](#raw--storage)
3. [Proof — Verification](#proof--verification)
4. [Error Handling](#error-handling)
5. [Testing Patterns](#testing-patterns)

---

## Atlas — View Store

### Basic CRUD Operations

```typescript
import { AtlasStore } from '@omega-private/nexus-atlas';

// Create store
const store = new AtlasStore();

// Insert a view
const view = store.insert('user-1', {
  name: 'Alice',
  email: 'alice@example.com',
  status: 'active'
});

console.log(view.id);        // 'user-1'
console.log(view.version);   // 1
console.log(view.timestamp); // creation timestamp

// Update a view
const updated = store.update('user-1', {
  name: 'Alice Smith',
  email: 'alice@example.com',
  status: 'active'
});

console.log(updated.version); // 2

// Upsert (insert or update)
store.upsert('user-2', { name: 'Bob' });

// Delete a view
const deleted = store.delete('user-1');

// Get a view
const user = store.get('user-2');
```

### Querying Views

```typescript
import { AtlasStore } from '@omega-private/nexus-atlas';

const store = new AtlasStore();

// Insert sample data
store.insert('1', { name: 'Alice', age: 30, department: 'eng' });
store.insert('2', { name: 'Bob', age: 25, department: 'eng' });
store.insert('3', { name: 'Carol', age: 35, department: 'sales' });

// Query with filter
const result = store.query({
  filter: { field: 'department', operator: 'eq', value: 'eng' }
});

console.log(result.views.length); // 2
console.log(result.total);        // 2

// Query with sorting
const sorted = store.query({
  sort: { field: 'age', direction: 'desc' }
});

// Query with pagination
const page = store.query({
  limit: 10,
  offset: 0
});

// Find one
const alice = store.findOne({ field: 'name', operator: 'eq', value: 'Alice' });

// Count
const count = store.count({ field: 'department', operator: 'eq', value: 'eng' });
```

### Using Indexes

```typescript
import { AtlasStore } from '@omega-private/nexus-atlas';

const store = new AtlasStore();

// Create an index
store.createIndex({
  name: 'by-department',
  field: 'department'
});

// Insert data (automatically indexed)
store.insert('1', { name: 'Alice', department: 'eng' });
store.insert('2', { name: 'Bob', department: 'eng' });

// Fast lookup using index
const engineers = store.lookupByIndex('by-department', 'eng');
console.log(engineers.length); // 2

// Check index stats
const stats = store.getIndexStats();
console.log(stats);
```

### Subscriptions

```typescript
import { AtlasStore } from '@omega-private/nexus-atlas';

const store = new AtlasStore();

// Subscribe to all changes
const subscription = store.subscribe((event) => {
  console.log('Event:', event.type, event.view.id);
});

// Subscribe with filter
const filtered = store.subscribe(
  (event) => console.log('Engineer changed:', event.view.id),
  { field: 'department', operator: 'eq', value: 'eng' }
);

// Trigger events
store.insert('1', { department: 'eng' }); // Both callbacks fire
store.insert('2', { department: 'sales' }); // Only first callback fires

// Unsubscribe
store.unsubscribe(subscription.id);
```

---

## Raw — Storage

### Basic Storage Operations

```typescript
import { RawStorage, MemoryBackend } from '@omega-private/nexus-raw';

// Create storage with memory backend
const storage = new RawStorage({
  backend: new MemoryBackend()
});

// Store data
await storage.store('my-key', Buffer.from('Hello, World!'));

// Retrieve data
const data = await storage.retrieve('my-key');
console.log(data.toString()); // 'Hello, World!'

// Check existence
const exists = await storage.exists('my-key');

// Delete data
await storage.delete('my-key');

// List all keys
const keys = await storage.list();
```

### File Backend

```typescript
import { RawStorage, FileBackend } from '@omega-private/nexus-raw';

// Create storage with file backend
const storage = new RawStorage({
  backend: new FileBackend({ rootDir: './data' })
});

// Store JSON data
const user = { id: 1, name: 'Alice' };
await storage.store('users/1.json', Buffer.from(JSON.stringify(user)));

// Retrieve and parse
const data = await storage.retrieve('users/1.json');
const parsed = JSON.parse(data.toString());
```

### Encryption

```typescript
import { RawStorage, MemoryBackend, Keyring } from '@omega-private/nexus-raw';

// Create keyring with encryption key
const keyring = new Keyring();
keyring.addKey('main', Buffer.from('32-byte-encryption-key-here!!!!'));

// Create storage with encryption
const storage = new RawStorage({
  backend: new MemoryBackend(),
  keyring,
  defaultKeyId: 'main'
});

// Data is automatically encrypted
await storage.store('secret', Buffer.from('sensitive data'), {
  encrypt: true
});

// Data is automatically decrypted on retrieve
const data = await storage.retrieve('secret');
```

### Backup and Restore

```typescript
import { RawStorage, MemoryBackend } from '@omega-private/nexus-raw';

const storage = new RawStorage({ backend: new MemoryBackend() });

// Store some data
await storage.store('key1', Buffer.from('data1'));
await storage.store('key2', Buffer.from('data2'));

// Export backup
const backup = await storage.exportBackup();
console.log('Backup contains', backup.entries.length, 'entries');

// Save backup to file
fs.writeFileSync('backup.json', JSON.stringify(backup));

// --- Later ---

// Load backup
const loaded = JSON.parse(fs.readFileSync('backup.json', 'utf8'));

// Restore
const newStorage = new RawStorage({ backend: new MemoryBackend() });
await newStorage.importBackup(loaded);

// Verify
const data = await newStorage.retrieve('key1');
console.log(data.toString()); // 'data1'
```

---

## Proof — Verification

### Building a Manifest

```typescript
import { buildManifest } from '@omega-private/proof-utils';

// Build manifest for a directory
const manifest = await buildManifest({
  paths: ['./src'],
  algorithm: 'sha256'
});

console.log('Files:', manifest.files.length);
console.log('Root hash:', manifest.rootHash);

// Save manifest
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
```

### Verifying Integrity

```typescript
import { buildManifest, verifyManifest } from '@omega-private/proof-utils';

// Build initial manifest
const manifest = await buildManifest({ paths: ['./data'] });

// --- Later ---

// Verify files haven't changed
const report = await verifyManifest(manifest);

if (report.status === 'OK') {
  console.log('All files verified');
} else {
  console.log('Verification failed:');
  console.log('Missing files:', report.missing);
  console.log('Modified files:', report.mismatches);
}
```

### Creating Snapshots

```typescript
import { createSnapshot, restoreSnapshot } from '@omega-private/proof-utils';

// Create snapshot
const snapshot = await createSnapshot({
  sourcePath: './data',
  snapshotDir: './snapshots',
  name: 'backup-2026-01-20'
});

console.log('Snapshot ID:', snapshot.id);
console.log('Size:', snapshot.totalBytes);

// --- Later ---

// Restore snapshot
await restoreSnapshot({
  snapshotId: snapshot.id,
  snapshotDir: './snapshots',
  targetPath: './restored'
});
```

### Comparing Manifests

```typescript
import { buildManifest, diffManifests } from '@omega-private/proof-utils';

// Build two manifests
const before = await buildManifest({ paths: ['./data'] });

// ... make changes ...

const after = await buildManifest({ paths: ['./data'] });

// Compare
const diff = diffManifests(before, after);

console.log('Added files:', diff.added);
console.log('Removed files:', diff.removed);
console.log('Modified files:', diff.modified);
```

---

## Error Handling

### Catching Specific Errors

```typescript
import { RawStorage, RawStorageNotFoundError, isRawError } from '@omega-private/nexus-raw';

const storage = new RawStorage({ /* ... */ });

try {
  await storage.retrieve('missing-key');
} catch (error) {
  if (error instanceof RawStorageNotFoundError) {
    // Handle missing key specifically
    console.log('Key not found');
    return null;
  }

  if (isRawError(error)) {
    // Handle any other raw storage error
    console.log('Storage error:', error.code, error.message);
    throw error;
  }

  // Re-throw unknown errors
  throw error;
}
```

### Using Error Context

```typescript
import { AtlasViewVersionConflictError } from '@omega-private/nexus-atlas';

try {
  store.update('view-1', newData, expectedVersion);
} catch (error) {
  if (error instanceof AtlasViewVersionConflictError) {
    console.log('Conflict detected:');
    console.log('  View ID:', error.context.viewId);
    console.log('  Expected version:', error.context.expectedVersion);
    console.log('  Actual version:', error.context.actualVersion);

    // Retry with current version
    const current = store.get('view-1');
    store.update('view-1', newData, current.version);
  }
}
```

### Logging Errors

```typescript
import { isOmegaError } from '@omega-private/nexus-shared';

function logError(error: unknown): void {
  if (isOmegaError(error)) {
    // Structured logging for OMEGA errors
    console.error(JSON.stringify({
      level: 'error',
      code: error.code,
      module: error.module,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
      stack: error.stack
    }));
  } else if (error instanceof Error) {
    console.error(JSON.stringify({
      level: 'error',
      message: error.message,
      stack: error.stack
    }));
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## Testing Patterns

### Injecting Time for Deterministic Tests

```typescript
import { AtlasStore } from '@omega-private/nexus-atlas';
import { describe, test, expect } from 'vitest';

describe('AtlasStore', () => {
  test('uses injected clock', () => {
    const fixedTime = 1705750800000; // 2024-01-20T12:00:00Z

    const store = new AtlasStore({
      clock: { now: () => fixedTime }
    });

    const view = store.insert('1', { name: 'Test' });

    expect(view.timestamp).toBe(fixedTime);
  });
});
```

### Testing Error Conditions

```typescript
import { AtlasStore, AtlasViewNotFoundError } from '@omega-private/nexus-atlas';
import { describe, test, expect } from 'vitest';

describe('AtlasStore errors', () => {
  test('throws AtlasViewNotFoundError for missing view', () => {
    const store = new AtlasStore();

    expect(() => store.get('nonexistent')).not.toThrow();
    expect(store.get('nonexistent')).toBeUndefined();

    expect(() => store.delete('nonexistent')).toThrow(AtlasViewNotFoundError);
  });

  test('error has correct context', () => {
    const store = new AtlasStore();

    try {
      store.delete('missing-id');
    } catch (error) {
      expect(error).toBeInstanceOf(AtlasViewNotFoundError);
      expect(error.context.viewId).toBe('missing-id');
    }
  });
});
```

### Mocking Storage Backend

```typescript
import { RawStorage, MemoryBackend } from '@omega-private/nexus-raw';
import { describe, test, expect, vi } from 'vitest';

describe('RawStorage', () => {
  test('stores and retrieves data', async () => {
    const backend = new MemoryBackend();
    const storage = new RawStorage({ backend });

    await storage.store('key', Buffer.from('value'));
    const result = await storage.retrieve('key');

    expect(result.toString()).toBe('value');
  });
});
```

---

## Best Practices Summary

1. **Always handle errors** — Use typed error classes for specific handling
2. **Inject dependencies** — Use injectable clocks for testability
3. **Use indexes for frequent queries** — Improves lookup performance
4. **Verify manifests after restore** — Ensure data integrity
5. **Structure error context** — Include relevant data for debugging
6. **Use type guards** — `isOmegaError()`, `isRawError()`, etc.

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Phase B Industrial | Initial cookbook |
