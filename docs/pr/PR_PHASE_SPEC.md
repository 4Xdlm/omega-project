# OMEGA — PR SPRINT PHASE SPECIFICATION
**Version**: 1.0.0 | **Standard**: NASA-Grade L4 | **Status**: FROZEN

---

## OVERVIEW

The PR (Production Readiness) sprint comprises 5 phases (PR-1 through PR-5) that harden the OMEGA scribe-engine for L5 certification. Each phase addresses a specific invariant and includes strict exit criteria.

**Mission**: Achieve NASA-Grade L5 hardening with:
- Fail-closed concurrency (PR-1)
- Budget enforcement (PR-2)
- Chaos resilience (PR-3)
- Deterministic entropy control (PR-4)
- Exportable proof packaging (PR-5)

---

## PR-0 — PRE-FLIGHT CHECK

### Objective
Establish baseline state before any PR sprint modifications.

### Deliverables
- `metrics/pr/PR_PREFLIGHT.json` — Snapshot of:
  - Branch and HEAD commit
  - Vitest baseline (must be 232/232 PASS)
  - Inventory of critical files (cache writer, LLM caller, factory, CLI, repair)

### Exit Criteria
- ✅ PR-G0: Vitest baseline 232/232 PASS
- ✅ Inventory complete and accurate
- ✅ No uncommitted changes in working tree

---

## PR-1 — ATOMIC CACHE & CONCURRENCY LOCKING

### Invariant
**INV-CACHE-LOCK-01**: All cache writes must use exclusive file locking to prevent corruption during concurrent access.

### Objective
Replace naive `writeFileSync()` with atomic write operations using:
- Exclusive file locks with timeout and stale detection
- Temporary file → atomic rename pattern
- Crash residue cleanup

### Key Files
- `packages/scribe-engine/src/providers/atomic-cache.ts`
- `tests/pr/atomic-cache.test.ts`
- `budgets/calibration.json` (lock timeouts)

### Features
- `acquireLock()` / `releaseLock()` with configurable timeouts
- `atomicWriteFileSync()` — lock → tmp → rename → unlock
- `readCacheAtomic()` / `writeCacheAtomic()` — drop-in replacements
- Calibration-driven timeouts (GAP-1A)
- Concurrent writer tests (GAP-1B)
- Crash residue handling (GAP-1C)

### Exit Criteria
- ✅ PR-G1: Concurrency10 test passes (10 parallel writers, 0 corruption, 0 residual locks/tmps)
- ✅ All unit tests pass (atomic-cache.test.ts)
- ✅ `llm-provider.ts` updated to use `writeCacheAtomic()`

---

## PR-2 — BUDGET & LATENCY ENVELOPE

### Invariant
**INV-BUDGET-01**: Every run must stay within cost and latency budgets. Any over-budget call/run → FAIL (not warning).

### Objective
Track per-call and per-run costs/latency and enforce hard limits from `calibration.json`.

### Key Files
- `packages/scribe-engine/src/pr/budget-tracker.ts`
- `tests/pr/budget-tracker.test.ts`
- `budgets/calibration.json` (budget limits, latency limits)

### Features
- `BudgetTracker` class with `recordCall()`, `finalize()`, `isBudgetExhausted()`
- Per-model cost calculation (input/output tokens)
- Per-call and per-run violation detection
- Calibration null detection → explicit FAIL (GAP-2A)
- `loadCalibrationFromFile()` with validation (GAP-2B)
- `run-cost.json` schema (GAP-2C)

### Exit Criteria
- ✅ PR-G2: Any over-budget run → FAIL verdict
- ✅ Null calibration field → FAIL with `CALIBRATION_NULL` violation
- ✅ All unit tests pass (budget-tracker.test.ts)

---

## PR-3 — CHAOS PROVIDER HARNESS

### Invariants
- **INV-RETRY-BOUND-01**: Retry logic must have bounded attempts and exponential backoff.
- **INV-FAILCLOSED-01**: Chaos injection must propagate failures correctly (no silent success).

### Objective
Wrap LLM provider with:
- Retry logic for transient errors (rate limits, timeouts)
- Deterministic chaos injection for fault testing

### Key Files
- `packages/scribe-engine/src/pr/retry-provider.ts`
- `packages/scribe-engine/src/pr/chaos-provider.ts`
- `tests/pr/retry-provider.test.ts`
- `tests/pr/chaos-provider.test.ts`
- `scripts/pr/chaos-config.json`

### Features

**Retry Provider**:
- Error classification (transient vs permanent)
- Exponential backoff with jitter
- Calibration-driven backoff parameters (GAP-3D)

**Chaos Provider**:
- 6 failure modes: `rate_limit_429`, `timeout`, `invalid_json`, `api_error_500`, `network_error`, `empty_response` (GAP-3A)
- Deterministic PRNG (xorshift128)
- Chaos log output (`chaos-log.json`) (GAP-3B)
- CLI flag `--chaos <config> --chaos-profile <name>` (GAP-3C)

