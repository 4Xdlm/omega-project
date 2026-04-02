# INV-07: SLOPES PHASE W VERIFICATION
**Date**: 2026-04-02 | **Type**: READ-ONLY analysis | **Standard**: NASA-Grade L4

---

## 1. SOURCE FILES

- **Code**: `packages/sovereign-engine/src/microsurgery/damage-gate.ts` (319 lines)
- **Doc Roadmap**: `omega-autopsie/OMEGA_PHASE_W_INTEGRATION_ROADMAP.md`
- **Doc Session**: `omega-autopsie/SESSION_SAVE_2026-03-17_PHASE_W_COMPLETE.md`
- **Doc INT5**: `docs/SESSION_SAVE_2026-03-18_PHASE_W_INT5_FINAL.md`

---

## 2. SLOPES MATRIX VERIFICATION

### 2.1 Code Values (damage-gate.ts lines 85-105)

| Perturbation | MUSICALITE | COMPLEXITE | SENSORIEL | LEXICAL | INTERIORITE | TENSION |
|---|---|---|---|---|---|---|
| P03_COMPLEXIFY_SYNTAX | +0.838 | +0.029 | (absent=0) | +0.035 | +0.016 | -0.388 |
| P04_REMOVE_INTERIORITY | -0.064 | (absent=0) | (absent=0) | (absent=0) | -0.093 | (absent=0) |
| P05_INJECT_SYNCOPES | -1.156 | -0.022 | +0.011 | -0.048 | -0.025 | -0.382 |

**Total coded slopes**: 13 non-zero values (code comment claims "14 HIGH_CONFIDENCE").

### 2.2 Documentation Values (Roadmap section 1.2 + Session FORMULE FINALE)

Both docs contain identical slope matrix:

| Perturbation | MUSICALITE | COMPLEXITE | SENSORIEL | LEXICAL | INTERIORITE | TENSION |
|---|---|---|---|---|---|---|
| P03 Syntaxe | +0.838 +/-0.03 | +0.029 +/-0.001 | ~0 | +0.035 +/-0.001 | +0.016 +/-0.001 | -0.388 +/-0.02 |
| P04 Interiorite | -0.064 +/-0.007 | ~0 | ~0 | ~0 | -0.093 +/-0.003 | ~0 |
| P05 Syncopes | -1.156 +/-0.05 | -0.022 +/-0.001 | +0.011 +/-0.001 | -0.048 +/-0.001 | -0.025 +/-0.001 | -0.382 +/-0.02 |

**Total documented slopes**: 13 non-zero values (doc claims "14 HIGH_CONFIDENCE" in header).

### 2.3 Comparison Result

| Perturbation x Category | Code | Doc | Status |
|---|---|---|---|
| P03:MUSICALITE | +0.838 | +0.838 | **CONCORDANT** |
| P03:COMPLEXITE | +0.029 | +0.029 | **CONCORDANT** |
| P03:SENSORIEL | 0 (absent) | ~0 | **CONCORDANT** |
| P03:LEXICAL | +0.035 | +0.035 | **CONCORDANT** |
| P03:INTERIORITE | +0.016 | +0.016 | **CONCORDANT** |
| P03:TENSION | -0.388 | -0.388 | **CONCORDANT** |
| P04:MUSICALITE | -0.064 | -0.064 | **CONCORDANT** |
| P04:COMPLEXITE | 0 (absent) | ~0 | **CONCORDANT** |
| P04:SENSORIEL | 0 (absent) | ~0 | **CONCORDANT** |
| P04:LEXICAL | 0 (absent) | ~0 | **CONCORDANT** |
| P04:INTERIORITE | -0.093 | -0.093 | **CONCORDANT** |
| P04:TENSION | 0 (absent) | ~0 | **CONCORDANT** |
| P05:MUSICALITE | -1.156 | -1.156 | **CONCORDANT** |
| P05:COMPLEXITE | -0.022 | -0.022 | **CONCORDANT** |
| P05:SENSORIEL | +0.011 | +0.011 | **CONCORDANT** |
| P05:LEXICAL | -0.048 | -0.048 | **CONCORDANT** |
| P05:INTERIORITE | -0.025 | -0.025 | **CONCORDANT** |
| P05:TENSION | -0.382 | -0.382 | **CONCORDANT** |

**RESULT: 18/18 CONCORDANT** (all 13 non-zero + 5 zero/absent pairs match)

