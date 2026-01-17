# OMEGA Failure Mode Catalog

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

This document catalogs known failure modes, their symptoms, causes, and mitigations.

---

## Input Validation Failures

### FM-INV-01: Invalid UTF-8
**Symptom:** Rejection with code `INVALID_UTF8`
**Cause:** Input contains invalid UTF-8 byte sequences
**Detection:** `validateUTF8()` in mycelium
**Mitigation:** Convert input to valid UTF-8 before submission

### FM-INV-02: Binary Content
**Symptom:** Rejection with code `BINARY_DETECTED`
**Cause:** Input contains null bytes or binary patterns
**Detection:** `validateBinary()` in mycelium
**Mitigation:** Extract text content from binary files before submission

### FM-INV-03: Size Limit Exceeded
**Symptom:** Rejection with code `TEXT_TOO_LONG` or `TEXT_TOO_SHORT`
**Cause:** Input outside [10, 1,000,000] character range
**Detection:** `validateSize()` in mycelium
**Mitigation:** Split large texts, expand short texts

### FM-INV-04: Markup Detected
**Symptom:** Rejection with code `HTML_DETECTED`, `JSON_DETECTED`, or `XML_DETECTED`
**Cause:** Input is structured data, not narrative text
**Detection:** Pattern matching in mycelium
**Mitigation:** Extract text content from structured data

---

## Analysis Failures

### FM-ANL-01: Zero-Length Segments
**Symptom:** Division by zero in emotion extraction
**Cause:** Text segments to zero-length after normalization
**Detection:** Segment length check
**Mitigation:** Ensure minimum segment length

### FM-ANL-02: All-Zero Emotion Vector
**Symptom:** NaN in emotion14 normalization
**Cause:** No emotional content detected
**Detection:** Sum check before normalization
**Mitigation:** Default to uniform distribution

### FM-ANL-03: Numeric Overflow
**Symptom:** Infinity or NaN in axis values
**Cause:** Extreme input characteristics
**Detection:** Value range checks
**Mitigation:** Clamping to [0, 1] range

---

## Fingerprint Failures

### FM-FPR-01: Float Precision Drift
**Symptom:** Different fingerprints for same content across platforms
**Cause:** IEEE 754 floating-point variance
**Detection:** Cross-platform golden tests
**Mitigation:** Quantization to 6 decimal places

### FM-FPR-02: Serialization Order
**Symptom:** Different fingerprints for same content
**Cause:** Non-deterministic JSON key order
**Detection:** Golden tests
**Mitigation:** Canonical serialization with sorted keys

---

## Oracle Failures

### FM-ORC-01: Authentication Failure
**Symptom:** OracleError with code `AUTH_FAILED`
**Cause:** Invalid or expired API key
**Detection:** API response check
**Mitigation:** Verify API key, check expiration

### FM-ORC-02: Rate Limiting
**Symptom:** OracleError with code `RATE_LIMITED`
**Cause:** Too many requests in time window
**Detection:** 429 HTTP response
**Mitigation:** Implement backoff, use caching

### FM-ORC-03: Context Exceeded
**Symptom:** OracleError with code `CONTEXT_EXCEEDED`
**Cause:** Input tokens exceed model limit
**Detection:** Token count check
**Mitigation:** Truncate input, use larger context model

### FM-ORC-04: Backend Unavailable
**Symptom:** OracleError with code `NETWORK_ERROR`
**Cause:** Network issues, service outage
**Detection:** Connection failure
**Mitigation:** Retry with backoff, use fallback backend

---

## Search Failures

### FM-SRC-01: Empty Index
**Symptom:** No results for any query
**Cause:** No documents indexed
**Detection:** Index document count check
**Mitigation:** Index documents before searching

### FM-SRC-02: Query Parse Error
**Symptom:** SearchError during query execution
**Cause:** Invalid query syntax
**Detection:** Query parser
**Mitigation:** Escape special characters, simplify query

### FM-SRC-03: Memory Exhaustion
**Symptom:** Out of memory during indexing
**Cause:** Too many documents or large documents
**Detection:** Memory monitoring
**Mitigation:** Index in batches, increase memory

---

## Certification Failures

### FM-CRT-01: Test Failure
**Symptom:** Bundle status `FAIL`
**Cause:** One or more tests failed
**Detection:** Test runner exit code
**Mitigation:** Fix failing tests

### FM-CRT-02: Hash Mismatch
**Symptom:** VerificationError on bundle
**Cause:** File modified after bundling
**Detection:** Hash comparison
**Mitigation:** Regenerate bundle

### FM-CRT-03: Missing Evidence
**Symptom:** Incomplete proof bundle
**Cause:** Test log or artifact missing
**Detection:** Bundle structure validation
**Mitigation:** Regenerate evidence pack

---

## Platform Failures

### FM-PLT-01: Path Separator
**Symptom:** File not found errors on Windows
**Cause:** Unix path separators (/)
**Detection:** Path parsing failure
**Mitigation:** Use path.join() for all paths

### FM-PLT-02: Line Ending Issues
**Symptom:** Test hash mismatches
**Cause:** CRLF vs LF inconsistency
**Detection:** File comparison
**Mitigation:** Normalize line endings

### FM-PLT-03: Case Sensitivity
**Symptom:** Import failures on Linux
**Cause:** Incorrect file name casing
**Detection:** Module resolution failure
**Mitigation:** Match exact file name case

---

## Severity Classification

| ID | Failure Mode | Severity | Frequency |
|----|--------------|----------|-----------|
| FM-INV-01 | Invalid UTF-8 | LOW | Rare |
| FM-INV-02 | Binary Content | LOW | Rare |
| FM-INV-03 | Size Limit | LOW | Common |
| FM-INV-04 | Markup Detected | LOW | Common |
| FM-ANL-01 | Zero Segments | HIGH | Rare |
| FM-ANL-02 | Zero Emotion | HIGH | Rare |
| FM-FPR-01 | Float Drift | CRITICAL | Prevented |
| FM-FPR-02 | Serialization Order | CRITICAL | Prevented |
| FM-ORC-01 | Auth Failure | MEDIUM | Occasional |
| FM-ORC-02 | Rate Limiting | MEDIUM | Occasional |
| FM-CRT-01 | Test Failure | HIGH | Variable |

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
