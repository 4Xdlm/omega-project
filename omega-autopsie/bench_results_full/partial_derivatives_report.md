# OMEGA Phase W — Partial Derivatives Report
**Date**: 2026-03-17 06:06
**Data**: 8225 perturbations, 235 chapters, 7 types, 5 amplitudes

## Summary Matrix (7 perturbations x 6 categories)

Slope = partial derivative of category z-score delta with respect to amplitude.
Positive slope = perturbation INCREASES the category value.
Stars: *** p<0.001, ** p<0.01, * p<0.05

| Perturbation | MUSICALITE | COMPLEXITE | SENSORIEL | LEXICAL | INTERIORITE | TENSION |
|---|---|---|---|---|---|---|
| UNIFORMIZE_RHYTHM              | +0.009 (r²=0.00) | +0.026*** (r²=0.01) | -0.016 (r²=0.00) | +0.026*** (r²=0.02) | -0.006 (r²=0.00) | +0.002 (r²=0.00) |
| SIMPLIFY_VOCABULARY            | +0.000 (r²=0.00) | -0.000 (r²=0.00) | -0.020*** (r²=0.02) | -0.003 (r²=0.00) | -0.003 (r²=0.00) | +0.005* (r²=0.01) |
| COMPLEXIFY_SYNTAX              | +0.012 (r²=0.00) | +0.201*** (r²=0.31) | -0.003 (r²=0.00) | +0.128*** (r²=0.32) | +0.092*** (r²=0.25) | -0.466*** (r²=0.17) |
| REMOVE_INTERIORITY             | -0.001 (r²=0.00) | -0.012*** (r²=0.09) | -0.015*** (r²=0.02) | -0.034*** (r²=0.12) | -1.118*** (r²=0.49) | -0.000 (r²=0.00) |
| INJECT_SYNCOPES                | -0.029 (r²=0.00) | -0.217*** (r²=0.46) | +0.103*** (r²=0.04) | -0.177*** (r²=0.27) | -0.254*** (r²=0.56) | -0.318*** (r²=0.15) |
| ENRICH_VOCABULARY              | +0.001 (r²=0.00) | -0.001 (r²=0.00) | -0.022*** (r²=0.04) | +0.009*** (r²=0.03) | -0.009 (r²=0.00) | +0.022*** (r²=0.02) |
| NEUTRALIZE_TENSION             | +0.000 (r²=0.00) | +0.000 (r²=0.00) | -0.005** (r²=0.01) | -0.001 (r²=0.00) | +0.000 (r²=0.00) | -0.001 (r²=0.00) |

## Feature-Level Details

### P01_UNIFORMIZE_RHYTHM

| Feature | Slope | R² | p-value | CI 95% |
|---------|-------|-----|---------|--------|
| f1_mean                        | +0.8714*** | 0.132 | 0.0000 | [+0.7436, +0.9993] |
| f1a_rhythm_variance            | -0.4300**  | 0.010 | 0.0011 | [-0.6723, -0.1877] |
| f21e_ritual_index              | +0.0123*** | 0.022 | 0.0000 | [+0.0076, +0.0170] |
| f22f_literary_index            | +0.0032*** | 0.105 | 0.0000 | [+0.0027, +0.0038] |
| f25g_description_score         | -0.0015*** | 0.098 | 0.0000 | [-0.0017, -0.0012] |
| f24e_contrast_score            | -0.0012    | 0.001 | 0.6453 | [-0.0036, +0.0012] |
| f27d_modal_score               | -0.0011    | 0.003 | 0.1528 | [-0.0023, +0.0001] |
| f26c_period_score              | +0.0010    | 0.001 | 0.6339 | [-0.0009, +0.0029] |
| f23d_literary_causal_score     | +0.0007    | 0.001 | 0.7347 | [-0.0008, +0.0023] |
| f19e_window_median             | -0.0005    | 0.000 | 1.0000 | [-0.0050, +0.0041] |
| f28d_sil_score                 | -0.0002    | 0.001 | 0.6332 | [-0.0007, +0.0002] |
| f30d_ps_imp_ratio              | -0.0000    | 0.000 | 1.0000 | [-0.0009, +0.0008] |
| f29b_ttr_window                | +0.0000    | 0.000 | 1.0000 | [-0.0003, +0.0003] |

