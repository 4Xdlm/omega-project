# P.2-B SCRIBE — Phase Documentation

## Overview

Phase P.2-B transforms raw LLM prose into auditable, contract-grade artifacts
with fail-closed constraint enforcement and quantitative prose metrics.

## ProsePack v1

Canonical prose artifact format. Every LLM prose output is normalized into
this schema before any consumer can read it.

### Schema Fields

```
ProsePack {
  meta:        { version, run_id, plan_id, model, provider_mode, temperature, ... }
  constraints: { pov, tense, banned_words, max_scenes, word_count_tolerance, ... }
  scenes[]:    { scene_id, paragraphs[], word_count, pov_detected, tense_detected,
                 sensory_anchor_count, dialogue_ratio, banned_word_hits, violations[] }
  score:       { schema_ok, constraint_satisfaction, hard_pass, soft_pass,
                 total_violations, hard_violations, soft_violations }
  total_words, total_sentences, total_paragraphs
}
```

## Constraint Model

### HARD (FAIL if violated)

| Rule | Check | Threshold |
|------|-------|-----------|
| word_count_range | Per-scene word count vs target | ±50% (calibration param) |
| banned_words | Zero banned words in prose | count = 0 |
| pov_conformity | Detected POV matches intent | exact match |
| tense_conformity | Detected tense matches intent | exact match |

### SOFT (WARN if violated)

| Rule | Check | Threshold |
|------|-------|-----------|
| sensory_anchors | Sensory patterns per scene | ≥ min_sensory_anchors_per_scene |
| dialogue_ratio | Dialogue % per scene | ≤ max_dialogue_ratio |
| forbidden_cliches | Cliché patterns in prose | count = 0 |

### Decision: word_count stays HARD
- Finding: LLM under-produces on high targets (900-1200 → 350-540)
- Remediation strategy (deferred to P.3): per-scene regen with explicit length enforcement
- Current tolerance: ±50% (calibration parameter, not magic constant)

## Prose Metrics (MP1-MP6)

| Metric | Name | Range | Weight |
|--------|------|-------|--------|
| MP1 | schema_valid | 0/1 | 0.15 |
| MP2 | constraint_satisfaction | 0..1 | 0.25 |
| MP3 | pov_tense_consistency | 0..1 | 0.20 |
| MP4 | lexical_diversity | 0..1 (Guiraud TTR) | 0.15 |
| MP5 | sensory_density | 0..1 (per 1000 words) | 0.10 |
| MP6 | dialogue_conformity | 0..1 | 0.15 |

Composite = weighted sum of MP1-MP6.

## Baseline Results

| Run | Story | Hard | Soft | Satisfaction | Composite |
|-----|-------|------|------|-------------|-----------|
| 001 | Le Gardien | 3 FAIL | 1 WARN | 0.917 | 0.960 |
| 002 | Le Choix | 0 | 0 | 1.000 | 1.000 |

## Files Added

```
packages/scribe-engine/src/prosepack/
├── types.ts      — ProsePack v1 type definitions
├── normalize.ts  — Raw ProseDoc → ProsePack (POV/tense/sensory/dialogue detection)
└── index.ts      — Public exports

packages/omega-metrics/src/metrics/prose.ts  — MP1-MP6 prose metrics
packages/omega-metrics/src/cli/prose-metrics.ts — Standalone CLI
```

## Deferred to P.3

- Repair loop (max 2 passes, format-only regen)
- Per-scene regen for word_count enforcement
- Style-emergence integration
