# LIVRABLE 08 — THRESHOLDS AUDIT TOTAL

**IRM Scan Phase R** | **Date**: 2026-04-02
**Scope**: `packages/sovereign-engine/src/` — all hardcoded thresholds
**Method**: READ-ONLY static analysis (grep + manual inspection)
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## SUMMARY

| Metric | Count |
|--------|-------|
| Threshold constants found | 52 |
| Magic numbers (inline, no name) | 11 |
| Duplicated values (same value, different location) | 7 |
| Values with documented provenance | 19 |
| Values with UNKNOWN provenance | 14 |
| SSOT violations (duplicate definition) | 3 |

---

## TIER 1 — CERTIFICATION GATES (SEAL / SAGA_READY)

### THRESHOLD: SEAL_ATOMIC_COMPOSITE_MIN
- Value: **93.0**
- File:Line: `core/thresholds.ts:24`
- Provenance: Phase SEAL / INV-SEAL-01. Sprint 12 rehausse 92 -> 93 (documented in config.ts:48).
- Domain: Macro-axis composite score (0-100). Valid for all genres/models.
- Duplicated: `config.ts:50` as `SOVEREIGN_THRESHOLD: 93` (integer, not float). Same semantic, different name.
- Magic number: NO (named constant)
- Impact if changed: Directly controls SEAL/REJECT verdict. Lowering = weaker certification gate. Raising = more rejections.

### THRESHOLD: SEAL_FLOOR_MIN
- Value: **85.0**
- File:Line: `core/thresholds.ts:27`
- Provenance: Phase SEAL / INV-SEAL-01. Shared with SAGA_READY.
- Domain: Per-axis floor for SEAL and SAGA_READY certification.
- Duplicated: `engine.ts:199` as `SAGA_MIN_AXIS = 85.0` (local const — SSOT VIOLATION). `duel/duel-engine.ts:137` as hardcoded `85` in formula.
- Magic number: NO (named constant at SSOT, but YES at duplicates)
- Impact if changed: All axes must exceed this floor. Lowering allows imbalanced candidates to pass.

### THRESHOLD: SAGA_READY_COMPOSITE_MIN
- Value: **92.0**
- File:Line: `core/thresholds.ts:34`
- Provenance: INV-SR-01. Pre-Sprint 12 value (was SEAL, now SAGA_READY).
- Domain: Multi-scene saga certification composite minimum.
- Duplicated: `engine.ts:198` as `SAGA_COMPOSITE = 92.0` (local const — SSOT VIOLATION). `core/thresholds.ts:44` as `NEAR_SEAL_THRESHOLD = 92.0` (same value, different semantics).
- Magic number: NO
- Impact if changed: Controls early-exit in best-of-N and scene-chain. Lower = premature exit. Higher = more iterations.

### THRESHOLD: SAGA_READY_SSI_MIN
- Value: **85.0**
- File:Line: `core/thresholds.ts:37`
- Provenance: INV-SR-01.
- Domain: min_axis floor for SAGA_READY. Same numeric value as SEAL_FLOOR_MIN.
- Duplicated: Same value as SEAL_FLOOR_MIN (line 27), intentional (shared floor).
- Magic number: NO
- Impact if changed: Allows axis-imbalanced candidates into SAGA_READY if lowered.

### THRESHOLD: SOVEREIGN_THRESHOLD (config)
- Value: **93** (integer)
- File:Line: `config.ts:50`
- Provenance: Sprint 12 rehausse 92 -> 93.
- Domain: SEAL_ATOMIC alias. Used by `oracle/s-score.ts:62`.
- Duplicated: `core/thresholds.ts:24` as `SEAL_ATOMIC_COMPOSITE_MIN = 93.0`. **DUAL SOURCE — not imported, independently defined.**
- Magic number: NO
- Impact if changed: Must stay synchronized with `core/thresholds.ts`. Divergence = scoring/certification mismatch.

### THRESHOLD: AXIS_FLOOR (config)
- Value: **50**
- File:Line: `config.ts:63`
- Provenance: UNKNOWN — no calibration trace, no INV reference.
- Domain: Absolute per-axis floor. Any axis < 50 = REJECT regardless of composite.
- Duplicated: Referenced by `polish/re-score-guard.ts:122`.
- Magic number: NO (named constant, but provenance missing)
- Impact if changed: Safety net against catastrophically weak axes. Lowering weakens guard.

