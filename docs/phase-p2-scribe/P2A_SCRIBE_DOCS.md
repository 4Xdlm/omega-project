# P.2-A SCRIBE — Phase Documentation

## Overview

Phase P.2-A adds LLM prose generation to scribe-engine, producing publication-quality
literary prose from Genesis plan skeletons.

## Architecture

```
IntentPack → genesis-planner (plan) → scribe-engine (skeleton → LLM prose)
                                          ↓
                                    ScribeProvider
                                    ├── mock (CI default, deterministic)
                                    ├── llm (creative T=0.75, writes cache)
                                    └── cache (replay, byte-identical)
```

## Provider Profiles

| Profile | Temperature | Use Case | Determinism |
|---------|-------------|----------|-------------|
| `mock` | N/A | CI, unit tests | Byte-identical (algorithmic) |
| `creative` | 0.75 | Quality prose generation | Via cache replay |
| `deterministic` | 0.0 | Stable baseline | Via cache replay + low variance |

Cache replay is the source of truth for determinism in all LLM modes.

## Master Prompt

The system prompt (`master-prompt.ts`) is 300+ lines of literary engineering:
- 7 Supreme Laws (show don't tell, earn every sentence, subtext, sensory architecture, rhythm, info asymmetry, the unsaid)
- Anti-patterns kill list (filter words, lazy constructions, emotional telling)
- Pivot beat handling (rhythm change, isolation, sensory shift)
- Sensory anchor protocol (appear → transform → echo)
- Position-aware generation (opening hook, final echo)
- Bilingual (French/English based on story context)

## Files Added

```
packages/scribe-engine/src/
├── providers/
│   ├── types.ts            — ScribeProvider interface
│   ├── factory.ts          — createScribeProvider(config)
│   ├── mock-provider.ts    — Mock (CI default)
│   ├── llm-provider.ts     — Claude API (execSync, cache)
│   ├── master-prompt.ts    — 300+ line literary system prompt
│   ├── prompt-builder.ts   — Scene context extraction
│   └── index.ts            — Public exports
├── weaver-llm.ts           — LLM weaver (scene-by-scene)
└── cli/
    └── scribe-llm.ts       — Standalone CLI
```

## CLI Usage

```bash
# Mock mode (CI)
npx tsx src/cli/scribe-llm.ts --run <golden_dir> --out <output_dir> --mode mock

# LLM mode (creative)
ANTHROPIC_API_KEY=sk-... npx tsx src/cli/scribe-llm.ts --run <golden_dir> --out <output_dir> --mode llm

# Cache replay
npx tsx src/cli/scribe-llm.ts --run <golden_dir> --out <output_dir> --mode cache --cache-dir <cache_dir>
```

## Golden Runs

| Run | Story | Words | Paragraphs | Scenes | Time | Replay SHA256 |
|-----|-------|-------|------------|--------|------|---------------|
| 001 | Le Gardien | 5543 | 143 | 9 | 285s | 0276C172E2E6... ✅ |
| 002 | Le Choix | 1039 | 31 | 3 | 57s | 31595816794A... ✅ |

## Invariants

| ID | Rule | Status |
|----|------|--------|
| INV-P2-01 | Cache replay = byte-identical | ✅ Proven (SHA256) |
| INV-P2-02 | LLM run writes cache + hash | ✅ .cache/ directory |
| INV-P2-03 | Mock mode = CI default | ✅ No API key needed |
| INV-P2-04 | No SEALED packages modified | ✅ Only new files |

## What P.2-A Does NOT Include (deferred to P.2-B)

- ProsePack v1 schema validation
- Constraint enforcer (word count, POV/tense, banned words)
- Fail-closed hard rules
- Repair loop (max 2 passes)
- Prose-specific metrics module
