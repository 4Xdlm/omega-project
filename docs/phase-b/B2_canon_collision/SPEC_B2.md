# SPEC B.2: Canon Collision Detection
# Status: SPECIFIED (no execution)
# Phase: B-REARM (not B-EXEC)

## Scope Lock

- A.5 = CERTIFIED / UNTOUCHABLE
- A.6 = DORMANT / FROZEN (no activation)
- This is B-REARM, NOT B-EXEC

## Dependencies

- **PHASE_A_ROOT**: `docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256`
- **CALIBRATION**: `tools/calibration/B123_calibration.json`

If either missing or invalid => execution MUST FAIL.

## Inputs (runtime-provided)

- Sample corpus for collision testing
- All numeric params: from calibration file ONLY

## Outputs (future, during B-EXEC)

- `out/b2/B2_COLLISION_REPORT.md`
- `out/b2/B2_COLLISION_CASES.json`
- `out/b2/B2_HASH_MANIFEST.txt`

## Invariants

### INV-B2-01: Determinism
Same inputs => same collision report.

### INV-B2-02: No False Positives
Each reported collision must be reproducible.

### INV-B2-03: Phase A Untouched
Hash comparison vs PHASE_A_ROOT_MANIFEST.sha256.

### INV-B2-04: Calibration Required
All params from B123_calibration.json.

## Tests (defined, not executed)

- B2-T01: Known Collision Pairs
- B2-T02: Random Sample Scan
- B2-T03: Edge Case Inputs

## Exit Criteria

PASS if and only if:
- All tests PASS
- All collisions documented
- Phase A hash unchanged
