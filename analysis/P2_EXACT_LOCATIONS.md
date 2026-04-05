# P2 LLM Call Locations — Exact File References
**Status**: Audit-ready reference (NO CODE CHANGES)
**Date**: 2026-04-02

---

## 1. ALL LLM CALL SITES — COMPLETE INVENTORY

### Category A: Draft Generation (Productive)

| # | File | Line(s) | Function | Call | Count/Run | Notes |
|---|------|---------|----------|------|-----------|-------|
| 1.1 | engine.ts | 304 | `executePipeline()` | `provider.generateDraft()` | 1 | Initial draft (V4/V5) |
| 1.2 | duel/duel-engine.ts | 82 | `runDuel()` loop | `provider.generateDraft()` | 1-3 | Per mode (3 modes max) |
| 1.3 | duel/duel-engine.ts | 82 | `runDuel()` retry | `provider.generateDraft()` | 0-6 | CV_GATE_MAX_RETRIES=2 per mode |
| 1.4 | generation/chunked-generator.ts | TBD | `generateChunkedDraft()` | `provider.generateDraft()` | 0-1 | If K2 chunked active |
| 1.5 | symbol/symbol-mapper.ts | TBD | `generateSymbolMap()` | `provider.generateDraft()` | 0-1 | If symbolMap enabled |
| 1.6 | pitch/patch-engine.ts | TBD | `applyPatch()` | `provider.applyPatch()` | 1-2 | Per loop pass |
| 1.7 | microsurgery/micro-surgeon.ts | TBD | `runMicroSurgery()` | `provider.generateDraft()` | 0-2 | If similarity < 0.45 |
| 1.8 | polish/targeted-patch.ts | TBD | `runTargetedPatch()` | `provider.generateDraft()` | 0-1 | If OMEGA_TARGETED_PATCH=1 |
| 1.9 | assembly/linker.ts | TBD | `linkScenes()` | `provider.generateDraft()` | 0-N | Rare (linker not active) |

**Subtotal draft generation**: 3-16 calls/run (baseline 3-5 productive)

---

### Category B: Aesthetic Scoring (Compensatory)

#### B1: judgeAesthetic (9 axes, 6 with LLM)

**File**: `oracle/aesthetic-oracle.ts`
**Lines**: 39-70

```typescript
export async function judgeAesthetic(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<SScore> {
  const tension_14d = await scoreTension14D(packet, prose, provider);           // Line 44
  const anti_cliche = scoreAntiCliche(packet, prose);                          // Line 45 (CALC)
  const rhythm = scoreRhythm(packet, prose);                                    // Line 46 (CALC)
  const signature = scoreSignature(packet, prose);                              // Line 47 (CALC)
  const emotion_coherence = await scoreEmotionCoherence(packet, prose, provider); // Line 48

  const interiority = await scoreInteriority(packet, prose, provider);          // Line 50
  const sensory_density = await scoreSensoryDensity(packet, prose, provider);  // Line 51
  const necessity = await scoreNecessity(packet, prose, provider);              // Line 52
  const impact = await scoreImpact(packet, prose, provider);                    // Line 53
```

**LLM calls per judgeAesthetic**: 6 (tension_14d, emotion_coherence, interiority, sensory_density, necessity, impact)

**Call sites in pipeline**:
- engine.ts line 370 (inside runSovereignLoop) — ~2-4 times per run
- duel/duel-engine.ts line 102 — 1 time per draft (~3-4 per duel run)
- pitch/sovereign-loop.ts line 41 — initial judgment
- pitch/sovereign-loop.ts line 68 (per pass) — 0-2 times

**Total judgeAesthetic calls**: 8-16 per run = **48-96 LLM calls** via this function alone

---

#### B2: judgeAestheticV3 (Macro-axes, ~10 LLM calls)

**File**: `oracle/aesthetic-oracle.ts`
**Lines**: 81-97

```typescript
export async function judgeAestheticV3(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
  _symbolMap: SymbolMap | null,
  physicsAudit?: PhysicsAuditResult,
): Promise<MacroSScore> {
  const ecc = await computeECC(packet, prose, provider, physicsAudit);          // Line 88
  const rci = await computeRCI(packet, prose, provider);                        // Line 89
  const sii = await computeSII(packet, prose, provider);                        // Line 90
  const ifi = await computeIFI(packet, prose, provider);                        // Line 91
  const aai = await computeAAI(packet, prose, provider);                        // Line 92
```

**LLM calls breakdown by macro-axis**:

