# OMEGA — Full Metric Utility Report
**Date**: 2026-03-25
**Works analyzed**: 241 (FR only)
**Features**: 94 (69 stylistic + 22 semantic)
**Standard**: NASA-Grade L4 / DO-178C Level A

## 1. Top 30 Features Corrélées à la Qualité

| # | Feature | r(tier) | Category |
|---|---------|---------|----------|
| 1 | f19_sentences_analyzed | -0.463 | ENTROPIE |
| 2 | f1_sentence_count | -0.463 | RYTHME |
| 3 | f_motif_concentration | -0.458 | IMAGE |
| 4 | f33b_commas_count | +0.454 | PONCTUATION |
| 5 | f33c_dot_comma_ratio | -0.447 | PONCTUATION |
| 6 | f35c_hook_score | -0.437 | ACCROCHE |
| 7 | f17_banal_count | -0.435 | IMAGE |
| 8 | f24c_contrast_delta | +0.430 | IMAGE |
| 9 | f19f_window_stdev | +0.394 | ENTROPIE |
| 10 | f26b_long_sent_rate | +0.393 | RYTHME |
| 11 | f12_tense_switches | -0.392 | NARRATION |
| 12 | f29b_ttr_window | -0.392 | VOCABULAIRE |
| 13 | f29d_ttr_score | -0.373 | VOCABULAIRE |
| 14 | f17_knife_count | -0.349 | IMAGE |
| 15 | f1a_rhythm_variance | +0.346 | RYTHME |
| 16 | f35a_hook_tension | -0.346 | ACCROCHE |
| 17 | f26c_period_score | +0.334 | RYTHME |
| 18 | f17_contrast_spacing | +0.333 | IMAGE |
| 19 | f36a_cliff_tension | -0.328 | SUSPENSE |
| 20 | f5_verb_count | +0.324 | VERBE |
| 21 | f_rare_word_isolation | -0.324 | LEXICAL |
| 22 | f5a_verb_density | +0.312 | VERBE |
| 23 | f19a_approx_entropy | +0.301 | ENTROPIE |
| 24 | f27b_conditional_rate | -0.299 | MODALITÉ |
| 25 | f_tension_density | +0.291 | NARRATION |
| 26 | f33a_dots_count | -0.289 | PONCTUATION |
| 27 | f21c_diacope_rate | +0.289 | RYTHME |
| 28 | f_perception_conflict_rate | +0.279 | NARRATION |
| 29 | f27d_modal_score | +0.275 | MODALITÉ |
| 30 | f_causal_density | +0.269 | CAUSAL |

## 2. Familles de Features (|r| > 0.60)

**Famille 1** (NARRATION): f12_tense_switches, f17_banal_count, f17_contrast_spacing, f17_knife_count, f19_sentences_analyzed, f19a_approx_entropy, f19f_window_stdev, f1_mean, f1_sentence_count, f1a_rhythm_variance, f1b_rhythm_ratio, f24a_banal_rate, f24b_apex_rate, f24c_contrast_delta, f24d_apex_isolation, f24e_contrast_score, f25a_description_density, f25c_time_suspension, f26a_mean_sub_markers, f26b_long_sent_rate, f26c_period_score, f27a_epistemic_rate, f27c_negation_rate, f27d_modal_score, f28b_irony_density, f30a_passe_simple_rate, f30b_imparfait_rate, f30c_present_rate, f30d_ps_imp_ratio, f33a_dots_count, f33b_commas_count, f33c_dot_comma_ratio, f35a_hook_tension, f35c_hook_score, f36a_cliff_tension, f36c_cliff_score, f38b_punct_density, f38c_speed_score, f5_adj_count, f5b_verb_adj_ratio, f9a_contradiction_rate, f_causal_chain_length, f_causal_density, f_contextual_precision, f_motif_concentration, f_novelty_curve_slope, f_perception_conflict_rate, f_rare_word_isolation, f_temporal_anchor_rate, f_tension_density

**Famille 2** (VOCABULAIRE): f15b_redundancy_compression, f16_hapax_count, f16_unique_bigrams, f16a_bigram_rarity, f16c_lexical_surprise, f29a_ttr_global, f29b_ttr_window, f29d_ttr_score, f_echo_density, f_hapax_contextual_rate, f_lexical_callback_rate, f_lexical_progression, f_vocabulary_depth

