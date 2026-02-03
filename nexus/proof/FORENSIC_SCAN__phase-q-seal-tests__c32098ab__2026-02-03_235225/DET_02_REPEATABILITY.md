# DET_02_REPEATABILITY.md

## Repeatability Test: 2 Consecutive Runs

### Decision-Engine
| Metric | Run 1 | Run 2 | Match |
|--------|-------|-------|-------|
| Test Files | 23 passed | 23 passed | IDENTICAL |
| Tests | 593 passed | 593 passed | IDENTICAL |
| Duration | 657ms | 657ms | ~identical |
| Failures | 0 | 0 | IDENTICAL |

**Verdict**: DETERMINISTIC

### Baseline (Full Suite)
| Metric | Run 1 | Run 2 | Match |
|--------|-------|-------|-------|
| Test Files | 202 passed | 201 passed, 1 failed | DIFFERS |
| Tests | 4941 passed | 4939 passed, 2 failed | DIFFERS |
| Duration | 42.14s | 42.91s | ~similar |

### Run 2 Failures Analysis
**Failed test file**: `tests/oracles/oracle_dist_manifest.test.ts` (2 tests)

1. `should produce deterministic output (double run)`
   - Hash run1: 19CE02017768E3AE7DE683EA9C161D2B6E50273376000F5FBF0814D957B99382
   - Hash run2: 72C8451C5FF587E5FABF056303526537393B3204E84371AF4ED8D1F9F6C2C5D7
   - **Cause**: `npm run build` was executed between run 1 and run 2, modifying `dist/` files. The oracle manifest hashes `dist/` contents, which changed.

2. `should match baseline if baseline exists`
   - Same root cause: baseline was computed with old dist/ files.

### Root Cause
The `oracle_dist_manifest` test hashes files in `dist/`. Between run 1 and run 2, `npm run build` regenerated `dist/` with new content. This is NOT a determinism failure in the test suite itself â€” it's an environmental side-effect.

### Verdict
- **Decision-engine**: DETERMINISTIC (23/593 = 23/593)
- **Baseline**: CONDITIONALLY DETERMINISTIC (the 2 failures are caused by `dist/` file mutation from build, not by non-determinism in test logic)
