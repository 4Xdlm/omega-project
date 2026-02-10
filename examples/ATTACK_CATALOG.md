# OMEGA Attack Catalog — G.1-B

This document lists deliberate attacks against OMEGA with observed results.
All attacks are reproducible.

## Methodology

Each attack follows the format:
- **Input**: What was provided
- **Expected**: What OMEGA should do
- **Observed**: What OMEGA actually did
- **Verdict**: PASS (correct behavior) or FAIL (vulnerability)

CLI invocation: `npx tsx packages/omega-runner/src/cli/main.ts run full --intent <file> --out <dir> --seed <seed>`

---

## ATK-01 — SQL Injection via Title

- **Input**: `{ "title": "'; DROP TABLE omega;--", ... }`
- **Expected**: Rejected at intent validation
- **Observed**: Exit code 0. Run completed all 6 stages. Hostile title passed through to intent.json and was hashed. No SQL execution occurred (no database in system). ProofPack integrity valid.
- **Verdict**: FAIL — Input should be validated/rejected. See NCR-G1B-001.

## ATK-02 — XSS via Themes

- **Input**: `{ "themes": ["<script>alert('xss')</script>"], ... }`
- **Expected**: Rejected or sanitized
- **Observed**: Exit code 0. XSS payload stored verbatim in intent.json and propagated through pipeline. No browser context exists to execute it. ProofPack integrity valid.
- **Verdict**: FAIL — Input should be sanitized. See NCR-G1B-001.

## ATK-03 — Path Traversal via core_emotion

- **Input**: `{ "core_emotion": "../../etc/passwd", ... }`
- **Expected**: Rejected at validation
- **Observed**: Exit code 0. Path traversal string stored as string value in intent.json. Not used as filesystem path. ProofPack integrity valid.
- **Verdict**: FAIL — Input should be validated against allowed emotion values. See NCR-G1B-001.

## ATK-04 — Negative Paragraphs

- **Input**: `{ "paragraphs": -1, ... }`
- **Expected**: Rejected (bounds check)
- **Observed**: Exit code 0. Value -1 accepted. Mock generators ignore paragraph count. All 6 stages completed. ProofPack integrity valid.
- **Verdict**: FAIL — Bounds checking absent. See NCR-G1B-001.

## ATK-05 — Extreme Paragraphs

- **Input**: `{ "paragraphs": 999999, ... }` (file: `intents/hostile/atk05_extreme_paragraphs.json`)
- **Expected**: Rejected (bounds check)
- **Observed**: Exit code 0. Value 999999 accepted. Mock generators ignore paragraph count. All 6 stages completed normally (no resource exhaustion). ProofPack integrity valid.
- **Verdict**: FAIL — Bounds checking absent. With real generators this could cause resource exhaustion. See NCR-G1B-001.

## ATK-06 — Empty Intent

- **Input**: `{}` (file: `intents/hostile/atk06_empty_intent.json`)
- **Expected**: Rejected (missing required fields)
- **Observed**: Exit code 0. Empty object accepted. All 6 stages completed. Mock generators produced output despite missing fields. ProofPack integrity valid.
- **Verdict**: FAIL — Required field validation absent. See NCR-G1B-001.

## ATK-07 — Malformed JSON

- **Input**: `{ not valid json }` (file: `intents/hostile/atk07_malformed.json`)
- **Expected**: Parse error, zero generation
- **Observed**: Exit code 1 (GENERIC ERROR). JSON parse failed. No stages executed. No output produced.
- **Verdict**: PASS — Malformed input correctly rejected at parse stage.

## ATK-08 — ProofPack Hash Tampered

- **Input**: Valid run with `intent.json` SHA-256 in manifest changed to `0000...0000`
- **Expected**: `omega verify` returns FAIL
- **Observed**: Exit code 6 (VERIFY_FAIL). Verification detected hash mismatch and rejected the tampered run.
- **Verdict**: PASS — Integrity verification correctly detects tampered hashes.

## ATK-09 — Unicode Adversarial (Zero-Width + RTL)

