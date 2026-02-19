# ART AUDIT REPORT — M BOTTLENECK DIAGNOSIS
# Date: 2026-02-19
# Auditor: Claude Code (IA Principal)
# Baseline: 798/798 tests PASS (sovereign-engine)
# Standard: NASA-Grade L4

---

## EXECUTIVE SUMMARY

**CRITICAL FINDING: M is a WEIGHTED ARITHMETIC SUM, not a geometric mean.**

```
M = ECC×0.33 + RCI×0.17 + SII×0.15 + IFI×0.10 + AAI×0.25
```

Source: `src/oracle/s-score.ts` lines 106-111, `src/config.ts` lines 388-393.

**SEAL requires ALL of:**
1. Composite M >= 93 (`ZONES.GREEN.min_composite`)
2. ALL axes >= 85 (`ZONES.GREEN.min_axis`)
3. ECC >= 88 (`MACRO_FLOORS.ecc`)
4. AAI >= 85 (`MACRO_FLOORS.aai`)

**Blocking condition (Run 01 — best run):**
- RCI = 82.13 < 85 floor --> **FLOOR FAIL**
- M = 91.58 < 93 --> **COMPOSITE FAIL**

**All ART modules (09-16): DONE, REAL, WIRED. No stubs. No missing integration.**
The problem is not missing code — it is scorer calibration.

---

## PART 1 — ART SPRINT STATUS (9 to 16)

| Sprint | Module | Status | Source Files | Tests | Wired Into | Key Insight |
|--------|--------|--------|-------------|-------|------------|-------------|
| ART-09 | Semantic Cortex | **DONE** | 8 files (~950 loc) | 7 files (43 tests) | ECC (emotion_coherence) | Real LLM, N-sample median, cache |
| ART-10 | Sentence Surgeon | **DONE** | 6 files (~500 loc) | 7 files (33 tests) | Polish loop (judgeAesthetic) | Real LLM rewriting, re-score guard |
| ART-11a | Authenticity | **DONE** | 3 files (~365 loc) | 2 files (4 tests) | AAI (40% weight) | Hybrid: CALC 60% + LLM 40% |
| ART-11b | Show-Dont-Tell | **DONE** | 2 files (~330 loc) | 1 file (5 tests) | AAI (60% weight) | Pure CALC: 30+ FR patterns |
| ART-12 | Metaphor Novelty | **DONE** | 3 files (~380 loc) | 2 files (7 tests) | SII (1.5 weight) | 500+ dead metaphors + LLM novelty |
| ART-13 | Voice Genome | **DONE** | 2 files (~450 loc) | 2 files (7 tests) | RCI (voice_conformity) | 10 params, pure CALC, drift scoring |
| ART-14 | Reader Phantom | **DONE** | 2 files (~460 loc) | 2 files (7 tests) | IFI (attention + fatigue) | Attention/fatigue/cognitive model |
| ART-15 | Phonetic Engine | **DONE** | 2 files (~690 loc) | 2 files (9 tests) | RCI (euphony_basic) | Cacophony + rhythm variation |
| ART-16 | Temporal Architect | **DONE** | 3 files (~630 loc) | 3 files (16 tests) | ECC (temporal_pacing) | Contract + foreshadowing detection |

**TOTAL: 31 source files, 28 test files, 131 tests. ALL REAL IMPLEMENTATIONS. ZERO STUBS.**

---

## PART 2 — M BOTTLENECK DIAGNOSIS

### 2.1 M Architecture

```
M = ECC×0.33 + RCI×0.17 + SII×0.15 + IFI×0.10 + AAI×0.25
    ^^^^^^^^    ^^^^^^^^    ^^^^^^^^    ^^^^^^^^    ^^^^^^^^
    33% wt      17% wt      15% wt      10% wt      25% wt
    floor 88    floor 85    floor 85    floor 85    floor 85
```

File: `src/oracle/s-score.ts:106-111`
Config: `src/config.ts:388-413`
Orchestrator: `src/oracle/aesthetic-oracle.ts:80-96`

### 2.2 Calibration Run 01 Breakdown (Best Run)

