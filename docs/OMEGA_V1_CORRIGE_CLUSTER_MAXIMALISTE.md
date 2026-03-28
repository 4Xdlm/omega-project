# OMEGA — V1 CORRIGE : TEST DECISIF DU CLUSTER MAXIMALISTE EN
**Date**: 2026-03-29
**Corpus**: V3 — 881 fichiers (834 V2 + 47 maximalistes 2eme salve)
**CSV**: 2,200,673 fenetres
**Standard**: NASA-Grade L4 / DO-178C Level A — CALC PUR — 0 API

---

## Avant (V2 corpus — 834 fichiers)
- Cluster 1 (LONG/maximaliste) Tier C : **84 fenetres**
- R2 Cluster 1 : **-0.308**
- R2 Global EN : 0.101

## Apres (V3 corpus — 881 fichiers, +47 maximalistes)
- Cluster 1 (LONG/maximaliste) Tier C : **708 fenetres** (+624, x8.4)
- R2 Cluster 1 : **-0.187** (ameliore de +0.121 mais toujours negatif)
- R2 Cluster 0 : **0.088**
- R2 Global EN : **0.087**

## VERDICT

**FEATURES INSUFFISANTES** — Les 42 features textuelles mesurees par le moteur OMEGA sont insuffisantes pour discriminer la qualite litteraire dans le style maximaliste anglophone.

Le R2 est passe de -0.308 a -0.187 (amelioration significative grace au reequilibrage), mais il reste negatif. Le modele Random Forest ECHOUE a predire le tier dans le cluster maximaliste, meme avec 708 fenetres Tier C (vs 84 avant).

**Ceci est une ZONE NON CLOSE a documenter dans le manifeste.**

### Interpretation
Le style maximaliste (Pynchon, DFW, Faulkner, Jordan, Goodkind) partage des features STRUCTURELLES identiques quel que soit le tier : phrases longues, haute variance rythmique, subordination complexe. Les 42 features de ponctuation/rythme/structure capturent la FORME maximaliste mais pas la QUALITE au sein de cette forme.

Pour discriminer S de C/D dans le cluster maximaliste, il faudrait :
- Des features semantiques (coherence narrative, profondeur thematique)
- Des features stylistiques avancees (originalite metaphorique, registre lexical)
- Des features NLP (focalisation, tension narrative)

---

## Distribution des tiers par cluster (V2 vs V3)

### V2 (avant)
| Tier | Cluster 0 | Cluster 1 |
|------|-----------|-----------|
| S | 105,326 | 25,792 |
| A | 40,156 | 7,792 |
| B | 48,860 | 4,983 |
| C | 34,658 | **84** |

### V3 (apres)
| Tier | Cluster 0 | Cluster 1 |
|------|-----------|-----------|
| S | 105,326 | 25,792 |
| A | 40,772 | 7,797 |
| B | 52,856 | 5,231 |
| C | 44,477 | **708** |

Le Tier C Cluster 1 a ete multiplie par 8.4x (84 -> 708). Le corpus maximaliste est maintenant REPRESENTATIF. Le verdict n'est plus un artefact d'echantillonnage.

---

## Top 10 features par cluster

### Cluster 0 (COURT/minimaliste) — R2 = 0.088
| Rang | Feature | Importance |
|------|---------|-----------|
| 1 | f16a_bigram_rarity | 0.081 |
| 2 | ellipsis_count | 0.073 |
| 3 | dialogue_ratio | 0.071 |
| 4 | f1a_rhythm_variance | 0.070 |
| 5 | semicolon_count | 0.066 |
| 6 | std_sent_len | 0.060 |
| 7 | excl_count | 0.047 |
| 8 | dash_count | 0.035 |
| 9 | f9a_contradiction_rate | 0.026 |
| 10 | colon_count | 0.018 |

Signal DISTRIBUE sur rarete lexicale, ellipses, dialogue, rythme, semicolons.

### Cluster 1 (LONG/maximaliste) — R2 = -0.187
| Rang | Feature | Importance |
|------|---------|-----------|
| 1 | semicolon_count | 0.198 |
| 2 | dash_count | 0.149 |
| 3 | dialogue_ratio | 0.121 |
| 4 | colon_count | 0.098 |
| 5 | f16a_bigram_rarity | 0.077 |
| 6 | mean_sent_len | 0.056 |
| 7 | sub_per_sentence | 0.055 |
| 8 | f1_mean | 0.048 |
| 9 | excl_count | 0.041 |
| 10 | longest_sent_words | 0.039 |

Le semicolon domine en Cluster 1 — meme pattern structurel qu'en FR — mais le R2 reste negatif. Les features captent la PONCTUATION mais pas la QUALITE du style maximaliste.

---

## Nouveaux fichiers integres (2eme salve)

| Tier | Fichiers | Exemples |
|------|----------|----------|
| A (3) | min_jin_lee, louise_erdrich, donald_antrim | Prose litteraire contemporaine |
| B (11) | lovecraft, poe, mervyn_peake, dan_simmons, etc. | Prose ample de qualite |
| C (18) | anne_rice, ayn_rand, robin_hobb, michener, etc. | Prose ample commerciale |
| D (15) | robert_jordan (x7), ra_salvatore (x4), goodkind, clancy (x2) | Prose longue faible |

---

## STATUT POUR LE MANIFESTE

| Element | Statut |
|---------|--------|
| V1 cluster split | **NON CLOSE** — le split ne monte pas le R2 |
| R2 EN global | 0.087 (Tier S/A/B/C, 500w) — signal REEL mais faible |
| Cluster 0 (minimaliste) | R2 = 0.088 — EXPLOITABLE |
| Cluster 1 (maximaliste) | R2 = -0.187 — **NON EXPLOITABLE** avec features actuelles |
| Bimodalite S EN | CONFIRMEE structurellement, NON EXPLOITABLE pour prediction |

**Le manifeste doit documenter cette zone non close** : les features textuelles de base capturent la qualite dans le style minimaliste mais echouent dans le maximaliste. C'est une limitation du jeu de features, pas du cadre theorique.

---

## METADATA

```
Script:    corpus_en_salve2_integration.py + audit_v1_corrige.py
Corpus:    881 fichiers (V3)
CSV:       2,200,673 fenetres
EN 500w:   282,959 fenetres S/A/B/C
Cluster 0: 243,431 fenetres (minimaliste)
Cluster 1:  39,528 fenetres (maximaliste)
Seed:      42
Branche:   phase-r-metrology-rebuild
```
