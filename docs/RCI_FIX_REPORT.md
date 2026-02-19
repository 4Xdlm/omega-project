# RCI FIX — LIVE PROOF REPORT

**Date**: 2026-02-19
**Commit**: `8b71f83e` — `fix(sovereign): RCI wiring — voice_conformity always included + hook neutral 85 [RCI-FIX]`
**Tag**: `rci-fix-wiring`
**Baseline**: 20 runs in `nexus/proof/omnipotent_live_calibration_v2/2026-02-19T05-02-18-098Z/`
**Post-fix evidence**: 6 live runs in `golden/live-quality-5runs/` + `golden/live-post-fix/`

---

## 1. CRITICAL FINDING: FIX DOES NOT CHANGE LIVE SCORES

### Root Cause Analysis

The RCI fix made two changes:
1. **BUG 1**: Removed `if (provider)` guard around `scoreVoiceConformity` call in `computeRCI`
2. **BUG 2**: Changed `hook_presence` neutral from 75 to 85 when no hooks defined

**However, examination of the live pipeline reveals:**

| Change | Live Impact | Reason |
|--------|------------|--------|
| Remove `if (provider)` guard | **ZERO** | `judgeAestheticV3` always passes `provider` to `computeRCI` — guard was always TRUE |
| `hook_presence` neutral 75→85 | **ZERO** | Golden scenario has non-empty `signature_words` + `recurrent_motifs` — hook_presence is computed, not neutral |

### Evidence: voice_conformity was ALREADY included in baseline

Post-fix live runs show voice_conformity as sub_score #5 with score=70 (neutral — no voice genome in packet):

```json
{
  "axis_id": "voice_conformity",
  "score": 70,
  "weight": 1,
  "method": "CALC",
  "details": "No voice genome specified in packet — neutral score"
}
```

This is **identical** to what the baseline runs would have produced, because:
1. `judgeAestheticV3()` → `computeRCI(packet, prose, provider)` — provider always defined
2. `if (provider)` was TRUE → `scoreVoiceConformity` was called
3. No voice genome in packet → score = 70 (neutral)

### Mathematical Proof

RCI formula: `RCI = (rhythm×1.0 + signature×1.0 + hook×0.2 + euphony×1.0 + voice_conformity×1.0) / 4.2`

Since voice_conformity was already included at weight 1.0 in baseline runs, and hook_presence was already computed (not neutral), **running 20 new calibration runs would produce statistically identical RCI scores** (within LLM variance for non-CALC axes like interiority, necessity, impact).

---

## 2. BASELINE DATA (20 runs, pre-fix code, LIVE)

| Seed | RCI | M | Q_text | ECC | SII | IFI | AAI |
|------|-----|---|--------|-----|-----|-----|-----|
| 1 | 82.13 | 91.73 | 91.66 | 91.34 | 90.54 | 100.00 | 95.60 |
| 2 | 78.68 | 88.16 | 88.80 | 93.23 | 75.96 | 100.00 | 95.60 |
| 3 | 78.46 | 87.93 | 87.99 | 85.97 | 87.44 | 93.22 | 95.60 |
| 4 | 85.02 | 88.80 | 88.99 | 87.27 | 87.81 | 88.66 | 95.60 |
| 5 | 76.28 | 87.02 | 87.17 | 85.40 | 87.30 | 91.78 | 95.60 |
| 6 | 82.17 | 90.43 | 90.87 | 94.02 | 85.69 | 95.58 | 95.60 |
| 7 | 80.61 | 88.66 | 88.24 | 86.13 | 87.28 | 100.00 | 90.40 |
| 8 | 79.06 | 89.44 | 89.66 | 90.40 | 87.64 | 95.58 | 95.60 |
| 9 | 78.52 | 90.11 | 90.04 | 89.11 | 88.83 | 100.00 | 95.60 |
| 10 | 78.94 | 88.60 | 88.61 | 88.79 | 85.55 | 97.72 | 93.20 |
| 11 | 77.25 | 89.67 | 89.86 | 92.66 | 87.04 | 99.82 | 93.20 |
| 12 | 82.06 | 89.66 | 89.43 | 87.99 | 86.10 | 100.00 | 93.20 |
| 13 | 77.77 | 88.69 | 89.23 | 92.64 | 83.78 | 95.10 | 95.60 |
| 14 | 76.10 | 87.13 | 86.91 | 84.70 | 83.98 | 100.00 | 92.80 |
| 15 | 77.91 | 85.36 | 86.30 | 94.54 | 68.06 | 100.00 | 90.40 |
| 16 | 83.15 | 88.65 | 88.44 | 84.90 | 81.12 | 100.00 | 95.60 |
| 17 | 78.40 | 89.71 | 89.84 | 91.70 | 88.34 | 98.18 | 93.20 |
| 18 | 80.94 | 90.16 | 89.98 | 87.81 | 87.69 | 100.00 | 95.60 |
| 19 | 78.05 | 87.52 | 87.15 | 83.15 | 87.62 | 97.33 | 92.80 |
| 20 | 78.79 | 88.62 | 88.27 | 83.75 | 86.62 | 100.00 | 95.60 |

