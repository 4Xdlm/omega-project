# Musicality Isolation Report
**Date**: 2026-03-17T17:05:43.423949
**Seed**: 42

## Part 2 — Musicality per Brief × Style

| Brief | STYLE_HACHE | STYLE_FLUIDE | STYLE_ASYMETRIQUE | STYLE_POETIQUE | STYLE_NEUTRE |
|-------|-------|-------|-------|-------|-------|
| brief_1 | 1.6329 | 14.0244 | 10.4788 | 6.7843 | 6.1051 |
| brief_2 | 1.9617 | 14.2321 | 10.9113 | 7.4427 | 6.9062 |
| brief_3 | 1.4540 | 17.8164 | 9.5772 | 6.4253 | 5.3756 |
| brief_4 | 2.0940 | 15.4096 | 15.2139 | 6.3929 | 5.1797 |
| brief_5 | 1.8936 | 15.0277 | 7.9952 | 5.7546 | 5.8265 |

## Part 3 — Post-hoc Corrections (P01 + P05 @ 0.50)

| Brief | Before | After | Delta |
|-------|--------|-------|-------|
| brief_1 | 6.1051 | 5.6379 | 0.4672 |
| brief_2 | 6.9062 | 6.3903 | 0.5159 |
| brief_3 | 5.3756 | 5.4244 | 0.0488 |
| brief_4 | 5.1797 | 5.3511 | 0.1714 |
| brief_5 | 5.8265 | 5.3676 | 0.4589 |

## Analysis

- **Avg prompt variation range**: 13.4948
- **Avg post-hoc correction delta**: 0.3324
- **Ratio (prompt / posthoc)**: 40.60

**Conclusion**: Musicality is controlled upstream (prompt), not downstream (perturbation)

## Feature Means per Style (aggregated across briefs)

| Feature | STYLE_HACHE | STYLE_FLUIDE | STYLE_ASYMETRIQUE | STYLE_POETIQUE | STYLE_NEUTRE |
|---------|-------|-------|-------|-------|-------|
| f1_mean | 3.474 | 39.200 | 14.702 | 14.378 | 11.654 |
| f1a_rhythm_variance | 1.804 | 6.526 | 17.382 | 5.166 | 5.910 |
| f19e_window_median | 0.144 | 0.180 | 0.422 | 0.136 | 0.072 |
| f21e_ritual_index | 0.030 | 0.600 | 0.295 | 0.137 | 0.174 |
| f22f_literary_index | 0.021 | 0.499 | 0.139 | 0.142 | 0.101 |
| f23d_literary_causal_score | 1.000 | 0.714 | 0.823 | 0.754 | 0.912 |
| f24e_contrast_score | 0.511 | 0.000 | 0.795 | 0.701 | 0.860 |
| f25g_description_score | 0.388 | 0.540 | 0.519 | 0.555 | 0.539 |
| f26c_period_score | 0.005 | 0.387 | 0.120 | 0.052 | 0.033 |
| f27d_modal_score | 0.065 | 0.335 | 0.444 | 0.163 | 0.242 |
| f28d_sil_score | 0.010 | 0.067 | 0.064 | 0.031 | 0.143 |
| f29b_ttr_window | 0.803 | 0.805 | 0.821 | 0.802 | 0.799 |
| f30d_ps_imp_ratio | 1.604 | 1.445 | 1.395 | 1.695 | 1.382 |
