# ROOT CAUSES PROVEN — T4 DETERMINISM FAILURE

**Date**: 2026-01-30
**Run ID**: RUN_B3B09F008BC17BDF
**Status**: EVIDENCE DOCUMENTED

---

## SUMMARY

| Root Cause | Status | Evidence |
|------------|--------|----------|
| RC-1: Execution order varies | **PROVEN** | Line-by-line comparison |
| RC-2: Benchmark values vary | **PROVEN** | Table comparison |
| RC-3: Duration suffix (Xms) not normalized | **PROVEN** | Same file different ms |

---

## RC-1: EXECUTION ORDER VARIES (PROVEN)

### Evidence: First test file reported differs between runs

**Run1 line ~13:**
```
 ✔ tests/orchestrator/policy-loader.test.ts (23 tests) 104ms
 ✔ tests/runner/run-directory.test.ts (41 tests) 122ms
```

**Run2 line ~13:**
```
 ✔ tests/delivery/profile-loader.test.ts (34 tests) 123ms
```

**Run3 line ~13 (from diff output):**
```
 ✔ test/ci-cd.test.ts (25 tests) 173ms
 ✔ test/gold-final.test.ts (50 tests) 177ms
```

### Conclusion
Vitest parallel execution causes test files to complete in **random order**.
Same tests, different sequence = different hash.

---

## RC-2: BENCHMARK VALUES VARY (PROVEN)

### Evidence: Floating-point timing values differ

**Run1 benchmark table:**
```
| tokenize(short)    |      0.0008 |      0.0015 |
| tokenize(medium)   |      0.0044 |      0.0056 |
| tokenize(long)     |      0.1132 |      0.1744 |
| parse(query1)      |      0.0010 |      0.0017 |
| parse(query2)      |      0.0020 |      0.0029 |
| search(fuzzy)      |      0.1507 |      0.3081 |
```

**Run2 benchmark table:**
```
| tokenize(short)    |      0.0008 |      0.0015 |
| tokenize(medium)   |      0.0055 |      0.0060 |
| tokenize(long)     |      0.1178 |      0.1803 |
| parse(query1)      |      0.0011 |      0.0016 |
| parse(query2)      |      0.0018 |      0.0025 |
| search(fuzzy)      |      0.1331 |      0.2497 |
```

### Conclusion
Benchmark tests measure real execution time = inherently non-deterministic values.

---

## RC-3: DURATION SUFFIX NOT NORMALIZED (PROVEN)

### Evidence: Same test file, different duration

**Run1:**
```
 ✔ test/gold-tooling.test.ts (54 tests) 413ms
 ✔ test/api-surface.test.ts (19 tests) 409ms
```

**Run2:**
```
 ✔ test/gold-tooling.test.ts (54 tests) 382ms
 ✔ test/api-surface.test.ts (19 tests) 342ms
```

### Conclusion
The normalizer replaced standalone `Xms` and `Xs` patterns but **not** when directly attached to `)`
Pattern `)(22m)` or similar was not captured.

---

## ARTIFACTS PROVING THIS ANALYSIS

| Artifact | Path | SHA-256 |
|----------|------|---------|
| Run1 normalized | `EVIDENCE/normalized/run1_npm_test.txt` | CC6660965BACF9DE... |
| Run2 normalized | `EVIDENCE/normalized/run2_npm_test.txt` | 9AC4213E018A75E1... |
| Run3 normalized | `EVIDENCE/normalized/run3_npm_test.txt` | 289EDAA24620899D... |
| Diff run1 vs run2 | Compare-Object output (391 differences) | — |
| Diff run2 vs run3 | Compare-Object output (366 differences) | — |

---

## STRATEGIC DECISION: OPTION C

Based on proven root causes:

1. **Vitest stdout is structurally non-deterministic** (order + timing)
2. **BUILD output is deterministic** (proven: 3 identical hashes after normalization)
3. **Application logic is not directly testable via stdout hash**

### Adopted Criterion for T4 DETERMINISM

**Primary**: Structured JSON/JUnit/TAP report (sortable, hashable)
**Secondary**: Build artifacts determinism (dist/ hash)

---

**Document Author**: Claude (IA Principal)
**Validated By**: Pending Francky review
