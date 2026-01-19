# OMEGA Phase A — Nexus Modules

**Version**: 2.0.0
**Standard**: NASA-Grade L4 / DO-178C Level A

## Overview

Phase A implements the core Nexus infrastructure modules:

- **Atlas**: View model with CQRS pattern, indexing, and reactive subscriptions
- **Raw**: Key-value storage with compression, encryption, and TTL
- **Proof-Utils**: Manifest generation, verification, snapshots, and diffing

## Module Summary

| Module | Version | Tests | Purpose |
|--------|---------|-------|---------|
| @omega/nexus-atlas | 2.0.0 | 144 | View model with CQRS |
| @omega/nexus-raw | 2.0.0 | 104 | Key-value storage |
| @omega/proof-utils | 2.0.0 | 86 | Manifest & snapshot |

## Architecture

```
nexus/
├── atlas/           # View model module
│   ├── src/
│   │   ├── types.ts         # Type definitions
│   │   ├── errors.ts        # Error hierarchy
│   │   ├── query.ts         # Query engine
│   │   ├── indexManager.ts  # Hash & BTree indexes
│   │   ├── subscriptions.ts # Reactive subscriptions
│   │   └── store.ts         # Main facade
│   └── tests/
│
├── raw/             # Storage module
│   ├── src/
│   │   ├── types.ts         # Type definitions
│   │   ├── errors.ts        # Error hierarchy
│   │   ├── utils/           # Compression, encryption, paths
│   │   ├── backends/        # Memory & file backends
│   │   └── storage.ts       # Main facade
│   └── tests/
│
└── proof-utils/     # Proof module
    ├── src/
    │   ├── types.ts         # Type definitions
    │   ├── errors.ts        # Error hierarchy
    │   ├── manifest.ts      # Manifest builder
    │   ├── verify.ts        # Verification
    │   ├── snapshot.ts      # Snapshot management
    │   ├── diff.ts          # Manifest diffing
    │   └── serialize.ts     # JSON serialization
    └── tests/
```

## Key Design Decisions

### ADR-0001: SQLite Backend
- Decision: Use sql.js (pure JavaScript) instead of better-sqlite3
- Rationale: No native compilation required, cross-platform

### ADR-0002: Error Handling
- Decision: Typed error hierarchy with codes
- Pattern: `{MODULE}_E{SEQ}_{DESCRIPTION}`
- Example: `RAW_E001_PATH_TRAVERSAL`

### ADR-0003: Determinism
- Decision: Inject Clock and RNG dependencies
- Rationale: Reproducible behavior for testing

### ADR-0004: Storage Architecture
- Decision: Backend-agnostic design
- Pattern: Composable storage pipeline

## Determinism

All modules follow strict determinism patterns:

```typescript
// Clock injection
interface Clock { now(): number; }

// RNG injection
interface RNG { next(): number; }

// Usage
const store = new AtlasStore({
  clock: mockClock(1000),
  rng: seededRNG(42),
});
```

## FROZEN Modules

The following modules are FROZEN and must not be modified:
- `packages/genome`
- `packages/mycelium`
- `gateway/sentinel`

See CLAUDE.md for full constraints.

## Quick Start

```typescript
// Atlas
import { AtlasStore, HashIndex } from '@omega/nexus-atlas';

const store = new AtlasStore();
const view = store.insert('id-1', { name: 'test' });

// Raw
import { RawStorage, MemoryBackend } from '@omega/nexus-raw';

const storage = new RawStorage({ backend: new MemoryBackend() });
await storage.store('key', Buffer.from('data'), { compress: true });

// Proof-Utils
import { createSnapshot, diffManifests } from '@omega/proof-utils';

const snap = createSnapshot(['/path/to/file.txt']);
```

## Testing

```bash
# Run all tests
npm test

# Test count: 1866 (including 334 nexus tests)
```

## CI/CD

Phase A has its own GitHub Actions workflow (`.github/workflows/phase-a.yml`) that:
- Verifies FROZEN modules are not modified
- Runs all tests
- Verifies module versions and exports
- Generates hash reports
