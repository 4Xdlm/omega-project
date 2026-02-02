# LR9 — FINDINGS

## SUMMARY

| Severity | Count |
|----------|-------|
| BLOCKING | 0 |
| HIGH | 0 |
| MEDIUM | 5 |
| LOW | 8 |

---

## FINDINGS

### FND-001: Math.random() in ID Generation

**Severity**: MEDIUM
**Category**: Determinism
**Proof**: `quarantine.ts:50,68` — `Math.random().toString(36)`
**Impact**: Non-deterministic quarantine IDs
**Recommendation**: Replace with seeded PRNG via τ_ID_GENERATOR
**Validation**: Run identical analysis twice, verify IDs match

### FND-002: Math.random() in UI Analyzer

**Severity**: MEDIUM
**Category**: Determinism
**Proof**: `apps/omega-ui/src/core/analyzer.ts:20`
**Impact**: Non-deterministic analysis IDs in UI
**Recommendation**: Replace with seeded PRNG
**Validation**: UI analysis IDs reproducible with same seed

### FND-003: Math.random() in useOracle Hook

**Severity**: MEDIUM
**Category**: Determinism
**Proof**: `apps/omega-ui/src/hooks/useOracle.ts:174`
**Impact**: Non-deterministic analysis IDs
**Recommendation**: Replace with seeded PRNG
**Validation**: Oracle hook IDs reproducible

### FND-004: Undocumented Magic Numbers (Judges)

**Severity**: MEDIUM
**Category**: Maintainability
**Proof**: `genesis-forge/judges/j1_emotion_binding.ts:280` — `0.6`, `0.4`
**Impact**: Weights not traceable to specification
**Recommendation**: Extract to τ_CONFIDENCE_WEIGHTS constant
**Validation**: Constant documented with rationale

### FND-005: Undocumented Magic Numbers (Physics)

**Severity**: MEDIUM
**Category**: Maintainability
**Proof**: `src/oracle/muse/physics/inertia.ts:69` — `0.4`, `0.3`, `0.3`
**Impact**: Physics weights not traceable
**Recommendation**: Extract to τ_INERTIA_WEIGHTS constant
**Validation**: Constant documented with rationale

### FND-006: Nested Vitest Vulnerabilities

**Severity**: LOW
**Category**: Security
**Proof**: npm audit — esbuild GHSA-67mh-4wv8-2f99
**Impact**: Dev-only, CVSS 5.3, requires user interaction
**Recommendation**: Update nested vitest in packages/*
**Validation**: `npm audit` shows 0 vulnerabilities

### FND-007: CLAUDE.md References Non-existent Path

**Severity**: LOW
**Category**: Documentation
**Proof**: CLAUDE.md:24 — `packages/sentinel/`
**Impact**: Documentation inconsistency
**Recommendation**: Update to `gateway/sentinel/`
**Validation**: Path exists

### FND-008: UI Tests Not in Main Suite

**Severity**: LOW
**Category**: Test Coverage
**Proof**: `apps/omega-ui/tests/` not run by `npm test`
**Impact**: UI tests not validated in CI
**Recommendation**: Add UI tests to vitest config
**Validation**: UI tests run in `npm test`

### FND-009: Legacy Phase Folders Undocumented

**Severity**: LOW
**Category**: Documentation
**Proof**: OMEGA_PHASE12/, OMEGA_PHASE13A/, etc.
**Impact**: Unclear status of legacy code
**Recommendation**: Document in CONTRIBUTING.md or archive
**Validation**: Status documented

### FND-010: Date.now() in emotion_engine.ts

**Severity**: LOW
**Category**: Determinism (Metadata)
**Proof**: `emotion_engine.ts:117,166,174,...`
**Impact**: Metadata timestamps vary (acceptable)
**Recommendation**: Consider clock abstraction for testability
**Validation**: Metadata excluded from hash computation

### FND-011: Toast/Notification ID Non-determinism

**Severity**: LOW
**Category**: Determinism (UI)
**Proof**: `apps/omega-ui/src/stores/uiStore.ts:86`
**Impact**: UI-only, cosmetic
**Recommendation**: No action required
**Validation**: N/A

### FND-012: Test-only Math.random() Usage

**Severity**: LOW
**Category**: Test Code
**Proof**: Various test files
**Impact**: Test fixtures only
**Recommendation**: No action required
**Validation**: N/A

### FND-013: Performance.now() Usage

**Severity**: LOW
**Category**: Timing
**Proof**: `packages/truth-gate/src/validators/base-validator.ts:31`
**Impact**: Timing metrics only, no output impact
**Recommendation**: No action required
**Validation**: N/A

---

## BLOCKING ISSUES

**NONE**

All 4941 tests pass. Core pipeline is deterministic with seed=42.