---

## TIER 2 — PIPELINE CONTROL THRESHOLDS

### THRESHOLD: NEAR_SEAL_THRESHOLD
- Value: **92.0**
- File:Line: `core/thresholds.ts:44`
- Provenance: INV-PE-11. Polish engine protection.
- Domain: If composite >= 92.0 AND all floors OK -> polish engine does NO_OP (no degradation risk).
- Duplicated: Re-exported in `validation/phase-u/polish-engine.ts:59`.
- Magic number: NO
- Impact if changed: Lower = more candidates skip polish (risk of leaving improvable text). Higher = polish applied to near-SEAL candidates (risk of degradation).

### THRESHOLD: CANDIDATE_FLOOR_COMPOSITE
- Value: **85.0**
- File:Line: `core/thresholds.ts:50`
- Provenance: INV-TK-CANDIDATE-01. Top-K candidacy gate.
- Domain: Minimum composite to enter Top-K selection.
- Duplicated: None found.
- Magic number: NO
- Impact if changed: Lower = weaker candidates enter Top-K. Higher = fewer candidates.

### THRESHOLD: DELTA_THRESHOLD
- Value: **0.8579** (loaded from `calibration/delta-threshold.json`)
- File:Line: `config.ts:106` (runtime load)
- Provenance: Empirical — computed from 3 golden distances at P75. File has SHA256 hash + date (2026-02-23).
- Domain: Global distance > threshold -> needs_correction=true. Valid for Sonnet regime, FR literary prose.
- Duplicated: None (single JSON source).
- Magic number: NO (calibrated, sealed artifact)
- Impact if changed: Lower = more corrections triggered (slower, more API calls). Higher = fewer corrections (risk of under-polished output).

### THRESHOLD: CLIFF_THRESHOLD
- Value: **0.30**
- File:Line: `engine.ts:455`
- Provenance: UNKNOWN — no calibration data, no INV reference.
- Domain: cliff_score > 0.30 triggers guillotine post-processing (last sentence amputation).
- Duplicated: None.
- Magic number: **YES** — inline `const`, no external calibration.
- Impact if changed: Lower = more aggressive cliffhanger cutting. Higher = more bricks left "open" without cliffhanger.

### THRESHOLD: CLIFF_QUALITY_TARGET
- Value: **0.50**
- File:Line: `engine.ts:456`
- Provenance: UNKNOWN — BB-01 comment says "0.50 +/- 0.004 est un attracteur RLHF" (observation, not calibration).
- Domain: cliff_score >= 0.50 = strong narrative suspension.
- Duplicated: None.
- Magic number: **YES** — inline `const`, observational provenance only.
- Impact if changed: Informational only (logging). No pipeline decision depends on this.

### THRESHOLD: CV_GATE_REJECT
- Value: **1.05** (standard) / **2.50** (OMEGA_HYBRID_MODE=1)
- File:Line: `duel/duel-engine.ts:30`
- Provenance: Empirical — calibrated against literary masters. Comment: "Flaubert max=0.795, Proust max=0.784, Duras max=1.031". Hybrid mode hotfix for Ollama CV moyen ~2.4.
- Domain: Coefficient of variation of sentence lengths. Standard mode: FR literary prose. Hybrid mode: Ollama-generated text.
- Duplicated: None.
- Magic number: NO (documented calibration)
- Impact if changed: Standard 1.05: lower = reject rhythmically varied prose. Higher = accept monotone/chaotic rhythm. Hybrid 2.50: lower = Ollama systematic FAIL-OPEN.

### THRESHOLD: CV_GATE_MAX_RETRIES
- Value: **2**
- File:Line: `duel/duel-engine.ts:31`
- Provenance: UNKNOWN.
- Domain: Maximum retry attempts when CV_GATE rejects.
- Duplicated: None.
- Magic number: **YES**
- Impact if changed: Higher = more API calls per draft. Lower = faster but more FAIL-OPEN.

---

## TIER 3 — MACRO-AXIS WEIGHTS

