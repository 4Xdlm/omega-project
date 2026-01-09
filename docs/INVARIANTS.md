# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA PROJECT — INVARIANTS REGISTRY
# Version: v3.34.0
# Standard: NASA-Grade L4 / DO-178C Level A
# ═══════════════════════════════════════════════════════════════════════════════

## Overview

This document catalogs all invariants across the OMEGA project.
Total: 101+ base invariants + 5 stress invariants

## Invariant Naming Convention

```
INV-{MODULE}-{NUMBER}
```

Modules:
- SENT: Sentinel
- GEN: Genome
- INT: Integration (Mycelium adapter)
- E2E: End-to-end tests
- PERF: Performance benchmarks
- STRESS: Stress tests

---

## SENTINEL INVARIANTS (87)

### Foundation (INV-FOUND-*)

| ID | Description | Test File |
|----|-------------|-----------|
| INV-FOUND-01 | Axioms are immutable after definition | foundation.test.ts |
| INV-FOUND-02 | Constants never change at runtime | foundation.test.ts |
| ... | ... | ... |

*Note: Full Sentinel invariants documented in packages/sentinel/*

---

## GENOME INVARIANTS (14)

### Core (INV-GEN-*)

| ID | Description | Test File |
|----|-------------|-----------|
| INV-GEN-01 | analyze() returns valid NarrativeGenome | analyze.test.ts |
| INV-GEN-02 | Genome fingerprint is deterministic | fingerprint.test.ts |
| INV-GEN-03 | Same input + seed = same genome | determinism.test.ts |
| INV-GEN-04 | Emotion distribution sums to 1.0 (±0.001) | emotion.test.ts |
| INV-GEN-05 | Style axis values in [0,1] range | style.test.ts |
| INV-GEN-06 | Fingerprint length = 64 chars | fingerprint.test.ts |
| INV-GEN-07 | Compare returns [0,1] range | similarity.test.ts |
| INV-GEN-08 | Compare(a,a) = 1.0 (identity) | similarity.test.ts |
| INV-GEN-09 | Compare(a,b) = Compare(b,a) (symmetry) | similarity.test.ts |
| INV-GEN-10 | Quantized floats have max 6 decimals | canonical.test.ts |
| INV-GEN-11 | Canonical serialization is deterministic | canonical.test.ts |
| INV-GEN-12 | EMOTION14_ORDERED has 14 elements | emotion14.test.ts |
| INV-GEN-13 | VERSION constants are non-empty | version.test.ts |
| INV-GEN-14 | validateGenome rejects invalid inputs | validate.test.ts |

---

## INTEGRATION INVARIANTS (INV-INT-*)

| ID | Description | Test File |
|----|-------------|-----------|
| INV-INT-01 | Empty request_id rejected (REJ-INT-001) | integration.test.ts |
| INV-INT-02 | Empty text rejected (REJ-MYC-001) | integration.test.ts |
| INV-INT-03 | Whitespace-only rejected (REJ-MYC-002) | integration.test.ts |
| INV-INT-04 | Binary content rejected (REJ-MYC-003) | integration.test.ts |
| INV-INT-05 | Control chars rejected (REJ-MYC-004) | integration.test.ts |
| INV-INT-06 | seal_ref present in all responses | integration.test.ts |
| INV-INT-07 | request_id preserved in response | integration.test.ts |
| INV-INT-08 | Discriminated union (ok:true/false) | integration.test.ts |
| INV-INT-09 | Valid text produces genome | integration.test.ts |
| INV-INT-10 | fingerprint present on success | integration.test.ts |

---

## E2E INVARIANTS (INV-E2E-*)

| ID | Description | Test File |
|----|-------------|-----------|
| INV-E2E-01 | Happy path produces complete result | pipeline.test.ts |
| INV-E2E-02 | All rejection codes propagate correctly | pipeline.test.ts |
| INV-E2E-03 | Determinism across pipeline | pipeline.test.ts |
| INV-E2E-04 | Seal reference consistency | pipeline.test.ts |
| INV-E2E-05 | Version constants accessible | pipeline.test.ts |

---

## PERFORMANCE INVARIANTS (INV-PERF-*)

| ID | Description | Test File |
|----|-------------|-----------|
| INV-PERF-01 | Single validation < 1ms | pipeline.bench.ts |
| INV-PERF-02 | Large text (43KB) < 10ms | pipeline.bench.ts |
| INV-PERF-03 | Throughput > 10,000/sec | pipeline.bench.ts |
| INV-PERF-04 | No memory leak in batch | pipeline.bench.ts |
| INV-PERF-05 | Fingerprint computation < 1ms | pipeline.bench.ts |

---

## STRESS INVARIANTS (INV-STRESS-*)

| ID | Description | Test File |
|----|-------------|-----------|
| INV-STRESS-01 | Pipeline stable under high load (1000+ iterations) | stress.test.ts |
| INV-STRESS-02 | No data corruption under stress | stress.test.ts |
| INV-STRESS-03 | Edge cases handled correctly | edgecases.test.ts |
| INV-STRESS-04 | No crash/unhandled exception | stress.test.ts |
| INV-STRESS-05 | Determinism maintained under stress | stress.test.ts |

---

## Invariant Verification Matrix

| Phase | Module | Invariants | Tests | Status |
|-------|--------|------------|-------|--------|
| 27 | Sentinel | 87 | 898 | FROZEN |
| 28 | Genome | 14 | 109 | SEALED |
| 29.3 | Integration | 10 | 38 | CERTIFIED |
| 30.0 | E2E | 5 | 23 | CERTIFIED |
| 30.1 | Performance | 5 | 12 | CERTIFIED |
| 31.0 | Stress | 5 | 39 | CERTIFIED |

---

## Edge Cases (Documented in INV-STRESS-03)

### Accepted Inputs

| Input Type | Example | Result |
|------------|---------|--------|
| Emojis | "Hello 🌍" | OK |
| CJK characters | "世界你好" | OK |
| RTL (Arabic) | "مرحبا" | OK |
| Combining chars | "cafe\u0301" | OK |
| Unix LF | "A\nB" | OK (preserved) |
| Windows CRLF | "A\r\nB" | OK (normalized) |
| Long request_id | "a".repeat(1000) | OK |

### Rejected Inputs

| Input Type | Example | Rejection Code |
|------------|---------|----------------|
| Empty string | "" | REJ-MYC-001 |
| Whitespace only | "   \t\n" | REJ-MYC-002 |
| Null byte | "Hello\x00World" | REJ-MYC-004 |
| Bell char | "Hello\x07World" | REJ-MYC-004 |
| Backspace | "Hello\x08World" | REJ-MYC-004 |
| PDF magic | "%PDF-1.4" | REJ-MYC-003 |
| PNG magic | "\x89PNG..." | REJ-MYC-003 |
| ZIP magic | "PK\x03\x04" | REJ-MYC-003 |
| Empty request_id | "" | REJ-INT-001 |
| Whitespace request_id | "   " | REJ-INT-001 |

### Known Gaps (NCR)

| Input | Expected | Actual | NCR |
|-------|----------|--------|-----|
| DEL char (\x7F) | Rejected | Accepted | NCR-002 |
| ELF magic (\x7FELF) | Rejected | Accepted | NCR-003 |

---

## Invariant Testing Requirements

Per DO-178C Level A:

1. **MC/DC Coverage**: Each invariant must have:
   - At least one positive test (behavior verified)
   - At least one negative test (violation detected)

2. **Determinism**: All invariant tests must be:
   - Reproducible with fixed seed
   - Platform-independent (Windows/Linux)

3. **Traceability**: Each invariant must link to:
   - Requirement ID
   - Test file(s)
   - Evidence file(s)

---

## Adding New Invariants

To add a new invariant:

1. Choose appropriate module prefix (INV-{MODULE}-*)
2. Assign next sequential number
3. Add to relevant test file with comment `// [INV-{MODULE}-{NN}]`
4. Update this document
5. Update certificate template
6. Run full test suite
7. Generate evidence pack
