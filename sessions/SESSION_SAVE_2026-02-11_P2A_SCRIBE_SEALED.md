# SESSION SAVE — P.2-A SCRIBE SEALED

## Metadata

| Field | Value |
|-------|-------|
| Date | 2026-02-11 |
| Phase | P.2-A SCRIBE |
| Branch | master |
| Standard | NASA-Grade L4 |

## Objective

Add LLM prose generation to scribe-engine with cache replay determinism.

## Deliverables

### Code (9 new files, 1218+ lines)

| File | Purpose |
|------|---------|
| src/providers/types.ts | ScribeProvider interface |
| src/providers/factory.ts | Provider factory (mock/llm/cache) |
| src/providers/mock-provider.ts | Mock provider (CI) |
| src/providers/llm-provider.ts | Claude API provider |
| src/providers/master-prompt.ts | 300+ line literary system prompt |
| src/providers/prompt-builder.ts | Scene context → prompt |
| src/providers/index.ts | Public exports |
| src/weaver-llm.ts | LLM weaver (scene-by-scene) |
| src/cli/scribe-llm.ts | Standalone CLI |

### Golden Runs

| Run | Story | Words | Paragraphs | Scenes | Time |
|-----|-------|-------|------------|--------|------|
| 001 | Le Gardien | 5543 | 143 | 9 | 285s |
| 002 | Le Choix | 1039 | 31 | 3 | 57s |

### Replay Proofs

| Run | LLM SHA256 | Cache SHA256 | Match |
|-----|-----------|-------------|-------|
| 001 | 0276C172E2E6... | 0276C172E2E6... | ✅ |
| 002 | 31595816794A... | 31595816794A... | ✅ |

### Provider Profiles

| Profile | Temperature | Determinism |
|---------|-------------|-------------|
| mock | N/A | Algorithmic |
| creative | 0.75 | Cache replay |
| deterministic | 0.0 | Cache replay + low variance |

## Commits

| Hash | Message |
|------|---------|
| cf7396b8 | feat(scribe): P.2-SCRIBE provider architecture + master prompt |
| 48e09d84 | feat(scribe): P.2-SCRIBE first LLM golden run — Le Gardien |
| 2ff24a91 | feat(scribe): P.2-SCRIBE golden runs + cache replay proof |
| 7e710be0 | proof(scribe): P.2-A cache replay proof run_002 complete |
| (pending) | docs(scribe): P.2-A sealed + SESSION_SAVE + tag |

## Calibration Notes

### M2 theme_fidelity (R-METRICS)
- Jaccard → Overlap coefficient fix applied in r-metrics-baseline-v1
- Run 001: 0.8515 WARN, Run 002: 0.9093 PASS

### Prose Quality (Subjective)
- French literary prose (Le Gardien: horror/isolation genre)
- Sensory immersion: 4+ senses per scene
- Rhythm variation: short/long sentence alternation
- Subtext: information withheld creates reader tension
- Opening hooks and closing echoes per scene

## What's Next: P.2-B

- ProsePack v1 strict JSON schema
- Constraint enforcer (word count, POV, tense, banned words)
- Fail-closed validation
- Prose-specific metrics
- Repair loop (max 2 passes)

## Invariants

| ID | Rule | Status |
|----|------|--------|
| INV-P2-01 | Cache replay byte-identical | ✅ |
| INV-P2-02 | LLM writes cache + hash | ✅ |
| INV-P2-03 | Mock = CI default | ✅ |
| INV-P2-04 | No SEALED packages modified | ✅ |