### THRESHOLD: MACRO_WEIGHTS (ECC/RCI/SII/IFI/AAI)
- Values: `ecc=0.33, rci=0.17, sii=0.15, ifi=0.10, aai=0.25`
- File:Line: `config.ts:417-422`
- Provenance: Sprint 11 recalibration. ECC "adjusted from 0.60". AAI "NOUVEAU Sprint 11".
- Domain: Macro-axis weight vector. Sum = 1.00.
- Duplicated: **DIVERGENT** in `calibration/weight-calibrator.ts:68-73`: `ecc=0.30, rci=0.17, sii=0.18, ifi=0.15, aai=0.20`. **DIFFERENT VALUES — SSOT VIOLATION.**
- Magic number: NO (named constants)
- Impact if changed: Rebalances which axes dominate composite score. ECC currently dominant (0.33).

> **FINDING: Weight divergence between config.ts and weight-calibrator.ts.**
> - config.ts: ecc=0.33, sii=0.15, ifi=0.10, aai=0.25
> - weight-calibrator.ts: ecc=0.30, sii=0.18, ifi=0.15, aai=0.20
> - These are `DEFAULT_MACRO_WEIGHTS` in the calibrator vs `MACRO_WEIGHTS` in config.
> - The calibrator comment says "From current SOVEREIGN_CONFIG" but values differ.

### THRESHOLD: MACRO_FLOORS
- Values: `ecc=88, rci=85, sii=80, ifi=85, aai=85`
- File:Line: `config.ts:424-436`
- Provenance: Phase W corpus data (INV-SII-FLOOR-01). SII recalibrated 85->80 for BRUTAL archetype (McCarthy, Hemingway).
- Domain: Per-axis floor before REJECT. Genre-dependent (BRUTAL archetype needs lower SII floor).
- Duplicated: `MACRO_AXIS_FLOOR=80` (config.ts:438), `ECC_FLOOR=88` (config.ts:439), `AAI_FLOOR=85` (config.ts:440).
- Magic number: NO
- Impact if changed: SII=80 is critical for BRUTAL archetype viability. Raising back to 85 makes SEAL impossible for McCarthy-style prose.

### THRESHOLD: MACRO_AXIS_FLOOR (global)
- Value: **80**
- File:Line: `config.ts:438`
- Provenance: Phase W recalibration 85->80.
- Domain: Global minimum for any macro axis (overridden per-axis by MACRO_FLOORS).
- Duplicated: `MACRO_REJECT_BELOW=80` (config.ts:441).
- Magic number: NO
- Impact if changed: Tightens/loosens global axis floor.

---

## TIER 4 — SCORING INTERNALS

### THRESHOLD: S-Oracle WEIGHTS (interiority, tension_14d, etc.)
- Values: `interiority=2.0, tension_14d=3.0, sensory_density=1.5, necessity=1.0, anti_cliche=1.0, rhythm=1.0, signature=1.0, impact=2.0, emotion_coherence=2.5`
- File:Line: `config.ts:69-79`
- Provenance: Documented sum = 15.0, emotion fraction = 63.3%.
- Domain: S-Oracle micro-axis weights. FR literary prose, Sonnet regime.
- Duplicated: `oracle/macro-axes.ts:118-124` uses subset (emotion-only weights, base_total=9.5).
- Magic number: NO
- Impact if changed: Rebalances scoring. tension_14d=3.0 is the "ARME NUCLEAIRE".

### THRESHOLD: REJECT_BELOW
- Value: **60**
- File:Line: `config.ts:56`
- Provenance: UNKNOWN — no calibration trace.
- Domain: Absolute rejection floor. Composite < 60 = immediate REJECT.
- Duplicated: None.
- Magic number: **YES** (no provenance)
- Impact if changed: Safety net. Lowering allows very weak text to enter correction loop.

### THRESHOLD: CONFIDENCE_DISABLE_THRESHOLD
- Value: **0.20**
- File:Line: `scoring/coefficients-loader.ts:18`, `scoring/multi-stage-scorer.ts:25`
- Provenance: UNKNOWN.
- Domain: rhythmConfidence < 0.20 -> rhythm scoring disabled.
- Duplicated: **Two identical definitions in different files** (not imported from common source).
- Magic number: **YES** (no provenance, duplicated)
- Impact if changed: Lower = rhythm scoring active on uncertain data. Higher = more scoring disabled.

