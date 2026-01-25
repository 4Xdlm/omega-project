# A.6 CPP (Corpus Pipeline Processing) — DORMANT SPEC

## Status: DORMANT (NO EXECUTION)

This document describes the FUTURE Phase A.6 functionality.
It is NOT active and MUST NOT be executed until Phase B completes.

---

## 1) Purpose

A.6 will provide:
- Corpus ingestion pipeline
- SSX (Symbolic Sentence eXtract) processing
- Emotion profile generation from corpus
- Length constraint enforcement

---

## 2) Dependencies

- Phase A.5 CERTIFIED (emotion-gate complete)
- Phase B PASS (all sub-phases complete)
- Calibration file resolved

---

## 3) Inputs (FUTURE)

- Corpus files (text)
- Configuration from calibration
- SSX templates

---

## 4) Outputs (FUTURE)

- Processed corpus with emotion annotations
- SSX canonical forms
- Hash manifests

---

## 5) Current State

```
STATUS: DORMANT
EXECUTION: FORBIDDEN
REASON: Phase B incomplete
```

---

## 6) Activation Procedure (FUTURE)

1. Verify Phase B all PASS
2. Remove A6_ACTIVATION_LOCK.txt
3. Update this document status to ACTIVE
4. Execute with calibration values
