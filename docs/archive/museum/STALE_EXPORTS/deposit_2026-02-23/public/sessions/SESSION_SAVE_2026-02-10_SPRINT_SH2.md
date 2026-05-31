# Session Save — Sprint S-HARDEN + H2-PROMPT

## Date: 2026-02-10
## Phase: Sprint S-HARDEN + H2-PROMPT (TF fixes + Prompt engineering)

## Summary
Fixed 4 Technical Findings from Phase Q-B and added structured prompt engineering for LLM mode.

## Results
- TF-1: stdin piping replaces argv in llm-provider (Windows shell escaping fix)
- TF-2: simplified intent format explicitly rejected with V-06
- TF-3: safe creation summary replaces canonicalJSON(creation) (stack overflow fix)
- TF-4: stripMarkdownFences strips markdown code fences from LLM responses
- Prompt-builder: structured prompts with exact output schemas, scene count constraints, parseWithRepair
- Non-regression: 202 + 190 tests PASS, 0 regressions
- Mock byte-identical: CONFIRMED
- Golden re-runs: SKIPPED (no API key)

## Invariants: 9/9 PASS

## HEAD before: 3d8af3b8 (phase-qb-sealed)

## Files
- docs/sprint-sh2/SPRINT_REPORT.md
- EVIDENCE_SH2.md
- 8 modified + 2 created source/test files