### THRESHOLD: LOCAL_FAIL_THRESHOLD
- Value: **30.0**
- File:Line: `scoring/multi-stage-scorer.ts:26`
- Provenance: UNKNOWN.
- Domain: Local score < 30.0 = fail.
- Duplicated: None.
- Magic number: **YES**
- Impact if changed: Safety net for local scoring.

### THRESHOLD: INTERVENTION_THRESHOLD (micro-surgeon)
- Value: **0.35**
- File:Line: `microsurgery/micro-surgeon.ts:148`
- Provenance: Sprint SEAL comment: "lowered from 0.45 to catch more weak quartiles".
- Domain: Quartile similarity below 0.35 triggers intervention.
- Duplicated: None.
- Magic number: NO (documented recalibration)
- Impact if changed: Lower = fewer interventions. Higher = more aggressive micro-surgery.

### THRESHOLD: HOOK_INTERVENTION_THRESHOLD
- Value: **70**
- File:Line: `microsurgery/micro-surgeon.ts:157`
- Provenance: UNKNOWN.
- Domain: Hook presence score threshold.
- Duplicated: None.
- Magic number: **YES**
- Impact if changed: Controls hook injection trigger point.

---

## TIER 5 — DAMAGE GATE THRESHOLDS

### THRESHOLD: DEFAULT_THRESHOLDS (damage categories)
- Values:
  - `MUSICALITE: 0.15` (recalibrated 0.10->0.15 per INV-GATE-INTERIOR-01)
  - `COMPLEXITE: 0.05`
  - `SENSORIEL: 0.03`
  - `LEXICAL: 0.08`
  - `INTERIORITE: 0.15`
  - `TENSION: 0.50`
- File:Line: `microsurgery/damage-gate.ts:164-171`
- Provenance: Phase W bootstrap (1000x). MUSICALITE has detailed calibration trace (16-20 sentence range, 20% safety margin). Others: partial calibration notes.
- Domain: Maximum acceptable |delta| per damage category. Valid for 600-word FR generated scene (15-23 sentences).
- Duplicated: None (single SSOT).
- Magic number: NO (MUSICALITE well-documented; others partially)
- Impact if changed: MUSICALITE < 0.15 -> blocks INTERIOR archetype. TENSION at 0.50 is permissive (allows large tension swings).

### THRESHOLD: max_amplitude (damage gate)
- Value: **0.50**
- File:Line: `microsurgery/damage-gate.ts:175`
- Provenance: Phase W calibration formula: `delta = slope * min(amplitude, 0.50) * archetype_factor`.
- Domain: Cap on perturbation amplitude.
- Duplicated: `microsurgery/style-presets.ts:65,87`.
- Magic number: NO
- Impact if changed: Higher cap allows larger perturbations, larger damage.

### THRESHOLD: damage_threshold_per_axis (targeted-patch)
- Value: **2.0**
- File:Line: `polish/targeted-patch.ts:39`
- Provenance: UNKNOWN.
- Domain: Maximum score regression per axis during patch application.
- Duplicated: `semantic/types.ts:106` as `min_improvement_threshold: 2.0`, `polish/sentence-surgeon.ts:159` as `DEFAULT_MIN_IMPROVEMENT = 2.0`, `validation/phase-u/polish-engine.ts:151` as `MAX_REGRESSION_DELTA = 2.0`. **Same value (2.0) used across 4 files for conceptually related but distinct purposes.**
- Magic number: Partially — named constant, but the "2.0" value itself appears in 4+ locations without a shared SSOT.
- Impact if changed: Lower = stricter patch acceptance. Higher = allows more regression.

---

## TIER 6 — POLISH ENGINE & VALIDATION

### THRESHOLD: POLISH_MIN_COMPOSITE
- Value: **89.0**
- File:Line: `validation/phase-u/polish-engine.ts:41`
- Provenance: UNKNOWN.
- Domain: Minimum composite before polish is triggered.
- Duplicated: None.
- Magic number: **YES**
- Impact if changed: Lower = polish applied to weaker candidates.