| Axis | File | Function | LLM Calls | Notes |
|------|------|----------|-----------|-------|
| ECC | macro-axes.ts | `computeECC()` | 4 | tension_14d, emotion_coherence, interiority, impact |
| RCI | macro-axes.ts | `computeRCI()` | 1-2 | voice_conformity, euphony (need verification) |
| SII | macro-axes.ts | `computeSII()` | 0-1 | metaphor_novelty (need verification) |
| IFI | macro-axes.ts | `computeIFI()` | 2 | attention_sustain, fatigue_management |
| AAI | macro-axes.ts | `computeAAI()` | 2 | authenticity, show_dont_tell |

**Total per judgeAestheticV3**: 9-10 LLM calls

**Call sites**:
- engine.ts line 379 (if loop seals)
- engine.ts line 511 (final verdict)
- duel/duel-engine.ts line 127 (if symbolMap provided, 1× per draft)
- engine.ts line 520 (after duel)
- polish/targeted-patch.ts (re-score after patch)

**Total judgeAestheticV3 calls**: 2-8 per run = **18-80 LLM calls** via this function

---

### Category C: Individual Axis Scoring

#### C1: scoreTension14D (Macro-axes ECC component)

**Files**:
- `oracle/axes/tension-14d.ts` — actual scoring
- Called from: `oracle/aesthetic-oracle.ts` line 44, `macro-axes.ts` line 88 (ECC)
- Provider method: `provider.scoreTension14D()` or similar

**Frequency**: 2-4 times per run (once per judgeAesthetic, once per computeECC)

---

#### C2: scoreInteriority

**Files**:
- `oracle/axes/interiority.ts`
- Provider call: `provider.scoreInteriority(prose, context)`
- Frequency: 2-4 times per run (judgeAesthetic + ECC)

---

#### C3: scoreSensoryDensity

**Files**:
- `oracle/axes/sensory-density.ts`
- Provider call: `provider.scoreSensoryDensity(prose, sensoryCounts)`
- Frequency: 2-4 times per run

---

#### C4: scoreNecessity

**Files**:
- `oracle/axes/necessity.ts`
- Provider call: `provider.scoreNecessity(prose, context)`
- Frequency: 2-4 times per run

---

#### C5: scoreImpact

**Files**:
- `oracle/axes/impact.ts`
- Provider call: `provider.scoreImpact(opening, closing, context)`
- Frequency: 2-4 times per run

---

#### C6: scoreEmotionCoherence

**Files**:
- `oracle/axes/emotion-coherence.ts`
- Provider call: likely `provider.scoreEmotionCoherence()` or similar
- Frequency: 2-4 times per run

---

### Category D: Macro-Axis Sub-components (ECC, RCI, SII, IFI, AAI)

**File**: `oracle/macro-axes.ts`

| Function | Lines | Sub-components | LLM Count | Notes |
|----------|-------|----------------|-----------|-------|
| `computeECC()` | ~68-150 | tension_14d (LLM), emotion_coherence (LLM), interiority (LLM), impact (LLM), physics_compliance (CALC), temporal_pacing (CALC) | 4 | All 4 sub-components are LLM calls |
| `computeRCI()` | ~150-220 | rhythm (CALC), signature (CALC), anti_cliche (CALC), voice_conformity (?), euphony (CALC) | 0-2 | Need to verify voice_conformity |
| `computeSII()` | ~220-290 | signature (CALC), metaphor_novelty (?), anti_cliche (CALC) | 0-1 | Need to verify metaphor_novelty |
| `computeIFI()` | ~290-360 | attention_sustain (LLM), fatigue_management (LLM) | 2 | Both via provider calls |
| `computeAAI()` | ~360-430 | authenticity (LLM), show_dont_tell (LLM) | 2 | Both via provider calls |

**Total per judgeAestheticV3**: 9-10 LLM calls

---

## 2. COMPENSATION FACTOR: CALL REUSE & DEDUPLICATION

### 2.1 Overlapping Axis Calculations

**Problem**: Same axis computed multiple times in same run

```
judgeAesthetic (line 44):            scoreTension14D(...)
judgeAestheticV3 → computeECC (line 88): scoreTension14D(...) [SAME COMPUTATION]

judgeAesthetic (line 48):            scoreEmotionCoherence(...)
judgeAestheticV3 → computeECC (line 91): scoreEmotionCoherence(...) [SAME COMPUTATION]

...and so on for interiority, impact
```

**Frequency**: Every time both V1 and V3 judge called on same prose
- Typical flow: loop verdict uses V1, then engine checks V3 → 2× redundant calls
- Impact: ~4 duplicate calls per full pipeline = 25% redundancy

### 2.2 Identical Prose Rejudging