### 2.4 ANOMALY: "14 HIGH_CONFIDENCE" Count

Both code comment (line 77) and documentation (section 1.2) claim "14 HIGH_CONFIDENCE slopes". Actual count of non-zero slopes in both code and docs = **13**. This is a minor documentation discrepancy. Possible explanation: one slope may have been considered significant during research but rounded to ~0 before integration.

**Status: MINOR DISCREPANCY** (count label vs actual values)

---

## 3. ARCHETYPE MULTIPLIERS VERIFICATION

### 3.1 Code Values (damage-gate.ts lines 115-137)

| Archetype | Key | Multiplier |
|---|---|---|
| BALANCED | (all) | 1.0 (default) |
| BRUTAL | P03:TENSION | 5.39 |
| BRUTAL | P03:MUSICALITE | 1.93 |
| BRUTAL | P05:TENSION | 2.81 |
| BRUTAL | P05:MUSICALITE | 0.68 |
| CATHEDRAL | P03:TENSION | 0.81 |
| CATHEDRAL | P05:COMPLEXITE | 1.50 |
| CATHEDRAL | P04:INTERIORITE | 1.57 |
| INTERIOR | P05:MUSICALITE | 1.73 |
| INTERIOR | P04:INTERIORITE | 2.13 |
| INTERIOR | P03:TENSION | 0.65 |
| SENSORY | P04:INTERIORITE | 1.97 |
| SENSORY | P04:MUSICALITE | 1.62 |

**Total coded multipliers**: 12 explicit (all unspecified = 1.0 default)

### 3.2 Documentation Values (Roadmap section 1.5)

Documentation provides only a summary table with 2 key pairs:

| Archetype | P03->TENSION (doc) | P03->TENSION (code) | P05->MUSICALITE (doc) | P05->MUSICALITE (code) |
|---|---|---|---|---|
| BALANCED | x1.0 | 1.0 (default) | x1.0 | 1.0 (default) |
| BRUTAL | x5.4 | 5.39 | x0.68 | 0.68 |
| CATHEDRAL | x0.81 | 0.81 | x0.89 | (absent=1.0) |
| INTERIOR | x0.65 | 0.65 | x1.73 | 1.73 |
| SENSORY | x0.67 | (absent=1.0) | x1.06 | (absent=1.0) |

### 3.3 Comparison Result

| Archetype:Pair | Code | Doc | Status |
|---|---|---|---|
| BRUTAL:P03->TENSION | 5.39 | x5.4 | **CONCORDANT** (5.39 rounds to 5.4) |
| BRUTAL:P05->MUSICALITE | 0.68 | x0.68 | **CONCORDANT** |
| CATHEDRAL:P03->TENSION | 0.81 | x0.81 | **CONCORDANT** |
| CATHEDRAL:P05->MUSICALITE | 1.0 (default) | x0.89 | **DIVERGENT** |
| INTERIOR:P03->TENSION | 0.65 | x0.65 | **CONCORDANT** |
| INTERIOR:P05->MUSICALITE | 1.73 | x1.73 | **CONCORDANT** |
| SENSORY:P03->TENSION | 1.0 (default) | x0.67 | **DIVERGENT** |
| SENSORY:P05->MUSICALITE | 1.0 (default) | x1.06 | **DIVERGENT** |

**RESULT: 5/8 CONCORDANT, 3/8 DIVERGENT**

### 3.4 Divergence Analysis

| # | Pair | Code Value | Doc Value | Delta | Severity |
|---|---|---|---|---|---|
| D1 | CATHEDRAL:P05->MUSICALITE | 1.0 (absent) | 0.89 | -0.11 | LOW (near 1.0, minor effect) |
| D2 | SENSORY:P03->TENSION | 1.0 (absent) | 0.67 | -0.33 | MEDIUM (33% sensitivity difference) |
| D3 | SENSORY:P05->MUSICALITE | 1.0 (absent) | 1.06 | +0.06 | LOW (near 1.0, negligible) |

**Interpretation**: The code includes only multipliers with "significant deviations from BALANCED" (per code comment line 112-113). The doc summary table may include all B3 test results including non-significant ones. The code is MORE CONSERVATIVE (defaults to 1.0 for borderline cases). D2 (SENSORY:P03->TENSION at 0.67 vs 1.0) is the most significant omission.

