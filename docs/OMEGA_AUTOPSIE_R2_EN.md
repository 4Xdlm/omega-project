# OMEGA — AUTOPSIE DU R2 EN = 0.020

**Date** : 2026-03-28
**Mode** : CALC PUR — 0 API
**Branche** : phase-r-metrology-rebuild
**Convergence** : Claude + ChatGPT + Gemini — 3/3 IAs recommandent ce diagnostic

---

## 1. Audit du tiering

### Distribution FR vs EN (500w, S/A/B/C)

| Tier | FR | FR % | EN | EN % |
|------|---:|-----:|---:|-----:|
| S | 78 446 | 55.5% | 78 842 | 54.9% |
| A | 21 654 | 15.3% | 23 776 | 16.6% |
| B | 23 788 | 16.8% | 29 109 | 20.3% |
| C | 17 478 | 12.4% | 11 926 | 8.3% |
| D | — | — | 1 615 | 1.1% |

- Ratio S/C : FR = 4.5, EN = 6.6 (EN a proportionnellement moins de C)
- 130 livres EN en Tier S, 27 en Tier C
- Pas d'aberration manifeste dans les filenames : les Tier S contiennent Austen, Tolstoy (trad.), Flaubert (trad.), Faulkner ; les Tier C contiennent de la romance/genre fiction

**VERDICT : SAIN** — Le tiering EN est coherent. Le desequilibre S/C (6.6x) est plus prononce qu'en FR (4.5x) mais pas pathologique.

---

## 2. Separation de classes (Cohen's d + AUC)

### Resultat inattendu : le signal univarie EN est PLUS FORT que le FR

| Rang | Feature FR | d FR | Feature EN | d EN |
|------|-----------|-----:|-----------|-----:|
| 1 | n_long_sentences | +1.37 | n_long_sentences | +1.73 |
| 2 | dash_count | -1.34 | longest_run_long | +1.45 |
| 3 | sentence_count | -1.32 | sentence_count | -1.42 |
| 4 | longest_run_long | +1.29 | f24c_contrast_delta | +1.40 |
| 5 | **semicolon_count** | **+1.22** | longest_sent_words | +1.35 |
| 6 | f24c_contrast_delta | +1.20 | f26c_period_score | +1.35 |
| 7 | f26b_long_sent_rate | +1.04 | f26b_long_sent_rate | +1.30 |
| 8 | n_short_sentences | -1.00 | mean_sent_len | +1.28 |
| 9 | longest_sent_words | +0.96 | f1_mean | +1.28 |
| 10 | range_sent_len | +0.94 | std_sent_len / f1a_rhythm | +1.20 |

**Moyenne |d| top 15 : FR = 1.066, EN = 1.305** — le signal EN est 1.2x plus fort en univarie.

### Comparaison feature par feature

| Feature | d FR | d EN | Ratio |
|---------|-----:|-----:|------:|
| dash_count | -1.34 | -0.02 | **78.8x** |
| semicolon_count | +1.22 | +0.99 | 1.2x |
| n_long_sentences | +1.37 | +1.73 | 0.8x |
| mean_sent_len | +0.88 | +1.28 | 0.7x |
| f26b_long_sent_rate | +1.04 | +1.30 | 0.8x |

**Conclusion majeure** : Le signal univarie est PRESENT et FORT en EN. Le probleme n'est PAS l'absence de signal. C'est le Random Forest qui ne parvient pas a l'exploiter en multivarie.

Le seul outlier massif : **dash_count** a un cohen_d de -1.34 en FR mais seulement -0.02 en EN. Le tiret est un marqueur de qualite inverse en FR (les mauvais textes en abusent), mais neutre en EN.

**VERDICT : SIGNAL PRESENT** — Le signal separant S de C est aussi fort en EN qu'en FR en univarie.

---

## 3. Bimodalite Tier S

### Clustering K=2 sur les fenetres Tier S EN (500w)

