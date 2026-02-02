# LR5 — NONDETERMINISM HUNT

## SUMMARY

| Category | Occurrences | Mitigation Status |
|----------|-------------|-------------------|
| Date.now() | 68 | PARTIAL |
| new Date() | 42 | PARTIAL |
| Math.random() | 18 | REVIEW NEEDED |
| performance.now() | 48 | ACCEPTABLE (timing) |
| crypto.randomUUID | 0 | N/A |

---

## CRITICAL FINDINGS

### 1. Date.now() Usage (68 occurrences)

#### Production Code (REQUIRES REVIEW)

| File | Line | Context | Impact | Mitigation |
|------|------|---------|--------|------------|
| `emotion_engine.ts` | 117,166,174,208,266,293,309,387,434,452 | `last_update: Date.now()` | Metadata timestamping | ACCEPTABLE - metadata only |
| `quarantine.ts` | 50,54,55,68,72,73,195,223 | Quarantine timestamps | Metadata only | ACCEPTABLE |
| `lock_manager.ts` | 51,81 | Lock expiration | TTL logic | ACCEPTABLE - operational |
| `apps/omega-ui/src/hooks/useOracle.ts` | 174,336,366,367,405,452,453 | Analysis timestamps | UI metadata | ACCEPTABLE |
| `apps/omega-ui/src/stores/uiStore.ts` | 86,132 | Notification IDs | UI only | ACCEPTABLE |

#### Test Code (ACCEPTABLE)

Most Date.now() in test code for test fixtures - acceptable.

### 2. Math.random() Usage (18 occurrences)

#### REQUIRES ATTENTION

| File | Line | Context | Impact | Recommendation |
|------|------|---------|--------|----------------|
| `quarantine.ts` | 50,68 | ID generation | Non-deterministic IDs | **τ_ID_GENERATOR** - use seeded PRNG |
| `apps/omega-ui/src/core/analyzer.ts` | 20 | Analysis ID | Non-deterministic | **τ_ID_GENERATOR** |
| `apps/omega-ui/src/stores/uiStore.ts` | 86 | Notification ID | UI only | LOW PRIORITY |
| `apps/omega-ui/src/hooks/useOracle.ts` | 174 | Analysis ID | Non-deterministic | **τ_ID_GENERATOR** |
| `apps/omega-ui/src/components/notifications/useToast.ts` | 14 | Toast ID | UI only | LOW PRIORITY |
| `gateway/wiring/tests/orchestrator.test.ts` | 49 | Test replay key | Test only | ACCEPTABLE |
| `nexus/tooling/tests/certification/certification.test.ts` | 44,49 | Test duration | Test only | ACCEPTABLE |

### 3. performance.now() Usage (48 occurrences)

All usage is for **timing/profiling purposes** only - does not affect output determinism.

| Location | Purpose | Status |
|----------|---------|--------|
| `packages/truth-gate/src/validators/base-validator.ts` | Validation timing | ACCEPTABLE |
| `packages/truth-gate/src/gate/truth-gate.ts` | Gate timing | ACCEPTABLE |
| `nexus/shared/performance/index.ts` | Performance abstraction | ACCEPTABLE |
| `tests/stress/stress.test.ts` | Test timing | ACCEPTABLE |
| Legacy `omega-v44/` | Legacy timing | OUT OF SCOPE |

---

## SEED POLICY

### Current Implementation

| Module | Seed Support | Default Seed |
|--------|--------------|--------------|
| packages/genome | YES | 42 |
| Analysis pipeline | YES | 42 |
| CLI | YES (--seed) | 42 |

### Evidence

```typescript
// packages/genome/src/core/version.ts:16
export const DEFAULT_SEED = 42 as const;
```

---

## CLOCK POLICY

### Abstraction Layer

```typescript
// nexus/shared/performance/index.ts
/**
 * CRITICAL: Never use performance.now() or Date.now() directly in production
 * Use the abstraction layer for testability and determinism
 */
```

### Clock Injection Points

| Module | Clock Injection | Status |
|--------|-----------------|--------|
| packages/orchestrator-core | `util/clock.ts` | IMPLEMENTED |
| gateway/wiring | `clock.test.ts` | TESTED |
| nexus/shared | `performance/index.ts` | ABSTRACTED |

---

## RECOMMENDATIONS

### HIGH PRIORITY (τ_ID_GENERATOR)

1. Replace Math.random() ID generation with seeded PRNG:
   - `quarantine.ts:50,68`
   - `apps/omega-ui/src/core/analyzer.ts:20`
   - `apps/omega-ui/src/hooks/useOracle.ts:174`

### MEDIUM PRIORITY

2. Consolidate Date.now() usage through clock abstraction for:
   - `emotion_engine.ts` (10 occurrences)
   - `lock_manager.ts` (2 occurrences)

### LOW PRIORITY (UI Only)

3. Notification/Toast IDs in UI components - cosmetic only.

---

## VERDICT

| Category | Status |
|----------|--------|
| Core Pipeline Determinism | **PASS** (seed=42) |
| ID Generation | **REVIEW** (3 production files) |
| Timing Code | **PASS** (no output impact) |
| Test Code | **PASS** (acceptable) |

**OVERALL: CONDITIONAL PASS**

Core analysis pipeline is deterministic with seed=42.
ID generation in 3 files should use seeded PRNG for full determinism.
