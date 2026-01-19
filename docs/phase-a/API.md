# Phase A API Reference

## Atlas Module

### AtlasStore

Main facade for the Atlas view model.

```typescript
import { AtlasStore } from '@omega/nexus-atlas';

const store = new AtlasStore(options?: AtlasOptions);
```

**Options**:
```typescript
interface AtlasOptions {
  clock?: Clock;     // Time provider (default: systemClock)
  rng?: RNG;         // Random generator (default: Math.random)
}
```

**Methods**:

| Method | Description |
|--------|-------------|
| `insert(id, data)` | Insert new view |
| `update(id, data, version?)` | Update view (optional optimistic locking) |
| `upsert(id, data)` | Insert or update |
| `delete(id)` | Delete view |
| `get(id)` | Get view by ID |
| `exists(id)` | Check if view exists |
| `query(query?)` | Query views with filter/sort/pagination |
| `subscribe(callback, filter?)` | Subscribe to changes |
| `createIndex(name, field, type)` | Create index |
| `findByIndex(indexName, value)` | Query by index |
| `applyEvent(event)` | Apply Ledger event |

### Indexes

```typescript
import { HashIndex, BTreeIndex } from '@omega/nexus-atlas';

// Hash index (O(1) equality lookups)
const hashIdx = new HashIndex('field');

// BTree index (range queries)
const btreeIdx = new BTreeIndex('field');
```

### Query

```typescript
const result = store.query({
  filter: {
    field: 'status',
    operator: 'eq',
    value: 'active',
  },
  sort: { field: 'createdAt', direction: 'desc' },
  limit: 10,
  offset: 0,
});
```

**Filter Operators**: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `contains`, `startsWith`, `exists`

---

## Raw Module

### RawStorage

Main facade for raw key-value storage.

```typescript
import { RawStorage, MemoryBackend } from '@omega/nexus-raw';

const storage = new RawStorage({
  backend: new MemoryBackend(),
  clock?: Clock,
  keyring?: Keyring,  // Required for encryption
});
```

**Methods**:

| Method | Description |
|--------|-------------|
| `store(key, data, options?)` | Store data |
| `retrieve(key)` | Retrieve data |
| `retrieveWithMetadata(key)` | Retrieve with metadata |
| `exists(key)` | Check if key exists |
| `delete(key)` | Delete entry |
| `list(options?)` | List keys |
| `clear()` | Clear all entries |
| `cleanupExpired()` | Remove expired entries |

**Store Options**:
```typescript
interface StoreOptions {
  ttl?: number;       // Time-to-live in ms
  compress?: boolean; // Enable compression
  encrypt?: boolean;  // Enable encryption (requires keyring)
  metadata?: Record<string, unknown>;
}
```

### Backends

```typescript
// Memory backend
const memoryBackend = new MemoryBackend({
  clock?: Clock,
  maxSize?: number,  // Quota in bytes
});

// File backend
const fileBackend = new FileBackend({
  rootPath: '/path/to/storage',
  clock?: Clock,
});
```

### Encryption

```typescript
import { createKeyring, encrypt, decrypt } from '@omega/nexus-raw';

const keyring = createKeyring(clock, rng);
const encrypted = encrypt(data, keyring.getCurrentKey(), rng);
const decrypted = decrypt(encrypted, keyring);
```

### Compression

```typescript
import { compress, decompress } from '@omega/nexus-raw';

const compressed = compress(data);
const original = decompress(compressed);
```

---

## Proof-Utils Module

### Manifest

```typescript
import { buildManifest, verifyManifest } from '@omega/proof-utils';

// Build manifest from files
const manifest = buildManifest(
  ['/path/file1.txt', '/path/file2.txt'],
  () => Date.now()  // Optional timestamp provider
);

// Verify manifest
const result = verifyManifest(manifest);
// { valid: boolean, errors: string[], tamperedFiles: string[] }
```

### Snapshot

```typescript
import {
  createSnapshot,
  restoreSnapshot,
  verifySnapshot,
  compareSnapshots
} from '@omega/proof-utils';

// Create snapshot
const snapshot = createSnapshot(
  ['/path/file1.txt'],
  { name: 'my-snapshot', metadata: { phase: 'test' } },
  clock
);

// Restore snapshot
const result = restoreSnapshot(snapshot, {
  createDirectories: true,
  overwrite: true,
});

// Verify snapshot
const verifyResult = verifySnapshot(snapshot);

// Compare two snapshots
const diff = compareSnapshots(before, after);
// { added: string[], removed: string[], modified: string[], unchanged: string[] }
```

### Diff

```typescript
import {
  diffManifests,
  hasChanges,
  getChangedPaths,
  summarizeDiff
} from '@omega/proof-utils';

const diff = diffManifests(beforeManifest, afterManifest);
// { entries: DiffEntry[], added: number, removed: number, modified: number, unchanged: number }

hasChanges(diff);  // boolean
getChangedPaths(diff);  // string[]
summarizeDiff(diff);  // "+1 added, -2 removed, ~3 modified"
```

### Serialization

```typescript
import {
  serializeManifest,
  deserializeManifest,
  saveManifest,
  loadManifest,
  serializeSnapshot,
  deserializeSnapshot,
  saveSnapshot,
  loadSnapshot
} from '@omega/proof-utils';

// JSON serialization
const json = serializeManifest(manifest);
const restored = deserializeManifest(json);

// File operations
saveManifest(manifest, '/path/manifest.json');
const loaded = loadManifest('/path/manifest.json');
```

---

## Error Codes

### Atlas Errors
| Code | Error | Description |
|------|-------|-------------|
| ATLAS_E001_NOT_FOUND | AtlasNotFoundError | View not found |
| ATLAS_E002_CONFLICT | AtlasConflictError | Version conflict |
| ATLAS_E003_QUERY | AtlasQueryError | Invalid query |
| ATLAS_E004_INDEX | AtlasIndexError | Index error |

### Raw Errors
| Code | Error | Description |
|------|-------|-------------|
| RAW_E001_PATH_TRAVERSAL | RawPathTraversalError | Path traversal attempt |
| RAW_E002_NOT_FOUND | RawStorageNotFoundError | Key not found |
| RAW_E003_TTL_EXPIRED | RawTTLExpiredError | Entry expired |
| RAW_E004_CRYPTO | RawCryptoError | Encryption/decryption error |

### Proof Errors
| Code | Error | Description |
|------|-------|-------------|
| PROOF_E011_FILE_NOT_FOUND | ProofFileNotFoundError | File not found |
| PROOF_E012_HASH_MISMATCH | ProofHashMismatchError | Hash mismatch |
| PROOF_E021_SNAPSHOT_CREATE | ProofSnapshotCreateError | Snapshot creation failed |
| PROOF_E041_DESERIALIZE | ProofDeserializeError | Deserialization failed |