| Metrique | Cluster 0 (COURT) | Cluster 1 (LONG) |
|----------|------------------:|------------------:|
| N fenetres | 61 989 (79%) | 16 853 (21%) |
| mean_sent_len | 19.4 | 39.7 |
| f1a_rhythm_variance | 13.9 | 28.7 |
| f17_knife_count | 5.1 | 0.7 |
| f26b_long_sent_rate | 0.09 | 0.38 |
| sub_per_sentence | 0.58 | 1.55 |

| Mesure | Score |
|--------|------:|
| Silhouette K-Means EN | **0.526** |
| Silhouette GMM EN | 0.358 |
| Silhouette K-Means FR | 0.612 |

**Silhouette EN = 0.526** — bimodalite FORTE et confirmee.

### Profils des clusters

- **Cluster 0 (COURT/HACHE, 79%)** : phrases courtes (19.4 mots), beaucoup de decoupage (5.1 knife_count), peu de subordonnees. Style Hemingway/Orwell/Camus.
  - Top auteurs : pg2600 (Tolstoi trad.), guerre_2600, pg1399, Don DeLillo, pg2701 (Moby Dick)

- **Cluster 1 (LONG/AMPLE, 21%)** : phrases longues (39.7 mots), tres peu de decoupage (0.7), beaucoup de subordonnees (1.55). Style Faulkner/James/Proust trad.
  - Top auteurs : jones_6593, essais_3600, pg2600, guerre_2600, gulliver_829

### R2 par cluster

| Perimetre | R2 CV | N |
|-----------|------:|--:|
| Global EN | 0.020 | 143 653 |
| Cluster 0 (COURT) | **0.072** | 120 311 |
| Cluster 1 (LONG) | -2.296 | 23 342 |

Le R2 du cluster COURT (0.072) est **3.6x meilleur** que le global (0.020). Le cluster LONG est catastrophique (R2 negatif), ce qui signifie que le modele fait pire qu'un estimateur constant pour ces textes.

**Interpretation** : Le Tier S anglais melange deux galaxies stylistiques incompatibles. Un Random Forest entraine sur les deux a la fois ne peut pas trouver un signal coherent car les textes "courts/haches" de Tier S ressemblent aux textes "courts/haches" de Tier C, et les textes "longs/amples" de Tier S ressemblent a une population completement differente.

**VERDICT : BIMODAL** — Confirmation forte de l'hypothese Hemingway/Faulkner.

---

## 4. Variance inter-tier (ANOVA)

| Rang | Feature FR | F FR | Feature EN | F EN |
|------|-----------|-----:|-----------|-----:|
| 1 | dash_count | 16 688 | n_long_sentences | 7 181 |
| 2 | sentence_count | 15 048 | sentence_count | 6 865 |
| 3 | semicolon_count | 12 147 | longest_run_long | 5 587 |
| 4 | n_long_sentences | 11 030 | f24c_contrast_delta | 5 104 |
| 5 | n_short_sentences | 10 642 | longest_sent_words | 4 546 |

**Moyenne F top 15 : FR = 8 868, EN = 4 501 (ratio 2.0x)**

Les F-stats EN sont 2x plus faibles que FR, mais restent tres significatives (p << 0.001). Les tiers EN sont separes, mais moins nettement. Le gros delta vient de dash_count (F = 16 688 FR vs 823 EN, ratio 20x) et semicolon_count (F = 12 147 FR vs 3 025 EN, ratio 4x).

**VERDICT : TIERS FAIBLEMENT SEPARES** — Les tiers EN sont structurellement moins distincts que les FR, surtout sur les features de ponctuation.

---

## 5. Audit technique

### Distributions de base (500w, S/A/B/C)

| Metrique | FR | EN |
|----------|---:|---:|
| Fenetres | 141 366 | 143 653 |
| Phrases/fenetre | 34.0 | 27.9 |
| Longueur phrase (mots) | 17.6 | 21.6 |
| Semicolons/fenetre | 2.03 | 3.38 |
| % zero semicolons | 48.2% | **26.9%** |
| Dialogue > 50% | 1.7% | **9.0%** |
| Dashes/fenetre | 4.84 | 1.97 |
| f16a_bigram_rarity (moy) | 0.988 | 0.981 |
| f16a_bigram_rarity (std) | 0.014 | **0.021** |

