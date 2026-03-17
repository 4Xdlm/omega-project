# Lexical LLM Perturbation Report

**Date**: 2026-03-17T16:02:24.035611+00:00
**Model**: claude-haiku-4-5-20251001
**Chapters**: 198 (skipped: 2)
**API calls**: 1184
**Elapsed**: 1872.7s

## Category Deltas (mean |delta|)

| Category | P02b_SIMPLIFY | P06b_ENRICH |
|----------|---------------|-------------|
| MUSICALITE | 0.063521 | 0.051891 |
| COMPLEXITE | 0.004060 | 0.002706 |
| SENSORIEL | 0.007359 | 0.008813 |
| LEXICAL | 0.010401 | 0.011958 |
| INTERIORITE | 0.006805 | 0.009692 |
| TENSION | 0.315475 | 0.252196 |

## Most Affected Features

### P02b_SIMPLIFY (top 5)

| Feature | mean_delta | mean_abs_delta |
|---------|-----------|----------------|
| f30d_ps_imp_ratio | -0.591592 | 0.610941 |
| f1_mean | 0.003636 | 0.124343 |
| f1a_rhythm_variance | -0.012717 | 0.060505 |
| f23d_literary_causal_score | -0.010163 | 0.020010 |
| f21e_ritual_index | -0.011932 | 0.014215 |

### P06b_ENRICH (top 5)

| Feature | mean_delta | mean_abs_delta |
|---------|-----------|----------------|
| f30d_ps_imp_ratio | -0.426332 | 0.480338 |
| f1_mean | 0.002071 | 0.108434 |
| f1a_rhythm_variance | 0.012146 | 0.040652 |
| f23d_literary_causal_score | -0.012239 | 0.024054 |
| f27d_modal_score | 0.011676 | 0.016899 |

## Key Findings

- **SIMPLIFY**: Most affected category = **TENSION** (mean |delta| = 0.315475)
- **ENRICH**: Most affected category = **TENSION** (mean |delta| = 0.252196)
- **Overall mean |delta|**: SIMPLIFY=0.067937, ENRICH=0.056209
- Simplification causes larger feature shifts than enrichment.
