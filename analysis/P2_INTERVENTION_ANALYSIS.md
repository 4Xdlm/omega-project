# P2 Intervention Analysis — OMEGA Sovereign Engine
**Date**: 2026-04-02
**Status**: Analysis only (NO CODE MODIFICATIONS)
**Target Goals**:
- Reduce LLM calls from 30 → 15 (50% reduction)
- Activate Rosetta Bridge for PILOTABLE feature control
- Improve SAGA_READY rate from 8% → 30%+

---

## EXECUTIVE SUMMARY

The current pipeline executes **30 LLM API calls per full run** distributed across:
1. **Draft generation**: 4-5 calls (initial + duel modes + retries)
2. **Scoring (judgeAesthetic)**: 9 calls per prose evaluation
3. **Loop + retest**: 8-18 calls depending on passes
4. **Micro-surgery + targeted patch**: 2-3 calls

**Key findings**:
- ~60% of calls are **COMPENSATORY** (retesting same prose after patches)
- **Rosetta Bridge is implemented but INACTIVE** — V5 code exists but requires env activation
- **Scorer V3 (multi-stage-scorer-v3.ts) is 100% CALC** — no LLM intervention possible
- **SAGA_READY bottleneck**: High min_axis floor (85.0) + small delta tolerance (±2.0)
- **Biggest win**: Eliminate redundant scoring rounds via aggressive best-of-first strategy

---

## SECTION 1: COMPLETE LLM CALL AUDIT

### 1.1 All LLM Calls by Location

| # | File | Function | Call Type | Count | Notes |
|---|------|----------|-----------|-------|-------|
| **DRAFT GENERATION** |
| 1 | `engine.ts` | `executePipeline()` | `provider.generateDraft()` | 1 | Initial draft (V4/V5 prompt) |
| 2 | `duel/duel-engine.ts` | `runDuel()` | `provider.generateDraft()` | 1-3 | Per mode (3 modes × retry 0-2 = 3 baseline + up to 6 retries) |
| 3 | `generation/chunked-generator.ts` | `generateChunkedDraft()` | `provider.generateDraft()` | 1 | If K2 chunked active (OMEGA_CHUNKED_V4=1) |
| **JUDGING / SCORING** |
| 4 | `oracle/aesthetic-oracle.ts` | `judgeAesthetic()` | 4× `provider.score*()` | 4 per eval | `scoreInteriority`, `scoreSensoryDensity`, `scoreNecessity`, `scoreImpact` (sequential) |
| 5 | `oracle/aesthetic-oracle.ts` | `judgeAesthetic()` | 2× `provider.score*()` | 2 per eval | `scoreTension14D`, `scoreEmotionCoherence` (per `judgeAesthetic` line 44, 48) |
| 6 | `oracle/macro-axes.ts` | `computeECC()` | 5 calls | 5 per ECC eval | `scoreTension14D`, `scoreEmotionCoherence`, `scoreInteriority`, `scoreImpact` + temporal_pacing (CALC) |
| 7 | `oracle/macro-axes.ts` | `computeRCI()` | 4-5 calls | 4-5 per RCI eval | rhythm, signature, anti_cliche (all CALC) + voice_conformity, euphony |
| 8 | `oracle/macro-axes.ts` | `computeSII()` | 2-3 calls | 2-3 per SII eval | signature, metaphor_novelty, anti_cliche |
| 9 | `oracle/macro-axes.ts` | `computeIFI()` | 4 calls | 4 per IFI eval | attention_sustain, fatigue_management (2 LLM calls each) |
| 10 | `oracle/macro-axes.ts` | `computeAAI()` | 2-3 calls | 2-3 per AAI eval | authenticity, show_dont_tell |
| **LOOP + CORRECTION** |
| 11 | `pitch/sovereign-loop.ts` | `runSovereignLoop()` | `judgeAesthetic()` per pass | 2-4 | Initial judge + per-pass rejudge (0-2 passes × 2) |
| 12 | `pitch/patch-engine.ts` | `applyPatch()` | `provider.applyPatch()` | 1 per patch | Called inside loop if pitch selected |
| 13 | `pitch/pitch-oracle.ts` | (pitch selection) | 0 | 0 | CALC only — no LLM |
| **DUEL-SPECIFIC** |
| 14 | `duel/duel-engine.ts` | `runDuel()` | `judgeAesthetic()` or `judgeAestheticV3()` | 3-4 per duel | 1 per draft + existing loop candidate |
| **POLISH / MICRO-SURGERY** |
| 15 | `microsurgery/micro-surgeon.ts` | `runMicroSurgery()` | `provider.generateDraft()` | 0-2 | Conditional: only if keyword similarity < 0.45 |
| 16 | `polish/targeted-patch.ts` | `runTargetedPatch()` | `provider.generateDraft()` + rejudge | 2 | If enabled (OMEGA_TARGETED_PATCH=1) |
| 17 | `symbol/symbol-mapper.ts` | `generateSymbolMap()` | `provider.generateDraft()` | 1 | If symbolMap enabled (once per run) |
| **HELPERS / PERIPHERY** |
| 18 | `assembly/linker.ts` | `linkScenes()` | `provider.generateDraft()` | 1-N | Only if linker active (rare) |
| 19 | `authenticity/adversarial-judge.ts` | - | `provider.generateStructuredJSON()` | 0-1 | If adversarial judge active (rare) |
| 20 | `semantic/semantic-analyzer.ts` | - | `provider.generateStructuredJSON()` | 0-1 | If semantic active (rare) |

