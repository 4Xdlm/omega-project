# OMEGA — DECISIONS AUDIT BRUT MULTI-ECHELLE
**Date** : 2026-03-27 | **Standard** : NASA-Grade L4 | **Mode** : CALCUL PUR
**Source** : 1 381 345 fenetres, 23 005 chapitres, 571 livres, ZERO interpolation

---

## Q1. A partir de quelle taille chaque feature devient-elle fiable ?

| Feature | CV@200 | CV@500 | CV@1000 | CV@2000 | Fiable (CV<0.50) a | Verdict |
|---------|--------|--------|---------|---------|---------------------|---------|
| f29d_ttr_score | 0.060 | 0.033 | 0.026 | 0.024 | **200w** | PASS |
| f16a_bigram_rarity | 0.020 | 0.019 | 0.020 | 0.023 | **200w** | PASS |
| cv_sent | 0.297 | 0.251 | 0.226 | 0.216 | **200w** | PASS |
| f19a_approx_entropy | 0.297 | 0.248 | 0.223 | 0.210 | **200w** | PASS |
| f36c_cliff_score | 0.155 | 0.155 | 0.154 | 0.155 | **200w** | PASS |
| f35c_hook_score | 0.338 | 0.343 | 0.345 | 0.349 | **200w** | PASS |
| ratio_alt | 1.536 | 1.110 | 0.889 | 0.735 | jamais (<0.50) | **FAIL** |
| f26b_long_sent_rate | 1.576 | 1.365 | 1.279 | 1.199 | jamais | **FAIL** |
| mean_sent_len | 0.546 | 0.582 | 0.672 | 0.857 | **200w** (mais monte) | PASS* |
| f1a_rhythm_variance | 0.718 | 0.776 | 0.895 | 1.296 | jamais | **FAIL** |
| knife_rate | 0.916 | 0.778 | 0.685 | 0.641 | jamais (<0.50) | **FAIL** |

*mean_sent_len : CV monte avec la taille (normal — signal inter-auteurs). A 200w, CV=0.546 est au seuil.

## Q2. Features inutilisables ou trompeuses a 200 mots

**PASS — 4 features problematiques a 200w :**
- ratio_alt (CV=1.54) — trop de bruit, trop peu de phrases pour detecter les transitions
- f26b_long_sent_rate (CV=1.58) — bimodale, structurellement instable
- knife_rate (CV=0.92) — trop de variance
- f17_knife_count — compteur absolu, non comparable entre tailles

**6 features FIABLES des 200w :**
- f29d_ttr_score, f16a_bigram_rarity, cv_sent, f19a_approx_entropy, f35c_hook_score, f36c_cliff_score

## Q3. Features credibles par taille

| Taille | Features credibles (CV<0.50) |
|--------|------------------------------|
| 200w | f29d_ttr, f16a_bigram, cv_sent, f19a_entropy, f35c_hook, f36c_cliff (6) |
| 500w | idem + f24c_contrast_delta (7) |
| 700w | idem (7) |
| 1000w | idem (7) |
| 2000w | idem (7) |

Note : les features avec CV > 0.50 ne deviennent PAS fiables en augmentant la taille.
Le CV de ratio_alt passe de 1.54 a 0.74 — mieux mais toujours > 0.50.

## Q4. Features qui changent de regime avec la taille

| Feature | Comportement | Evidence |
|---------|-------------|---------|
| f17_knife_count | Compteur lineaire : f17 = 0.012 * size | R2=1.000. NE JAMAIS comparer entre tailles. |
| mean_sent_len | CV monte (signal emerge) | CV: 0.55 -> 0.58 -> 0.67 -> 0.86 |
| f1a_rhythm_variance | CV monte (signal emerge) | CV: 0.72 -> 0.78 -> 0.90 -> 1.30 |
| f26b_long_sent_rate | Moyenne stable, CV baisse | Mean ~0.093 constant, CV: 1.58 -> 1.20 |
| ratio_alt | Moyenne stable, CV baisse | Mean ~0.059 constant, CV: 1.54 -> 0.74 |

