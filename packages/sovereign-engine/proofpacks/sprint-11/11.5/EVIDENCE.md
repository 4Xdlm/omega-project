# EVIDENCE — Sprint 11.5: SDT + AUTH Correction Loop Integration

**Commit**: 11.5
**Date**: 2026-02-16
**Invariants**: ART-SDT-02, ART-AUTH-01
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## MODIFICATIONS

### Production Code

1. **src/prescriptions/types.ts**
   - Extended `Prescription.type` enum to include `'telling'` and `'ia_smell'`
   - Allows prescriptions from SDT and AUTH modules to integrate with existing correction loop

2. **src/prescriptions/generate-prescriptions.ts**
   - Imported `TellingResult` from `silence/show-dont-tell.ts`
   - Imported `AuthenticityResult` from `authenticity/authenticity-scorer.ts`
   - Added `generateTellingPrescriptions(tellingResult)` function
     - Converts TellingViolation[] to Prescription[] with type='telling'
     - Maps worst_violations to prescriptions with suggested_show actions
     - Expected gains: 15, 17, 19... (decreasing)
   - Added `generateAuthenticityPrescriptions(authResult)` function
     - Converts AuthenticityResult pattern_hits to Prescription[] with type='ia_smell'
     - Severity based on combined_score (<40=critical, <70=high, else=medium)
     - Action: "Break symmetry, add micro-ruptures, reduce perfect transitions, concretize"
     - Expected gains: 10, 12, 14 (decreasing)

### Test Code

1. **tests/prescriptions/sdt-auth-prescriptions.test.ts** (NEW)
   - Added 2 tests for correction loop integration
   - **LOOP-SDT-01**: Prose with telling → correction prescription generated
     - Verifies prescriptions have type='telling', diagnosis, action, severity, expected_gain
   - **LOOP-AUTH-01**: Prose with IA smell → prescription generated
     - Verifies prescriptions have type='ia_smell', diagnosis, action, severity
     - Handles case where no patterns detected (no prescriptions)

---

## TEST RESULTS

```
Test Files  60 passed (60)
Tests       340 passed (340)
Duration    2.29s
```

**Baseline**: 338 tests (commit 11.4)
**New**: +2 tests (SDT + AUTH prescription integration)
**Total**: 340 tests ✅

---

## INVARIANTS COVERED

- **ART-SDT-02**: Show-dont-tell violations generate prescriptions in correction loop
- **ART-AUTH-01**: Authenticity IA smell patterns generate prescriptions
- **LOOP-SDT-01**: Telling → correction prescription flow verified
- **LOOP-AUTH-01**: IA smell → prescription flow verified

---

## DETERMINISM

Prescription generation is deterministic:
- `generateTellingPrescriptions()`: Same TellingResult → same Prescription[]
- `generateAuthenticityPrescriptions()`: Same AuthenticityResult → same Prescription[]
- No randomness, all mapping is pure functional
- prescription_id includes pattern_id and index for uniqueness

---

## INTEGRATION NOTES

The correction loop can now:
1. Detect telling violations via `detectTelling()` → generate prescriptions
2. Detect IA smell via `scoreAuthenticity()` → generate prescriptions
3. Polish-V2 can filter prescriptions by type='telling' or type='ia_smell'
4. Prescriptions include actionable diagnosis + expected_gain for prioritization

Token budget respected: LLM calls in scoreAuthenticity use existing SemanticCache (Sprint 9)

---

## PROOF ARTIFACTS

- Test output: `test-11.5-final.txt`
- Hashes: `HASHES.sha256`
- All tests: **340/340 PASS** ✅

---

**Status**: COMMIT READY
**Next**: Commit 11.6 (Sprint 11 ProofPack + SEAL)