**Famille 3** (DESCRIPTION): f25b_sensory_coverage, f25g_description_score

**Famille 4** (INTÉRIORITÉ): f28a_sil_rate, f28d_sil_score

**Famille 5** (VERBE): f5_verb_count, f5a_verb_density

**Famille 6** (NARRATION): f_entity_persistence, f_referent_orphan_rate

## 3. Utilité Marginale (Stepwise R²)

| Step | Feature | R² cumulé | Gain | Image? |
|------|---------|-----------|------|--------|
| 1 | f19_sentences_analyzed | 0.214 | +0.214 |  |
| 2 | f38b_punct_density | 0.292 | +0.078 |  |
| 3 | f29b_ttr_window | 0.349 | +0.057 |  |
| 4 | f5c_action_verb_ratio | 0.379 | +0.030 |  |
| 5 | f_motif_concentration | 0.413 | +0.034 | OUI |
| 6 | f5a_verb_density | 0.439 | +0.025 |  |
| 7 | f_temporal_anchor_rate | 0.474 | +0.035 |  |
| 8 | f35c_hook_score | 0.491 | +0.017 |  |
| 9 | f33c_dot_comma_ratio | 0.503 | +0.012 |  |
| 10 | f25b_sensory_coverage | 0.513 | +0.011 |  |
| 11 | f_pov_drift_rate | 0.524 | +0.011 |  |
| 12 | f21c_diacope_rate | 0.532 | +0.008 |  |
| 13 | f25g_description_score | 0.541 | +0.009 |  |
| 14 | f30b_imparfait_rate | 0.550 | +0.009 |  |
| 15 | f24c_contrast_delta | 0.561 | +0.010 | OUI |
| 16 | f27b_conditional_rate | 0.568 | +0.007 |  |
| 17 | f30a_passe_simple_rate | 0.573 | +0.005 |  |
| 18 | f30d_ps_imp_ratio | 0.581 | +0.008 |  |
| 19 | f_perception_conflict_rate | 0.585 | +0.004 |  |
| 20 | f28d_sil_score | 0.589 | +0.004 |  |
| 21 | f29a_ttr_global | 0.593 | +0.005 |  |
| 22 | f21e_ritual_index | 0.600 | +0.006 |  |
| 23 | f15b_redundancy_compression | 0.605 | +0.005 |  |
| 24 | f18f_ellipsis_final | 0.608 | +0.004 |  |
| 25 | f30c_present_rate | 0.611 | +0.003 |  |
| 26 | f17_banal_count | 0.613 | +0.002 | OUI |
| 27 | f25f_object_density | 0.616 | +0.003 |  |
| 28 | f27d_modal_score | 0.619 | +0.003 |  |
| 29 | f17_contrast_spacing | 0.622 | +0.003 | OUI |
| 30 | f_hapax_contextual_rate | 0.624 | +0.002 |  |

## 4. Focus Métaphore/Image

| Feature | r(tier) | mean_S | mean_A | mean_B | mean_C | mean_D |
|---------|---------|--------|--------|--------|--------|--------|
| f24a_banal_rate | -0.119 | 0.289 | 0.290 | 0.302 | 0.298 | 0.290 |
| f24b_apex_rate | -0.123 | 0.267 | 0.276 | 0.275 | 0.276 | 0.285 |
| f24c_contrast_delta | +0.430 | 29.455 | 27.698 | 20.085 | 18.049 | 20.309 |
| f24d_apex_isolation | -0.208 | 3.143 | 3.257 | 3.335 | 3.387 | 3.367 |
| f24e_contrast_score | -0.082 | 0.878 | 0.910 | 0.897 | 0.895 | 0.916 |
| f17_knife_count | -0.349 | 5.698 | 6.553 | 9.747 | 10.519 | 5.667 |
| f17_banal_count | -0.435 | 8.977 | 9.405 | 12.524 | 12.935 | 10.133 |
| f17_contrast_spacing | +0.333 | 9.037 | 7.257 | 6.830 | 5.093 | 7.713 |
| f16c_lexical_surprise | -0.070 | 0.757 | 0.766 | 0.774 | 0.757 | 0.750 |
| f16a_bigram_rarity | -0.256 | 0.940 | 0.949 | 0.958 | 0.949 | 0.944 |
| f_motif_concentration | -0.458 | 0.362 | 0.371 | 0.526 | 0.636 | 0.706 |