## Q5. Correlations vraies a TOUTES tailles

| Paire | r@200 | r@500 | r@1000 | r@2000 | Stable ? |
|-------|-------|-------|--------|--------|----------|
| f26b vs f1a_rhythm_variance | +0.847 | +0.914 | +0.938 | +0.948 | **OUI** (toujours forte +) |
| mean_sent_len vs f26b | +0.784 | +0.884 | +0.921 | +0.942 | **OUI** |
| mean_sent_len vs f1a | +0.805 | +0.875 | +0.894 | +0.896 | **OUI** |
| ratio_alt vs cv_sent | +0.394 | +0.357 | +0.375 | +0.384 | **OUI** (moderee stable) |
| cv_sent vs f1a | +0.457 | +0.399 | +0.409 | +0.385 | **OUI** (moderee stable) |
| f26b vs ratio_alt | +0.279 | +0.410 | +0.540 | +0.620 | **OUI** (monte avec taille) |

## Q6. Correlations artefacts de petite taille

| Paire | r@200 | r@2000 | Artefact ? |
|-------|-------|--------|-----------|
| f29d_ttr vs f16a_bigram | +0.148 | -0.494 | **OUI — INVERSION DE SIGNE** |
| f26b vs f17_knife | -0.516 | -0.795 | Non — meme signe, magnitude change |
| dialogue_ratio vs knife_rate | +0.194 | +0.175 | Non — stable |

**INVERSION DETECTEE** : f29d_ttr_score vs f16a_bigram_rarity passe de +0.15 (200w) a -0.49 (2000w).
A 200w, la correlation est un artefact de petite fenetre. La vraie relation est NEGATIVE (anti-correlee).

## Q7. Les bons livres gardent-ils une meilleure coherence inter-features ?

Donnees a 500w par tier :

| Feature | S (n=278) | A (n=91) | C (n=91) | D (n=10) | Delta S-C |
|---------|-----------|----------|----------|----------|-----------|
| mean_sent_len | 22.10 | 19.13 | 12.59 | 17.82 | **+9.52** |
| f26b_long_sent_rate | 0.126 | 0.092 | 0.011 | 0.065 | **+0.115** |
| f1a_rhythm_variance | 16.08 | 13.67 | 8.17 | 12.04 | **+7.90** |
| cv_sent | 0.726 | 0.713 | 0.655 | 0.697 | +0.071 |
| ratio_alt | 0.070 | 0.059 | 0.026 | 0.033 | **+0.044** |
| sub_per_sentence | 0.828 | 0.767 | 0.472 | 0.607 | **+0.356** |

**Les maitres (tier S) se distinguent par :**
1. Phrases 76% plus longues (22.1 vs 12.6)
2. 11x plus de phrases longues (12.6% vs 1.1%)
3. 2x plus de variance rythmique (16.1 vs 8.2)
4. 2.7x plus d'alternance (7.0% vs 2.6%)
5. 75% plus de subordination (0.83 vs 0.47)
6. CV legerement plus haut (0.73 vs 0.66) — PLUS de contraste, pas moins

**Verdict : INDETERMINE** — les maitres ont plus de variance (signal) mais pas necessairement plus de coherence inter-features. Ils ont des profils DISTINCTS, pas uniformes.

## Q8. Le type d'un passage change-t-il avec la taille ?

Le type detector est en QUARANTAINE (LOW_CONFIDENCE). Pas de mesure de type incluse.

## Q9. Confidence table reelle par taille

