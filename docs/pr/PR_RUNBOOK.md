# OMEGA — PR SPRINT RUNBOOK
**Version**: 1.0.0 | **Audience**: Operators & QA | **Standard**: NASA-Grade L4

---

## PREREQUISITES

### Environment
- **Node.js**: v18+ (check: `node --version`)
- **npm**: v8+ (check: `npm --version`)
- **TypeScript**: v5+ (check: `npx tsc --version`)
- **OS**: Windows 10/11 (PowerShell 5.1+) or Linux/macOS (bash 4+)

### Repository State
- Branch: `sprint/pr-l5-hardening`
- Working tree clean (`git status`)
- Baseline tests: 232/232 PASS

### Files Required
- `budgets/calibration.json` — complete, zero nulls
- `packages/scribe-engine/src/pr/` — all PR modules
- `scripts/pr/` — harness scripts

---

## PHASE EXECUTION

### 0. PRE-FLIGHT CHECK

**Purpose**: Verify baseline before starting.

```powershell
# Check branch
git branch --show-current
# Expected: sprint/pr-l5-hardening

# Check HEAD
git log -1 --oneline

# Run baseline tests
cd packages/scribe-engine
npx vitest run

# Expected: Test Files: 26 passed, Tests: 232 passed
```

**Output**: `metrics/pr/PR_PREFLIGHT.json`

**Gate PR-G0**: Vitest must be 232/232 PASS. If fail → STOP, fix baseline.

---

### 1. UNIT TESTS (ALL PR MODULES)

**Purpose**: Verify all PR modules work independently.

```powershell
cd packages/scribe-engine

# Build TypeScript
npx tsc

# Run all tests (including PR tests)
npx vitest run

# Expected: ~292 tests (232 baseline + ~60 PR tests)
```

**Expected Output**:
- `tests/pr/atomic-cache.test.ts` — ~12 tests PASS
- `tests/pr/budget-tracker.test.ts` — ~15 tests PASS
- `tests/pr/retry-provider.test.ts` — ~10 tests PASS
- `tests/pr/chaos-provider.test.ts` — ~12 tests PASS
- `tests/pr/variance-envelope.test.ts` — ~15 tests PASS
- `tests/pr/proofpack.test.ts` — ~13 tests PASS

**Gate**: All unit tests PASS. If fail → investigate, fix, retry.

---

### 2. CONCURRENCY TEST (PR-1)

**Purpose**: Verify atomic cache with 10 parallel writers.

```powershell
cd scripts/pr

# Run concurrency test
powershell -ExecutionPolicy Bypass -File .\concurrency10.ps1

# Expected output:
# Successes: 10 / 10
# Residual .lock files: 0
# Residual .tmp files: 0
# Final cache file: VALID JSON
# VERDICT: PASS
```

**Output**: `metrics/pr/PR_RUNS/concurrency10_<timestamp>/concurrency10-report.json`

**Gate PR-G1**: VERDICT must be PASS. Check:
- All 10 workers succeed
- 0 residual `.lock` or `.tmp` files
- Final cache is valid JSON

**Troubleshooting**:
- If FAIL → check `concurrency10-report.json` for details
- Look for lock timeout errors
- Verify `atomic-cache.ts` uses correct calibration timeouts

---

### 3. BUDGET VALIDATION (PR-2)

**Purpose**: Verify budget enforcement.

Unit tests cover this extensively. For integration:

```powershell
# Create a test run with mock LLM provider
# (Actual integration depends on scribe-engine CLI setup)

# Budget should produce run-cost.json with:
# - total_cost_usd
# - budget_verdict (PASS/FAIL)
# - violations array
```

**Manual Check**:
```powershell
# Edit calibration.json to set very low budget
# Run a test scene
# Verify it FAILS with budget violation (not warning)
```

**Gate PR-G2**: Over-budget → FAIL verdict (not warning).

---

### 4. CHAOS ENGINEERING (PR-3)

**Purpose**: Test resilience under fault injection.

```powershell
cd packages/scribe-engine/src/cli

# Example chaos run (requires scribe-llm.ts to support --chaos flag)
node scribe-llm.js \
  --chaos ../../../scripts/pr/chaos-config.json \
  --chaos-profile medium \
  --input test-scene.json \
  --output chaos-test-output/

# Expected:
# - Some calls fail with chaos-injected errors
# - chaos-log.json produced
# - No silent failures (empty_response caught)
```

**Output**: `chaos-log.json` with entries like:
```json
{
  "entries": [
    { "call_index": 0, "scene_id": "SCN-01", "injected": true, "failure_type": "timeout", "timestamp": "..." },
    { "call_index": 1, "scene_id": "SCN-02", "injected": false, "timestamp": "..." }
  ]
}
```

**Gate PR-G3**:
- Chaos injections occur at CHAOS_RATE
- Failures propagate (no silent success)
- `chaos-log.json` is valid JSON

**Profiles**:
- `light`: 5% chaos, basic failures
- `medium`: 15% chaos, common failures
- `heavy`: 30% chaos, all failure types
- `hellfire`: 50% chaos, maximum stress

---

### 5. STRESS100 TEST (PR-4)

**Purpose**: Run N iterations and check variance.

```powershell
cd scripts/pr

# Run stress test (default N from calibration.json)
node stress100.ts

# Or specify count:
node stress100.ts --count=50

# Expected output:
# Run 1/100...
# Run 2/100...
# ...
# === ANALYSIS ===
# Hard Pass Rate: 85.0%
# Soft Pass Rate: 95.0%
# Mean Hard Score: 0.800 ± 0.050
# VERDICT: PASS
```

**Output**: `metrics/pr/PR_RUNS/stress100_<timestamp>/PR_REPORT.json`

