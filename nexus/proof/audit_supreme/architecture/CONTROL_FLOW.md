# OMEGA Control Flows

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Main Execution Path: Text Analysis

```
User calls analyze()
        │
        ▼
┌───────────────────┐
│ processWithMycelium│
│ (@omega/genome)   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ validate()        │
│ (@omega/mycelium) │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
REJECTED    ACCEPTED
    │           │
    ▼           ▼
Return      ┌───────────────────┐
Error       │ analyze()          │
            │ (@omega/genome)    │
            └─────────┬──────────┘
                      │
                      ▼
            ┌───────────────────┐
            │ Extract features: │
            │ • emotion14       │
            │ • emotionAxis     │
            │ • styleAxis       │
            │ • structureAxis   │
            │ • tempoAxis       │
            └─────────┬─────────┘
                      │
                      ▼
            ┌───────────────────┐
            │ computeFingerprint│
            └─────────┬─────────┘
                      │
                      ▼
            Return NarrativeGenome
```

---

## Error Propagation

### Strategy: Explicit Result Types

OMEGA uses explicit result types rather than exceptions for expected failures:

```typescript
// Pattern used
type ValidationResult = AcceptResult | RejectResult;

// Caller must handle both cases
if (isAccepted(result)) {
  // process
} else {
  // handle rejection
}
```

### Exception Types

| Module | Error Class | When Thrown |
|--------|-------------|-------------|
| @omega/genome | CanonicalizeError | Invalid serialization input |
| @omega/oracle | OracleError | Configuration or runtime errors |
| @omega/search | SearchError | Search operation failures |
| @omega/orchestrator-core | OrchestratorError | Execution failures |

### Error Propagation Rules

1. **Validation errors** → Return RejectResult (not thrown)
2. **Configuration errors** → Throw with descriptive message
3. **Runtime errors** → Throw and let caller handle
4. **Invariant violations** → Throw immediately (should never happen)

---

## Async Boundaries

### Synchronous Operations (Most of OMEGA)

| Module | Functions | Reason |
|--------|-----------|--------|
| @omega/mycelium | All | Pure validation |
| @omega/genome | analyze, compare | Pure computation |
| @omega/genome | computeFingerprint | Hash only |

### Asynchronous Operations

| Module | Functions | Reason |
|--------|-----------|--------|
| @omega/integration-nexus-dep | filesystem.ts | File I/O |
| @omega/headless-runner | execute | Plan execution |
| @omega/gold-cli | executeCli | CLI operations |
| @omega/oracle | StreamingOracle | Streaming responses |

---

## Concurrency Model

### Design: Single-threaded by Default

OMEGA is designed for single-threaded execution to guarantee determinism:

- No worker threads used
- No parallel processing
- Sequential execution

### Async/Await Usage

When async is used:
- For I/O operations only
- No concurrent mutations
- Results are serialized

---

## State Management

### Stateless Modules

| Module | State | Notes |
|--------|-------|-------|
| @omega/mycelium | Stateless | Pure validation |
| @omega/genome | Stateless | Pure analysis |
| @omega/orchestrator-core | Minimal | Execution context only |

### Stateful Modules

| Module | State Type | Persistence |
|--------|------------|-------------|
| @omega/oracle | OracleCache | In-memory, optional |
| @omega/oracle | OracleMetrics | In-memory |
| @omega/search | SearchEngine index | In-memory |
| omega-ui | Zustand stores | In-memory |

### State Isolation

- Each function call is independent
- No global mutable state in core modules
- Caches are opt-in and can be disabled

---

## Determinism Guarantees

### Guaranteed Deterministic

| Operation | Guarantee | Mechanism |
|-----------|-----------|-----------|
| Validation | Same input → same result | Pure functions |
| Analysis | Same input → same genome | Seeded operations |
| Fingerprinting | Same genome → same hash | Canonical serialization |
| Comparison | Same pair → same score | Cosine similarity |

### Potentially Non-Deterministic

| Operation | Risk | Mitigation |
|-----------|------|------------|
| Timestamps | Time-dependent | Injected, not read |
| File I/O | System-dependent | Abstracted interfaces |
| Random | Non-deterministic | Seed-based only |

---

## Lifecycle

### Module Lifecycle

```
Import → Initialize → Ready → Use → (no explicit cleanup)
```

Most OMEGA modules have no lifecycle management:
- No startup/shutdown hooks
- No connection management
- No resource pools

### Application Lifecycle (omega-ui)

```
App Start
    │
    ▼
Initialize Tauri backend
    │
    ▼
Mount React app
    │
    ▼
Initialize Zustand stores
    │
    ▼
Ready for user interaction
    │
    ▼
[User interactions]
    │
    ▼
App Close (automatic cleanup)
```

---

## Critical Sections

### No Locking Required

OMEGA's single-threaded, stateless design means:
- No mutex/semaphore needed
- No race conditions possible
- No deadlock risk

### Future Considerations

If concurrency is added:
1. Genome analysis could be parallelized per segment
2. Search indexing could be parallelized
3. Would require careful state management

---

*END CONTROL_FLOW.md*