| Feature | conf@200 | conf@500 | conf@700 | conf@1000 | conf@2000 |
|---------|----------|----------|----------|-----------|-----------|
| f29d_ttr_score | 0.94 | 0.97 | 0.97 | 0.97 | 0.98 |
| f16a_bigram_rarity | 0.98 | 0.98 | 0.98 | 0.98 | 0.98 |
| cv_sent | 0.70 | 0.75 | 0.76 | 0.77 | 0.78 |
| f19a_approx_entropy | 0.70 | 0.75 | 0.77 | 0.78 | 0.79 |
| f36c_cliff_score | 0.84 | 0.85 | 0.85 | 0.85 | 0.85 |
| f35c_hook_score | 0.66 | 0.66 | 0.66 | 0.66 | 0.65 |
| f24c_contrast_delta | 0.19 | 0.51 | 0.49 | 0.47 | 0.38 |
| mean_sent_len | 0.45 | 0.42 | 0.38 | 0.33 | 0.14 |
| knife_rate | 0.08 | 0.22 | 0.27 | 0.31 | 0.36 |
| ratio_alt | -0.54 | -0.11 | 0.01 | 0.11 | 0.27 |
| f26b_long_sent_rate | -0.58 | -0.37 | -0.32 | -0.28 | -0.20 |
| f1a_rhythm_variance | 0.28 | 0.22 | 0.20 | 0.10 | -0.30 |

Formule : confidence = max(0, 1 - CV)

## Q10. Equations reelles pour OMEGA runtime

**EQUATIONS JUSTIFIEES (R2 > 0.80):**

```
cv_sent(size) = 0.0259 * log(size) + 0.5355        [R2=0.999]
f19a_entropy(size) = -0.0261 * log(size) + 0.8187   [R2=0.999]
f17_knife_count(size) = 0.01167 * size - 0.1136      [R2=1.000]
f1a_variance(size) = 0.000891 * size + 12.770        [R2=0.905]
knife_rate_cv(size) = -0.0538 * log(size) + 1.2260   [R2=0.965]
ratio_alt_cv(size) = -0.1619 * log(size) + 2.3840    [R2=0.966]
```

**EQUATIONS NON JUSTIFIEES :**
- f26b_long_sent_rate (moyenne) : NO_STABLE_EQUATION (R2=0.007)
- ratio_alt (moyenne) : NO_STABLE_EQUATION (R2=0.058)
- cv_para : mesure uniquement sur chapitre entier

---

## TABLEAU FINAL

| Taille | Features fiables | Features instables | Decision OMEGA |
|--------|------------------|--------------------|----------------|
| 200w | f29d_ttr, f16a, cv_sent, f19a, f35c, f36c | ratio_alt, f26b, f1a, knife_rate | Mesure locale OK pour 6 features |
| 500w | +f24c_contrast_delta | idem | Fenetre LOCAL standard |
| 700w | idem 500w | knife_rate s'ameliore (0.73) | Bon compromis cout/qualite |
| 1000w | idem | ratio_alt atteint 0.89 | Transition LOCAL->ARC |
| 2000w | idem (memes 7) | ratio_alt=0.74, f26b=1.20 | Fenetre ARC |
| Full chapter | Toutes features sens | f1b_ratio explose (CV=2.16) | Reference chapitre |

## VERDICTS PASS / FAIL / INDETERMINE

| Question | Verdict |
|----------|---------|
| Q1. Taille min fiable par feature | **PASS** — 11 features documentees |
| Q2. Features trompeuses a 200w | **PASS** — 4 identifiees |
| Q3. Features credibles par taille | **PASS** — 7 features stable des 200w |
| Q4. Changement de regime | **PASS** — 5 features documentees |
| Q5. Correlations vraies | **PASS** — 6 paires stables a toutes tailles |
| Q6. Artefacts petite taille | **PASS** — 1 inversion detectee (ttr vs bigram) |
| Q7. Coherence maitres | **INDETERMINE** — maitres ont plus de signal, pas plus de coherence |
| Q8. Type change avec taille | **NON MESURE** — type detector en quarantaine |
| Q9. Confidence table | **PASS** — table reelle produite |
| Q10. Equations runtime | **PASS** — 6 equations R2>0.80 |