### THRESHOLD: NOVELTY_TARGET
- Value: **82.0**
- File:Line: `validation/phase-u/polish-engine.ts:47`
- Provenance: UNKNOWN.
- Domain: Target novelty score after SII polish.
- Duplicated: None.
- Magic number: **YES**
- Impact if changed: Higher = harder to achieve novelty target.

### THRESHOLD: COMPOSITE_TOLERANCE
- Value: **1.0**
- File:Line: `validation/phase-u/polish-engine.ts:62`
- Provenance: INV-PE-12.
- Domain: Composite can drop by max 1.0 during polish acceptance.
- Duplicated: None.
- Magic number: NO
- Impact if changed: Higher = more lenient polish acceptance.

### THRESHOLD: DRIFT_MAX_WORDS_PCT
- Value: **0.07** (7%)
- File:Line: `validation/phase-u/polish-engine.ts:71`
- Provenance: UNKNOWN.
- Domain: Maximum word count drift during polish.
- Duplicated: None.
- Magic number: **YES**
- Impact if changed: Higher = allows more text length change.

### THRESHOLD: SAGA_READY_RATE_MIN
- Value: **0.05** (5%)
- File:Line: `validation/phase-u/phase-u-exit-validator.ts:106`
- Provenance: MET-EU-06.
- Domain: Minimum fraction of Top-K candidates that must be SAGA_READY.
- Duplicated: None.
- Magic number: NO
- Impact if changed: Higher = stricter Phase U exit gate.

### THRESHOLD: SII_FLOOR_PENALTY_FACTOR
- Value: **5.0**
- File:Line: `validation/phase-u/top-k-selection.ts:133`
- Provenance: UNKNOWN.
- Domain: Penalty factor per point below SII floor (divided by 10).
- Duplicated: None.
- Magic number: **YES**
- Impact if changed: Higher = stronger penalty for low SII.

---

## TIER 7 — SCORING MODELS (V2/V3)

### THRESHOLD: INTERCEPT (multi-stage-scorer-v2)
- Value: **5.857100**
- File:Line: `scoring/multi-stage-scorer-v2.ts:99`
- Provenance: Regression model. Empirical (R3 coefficients).
- Domain: Linear regression intercept for V2 scorer.
- Duplicated: None (V3 has its own: 7.455419).
- Magic number: NO (regression output)
- Impact if changed: Shifts all V2 scores.

### THRESHOLD: RAW_MIN / RAW_MAX (V2)
- Values: `RAW_MIN=1.5, RAW_MAX=6.0`
- File:Line: `scoring/multi-stage-scorer-v2.ts:103-104`
- Provenance: Observed corpus range. Comment: "S mean pred=4.156, D mean pred=3.616".
- Domain: 0-100 normalization bounds for V2.
- Duplicated: V3 uses different values (2.0, 5.5).
- Magic number: Partially — derived from corpus but bounds are manual.
- Impact if changed: Stretches/compresses 0-100 score range.

### THRESHOLD: RAW_MIN / RAW_MAX (V3)
- Values: `RAW_MIN=2.0, RAW_MAX=5.5`
- File:Line: `scoring/multi-stage-scorer-v3.ts:100-101`
- Provenance: Corpus observation (narrower range than V2).
- Domain: 0-100 normalization bounds for V3.
- Duplicated: None.
- Magic number: Partially
- Impact if changed: Same as V2 but for V3 scorer.

---

## TIER 8 — MISCELLANEOUS THRESHOLDS

### THRESHOLD: DUAL_SCALE weights (W_LOCAL / W_ARC)
- Values: `W_LOCAL=0.43, W_ARC=0.57`
- File:Line: `scoring/dual-scale.ts:12-13`
- Provenance: R2 FR calibration. Comment: "R2 FR @600w=0.297, R2 FR @3000w=0.519".
- Domain: Local vs arc score weighting. Shadow mode (D1).
- Duplicated: None.
- Magic number: NO (empirical R2-based)
- Impact if changed: Rebalances local vs arc contribution.

### THRESHOLD: CI_L37 weights (W_SUB / W_F26B)
- Values: `W_SUB=0.60, W_F26B=0.40`
- File:Line: `scoring/ci-l37.ts:26-27`
- Provenance: UNKNOWN — comment says "sub=cause profonde, f26b=effet mediatise".
- Domain: Sub-score weighting for CI_L37 index.
- Duplicated: None.
- Magic number: **YES** (no calibration trace)
- Impact if changed: Shifts CI_L37 composite balance.

