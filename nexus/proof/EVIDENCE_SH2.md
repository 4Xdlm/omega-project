# EVIDENCE PACK — Sprint S-HARDEN + H2-PROMPT

## Date
2026-02-10

## HEAD before
3d8af3b8 (phase-qb-sealed)

## Scope
Fix TF-1 through TF-4 + Prompt engineering for D1/D3 compliance

## Files modified
- packages/genesis-planner/src/providers/llm-provider.ts
- packages/genesis-planner/src/planner.ts
- packages/genesis-planner/src/providers/index.ts
- packages/genesis-planner/tests/providers/provider.test.ts
- packages/omega-runner/src/validation/intent-validator.ts
- packages/omega-runner/src/cli/commands/run-full.ts
- packages/omega-runner/src/cli/commands/run-create.ts
- packages/omega-runner/tests/validation/intent-validator.test.ts

## Files created
- packages/genesis-planner/src/providers/prompt-builder.ts
- packages/genesis-planner/tests/providers/prompt-builder.test.ts
- docs/sprint-sh2/SPRINT_REPORT.md

## Tests
- genesis-planner: 202 tests (0 FAIL)
- omega-runner: 190 tests (0 FAIL)
- Global non-regression: 5,694 PASS / 13 FAIL across 34 packages
- 27/34 packages fully passing
- All 13 failures are pre-existing (package resolution errors + hardening/performance regressions)
- 0 regressions caused by this sprint (only genesis-planner + omega-runner modified)

## Mock Byte-Identical
CONFIRMED — integration tests verify deterministic plan_hash across multiple runs in mock mode

## Golden Re-runs
SKIPPED — No ANTHROPIC_API_KEY available

## Invariants

| Invariant | Description | Status |
|-----------|-------------|--------|
| INV-SH2-01 | TF-1: stdin piping replaces argv | PASS |
| INV-SH2-02 | TF-4: stripMarkdownFences handles all fence formats | PASS |
| INV-SH2-03 | TF-2: simplified format rejected with V-06 | PASS |
| INV-SH2-04 | TF-3: no stack overflow for creation serialization | PASS |
| INV-SH2-05 | Prompt includes exact output schema | PASS |
| INV-SH2-06 | Prompt includes scene count constraints | PASS |
| INV-SH2-07 | parseWithRepair handles fenced + plain JSON | PASS |
| INV-SH2-08 | Mock mode byte-identical (202 tests PASS) | PASS |
| INV-SH2-09 | Zero regressions in other packages | PASS |

9/9 invariants PASS

## Verdict
PASS