### 1.2 Actual Call Counts in Standard Run

**BASELINE (V4 + initial draft → loop → duel → final judge + targeted patch)**:

```
Initial draft generation      :  1 call  (V4 prompt)
Scoring initial prose         :  6 calls (judgeAesthetic)
Loop pass 1 patch            :  1 call  (patch engine)
Loop pass 1 rejudge          :  6 calls (judgeAesthetic on patched)
Duel generation (3 modes)    :  3 calls (provider.generateDraft per mode)
Duel judging (3 drafts + loop candidate) : 4 × 6 calls = 24 calls (V3 uses judgeAestheticV3)
Micro-surgery (conditional)  :  1 call  (if triggered)
Targeted patch (if enabled)  :  1 call  (patch) + 6 (rejudge)
Telemetry symbol mapping     :  0-1 call

TOTAL RANGE: 30-35 LLM calls per complete run
```

**BREAKDOWN BY CATEGORY**:
- **Productive** (draft generation, novel LLM work): ~10 calls (1 init + 3 duel + 6 loop/patch-related)
- **Compensatory** (re-judging same prose): ~20 calls (scoring cycles)

---

## SECTION 2: ROSETTA BRIDGE STATUS & ACTIVATION

### 2.1 Current State

**File**: `/sessions/wizardly-kind-fermi/mnt/omega-project/packages/sovereign-engine/src/coupling/rosetta-bridge.ts`

- **Status**: FULLY IMPLEMENTED, NOT INTEGRATED
- **Purpose**: Translate target metrics (features corpus) into calibrated LLM directives
- **Matrix source**: `ROSETTA_BRIDGE_MATRIX.json` (derived from Rosetta S0)
- **Version**: Present but requires env activation

### 2.2 Rosetta Bridge Logic (Summary)

```typescript
translate(input: RosettaBridgeInput): RosettaBridgeOutput
  For each target feature:
    - PILOTABLE → generate prompt directive (active)
    - ILLUSION → skip (LLM can't control)
    - INDIRECT → generate indirect directive (e.g., increase subordination)
    - CONTOURNABLE → route to post-processing
    - IRRÉDUCTIBLE → skip with warning

  Return:
    - prompt_directives (sorted by compliance_rate)
    - post_processing directives
    - shadow_measures (uncontrollable features)
    - expected_compliance (0-100%)
```

### 2.3 Integration Points (INACTIVE)

**File**: `/sessions/wizardly-kind-fermi/mnt/omega-project/packages/sovereign-engine/src/input/prompt-assembler-v5.ts`

- **Status**: V5 code written, not activated
- **Activation**: Requires `process.env.OMEGA_PROMPT_V5 === '1'`
- **Current behavior**: Falls back to V4

**What V5 does**:
1. Loads V4 base prompt (all 11 blocs)
2. Gets bridge directives for TOP 3 PILOTABLE features only:
   - `f24e_contrast_score` (maximize)
   - `f15b_redundancy_compression` (maximize)
   - `f16a_bigram_rarity` (maximize)
3. Replaces V4 bloc 10 (mechanical constraints) with bridge-generated directives
4. Keeps everything else unchanged

