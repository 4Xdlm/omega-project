# EVIDENCE — Sprint 11.4: AAI Macro-Axis Integration

**Commit**: 11.4
**Date**: 2026-02-16
**Invariant**: ART-SCORE-01 (Macro-axis AAI calculé — 25%, plancher 85)
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## MODIFICATIONS

### Production Code

1. **src/config.ts**
   - Added `AAI_FLOOR: 85`
   - Redistributed MACRO_WEIGHTS: ecc 0.60→0.33, rci 0.15→0.17, added aai: 0.25
   - Total weights sum = 1.0 (verified)

2. **src/oracle/macro-axes.ts**
   - Imported `scoreShowDontTell` and `scoreAuthenticityAxis`
   - Updated `MacroAxesScores` interface to include `aai` field
   - Added `computeAAI()` function: weighted mean of show_dont_tell (60%) + authenticity (40%)
   - Added `buildAAIReasons()` helper function

3. **src/oracle/s-score.ts**
   - Updated `computeMacroSScore()` to include AAI in composite calculation
   - Updated `min_axis` to include AAI
   - Updated SEAL verdict condition to check AAI floor (≥85)

4. **src/oracle/aesthetic-oracle.ts**
   - Imported `computeAAI` from macro-axes
   - Updated `judgeAestheticV3()` to compute AAI macro-axis
   - Added `aai` to `macroAxes` object

### Test Code

1. **tests/config.test.ts**
   - Updated MACRO_WEIGHTS sum test to include `aai`
   - Updated ECC weight assertion: 0.60 → 0.33

2. **tests/oracle/macro-axes.test.ts**
   - Updated RCI weight assertion: 0.15 → 0.17

3. **tests/oracle/macro-axes-aai.test.ts** (NEW)
   - Added 3 tests for AAI macro-axis
   - MACRO-AAI-01: weighted mean calculation (60% SDT + 40% AUTH)
   - MACRO-AAI-02: floor 85 verification
   - MACRO-AAI-03: weight redistribution sum = 100%

4. **tests/oracle/macro-s-score.test.ts**
   - Updated all 10 test cases with new weights (ecc: 0.33, rci: 0.17)
   - Added `aai` field to all MacroAxesScores mocks
   - Adjusted test expectations for composite calculations
   - Fixed ZONE YELLOW test with recalculated scores

---

## TEST RESULTS

```
Test Files  59 passed (59)
Tests       338 passed (338)
Duration    2.33s
```

**Baseline**: 335 tests (commit 11.3)
**New**: +3 tests (AAI macro-axis)
**Total**: 338 tests ✅

---

## INVARIANTS COVERED

- **ART-SCORE-01**: Macro-axis AAI calculé (weighted mean SDT + AUTH, 25% global weight)
- **MACRO-AAI-01**: Weighted mean calculation verified
- **MACRO-AAI-02**: Floor 85 enforced
- **MACRO-AAI-03**: Weight redistribution totals 100%

---

## DETERMINISM

All AAI calculations are deterministic:
- `computeAAI()` uses deterministic sub-axes (show_dont_tell, authenticity)
- Weight blending: 60% SDT + 40% AUTH (fixed constants)
- No random operations, all math is pure arithmetic

---

## PROOF ARTIFACTS

- Test output: `test-11.4-final.txt`
- Hashes: `HASHES.sha256`
- All tests: **338/338 PASS** ✅

---

**Status**: COMMIT READY
**Next**: Commit 11.5 (Correction loop integration)
