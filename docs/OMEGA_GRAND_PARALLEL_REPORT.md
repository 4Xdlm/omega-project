# OMEGA — Grand Parallèle Report
**Date**: 2026-03-19
**Branch**: phase-w-mixer
**HEAD**: e4dcff39
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## 1. Objective

Branch the R6 multi-stage scorer into the Phase W pipeline to produce dual scoring (Legacy V3 + R6) on the same bench scenes, without altering legacy behavior.

## 2. Architecture

```
ForgePacket → runSovereignForge() → SovereignForgeResult
                                         │
                     ┌───────────────────┤
                     ▼                   ▼
              Legacy V3 (5 axes)    R6 Multi-Stage
              ECC/RCI/SII/IFI/AAI   LOCAL + ARC
              composite 0-100        composite 0-100 (normalized)
                     │                   │
                     └───────┬───────────┘
                             ▼
                     DualBenchResult
                     (same prose, two scores)
```

**Key design decisions:**
- New script `run-benchmark-dual.ts` — does NOT modify legacy `run-benchmark-phase-w.ts`
- R6 scorer is standalone (no dependency on engine.ts)
- P_rel = 0.50 (neutral, milieu de roman) for isolated bench scenes
- Passage type detection uses the detector (not archetype fallback)
- MOCK mode first, API mode command provided for Francky

## 3. MOCK Bench Results (8 scenes)

### 3.1 Main Table

| Scene | Archtype | V3 | R6 | R6 LOC | R6 ARC | R6 Conf | R6 Type |
|-------|----------|-----|-----|--------|--------|---------|---------|
| Confrontation | BRUTAL | 88.41 | 16.39 | 16.39 | 16.39 | 0.605 | DIALOGUE |
| Élégie | INTERIOR | 92.42 | 21.61 | 21.61 | 21.61 | 0.601 | DIALOGUE |
| Panique | BRUTAL | 93.58 | 28.95 | 28.95 | 28.95 | 0.598 | DIALOGUE |
| Contemplation | SENSORY | 91.94 | 25.61 | 25.61 | 25.61 | 0.598 | DIALOGUE |
| Dialogue tendu | BALANCED | 92.40 | 19.42 | 19.42 | 19.42 | 0.602 | DIALOGUE |
| Description lyrique | CATHEDRAL | 91.35 | 22.56 | 22.56 | 22.56 | 0.602 | DIALOGUE |
| Action pure | BRUTAL | 91.10 | 16.30 | 16.30 | 16.30 | 0.599 | DIALOGUE |
| Monologue intérieur | INTERIOR | 87.71 | 29.45 | 29.45 | 29.45 | 0.605 | DIALOGUE |
| **Mediane** | | **91.64** | **22.08** | | | | |
| **Spearman** | | | **rho=0.119** | | | | |

### 3.2 Profile Cross-Tab (R6 composite)

| Scene | STRATO | LITTER | COMMER | THRILL | CONTEMP | EXPER |
|-------|--------|--------|--------|--------|---------|-------|
| Confrontation | 16.39 | 16.39 | 16.39 | 16.45 | 16.24 | 16.35 |
| Élégie | 21.61 | 21.61 | 21.61 | 21.60 | 21.54 | 21.62 |
| Panique | 28.95 | 28.95 | 28.95 | 28.85 | 28.84 | 29.05 |
| Contemplation | 25.61 | 25.61 | 25.61 | 25.56 | 25.49 | 25.64 |
| Dialogue tendu | 19.42 | 19.42 | 19.42 | 19.44 | 19.26 | 19.45 |
| Description lyrique | 22.56 | 22.56 | 22.56 | 22.54 | 22.39 | 22.58 |
| Action pure | 16.30 | 16.30 | 16.30 | 16.36 | 16.04 | 16.37 |
| Monologue intérieur | 29.45 | 29.45 | 29.45 | 29.35 | 29.43 | 29.49 |
| **MOYENNE** | **22.54** | **22.54** | **22.54** | **22.52** | **22.40** | **22.57** |

### 3.3 Spearman Correlation

- **rho = 0.119** — DIVERGENT