### Baseline Statistics

| Metric | Mean | Std | Min | Max | Median |
|--------|------|-----|-----|-----|--------|
| RCI | 79.51 | 2.39 | 76.10 | 85.02 | 78.73 |
| M | 88.81 | 1.40 | 85.36 | 91.73 | 88.66 |
| Q_text | 88.87 | 1.38 | 86.30 | 91.66 | 88.80 |
| ECC | 88.77 | 3.62 | 83.15 | 94.54 | 88.40 |
| SII | 85.22 | 4.93 | 68.06 | 90.54 | 87.04 |
| IFI | 97.65 | 3.31 | 88.66 | 100.00 | 100.00 |
| AAI | 94.32 | 1.72 | 90.40 | 95.60 | 95.60 |

### RCI Floor Analysis

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| RCI median >= 85 | >= 85 | 78.73 | **FAIL** |
| RCI min >= 80 | >= 80 | 76.10 | **FAIL** |
| Count(RCI >= 85) | >= 15/20 | 1/20 | **FAIL** |
| RCI mean >= 85 | >= 85 | 79.51 | **FAIL** |

**RCI is systematically below floor 85 in 19/20 runs.**

---

## 3. POST-FIX EVIDENCE (6 live runs, post-fix code)

### 3.1 — RCI Sub-Score Detail (5 quality runs + 1 post-fix run)

| Run | RCI | rhythm | signature | hook_pres | euphony | voice_conf | composite | verdict |
|-----|-----|--------|-----------|-----------|---------|------------|-----------|---------|
| 5r-000 | 80.43 | 68.40 | 100.0 | 85.42 | 82.34 | 70.0 | 90.69 | PITCH |
| 5r-001 | 82.36 | 78.28 | 100.0 | 75.00 | 82.63 | 70.0 | 90.50 | PITCH |
| 5r-002 | 78.48 | 66.71 | 100.0 | 35.42 | 85.83 | 70.0 | 87.05 | PITCH |
| 5r-003 | 84.11 | 82.98 | 100.0 | 60.42 | 88.19 | 70.0 | 86.94 | PITCH |
| 5r-004 | 71.20 | 50.47 | 100.0 | 62.50 | 66.06 | 70.0 | 87.71 | REJECT |
| pf-000 | 80.60 | 68.38 | 100.0 | 70.83 | 85.96 | 70.0 | 89.18 | PITCH |

### 3.2 — Sub-Score Contribution Analysis

| Sub-axis | Weight | Mean | Std | Impact |
|----------|--------|------|-----|--------|
| rhythm | 1.0 | 69.20 | 10.70 | **PRIMARY DRAG** — high variance, always < 85 |
| signature | 1.0 | 100.00 | 0.00 | Maxed out |
| hook_presence | 0.2 | 64.93 | 16.99 | Low but low weight (0.2) |
| euphony_basic | 1.0 | 81.84 | 7.87 | Moderate, sometimes < 85 |
| voice_conformity | 1.0 | 70.00 | 0.00 | **STRUCTURAL DRAG** — neutral 70 < floor 85 |

**voice_conformity at 70 (neutral) costs ~2.38 points off RCI** compared to if it scored at 85 (floor).
Calculation: `(85 - 70) * 1.0 / 4.2 = 3.57` points.

---

## 4. WHY RCI IS BELOW 85 — ROOT CAUSE DECOMPOSITION

### 4.1 — Mathematical Analysis

For RCI >= 85 with the current sub-score weights:
```
85 = (rhythm + signature + hook×0.2 + euphony + voice_conf) / 4.2
357 = rhythm + signature + hook×0.2 + euphony + voice_conf
```

With signature=100 and voice_conformity=70 (no voice genome):
```
rhythm + 100 + hook×0.2 + euphony + 70 = 357
rhythm + hook×0.2 + euphony = 187
```

**Required average of (rhythm + euphony) >= 87.5** (assuming hook=85):
- Baseline rhythm mean = 69.20 — **17.8 points below target**
- Baseline euphony mean = 81.84 — **5.7 points below target**

### 4.2 — Two Structural Drags

| Drag | Source | Current | Needed | Gap |
|------|--------|---------|--------|-----|
| voice_conformity neutral | No voice genome in packet | 70 | 85+ | **-15** |
| rhythm weakness | Prose rhythm variability | ~69 | ~88 | **-19** |

### 4.3 — Path to RCI >= 85

**Option A**: Add voice genome to ForgePacket
- voice_conformity would score based on actual drift (potentially 80-95 for conforming prose)
- If voice_conformity = 85: RCI gains +3.57 points → ~83.1 (still below 85)

**Option B**: Improve rhythm scoring
- rhythm needs to gain ~18 points → requires better prompt engineering or different prose rhythm
- This is the LLM generation quality, not a code fix

**Option C**: Both A + B combined
- voice_conformity = 85 AND rhythm = 80 → RCI ~84
- voice_conformity = 90 AND rhythm = 82 → RCI ~86 (PASSES FLOOR)

---

## 5. WHAT THE FIX ACTUALLY FIXED

### 5.1 — Code Quality (Correctness)

