# T7_PERF_BUDGET
**STATUS**: PASS
**RUN_ID**: B3B09F008BC17BDF

## SCOPE
Evaluate performance metrics against budgets: test execution time, build time, benchmark results.

## ARTEFACTS
| File | Description | Path |
|------|-------------|------|
| timings.txt | Execution timing data | EVIDENCE/timings.txt |
| npm_test.txt | Test output with benchmarks | EVIDENCE/run1/npm_test.txt |
| npm_build.txt | Build output | EVIDENCE/run1/npm_build.txt |

## FINDINGS

### F7.1 TEST EXECUTION TIMING
| Run | Test Duration | Build Duration |
|-----|---------------|----------------|
| Run 1 | 42,674ms | 1,109ms |
| Run 2 | 41,066ms | 1,094ms |
| Run 3 | 41,441ms | 1,095ms |

**Average Test Time**: 41,727ms (~42 seconds)
**Average Build Time**: 1,099ms (~1.1 seconds)
**Evidence**: EVIDENCE/timings.txt

### F7.2 TEST BREAKDOWN (from vitest)
| Phase | Duration |
|-------|----------|
| Transform | 14.84s |
| Setup | 0ms |
| Import | 26.37s |
| Tests | 90.86s |
| Environment | 18ms |

**Total Duration**: 42.07s
**Note**: "Tests" time (90.86s) is wall-clock with parallelization.
**Evidence**: EVIDENCE/run1/npm_test.txt (line 1512)

### F7.3 BENCHMARK BASELINE (Search Module)
| Operation | Mean (ms) | P95 (ms) | Budget | Status |
|-----------|-----------|----------|--------|--------|
| tokenize(short) | 0.0008 | 0.0015 | <1ms | PASS |
| tokenize(medium) | 0.0044 | 0.0056 | <1ms | PASS |
| tokenize(long) | 0.1132 | 0.1744 | <1ms | PASS |
| parse(query1) | 0.0010 | 0.0017 | <1ms | PASS |
| parse(query2) | 0.0020 | 0.0029 | <1ms | PASS |
| parse(query3) | 0.0014 | 0.0022 | <1ms | PASS |
| parse(query4) | 0.0030 | 0.0040 | <1ms | PASS |
| parse(query5) | 0.0030 | 0.0043 | <1ms | PASS |
| search(simple) | 0.0251 | 0.0409 | <10ms | PASS |
| search(multi-term) | 0.0191 | 0.0280 | <10ms | PASS |
| search(fuzzy) | 0.1507 | 0.3081 | <10ms | PASS |

**Evidence**: EVIDENCE/run1/npm_test.txt (lines 60-76)

### F7.4 LONG-RUNNING TESTS
| Test Suite | Duration | Concern |
|------------|----------|---------|
| streaming_invariants.test.ts | 41,732ms | Expected (tests 50k lines) |
| scale_invariants.test.ts | 23,654ms | Expected (scale tests) |
| progress_invariants.test.ts | 8,038ms | Expected (50 runs) |

These are intentionally slow stress/invariant tests.

### F7.5 BUILD OUTPUT SIZE
| Bundle | Size | Budget | Status |
|--------|------|--------|--------|
| dist/runner/main.js | 31.5kb | <100kb | PASS |
| dist/auditpack/index.js | 13.3kb | <50kb | PASS |

**Evidence**: EVIDENCE/run1/npm_build.txt

### F7.6 PERFORMANCE VARIANCE
Test timing variance across triple-run: ~1.6 seconds (4%)
- Acceptable for non-deterministic timing in test execution
- Does not indicate performance regression

---

**SECTION STATUS**: PASS (all metrics within budget)
