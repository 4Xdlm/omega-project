# DESIGN — PHASE 35.0 — HARDENING

## Objectif

Validation du hardening des invariants et du systeme de rejet.

## Scope

- Fichiers a creer: certificates/phase35_0/* (DESIGN, CERT, SCOPE, HASHES, FROZEN)
- Fichiers a creer: evidence/phase35_0/* (tests.log, commands.txt)
- Fichiers a creer: history/HISTORY_PHASE_35_0.md

## Verification Hardening

| Category | Tests | File | Status |
|----------|-------|------|--------|
| Decision Trace | 31 | hardening/decision_trace.test.ts | PASS |
| Hardening Checks | 36 | hardening/hardening_checks.test.ts | PASS |
| Governance | 65 | hardening/governance.test.ts | PASS |
| Refusal | 898 total | sentinel/tests/refusal.test.ts | PASS |

## Invariants Hardened

| Category | Count | Status |
|----------|-------|--------|
| Sentinel Invariants | 87 | VERIFIED |
| Genome Invariants | 14 | VERIFIED |
| Gateway Hardening | 132 | VERIFIED |
| **TOTAL** | **233+** | **PASS** |

## Plan de tests

- Tests existants: 1792 (tous doivent passer)
- Hardening-specific: 132 tests in gateway/tests/hardening/

## No-Go Criteria

1. Test BLOQUANT echoue
2. Invariant hardening violation

## Rollback Plan

1. git checkout -- <fichiers crees>
2. Supprimer certificates/phase35_0/, evidence/phase35_0/
