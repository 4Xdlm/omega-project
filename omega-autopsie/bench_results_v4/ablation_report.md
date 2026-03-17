# Ablation Report

Seed: 42 | Train: 24336 | Test: 6084
Necessity threshold: delta_mae > 0.003

## Model Comparison (ranked by MAE)

| Rank | Model | MAE | R2 | delta vs COMPLETE |
|------|-------|-----|----|-------------------|
| 1 | COMPLETE | 0.051767 | 0.281142 | --- |
| 2 | SIMPLIFIED | 0.053817 | 0.247506 | +0.002050 |
| 3 | NO_NONLINEARITY | 0.053944 | 0.248755 | +0.002177 |
| 4 | TOP3_CATS | 0.070542 | 0.025605 | +0.018775 |
| 5 | NAIVE | 0.070673 | -0.006586 | +0.018906 |
| 6 | SINGLE_SLOPE | 0.077064 | 0.016319 | +0.025297 |

## MAE per Category (COMPLETE model)

| Category | MAE |
|----------|-----|
| MUSICALITE | 0.193864 |
| COMPLEXITE | 0.003907 |
| SENSORIEL | 0.006728 |
| LEXICAL | 0.007187 |
| INTERIORITE | 0.009889 |
| TENSION | 0.089026 |

## Necessity Verdict

**Necessary terms** (removing increases MAE by > 0.003):

- minor_categories
- per_perturbation_slopes

**Unnecessary terms** (removing increases MAE by <= 0.003):

- P01
- nonlinearity