| Macro-Axis | Score | Weight | Contribution | Floor | Floor Pass |
|-----------|-------|--------|-------------|-------|------------|
| ECC | 91.34 | 0.33 | 30.14 | 88 | PASS |
| RCI | 82.13 | 0.17 | 13.96 | 85 | **FAIL** |
| SII | 90.54 | 0.15 | 13.58 | 85 | PASS |
| IFI | 100.00 | 0.10 | 10.00 | 85 | PASS |
| AAI | 95.60 | 0.25 | 23.90 | 85 | PASS |
| **M** | **91.58** | | | **93** | **FAIL** |

**Double failure**: RCI < 85 (floor) AND M < 93 (composite).

### 2.3 Macro-Axis Deep Dive

---

#### ECC (Emotional Control Core) — 33% weight, floor 88

**File**: `src/oracle/macro-axes.ts` lines 90-174

| Sub-Axis | Weight | Source | Method | ART Sprint |
|----------|--------|--------|--------|------------|
| tension_14d | 3.0 | `axes/tension-14d.ts` | CALC: 14D cosine similarity | Pre-ART |
| emotion_coherence | 2.5 | `axes/emotion-coherence.ts` | CALC: jump detection in 14D | ART-09 (indirect) |
| interiority | 2.0 | `axes/interiority.ts` | LLM: `provider.scoreInteriority()` | Pre-ART |
| impact | 2.0 | `axes/impact.ts` | LLM: `provider.scoreImpact()` | Pre-ART |
| physics_compliance | 0.0 | `axes/physics-compliance.ts` | CALC: informatif only | Omnipotent |
| temporal_pacing | 0.3-0.7 | `axes/temporal-pacing.ts` | CALC: dilatation + foreshadowing | **ART-16** |

**Formula**: `raw = weighted_sum / total_weight + bonus (capped +3)`
- Bonuses: entropy (+3), projection (+2), open-loop (+3) — hard cap +3 total

**ECC Status**: Range 85-94. Generally above floor 88. Not the bottleneck.

---

#### RCI (Rhythmic Control Index) — 17% weight, floor 85 -- PRIMARY BOTTLENECK

**File**: `src/oracle/macro-axes.ts` lines 365-528

| Sub-Axis | Weight | Source | Method | ART Sprint |
|----------|--------|--------|--------|------------|
| rhythm | 1.0 | `axes/rhythm.ts` | CALC: CV of sentence lengths | Pre-ART |
| signature | 1.0 | `axes/signature.ts` | CALC: signature word hits | Pre-ART |
| hook_presence | 0.20 | `macro-axes.ts:380` | CALC: symbol map hooks | Pre-ART |
| euphony_basic | 1.0 | `axes/euphony-basic.ts` | CALC: cacophony + variation | **ART-15** |
| voice_conformity | 1.0 | `axes/voice-conformity.ts` | CALC: voice genome drift | **ART-13** (optional) |

**Formula**: `rci_raw = weighted_sum / total_weight`
- Anti-metronomic penalty: -5 if too artificially perfect

**Why RCI = 76-82 (consistently < 85 floor):**

1. **hook_presence (wt 0.20)**: Returns 75 (neutral) if no hooks defined in symbol map.
   Most runs have no hooks, so this always scores 75. Low weight but adds drag.

2. **signature (wt 1.0)**: Requires >=30% signature word hit rate for full marks.
   The signature words come from ForgePacket. If the LLM-generated prose doesn't
   include enough signature words, this axis scores low. Score depends on word list
   relevance and prose content — often 60-80.

3. **voice_conformity (wt 1.0, OPTIONAL)**: Only computed if provider is available.
   Uses `measureVoice()` + `computeVoiceDrift()` from ART-13.
   If drift is high (>0.10), score drops significantly: score = (1 - drift) × 100.
   In live runs, style mismatch commonly produces scores of 70-85.

4. **rhythm (wt 1.0)**: CV-based scoring with multiple components.
   Needs CV 0.65 (optimal), length range >=20 words, opening variety.
   Well-varied literary prose scores 75-90.

5. **euphony_basic (wt 1.0)**: ART-15 phonetic engine.
   cacophony×0.6 + variation×0.4. French text commonly has some cacophony
   issues, scoring 70-85.

