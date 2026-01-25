# SPEC B.3: Cross-Run Consistency
# Status: SPECIFIED (no execution)
# Phase: B-REARM (not B-EXEC)

## Scope Lock

- A.5 = CERTIFIED / UNTOUCHABLE
- A.6 = DORMANT / FROZEN (no activation)
- This is B-REARM, NOT B-EXEC

## Dependencies

- **PHASE_A_ROOT**: `docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256`
- **CALIBRATION**: `tools/calibration/B123_calibration.json`
- **B1_COMPLETE**: B1 must pass before B3
- **B2_COMPLETE**: B2 must pass before B3

If any missing or invalid => execution MUST FAIL.

## Inputs (runtime-provided)

- Multiple run seeds
- All numeric params: from calibration file ONLY

## Outputs (future, during B-EXEC)

- `out/b3/B3_CROSSRUN_REPORT.md`
- `out/b3/B3_DIVERGENCE_MATRIX.json`
- `out/b3/B3_HASH_MANIFEST.txt`

## Invariants

### INV-B3-01: Cross-Run Determinism
Same seed across runs => identical outputs.

### INV-B3-02: Divergence Detection
Any divergence must be flagged and explained.

### INV-B3-03: Phase A Untouched
Hash comparison vs PHASE_A_ROOT_MANIFEST.sha256.

### INV-B3-04: Calibration Required
All params from B123_calibration.json.

## Tests (defined, not executed)

- B3-T01: Identical Seed Multi-Run
- B3-T02: Sequential vs Parallel
- B3-T03: State Isolation Check

## Exit Criteria

PASS if and only if:
- All tests PASS
- Zero unexplained divergence
- Phase A hash unchanged
