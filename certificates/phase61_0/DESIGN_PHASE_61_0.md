# DESIGN — PHASE 61.0 — ORCHESTRATOR CORE

## Objective

Implement a deterministic execution engine for OMEGA pipeline orchestration.
The Orchestrator Core provides:
- Plan-based execution with step dependencies
- Injectable dependencies (clock, ID factory) for determinism
- Full traceability with SHA-256 hashes
- Adapter pattern for extensible step execution

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    @omega/orchestrator-core                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐    ┌───────────────┐    ┌─────────────┐ │
│  │  RunContext   │───▶│   Executor    │───▶│  RunResult  │ │
│  │  (seed,clock) │    │   (plan,ctx)  │    │  (hash)     │ │
│  └───────────────┘    └───────────────┘    └─────────────┘ │
│         │                    │                    │        │
│         │                    ▼                    │        │
│         │           ┌───────────────┐             │        │
│         │           │ AdapterRegistry│             │        │
│         │           │   (step.kind) │             │        │
│         │           └───────────────┘             │        │
│         │                                         │        │
│         ▼                                         ▼        │
│  ┌───────────────┐                      ┌─────────────────┐│
│  │DeterministicClock│                    │DeterminismGuard ││
│  │  (injectable) │                      │  (verify runs)  ││
│  └───────────────┘                      └─────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Public API

### Core Types
- `RunContext` - Execution context with injectable dependencies
- `OrchestratorPlan` - Plan definition with steps and hooks
- `OrchestratorExecutor` - Plan execution engine
- `DeterminismGuard` - Verification of deterministic execution
- `RunResult` - Execution result with hash

### Utilities
- `Clock` / `DeterministicClock` - Injectable time source
- `sha256()` - Hash computation
- `stableStringify()` - Deterministic JSON serialization

### Adapters
- `StepAdapter` - Interface for step executors
- `AdapterRegistry` - Registry for step adapters

## Invariants

| ID | Invariant |
|----|-----------|
| INV-ORCH-01 | Same (seed + plan + adapters) = same RunResult.hash |
| INV-ORCH-02 | Clock is NEVER accessed directly (always injected) |
| INV-ORCH-03 | ID generation is seeded and deterministic |
| INV-ORCH-04 | All errors are structured data (OrchestratorError) |
| INV-ORCH-05 | Steps execute in declared order |
| INV-ORCH-06 | Failed dependencies cause step skip |
| INV-ORCH-07 | RunResult.hash covers all non-timestamp fields |
| INV-ORCH-08 | All public APIs have TSDoc documentation |

## Determinism Strategy

1. **Clock Injection**: `DeterministicClock` replaces system time
2. **ID Factory**: `SeededIdFactory` generates reproducible IDs
3. **Stable JSON**: Object keys sorted for consistent serialization
4. **Hash Verification**: `DeterminismGuard` compares run results

```typescript
// Example deterministic execution
const clock = new DeterministicClock(0);
const ctx = createRunContext({ seed: 'my-seed', clock });
// Two runs with identical setup produce identical hashes
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Async timing variations | Non-deterministic output | Use DeterministicClock in tests |
| Object key ordering | Hash mismatch | stableStringify sorts keys |
| Adapter side effects | Unpredictable results | Adapters must be pure |
| Hook failures | Execution disruption | Hooks wrapped in try/catch |

## Test Coverage

### Unit Tests (112)
- clock.test.ts (15)
- hash.test.ts (15)
- stableJson.test.ts (21)
- RunContext.test.ts (18)
- Plan.test.ts (21)
- Executor.test.ts (11)
- DeterminismGuard.test.ts (11)

### Integration Tests (21)
- execute-plan.test.ts (6)
- determinism-double-run.test.ts (7)
- error-handling.test.ts (8)

**Total: 133 tests**

## File Structure

```
packages/orchestrator-core/
├── src/
│   ├── index.ts                 # Public exports
│   ├── core/
│   │   ├── types.ts             # Core type definitions
│   │   ├── errors.ts            # Error codes and types
│   │   ├── RunContext.ts        # Execution context
│   │   ├── Plan.ts              # Plan definition
│   │   ├── Executor.ts          # Plan executor
│   │   └── DeterminismGuard.ts  # Determinism verification
│   └── util/
│       ├── clock.ts             # Injectable clock
│       ├── hash.ts              # SHA-256 utilities
│       └── stableJson.ts        # Stable JSON serialization
└── test/
    ├── unit/                    # 112 unit tests
    └── integration/             # 21 integration tests
```