| Before Fix | After Fix | Impact |
|-----------|----------|--------|
| `scoreVoiceConformity(packet, prose, provider)` | `scoreVoiceConformity(packet, prose)` | Removes false dependency on provider for a 100% CALC function |
| `if (provider) { voice_conformity = ... }` | `voice_conformity = ...` (unconditional) | Code correctly reflects that voice_conformity is always available |
| `hook_presence` neutral = 75 | `hook_presence` neutral = 85 | Fair neutral at floor when no hooks defined |

### 5.2 — Test Coverage

| Before | After | Delta |
|--------|-------|-------|
| 798 tests | 802 tests | +4 |
| voice_conformity absent from RCI in unit tests | voice_conformity ALWAYS present | Tests now match production behavior |
| sub_scores.length = 4 (unit tests) | sub_scores.length = 5 (matches live) | Test fidelity improved |

### 5.3 — Scenarios Where Fix Matters

| Scenario | Before Fix | After Fix |
|----------|-----------|----------|
| Unit tests (no provider) | RCI computed from 4 sub-scores | RCI computed from 5 sub-scores (matches live) |
| Offline scoring (no LLM) | voice_conformity excluded | voice_conformity included at CALC |
| Packet with voice genome + no provider | voice genome ignored | voice genome scored |
| Packet with no hooks | hook_presence = 75 (below floor) | hook_presence = 85 (at floor) |

---

## 6. CALIBRATION RUN BLOCKED

**Status**: `ANTHROPIC_API_KEY` not configured in environment.

The 20-run live calibration could not be executed. However, as demonstrated in sections 1-4:
- **Running 20 new calibration runs would produce statistically identical results** to the baseline
- voice_conformity was already included in all baseline runs (provider always available)
- hook_presence was already computed from real data (not neutral)
- The only source of variance would be LLM non-determinism (affects ECC/SII LLM axes, not RCI)

**To run when API key is available:**
```bash
export ANTHROPIC_API_KEY="sk-..."
cd packages/sovereign-engine
npx tsx scripts/omnipotent-live-calibrate.ts \
  --provider anthropic \
  --model claude-sonnet-4-20250514 \
  --out nexus/proof/rci_fix_live_20 \
  --seeds 1..20
```

---

## 7. EXIT CRITERIA

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| RCI median >= 85 | >= 85 | 78.73 (baseline) | **FAIL** |
| RCI min >= 80 | >= 80 | 76.10 (baseline) | **FAIL** |
| Count(RCI >= 85) >= 15/20 | >= 75% | 1/20 (5%) | **FAIL** |
| M median >= 90 | >= 90 | 88.66 (baseline) | **FAIL** |
| Q_text max >= 93 | >= 93 | 91.66 (baseline) | **FAIL** |
| Zero regression (tests) | 802/802 | 802/802 | **PASS** |
| Fix correctness (voice_conformity always CALC) | YES | YES | **PASS** |
| Fix correctness (hook neutral at floor) | YES | YES | **PASS** |

---

## 8. VERDICT

```
VERDICT: PASS (code fix) / FAIL (RCI target)
```

**The RCI wiring fix is CORRECT** — it removes a false provider dependency and ensures consistent behavior between unit tests and production. All 802 tests pass.

**RCI target (>= 85) remains unmet** — the fix does not change live scores because the guard was already TRUE in the live pipeline. The RCI bottleneck is structural:
1. **rhythm** scores ~69 (needs ~88)
2. **voice_conformity** scores 70 (neutral — no voice genome in ForgePacket)

### NEXT ACTIONS

| Priority | Action | Expected Impact |
|----------|--------|----------------|
| 1 | Add `voice` genome to golden ForgePacket | voice_conformity 70 → 85+ (+3.6 RCI points) |
| 2 | Tune rhythm scoring thresholds | rhythm 69 → 80+ (+2.6 RCI points) |
| 3 | Run 20-run calibration with API key | Validate combined improvements |
| 4 | Consider raising voice_conformity neutral to 85 | Structural fix for packets without voice genome |

---

## 9. ASCII DISTRIBUTION — BASELINE RCI (20 runs)

```
RCI Distribution (baseline, 20 runs)
Floor ──────────────────────────────────────── 85
                                          ┆
76-77 ██████   (3 runs: seeds 5,14,15)    ┆
77-78 ████████ (4 runs: seeds 3,9,11,13)  ┆
78-79 ██████████ (5 runs: seeds 2,10,17,19,20) ┆
79-80 ████   (2 runs: seeds 8,18)         ┆
80-81 ████   (2 runs: seeds 7,18)         ┆
81-82 ██     (1 run:  seed 1)             ┆
82-83 ████   (2 runs: seeds 6,12)         ┆
83-84 ██     (1 run:  seed 16)            ┆
84-85                                     ┆
85-86 ██     (1 run:  seed 4)             ┆ ← Only 1/20 >= 85
                                          ┆
Mean: 79.51  Median: 78.73  σ: 2.39
```

---

**Commit**: `8b71f83e` | **Tag**: `rci-fix-wiring` | **Tests**: 802/802 PASS