### P02_SIMPLIFY_VOCABULARY

| Feature | Slope | R² | p-value | CI 95% |
|---------|-------|-----|---------|--------|
| f25g_description_score         | -0.0053*** | 0.024 | 0.0000 | [-0.0072, -0.0034] |
| f21e_ritual_index              | +0.0048*** | 0.032 | 0.0000 | [+0.0033, +0.0063] |
| f23d_literary_causal_score     | +0.0024**  | 0.009 | 0.0031 | [+0.0009, +0.0039] |
| f30d_ps_imp_ratio              | -0.0019**  | 0.008 | 0.0045 | [-0.0031, -0.0007] |
| f1_mean                        | +0.0010    | 0.002 | 0.2635 | [-0.0003, +0.0023] |
| f29b_ttr_window                | -0.0009*** | 0.019 | 0.0000 | [-0.0013, -0.0006] |
| f27d_modal_score               | -0.0003    | 0.000 | 1.0000 | [-0.0017, +0.0010] |
| f1a_rhythm_variance            | -0.0003    | 0.002 | 0.2635 | [-0.0007, +0.0001] |
| f28d_sil_score                 | -0.0002    | 0.000 | 1.0000 | [-0.0021, +0.0018] |
| f24e_contrast_score            | +0.0000    | 0.002 | 0.2635 | [-0.0000, +0.0001] |
| f22f_literary_index            | -0.0000    | 0.000 | 1.0000 | [-0.0011, +0.0011] |
| f26c_period_score              | +0.0000    | 0.002 | 0.2635 | [-0.0000, +0.0000] |
| f19e_window_median             | +0.0000    | 0.000 | 1.0000 | [+0.0000, +0.0000] |

### P03_COMPLEXIFY_SYNTAX

| Feature | Slope | R² | p-value | CI 95% |
|---------|-------|-----|---------|--------|
| f1_mean                        | +1.9326*** | 0.422 | 0.0000 | [+1.8032, +2.0621] |
| f30d_ps_imp_ratio              | -0.4138*** | 0.081 | 0.0000 | [-0.4938, -0.3339] |
| f1a_rhythm_variance            | -0.3773*** | 0.229 | 0.0000 | [-0.4168, -0.3377] |
| f23d_literary_causal_score     | -0.1114*** | 0.200 | 0.0000 | [-0.1241, -0.0986] |
| f21e_ritual_index              | +0.0574*** | 0.348 | 0.0000 | [+0.0529, +0.0619] |
| f22f_literary_index            | +0.0176*** | 0.256 | 0.0000 | [+0.0159, +0.0193] |
| f27d_modal_score               | +0.0175*** | 0.263 | 0.0000 | [+0.0159, +0.0192] |
| f26c_period_score              | +0.0156*** | 0.372 | 0.0000 | [+0.0144, +0.0167] |
| f19e_window_median             | -0.0046    | 0.004 | 0.0723 | [-0.0090, -0.0003] |
| f28d_sil_score                 | +0.0036*** | 0.127 | 0.0000 | [+0.0030, +0.0041] |
| f25g_description_score         | +0.0033*** | 0.094 | 0.0000 | [+0.0027, +0.0039] |
| f24e_contrast_score            | -0.0019    | 0.001 | 0.7054 | [-0.0059, +0.0021] |
| f29b_ttr_window                | +0.0004    | 0.003 | 0.0970 | [+0.0000, +0.0007] |

### P04_REMOVE_INTERIORITY