- **Input**: `{ "title": "Normal\u200B\u200BTitle\u202E", ... }` (file: `intents/hostile/atk09_unicode_adversarial.json`)
- **Expected**: Rejected or normalized
- **Observed**: Exit code 0. Unicode characters stored verbatim. Not normalized. All 6 stages completed. ProofPack integrity valid (hash includes the invisible characters).
- **Verdict**: FAIL — No unicode normalization. Invisible characters in title could cause display issues. See NCR-G1B-001.

## ATK-10 — Seed Mismatch Replay

- **Input**: Same intent (`intent_quickstart.json`), different seeds (`omega-quickstart-v1` vs `different-seed-v1`)
- **Expected**: Different hash (proves seed matters)
- **Observed**: Different `run_id` generated (`53729082510e692d` vs `79ad6eaeb8a47ac5`) but identical `final_hash` (`65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a`). Mock generators produce identical content regardless of seed.
- **Verdict**: FAIL — Seed only affects `run_id`, not content. With real generators, different seeds should produce different content. This is a known limitation of mock generators.

---

## Summary

| Attack | Target | Exit Code | Verdict |
|--------|--------|-----------|---------|
| ATK-01 SQL Injection | Validation | 0 | FAIL |
| ATK-02 XSS | Validation | 0 | FAIL |
| ATK-03 Path Traversal | Validation | 0 | FAIL |
| ATK-04 Negative Paragraphs | Bounds | 0 | FAIL |
| ATK-05 Extreme Paragraphs | Bounds | 0 | FAIL |
| ATK-06 Empty Intent | Required Fields | 0 | FAIL |
| ATK-07 Malformed JSON | Parse | 1 | PASS |
| ATK-08 Hash Tampered | Integrity | 6 | PASS |
| ATK-09 Unicode Adversarial | Normalization | 0 | FAIL |
| ATK-10 Seed Mismatch | Determinism | 0 | FAIL |

**Result: 2 PASS, 8 FAIL**

All FAILs are documented in NCR-G1B-001. The root cause is absent intent validation
in the pipeline. The two PASSes demonstrate that:
1. JSON parsing is robust (malformed input rejected)
2. ProofPack integrity verification works (tampered hashes detected)

The 8 FAILs all stem from the same root cause: no input validation layer exists
between intent file reading and pipeline execution.

---

## Post-Hardening Results (Sprint H1)

Sprint H1 added an intent validation layer (`intent-validator.ts`) with 10 rules:
- V-01→V-05: structural validation (required fields, types, bounds)
- S-01→S-05: security validation (XSS, path traversal, SQL injection, control chars, zero-width chars)

Invalid intents now produce exit code 2 (USAGE_ERROR) before any pipeline stage executes.

| Attack | Pre-Hardening | Post-Hardening | Delta |
|--------|---------------|----------------|-------|
| ATK-01 SQL Injection | FAIL (exit 0) | PASS (exit 2) | FIXED |
| ATK-02 XSS | FAIL (exit 0) | PASS (exit 2) | FIXED |
| ATK-03 Path Traversal | FAIL (exit 0) | PASS (exit 2) | FIXED |
| ATK-04 Negative Paragraphs | FAIL (exit 0) | PASS (exit 2) | FIXED |
| ATK-05 Extreme Paragraphs | FAIL (exit 0) | PASS (exit 2) | FIXED |
| ATK-06 Empty Intent | FAIL (exit 0) | PASS (exit 2) | FIXED |
| ATK-07 Malformed JSON | PASS (exit 1) | PASS (exit 1) | STILL_PASS |
| ATK-08 Hash Tampered | PASS (exit 6) | PASS (exit 6) | STILL_PASS |
| ATK-09 Unicode Adversarial | FAIL (exit 0) | PASS (exit 2) | FIXED |
| ATK-10 Seed Mismatch | FAIL (exit 0) | FAIL (exit 0) | N/A — mock limitation |

### Hardening Summary
- Pre-hardening: 2 PASS, 8 FAIL
- Post-hardening: 9 PASS, 1 FAIL
- NCR-G1B-001 status: PARTIALLY_CLOSED
- Remaining FAIL: ATK-10 (seed mismatch) — known limitation of mock generators, not a validation gap. Seed does not affect content generation because mock generators return static output. This will be resolved when real LLM generators are integrated.
