# SPEC B.1: Stability at Scale
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

## Inputs (runtime-provided, not hardcoded)

- Corpus/SSX: external source (offline)
- Seeds: deterministic (user-provided)
- All numeric params: from calibration file ONLY

## Outputs (future, during B-EXEC)

- `out/b1/B1_RUN_REPORT.md`
- `out/b1/B1_METRICS.json`
- `out/b1/B1_FAILURES/`
- `out/b1/B1_HASH_MANIFEST.txt`

## Invariants

### INV-B1-01: Determinism
Same inputs => same outputs => same hashes.

### INV-B1-02: No Silent Drift
Any drift detected => FAIL immediately.

### INV-B1-03: Phase A Untouched
Hash of Phase A scope must match PHASE_A_ROOT_MANIFEST.sha256.

### INV-B1-04: Calibration Required
All params from B123_calibration.json. If any = "REQUIRED" => FAIL.

### INV-B1-05: Offline Strict
No network calls. All data local.

## Tests (defined, not executed)

- B1-T01: Determinism Double Run
- B1-T02: Long Sequence Growth
- B1-T03: Multi-SSX Batch
- B1-T04: Slow Drift Injection
- B1-T05: SDI Stability Under Stress

## Exit Criteria

PASS if and only if:
- All tests PASS
- Zero silent drift
- Phase A hash unchanged
- Calibration fully resolved
