# OMEGA Phase R-6 — Scorer V3 Report
**Date**: 2026-03-21
**Method**: Ridge Regression (lambda=50.0)
**Split**: train=399 / val=85 / holdout=87

## Performance

| Set | R2 | Spearman | S vs D inversions |
|-----|------|----------|-------------------|
| Train | 0.2249 | 0.5074 | - |
| Validation | 0.2046 | 0.5877 | - |
| Holdout | 0.1603 | 0.5191 | 32/45 |
| Full | 0.2177 | 0.5185 | 581/2780 |

## Tier Predictions (mean predicted score)

| Tier | Train | Holdout | Full | Target |
|------|-------|---------|------|--------|
| S | 4.161 | 4.173 | 4.181 | 5 |
| A | 3.987 | 3.881 | 4.004 | 4 |
| B | 3.831 | 4.006 | 3.855 | 3 |
| C | 3.425 | 3.426 | 3.434 | 2 |
| D | 3.639 | 4.327 | 3.675 | 1 |

## Feature Weights (sorted by |standardized weight|)

| Feature | Std Weight | Raw Weight |
|---------|-----------|-----------|
| `f24c_contrast_delta` | +0.1960 | +0.019501 |
| `f19a_approx_entropy` | +0.1533 | +1.272268 |
| `f29d_ttr_score` | -0.1199 | -4.879874 |
| `f27a_epistemic_rate` | +0.1135 | +0.005280 |
| `f35c_hook_score` | -0.1132 | -0.893573 |
| `f_clause_per_sentence` | +0.1111 | +0.134374 |
| `f1a_rhythm_variance` | +0.0988 | +0.011339 |
| `f_pov_shift_rate` | +0.0820 | +0.542860 |
| `f9a_contradiction_rate` | -0.0803 | -0.088281 |
| `f27d_modal_score` | +0.0783 | +0.595408 |
| `f_subordination_depth` | -0.0728 | -0.076731 |
| `f26b_long_sent_rate` | +0.0696 | +0.589303 |
| `ix_variance_x_longrate` | -0.0660 | -0.012510 |
| `f1_mean` | -0.0369 | -0.001941 |
| `ix_pov_x_irony` | -0.0339 | -0.046621 |
| `f17_knife_count` | -0.0258 | -0.003674 |
| `f28b_irony_density` | +0.0239 | +0.023386 |
| `ix_mean_x_subdepth` | -0.0217 | -0.000115 |
| `f26c_period_score` | +0.0089 | +0.090256 |
| `f36c_cliff_score` | +0.0015 | +0.024771 |

## Verdicts

- [PASS] Spearman > 0.5 (full): 0.5185
- [FAIL] R2 > 0.40 (holdout): 0.1603
- [FAIL] Zero S vs D inversions (full): 581/2780
- [PASS] Holdout close to train (R2 delta < 0.10): delta=0.0646