### THRESHOLD: Delta report weights
- Values: `emotion=0.4, tension=0.3, style=0.2, cliche=0.1`
- File:Line: `delta/delta-report.ts:89-92`
- Provenance: UNKNOWN.
- Domain: Global distance computation weights.
- Duplicated: None.
- Magic number: **YES** — inline unnamed weights in function body.
- Impact if changed: Changes what triggers correction loop.

### THRESHOLD: DEFAULT_CONTRADICTION_THRESHOLD
- Value: **0.4**
- File:Line: `semantic/emotion-contradiction.ts:23`
- Provenance: UNKNOWN.
- Domain: Emotion intensity > 0.4 = active for contradiction detection.
- Duplicated: None.
- Magic number: **YES** (default parameter, no calibration)
- Impact if changed: Lower = more contradictions detected.

### THRESHOLD: SOUL_WARMTH_FLOOR
- Value: **0.5**
- File:Line: `filter/soul-layer.ts:31`
- Provenance: UNKNOWN.
- Domain: Minimum "soul warmth" score.
- Duplicated: None.
- Magic number: **YES**
- Impact if changed: Affects soul-layer filtering.

### THRESHOLD: MONOTONY_THRESHOLD
- Value: **0.1**
- File:Line: `config.ts:318`
- Provenance: UNKNOWN.
- Domain: Arousal std dev < 0.1 = monotone scene.
- Duplicated: `polish/musical-engine.ts:174` uses same value (`threshold = 0.1`) inline.
- Magic number: **YES** (named in config, inline in musical-engine)
- Impact if changed: Higher = more scenes flagged as monotone.

### THRESHOLD: ECC_ENTROPY_STDDEV_THRESHOLD
- Value: **0.15**
- File:Line: `config.ts:477`
- Provenance: UNKNOWN.
- Domain: Triggers entropy bonus in ECC computation.
- Duplicated: None.
- Magic number: **YES**
- Impact if changed: Lower = more entropy bonuses. Higher = fewer.

### THRESHOLD: SIGNATURE_HIT_RATE_MIN
- Value: **0.30**
- File:Line: `config.ts:362`
- Provenance: UNKNOWN.
- Domain: If < 30% signature words present -> penalty.
- Duplicated: None.
- Magic number: **YES** (no calibration trace)
- Impact if changed: Lower = less strict signature enforcement.

### THRESHOLD: Physics correlation levels
- Values: `L1=0.3, L2=0.5, L3=0.7`
- File:Line: `calibration/physics-activation.ts:62-64`
- Provenance: UNKNOWN — stepped thresholds for physics activation.
- Domain: Minimum Pearson correlation to enable physics at each level.
- Duplicated: None.
- Magic number: **YES** (round numbers, no calibration)
- Impact if changed: Lower = physics activated earlier. Higher = requires stronger correlation.

### THRESHOLD: Genius G-score weights
- Values: `D=0.25, S=0.15, I=0.05, R=0.35, V=0.20`
- File:Line: `genius/genius-metrics.ts:207`
- Provenance: "omegaP0 calibrated weighted sum" — provenance unclear.
- Domain: Genius metric computation.
- Duplicated: None.
- Magic number: Partially — inline formula with named variables but no calibration artifact.
- Impact if changed: Rebalances genius scoring dimensions.

---

## SSOT VIOLATIONS FOUND

| # | Value | SSOT Location | Duplicate Location | Issue |
|---|-------|---------------|-------------------|-------|
| 1 | 92.0 (SAGA_READY) | `core/thresholds.ts:34` | `engine.ts:198` local const | Should import from SSOT |
| 2 | 85.0 (min_axis) | `core/thresholds.ts:37` | `engine.ts:199` local const | Should import from SSOT |
| 3 | 85 (floor) | `core/thresholds.ts:27` | `duel/duel-engine.ts:137` hardcoded in formula | Should import from SSOT |
| 4 | 93/93.0 (SEAL) | `core/thresholds.ts:24` | `config.ts:50` independent definition | Dual source of truth |
| 5 | Macro weights | `config.ts:417-422` | `calibration/weight-calibrator.ts:68-73` | **Values diverge** |
| 6 | 0.20 (confidence) | `scoring/coefficients-loader.ts:18` | `scoring/multi-stage-scorer.ts:25` | Duplicated definition |
| 7 | 2.0 (regression delta) | 4 files | No shared constant | Implicit convention |