| Feature | Slope | R² | p-value | CI 95% |
|---------|-------|-----|---------|--------|
| f27d_modal_score               | -0.2672*** | 0.524 | 0.0000 | [-0.2817, -0.2526] |
| f1_mean                        | -0.1652*** | 0.324 | 0.0000 | [-0.1789, -0.1516] |
| f1a_rhythm_variance            | -0.1218*** | 0.235 | 0.0000 | [-0.1344, -0.1092] |
| f28d_sil_score                 | -0.0304*** | 0.214 | 0.0000 | [-0.0337, -0.0271] |
| f21e_ritual_index              | -0.0053*** | 0.090 | 0.0000 | [-0.0063, -0.0044] |
| f25g_description_score         | -0.0026*** | 0.078 | 0.0000 | [-0.0032, -0.0021] |
| f26c_period_score              | -0.0018*** | 0.081 | 0.0000 | [-0.0021, -0.0014] |
| f29b_ttr_window                | -0.0016*** | 0.071 | 0.0000 | [-0.0020, -0.0013] |
| f19e_window_median             | +0.0011    | 0.001 | 0.5081 | [-0.0008, +0.0030] |
| f24e_contrast_score            | -0.0006    | 0.002 | 0.2958 | [-0.0013, +0.0002] |
| f22f_literary_index            | -0.0003**  | 0.010 | 0.0012 | [-0.0004, -0.0001] |
| f23d_literary_causal_score     | -0.0001    | 0.000 | 1.0000 | [-0.0006, +0.0003] |
| f30d_ps_imp_ratio              | -0.0000    | 0.000 | 1.0000 | [-0.0009, +0.0009] |

### P05_INJECT_SYNCOPES

| Feature | Slope | R² | p-value | CI 95% |
|---------|-------|-----|---------|--------|
| f1_mean                        | -4.4217*** | 0.692 | 0.0000 | [-4.5907, -4.2528] |
| f30d_ps_imp_ratio              | -0.8989*** | 0.292 | 0.0000 | [-0.9790, -0.8188] |
| f1a_rhythm_variance            | +0.5717*** | 0.106 | 0.0000 | [+0.4766, +0.6669] |
| f21e_ritual_index              | -0.1349*** | 0.577 | 0.0000 | [-0.1415, -0.1283] |
| f27d_modal_score               | -0.0513*** | 0.492 | 0.0000 | [-0.0542, -0.0483] |
| f23d_literary_causal_score     | +0.0511*** | 0.385 | 0.0000 | [+0.0474, +0.0548] |
| f26c_period_score              | -0.0269*** | 0.483 | 0.0000 | [-0.0285, -0.0253] |
| f25g_description_score         | +0.0178*** | 0.059 | 0.0000 | [+0.0137, +0.0219] |
| f19e_window_median             | +0.0119*** | 0.021 | 0.0000 | [+0.0073, +0.0165] |
| f22f_literary_index            | -0.0100*** | 0.141 | 0.0000 | [-0.0115, -0.0086] |
| f28d_sil_score                 | -0.0091*** | 0.330 | 0.0000 | [-0.0098, -0.0083] |
| f29b_ttr_window                | +0.0081*** | 0.466 | 0.0000 | [+0.0076, +0.0086] |
| f24e_contrast_score            | +0.0040**  | 0.007 | 0.0084 | [+0.0013, +0.0067] |

### P06_ENRICH_VOCABULARY

| Feature | Slope | R² | p-value | CI 95% |
|---------|-------|-----|---------|--------|
| f21e_ritual_index              | +0.0274*** | 0.426 | 0.0000 | [+0.0256, +0.0293] |
| f30d_ps_imp_ratio              | -0.0179*** | 0.020 | 0.0000 | [-0.0251, -0.0107] |
| f23d_literary_causal_score     | +0.0128*** | 0.040 | 0.0000 | [+0.0092, +0.0164] |
| f25g_description_score         | -0.0058*** | 0.049 | 0.0000 | [-0.0072, -0.0043] |
| f29b_ttr_window                | -0.0036*** | 0.514 | 0.0000 | [-0.0038, -0.0034] |
| f27d_modal_score               | -0.0032**  | 0.008 | 0.0033 | [-0.0051, -0.0012] |
| f1_mean                        | -0.0003    | 0.000 | 1.0000 | [-0.0015, +0.0009] |
| f22f_literary_index            | -0.0002    | 0.000 | 1.0000 | [-0.0014, +0.0010] |
| f19e_window_median             | +0.0001    | 0.000 | 1.0000 | [-0.0002, +0.0003] |
| f1a_rhythm_variance            | +0.0001    | 0.000 | 1.0000 | [-0.0002, +0.0003] |
| f24e_contrast_score            | +0.0000    | 0.000 | 1.0000 | [-0.0001, +0.0002] |
| f28d_sil_score                 | -0.0000    | 0.000 | 1.0000 | [-0.0021, +0.0021] |
| f26c_period_score              | -0.0000    | 0.000 | 1.0000 | [-0.0000, +0.0000] |

