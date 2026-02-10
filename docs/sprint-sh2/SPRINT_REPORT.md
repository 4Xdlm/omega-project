# Sprint S-HARDEN + H2-PROMPT — Report

## Date: 2026-02-10
## HEAD before: 3d8af3b8 (phase-qb-sealed)

---

## Scope

Fix 4 Technical Findings from Phase Q-B + Prompt engineering for higher Q.1 Justesse scores.

## Changes

### GATE 1: TF-1 + TF-4 (genesis-planner)

**TF-1 Fix**: `llm-provider.ts` — Replaced command-line argument passing with stdin piping.
- Before: `execSync('node -e "..." "requestBody" "apiKey")` — shell escaping corrupts nested quotes on Windows
- After: `execSync('node -e "..."', { input: JSON.stringify({body, apiKey}) })` — no shell escaping needed
- The inline Node.js script now reads from `process.stdin` instead of `process.argv`

**TF-4 Fix**: `llm-provider.ts` — Added `stripMarkdownFences()` function.
- Strips `json ... ` and ` ... ` wrappers from LLM responses
- Applied to all `callClaudeSync` output before returning
- 6 tests covering clean JSON, fenced JSON, whitespace handling

### GATE 2: TF-2 + TF-3 (omega-runner)

**TF-2 Fix**: `intent-validator.ts` — Simplified format explicitly rejected.
- Before: Simplified format `{title, premise, themes, core_emotion, paragraphs}` passed validation but failed silently in creation-pipeline
- After: Detected as 'simplified' → rejected with V-06 error directing users to formal IntentPack format
- Removed dead code (V-01 through V-05 validators, S-01 through S-05 security checks) — DO-178C D-03 compliance

**TF-3 Fix**: `run-full.ts` and `run-create.ts` — Replaced `canonicalJSON(creation)` with safe summary.
- Before: `canonicalJSON(creation)` caused stack overflow due to deep/circular references in CreationResult
- After: Serializes metadata-only summary `{pipeline_id, output_hash, intent_hash, verdict}`
- Full content already captured in individual stage artifacts (10-genesis, 20-scribe, 30-style)

### GATE 3: Prompt Engineering (genesis-planner)

**prompt-builder.ts** — New module with structured prompts:
- `buildArcPrompt()`: Includes intent, canon entries, constraints (scene counts), banned topics, forbidden cliches, exact output schema
- `buildScenePrompt()`: Includes arc context, emotion waypoints, scene count limits per arc, full scene schema with all required fields
- `buildBeatPrompt()`: Includes scene context, beat count limits from config, beat schema
- `parseWithRepair()`: Attempts JSON.parse, then strips markdown fences, then extracts JSON from surrounding text

**planner.ts** — Integrated prompt-builder:
- LLM branch now uses `buildArcPrompt/buildScenePrompt/buildBeatPrompt` instead of `JSON.stringify`
- All LLM responses go through `parseWithRepair()` for robust parsing

### GATE 4: Golden Re-runs

**SKIPPED** — No ANTHROPIC_API_KEY available. Prompt improvements validated structurally via 20 unit tests.

---

## Test Counts

| Package | Before | After | Delta |
|---------|--------|-------|-------|
| genesis-planner | 176 | 202 | +26 |
| omega-runner | 190 | 190 | 0 (tests updated, count stable) |
| All other packages | unchanged | unchanged | 0 |

### New Tests
- 6 tests: `stripMarkdownFences` (TF-4)
- 20 tests: `prompt-builder` (3 prompt builders + parseWithRepair)

### Modified Tests
- 32 tests: `intent-validator` (updated for V-06 rejection of simplified format)

---

## Files Modified (8)

| File | Change |
|------|--------|
| `packages/genesis-planner/src/providers/llm-provider.ts` | TF-1 stdin + TF-4 stripMarkdownFences |
| `packages/genesis-planner/src/planner.ts` | Prompt-builder integration + parseWithRepair |
| `packages/genesis-planner/src/providers/index.ts` | Export prompt-builder + stripMarkdownFences |
| `packages/genesis-planner/tests/providers/provider.test.ts` | +6 stripMarkdownFences tests |
| `packages/omega-runner/src/validation/intent-validator.ts` | TF-2 simplified format rejection |
| `packages/omega-runner/src/cli/commands/run-full.ts` | TF-3 safe creation summary |
| `packages/omega-runner/src/cli/commands/run-create.ts` | TF-3 safe creation summary |
| `packages/omega-runner/tests/validation/intent-validator.test.ts` | Updated for V-06 |

## Files Created (2)

| File | Purpose |
|------|---------|
| `packages/genesis-planner/src/providers/prompt-builder.ts` | Structured prompts + parseWithRepair |
| `packages/genesis-planner/tests/providers/prompt-builder.test.ts` | 20 tests |