### Corrélations croisées (Image × Rythme)

| Feature | f1_mean | f1a_rhythm_variance | f26b_long_sent_rate | f26c_period_score |
|---------|---|---|---|---|
| f24a_banal_rate | -0.789 | -0.701 | -0.643 | -0.712 |
| f24b_apex_rate | -0.807 | -0.715 | -0.642 | -0.707 |
| f24c_contrast_delta | +0.174 | +0.514 | +0.571 | +0.475 |
| f24d_apex_isolation | -0.745 | -0.705 | -0.743 | -0.772 |
| f24e_contrast_score | -0.805 | -0.698 | -0.635 | -0.684 |
| f17_knife_count | -0.331 | -0.448 | -0.520 | -0.503 |
| f17_banal_count | -0.498 | -0.653 | -0.732 | -0.703 |
| f17_contrast_spacing | +0.039 | +0.150 | +0.260 | +0.224 |
| f16c_lexical_surprise | -0.008 | +0.040 | +0.025 | +0.015 |
| f16a_bigram_rarity | -0.049 | -0.077 | -0.109 | -0.066 |
| f_motif_concentration | -0.408 | -0.572 | -0.651 | -0.617 |

## 5. Interactions Critiques

| Paire | r(A) | r(B) | R²(add) | R²(int) | Synergy |
|-------|------|------|---------|---------|---------|
| f_motif_concentration × f26b_long_sent_rate | -0.458 | +0.393 | 0.226 | 0.323 | +0.097 |
| f17_banal_count × f26b_long_sent_rate | -0.435 | +0.393 | 0.201 | 0.291 | +0.090 |
| f17_knife_count × f26b_long_sent_rate | -0.349 | +0.393 | 0.183 | 0.268 | +0.085 |
| f24c_contrast_delta × f35c_hook_score | +0.430 | -0.437 | 0.249 | 0.314 | +0.065 |
| f24c_contrast_delta × f_motif_concentration | +0.430 | -0.458 | 0.237 | 0.294 | +0.056 |
| f_motif_concentration × f24c_contrast_delta | -0.458 | +0.430 | 0.237 | 0.294 | +0.056 |
| f24c_contrast_delta × f19f_window_stdev | +0.430 | +0.394 | 0.188 | 0.243 | +0.055 |
| f_motif_concentration × f19f_window_stdev | -0.458 | +0.394 | 0.229 | 0.280 | +0.051 |
| f24d_apex_isolation × f26b_long_sent_rate | -0.208 | +0.393 | 0.170 | 0.216 | +0.046 |
| f24c_contrast_delta × f26b_long_sent_rate | +0.430 | +0.393 | 0.217 | 0.263 | +0.045 |
| f24c_contrast_delta × f33b_commas_count | +0.430 | +0.454 | 0.262 | 0.301 | +0.039 |
| f24c_contrast_delta × f17_banal_count | +0.430 | -0.435 | 0.215 | 0.250 | +0.035 |
| f17_banal_count × f24c_contrast_delta | -0.435 | +0.430 | 0.215 | 0.250 | +0.035 |
| f24d_apex_isolation × f35c_hook_score | -0.208 | -0.437 | 0.193 | 0.227 | +0.034 |
| f24c_contrast_delta × f19_sentences_analyzed | +0.430 | -0.463 | 0.228 | 0.258 | +0.030 |

## 6. Cohen's d — Tier A vs Reste

