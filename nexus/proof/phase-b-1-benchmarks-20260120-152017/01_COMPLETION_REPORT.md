# Phase B.1 Completion Report — Benchmark Suite

**Date**: 2026-01-20
**Standard**: NASA-Grade L4
**Tag**: v5.4.1-benchmarks
**Commit**: 9d67d2f

---

## Summary

Phase B.1 establishes the benchmark infrastructure with injectable PerfNowFn for deterministic testing, complying with VERROU 2 (benchmarks never in CI) and VERROU 3 (injectable observability).

---

## Deliverables

### 1. Performance Abstractions

**File**: `nexus/shared/performance/index.ts` (155 lines)

| Export | Description |
|--------|-------------|
| `ClockFn` | Type for Date.now() abstraction |
| `createClock()` | Create injectable clock |
| `setClock()` / `getClock()` | Global clock management |
| `PerfNowFn` | Type for performance.now() abstraction |
| `createPerfNow()` | Create injectable high-res timer |
| `setPerfNow()` / `getPerfNow()` | Global perfNow management |
| `Stopwatch` | Utility for duration measurement |

### 2. Benchmark Utilities

**File**: `nexus/bench/utils.ts` (241 lines)

| Function | Description |
|----------|-------------|
| `benchmark()` | Run function N times, collect stats |
| `formatResults()` | Console-friendly output |
| `saveResults()` | JSON persistence |
| `loadResults()` | Load previous results |
| `compareSuites()` | Compare baseline vs current |
| `formatComparison()` | Show delta indicators |

### 3. Benchmark Suites

| File | Benchmarks |
|------|------------|
| `nexus/bench/atlas.bench.ts` | 5 benchmarks (insert, query, index, get) |
| `nexus/bench/raw.bench.ts` | 6 benchmarks (store, retrieve, compress) |
| `nexus/bench/proof.bench.ts` | 4 benchmarks (build, verify manifest) |

### 4. Benchmark Runner

**File**: `nexus/bench/run-all.ts` (94 lines)

- Runs all benchmark suites
- Saves results to JSON
- Compares with baseline if exists
- Displays summary

### 5. Scripts

| Script | Purpose |
|--------|---------|
| `scripts/benchmark.sh` | Run benchmarks |
| `scripts/save-baseline.sh` | Create versioned baseline |

### 6. Package.json Scripts

```json
{
  "bench": "npx tsx nexus/bench/run-all.ts bench-results/latest.json",
  "bench:baseline": "npx tsx nexus/bench/run-all.ts bench-results/baseline.json"
}
```

---

## Baseline Results

**File**: `bench-results/baseline.json`

| Benchmark | Mean (ms) | P95 (ms) |
|-----------|-----------|----------|
| atlas_insert_1000_items | 0.24 | 0.43 |
| atlas_query_10k_full_scan | 0.14 | 0.22 |
| atlas_query_10k_with_filter | 0.34 | 0.42 |
| atlas_query_10k_with_index | 0.47 | 0.53 |
| atlas_get_by_id_10k | 0.00 | 0.00 |
| raw_store_1000_small_items | 1.85 | 3.44 |
| raw_retrieve_1000_items | 1.23 | 2.88 |
| raw_store_1mb_file | 0.46 | 0.48 |
| raw_store_10mb_file | 4.53 | 5.35 |
| raw_list_1000_items | 0.02 | 0.02 |
| raw_store_1mb_compressed | 2.30 | 4.54 |
| proof_build_manifest_100_files | 2.12 | 3.33 |
| proof_verify_manifest_100_files | 3.18 | 5.06 |
| proof_build_manifest_10_large_files | 4.73 | 4.97 |
| proof_verify_manifest_10_large_files | 5.15 | 6.66 |

---

## Test Results

```
Test Files  86 passed (86)
Tests       2027 passed (2027)
```

New tests added: 18
- `tests/performance/abstractions.test.ts`: 12 tests
- `tests/bench/utils.test.ts`: 6 tests

---

## VERROU Compliance

### VERROU 2: Benchmarks Séparés

- Benchmarks run via `npm run bench` (separate command)
- NO timing assertions in tests
- NOT included in CI pipeline

### VERROU 3: Observabilité Injectable

- `ClockFn` replaces `Date.now()` calls
- `PerfNowFn` replaces `performance.now()` calls
- All timing functions are injectable for testing

---

## Usage

```bash
# Run benchmarks
npm run bench

# Create/update baseline
npm run bench:baseline

# Compare with baseline
npm run bench
# (automatically compares if baseline.json exists)
```

---

## FROZEN Module Compliance

| Module | Status | Bytes Modified |
|--------|--------|----------------|
| packages/sentinel | NOT TOUCHED | 0 |
| packages/genome | NOT TOUCHED | 0 |
| gateway/sentinel | NOT TOUCHED | 0 |

---

## Files Created

| File | Lines |
|------|-------|
| nexus/shared/performance/index.ts | 155 |
| nexus/bench/utils.ts | 241 |
| nexus/bench/atlas.bench.ts | 140 |
| nexus/bench/raw.bench.ts | 148 |
| nexus/bench/proof.bench.ts | 134 |
| nexus/bench/run-all.ts | 94 |
| scripts/benchmark.sh | 19 |
| scripts/save-baseline.sh | 24 |
| tests/performance/abstractions.test.ts | 162 |
| tests/bench/utils.test.ts | 242 |
| bench-results/baseline.json | 217 |

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Claude Opus 4.5 | Phase B.1 completion |
