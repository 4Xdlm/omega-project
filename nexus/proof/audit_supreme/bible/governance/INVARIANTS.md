# OMEGA System Invariants

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

This document catalogs all system invariants that MUST hold true at all times. Violation of any invariant is a critical defect.

**Total Invariants:** 101 (87 SENTINEL + 14 Genome)

---

## Core Invariants

### INV-CORE-01: Determinism
**Statement:** Given identical input, OMEGA produces identical output.
**Enforced By:** Pure functions, seeded operations
**Test Coverage:** Multiple determinism test suites

### INV-CORE-02: Input Validation
**Statement:** All user input passes through mycelium validation before processing.
**Enforced By:** API design, single entry point
**Test Coverage:** Integration tests

### INV-CORE-03: Type Safety
**Statement:** All public APIs are fully typed with no `any` in signatures.
**Enforced By:** TypeScript strict mode, ESLint rules
**Test Coverage:** Type checking

---

## Genome Invariants

### INV-GEN-01: Emotion14 Sum
**Statement:** Sum of all emotion14 values equals 1.0 (±1e-6).
**Enforced By:** `analyze()` implementation
**Test Coverage:** Property-based tests

### INV-GEN-02: Value Range
**Statement:** All axis values are in [0, 1] range.
**Enforced By:** Normalization in extraction
**Test Coverage:** Range assertion tests

### INV-GEN-03: Fingerprint Stability
**Statement:** Same genome produces same fingerprint across platforms.
**Enforced By:** Canonical serialization, float quantization
**Test Coverage:** Cross-platform golden tests

### INV-GEN-04: Fingerprint Uniqueness
**Statement:** Different genomes produce different fingerprints (collision-resistant).
**Enforced By:** SHA-256 algorithm
**Test Coverage:** Collision tests

### INV-GEN-05: Comparison Symmetry
**Statement:** compare(A, B) equals compare(B, A).
**Enforced By:** Cosine similarity algorithm
**Test Coverage:** Symmetry tests

### INV-GEN-06: Comparison Reflexivity
**Statement:** compare(A, A) returns score 1.0 (IDENTICAL).
**Enforced By:** Cosine similarity algorithm
**Test Coverage:** Reflexivity tests

### INV-GEN-07: Version Tracking
**Statement:** Every genome includes version metadata.
**Enforced By:** `analyze()` implementation
**Test Coverage:** Metadata tests

---

## Mycelium Invariants

### INV-MYC-01: No Bypass
**Statement:** No code path exists that processes unvalidated input.
**Enforced By:** API design
**Test Coverage:** Architecture tests

### INV-MYC-02: UTF-8 Only
**Statement:** Invalid UTF-8 is always rejected.
**Enforced By:** `validateUTF8()`
**Test Coverage:** Encoding tests

### INV-MYC-03: Binary Rejection
**Statement:** Binary content is always rejected.
**Enforced By:** `validateBinary()`
**Test Coverage:** Binary detection tests

### INV-MYC-04: Size Limits
**Statement:** Text outside [10, 1,000,000] characters is rejected.
**Enforced By:** `validateSize()`
**Test Coverage:** Boundary tests

### INV-MYC-05: Rejection Info
**Statement:** Every rejection includes code, message, and category.
**Enforced By:** RejectResult type
**Test Coverage:** Type checking

### INV-MYC-06: Normalization
**Statement:** Accepted text has normalized line endings (LF only).
**Enforced By:** `normalizeLineEndings()`
**Test Coverage:** Normalization tests

---

## Oracle Invariants

### INV-ORC-01: Backend Abstraction
**Statement:** Caller code does not depend on specific backend.
**Enforced By:** Adapter pattern
**Test Coverage:** Interface tests

### INV-ORC-02: Cache Consistency
**Statement:** Cached responses match original responses.
**Enforced By:** Cache key design
**Test Coverage:** Cache tests

### INV-ORC-03: Error Classification
**Statement:** All errors have code, backend, and retryable flag.
**Enforced By:** OracleError class
**Test Coverage:** Error tests

---

## Search Invariants

### INV-SRC-01: Index Consistency
**Statement:** Indexed documents are findable by their content.
**Enforced By:** Inverted index design
**Test Coverage:** Round-trip tests

### INV-SRC-02: Score Ordering
**Statement:** Results are ordered by descending score.
**Enforced By:** Ranking algorithm
**Test Coverage:** Ordering tests

### INV-SRC-03: Highlight Accuracy
**Statement:** Highlight positions match actual match locations.
**Enforced By:** Highlight extraction
**Test Coverage:** Position tests

---

## Certification Invariants

### INV-CRT-01: Hash Integrity
**Statement:** Bundle hashes match actual file contents.
**Enforced By:** `proof-pack.verify()`
**Test Coverage:** Integrity tests

### INV-CRT-02: Timestamp Accuracy
**Statement:** Bundle timestamps are accurate (±1 second).
**Enforced By:** System clock
**Test Coverage:** Manual verification

### INV-CRT-03: Complete Evidence
**Statement:** All claimed tests are present in evidence.
**Enforced By:** Bundle structure
**Test Coverage:** Completeness tests

---

## Architectural Invariants

### INV-ARC-01: Layer Direction
**Statement:** Dependencies flow downward only.
**Enforced By:** Package structure, import rules
**Test Coverage:** Dependency analysis

### INV-ARC-02: No Cycles
**Statement:** No circular dependencies exist.
**Enforced By:** Package structure
**Test Coverage:** Cycle detection

### INV-ARC-03: Frozen Immutability
**Statement:** FROZEN modules are never modified.
**Enforced By:** Git hooks, CI checks
**Test Coverage:** Hash comparison

---

## Security Invariants

### INV-SEC-01: No eval
**Statement:** No use of eval() or new Function().
**Enforced By:** ESLint rules, code review
**Test Coverage:** Static analysis

### INV-SEC-02: No Network
**Statement:** Core packages make no external network calls.
**Enforced By:** Code review
**Test Coverage:** Static analysis

### INV-SEC-03: No Secrets
**Statement:** No hardcoded credentials in source.
**Enforced By:** Git hooks, secret scanning
**Test Coverage:** Pattern matching

---

## Invariant Statistics

| Category | Count | Critical |
|----------|-------|----------|
| Core | 3 | 3 |
| Genome | 7 | 7 |
| Mycelium | 6 | 6 |
| Oracle | 3 | 1 |
| Search | 3 | 1 |
| Certification | 3 | 3 |
| Architecture | 3 | 3 |
| Security | 3 | 3 |
| **TOTAL** | **31** | **27** |

Note: Full 101 invariants are documented in SENTINEL SUPREME axiom files.

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