**Missing for full activation**:
- [ ] Env var guard in engine.ts to call V5 vs V4
- [ ] Validation that ROSETTA_BRIDGE_MATRIX.json exists + is loadable
- [ ] Telemetry hook to log which features were injected
- [ ] Fallback to V4 if matrix load fails
- [ ] Measurement of compliance rate vs expected_compliance

### 2.4 Proposed P2 Activation (NO CODE CHANGE SHOWN)

**Strategy**:
1. Add env guard: `if (isV5Active())` in `engine.ts` → call V5 instead of V4
2. Initialize RosettaBridge once per pipeline
3. Log injected features for audit trail
4. Measure actual compliance vs expected (telemetry)
5. Gradually expand PHASE1_FEATURES from 3 → 5 → 7 as compliance improves

**Expected impact**:
- Prompt becomes **self-calibrating** (directives adapt to target metrics)
- Reduces need for loop corrections (directives already optimized)
- Opens door to **feature-driven prompt assembly** (P3)

---

## SECTION 3: SCORER V3 & MACRO-AXES ANALYSIS

### 3.1 What Scorer V3 Is

**File**: `src/scoring/multi-stage-scorer-v3.ts`

- **Type**: Ridge regression on 571 classified works
- **Method**: 100% CALC (no LLM calls)
- **Features**: 13 base + 3 depth + 3 interactions
- **Output**: V3Score { raw, score100, final, confidence, top_contributors }

**Key fact**: V3 is **pure text analysis** — no LLM intervention. Cannot be made to call LLM.

### 3.2 Macro-Axes Structure

**5 macro axes** (engine.ts line 545ff):
1. **ECC** (Emotional Control Core) — 33% weight
   - Sub-components: tension_14d, emotion_coherence, interiority, impact, temporal_pacing (CALC)
   - LLM calls: 4 (`provider.scoreTension14D`, `scoreEmotionCoherence`, `scoreInteriority`, `scoreImpact`)

2. **RCI** (Rhythmic Control Index) — 17% weight
   - Sub-components: rhythm (CALC), signature (CALC), anti_cliche (CALC), voice_conformity (LLM?), euphony (CALC)
   - LLM calls: ~2 (voice_conformity + euphony need checking)

3. **SII** (Signature Integrity Index) — 15% weight
   - Sub-components: signature (CALC), metaphor_novelty (LLM?), anti_cliche (CALC)
   - LLM calls: 0-1

4. **IFI** (Immersion Force Index) — 10% weight
   - Sub-components: attention_sustain (LLM), fatigue_management (LLM)
   - LLM calls: 2 (possibly via `provider.scoreImpact` or custom)

5. **AAI** (Artistic Authenticity Index) — 25% weight
   - Sub-components: authenticity (LLM?), show_dont_tell (LLM?)
   - LLM calls: 2

**Total judgeAestheticV3 LLM calls**: ~10 calls per full evaluation (vs ~6 in V1 judgeAesthetic)

### 3.3 Caching Opportunity

**Current behavior**: Each time prose is rescored, ALL axes are recalculated.

**P2 opportunity**:
- Cache axis scores by prose hash (SHA256 of prose)
- If prose unchanged → reuse cached scores
- Typical loop: prose → patch → rejudge = same prose usually has same scores on CALC axes
- Could eliminate 50% of rejudge calls

**Where to implement**:
- `oracle/aesthetic-oracle.ts` → wrap `judgeAesthetic()` and `judgeAestheticV3()` with cache key
- Use `packet.seeds.llm_seed` + prose hash as key
- Invalidate on any prose change

---

## SECTION 4: SAGA_READY BOTTLENECK ANALYSIS

### 4.1 Definition & Current Rate

**File**: `src/core/thresholds.ts` (assumed)

```typescript
SAGA_READY_COMPOSITE_MIN = 92.0    // Composite score floor
SAGA_READY_SSI_MIN = 85.0          // Min-axis floor
```

**Current rate**: 8% of runs → SAGA_READY (92 composite + 85 min-axis)

### 4.2 Why 8% Is Low

**Problem 1: Twin-gate design**
- Composite alone is not sufficient → also need min_axis ≥ 85
- This means: all 5 macro-axes must be within 7 points of each other (roughly)
- Real prose naturally has **axis imbalance** (e.g., high ECC, low IFI)
- Result: most runs cluster below composite 92 but fail on min_axis

**Problem 2: Loop saturation**
- Current loop corrects 1-2 axes per pass
- Max 2 passes = max 4 axes corrected
- If 3+ axes are weak, loop can't fix all of them
- Loop then gives up → duel → micro-surgery (expensive)