6. **Anti-metronomic penalty**: -5 if prose is "too perfect" rhythmically.
   Can push borderline scores below 85.

**RCI Weighted Example (run_01, reconstructed):**
```
rhythm       ≈ 82 × 1.0  = 82
signature    ≈ 75 × 1.0  = 75
hook_presence≈ 75 × 0.20 = 15
euphony      ≈ 80 × 1.0  = 80
voice_conf   ≈ 85 × 1.0  = 85 (if present)
                           ----
Total weight = 4.20
RCI_raw = 337 / 4.20 = 80.2
Anti-metronomic: -0 to -5
RCI_final ≈ 75-82
```

---

#### SII (Signature Integrity Index) — 15% weight, floor 85 -- HIGH VARIANCE

**File**: `src/oracle/macro-axes.ts` lines 534-579

| Sub-Axis | Weight | Source | Method | ART Sprint |
|----------|--------|--------|--------|------------|
| anti_cliche | 1.0 | `axes/anti-cliche.ts` | CALC: blacklist matching | Pre-ART |
| necessity | 1.0 | `axes/necessity.ts` | LLM: `provider.scoreNecessity()` | Pre-ART |
| metaphor_novelty | 1.5 | `axes/metaphor-novelty.ts` | HYBRID: LLM detection + CALC blacklist | **ART-12** |

**Formula**: `sii_raw = (anti_cliche×1.0 + necessity×1.0 + metaphor_novelty×1.5) / 3.5`

**Why SII = 68-91 (high variance):**

1. **necessity (wt 1.0, LLM)**: Fully delegated to `provider.scoreNecessity()`.
   No deterministic fallback. LLM variance directly impacts SII.
   Range: 60-95 depending on model mood.

2. **metaphor_novelty (wt 1.5, highest weight!)**: LLM-based metaphor detection.
   Uses semantic cache (1h TTL). If prose has few metaphors, returns neutral 70.
   Dead metaphor blacklist check is deterministic but LLM novelty scoring varies.
   Range: 50-95 depending on prose metaphoric richness.

3. **anti_cliche (wt 1.0, CALC)**: Deterministic blacklist.
   Clean prose: 100. Any cliche: -15 per match. Stable but low weight.

**SII collapse scenario (Run 15: SII = 68.06):**
If necessity=60 and metaphor_novelty=55: SII = (100×1.0 + 60×1.0 + 55×1.5) / 3.5 = 66.4

---

#### IFI (Immersion Force Index) — 10% weight, floor 85

**File**: `src/oracle/macro-axes.ts` lines 589-811

| Sub-Axis | Weight | Source | Method | ART Sprint |
|----------|--------|--------|--------|------------|
| sensory_richness | 0.25 | `macro-axes.ts:737` | CALC: 5 senses detection | Pre-ART |
| corporeal_anchoring | 0.25 | `macro-axes.ts:785` | CALC: body markers | Pre-ART |
| sensory_density | 0.25 | `axes/sensory-density.ts` | HYBRID: CALC 50% + LLM 50% | Pre-ART |
| attention_sustain | 0.125 | `axes/attention-sustain.ts` | CALC: phantom danger zones | **ART-14** |
| fatigue_management | 0.125 | `axes/fatigue-management.ts` | CALC: phantom fatigue zones | **ART-14** |

**IFI Status**: Scores 85-100 consistently. Distribution bonus helps.
Not the bottleneck — ART-14 phantom modules working well.

---

#### AAI (Authenticity & Art Index) — 25% weight, floor 85

**File**: `src/oracle/macro-axes.ts` lines 305-362

| Sub-Axis | Weight | Source | Method | ART Sprint |
|----------|--------|--------|--------|------------|
| show_dont_tell | 0.60 | `axes/show-dont-tell.ts` | CALC: 30+ patterns | **ART-11** |
| authenticity | 0.40 | `axes/authenticity.ts` | HYBRID: CALC 60% + LLM 40% | **ART-11** |

**Formula**: `aai_raw = show_dont_tell×0.60 + authenticity×0.40`

**AAI Status**: Scores 90-96. ART-11 modules performing well.
Not the bottleneck. Both modules are fully wired and producing strong scores.

