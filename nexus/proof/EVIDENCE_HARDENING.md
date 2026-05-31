# EVIDENCE PACK — Hardening Sprint H1

## Date
2026-02-10

## HEAD before
82221492

## HEAD after
cd9e7f54

## Scope
Input validation for omega-runner (NCR-G1B-001)

## Files created
- packages/omega-runner/src/validation/intent-validator.ts
- packages/omega-runner/src/validation/index.ts
- packages/omega-runner/tests/validation/intent-validator.test.ts

## Files modified
- packages/omega-runner/src/cli/commands/run-create.ts
- packages/omega-runner/src/cli/commands/run-full.ts
- examples/ATTACK_CATALOG.md
- README.md

## Other packages modified
NONE

## Tests
- omega-runner before: 158 tests
- omega-runner after: 207 tests (158 existing + 49 new)
- Global before: 2328 tests
- Global after: 2377 tests (2328 - 158 + 207)
- Regressions: 0

## Attack Results (Post-Hardening)
ATK-01 SQL Injection:       PASS (exit 2) — was FAIL (exit 0) — FIXED
ATK-02 XSS:                 PASS (exit 2) — was FAIL (exit 0) — FIXED
ATK-03 Path Traversal:      PASS (exit 2) — was FAIL (exit 0) — FIXED
ATK-04 Negative Paragraphs: PASS (exit 2) — was FAIL (exit 0) — FIXED
ATK-05 Extreme Paragraphs:  PASS (exit 2) — was FAIL (exit 0) — FIXED
ATK-06 Empty Intent:        PASS (exit 2) — was FAIL (exit 0) — FIXED
ATK-07 Malformed JSON:      PASS (exit 1) — was PASS (exit 1) — STILL_PASS
ATK-08 Hash Tampered:       PASS (exit 6) — was PASS (exit 6) — STILL_PASS
ATK-09 Unicode Adversarial: PASS (exit 2) — was FAIL (exit 0) — FIXED
ATK-10 Seed Mismatch:       FAIL (exit 0) — was FAIL (exit 0) — N/A (mock limitation)

Pre: 2/10 PASS
Post: 9/10 PASS

## Validation Rules

| Rule | Type | Description |
|------|------|-------------|
| V-01 | Structural | title: string, non-empty, ≤500 chars |
| V-02 | Structural | premise: string, non-empty, ≤2000 chars |
| V-03 | Structural | themes: string[], 1-20 elements, each ≤100 chars |
| V-04 | Structural | core_emotion: string, non-empty, ≤100 chars |
| V-05 | Structural | paragraphs: integer, 1 ≤ x ≤ 1000 |
| S-01 | Security | No <script tags (XSS) |
| S-02 | Security | No ../ or ..\\ (path traversal) |
| S-03 | Security | No DROP/DELETE/INSERT/UPDATE (SQL injection) |
| S-04 | Security | No control characters (U+0000→U+001F except LF, CR) |
| S-05 | Security | No zero-width/directional chars (U+200B, U+200C, U+200D, U+FEFF, U+202E, U+202D) |

## Invariants

| Invariant | Description | Status |
|-----------|-------------|--------|
| INV-H1-01 | Only omega-runner modified (+examples, README, evidence) | PASS |
| INV-H1-02 | 158 existing tests still pass + 49 new = 207 total | PASS |
| INV-H1-03 | No async/Date.now/Math.random in validator | PASS |
| INV-H1-04 | package.json unchanged (zero dependencies added) | PASS |
| INV-H1-05 | ATK-07 and ATK-08 still PASS | PASS |
| INV-H1-06 | Each rule tested individually (≥1 test per rule) | PASS |

6/6 invariants PASS

## NCR Status
NCR-G1B-001: PARTIALLY_CLOSED
Reason: 7/8 validation-related FAILs fixed (ATK-01 through ATK-06, ATK-09).
ATK-10 (seed mismatch) is not a validation gap — it is a known limitation of
mock generators that do not use the seed for content variation.

## Verdict
PASS