---

## MAGIC NUMBER INVENTORY

| Value | File:Line | Severity | Recommendation |
|-------|-----------|----------|----------------|
| 0.30 | `engine.ts:455` (CLIFF_THRESHOLD) | HIGH | Extract to config.ts, add calibration |
| 0.50 | `engine.ts:456` (CLIFF_QUALITY_TARGET) | MEDIUM | Extract to config.ts |
| 60 | `config.ts:56` (REJECT_BELOW) | MEDIUM | Add provenance comment |
| 50 | `config.ts:63` (AXIS_FLOOR) | MEDIUM | Add provenance comment |
| 0.4/0.3/0.2/0.1 | `delta/delta-report.ts:89-92` | HIGH | Extract to named constants |
| 0.4 | `semantic/emotion-contradiction.ts:23` | LOW | Document calibration basis |
| 0.5 | `filter/soul-layer.ts:31` | LOW | Document calibration basis |
| 30.0 | `scoring/multi-stage-scorer.ts:26` | MEDIUM | Add provenance |
| 0.1 | `polish/musical-engine.ts:174` | MEDIUM | Import from config.ts MONOTONY_THRESHOLD |
| 70 | `microsurgery/micro-surgeon.ts:157` | MEDIUM | Add provenance |
| 89.0 | `validation/phase-u/polish-engine.ts:41` | HIGH | No calibration trace for important gate |

---

## PROVENANCE CLASSIFICATION

| Class | Count | Examples |
|-------|-------|---------|
| Phase W calibration (bootstrap 1000x) | 6 | Damage gate slopes, MUSICALITE threshold |
| Sprint recalibration (documented) | 5 | SEAL 92->93, SII floor 85->80, INTERVENTION 0.45->0.35 |
| Empirical (corpus masters) | 3 | CV_GATE (Flaubert/Proust/Duras), DUAL_SCALE R2 |
| Sealed artifact | 1 | delta-threshold.json (SHA256 + date) |
| INV-referenced | 4 | INV-SEAL-01, INV-SR-01, INV-PE-11, INV-PE-12 |
| Regression model output | 4 | INTERCEPT, feature weights (V2/V3) |
| UNKNOWN / undocumented | 14 | CLIFF_THRESHOLD, AXIS_FLOOR, delta weights, etc. |
| Blackbox (round numbers) | 5 | L1=0.3, L2=0.5, L3=0.7, REJECT_BELOW=60, etc. |

---

## RISK ASSESSMENT

### HIGH RISK
1. **engine.ts:198-199** — SAGA_READY thresholds duplicated as local consts instead of importing from `core/thresholds.ts`. If SSOT changes, engine.ts silently diverges.
2. **weight-calibrator.ts vs config.ts** — Macro weights are different. calibrator's "default" does not match production config. Calibration results may be computed against wrong baseline.
3. **delta/delta-report.ts:89-92** — Global distance weights are unnamed inline magic numbers. No calibration. This controls whether the correction loop triggers.

### MEDIUM RISK
4. **CLIFF_THRESHOLD=0.30** (engine.ts:455) — No calibration trace. Controls narrative cliffhanger post-processing.
5. **AXIS_FLOOR=50** (config.ts:63) — No provenance for this critical safety net.
6. **Value 2.0 repeated in 4 files** — Not a shared constant. If one file changes, others silently diverge.

### LOW RISK
7. Scoring model intercepts/bounds are model-specific and expected to differ between V2/V3.
8. Shadow-mode thresholds (DUAL_SCALE, CI_L37) have no pipeline impact currently.

---

**END OF LIVRABLE 08**
**Analyst**: Claude Code (IRM Phase R)
**Method**: Static analysis, read-only
**Files scanned**: 52 TypeScript source files in `packages/sovereign-engine/src/`
