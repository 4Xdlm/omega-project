# ADR-0004: Storage Architecture

**Status**: ACCEPTED
**Date**: 2026-01-19
**Decision Makers**: Francky (Architect)

## Context

Phase A needs a flexible storage system for the Raw module that:
- Supports multiple backends (file, SQLite)
- Handles encryption and compression
- Manages TTL (time-to-live)
- Enables backup/restore

## Decision

**Backend-agnostic architecture with composable features**

## Architecture

```
┌─────────────────────────────────────────┐
│            Raw Facade                   │
│  (store, retrieve, delete, list, etc.)  │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────┴─────────────────────┐
│           Feature Pipeline              │
│  ┌────────┐ ┌────────┐ ┌────────────┐   │
│  │Compress│→│Encrypt │→│ TTL Check  │   │
│  └────────┘ └────────┘ └────────────┘   │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────┴─────────────────────┐
│           Backend Selector              │
│   ┌──────────┐    ┌──────────────┐      │
│   │  File    │    │   SQLite     │      │
│   │ Backend  │    │  (sql.js)    │      │
│   └──────────┘    └──────────────┘      │
└─────────────────────────────────────────┘
```

## Backend Interface

```typescript
export interface RawBackend {
  store(key: string, data: Buffer, options?: StoreOptions): Promise<void>;
  retrieve(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

export interface StoreOptions {
  metadata?: Record<string, unknown>;
  ttl?: number;
  compress?: boolean;
  encrypt?: boolean;
}
```

## Feature Composition

### Compression

```typescript
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const compress = promisify(gzip);
const decompress = promisify(gunzip);

export async function compressData(data: Buffer): Promise<Buffer> {
  return compress(data, { level: 6 });
}
```

### Encryption

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export function encrypt(data: Buffer, key: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: tag.toString('base64')
  });
}
```

### TTL Management

```typescript
interface TTLMetadata {
  expiresAt: number | null;
}

export function isExpired(metadata: TTLMetadata, clock: Clock): boolean {
  if (metadata.expiresAt === null) return false;
  return clock.now() > metadata.expiresAt;
}
```

## Backend Implementations

### File Backend

- One file per key
- Metadata in `.meta.json` sidecar
- Atomic writes via rename
- Directory-based listing

### SQLite Backend (sql.js)

- Single database file
- Entries table with BLOB data
- Metadata as JSON column
- TTL index for efficient cleanup

## Rationale

1. **Backend Abstraction**
   - Switch backends without code change
   - Test with in-memory, deploy with file/SQLite
   - Future backends possible (Redis, S3, etc.)

2. **Composable Features**
   - Encryption optional per-entry
   - Compression optional per-entry
   - Clean separation of concerns

3. **TTL at Storage Level**
   - Automatic cleanup
   - No application logic needed
   - Efficient with index

## Consequences

### Positive
- ✓ Flexible backend choice
- ✓ Feature composition
- ✓ Clear interfaces
- ✓ Testable in isolation

### Negative
- Some abstraction overhead
- Need to maintain multiple backends

### Mitigation
- Common test suite for all backends
- Feature toggles for production

## Directory Structure

```
nexus/raw/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── errors.ts
│   ├── backends/
│   │   ├── fileBackend.ts
│   │   └── sqliteBackend.ts
│   ├── features/
│   │   ├── compression.ts
│   │   ├── encryption.ts
│   │   └── ttl.ts
│   └── facade.ts
└── tests/
    ├── fileBackend.test.ts
    ├── sqliteBackend.test.ts
    └── features.test.ts
```

## References

- ADR-0001: SQLite choice (sql.js)
- ADR-0003: Determinism (clock injection for TTL)
- NASA LOCK perimeter constraints