### Exit Criteria
- ✅ PR-G3: Chaos injection with CHAOS_RATE, fail-closed, zero silent successes
- ✅ `chaos-log.json` produced and valid
- ✅ CLI accepts `--chaos` flag
- ✅ All unit tests pass (retry, chaos)

---

## PR-4 — STRESS100 & VARIANCE ENVELOPE

### Invariant
**INV-ENTROPY-01**: Statistical variance across N runs must stay within predefined envelopes.

### Objective
Run scribe-engine N times (default 100) and verify:
- Hard pass rate ≥ PASS_RATIO_MIN
- Mean scores and std dev within variance envelopes
- Deterministic stability

### Key Files
- `packages/scribe-engine/src/pr/variance-envelope.ts`
- `tests/pr/variance-envelope.test.ts`
- `scripts/pr/stress100.ts`
- `budgets/calibration.json` (VARIANCE_ENVELOPES, STRESS_N)

### Features
- `computeStats()`, `computePassRate()`, `analyzeVariance()`
- Load envelopes from calibration (GAP-4A)
- `DOWNGRADE_VARIANCE` flag when variance out but hard_pass_rate OK (GAP-4B)
- `STRESS_N` from calibration if `--count` not specified (GAP-4C)
- Append-only output (`metrics/pr/PR_RUNS/stress100_<timestamp>/`) (GAP-4D)

### Exit Criteria
- ✅ PR-G4: hard_pass_rate ≥ PASS_RATIO_MIN
- ✅ Variance within envelopes or downgrade flagged
- ✅ 0 cache corruption across runs
- ✅ `PR_REPORT.json` produced

---

## PR-5 — PROOFPACK EXPORTABLE

### Invariant
**INV-PROOFPACK-EXPORT-01**: Every E2E/stress run must produce a portable, deterministic proof package.

### Objective
Generate ZIP archives containing:
- Run artifacts (logs, metrics, verdicts)
- SHA256 checksums
- Toolchain versions
- Replay scripts

### Key Files
- `packages/scribe-engine/src/pr/proofpack.ts`
- `tests/pr/proofpack.test.ts`
- `scripts/pr/proofpack-cli.ts`

### Features
- `buildProofPack()` — collect files, generate manifest
- SHA256SUMS.txt (standard `sha256sum` format) (GAP-5A)
- `toolchain.json` (node, npm, os, typescript versions) (GAP-5B)
- Stable ZIP ordering (alphabetical sort) (GAP-5C)
- Absolute path detection → FAIL (GAP-5D)
- Bash and PowerShell replay scripts

### Exit Criteria
- ✅ PR-G5: Proofpack contains SHA256SUMS.txt, toolchain.json, MANIFEST.json
- ✅ No absolute paths in any file
- ✅ Replay scripts functional
- ✅ Deterministic (same input → same ZIP hash)

---

## DEPENDENCY GRAPH

```
PR-0 (preflight)
  ↓
PR-1 (atomic cache) ←─┐
  ↓                    │
PR-2 (budget)          │
  ↓                    │
PR-3 (chaos/retry) ────┘ (uses atomic cache for chaos-log)
  ↓
PR-4 (stress100) ───────→ uses PR-1, PR-2, PR-3
  ↓
PR-5 (proofpack) ───────→ packages PR-4 outputs
```

---

## INVARIANTS SUMMARY

| ID | Name | Phase | Description |
|----|------|-------|-------------|
| INV-CACHE-LOCK-01 | Atomic Cache Locking | PR-1 | All cache writes use exclusive locks |
| INV-BUDGET-01 | Budget Enforcement | PR-2 | Over-budget → FAIL (not warning) |
| INV-RETRY-BOUND-01 | Bounded Retry | PR-3 | Retry with max attempts + backoff |
| INV-FAILCLOSED-01 | Fail-Closed Chaos | PR-3 | Chaos failures propagate correctly |
| INV-ENTROPY-01 | Variance Envelope | PR-4 | Statistical stability across N runs |
| INV-PROOFPACK-EXPORT-01 | Exportable Proofpack | PR-5 | Portable, deterministic archives |

---

## EXIT GATES

| Gate | Criteria | Failure Impact |
|------|----------|----------------|
| PR-G0 | Baseline 232/232 vitest PASS | STOP — fix baseline first |
| PR-G1 | Concurrency10 → 0 corruption, 0 residuals | FAIL PR-1 |
| PR-G2 | Over-budget → FAIL, null → CALIBRATION_NULL | FAIL PR-2 |
| PR-G3 | Chaos injection, fail-closed, log produced | FAIL PR-3 |
| PR-G4 | hard_pass_rate ≥ PASS_RATIO_MIN, variance OK | FAIL PR-4 |
| PR-G5 | Proofpack complete, no absolute paths | FAIL PR-5 |

---

**End of Specification**
