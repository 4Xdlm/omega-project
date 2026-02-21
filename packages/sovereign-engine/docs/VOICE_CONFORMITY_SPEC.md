# VOICE_CONFORMITY_SPEC.md

**Date**: 2026-02-21
**Status**: REFERENCE
**Invariant**: INV-VOICE-DRIFT-01

## Architecture

```
packet.style_genome.voice (VoiceGenome)  ← TARGET (10 params, [0,1])
          │
          ▼
measureVoice(prose) → VoiceGenome        ← MEASURED (10 params, [0,1])
          │
          ▼
computeVoiceDrift(target, measured, excludeParams)
          │
          ├── per_param: Record<param, |diff|>   ← ALL 10 logged
          ├── drift = √(Σ diff²_applicable / N_applicable)
          └── n_applicable = 10 - |excludeParams|
          │
          ▼
score = (1 - drift) × 100, clamp [0, 100]
```

## 10 Parameters

| # | Param | Method | FR-ok | Reliable | In drift |
|---|-------|--------|-------|----------|----------|
| 1 | phrase_length_mean | avg words/sentence, norm [5,40] | ✅ | ✅ | ✅ |
| 2 | dialogue_ratio | regex guillemets/tirets | ✅ | ❌ scene-dependent | ❌ |
| 3 | metaphor_density | keywords (comme, tel...) | partial | ❌ misses 75%+ | ❌ |
| 4 | language_register | ratio mots >3 syllabes | ✅ | ✅ | ✅ |
| 5 | irony_level | "negation + !" | ❌ | ❌ returns ~0 always | ❌ |
| 6 | ellipsis_rate | phrases <4 mots / total | ✅ | ✅ | ✅ |
| 7 | abstraction_ratio | suffixes FR (-tion, -ment...) | ✅ | ✅ | ✅ |
| 8 | punctuation_style | ratio punct expressive | ✅ | ✅ | ✅ |
| 9 | paragraph_rhythm | CV longueurs paragraphes | ✅ | ✅ | ✅ |
| 10 | opening_variety | premiers mots uniques / total | ✅ | ✅ | ✅ |

## Excluded Params (NON_APPLICABLE_VOICE_PARAMS)

### irony_level — BROKEN
Heuristic: count(negation + "!") / sentences.
Reality: French irony uses "bien sûr", "évidemment", "comme par hasard", guillemets ironiques.
Measured: ~0.02 always. Target: 0.20. Permanent diff: 0.18.
**Fix (future)**: Replace with FR irony markers + incongruence detection.

### metaphor_density — BROKEN
Heuristic: count(comme|tel|semblable|ressembl...) / sentences.
Reality: Misses nominale metaphors ("X est un Y"), champs lexicaux, personification.
Measured: ~0.10 for rich prose. Target: 0.40. Permanent diff: 0.30.
**Fix (future)**: Expand to copula constructions + field-based detection.

### dialogue_ratio — SCENE-DEPENDENT
Heuristic: lines with guillemets / total lines.
Reality: Narrative scenes = 0% dialogue by design.
Measured: 0.0 for narrative. Target: 0.30. Permanent diff: 0.30.
**Fix (future)**: Condition on scene type (scene.has_dialogue flag).

## Drift Calculation

Before: `drift = √(Σ diff² / 10)` — all 10 params equal weight
After:  `drift = √(Σ diff²_applicable / 7)` — 3 broken params excluded

Expected impact: drift drops ~0.40 → ~0.20, score jumps ~60 → ~80.

## Failure Modes

| Mode | Symptom | Cause |
|------|---------|-------|
| No genome in packet | score=70 (neutral) | Missing style_genome.voice |
| All params at target | score=100 | Perfect conformity |
| LLM ignores genome | score~70-80 | Prompt not actionable enough |
| Scorer broken | score~60 fixed | Heuristic returns wrong value |
