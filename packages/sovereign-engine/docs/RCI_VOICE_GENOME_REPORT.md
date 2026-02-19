# RCI Voice Genome Fix — Live Proof Report

**Date**: 2026-02-20
**Provider**: anthropic / claude-sonnet-4-20250514
**Runs**: 5 (reduced from 20 — 22 min/run pipeline)

## Fix Applied

- `golden-loader.ts`: VoiceGenome injected in `buildStyleProfile()` via `buildVoiceGenome()`
- **Option used: A (partial mapping)** — 4 fields mapped deterministically from intent.json genome, 6 use defaults
  - `phrase_length_mean` ← normalize(`target_avg_sentence_length`, 5, 40)
  - `dialogue_ratio` ← `target_dialogue_ratio` (clamped [0,1])
  - `language_register` ← `target_lexical_richness` (clamped [0,1])
  - `paragraph_rhythm` ← `target_burstiness` (clamped [0,1])
  - 6 remaining fields use `DEFAULT_VOICE_GENOME` values

**Justification**: 4 fields have direct semantic equivalents in intent.json genome. Remaining 6 have no mappable source.

## Test Results

- **805/805 tests pass** (802 existing + 3 new VOICE-INJECT tests)
- VOICE-INJECT-01: `loadGoldenRun()` returns packet with `style_profile.voice` defined
- VOICE-INJECT-02: voice genome has 10 fields, all in [0, 1]
- VOICE-INJECT-03: `scoreVoiceConformity()` returns score != 70 when voice defined

## Baseline (5 runs BEFORE fix — seeds 1-5)

| Seed | RCI | M | Q_text |
|------|-----|---|--------|
| 1 | 82.13 | 91.73 | 91.66 |
| 2 | 78.68 | 88.16 | 88.80 |
| 3 | 78.46 | 87.93 | 87.99 |
| 4 | 85.02 | 88.80 | 88.99 |
| 5 | 76.28 | 87.02 | 87.17 |

**Baseline Stats (seeds 1-5):** RCI mean=80.11, median=78.68, min=76.28, max=85.02

## Post-Fix (5 runs AFTER fix — seeds 1-5)

| Seed | RCI | M | Q_text | ECC | SII | IFI | AAI | ΔRCI |
|------|-----|---|--------|-----|-----|-----|-----|------|
| 1 | 80.40 | 89.32 | 89.38 | 90.61 | 83.87 | 99.82 | 93.20 | -1.73 |
| 2 | 79.86 | 89.88 | 90.09 | 91.28 | 86.43 | 97.37 | 95.60 | +1.18 |
| 3 | 79.11 | 87.97 | 88.06 | 86.75 | 84.18 | 95.39 | 95.60 | +0.65 |
| 4 | 80.82 | 88.53 | 88.44 | 86.27 | 81.59 | 100.00 | 95.60 | -4.20 |
| 5 | 77.23 | 88.14 | 88.82 | 92.64 | 85.13 | 91.33 | 95.60 | +0.95 |

**Post-Fix Stats:** RCI mean=79.48, median=79.86, σ=1.26, min=77.23, max=80.82

**Mean ΔRCI = -0.63** (net negative)

## Exit Criteria

| Criterion | Target | Actual | PASS/FAIL |
|-----------|--------|--------|-----------|
| RCI median ≥ 85 | ≥ 85 | 79.86 | **FAIL** |
| RCI min ≥ 80 | ≥ 80 | 77.23 | **FAIL** |
| Count(RCI ≥ 85) ≥ 75% | ≥ 75% | 0/5 (0%) | **FAIL** |
| Q_text max ≥ 93 | ≥ 93 | 90.09 | **FAIL** |
| Zero test regression | 805/805 | 805/805 | **PASS** |

## VERDICT: FAIL

## Root Cause Analysis

The voice genome injection correctly wires `VoiceGenome` into the ForgePacket's `style_profile`. The `voice_conformity` scorer now computes actual drift (instead of returning neutral 70). However:

1. **Before fix**: `voice_conformity` returned **70** (neutral) because `style_genome.voice` was undefined
2. **After fix**: `voice_conformity` computes **actual drift** between target genome and measured prose genome
3. **Problem**: The LLM-generated prose does not naturally match the specified voice genome targets. The computed voice_conformity scores are **variable but not consistently above 70**.
4. **Net effect**: RCI is statistically unchanged (mean ΔRCI = -0.63, within noise)

## Recommended Next Steps

The wiring fix is correct but insufficient alone. To raise RCI to ≥85, the following are needed:

1. **Prompt injection**: Include voice genome targets in the LLM generation prompt so the model can aim for specific stylistic parameters (dialogue ratio, sentence length, etc.)
2. **Target calibration**: Measure the LLM's natural voice profile and adjust the target genome to be achievable
3. **Weight adjustment**: Review `voice_conformity` weight in RCI calculation — currently weight=1.0, which may disproportionately penalize

The bottleneck is NOT the wiring — it's that the LLM has no awareness of voice genome targets during generation.

## Evidence

- Run JSONs: `nexus/proof/rci_voice_genome_20/2026-02-19T22-01-37-450Z/run_{01..05}.json`
- Tests: 805/805 pass (`npx vitest run`)
- Baseline: `nexus/proof/omnipotent_live_calibration_v2/2026-02-19T05-02-18-098Z/`