Additional code-only multipliers NOT in doc summary: BRUTAL:P03->MUSICALITE (1.93), BRUTAL:P05->TENSION (2.81), CATHEDRAL:P05->COMPLEXITE (1.50), CATHEDRAL:P04->INTERIORITE (1.57), INTERIOR:P04->INTERIORITE (2.13), SENSORY:P04->INTERIORITE (1.97), SENSORY:P04->MUSICALITE (1.62). These are present in code but the doc summary only shows 2 columns. **No contradiction** -- the doc is simply a partial view.

---

## 4. THRESHOLDS VERIFICATION

### 4.1 Code Values (damage-gate.ts lines 164-171)

| Category | Threshold | Notes |
|---|---|---|
| MUSICALITE | 0.15 | Recalibrated 0.10 -> 0.15 (INV-GATE-INTERIOR-01) |
| COMPLEXITE | 0.05 | |
| SENSORIEL | 0.03 | |
| LEXICAL | 0.08 | |
| INTERIORITE | 0.15 | |
| TENSION | 0.50 | |

### 4.2 Documentation Values

| Source | MUSICALITE threshold | Notes |
|---|---|---|
| Session W COMPLETE (line 193) | 0.02 | "Contrainte: MUSICALITE seuil 0.02" |
| Hotfix commit 5d49e53b (Session W COMPLETE line 126) | 0.02 | "seuil 0.02, presets corriges" |
| W.INT-5 FINAL (line 66) | 0.15 | INV-GATE-INTERIOR-01: "0.10 -> 0.15" |
| W.INT-5 FINAL (line 75) | 0.15 | Doctrine gelee: "Calibre sur prose 16-20 phrases" |

No other thresholds are explicitly documented (COMPLEXITE, SENSORIEL, LEXICAL, INTERIORITE, TENSION were set during implementation without separate documentation).

### 4.3 Threshold Evolution Trace

```
Phase W initial implementation:  MUSICALITE = 0.0 (BUG -- blocked everything)
Hotfix 5d49e53b:                 MUSICALITE = 0.02
INV-GATE-INTERIOR-01 (W.INT-5): MUSICALITE = 0.10
INV-GATE-INTERIOR-01 recal:     MUSICALITE = 0.15  <-- CURRENT CODE VALUE
```

**RESULT: CONCORDANT** -- The current code value (0.15) matches the latest documented value (W.INT-5 FINAL doctrine gelee). Earlier docs (0.02) reflect historical states, not conflicts.

### 4.4 Direction-Aware Logic (INV-GATE-DIR-01)

Code (lines 234-252) implements direction-aware blocking for MUSICALITE:
- Positive delta (gain) -> never blocked
- Negative delta (loss) -> blocked if |delta| > 0.15

This matches W.INT-5 FINAL doc: "Damage Gate direction-aware: gains MUSICALITE toujours PASS"

**Status: CONCORDANT**

---

## 5. SUMMARY

| Verification Item | Count Checked | Concordant | Divergent | Status |
|---|---|---|---|---|
| Slopes Matrix (18 cells) | 18 | 18 | 0 | PASS |
| Archetype Multipliers (doc summary, 8 pairs) | 8 | 5 | 3 | PARTIAL |
| Archetype Multipliers (code-only, 12 entries) | 12 | n/a (no doc) | n/a | NO DOC BASELINE |
| MUSICALITE Threshold | 1 | 1 | 0 | PASS |
| Other Thresholds (5 categories) | 5 | n/a | n/a | NO DOC BASELINE |
| Direction-aware logic | 1 | 1 | 0 | PASS |
| "14 HIGH_CONFIDENCE" count claim | 1 | 0 | 1 | MINOR |

### Findings

1. **SLOPES: FULLY CONCORDANT** -- All 18 slope cells match exactly between code and docs.
2. **ARCHETYPE MULTIPLIERS: 3 DIVERGENCES** -- CATHEDRAL:P05->MUSICALITE (doc=0.89, code=1.0), SENSORY:P03->TENSION (doc=0.67, code=1.0), SENSORY:P05->MUSICALITE (doc=1.06, code=1.0). Code is more conservative (defaults near-1.0 values to 1.0). D2 is the most impactful (33% delta).
3. **THRESHOLDS: ONLY MUSICALITE DOCUMENTED** -- Current code (0.15) matches latest doc. Other 5 thresholds have no documentation baseline.
4. **MINOR: COUNT LABEL** -- "14 HIGH_CONFIDENCE" is stated but only 13 non-zero slopes exist in both code and docs.
