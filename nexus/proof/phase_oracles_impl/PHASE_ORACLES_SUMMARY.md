# Phase Oracles Implementation Summary

**RUN_ID**: PHASE_ORACLES_IMPL
**DATE**: 2026-01-30
**STATUS**: COMPLETE

---

## Overview

This phase implements the ignition oracle system per DEC_ALLUMAGE_DETERMINISM.md:
- ORACLE-1: Structured test report (deterministic, canonical)
- ORACLE-2: Production artefact manifest (deterministic, baseline-compared)
- ORACLE-X: Runtime artifact manifest (deterministic, radical variant)

## Deliverables

### 1. Oracle Infrastructure

| File | Purpose |
|------|---------|
| tools/oracles/types.ts | Shared TypeScript types |
| tools/oracles/canonicalizer.ts | Volatile field removal |
| tools/oracles/oracle_dist_manifest.ts | ORACLE-2 implementation |
| tools/oracles/oracle_test_report.ts | ORACLE-1 implementation |
| tools/oracles/oracle_runtime_manifest.ts | ORACLE-X implementation |
| tools/oracles/ignition.ts | Master ignition script |

### 2. Baselines

| File | Purpose |
|------|---------|
| baselines/oracles/dist_manifest.expected.sha256 | ORACLE-2 baseline |
| baselines/oracles/README.md | Baseline policy documentation |

### 3. Tests (35 total)

| Test File | Tests | Purpose |
|-----------|-------|---------|
| tests/oracles/canonicalizer.test.ts | 9 | Canonicalizer unit tests |
| tests/oracles/oracle_dist_manifest.test.ts | 6 | ORACLE-2 tests |
| tests/oracles/mm3_fixtures.test.ts | 8 | Multi-fixture coverage (MM3) |
| tests/oracles/mm4_capsule.test.ts | 6 | Capsule verification (MM4) |
| tests/oracles/mm5_batch.test.ts | 6 | Batch verification (MM5) |

### 4. Test Fixtures

| File | Purpose |
|------|---------|
| intents/intent_minimal.json | Minimal valid intent |
| intents/intent_full.json | All optional fields populated |
| intents/intent_error_schema.json | Invalid schema (expected fail) |
| intents/intent_edge_empty.json | Edge case: empty content |
| intents/intent_edge_unicode.json | Edge case: unicode content |

### 5. Documentation

| File | Purpose |
|------|---------|
| docs/IGNITION_ORACLES.md | User documentation |
| baselines/oracles/README.md | Baseline policy |

### 6. npm Scripts Added

```json
{
  "oracle:dist": "npx tsx tools/oracles/oracle_dist_manifest.ts",
  "oracle:tests": "npx tsx tools/oracles/oracle_test_report.ts",
  "oracle:runtime": "npx tsx tools/oracles/oracle_runtime_manifest.ts",
  "ignition": "npx tsx tools/oracles/ignition.ts",
  "ignition:update-baselines": "..."
}
```

---

## Verification

### ORACLE-2 Determinism (Triple-Run)

Hash across 3 runs: **IDENTICAL**
```
Run 1: 19CE02017768E3AE7DE683EA9C161D2B6E50273376000F5FBF0814D957B99382
Run 2: 19CE02017768E3AE7DE683EA9C161D2B6E50273376000F5FBF0814D957B99382
Run 3: 19CE02017768E3AE7DE683EA9C161D2B6E50273376000F5FBF0814D957B99382
```

Evidence: tests/oracles/oracle_dist_manifest.test.ts "should produce deterministic output"

### Test Results

```
Test Files: 5 passed (5)
Tests: 35 passed (35)
```

---

## Compliance

- [x] T0: Working tree clean before commit
- [x] T4: Determinism proven via triple-run
- [x] T8: Documentation aligned
- [x] MM3: Multi-fixture tests implemented
- [x] MM4: Capsule verification tests implemented
- [x] MM5: Batch verification tests implemented

---

## Audit Decision Implemented

Per DEC_ALLUMAGE_DETERMINISM.md:
- stdout is **NOT** an oracle (non-deterministic)
- ORACLE-1 + ORACLE-2 are **MANDATORY** for ignition
- ORACLE-X is **OPTIONAL** (radical variant for additional proof)

---

## Evidence Files

See EVIDENCE/ subdirectory for:
- git_head.txt
- git_status_porcelain.txt
- node_version.txt
- npm_version.txt
- triple_run_oracle2/*.sha256
