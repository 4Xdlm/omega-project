# Q6_MISSING_MODULES — Missing Conceptual Modules

## RUN_ID
```
19C10E1FE7800000
```

## METHODOLOGY

A "missing module" is only valid if:
1. A correctness property is currently untested/unprovable
2. Absence of that module would allow a wrong result to go undetected

## ANALYSIS

### MM1: Structured Test Report (ORACLE-1)

**Property**: Test results should be available as machine-parseable structured data (JSON/JUnit/TAP).

**Current State**: 
- Unit tests exist (npm test)
- Output format: Vitest console output (human-readable)
- No JSON/JUnit/TAP export observed in standard workflow

**Impact**: Cannot programmatically assert test results in CI without parsing stdout.

**Evidence**: Phase T audit identified this gap (see `nexus/proof/phase_t_launch_audit/`)

**Status**: ⚠️ KNOWN GAP — Documented in DEC_ALLUMAGE_DETERMINISM.md as ORACLE-1 (MANDATORY)

**Verdict**: UNPROVEN (already flagged, not a new discovery)

---

### MM2: Production Artefact Hash Oracle (ORACLE-2)

**Property**: A production artefact hash should be computed and compared as determinism oracle.

**Current State**:
- `dist/runner/main.js` has hash: `91E103ED77C1BF3139F6AF134E758B4CD8C833C06F5F8780D7E59067D94F4F96`
- This hash is captured but not automatically verified in CI

**Impact**: Build determinism relies on manual verification.

**Evidence**: `EVIDENCE/artefact_sha256.txt`

**Status**: ⚠️ KNOWN GAP — Documented in DEC_ALLUMAGE_DETERMINISM.md as ORACLE-2 (MANDATORY)

**Verdict**: UNPROVEN (already flagged)

---

### MM3: Multi-Fixture Test Suite

**Property**: Runner should be tested with multiple diverse intents covering edge cases.

**Current State**:
- Only 1 fixture available: `intents/intent_mvp.json`
- No error path testing (invalid intent)
- No constraint testing
- No batch mode testing

**Impact**: Coverage gap — cannot prove correctness for edge cases.

**Evidence**: `EVIDENCE/available_intents.txt` shows only 1 file

**Status**: ⚠️ GAP — Not previously documented

**Verdict**: UNPROVEN (coverage gap, but not a correctness failure)

---

### MM4: Capsule Command Verification

**Property**: Capsule creation should be tested for determinism.

**Current State**:
- `capsule` command exists
- Not tested in Phase Q (no capsule execution)

**Impact**: Cannot prove capsule determinism without test.

**Evidence**: CLI help shows capsule command; no capsule tests in EVIDENCE/

**Status**: ⚠️ GAP — Not tested

**Verdict**: UNPROVEN (not tested)

---

### MM5: Batch Command Verification

**Property**: Batch execution should produce same results as sequential single runs.

**Current State**:
- `batch` command exists
- Not tested in Phase Q

**Impact**: Cannot prove batch/single equivalence.

**Evidence**: CLI help shows batch command; no batch tests in EVIDENCE/

**Status**: ⚠️ GAP — Not tested

**Verdict**: UNPROVEN (not tested)

---

## CRITICAL MISSING MODULES

| ID | Module | Proven by Test | Critical |
|----|--------|----------------|----------|
| MM1 | Structured test report | ❌ | YES (ORACLE-1) |
| MM2 | Artefact hash oracle | ❌ | YES (ORACLE-2) |
| MM3 | Multi-fixture suite | ❌ | NO (coverage, not correctness) |
| MM4 | Capsule verification | ❌ | NO (optional command) |
| MM5 | Batch verification | ❌ | NO (optional command) |

## VERDICT

**Critical missing modules (MM1, MM2)**: Already documented in Phase T decision. Not new discoveries.

**Non-critical gaps (MM3-MM5)**: Coverage improvements, not correctness failures.

**Demonstrable failure scenario**: None found that is not already documented.

PASS