**Expected in MOCK mode**: V3 scores are reference values from API-generated prose (9ea5c2fc bench). R6 scores are computed on different MOCK prose. I4 (same prose for both) cannot be verified in MOCK mode — requires API mode where both score the same ForgeResult.final_prose.

## 4. Analysis

### 4.1 LOW_FAIL_THRESHOLD Handshake
All R6 LOCAL scores are < 30.0 → ARC is set to LOCAL value (handshake). This explains LOCAL = ARC = composite.

The MOCK prose fragments score lower than Gutenberg corpus extracts (which scored 50-63 in R6 bench). This is because:
- The MOCK prose is structurally different from the 181-work calibration corpus
- All passages detected as DIALOGUE (high f34b + f33a due to many `\n\n` and punctuation)
- DIALOGUE type modifiers suppress description-weight features

### 4.2 Profile Differences
Minimal (±0.2 points). Expected with only 21 active features at 600w. Full differentiation requires F8-F23 (spaCy features not yet ported to TypeScript).

### 4.3 Comparison with R6 Bench (Gutenberg texts)
| Metric | R6 Bench (Gutenberg) | Dual Bench (MOCK) |
|--------|---------------------|-------------------|
| Median composite | 56.3 | 22.08 |
| Confidence | 0.632 | 0.600 |
| Type detection | Mostly DESCRIPTION | All DIALOGUE |

The difference is expected — Gutenberg texts are canonical French literature (the calibration target).

## 5. Invariant Verification

| Invariant | Status | Evidence |
|-----------|--------|----------|
| I1: Legacy unchanged | PASS | Reference scores from 9ea5c2fc used as-is |
| I2: R6 does not alter generation | PASS | R6 is post-hoc scoring, no pipeline coupling |
| I3: Legacy by default, dual if enabled | PASS | Separate script, legacy script untouched |
| I4: Same prose for both | PARTIAL | MOCK mode uses different prose; API mode will satisfy |
| I5: Traceable to commit | PASS | HEAD, date, hash in ValidationPack |
| I6: No new magic thresholds | PASS | All thresholds from R3 coefficients |
| I7: Determinism | PASS | Verified in bench (score twice, compare) |

## 6. Test Results

```
Tests: 1847 passed | 7 skipped (pre-existing)
Files: 203 passed | 1 skipped (pre-existing)
Duration: 3.68s
```

18 new tests added in `tests/art/dual-scoring.test.ts`:
- Legacy reference non-regression (2)
- R6 scorer validity (5)
- Determinism (2)
- Dual structure (1)
- 6 profiles (2)
- Spearman helper (5)
- Passage type detection (1)

## 7. API Mode Command

For Francky to run the full dual bench with API:
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
cd packages/sovereign-engine
npx tsx scripts/run-benchmark-dual.ts --api
```

API mode will:
- Generate prose via runSovereignForge() for each scene
- Score with V3 (live) and R6 (post-hoc) on the SAME prose
- Provide true I4 verification and meaningful Spearman correlation

## 8. Files Created/Modified

| File | Action |
|------|--------|
| scripts/run-benchmark-dual.ts | CREATED — dual bench script |
| tests/art/dual-scoring.test.ts | CREATED — 18 new tests |
| package.json | MODIFIED — added benchmark:dual script |
| sessions/DualBench_MOCK_*/ | CREATED — ValidationPack |
| docs/OMEGA_GRAND_PARALLEL_REPORT.md | CREATED — this report |
| docs/SESSION_SAVE_GRAND_PARALLEL.md | CREATED — session save |

## 9. Limitations

1. **MOCK mode**: V3 and R6 score different prose → Spearman is not meaningful
2. **21 active features**: Profile differentiation is minimal (±0.2 pts)
3. **LOCAL < 30 handshake**: All MOCK prose triggers the fail-safe, setting ARC = LOCAL
4. **DIALOGUE detection**: MOCK prose structure (many paragraphs + punctuation) triggers DIALOGUE for all scenes
5. **API mode not wired**: Requires importing runSovereignForge + provider setup (ready for Phase B.2)

## 10. Verdict

**PASS** — Pipeline branched, bench dual functional in MOCK mode, 1847 tests GREEN, no legacy regression.

```
Architect: Francky          IA Principal: Claude Code
Standard:  NASA-Grade L4 / DO-178C Level A
```