**Gate PR-G4**:
- `hard_pass_rate` ≥ `PASS_RATIO_MIN` (default 0.75)
- Variance within envelopes (or downgrade flagged)
- 0 cache corruption

**Troubleshooting**:
- If variance out of bounds → check `variance_violations` in report
- If `DOWNGRADE_VARIANCE` flagged → acceptable if hard_pass_rate OK
- High std dev → investigate determinism

---

### 6. PROOFPACK GENERATION (PR-5)

**Purpose**: Create exportable archive.

```powershell
cd scripts/pr

# Build proofpack for stress100 run
node proofpack-cli.ts \
  --source ../../metrics/pr/PR_RUNS/stress100_20260212_143000 \
  --output ../../proofpacks/stress100_20260212_143000 \
  --type stress100 \
  --verdict PASS

# Expected output:
# ✓ Proofpack built: stress100-1707743400000
# ✓ Files: 15
# ✓ SHA256SUMS.txt: proofpacks/.../SHA256SUMS.txt
# ✓ Toolchain: proofpacks/.../toolchain.json
# ✓ Bash replay: proofpacks/.../replay.sh
# ✓ PowerShell verify: proofpacks/.../verify.ps1
```

**Output**: `proofpacks/<run>/`
- `MANIFEST.json`
- `SHA256SUMS.txt`
- `toolchain.json`
- `replay.sh` (bash)
- `verify.ps1` (PowerShell)
- All source files

**Verification**:
```powershell
cd proofpacks/<run>

# PowerShell verification
powershell -ExecutionPolicy Bypass -File .\verify.ps1

# Expected:
# ✓ file1.json
# ✓ file2.json
# ...
# ✓ All files verified successfully
```

**Gate PR-G5**:
- SHA256SUMS.txt present and valid
- toolchain.json contains node/npm/ts versions
- No absolute paths in any file
- Replay scripts execute without error

---

## FINAL INTEGRATION TEST

**Purpose**: Full end-to-end validation.

```powershell
# 1. Pre-flight
cd packages/scribe-engine && npx vitest run

# 2. Unit tests (all PR modules)
npx vitest run tests/pr/*.test.ts

# 3. Concurrency
cd ../../scripts/pr && powershell .\concurrency10.ps1

# 4. Stress (with chaos optional)
node stress100.ts --count=100

# 5. Proofpack
node proofpack-cli.ts \
  --source ../../metrics/pr/PR_RUNS/stress100_latest \
  --output ../../proofpacks/final \
  --type stress100 \
  --verdict PASS

# 6. Verify proofpack
cd ../../proofpacks/final && powershell .\verify.ps1
```

**Success Criteria**:
- ✅ All gates PASS
- ✅ All tests PASS (~292 total)
- ✅ Concurrency10 → PASS
- ✅ Stress100 → PASS
- ✅ Proofpack verifies successfully

---

## METRICS & REPORTS

### Directory Structure
```
metrics/pr/
├── PR_PREFLIGHT.json           # PR-0 baseline
├── PR_RUNS/
│   ├── concurrency10_<ts>/     # PR-1 runs
│   │   └── concurrency10-report.json
│   ├── stress100_<ts>/         # PR-4 runs
│   │   └── PR_REPORT.json
│   └── chaos_<ts>/             # PR-3 runs
│       └── chaos-log.json
└── schemas/                     # Schema examples
    ├── run-cost.schema.example.json
    └── pr-report.schema.example.json
```

### Key Files

**PR_PREFLIGHT.json**:
```json
{
  "schema_version": "PR-PREFLIGHT-1.0",
  "branch": "sprint/pr-l5-hardening",
  "head": "<sha>",
  "vitest_pass": true,
  "vitest_total": 232,
  "vitest_failed": 0,
  "verdict": "PASS"
}
```

**concurrency10-report.json**:
```json
{
  "workers": 10,
  "successes": 10,
  "failures": 0,
  "residual_locks": 0,
  "residual_tmps": 0,
  "cache_valid": true,
  "verdict": "PASS"
}
```

**PR_REPORT.json** (stress100):
```json
{
  "total_runs": 100,
  "hard_pass_rate": 0.85,
  "variance_verdict": "PASS",
  "variance_violations": [],
  "downgrade_flag": null
}
```

---

## TROUBLESHOOTING

### Common Issues

**Issue**: Unit tests fail with module not found
- **Fix**: Run `npx tsc` to build TypeScript
- **Check**: `packages/scribe-engine/dist/pr/` exists

**Issue**: Concurrency test FAIL with residual locks
- **Fix**: Check `LOCK_TIMEOUT_MS` in calibration.json
- **Check**: No stale processes holding locks

**Issue**: Budget always PASS even when over-budget
- **Fix**: Verify `finalize()` returns FAIL verdict
- **Check**: `max_per_call_usd` and `max_per_run_usd` are realistic

**Issue**: Chaos not injecting failures
- **Fix**: Check `CHAOS_RATE` > 0 in config
- **Check**: Seed is deterministic (default 42)

**Issue**: Stress100 variance out of bounds
- **Fix**: Increase `max` thresholds in VARIANCE_ENVELOPES
- **Check**: Determinism (same seed → same results)

**Issue**: Proofpack fails with absolute path violations
- **Fix**: Scan source files for `C:\` or `/home/`
- **Fix**: Use relative paths in logs/reports

---

## ESCALATION

If any gate fails repeatedly:
1. Document failure in NCR (Non-Conformance Report)
2. Include: gate ID, error message, reproduction steps
3. Escalate to Architect (Francky)

**NCR Template**: `nexus/proof/NCR_PR_<ID>.md`

---

**End of Runbook**