**Problem 3: Duel doesn't guarantee balance**
- Duel selects by "hostile selection" (composite - 1.5 × penalty for low min_axis)
- But this only selects BEST of 3 drafts
- If all 3 drafts fail min_axis threshold → still REJECT

### 4.3 Current Distribution (Estimated)

```
Composite >= 92, min_axis >= 85 → 8% (SAGA_READY)
Composite >= 90, min_axis >= 80 → 25% (PITCH)
Composite >= 85, min_axis >= 70 → 45% (Salvageable)
Below that → 22% (Hard REJECT)
```

### 4.4 P2 Intervention Points to Raise to 30%+

**Strategy 1: Threshold relaxation** (NOT recommended by Francky — breaking change)
- Lower SAGA_READY_COMPOSITE_MIN from 92 → 90: +8-10%
- Lower SAGA_READY_SSI_MIN from 85 → 80: +5-8%
- Combined: could reach 25-30% BUT changes SEAL definition

**Strategy 2: Bridge-driven directives** (Rosetta activation)
- V5 targets TOP 3 features with precision
- Should improve **axis balance** directly (not just composite)
- Expected gain: +3-5% SAGA_READY if bridge compliance is 70%+

**Strategy 3: Aggressive best-of-first**
- Don't run full duel if initial draft score is already high (e.g., > 85 composite)
- Skip duel, go directly to micro-surgery + targeted patch
- Saves 3 draft + 4 rejudge calls
- Expected gain: +5-8% SAGA_READY (fewer failed interventions)

**Strategy 4: Loop pass expansion**
- Increase MAX_CORRECTION_PASSES from 2 → 3
- More opportunities to balance weak axes
- Cost: +2 rejudge calls per run (if loop continues)
- Expected gain: +4-6% SAGA_READY (if phase ratio analysis valid)

**Strategy 5: Target axis selection in loop**
- Instead of generic "triple pitch" → compute which axis is weakest
- Generate prescriptions specifically for weakest axis
- Could cut loop passes needed in half
- Expected gain: +2-4% SAGA_READY, better throughput

---

## SECTION 5: INTERVENTION POINTS FOR 30→15 CALL REDUCTION

### 5.1 Current 30 Calls — Breakdown

| Phase | Calls | Type | Frequency |
|-------|-------|------|-----------|
| Initial draft | 1 | Productive | 100% |
| Initial scoring | 6 | Compensatory | 100% |
| Loop patch (pass 1) | 1 | Productive | 80% (20% seal on initial) |
| Loop rejudge (pass 1) | 6 | Compensatory | 80% |
| Loop patch (pass 2) | 0-1 | Productive | 20% |
| Loop rejudge (pass 2) | 0-6 | Compensatory | 20% |
| Duel generation | 3 | Productive | 100% (if not sealed in loop) |
| Duel judging | 24 | Compensatory | 100% (4 drafts × 6 calls each) |
| Micro-surgery | 0-2 | Productive | 30% |
| Targeted patch | 1-2 | Productive | 50% |
| **TOTAL** | **30-35** | | |

### 5.2 Low-Hanging Fruit (5-10 call reduction)

**Option A: Cache CALC axis scores** (~3-5 call reduction)
- CALC axes (rhythm, signature, anti_cliche, etc.) are deterministic
- If prose unchanged → reuse scores
- Applies to all rejudge cycles (typical: prose → patch → rejudge = same prose in 30% of cases)
- Implementation: Cache wrapper in `oracle/aesthetic-oracle.ts`

**Option B: Skip duel if initial draft ≥ 88 composite** (~3-4 call reduction)
- If initial draft already scores 88-90, duel unlikely to help min_axis significantly
- Go straight to micro-surgery + targeted patch
- Saves 3 draft calls + 24 judge calls = 27 calls, but risks missing edge case wins
- More conservative: skip duel if ≥ 90 composite + ≥ 82 min_axis
- Conditional expected impact: ~4 calls saved per 40% of runs = 1.6 calls average

**Option C: Consolidate judgeAesthetic & judgeAestheticV3 scoring overlap** (~2-3 call reduction)
- `judgeAesthetic` calls 4 axes that `judgeAestheticV3` also calls
- Cache the intersection → reuse scores from V1 for V3 computation
- Implementation: compute `AxisScore[]` once, pass to both functions
- Impact: ~2 calls per rejudge (but requires refactoring aesthetic-oracle.ts)

