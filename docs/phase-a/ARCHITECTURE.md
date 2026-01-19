# Phase A Architecture

**Standard**: NASA-Grade L4 / DO-178C Level A

## System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        OMEGA Core                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐   │
│  │   Ledger    │──▶│    Atlas    │   │    Proof-Utils      │   │
│  │  (Events)   │   │   (Views)   │   │  (Verification)     │   │
│  └─────────────┘   └─────────────┘   └─────────────────────┘   │
│         │                │                     │                │
│         ▼                ▼                     ▼                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                       Raw Storage                        │   │
│  │           (Compression, Encryption, TTL)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Module Architecture

### Atlas — View Model

Atlas implements a CQRS-style view model that projects Ledger events into queryable views.

```
┌─────────────────────────────────────────────────────────────┐
│                      AtlasStore                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐     ┌────────────────────────────────┐  │
│  │  View Storage  │────▶│      Query Engine               │  │
│  │   (Map<id>)    │     │  (filter, sort, paginate)       │  │
│  └────────────────┘     └────────────────────────────────┘  │
│         │                         │                          │
│         ▼                         ▼                          │
│  ┌────────────────┐     ┌────────────────────────────────┐  │
│  │ Index Manager  │     │   Subscription Manager          │  │
│  │ (Hash, BTree)  │     │   (reactive notifications)      │  │
│  └────────────────┘     └────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Components**:

1. **View Storage**: In-memory Map storing AtlasView objects
2. **Query Engine**: Supports filter, sort, pagination
3. **Index Manager**: Hash and BTree indexes for fast lookups
4. **Subscription Manager**: Reactive notifications on view changes

**Flow**:
```
Event → applyEvent() → update view → notify subscribers → update indexes
```

### Raw — Storage

Raw provides a backend-agnostic key-value storage with composable features.

```
┌─────────────────────────────────────────────────────────────┐
│                      RawStorage                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Store Pipeline                     │    │
│  │                                                      │    │
│  │   Data → Compress → Encrypt → Checksum → Backend     │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Retrieve Pipeline                   │    │
│  │                                                      │    │
│  │   Backend → Checksum → Decrypt → Decompress → Data   │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────┐       │
│  │  Memory Backend  │    │     File Backend          │       │
│  │  (quota, speed)  │    │  (atomic writes, meta)    │       │
│  └──────────────────┘    └──────────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features**:

1. **Compression**: Gzip with configurable level
2. **Encryption**: AES-256-GCM authenticated encryption
3. **TTL**: Time-to-live with automatic cleanup
4. **Checksum**: SHA-256 for data integrity

### Proof-Utils — Verification

Proof-Utils provides manifest generation, verification, and snapshot management.

```
┌─────────────────────────────────────────────────────────────┐
│                     Proof-Utils                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────┐    ┌────────────────────────────┐   │
│  │  Manifest Builder  │    │    Manifest Verifier       │   │
│  │  (SHA-256 hashes)  │───▶│  (integrity checking)       │   │
│  └────────────────────┘    └────────────────────────────┘   │
│                                                              │
│  ┌────────────────────┐    ┌────────────────────────────┐   │
│  │ Snapshot Manager   │    │      Diff Engine           │   │
│  │ (capture/restore)  │───▶│  (compare manifests)        │   │
│  └────────────────────┘    └────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               Serialization Layer                      │ │
│  │        (JSON encode/decode, file I/O)                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Design Patterns

### Dependency Injection

All modules use dependency injection for testability:

```typescript
interface Dependencies {
  clock: Clock;      // Time provider
  rng: RNG;          // Random number generator
  backend: Backend;  // Storage backend
}
```

### Error Hierarchy

Each module defines a typed error hierarchy:

```
ProofError
├── ProofManifestError
│   ├── ProofManifestBuildError
│   └── ProofManifestParseError
├── ProofVerifyError
│   ├── ProofFileNotFoundError
│   └── ProofHashMismatchError
└── ProofSnapshotError
    ├── ProofSnapshotCreateError
    └── ProofSnapshotRestoreError
```

### Immutability

All returned objects are frozen:

```typescript
return Object.freeze({
  entries: Object.freeze(entries),
  timestamp: clock.now(),
});
```

## Security Considerations

1. **Path Traversal**: Blocked in Raw storage (sanitizeKey)
2. **Encryption**: AES-256-GCM with unique IVs per encryption
3. **Key Management**: SimpleKeyring with rotation support
4. **Checksums**: SHA-256 for integrity verification

## Performance Considerations

1. **Indexes**: Hash (O(1)) and BTree (O(log n)) for fast lookups
2. **Compression**: Gzip level 6 balances speed and ratio
3. **Memory Backend**: In-memory with configurable quota
4. **File Backend**: Atomic writes prevent corruption