| # | Feature | d | Direction | Category |
|---|---------|---|-----------|----------|
| 1 | f26c_period_score | +1.095 | Les maîtres ont PLUS | RYTHME |
| 2 | f19f_window_stdev | +1.056 | Les maîtres ont PLUS | ENTROPIE |
| 3 | f26b_long_sent_rate | +1.054 | Les maîtres ont PLUS | RYTHME |
| 4 | f1a_rhythm_variance | +1.045 | Les maîtres ont PLUS | RYTHME |
| 5 | f26a_mean_sub_markers | +1.037 | Les maîtres ont PLUS | SYNTAXE |
| 6 | f_motif_concentration | -0.994 | Les maîtres ont MOINS | IMAGE |
| 7 | f1_mean | +0.981 | Les maîtres ont PLUS | RYTHME |
| 8 | f24c_contrast_delta | +0.980 | Les maîtres ont PLUS | IMAGE |
| 9 | f17_banal_count | -0.966 | Les maîtres ont MOINS | IMAGE |
| 10 | f19_sentences_analyzed | -0.953 | Les maîtres ont MOINS | ENTROPIE |
| 11 | f1_sentence_count | -0.953 | Les maîtres ont MOINS | RYTHME |
| 12 | f9a_contradiction_rate | +0.952 | Les maîtres ont PLUS | NARRATION |
| 13 | f35c_hook_score | -0.906 | Les maîtres ont MOINS | ACCROCHE |
| 14 | f19a_approx_entropy | +0.850 | Les maîtres ont PLUS | ENTROPIE |
| 15 | f35a_hook_tension | -0.830 | Les maîtres ont MOINS | ACCROCHE |
| 16 | f_tension_density | +0.808 | Les maîtres ont PLUS | NARRATION |
| 17 | f36a_cliff_tension | -0.805 | Les maîtres ont MOINS | SUSPENSE |
| 18 | f33a_dots_count | -0.804 | Les maîtres ont MOINS | PONCTUATION |
| 19 | f_novelty_curve_slope | -0.793 | Les maîtres ont MOINS | LEXICAL |
| 20 | f33c_dot_comma_ratio | -0.791 | Les maîtres ont MOINS | PONCTUATION |
| 21 | f21c_diacope_rate | +0.776 | Les maîtres ont PLUS | RYTHME |
| 22 | f12_tense_switches | -0.736 | Les maîtres ont MOINS | NARRATION |
| 23 | f33b_commas_count | +0.732 | Les maîtres ont PLUS | PONCTUATION |
| 24 | f_contextual_precision | +0.671 | Les maîtres ont PLUS | LEXICAL |
| 25 | f_rare_word_isolation | -0.671 | Les maîtres ont MOINS | LEXICAL |
| 26 | f_lexical_callback_rate | -0.654 | Les maîtres ont MOINS | LEXICAL |
| 27 | f17_knife_count | -0.653 | Les maîtres ont MOINS | IMAGE |
| 28 | f27c_negation_rate | +0.621 | Les maîtres ont PLUS | MODALITÉ |
| 29 | f27d_modal_score | +0.614 | Les maîtres ont PLUS | MODALITÉ |
| 30 | f_echo_density | -0.584 | Les maîtres ont MOINS | RYTHME |

## 7. Recommandations Poids SII

Basé sur les données empiriques de cette analyse :

| Feature | Importance combinée | Catégorie |
|---------|--------------------:|-----------|
| f19_sentences_analyzed | 22.831 | ENTROPIE |
| f38b_punct_density | 7.805 | VITESSE |
| f29b_ttr_window | 5.667 | VOCABULAIRE |
| f_motif_concentration | 4.880 | IMAGE |
| f_temporal_anchor_rate | 3.525 | NARRATION |
| f5c_action_verb_ratio | 3.034 | VERBE |
| f5a_verb_density | 2.528 | VERBE |
| f35c_hook_score | 2.102 | ACCROCHE |
| f33c_dot_comma_ratio | 1.634 | PONCTUATION |
| f19f_window_stdev | 1.450 | ENTROPIE |
| f26b_long_sent_rate | 1.447 | RYTHME |
| f24c_contrast_delta | 1.411 | IMAGE |
| f17_banal_count | 1.402 | IMAGE |
| f26c_period_score | 1.095 | RYTHME |
| f25b_sensory_coverage | 1.078 | DESCRIPTION |

---

*Généré par `scripts/analyze-full-metric-utility.ts` — ANALYSE PURE, 0 modification du scoring.*