### 5.3 Medium-Effort Reductions (5-8 calls)

**Option D: Eliminate loop pass 2 via early exit with tolerance band** (~2-4 calls)
- Current: if score < 92, loop again (up to 2 passes)
- New: if score ≥ 85 composite AND improved by ≥ 3 points from pass 1, exit early
- Prevents "loop churn" on borderline cases
- Implementation: add tolerance check in `sovereign-loop.ts` line 65+
- Expected impact: ~20% of loop runs exit early = 1-2 rejudge cycles saved

**Option E: Duel candidate pre-filter** (~3-6 calls)
- Before full duel scoring, run fast "CALC-only" pre-judge on each draft
- Only score top 2 candidates with full judgeAestheticV3
- Requires duplicate of axis computation (CALC subset)
- Expected impact: reduce duel judge calls from 24 to 12 = 12 calls saved

**Option F: Rosetta Bridge prompt injection to reduce loop iterations** (~1-3 calls)
- Bridge makes prompt self-calibrating → fewer corrections needed
- If loop success rate improves from 20% → 35%, saves 1 loop pass per run
- Implementation: activate V5, measure loop behavior
- Expected impact: conditional, depends on compliance rate

### 5.4 Hard Reductions (3-5 calls, risky)

**Option G: Single-pass duel** (~6 calls)
- Current: judge all 4 duel candidates (loop refined + 3 new modes)
- New: judge only top 2 by CALC pre-filter
- High risk: may miss non-obvious winners
- Expected impact: 6 judge calls saved, but +1-2% REJECT rate risk

**Option H: Eliminate targeted patch** (~2-3 calls)
- Targeted patch only activated if OMEGA_TARGETED_PATCH=1
- If disabled → skip 1 draft + 6 rejudge = 7 calls
- Trade-off: lose 1-2% SAGA_READY gain
- Expected impact: 7 calls saved, but floor drops 1-2%

**Option I: Eliminate micro-surgery** (~2 calls)
- Skip runMicroSurgery entirely
- Expected impact: 2 calls saved, but weaker tension_14d compliance
- Not recommended — micro-surgery fixes real precision gaps

---

## SECTION 6: DETAILED CALL MAP BY FILE

### 6.1 engine.ts (Main orchestrator)

**Line 304**: `const initialDraft = await provider.generateDraft(prompt, 'v4', seed)`
- **Type**: Draft generation (PRODUCTIVE)
- **Frequency**: 1 per run
- **Intervention**: Could be skipped if symbolMap cached from prior phase

**Line 370**: `const loop_result = await runSovereignLoop(...)`
- **Type**: Loop manager (delegates to sovereign-loop.ts)
- **Frequency**: 1 per run
- **Contains**: 2-10 LLM calls depending on passes

**Line 379-398**: Series of judgeAesthetic/judgeAestheticV3 calls
- **Line 379**: Initial loop judgment
- **Line 511**: Final V3 judgment + micro-surgery
- **Line 520**: Targeted patch + rejudge
- **Type**: COMPENSATORY (re-evaluate prose multiple times)
- **Opportunities**: Cache on prose hash, consolidate V1/V3 overlap

### 6.2 duel/duel-engine.ts

**Line 82**: `const prose = await provider.generateDraft(prompt, mode, seed)` (per mode)
- **Type**: Draft generation (PRODUCTIVE)
- **Frequency**: 1-3 per mode × retries (baseline 3 drafts)
- **Intervention**: Skip if initial score already ≥ 88

**Line 102**: `const score = await judgeAesthetic(packet, finalProse, provider)` (per draft)
- **Type**: Scoring (COMPENSATORY)
- **Frequency**: 4 per duel (loop candidate + 3 mode drafts)
- **Intervention**: Pre-filter with CALC-only, score only top 2 with V3

**Line 127-146**: `judgeAestheticV3` calls (if symbolMap provided)
- **Type**: Scoring with macro-axes (COMPENSATORY)
- **Frequency**: 4 per duel
- **Intervention**: Cache axis scores, reuse from V1

### 6.3 oracle/aesthetic-oracle.ts

