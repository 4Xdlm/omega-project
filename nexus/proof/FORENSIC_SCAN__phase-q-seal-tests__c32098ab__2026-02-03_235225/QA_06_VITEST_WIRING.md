# QA_06_VITEST_WIRING.md

## Wiring Check: decision-engine isolation

### Evidence
- `npm test --workspace=@omega/decision-engine` runs ONLY decision-engine tests
- Test root: `C:/Users/elric/omega-project/packages/decision-engine`
- Config: `vitest.config.ts` with `--root .`
- Result: 23 files / 593 tests (no leakage from other packages)

### Baseline comparison
- Baseline (full): 202 files / 4941 tests
- Decision-engine isolated: 23 files / 593 tests
- Delta: 179 files / 4348 tests from other packages

### Verdict
Decision-engine is correctly wired as isolated workspace. No test leakage detected.
