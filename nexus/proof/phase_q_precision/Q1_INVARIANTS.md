# Q1_INVARIANTS — Correctness Invariants (Black-Box)

## RUN_ID
```
19C10E1FE7800000
```

## INVARIANTS TESTED

### INV-Q1-01: Idempotence (same input → same output artifacts)

**Test Method**: TRIPLE RUN with identical input, compare stdout hash.

| Run | stdout SHA256 | Match |
|-----|---------------|-------|
| 1 | a765887d7f8c45328eea8ca48129f7de7901fc8ff274aed4ece7a6f3c786bc40 | — |
| 2 | a765887d7f8c45328eea8ca48129f7de7901fc8ff274aed4ece7a6f3c786bc40 | ✅ |
| 3 | a765887d7f8c45328eea8ca48129f7de7901fc8ff274aed4ece7a6f3c786bc40 | ✅ |

**Evidence**:
- `EVIDENCE/hashes/run1_stdout_sha256.txt`
- `EVIDENCE/hashes/run2_stdout_sha256.txt`
- `EVIDENCE/hashes/run3_stdout_sha256.txt`
- `EVIDENCE/diffs/stdout_1v2.txt` (FC: aucune différence trouvée)
- `EVIDENCE/diffs/stdout_2v3.txt` (FC: aucune différence trouvée)
- `EVIDENCE/diffs/stdout_1v3.txt` (FC: aucune différence trouvée)

**Verdict**: ✅ PASS

---

### INV-Q1-02: Round-Trip (verify on produced artifacts returns PASS)

**Test Method**: Run verify command on produced run directory.

**Command**:
```
node dist/runner/main.js verify --run artefacts/runs/run_intent_mvp_1
```

**Result**:
```
✅ Verification PASSED
   Files checked: 12
   Files valid:   12
```

**Evidence**: `EVIDENCE/executions/verify_output.txt`

**Verdict**: ✅ PASS

---

### INV-Q1-03: No NaN/undefined in machine outputs

**Test Method**: Inspect JSON outputs for schema validity.

**Files Inspected**:

1. **contract.json**
```json
{
  "intentId": "intent_mvp",
  "generatedText": "Ecris un paragraphe neutre de 5 lignes sur la Résidence Riviera, sans inventer de faits.",
  "timestamp": "2026-01-28T00:00:00.000Z"
}
```
- No NaN: ✅
- No undefined: ✅
- Valid JSON: ✅

2. **truthgate_verdict.json**
```json
{
  "passed": true,
  "validatedText": "...",
  "violations": []
}
```
- No NaN: ✅
- No undefined: ✅
- Valid JSON: ✅

3. **delivery_manifest.json** — Valid JSON structure

**Evidence**: `EVIDENCE/golden/latest_run/*.json`

**Verdict**: ✅ PASS

---

### INV-Q1-04: Exit code consistency

**Test Method**: Compare exit codes across TRIPLE RUN.

| Run | Exit Code |
|-----|-----------|
| 1 | 0 |
| 2 | 0 |
| 3 | 0 |

**Evidence**:
- `EVIDENCE/executions/run1/exit_code.txt`
- `EVIDENCE/executions/run2/exit_code.txt`
- `EVIDENCE/executions/run3/exit_code.txt`

**Verdict**: ✅ PASS

---

### INV-Q1-05: Hash chain integrity

**Test Method**: Verify run_hash.txt matches computed hash of hashes.txt content.

**Run Hash**: `461b18a2c72a79e44f197313bd1711de99506163b6025857c1b7e6a5d6da7f57`

**Verify command confirms**: 12/12 files valid

**Evidence**: 
- `EVIDENCE/golden/latest_run/run_hash.txt`
- `EVIDENCE/executions/verify_output.txt`

**Verdict**: ✅ PASS

---

## INVARIANTS SUMMARY

| ID | Invariant | Status |
|----|-----------|--------|
| INV-Q1-01 | Idempotence | ✅ PASS |
| INV-Q1-02 | Round-Trip | ✅ PASS |
| INV-Q1-03 | No NaN/undefined | ✅ PASS |
| INV-Q1-04 | Exit code consistency | ✅ PASS |
| INV-Q1-05 | Hash chain integrity | ✅ PASS |

PASS