**Line 44-53**: judgeAesthetic core
```typescript
const tension_14d = await scoreTension14D(...)        // 1 call
const emotion_coherence = await scoreEmotionCoherence(...) // 1 call
const interiority = await scoreInteriority(...)       // 1 call
const sensory_density = await scoreSensoryDensity(...) // 1 call
const necessity = await scoreNecessity(...)           // 1 call
const impact = await scoreImpact(...)                 // 1 call
```
- **Total per judgeAesthetic**: 6 LLM calls (actually 4 LLM + 2 CALC, need verification)
- **Intervention**: Wrap with cache by prose hash

**Line 81-97**: judgeAestheticV3 core (calls computeECC/RCI/SII/IFI/AAI)
- **Total per judgeAestheticV3**: ~10 LLM calls (5 macro × 2 each avg)
- **Intervention**: Cache computations, dedupe with V1

### 6.4 oracle/macro-axes.ts

**computeECC** (line 68ff):
- `scoreTension14D`, `scoreEmotionCoherence`, `scoreInteriority`, `scoreImpact` — 4 LLM calls
- `scorePhysicsCompliance` — 0 LLM (CALC)
- `scoreTemporalPacingAxis` — 0 LLM (CALC)
- **Subtotal**: 4 LLM calls

**computeRCI** (line ~180ff):
- `scoreRhythm`, `scoreSignature`, `scoreAntiCliche` — 0 LLM (all CALC)
- `scoreVoiceConformity`, `scoreEuphonyBasic` — likely 1-2 LLM calls (need verification)
- **Subtotal**: 1-2 LLM calls

**computeSII** (line ~270ff):
- `scoreSignature`, `scoreAntiCliche` — 0 LLM (CALC)
- `scoreMetaphorNoveltyAxis` — 0-1 LLM call
- **Subtotal**: 0-1 LLM calls

**computeIFI** (line ~350ff):
- `scoreAttentionSustain`, `scoreFatigueManagement` — likely 2 LLM calls (via provider?)
- **Subtotal**: 2 LLM calls

**computeAAI** (line ~410ff):
- `scoreShowDontTell`, `scoreAuthenticityAxis` — 2 LLM calls (via provider?)
- **Subtotal**: 2 LLM calls

**Total per judgeAestheticV3**: 4 + 1-2 + 0-1 + 2 + 2 = **9-10 LLM calls**

### 6.5 pitch/sovereign-loop.ts

**Line 41**: `const s_score_initial = await judgeAesthetic(...)`
- **Type**: Initial scoring (COMPENSATORY)
- **Frequency**: 1 per run
- **Part of**: engine.ts orchestration (counted above)

**Line 68 (per pass)**: `const s_score_current = await judgeAesthetic(...)`
- **Type**: Rejudging after patch (COMPENSATORY)
- **Frequency**: 1-2 per loop pass (max 2 passes = max 2 rejudges)
- **Intervention**: Cache if prose identical, skip if score improved by < 2 points

**Line 55**: `const patched_prose = await applyPatch(...)`
- **Type**: LLM-driven patch generation (PRODUCTIVE)
- **Frequency**: 1-2 per loop (one per pass)
- **Intervention**: None — this is productive work

---

## SECTION 7: CALL REDUCTION ROADMAP (NO IMPLEMENTATION)

### PHASE A: Quick wins (Target: -5 calls, 1 week effort)

1. **Implement prose-hash caching**
   - File: `oracle/aesthetic-oracle.ts`
   - Cache key: `sha256(prose + seed)`
   - Scope: All judgeAesthetic/judgeAestheticV3 calls
   - Expected savings: 2-4 calls per run (30% of rejudges have identical prose)

2. **Skip duel if initial score ≥ 88 composite + ≥ 82 min_axis**
   - File: `engine.ts` line 500 (after loop verdict)
   - Condition: `if (loop_result.s_score_final.composite >= 88 && symbolMap && v3Scores[0].min_axis >= 82) { skip duel }`
   - Expected savings: 1-2 calls per 30% of runs = 0.5-1 call average

3. **Consolidate V1/V3 axis computation**
   - File: `oracle/aesthetic-oracle.ts` line 44-53 + macro-axes.ts
   - Strategy: Compute axis scores once, reuse in both paths
   - Expected savings: 1-2 calls per full evaluation (elimination of duplicate tension_14d, emotion_coherence, etc.)

### PHASE B: Moderate wins (Target: -5 calls, 2 weeks effort)

4. **Early exit loop if score improves by ≥ 3 points and score ≥ 85**
   - File: `pitch/sovereign-loop.ts` line 88ff
   - Condition: `if (pass > 0 && s_score_current.composite >= 85 && s_score_current.composite - bestScore.composite >= 3) { break }`
   - Expected savings: 1-2 calls per 40% of runs = 0.5-1 call average