### P07_NEUTRALIZE_TENSION

| Feature | Slope | R² | p-value | CI 95% |
|---------|-------|-----|---------|--------|
| f30d_ps_imp_ratio              | -0.0025    | 0.004 | 0.0502 | [-0.0047, -0.0003] |
| f21e_ritual_index              | +0.0019*** | 0.089 | 0.0000 | [+0.0015, +0.0022] |
| f25g_description_score         | -0.0014**  | 0.008 | 0.0046 | [-0.0023, -0.0005] |
| f29b_ttr_window                | -0.0003*** | 0.119 | 0.0000 | [-0.0004, -0.0003] |
| f27d_modal_score               | -0.0000    | 0.000 | 1.0000 | [-0.0015, +0.0015] |
| f28d_sil_score                 | +0.0000    | 0.000 | 1.0000 | [-0.0021, +0.0022] |
| f1_mean                        | +0.0000    | 0.000 | 1.0000 | [+0.0000, +0.0000] |
| f1a_rhythm_variance            | +0.0000    | 0.000 | 1.0000 | [+0.0000, +0.0000] |
| f19e_window_median             | +0.0000    | 0.000 | 1.0000 | [+0.0000, +0.0000] |
| f22f_literary_index            | +0.0000    | 0.000 | 1.0000 | [-0.0009, +0.0009] |
| f23d_literary_causal_score     | -0.0000    | 0.000 | 1.0000 | [-0.0005, +0.0005] |
| f24e_contrast_score            | +0.0000    | 0.000 | 1.0000 | [+0.0000, +0.0000] |
| f26c_period_score              | +0.0000    | 0.000 | 1.0000 | [+0.0000, +0.0000] |

## Top Insights

1. **P04_REMOVE_INTERIORITY** DECREASES **INTERIORITE** (slope=-1.118, r²=0.49, p=0.0000)
2. **P03_COMPLEXIFY_SYNTAX** DECREASES **TENSION** (slope=-0.466, r²=0.17, p=0.0000)
3. **P05_INJECT_SYNCOPES** DECREASES **TENSION** (slope=-0.318, r²=0.15, p=0.0000)
4. **P05_INJECT_SYNCOPES** DECREASES **INTERIORITE** (slope=-0.254, r²=0.56, p=0.0000)
5. **P05_INJECT_SYNCOPES** DECREASES **COMPLEXITE** (slope=-0.217, r²=0.46, p=0.0000)
6. **P03_COMPLEXIFY_SYNTAX** INCREASES **COMPLEXITE** (slope=+0.201, r²=0.31, p=0.0000)
7. **P05_INJECT_SYNCOPES** DECREASES **LEXICAL** (slope=-0.177, r²=0.27, p=0.0000)
8. **P03_COMPLEXIFY_SYNTAX** INCREASES **LEXICAL** (slope=+0.128, r²=0.32, p=0.0000)
9. **P05_INJECT_SYNCOPES** INCREASES **SENSORIEL** (slope=+0.103, r²=0.04, p=0.0000)
10. **P03_COMPLEXIFY_SYNTAX** INCREASES **INTERIORITE** (slope=+0.092, r²=0.25, p=0.0000)

## Cross-Coupling Effects

Perturbations that significantly affect categories OTHER than their primary target:

- **P01_UNIFORMIZE_RHYTHM**: LEXICAL (+0.026), COMPLEXITE (+0.026)
- **P02_SIMPLIFY_VOCABULARY**: SENSORIEL (-0.020)
- **P03_COMPLEXIFY_SYNTAX**: TENSION (-0.466), COMPLEXITE (+0.201), LEXICAL (+0.128), INTERIORITE (+0.092)
- **P04_REMOVE_INTERIORITY**: LEXICAL (-0.034), SENSORIEL (-0.015), COMPLEXITE (-0.012)
- **P05_INJECT_SYNCOPES**: TENSION (-0.318), INTERIORITE (-0.254), COMPLEXITE (-0.217), LEXICAL (-0.177), SENSORIEL (+0.103)
- **P06_ENRICH_VOCABULARY**: SENSORIEL (-0.022), TENSION (+0.022)

---
*Generated by compute_partial_derivatives.py — Phase W*