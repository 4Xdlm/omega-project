# Non-Linearity Analysis Report

**Generated**: 2026-03-17T13:24:11.407203
**Input**: 30420 perturbation results
**Pairs tested**: 10
**Non-linear**: 1/10 (10.0%)

## Summary

| Best Model | Count |
|------------|-------|
| linear | 2 |
| quadratic | 4 |
| saturating | 4 |

## Detailed Results

| Perturbation | Category | Best Model | R²_lin | R²_quad | R²_sat | ΔR²(q-l) | Non-linear? |
|---|---|---|---|---|---|---|---|
| P03 COMPLEXIFY SYNTAX | TENSION | saturating | 0.9395 | 0.9955 | 0.9993 | +0.0560 | YES |
| P04 REMOVE INTERIORITY | INTERIORITE | quadratic | 0.9655 | 0.9802 | 0.9640 | +0.0147 | no |
| P05 INJECT SYNCOPES | COMPLEXITE | saturating | 0.9966 | 0.9979 | 0.9980 | +0.0013 | no |
| P05 INJECT SYNCOPES | INTERIORITE | quadratic | 0.9976 | 0.9993 | 0.9992 | +0.0017 | no |
| P05 INJECT SYNCOPES | TENSION | quadratic | 0.9563 | 0.9985 | 0.9965 | +0.0421 | no |
| P05 INJECT SYNCOPES | LEXICAL | quadratic | 0.9780 | 0.9965 | 0.9958 | +0.0185 | no |
| P03 COMPLEXIFY SYNTAX | COMPLEXITE | linear | 0.9962 | 0.9944 | 0.9947 | -0.0019 | no |
| P03 COMPLEXIFY SYNTAX | LEXICAL | linear | 0.9986 | 0.9840 | 0.9847 | -0.0146 | no |
| P05 INJECT SYNCOPES | SENSORIEL | saturating | 0.8259 | 0.7869 | 0.9622 | -0.0390 | no |
| P03 COMPLEXIFY SYNTAX | INTERIORITE | saturating | 0.9944 | 0.9939 | 0.9946 | -0.0005 | no |

## Curve Data

### P03_COMPLEXIFY_SYNTAX → TENSION

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.024645 |
| 0.10 | 0.063483 |
| 0.25 | 0.142199 |
| 0.50 | 0.233199 |
| 1.00 | 0.354257 |

Saturation point (90%): amplitude ≈ 9.0909

### P04_REMOVE_INTERIORITY → INTERIORITE

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.009012 |
| 0.10 | 0.010173 |
| 0.25 | 0.019222 |
| 0.50 | 0.041694 |
| 1.00 | 0.096994 |

### P05_INJECT_SYNCOPES → COMPLEXITE

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.001285 |
| 0.10 | 0.002458 |
| 0.25 | 0.006081 |
| 0.50 | 0.011697 |
| 1.00 | 0.021419 |

### P05_INJECT_SYNCOPES → INTERIORITE

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.001105 |
| 0.10 | 0.002519 |
| 0.25 | 0.006609 |
| 0.50 | 0.013070 |
| 1.00 | 0.024456 |

### P05_INJECT_SYNCOPES → TENSION

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.014955 |
| 0.10 | 0.054838 |
| 0.25 | 0.142406 |
| 0.50 | 0.268906 |
| 1.00 | 0.422932 |

### P05_INJECT_SYNCOPES → LEXICAL

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.003580 |
| 0.10 | 0.006492 |
| 0.25 | 0.016425 |
| 0.50 | 0.031759 |
| 1.00 | 0.052198 |

### P03_COMPLEXIFY_SYNTAX → COMPLEXITE

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.002107 |
| 0.10 | 0.003805 |
| 0.25 | 0.008275 |
| 0.50 | 0.015674 |
| 1.00 | 0.028035 |

### P03_COMPLEXIFY_SYNTAX → LEXICAL

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.003520 |
| 0.10 | 0.005306 |
| 0.25 | 0.010588 |
| 0.50 | 0.019842 |
| 1.00 | 0.036332 |

### P05_INJECT_SYNCOPES → SENSORIEL

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.004076 |
| 0.10 | 0.008203 |
| 0.25 | 0.012484 |
| 0.50 | 0.016888 |
| 1.00 | 0.021998 |

Saturation point (90%): amplitude ≈ 2.25

### P03_COMPLEXIFY_SYNTAX → INTERIORITE

| Amplitude | Mean |Δ| |
|-----------|---------|
| 0.03 | 0.001172 |
| 0.10 | 0.002165 |
| 0.25 | 0.004675 |
| 0.50 | 0.008654 |
| 1.00 | 0.015211 |

---
*Analysis: no scipy dependency. Models fitted via numpy OLS + grid search.*