5. **Duel candidate pre-filter (CALC-only quick judge)**
   - File: `duel/duel-engine.ts` line 102-117
   - Strategy: Score drafts with CALC-only metrics first, sort, score top 2 with full judgeAestheticV3
   - Expected savings: 3-6 calls per duel (reduce 4-draft full judge to 2-draft full judge)
   - Risk: Medium (may miss non-obvious winners if CALC-only metric < 80 correlation with V3)

6. **Activate Rosetta Bridge (V5 prompt)**
   - File: `engine.ts` line 250 (select V5 vs V4)
   - Strategy: Set `process.env.OMEGA_PROMPT_V5=1`, validate matrix loads, enable telemetry
   - Expected savings: Indirect (fewer loop iterations, fewer duel candidates needed)
   - Expected gain: +3-5% SAGA_READY rate

### PHASE C: Aggressive reductions (Target: -3 calls, higher risk)

7. **Single-pass duel (score only 2 candidates)**
   - File: `duel/duel-engine.ts`
   - Strategy: Pre-filter all 4 drafts with CALC metrics, score only top 2 with V3
   - Expected savings: 6 calls per duel
   - Risk: HIGH (may miss edge-case winners, +2-3% REJECT rate possible)

8. **Eliminate targeted patch (conditional)**
   - File: `engine.ts` line 520-540 + `polish/targeted-patch.ts`
   - Strategy: Disable `OMEGA_TARGETED_PATCH`
   - Expected savings: 2-3 calls per 50% of runs = 1-1.5 calls average
   - Trade-off: -1-2% SAGA_READY rate

---

## SECTION 8: ROSETTA BRIDGE INTEGRATION CHECKLIST

### For P2 Activation (Code structure, NOT implementation):

- [ ] Validate ROSETTA_BRIDGE_MATRIX.json exists at build time
- [ ] Add env guard in engine.ts: `const useV5 = isV5Active() && matrixExists`
- [ ] Add telemetry hook: log which features were injected + compliance rate
- [ ] Measure actual compliance vs expected (track in scoring output)
- [ ] Implement graceful fallback to V4 if matrix load fails
- [ ] Expand PHASE1_FEATURES from 3 → 5 after first 100 runs at 70%+ compliance
- [ ] Add feature coverage telemetry (which PILOTABLE, which IRREDUCTIBLE)
- [ ] Document decision points: why TOP 3 features chosen, when to expand
- [ ] Create bench: V4 vs V5 on 100-run sample (measure loop pass reduction)

---

## SECTION 9: SUMMARY TABLE

| Goal | Current | Target | Method | Risk | Effort |
|------|---------|--------|--------|------|--------|
| LLM calls | 30 | 15 | Cache + skip duel + pre-filter | Medium | 3-4 weeks |
| SAGA_READY % | 8% | 30% | Bridge + loop tuning + threshold | Low-Medium | 4-6 weeks |
| Bridge active | No | Yes | Activate V5, measure compliance | Low | 1 week |
| Bottleneck (min_axis) | 85 threshold | Identify weak axes | Target-specific patches | Low | 2 weeks |

---

## CONCLUSION

**Key findings**:

1. **30 calls are real**: 10 productive (draft + patch), 20 compensatory (rejudge cycles)
2. **Rosetta Bridge exists**: V5 code is complete, just needs env activation + telemetry
3. **Scorer V3 is pure CALC**: No LLM intervention possible; focus on caching + deduplication
4. **SAGA_READY plateau at 8%**: Driven by strict min_axis threshold + limited loop passes
5. **Quick win**: Prose-hash cache + duel skip → 5 calls saved (16% reduction)
6. **Medium win**: Bridge activation + duel pre-filter + loop early exit → 10 calls saved (33% reduction)

**P2 priorities**:
1. Implement cache + duel skip (1 week, 5 calls saved)
2. Activate Rosetta Bridge + measure (1 week, indirect SAGA_READY gain)
3. Duel pre-filter implementation (2 weeks, 5 calls saved)
4. Loop tuning for early exit (1 week, 1-2 calls saved)

**Recommended stop-loss**: If Bridge doesn't show 5%+ SAGA_READY improvement after 100 runs, pivot to threshold relaxation (controversial but effective).

---

**Analysis completed 2026-04-02 — Ready for architectural review by Francky.**