**Observations** :
- Les textes EN ont des phrases plus longues (21.6 vs 17.6 mots) et moins nombreuses (27.9 vs 34.0 par fenetre).
- Les EN ont PLUS de semicolons en moyenne (3.38 vs 2.03) et moins de fenetres a zero (26.9% vs 48.2%).
- Les EN ont 5x plus de fenetres a fort dialogue (9.0% vs 1.7%).
- f16a_bigram_rarity a une variance 50% plus grande en EN (std 0.021 vs 0.014), ce qui explique pourquoi elle est le #1 driver EN.
- dash_count est 2.5x plus faible en EN qu'en FR.

### Segmentation

| Metrique | FR | EN |
|----------|---:|---:|
| Livres | 241 | 259 |
| Chapitres full | 11 336 | 8 460 |
| Full < 100 mots | 0 | 0 |
| Chapitres/livre median | 20 | 20 |

Pas d'anomalie de segmentation.

**VERDICT : PIPELINE SAIN** — Les donnees EN sont de qualite technique comparable au FR.

---

## 6. DIAGNOSTIC FINAL

Le R2 EN = 0.020 est cause par :

- [x] **B. Bimodalite Tier S (Hemingway vs Faulkner)** — CAUSE PRINCIPALE
  - Silhouette = 0.526 (bimodalite forte)
  - Le Tier S EN contient deux galaxies : COURT/HACHE (79%) et LONG/AMPLE (21%)
  - R2 passe de 0.020 a 0.072 dans le cluster COURT seul (3.6x)
  - Le cluster LONG a un R2 negatif : le modele est perdu

- [x] **C. Redistribution des poids entre features** — CAUSE SECONDAIRE
  - Le signal univarie est PRESENT (cohen_d moyen 1.3, meme meilleur que FR)
  - Mais les features qui dominent en FR (semicolon, dash) ont un role different en EN
  - dash_count perd son pouvoir discriminant (cohen_d passe de -1.34 a -0.02)
  - Le RF ne peut pas construire un arbre coherent quand les features "tirent" dans des directions differentes selon le cluster stylistique

- [ ] A. Tiering corrompu — NON (distribution coherente)
- [ ] D. Pipeline degrade — NON (memes specs techniques)
- [ ] E. Signal absent — NON (signal univarie plus fort en EN)

### Mecanisme causal

```
Tier S EN = melange {Hemingway-like, Faulkner-like}
                        |
                        v
mean_sent_len: 19.4 vs 39.7  (ratio 2x)
f17_knife:     5.1  vs 0.7   (ratio 7x)
                        |
                        v
RF apprend: "Tier S = phrases courtes" (79% du cluster)
MAIS aussi:  "Tier S = phrases longues" (21% du cluster)
                        |
                        v
Signal contradictoire -> R2 s'effondre
```

### Le paradoxe du signal present

Le signal S vs C est fort en univarie (d = 1.3) mais invisible en multivarie (R2 = 0.02). Cela signifie que les features separent bien S de C INDIVIDUELLEMENT, mais que leurs effets CONJOINTS s'annulent dans le RF a cause de la bimodalite intra-S.

---

## RECOMMANDATION

**Action prioritaire** : Tester un modele RF stratifie par cluster.

1. Classifier chaque fenetre EN en COURT ou LONG (K-Means K=2 sur mean_sent_len, f1a_rhythm_variance, f17_knife_count, f26b_long_sent_rate, sub_per_sentence)
2. Entrainer un RF separe par cluster
3. Si R2 > 0.10 dans chaque cluster : la bimodalite est la cause confirmee, et les lois L31-L36 doivent etre reformulees avec un facteur "profil stylistique"
4. Si R2 reste bas : chercher d'autres causes (features manquantes propres a l'anglais ?)

**Impact sur les lois** : L31 ("semicolon est le #1 driver") doit etre requalifiee :
- L31-FR : semicolon domine en francais (confirme)
- L31-EN-COURT : a verifier dans le cluster court
- L31-EN-LONG : a verifier dans le cluster long