---

### 2.4 Mathematical Path to SEAL

**Current state (Run 01 — best run):**
```
M = 91.34×0.33 + 82.13×0.17 + 90.54×0.15 + 100×0.10 + 95.6×0.25 = 91.58
min_axis = min(91.34, 82.13, 90.54, 100, 95.6) = 82.13 (RCI)
```
SEAL fails on: M < 93 AND RCI < 85.

**Scenario A: RCI reaches 90 (+8 points)**
```
M = 91.34×0.33 + 90×0.17 + 90.54×0.15 + 100×0.10 + 95.6×0.25 = 92.94
min_axis = 90
```
SEAL check: M=92.94 < 93 -> BARELY FAILS on composite.

**Scenario B: RCI reaches 92 (+10 points)**
```
M = 91.34×0.33 + 92×0.17 + 90.54×0.15 + 100×0.10 + 95.6×0.25 = 93.28
min_axis = 90.54
```
SEAL check: M=93.28 >= 93, min_axis=90.54 >= 85, ECC=91.34 >= 88 -> **SEAL PASS**

**Scenario C: RCI=88 AND SII=93 (+6 and +3 respectively)**
```
M = 91.34×0.33 + 88×0.17 + 93×0.15 + 100×0.10 + 95.6×0.25 = 93.04
min_axis = 88
```
SEAL check: M=93.04 >= 93, min_axis=88 >= 85 -> **SEAL PASS**

**Minimum viable improvement: RCI must reach >= 85 (floor) AND composite M >= 93.**

| Scenario | RCI Delta | SII Delta | M Result | SEAL |
|----------|----------|----------|---------|------|
| Current | +0 | +0 | 91.58 | FAIL |
| A: RCI+8 | +8 | +0 | 92.94 | FAIL (M<93) |
| B: RCI+10 | +10 | +0 | 93.28 | **PASS** |
| C: RCI+6, SII+3 | +6 | +3 | 93.04 | **PASS** |
| D: RCI+8, ECC+2 | +8 | +0 | 93.60 | **PASS** |

---

## PART 3 — PLAN OF ACTION

### 3.1 Quick Wins (No New Code — Calibration Only)