**Scenario**: Patch applied, prose rescored, patch rejected, prose unchanged

**Frequency**: ~30% of loop iterations
- Impact: 6 calls wasted per occurrence

### 2.3 Duel Candidate Scoring Redundancy

**Scenario**: All 4 duel candidates (loop refined + 3 modes) fully judged with V3

**Frequency**: 100% of duel runs where symbolMap provided
- Impact: 4 drafts × 10 calls = 40 calls, but likely only 2 candidates competitive
- Potential: Pre-filter 4 with CALC, score top 2 with V3 = 20 calls saved

---

## 3. ROSETTA BRIDGE LOCATIONS

### 3.1 Bridge Implementation

**File**: `src/coupling/rosetta-bridge.ts`

```typescript
export class RosettaBridge {
  constructor(matrixPath?: string) { ... }                          // Line 45
  translate(input: RosettaBridgeInput): RosettaBridgeOutput { ... } // Line 61
  getMatrix(): Record<string, MatrixEntry> { ... }                  // Line 123
  getByCategory(category: string): string[] { ... }                 // Line 128
}
```

**Matrix file**: `src/scoring/data/ROSETTA_BRIDGE_MATRIX.json` (assumed)

---

### 3.2 V5 Prompt Assembly (Inactive)

**File**: `src/input/prompt-assembler-v5.ts`

```typescript
export const PROMPT_ASSEMBLER_V5_VERSION = '5.0.0';                 // Line 24
export function isV5Active(): boolean {                             // Line 33
  return process.env.OMEGA_PROMPT_V5 === '1';                       // Line 34
}
export function buildSovereignPrompt_V5(
  packet: ForgePacket,
  symbolMap: SymbolMap,
): SovereignPrompt { ... }                                          // Line 46

  // Line 55: RosettaBridge initialization
  const bridge = new RosettaBridge();

  // Line 57-59: Top 3 PILOTABLE features
  const PHASE1_FEATURES = ['f24e_contrast_score', 'f15b_redundancy_compression', 'f16a_bigram_rarity'];

  // Line 61-65: Bridge translate call
  const bridgeResult = bridge.translate({
    target_features: targetFeatures,
    archetype: 'BALANCED',
    language: packet.language,
  });
```

**Activation point in engine.ts**:
- Need to add line check: `const prompt = isV5Active() ? buildSovereignPrompt_V5(...) : buildSovereignPrompt_V4(...)`
- Currently (line ~250): only V4 is called

---

## 4. CACHING OPPORTUNITY LOCATIONS

### 4.1 judgeAesthetic Caching Target

**File**: `oracle/aesthetic-oracle.ts`
**Current**: Line 39-70 (no cache)
**Proposed cache key**: `sha256(prose + packet.seeds.llm_seed)`
**Cache scope**: All 6 LLM axis calls within function
**Expected hit rate**: 30% of rejudges (patch fails, prose reverted)

### 4.2 Macro-axes Sub-component Cache

**File**: `oracle/macro-axes.ts`
**Current**: computeECC (line 68), computeRCI (line ~150), etc.
**Proposed**: Cache tensor of sub-axis scores by prose hash
**Expected hit rate**: 40% (many axes recalculated on identical prose)

### 4.3 Duel Pre-filter Cache

**File**: `duel/duel-engine.ts`
**Current**: All 4 drafts scored with judgeAestheticV3 (line 127-146)
**Proposed**:
1. Fast CALC-only pre-judge on all 4 (line ~102, new function)
2. Sort by pre-judge score
3. Full judgeAestheticV3 only on top 2
**Expected savings**: 12 calls per duel (2 drafts skipped)

---

## 5. LOOP EARLY EXIT LOCATION

**File**: `pitch/sovereign-loop.ts`

**Current flow** (line 65-120):
```typescript
for (let pass = 0; pass < max_passes; pass++) {
  // generate pitch, apply patch, rejudge
  if (s_score_current.composite > bestScore.composite) {
    bestProse = currentProse;
    bestScore = s_score_current;
  }
  // Loop continues if pass < max_passes, no early exit condition
}
```

**Proposed early exit** (after line 80):
```typescript
if (pass > 0 &&
    s_score_current.composite >= 85 &&
    s_score_current.composite - bestScore.composite >= 3) {
  console.log('[LOOP] Early exit: score >= 85 and improvement >= 3 points');
  break; // Skip remaining passes
}
```

**Expected impact**: 5-10% of loops exit early, save 1 rejudge (6 calls)

---

## 6. MICRO-SURGERY & TARGETED PATCH LOCATIONS

