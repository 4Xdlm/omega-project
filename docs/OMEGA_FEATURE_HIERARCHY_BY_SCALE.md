# OMEGA — AUDIT HIERARCHIQUE MULTI-ECHELLE
**Date** : 2026-03-27
**Mode** : CALC PUR — 0 API — FR-only, Tier S/A/B/C

## Question centrale
semicolon_count domine a 500w (importance 0.42). Est-ce vrai a toutes les echelles ?

## Taille : 200w
- Fenetres : 213722
- R2 CV : 0.203 +/- 0.215

| Rang | Feature | Importance |
|------|---------|-----------|
| 1 | semicolon_count | 0.2589 |
| 2 | dash_count | 0.1610 |
| 3 | dialogue_ratio | 0.1128 |
| 4 | excl_count | 0.0606 |
| 5 | ellipsis_count | 0.0518 |
| 6 | longest_sent_words | 0.0476 |
| 7 | sub_per_sentence | 0.0442 |
| 8 | f16a_bigram_rarity | 0.0318 |
| 9 | std_sent_len | 0.0274 |
| 10 | f1a_rhythm_variance | 0.0252 |
| 11 | colon_count | 0.0244 |
| 12 | f9a_contradiction_rate | 0.0203 |
| 13 | f26c_period_score | 0.0089 |
| 14 | f1_mean | 0.0071 |
| 15 | f26b_long_sent_rate | 0.0071 |

## Taille : 500w
- Fenetres : 141366
- R2 CV : 0.297 +/- 0.219

| Rang | Feature | Importance |
|------|---------|-----------|
| 1 | semicolon_count | 0.4193 |
| 2 | dash_count | 0.2160 |
| 3 | excl_count | 0.0768 |
| 4 | dialogue_ratio | 0.0723 |
| 5 | colon_count | 0.0530 |
| 6 | std_sent_len | 0.0487 |
| 7 | f16a_bigram_rarity | 0.0483 |
| 8 | ellipsis_count | 0.0469 |
| 9 | f1a_rhythm_variance | 0.0373 |
| 10 | sub_per_sentence | 0.0329 |
| 11 | longest_sent_words | 0.0142 |
| 12 | f9a_contradiction_rate | 0.0140 |
| 13 | quest_count | 0.0138 |
| 14 | range_sent_len | 0.0092 |
| 15 | f26c_period_score | 0.0089 |

## Taille : 1000w
- Fenetres : 95149
- R2 CV : 0.342 +/- 0.301

| Rang | Feature | Importance |
|------|---------|-----------|
| 1 | semicolon_count | 0.4421 |
| 2 | dash_count | 0.2790 |
| 3 | excl_count | 0.0940 |
| 4 | dialogue_ratio | 0.0897 |
| 5 | colon_count | 0.0594 |
| 6 | ellipsis_count | 0.0592 |
| 7 | f16a_bigram_rarity | 0.0554 |
| 8 | std_sent_len | 0.0333 |
| 9 | f1a_rhythm_variance | 0.0306 |
| 10 | n_long_sentences | 0.0279 |
| 11 | quest_count | 0.0264 |
| 12 | longest_sent_words | 0.0186 |
| 13 | sub_per_sentence | 0.0167 |
| 14 | f26c_period_score | 0.0160 |
| 15 | cv_sent | 0.0150 |

## Taille : 2000w
- Fenetres : 52329
- R2 CV : 0.385 +/- 0.242

| Rang | Feature | Importance |
|------|---------|-----------|
| 1 | semicolon_count | 0.4019 |
| 2 | dash_count | 0.2123 |
| 3 | excl_count | 0.1235 |
| 4 | f1a_rhythm_variance | 0.0783 |
| 5 | dialogue_ratio | 0.0768 |
| 6 | ellipsis_count | 0.0700 |
| 7 | std_sent_len | 0.0585 |
| 8 | f16a_bigram_rarity | 0.0402 |
| 9 | colon_count | 0.0367 |
| 10 | longest_sent_words | 0.0295 |
| 11 | f26c_period_score | 0.0294 |
| 12 | f9a_contradiction_rate | 0.0275 |
| 13 | quest_count | 0.0207 |
| 14 | f26b_long_sent_rate | 0.0165 |
| 15 | f19a_approx_entropy | 0.0153 |

## Taille : fullw
- Fenetres : 11229
- R2 CV : 0.333 +/- 0.149

| Rang | Feature | Importance |
|------|---------|-----------|
| 1 | semicolon_count | 0.2965 |
| 2 | dash_count | 0.2468 |
| 3 | mean_para_len | 0.1585 |
| 4 | dialogue_ratio | 0.1019 |
| 5 | ellipsis_count | 0.0860 |
| 6 | cv_para | 0.0695 |
| 7 | f1a_rhythm_variance | 0.0652 |
| 8 | quest_count | 0.0556 |
| 9 | sub_per_sentence | 0.0545 |
| 10 | std_sent_len | 0.0498 |
| 11 | colon_count | 0.0473 |
| 12 | excl_count | 0.0317 |
| 13 | f16a_bigram_rarity | 0.0228 |
| 14 | paragraph_count | 0.0209 |
| 15 | f29d_ttr_score | 0.0175 |

## Comparatif Top 5

| Rang | 200w | 500w | 1000w | 2000w | fullw |
|------|------|------|------|------|------|
| 1 | semicolon_count (0.259) | semicolon_count (0.419) | semicolon_count (0.442) | semicolon_count (0.402) | semicolon_count (0.296) |
| 2 | dash_count (0.161) | dash_count (0.216) | dash_count (0.279) | dash_count (0.212) | dash_count (0.247) |
| 3 | dialogue_ratio (0.113) | excl_count (0.077) | excl_count (0.094) | excl_count (0.124) | mean_para_len (0.158) |
| 4 | excl_count (0.061) | dialogue_ratio (0.072) | dialogue_ratio (0.090) | f1a_rhythm_variance (0.078) | dialogue_ratio (0.102) |
| 5 | ellipsis_count (0.052) | colon_count (0.053) | colon_count (0.059) | dialogue_ratio (0.077) | ellipsis_count (0.086) |