#### QW-1: Ensure voice_conformity is ALWAYS included in RCI
**File**: `src/oracle/macro-axes.ts` lines 397-400
**Issue**: voice_conformity is conditional — only added if provider is available.
In CALC-only mode (no provider), RCI is computed without voice_conformity,
reducing the denominator and potentially producing lower scores.
**Action**: Ensure voice_conformity always has a score (use measureVoice vs
target genome even without provider, since it's pure CALC).
**Impact**: +2 to +5 RCI points if voice_conformity scores well.

#### QW-2: Improve hook_presence neutral score
**File**: `src/oracle/macro-axes.ts` lines 380-388
**Issue**: Returns 75 (neutral) when no hooks defined. This drags RCI down.
Since hook_presence has low weight (0.20), impact is small but nonzero.
**Action**: Consider raising neutral to 85 (matches floor) or removing axis
when no hooks defined.
**Impact**: +0.5 to +1 RCI points.

#### QW-3: Review anti-metronomic penalty threshold
**File**: `src/oracle/macro-axes.ts` lines 406-433
**Issue**: -5 penalty if Gini=0.45 and syncopes+compressions at minimum.
This penalizes well-crafted prose.
**Action**: Verify calibration: is the penalty firing on live runs?
If so, consider narrowing the detection window.
**Impact**: +0 to +5 RCI points (only if penalty is active).

### 3.2 Medium Efforts (Scorer Calibration)

#### ME-1: Calibrate signature axis thresholds
**File**: `src/oracle/axes/signature.ts`
**Issue**: Requires >=30% signature word hit rate for full score.
LLM-generated prose may not match signature word lists well.
**Action**: Analyze actual hit rates in calibration runs.
If consistently low, relax threshold or improve signature word selection.
**Impact**: +3 to +8 RCI points.

#### ME-2: Stabilize SII by reducing LLM variance
**File**: `src/oracle/axes/necessity.ts`, `src/oracle/axes/metaphor-novelty.ts`
**Issue**: necessity (LLM) and metaphor_novelty (LLM) cause SII variance 68-91.
**Action**:
- Add deterministic fallback for necessity (CALC proxy v1)
- Increase semantic cache TTL for metaphor_novelty
- Consider N-sample averaging for LLM axes (like semantic-analyzer does)
**Impact**: SII floor raises from 68 to ~80, reduces outlier risk.

#### ME-3: Tune rhythm scoring weights
**File**: `src/oracle/axes/rhythm.ts`
**Issue**: Multiple components (CV, range, monotony, opening, breathing)
each contribute small amounts. A comprehensive review of which
components are too strict for literary French text could help.
**Action**: Analyze per-component scores on calibration corpus.
**Impact**: +2 to +5 rhythm points -> +0.5 to +1.2 RCI points.

### 3.3 Strategic (Architecture Changes)

#### ST-1: Replace S_score with GENIUS G in Q_text computation
**Issue**: Currently, calibration uses sovereign S_score as G in Q_text formula.
The GENIUS pipeline with D,S,I,R,V is complete but not wired into the
live calibration pipeline.
**Action**: Wire GENIUS computeGeniusMetrics() into the calibration pipeline
so Q_text = sqrt(M_sovereign × G_genius).
**Impact**: Proper GENIUS-level scoring; may improve or lower G depending
on individual DSIRV scores. R and V scorers need calibration first
(test thresholds R>40 vs spec R>80, V>60 vs spec V>80).

#### ST-2: Sovereign SEAL vs GENIUS SEAL alignment
**Issue**: Two separate SEAL verdicts exist:
- Sovereign: M >= 93, min_axis >= 85, ECC >= 88
- GENIUS: Q_text >= 93, M >= 88, G >= 92, individual floors
These can conflict. A run could pass sovereign SEAL but fail GENIUS SEAL.
**Action**: Decide which SEAL is authoritative. Document in SSOT.
**Impact**: Architectural clarity for SEAL achievement.

### 3.4 Priority Matrix

| Action | Effort | RCI Impact | M Impact | Priority |
|--------|--------|-----------|---------|----------|
| QW-1: Wire voice_conformity always | LOW | +2 to +5 | +0.3 to +0.9 | **P1** |
| QW-2: Hook neutral to 85 | LOW | +0.5 to +1 | +0.1 to +0.2 | P2 |
| QW-3: Anti-metronomic review | LOW | +0 to +5 | +0 to +0.9 | P2 |
| ME-1: Signature calibration | MEDIUM | +3 to +8 | +0.5 to +1.4 | **P1** |
| ME-2: SII stabilization | MEDIUM | (SII) | +0.5 to +1.5 | P2 |
| ME-3: Rhythm tuning | MEDIUM | +2 to +5 | +0.3 to +0.9 | P3 |
| ST-1: GENIUS G wiring | HIGH | — | (Q_text) | P3 |
| ST-2: SEAL alignment | LOW (docs) | — | — | P3 |

**Estimated combined impact of P1 actions: RCI +5 to +13 -> RCI 87-95 -> M 92.4-93.8**

---

## PART 4 — MODULE WIRING MAP

```
                    ┌─────────────────────┐
                    │   M COMPOSITE       │
                    │ s-score.ts:106-111  │
                    │ = weighted sum      │
                    └─────┬───────────────┘
          ┌───────────────┼───────────────┬──────────────┬──────────────┐
          ▼               ▼               ▼              ▼              ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐   ┌──────────┐  ┌──────────┐
   │ ECC 0.33 │    │ RCI 0.17 │    │ SII 0.15 │   │ IFI 0.10 │  │ AAI 0.25 │
   │ floor 88 │    │ floor 85 │    │ floor 85 │   │ floor 85 │  │ floor 85 │
   └────┬─────┘    └────┬─────┘    └────┬─────┘   └────┬─────┘  └────┬─────┘
        │               │               │              │              │
   ┌────┴────┐     ┌────┴────┐     ┌────┴────┐    ┌───┴────┐    ┌───┴────┐
   │tension  │     │rhythm   │     │anti_    │    │sensory │    │show_   │
   │14d  3.0 │     │     1.0 │     │cliche   │    │rich.   │    │dont_   │
   │emotion  │     │signature│     │1.0 CALC │    │0.25    │    │tell    │
   │coh. 2.5 │     │     1.0 │     │necessity│    │corpor. │    │0.60    │
   │interior │     │hook_pres│     │1.0  LLM │    │0.25    │    │ART-11  │
   │ity  2.0 │     │    0.20 │     │metaphor │    │sensory │    │authen- │
   │impact   │     │euphony  │     │novelty  │    │dens.   │    │ticity  │
   │     2.0 │     │     1.0 │     │1.5 LLM+ │    │0.25    │    │0.40    │
   │temporal │     │ART-15   │     │ART-12   │    │attent. │    │ART-11  │
   │pac. 0.5 │     │voice_   │     └─────────┘    │0.125   │    └────────┘
   │ART-16   │     │conf 1.0 │                    │ART-14  │
   └─────────┘     │ART-13   │                    │fatigue │
                   │(optional│                    │0.125   │
                   └─────────┘                    │ART-14  │
                                                  └────────┘
```

**ART Module Wiring Summary:**
- ART-09 (Semantic): -> emotion_coherence axis -> ECC (indirect, via 14D data)
- ART-10 (Surgeon): -> polish loop (not a scoring axis, but improves prose quality)
- ART-11 (Auth+SDT): -> show_dont_tell + authenticity axes -> AAI (25% of M)
- ART-12 (Metaphor): -> metaphor_novelty axis -> SII (1.5 weight)
- ART-13 (Voice): -> voice_conformity axis -> RCI (1.0 weight, optional)
- ART-14 (Phantom): -> attention_sustain + fatigue_management axes -> IFI (0.25 total)
- ART-15 (Phonetic): -> euphony_basic axis -> RCI (1.0 weight)
- ART-16 (Temporal): -> temporal_pacing axis -> ECC (0.3-0.7 weight)

**ALL 8 ART MODULES ARE WIRED. ZERO DISCONNECTED.**

---

## PART 5 — DETAILED MODULE AUDIT

### ART-09: Semantic Cortex — DONE

| File | Lines | Type | Function |
|------|-------|------|----------|
| `src/semantic/semantic-analyzer.ts` | 181 | REAL LLM | N-sample emotion analysis with median |
| `src/semantic/semantic-prompts.ts` | 95 | REAL | Plutchik 14D emotion prompts (FR) |
| `src/semantic/semantic-cache.ts` | 149 | REAL | In-memory TTL cache, SHA-256 keys |
| `src/semantic/emotion-contradiction.ts` | 144 | REAL CALC | Pairwise contradiction detection |
| `src/semantic/emotion-to-action.ts` | 204 | REAL CALC | 150+ emotion-to-action mappings |
| `src/semantic/semantic-aggregation.ts` | 90 | REAL CALC | Median aggregation, variance check |
| `src/semantic/semantic-validation.ts` | 95 | REAL CALC | 14-key validation, NaN rejection |
| `src/semantic/types.ts` | 135 | Types | Interfaces and config |

Tests: 7 files (semantic-analyzer, cache, contradiction, emotion-to-action, migration, validation, lint)

### ART-10: Sentence Surgeon — DONE

| File | Lines | Type | Function |
|------|-------|------|----------|
| `src/polish/sentence-surgeon.ts` | 349 | REAL LLM | provider.rewriteSentence() per phrase |
| `src/polish/re-score-guard.ts` | 154 | REAL | Dual-condition improvement validation |
| `src/polish/paragraph-patch.ts` | 177 | REAL LLM | Surgical paragraph rewriting |
| `src/polish/musical-engine.ts` | 109 | REAL | Monotony detection, rhythm fix |
| `src/polish/anti-cliche-sweep.ts` | 71 | REAL | Cliche detection + surgeon pass |
| `src/polish/signature-enforcement.ts` | 69 | REAL | Signature word injection |

Tests: 7 files (surgeon, re-score, paragraph-patch, polish-active, types, invariants, lint)

### ART-11: Authenticity & Show-Dont-Tell — DONE

| File | Lines | Type | Function |
|------|-------|------|----------|
| `src/authenticity/authenticity-scorer.ts` | 67 | HYBRID | CALC 60% + LLM 40% |
| `src/authenticity/ia-smell-patterns.ts` | 325 | REAL CALC | 15 IA smell patterns |
| `src/authenticity/adversarial-judge.ts` | 162 | REAL LLM | Adversarial fraud detection (cached) |
| `src/silence/show-dont-tell.ts` | 161 | REAL CALC | 30+ telling patterns (FR) |
| `src/silence/telling-patterns.ts` | 346 | REAL CALC | Pattern families with false-positive guards |

Tests: 3 files (ia-smell, adversarial-cache, show-dont-tell)

### ART-12: Metaphor Novelty + V3.1 — DONE

| File | Lines | Type | Function |
|------|-------|------|----------|
| `src/metaphor/metaphor-detector.ts` | 107 | REAL LLM | provider.generateStructuredJSON() |
| `src/metaphor/novelty-scorer.ts` | 76 | REAL | avg_novelty × (1 - dead_ratio) |
| `src/metaphor/dead-metaphor-blacklist.ts` | 637 | REAL CALC | 500+ dead metaphors, 9 categories |

Tests: 2 files (novelty-scorer, dead-metaphor-blacklist)

### ART-13: Voice Genome — DONE

| File | Lines | Type | Function |
|------|-------|------|----------|
| `src/voice/voice-genome.ts` | 289 | REAL CALC | 10-param voice extraction, drift |
| `src/voice/voice-compiler.ts` | 159 | REAL CALC | Constraint generation from genome |

Tests: 2 files (voice-genome 4 tests, voice-compiler 3 tests)

### ART-14: Reader Phantom — DONE

| File | Lines | Type | Function |
|------|-------|------|----------|
| `src/phantom/phantom-state.ts` | 198 | REAL CALC | Attention/fatigue/cognitive model |
| `src/phantom/phantom-runner.ts` | 260 | REAL CALC | Sentence-by-sentence traversal |

Tests: 2 files (phantom-state 4 tests, phantom-runner 3 tests)

### ART-15: Phonetic Engine — DONE

| File | Lines | Type | Function |
|------|-------|------|----------|
| `src/phonetic/cacophony-detector.ts` | 365 | REAL CALC | 6 cacophony types detected |
| `src/phonetic/rhythm-variation.ts` | 323 | REAL CALC | 5 monotony pattern types |

Tests: 2 files (cacophony 5 tests, rhythm-variation 4 tests)

### ART-16: Temporal Architect — DONE

| File | Lines | Type | Function |
|------|-------|------|----------|
| `src/temporal/temporal-contract.ts` | 204 | REAL CALC | Contract validation + factory |
| `src/temporal/temporal-scoring.ts` | 242 | REAL CALC | Dilatation + compression scoring |
| `src/temporal/foreshadowing-compiler.ts` | 181 | REAL CALC | Hook compilation + detection |

Tests: 3 files (temporal-contract 4 tests, scoring 5 tests, foreshadowing 7 tests)

---

## CONCLUSION

| Finding | Detail |
|---------|--------|
| M formula | Weighted sum (NOT geometric mean): ECC×0.33 + RCI×0.17 + SII×0.15 + IFI×0.10 + AAI×0.25 |
| ART modules | ALL 8 sprints DONE, REAL, WIRED into oracle |
| Primary blocker | RCI = 76-82, floor = 85 -> **always fails floor check** |
| Secondary blocker | SII variance 68-91 (LLM-dependent axes) |
| ECC, IFI, AAI | Above floor, not blocking |
| Root cause | Not missing code but **scorer calibration** (signature thresholds, voice_conformity optionality, hook_presence neutral 75) |
| Path to SEAL | RCI +10 points (82->92) alone gives M=93.28 -> SEAL |
| P1 quick wins | Wire voice_conformity always + calibrate signature thresholds |
| Estimated effort | 1-2 sessions for P1 quick wins |

**VERDICT: All code exists and is wired. SEAL requires RCI calibration, not new modules.**

---

Audited by: Claude Code (IA Principal)
Date: 2026-02-19
Baseline: 798/798 sovereign-engine tests PASS