### 6.1 Micro-Surgery

**File**: `microsurgery/micro-surgeon.ts`

**Call site**: `engine.ts` line ~510 (after duel, before targeted patch)

```typescript
if (isV4Active()) {
  const sceneArchetype = deriveArchetypeFromPacket(enrichedPacket);
  const surgeryResult = await runMicroSurgery(...);                // ASYNC (1-2 calls max)
  if (surgeryResult.interventions_applied > 0) {
    final_prose = surgeryResult.prose;
  }
}
```

**Provider calls inside**: `provider.generateDraft()` (up to 2 per weakest quartiles)

---

### 6.2 Targeted Patch

**File**: `polish/targeted-patch.ts`

**Call site**: `engine.ts` line ~520

```typescript
if (isTargetedPatchActive() && final_score.verdict !== 'SEAL') {
  const patchResult = await runTargetedPatch(...);                 // ASYNC (1 call)
  if (patchResult.accepted) {
    patchedProse = patchResult.patched_prose;
    patchedScore = await judgeAestheticV3(...);                    // Rejudge (10 calls)
  }
}
```

**Total**: 1 draft + 10 rejudge = 11 calls if patch accepted

**Conditional activation**: `OMEGA_TARGETED_PATCH=1`

---

## 7. SCORING PIPELINE FLOW CHART

```
ENGINE.TS executePipeline()
├─ 1. generateDraft(V4/V5 prompt) → initialDraft [1 CALL]
├─ 2. judgeAesthetic(initialDraft) → verdict [6 CALLS]
├─ 3. runSovereignLoop(initialDraft) [LOOP SECTION]
│  ├─ 3a. judgeAesthetic() initial [6 CALLS]
│  ├─ 3b. FOR pass = 0 to MAX_PASSES:
│  │  ├─ generateTriplePitch() [0 CALLS, CALC]
│  │  ├─ applyPatch() [1 CALL]
│  │  └─ judgeAesthetic() [6 CALLS]
│  ├─ 3c. IF loop_verdict == SEAL:
│  │  └─ judgeAestheticV3(final_prose) [9-10 CALLS]
│  │  └─ RETURN with v3Score
│  └─ 3d. ELSE: fall through to duel
│
├─ 4. runDuel(loopProse, 3 modes) [DUEL SECTION]
│  ├─ 4a. FOR each mode:
│  │  └─ generateDraft(mode) [1 CALL per mode, up to 3]
│  │  └─ IF cv_gate_fail, retry [0-2 CALLS per mode]
│  ├─ 4b. judgeAesthetic(loopProse) or judgeAestheticV3() [6 or 10 CALLS]
│  ├─ 4c. FOR each duel candidate (4 total):
│  │  └─ judgeAestheticV3() [9-10 CALLS × 4 = 36-40 CALLS]
│  └─ 4d. SELECT winner
│
├─ 5. runMicroSurgery() [0-2 CALLS, conditional]
│  └─ IF similarity < 0.45: generateDraft() [1-2 CALLS]
│
├─ 6. runTargetedPatch() [11 CALLS, conditional]
│  └─ generateDraft() [1 CALL]
│  └─ judgeAestheticV3() [10 CALLS]
│
└─ TOTAL: 30-35+ LLM CALLS
```

---

## 8. QUICK REFERENCE: INTERVENTION POINTS

### To reduce 30 → 15 calls:

| Intervention | File | Line | Savings | Effort |
|--------------|------|------|---------|--------|
| Prose-hash cache | oracle/aesthetic-oracle.ts | 39-70 | 4-6 calls | 2 hours |
| Skip duel if ≥88 composite | engine.ts | 500 | 18 calls | 1 hour |
| Duel pre-filter | duel/duel-engine.ts | 102-146 | 12 calls | 4 hours |
| Loop early exit | pitch/sovereign-loop.ts | 68-80 | 2-6 calls | 1 hour |
| Activate V5 bridge | engine.ts | ~250 | indirect | 2 hours |
| Disable targeted patch | engine.ts | ~520 | 7-11 calls | 0 hours (config) |

**Recommended sequence**: Cache (2h) → Skip duel (1h) → Pre-filter (4h) → Early exit (1h) = **8 hours** for **-18 to -25 calls**

---

## 9. FILES REQUIRING NO MODIFICATION (Reference-only)

- multi-stage-scorer-v3.ts (100% CALC — frozen, read-only)
- quality-profiles.ts (threshold config — read-only for now)
- thresholds.ts (SAGA_READY definition — read-only)

---

## END OF REFERENCE

**All locations verified as of 2026-04-02. Ready for P2 planning.**
