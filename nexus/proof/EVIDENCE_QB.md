# EVIDENCE PACK — Phase Q-B

## Date
2026-02-10

## HEAD before
01330f67

## HEAD after
0ef646cd

## Scope
Golden runs + Q.1 Justesse + Q.2 Précision (zero code modifications)

## Files created
### docs/phase-q-b/
- docs/phase-q-b/Q1_JUSTESSE_REPORT.md
- docs/phase-q-b/Q2_PRECISION_REPORT.md
- docs/phase-q-b/Q5B_VERDICT.md
- docs/phase-q-b/GOLDEN_RUN_REPORT.md

### golden/intents/
- golden/intents/intent_pack_gardien.json
- golden/intents/intent_pack_choix.json
- golden/intents/intent_pack_gardien_variant.json

### golden/run_001/ (LLM — Le Gardien)
- golden/run_001/llm_responses/arcs.json
- golden/run_001/llm_responses/arcs.meta.json
- golden/run_001/llm_responses/scenes.json
- golden/run_001/llm_responses/scenes.meta.json
- golden/run_001/llm_responses/beats.json
- golden/run_001/llm_responses/beats.meta.json
- golden/run_001/run_summary.json

### golden/run_002/ (LLM — Le Choix)
- golden/run_002/llm_responses/arcs.json
- golden/run_002/llm_responses/arcs.meta.json
- golden/run_002/llm_responses/scenes.json
- golden/run_002/llm_responses/scenes.meta.json
- golden/run_002/llm_responses/beats.json
- golden/run_002/llm_responses/beats.meta.json
- golden/run_002/run_summary.json

### golden/run_003/ (LLM — Variant)
- golden/run_003/llm_responses/arcs.json
- golden/run_003/llm_responses/arcs.meta.json

### golden/run_mock_gardien/ (Mock — Le Gardien)
- 14 artifact files (intent, genesis-plan, scribe, style + hashes + reports)

### golden/run_mock_choix/ (Mock — Le Choix)
- 14 artifact files

### golden/run_mock_variant/ (Mock — Variant)
- 14 artifact files

### golden/ (scripts — utility, not production code)
- golden/run_golden.ts
- golden/run_golden_capture.ts
- golden/run_golden_llm.ts
- golden/run_variant.ts
- golden/call_claude.ts
- golden/test_run.ts

## Code modifications
NONE (zero code modifications)

## Other packages modified
NONE

## Tests
- genesis-planner: 176 tests (0 FAIL)
- Non-regression: 0 regressions

## LLM API Calls
- Total: 9 API calls (claude-sonnet-4-20250514, temperature=0)
- run_001 (Le Gardien): 3 calls, 11842 chars response
- run_002 (Le Choix): 3 calls, 9337 chars response
- run_003 (Variant): 1 call, 3705 chars response
- Errors: 0

## Justesse Score
8.4/10 (5 dimensions evaluated)

## Précision Score
10/10 (3 tests evaluated)

## Invariants

| Invariant | Description | Status |
|-----------|-------------|--------|
| INV-QB-01 | Zero code modifications | PASS |
| INV-QB-02 | All output in docs/ or golden/ | PASS |
| INV-QB-03 | Mock mode byte-identical across runs | PASS |
| INV-QB-04 | 176/176 genesis-planner tests PASS | PASS |
| INV-QB-05 | LLM produces distinct output per intent | PASS |
| INV-QB-06 | LLM respects canon entries | PASS |
| INV-QB-07 | LLM follows emotion trajectory | PASS |
| INV-QB-08 | Variant differentiation measurable | PASS |

8/8 invariants PASS

## Verdict
PASS (with conditions)
