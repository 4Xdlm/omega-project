# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — RAPPORT TECHNIQUE COMPLET PHASE R-8
# Normalisation Typologique Pondérée — Données, Formules, Preuves
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-21
# Branche      : phase-r-metrology-rebuild
# Tag          : phase-r8-complete
# HEAD         : 2b286deb
# Standard     : NASA-Grade L4 / DO-178C Level A
#
# CE DOCUMENT contient TOUTES les données numériques de R-8.
# Pour le résumé exécutif, voir SESSION_SAVE_PHASE_R8_COMPLETE.md
# Pour la bible du système, voir OMEGA_PROTOCOLE_ANALYSE_COMPLET.md
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# TABLE DES MATIÈRES

1. Contexte et objectif
2. R-8.1 — Constantes typologiques Ci,f (données complètes)
3. R-8.2 — Validation additivité (classification complète des 47 features)
4. R-8.3 — Lambda (tableau complet λ par feature × type)
5. R-8.3b — Analyse résiduelle S vs C/D post-λ
6. R-8.4 — Gamma interactions (tableaux complets)
7. R-8.5 — Seuils de basculement Tk (extraction GB)
8. R-8.6 — Loi des LEGO (transitions, trigrams, bonus)
9. Formules mathématiques complètes
10. Lois fondamentales découvertes
11. Limites connues
12. Chemins des fichiers

---

# 1. CONTEXTE ET OBJECTIF

## 1.1 Le problème

Le scorer GB (Gradient Boosting, Spearman 0.79, 19/2780 inversions S/D)
compare chaque texte à la MOYENNE GLOBALE du corpus. Un passage de dialogue
de Dostoïevski est évalué avec les mêmes cibles qu'un passage de description
de Flaubert. C'est comme juger un sprinteur et un nageur sur le même barème.

## 1.2 L'objectif de R-8

Construire une normalisation qui compare chaque passage à ce qu'un MAÎTRE
ferait avec CE MIX EXACT de types de passage. Si un passage est 42% action
+ 28% narration, la CIBLE doit refléter cette composition.

## 1.3 L'équation cible

```
f_attendu = Σ(pi × λi,f × Ci,f) + Σ(pi × pj × γij,f) + Σ(Tk)
```

Où :
- pi = proportion du type i dans le passage (vecteur du classifieur, somme=1.0)
- Ci,f = constante du type pur i pour la feature f (MESURÉE en R-8.1)
- λi,f = coefficient d'influence (APPRIS en R-8.3)
- γij,f = terme d'interaction entre types i et j (APPRIS en R-8.4)
- Tk = seuils de basculement (EXTRAITS du GB en R-8.5)

---

# 2. R-8.1 — CONSTANTES TYPOLOGIQUES Ci,f

## 2.1 Méthode

Estimation continue pondérée sur passages S-tier à 2000 mots.
Formule : `Ci,f = Σ(pi,k × fk) / Σ(pi,k)`
Chaque passage k contribue proportionnellement à sa composition typologique.

POURQUOI PAS DE FILTRAGE BINAIRE :
Le premier essai (R-8.1 v1) avec seuil de pureté 80% n'a produit que
2 passages purs sur 1380. Chez les maîtres, les passages "chimiquement purs"
n'existent pas à 2000 mots. Un maître MÉLANGE toujours. L'estimation
continue utilise 100% des 5244 passages au lieu de 0.14%.

## 2.2 Volume

- Œuvres Tier S : 278 (276 avec texte disponible, 2 skippées)
- Positions par œuvre : 19 (0.05 à 0.95, pas de 0.05)
- Passages totaux : 5244
- Fenêtre : 2000 mots
- Erreurs de normalisation (somme types ≠ 1.0) : 0

## 2.3 Masses effectives par type

| Type | Masse effective | Kish N effectif | Poids moyen | Poids max |
|------|----------------|-----------------|-------------|-----------|
| DESCRIPTION | 1650.2 | 4365.8 | 0.315 | 0.776 |
| ACTION | 1260.2 | 4049.3 | 0.240 | 0.853 |
| NARRATION | 1235.7 | 4593.0 | 0.236 | 0.509 |
| DIALOGUE | 647.0 | 1966.9 | 0.123 | 0.653 |
| INTROSPECTION | 451.0 | 3265.6 | 0.086 | 0.470 |

Interprétation : DESCRIPTION domine (31.5% du poids moyen), INTROSPECTION
est le plus rare (8.6%) mais avec une masse suffisante (451) pour la régression.

## 2.4 Corrélations entre vecteurs de types

| Paire | Corrélation r | Verdict |
|-------|--------------|---------|
| action × narration | +0.140 | Faible positive |
| action × description | -0.413 | Négative modérée |
| action × dialogue | -0.370 | Négative modérée |
| action × introspection | -0.384 | Négative modérée |
| narration × description | -0.434 | Négative modérée |
| narration × dialogue | -0.195 | Faible négative |
| narration × introspection | -0.218 | Faible négative |
| description × dialogue | -0.489 | Négative (la plus forte) |
| description × introspection | +0.434 | Positive modérée |
| dialogue × introspection | -0.368 | Négative modérée |

AUCUNE paire ne dépasse |0.7| → pas de colinéarité problématique.
Note : description × introspection = +0.434 (corrélés positivement).
C'est cohérent : les passages introspectifs contiennent souvent de la description.

## 2.5 Top 10 features les plus discriminantes entre types

| Feature | CV inter-types |
|---------|---------------|
| f30d_ps_imp_ratio | 0.655 |
| f12_tense_switches | 0.628 |
| f28d_sil_score | 0.619 |
| f30b_imparfait_rate | 0.605 |
| f27b_conditional_rate | 0.414 |
| f5b_verb_adj_ratio | 0.376 |
| f27d_modal_score | 0.375 |
| f_lexical_progression | 0.350 |
| f17_knife_count | 0.349 |
| f33a_dots_count | 0.338 |

## 2.6 Fichier de sortie

`omega-autopsie/results_phase_r8/TYPE_PROFILES_PURE.json`
Contient : mean + stdev par feature × type, masses, corrélations, top features.

---

# 3. R-8.2 — VALIDATION DE L'ADDITIVITÉ

## 3.1 Méthode

Pour chaque passage k du corpus COMPLET (611 œuvres, tous tiers) :
- Calculer f_prédit = Σ(pi × Ci,f) (modèle additif simple)
- Calculer f_mesuré (mesure directe)
- MAE = |f_mesuré - f_prédit|

Stratification par tier et par type de feature (normalisée vs absolue).

## 3.2 Volume

- Passages totaux : 5121 (569 œuvres × 9 positions)
- Features normalisées : 43
- Features absolues (exclues) : 9

## 3.3 Classification complète des features

### ADDITIVES (9 features, erreur relative < 10%)

| Feature | MAE | Err. relative | Interprétation |
|---------|-----|--------------|----------------|
| f34b_para_per_1000w | 0.0000 | 0.000 | Parfaitement mécanique |
| f19a_approx_entropy | 0.0124 | 0.013 | Distribution statistique |
| f24e_contrast_score | 0.0145 | 0.015 | Budget de contraste |
| f15b_redundancy_compression | 0.0308 | 0.033 | Mécanique bigramme |
| f16a_bigram_rarity | 0.0308 | 0.033 | Mécanique bigramme |
| f29d_ttr_score | 0.0290 | 0.039 | Richesse lexicale |
| f24b_apex_rate | 0.0114 | 0.043 | Quartile de phrases |
| f24a_banal_rate | 0.0194 | 0.069 | Quartile de phrases |
| f29a_ttr_global | 0.0377 | 0.091 | TTR global |

### SEMI-ADDITIVES (3 features, erreur relative 10-25%)

| Feature | MAE | Err. relative |
|---------|-----|--------------|
| f16c_lexical_surprise | 0.0683 | 0.141 |
| f21e_ritual_index | 0.0991 | 0.198 |
| f21c_diacope_rate | 0.0119 | 0.217 |

### INTERACTIONNELLES (30 features, erreur relative > 25%)

Top 10 par erreur relative :

| Feature | MAE | Err. relative |
|---------|-----|--------------|
| f_lexical_progression | 0.0256 | 20.146 |
| f28d_sil_score | 0.0022 | 2.009 |
| f26c_period_score | 0.2054 | 1.278 |
| f_desire_negation_rate | 0.0602 | 1.268 |
| f30b_imparfait_rate | 0.1807 | 1.088 |
| f27a_epistemic_rate | 0.7865 | 1.080 |
| f30d_ps_imp_ratio | 37.5368 | 1.030 |
| f5c_action_verb_ratio | 0.0010 | 0.941 |
| f27b_conditional_rate | 0.0031 | 0.870 |
| f27d_modal_score | 0.0166 | 0.785 |

## 3.4 MAE par tier (features normalisées)

| Tier | MAE normalisée | N passages | Interprétation |
|------|---------------|------------|----------------|
| B | 2.784 | 909 | Le plus additif (prose "scolaire") |
| S | 2.911 | 2484 | Intermédiaire global, mais violent sur 9 features |
| A | 3.225 | 819 | Modéré |
| D | 3.359 | 90 | Instable (petit échantillon) |
| C | 3.545 | 819 | Le MOINS additif (incohérence, pas génie) |

DÉCOUVERTE : B (prose compétente) est le plus prévisible. C (commercial) est
le moins prévisible — non par génie mais par incohérence structurelle.

## 3.5 Fichier de sortie

`omega-autopsie/results_phase_r8/R8_ADDITIVITY_TEST.json`

---

# 4. R-8.3 — COEFFICIENTS LAMBDA λi,f

## 4.1 Méthode

Pour chaque feature f, apprendre λi,f tel que :
  f_mesuré ≈ Σ(pi,k × λi,f × Ci,f)

3 méthodes comparées : OLS, Ridge(α=1), NNLS (Non-Negative Least Squares).
Meilleure méthode par validation retenue.
Bootstrap : 10 resamples pour stabilité.
Split : 80/20, seed=42.

## 4.2 Volume

- Passages : 5121
- Train : 4097 / Val : 1024
- Features testées : 47

## 4.3 Résultats globaux

| Statut | Count |
|--------|-------|
| LAMBDA_USEFUL (gain > 5%, stable) | 39 |
| LAMBDA_NEUTRAL (gain < 5%) | 7 |
| NEEDS_GAMMA | 0 |
| UNSTABLE | 0 |
| DEGENERATE | 1 |

Amélioration globale : MAE 3.868 → 3.269 = **+15.5%**

## 4.4 Top 10 gains par λ

| Feature | MAE baseline | MAE lambda | Gain % | Méthode |
|---------|-------------|-----------|--------|---------|
| f28d_sil_score | 0.0020 | 0.0009 | 56.0% | Ridge |
| f27d_modal_score | 0.0172 | 0.0086 | 49.8% | OLS |
| f27b_conditional_rate | 0.0032 | 0.0016 | 48.3% | OLS |
| f5a_verb_density | 0.0505 | 0.0306 | 39.4% | OLS |
| f30b_imparfait_rate | 0.1818 | 0.1208 | 33.6% | OLS |
| f30a_passe_simple_rate | 0.1635 | 0.1126 | 31.1% | OLS |
| f12_tense_switches | 20.458 | 14.726 | 28.0% | OLS |
| f26b_long_sent_rate | 0.1323 | 0.0988 | 25.3% | Ridge |
| f1a_rhythm_variance | 7.5332 | 5.6591 | 24.9% | NNLS |
| f24c_contrast_delta | 13.996 | 10.593 | 24.3% | Ridge |

## 4.5 λ des features ADDITIVES (R-8.2)

| Feature | λ(act) | λ(narr) | λ(desc) | λ(dial) | λ(intro) | Gain% |
|---------|--------|---------|---------|---------|----------|-------|
| f15b_redundancy | 0.88 | 1.17 | 0.97 | 0.99 | 1.03 | 5.2% |
| f16a_bigram | 0.88 | 1.17 | 0.97 | 0.99 | 1.03 | 5.2% |
| f19a_entropy | 0.94 | 1.05 | 1.00 | 1.01 | 1.00 | 9.7% |
| f24a_banal_rate | 1.21 | 0.76 | 0.97 | 1.05 | 1.02 | 1.5% |
| f24b_apex_rate | 1.09 | 0.90 | 1.00 | 1.02 | 0.99 | -0.7% |
| f24e_contrast | 0.93 | 1.09 | 0.99 | 0.99 | 1.02 | 1.2% |
| f29a_ttr_global | 1.04 | 1.16 | 1.00 | 1.06 | 0.42 | 9.7% |
| f29d_ttr_score | 0.98 | 1.11 | 0.94 | 1.05 | 0.97 | 11.5% |
| f34b_para | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | -1.1% |

NOTE : f29a_ttr_global a λ(introspection) = 0.42. L'introspection a un TTR
naturellement bas (mots répétés — penser, croire, sembler). Le modèle corrige.

## 4.6 Fichier de sortie

`omega-autopsie/results_phase_r8/R8_LAMBDA_ESTIMATION.json`

---

# 5. R-8.3b — ANALYSE RÉSIDUELLE POST-λ

## 5.1 Question

Après correction λ, le gap d'erreur S vs C/D persiste-t-il sur les 9
features identifiées comme "gamma targets" par R-8.2 ?

## 5.2 Résultats complets

| Feature | Base S | Base CD | ratio | Lam S | Lam CD | ratio | Verdict |
|---------|--------|---------|-------|-------|--------|-------|---------|
| f38b_punct_density | 0.0615 | 0.0316 | 1.95× | 0.0545 | 0.0335 | 1.62× | GAMMA_NEEDED |
| f38c_speed_score | 0.1231 | 0.0633 | 1.95× | 0.1089 | 0.0670 | 1.62× | GAMMA_NEEDED |
| f28d_sil_score | 0.0025 | 0.0017 | 1.47× | 0.0014 | 0.0006 | 2.45× | GAMMA_NEEDED |
| f27a_epistemic_rate | 0.8933 | 0.6048 | 1.48× | 0.7943 | 0.4326 | 1.84× | GAMMA_NEEDED |
| f33c_dot_comma_ratio | 0.6463 | 0.5712 | 1.13× | 0.6113 | 0.4721 | 1.29× | GAMMA_NEEDED |
| f1b_rhythm_ratio | 31.041 | 24.102 | 1.29× | 29.919 | 17.480 | 1.71× | GAMMA_NEEDED |
| f26a_mean_sub_markers | 0.3544 | 0.3074 | 1.15× | 0.3083 | 0.2341 | 1.32× | GAMMA_NEEDED |
| f_subordination_depth | 0.3544 | 0.3074 | 1.15× | 0.3083 | 0.2341 | 1.32× | GAMMA_NEEDED |
| f26c_period_score | 0.2301 | 0.1902 | 1.21× | 0.1967 | 0.1147 | 1.71× | GAMMA_NEEDED |

RÉSULTAT CRITIQUE : 9/9 features → GAMMA_NEEDED.
Le ratio moyen a AUGMENTÉ : 1.419× → 1.655× (+16.6%).
λ a amélioré C/D (plus prévisibles) mais a RÉVÉLÉ que S est encore
plus non-linéaire que prévu.

## 5.3 Fichier de sortie

`omega-autopsie/results_phase_r8/R8_RESIDUAL_ANALYSIS.json`

---

# 6. R-8.4 — GAMMA INTERACTIONS γij,f

## 6.1 Méthode

Pour les 9 features gamma, résidus post-λ régressés sur les 10 termes
d'interaction pi×pj (Ridge α=1).
Bootstrap 10 resamples. Split 80/20 seed=42.

10 paires : act×narr, act×desc, act×dial, act×intro, narr×desc,
narr×dial, narr×intro, desc×dial, desc×intro, dial×intro.

## 6.2 Verdicts

| Feature | MAE base | MAE +λ | MAE +γ | Gain total | S/CD post-γ | Verdict |
|---------|----------|--------|--------|-----------|------------|---------|
| f26a_mean_sub_markers | 0.3205 | 0.2666 | 0.2461 | 23.2% | 1.56× | EFFECTIVE |
| f_subordination_depth | 0.3205 | 0.2666 | 0.2461 | 23.2% | 1.56× | EFFECTIVE |
| f26c_period_score | 0.2072 | 0.1631 | 0.1519 | 26.7% | 2.04× | EFFECTIVE |
| f33c_dot_comma_ratio | 0.5742 | 0.5173 | 0.5068 | 11.7% | 1.27× | MARGINAL |
| f28d_sil_score | 0.0020 | 0.0009 | 0.0017 | 12.5% | 1.92× | NEGLIGIBLE |
| f27a_epistemic_rate | 0.8024 | 0.6733 | 0.6611 | 17.6% | 1.95× | NEGLIGIBLE |
| f1b_rhythm_ratio | 27.220 | 24.463 | 24.495 | 10.0% | 1.66× | NEGLIGIBLE |
| f38b_punct_density | 0.0503 | 0.0449 | 0.0537 | -6.6% | 2.43× | NEGLIGIBLE |
| f38c_speed_score | 0.1007 | 0.0898 | 0.1073 | -6.6% | 2.43× | NEGLIGIBLE |

## 6.3 Interactions significatives (3 features EFFECTIVE)

### f26a_mean_sub_markers (8/10 significatives)

| Paire | γ | ± stdev | Signe | Interprétation |
|-------|---|---------|-------|----------------|
| act×narr | +0.990 | ±0.076 | + | Action+narration = plus de subordination |
| act×desc | -1.229 | ±0.222 | - | Action+description = moins |
| act×dial | -0.907 | ±0.192 | - | Action+dialogue = moins |
| act×intro | -2.279 | ±0.370 | - | Action ÉCRASE l'introspection |
| narr×intro | -0.964 | ±0.375 | - | |
| desc×dial | +0.856 | ±0.417 | + | |
| desc×intro | **+3.148** | ±0.761 | **+** | **Description+introspection = EXPLOSION subordination** |
| dial×intro | -0.604 | ±0.129 | - | |

### f26c_period_score (5/10 significatives)

| Paire | γ | ± stdev | Signe |
|-------|---|---------|-------|
| act×narr | +0.529 | ±0.071 | + |
| act×desc | -1.191 | ±0.240 | - |
| act×intro | -1.984 | ±0.397 | - |
| desc×intro | **+2.406** | ±0.755 | **+** |
| dial×intro | -0.566 | ±0.101 | - |

CONSTANTE : description × introspection est TOUJOURS la paire dominante
pour les features de subordination/période (γ = +3.15 et +2.41).

## 6.4 Pourquoi γ échoue sur 5 features

f38b_punct_density et f38c_speed_score : γ DÉGRADE (-19.5%). Le modèle
overfit sur les termes croisés alors que la ponctuation est SÉQUENTIELLE
(l'ordre des phrases compte, pas juste le mélange de types).

f28d_sil_score : λ avait déjà capturé 56%. Ajouter γ détruit le signal
(MAE remonte de 0.0009 à 0.0017).

f27a_epistemic et f1b_rhythm : gains <2%. Le doute et le rythme sont des
propriétés CINÉTIQUES qui dépendent de l'ordre, pas de la proportion.

## 6.5 Co-occurrences les plus fréquentes

| Paire | Apparitions (sur 9 features) |
|-------|------------------------------|
| action × description | 9/9 |
| dialogue × introspection | 9/9 |
| action × narration | 8/9 |
| action × introspection | 8/9 |
| description × introspection | 7/9 |

## 6.6 Décision architecturale

- γ RETENU pour : f26a_mean_sub_markers, f_subordination_depth, f26c_period_score
- γ MARGINAL : f33c_dot_comma_ratio
- γ ABANDONNÉ pour : f38b, f38c, f28d, f27a, f1b
- Raison : seules les features d'ÉTAT (subordination, période) bénéficient
  de γ. Les features CINÉTIQUES (rythme, vitesse, SIL) sont séquentielles.

## 6.7 Fichier de sortie

`omega-autopsie/results_phase_r8/R8_GAMMA_INTERACTIONS.json`

---

# 7. R-8.5 — SEUILS DE BASCULEMENT Tk

## 7.1 Méthode

Re-entraîner le GB exact (même split, seed, hyperparams) et extraire
les seuils de split de tous les arbres. Pour chaque feature :
distribution des seuils, médiane (= Tk), direction, delta conditionnel.

## 7.2 GB confirmé

- Params : n_estimators=50, max_depth=4, learning_rate=0.05
- Val R² : 0.4396
- Holdout R² : 0.3260
- Full Spearman : 0.7865
- N arbres : 50

## 7.3 Feature importance complète (top 20)

| Rang | Feature | Importance | N splits |
|------|---------|-----------|----------|
| 1 | **f26b_long_sent_rate** | **0.2902** | 39 |
| 2 | f_pov_stability | 0.0583 | 28 |
| 3 | ix_variance_x_longrate | 0.0555 | 18 |
| 4 | f_pov_shift_rate | 0.0441 | 27 |
| 5 | f29d_ttr_score | 0.0421 | 29 |
| 6 | f_causal_density | 0.0385 | 25 |
| 7 | f1a_rhythm_variance | 0.0356 | 18 |
| 8 | f_pov_drift_rate | 0.0356 | 22 |
| 9 | f19a_approx_entropy | 0.0346 | 35 |
| 10 | f_clause_per_sentence | 0.0262 | 14 |
| 11 | f_semantic_stagnation | 0.0253 | 24 |
| 12 | f_hapax_contextual_rate | 0.0229 | — |
| 13 | f1_mean | 0.0213 | 13 |
| 14 | f_pov_rupture_rate | 0.0208 | 19 |
| 15 | f_referent_continuity | 0.0205 | 18 |
| 16 | f_motif_concentration | 0.0193 | 17 |
| 17 | f_lexical_callback_rate | 0.0187 | 13 |
| 18 | f_temporal_anchor_rate | 0.0164 | 14 |
| 19 | f_referent_orphan_rate | 0.0155 | 13 |
| 20 | f9a_contradiction_rate | 0.0138 | — |

NOTE : f26b_long_sent_rate = 29% de l'importance totale. C'est le PORTAIL.

## 7.4 Seuils complets (Tk)

| Feature | Tk (médiane) | P10 | P90 | Min | Max | Direction | Delta |
|---------|-------------|-----|-----|-----|-----|-----------|-------|
| f26b_long_sent_rate | 0.0240 | 0.0061 | 0.1497 | 0.0042 | 0.2496 | HIGHER | +1.110 |
| f_pov_stability | 0.6462 | 0.5622 | 0.7932 | 0.5599 | 0.8247 | LOWER | -0.358 |
| ix_variance×longrate | 0.0961 | 0.0394 | 1.0539 | 0.0377 | 1.8553 | HIGHER | +1.263 |
| f_pov_shift_rate | 0.3480 | 0.0595 | 0.5539 | 0.0495 | 0.5764 | HIGHER | +0.459 |
| f29d_ttr_score | 0.7095 | 0.6808 | 0.7377 | 0.6777 | 0.7424 | LOWER | -0.462 |
| f_causal_density | 0.0679 | 0.0223 | 0.1435 | 0.0185 | 0.1585 | HIGHER | +0.645 |
| f1a_rhythm_variance | 11.3611 | 7.9893 | 19.8974 | 7.7569 | 23.1167 | HIGHER | +0.976 |
| f_pov_drift_rate | 0.1126 | 0.0507 | 0.2325 | 0.0454 | 0.2597 | HIGHER | +0.422 |
| f19a_approx_entropy | 0.6373 | 0.5499 | 0.8100 | 0.5365 | 0.8443 | HIGHER | +0.537 |
| f_clause_per_sentence | 1.0095 | 1.0047 | 1.3540 | 1.0044 | 1.5959 | HIGHER | +0.303 |

## 7.5 Effets conditionnels (above vs below Tk)

| Feature | Tk | Above (pred) | Above (S count) | Below (pred) | Below (S count) | % S above |
|---------|---:|-------------|-----------------|-------------|-----------------|-----------|
| f26b_long_sent_rate | 0.024 | 4.32 | 235 | 3.21 | 43 | 84.5% |
| ix_variance×longrate | 0.096 | 4.21 | 266 | 2.95 | 12 | 95.7% |
| f1a_rhythm_variance | 11.36 | 4.39 | 202 | 3.41 | 76 | 72.7% |
| f_causal_density | 0.068 | 4.26 | 178 | 3.61 | 100 | 64.0% |
| f19a_approx_entropy | 0.637 | 4.07 | 234 | 3.54 | 44 | 84.2% |
| f_pov_shift_rate | 0.348 | 4.20 | 147 | 3.74 | 131 | 52.9% |
| f29d_ttr_score | 0.710 | 3.75 | 137 | 4.21 | 141 | 49.3% |
| f_pov_stability | 0.646 | 3.77 | 124 | 4.13 | 154 | 44.6% |
| f_pov_drift_rate | 0.113 | 4.15 | 162 | 3.73 | 116 | 58.3% |
| f_clause_per_sentence | 1.010 | 4.05 | 198 | 3.75 | 80 | 71.2% |

LECTURE : 95.7% des œuvres S ont ix_variance×longrate > 0.096.
Seulement 49.3% des S ont TTR > 0.71 (confirme l'inversion : TTR haut = artificiel).

## 7.6 Co-occurrences dans les arbres (top 15)

| Feature A | Feature B | Count/50 | % |
|-----------|-----------|----------|---|
| f26b_long_sent_rate | f_pov_stability | 16 | 32% |
| f26b_long_sent_rate | f29d_ttr_score | 15 | 30% |
| f26b_long_sent_rate | f_pov_shift_rate | 15 | 30% |
| f19a_approx_entropy | f26b_long_sent_rate | 15 | 30% |
| f29d_ttr_score | f_pov_stability | 13 | 26% |
| f26b_long_sent_rate | f_causal_density | 12 | 24% |
| f19a_approx_entropy | f_causal_density | 12 | 24% |
| f19a_approx_entropy | f_pov_stability | 12 | 24% |
| f26b_long_sent_rate | f_pov_rupture_rate | 11 | 22% |
| f_causal_density | f_pov_stability | 11 | 22% |
| f1a_rhythm_variance | f26b_long_sent_rate | 11 | 22% |
| f26b_long_sent_rate | f_entity_persistence | 11 | 22% |
| f26b_long_sent_rate | ix_variance_x_longrate | 10 | 20% |
| f19a_approx_entropy | f_pov_shift_rate | 10 | 20% |
| f26b_long_sent_rate | f_pov_drift_rate | 10 | 20% |

f26b_long_sent_rate apparaît dans 12/15 des paires les plus fréquentes.
C'est le NŒUD CENTRAL du réseau de décision du GB.

## 7.7 Fichier de sortie

`omega-autopsie/results_phase_r8/R8_TIPPING_POINTS.json`

---

# 8. R-8.6 — LOI DES LEGO (ASSEMBLAGE)

## 8.1 Méthode

5 analyses sur fenêtres consécutives de 500w et blocs de 2000w :
1. Matrice de transition (type N → type N+1)
2. Trigrams de types (séquences de 3)
3. Bonus d'assemblage (bloc 2000w vs 4×500w)
4. Révélation d'échelle (type dominant à 500w vs 2000w)
5. Diversité typologique par œuvre

## 8.2 Volume

- 565 œuvres traitées, 6 skippées
- Fenêtres 500w consécutives : des milliers par œuvre
- Blocs 2000w reconstitués : 4 fenêtres assemblées

## 8.3 Transitions S vs C/D (top 10 chaque)

### Enrichies chez S (maîtres)

| Transition | S freq | CD freq | Ratio |
|-----------|--------|---------|-------|
| introspection→description | 0.008 | 0.001 | 5.85× |
| introspection→introspection | 0.002 | 0.000 | 5.67× |
| description→introspection | 0.008 | 0.002 | 5.07× |
| narration→introspection | 0.002 | 0.001 | 3.20× |
| description→description | 0.355 | 0.115 | 3.08× |
| narration→narration | 0.073 | 0.025 | 2.91× |
| description→narration | 0.057 | 0.021 | 2.73× |
| narration→description | 0.057 | 0.022 | 2.62× |
| narration→dialogue | 0.021 | 0.008 | 2.62× |
| dialogue→narration | 0.021 | 0.008 | 2.49× |

### Enrichies chez C/D (commerciaux)

| Transition | S freq | CD freq | Ratio S/CD |
|-----------|--------|---------|------------|
| dialogue→action | 0.008 | 0.031 | 0.25× |
| action→dialogue | 0.008 | 0.031 | 0.25× |
| action→action | 0.103 | 0.394 | 0.26× |
| introspection→dialogue | 0.000 | 0.001 | 0.40× |
| narration→action | 0.016 | 0.029 | 0.54× |
| action→narration | 0.016 | 0.029 | 0.55× |
| description→action | 0.036 | 0.059 | 0.61× |
| action→description | 0.036 | 0.058 | 0.62× |

## 8.4 Trigrams signatures (top 10 chaque)

### Enrichis chez S

| Trigram | S freq | CD freq | Ratio |
|---------|--------|---------|-------|
| desc→desc→intro | 0.0057 | 0.0005 | **12.10×** |
| desc→intro→desc | 0.0054 | 0.0006 | **8.26×** |
| intro→desc→desc | 0.0057 | 0.0007 | **8.11×** |
| narr→dial→dial | 0.0112 | 0.0024 | 4.66× |
| narr→narr→narr | 0.0402 | 0.0095 | 4.24× |
| dial→dial→narr | 0.0110 | 0.0027 | 4.05× |
| desc→desc→desc | 0.2820 | 0.0707 | 3.99× |
| desc→narr→desc | 0.0300 | 0.0075 | 3.98× |
| narr→desc→narr | 0.0162 | 0.0042 | 3.81× |
| narr→narr→dial | 0.0078 | 0.0021 | 3.81× |

### Enrichis chez C/D

| Trigram | S freq | CD freq | Ratio S/CD |
|---------|--------|---------|------------|
| act→dial→act | 0.0033 | 0.0194 | 0.17× |
| dial→act→act | 0.0037 | 0.0208 | 0.18× |
| act→act→dial | 0.0037 | 0.0197 | 0.19× |
| act→act→act | 0.0824 | 0.3308 | 0.25× |
| act→desc→act | 0.0079 | 0.0227 | 0.35× |

## 8.5 Bonus d'assemblage (bloc 2000w vs moyenne 4×500w)

| Feature | S bonus | A bonus | B bonus | C bonus | S>C? |
|---------|---------|---------|---------|---------|------|
| f1a_rhythm_variance | **+1.8054** | +0.6175 | +0.5025 | +0.1755 | **OUI** |
| f1_mean | +0.4429 | -0.4386 | +0.0493 | -0.0712 | **OUI** |
| f9a_contradiction_rate | +0.0135 | -0.0215 | +0.0068 | -0.0039 | **OUI** |
| f_subordination_depth | +0.0109 | -0.0157 | -0.0065 | -0.0033 | **OUI** |
| f_causal_density | +0.0012 | -0.0027 | +0.0013 | -0.0003 | **OUI** |
| f19a_approx_entropy | -0.0195 | -0.0205 | -0.0201 | -0.0218 | OUI (marginal) |
| f29d_ttr_score | -0.0000 | -0.0000 | +0.0001 | -0.0001 | OUI (marginal) |
| f26b_long_sent_rate | -0.0053 | -0.0056 | -0.0020 | -0.0014 | non |
| f27a_epistemic_rate | -0.6003 | -0.4114 | -0.4183 | -0.2112 | non |
| f26c_period_score | -0.0072 | -0.0229 | -0.0116 | -0.0038 | non |
| f28d_sil_score | -0.0008 | -0.0002 | -0.0003 | -0.0000 | non |
| f_tension_density | +0.0000 | +0.0000 | +0.0000 | -0.0000 | non |

Bonus moyen global : S=+0.1807, CD=+0.0244 → ratio **7.4×**

## 8.6 Révélation d'échelle

| Tier | % changement type 500w→2000w | N |
|------|----------------------------|---|
| S | 21.5% | 2689 |
| A | 22.5% | 881 |
| B | 27.0% | 958 |
| C | 26.1% | 892 |
| D | 24.7% | 81 |

Les MAÎTRES changent MOINS (21.5%) que les commerciaux (26.1%).
Interprétation : les maîtres TIENNENT leur registre. Les commerciaux zappent.

## 8.7 Diversité typologique par œuvre

| Tier | Moyenne types | Stdev | N |
|------|--------------|-------|---|
| S | 3.88 | 1.05 | 275 |
| A | 3.65 | 1.03 | 91 |
| B | 3.68 | 1.08 | 99 |
| C | 3.45 | 1.11 | 91 |
| D | 3.22 | 1.20 | 9 |

S utilise plus de types différents dans l'œuvre complète.

## 8.8 Hypothèses

| H | Énoncé | Verdict | Détail |
|---|--------|---------|--------|
| H1 | Maîtres = transitions plus riches | CONFIRMÉ (nuancé) | Pas par count brut (25 vs 24) mais par enrichissement des circuits |
| H2 | Maîtres = bonus d'assemblage | **CONFIRMÉ** | S=+0.181 vs CD=+0.024, ratio 7.4× |
| H3 | LLM/commerciaux = plus monotones | **REJETÉ** | S=21.5% vs C=26.1%, les maîtres sont plus STABLES |

## 8.9 Fichier de sortie

`omega-autopsie/results_phase_r8/R8_ASSEMBLY_ANALYSIS.json`

---

# 9. FORMULES MATHÉMATIQUES COMPLÈTES

## 9.1 Classification de passage (vecteur de type)

```
Pour un passage de texte :
  action_score = min(1.0, action_verb_rate×20 + ps_rate×2 + short_sent_rate×0.5 + ...)
  narration_score = min(1.0, third_person_rate×4 + imp_rate×2 + ps_rate×2 + temporal_rate×8)
  description_score = min(1.0, adj_rate×8 + sensory_rate×15 + static_verb_rate×10)
  dialogue_score = min(1.0, dialogue_line_ratio×1.5 + speech_verb_rate×10)
  introspection_score = min(1.0, modal_rate×15 + cond_rate×12 + first_person_rate×3)

  Normalisation : pi = raw_score_i / Σ(raw_scores)
  Somme = 1.0
```

## 9.2 Constantes typologiques (R-8.1)

```
Ci,f = Σ_k(pi,k × fk) / Σ_k(pi,k)
```
Moyenne pondérée continue. Chaque passage contribue proportionnellement.

## 9.3 Prédiction avec λ (R-8.3)

```
f_hat = Σ_i(pi × λi,f × Ci,f)
```

## 9.4 Prédiction avec γ (R-8.4, 3 features seulement)

```
f_hat = Σ_i(pi × λi,f × Ci,f) + Σ_{i<j}(pi × pj × γij,f)
```

## 9.5 Seuils (R-8.5)

```
Si f26b_long_sent_rate > 0.024 → ZONE MAÎTRE (delta +1.11)
Si f29d_ttr_score > 0.710 → PÉNALITÉ ARTIFICIALITÉ (delta -0.46)
Si f_pov_stability > 0.646 → PÉNALITÉ MONOTONIE (delta -0.36)
```

## 9.6 Bonus d'assemblage (R-8.6)

```
bonus(feature, tier) = mean(feature sur bloc 2000w) - mean(feature sur 4×500w)

Pour f1a_rhythm_variance :
  S : +1.81  (synergie massive)
  C : +0.18  (quasi nul)
```

---

# 10. LOIS FONDAMENTALES DÉCOUVERTES

## Loi 1 — La Polyphonie Obligatoire
Les passages "chimiquement purs" n'existent pas à 2000 mots chez les maîtres.
Un maître MÉLANGE toujours. 0.14% de passages purs vs 100% de passages mixtes.

## Loi 2 — La Séparation Additive/Interactionnelle
21% des features littéraires sont additives (surface lexicale).
70% sont interactionnelles (dépendent du contexte typologique).
La littérature n'est PAS une somme de propriétés indépendantes.

## Loi 3 — Le Coefficient d'Influence λ
Chaque type de passage "tire" différemment sur chaque feature.
L'introspection tire le SIL (+56% de gain par λ). L'action tire le rythme.
Le dialogue tire les switches temporels. Ces influences sont MESURABLES.

## Loi 4 — L'Émergence par Friction (limitée)
Quand description + introspection coexistent, la subordination EXPLOSE
(γ = +3.15, au-delà de la somme). Mais cet effet n'existe que pour
la subordination/période. Le SIL, le rythme, la vitesse sont SÉQUENTIELS.

## Loi 5 — Le Portail des Phrases Longues
f26b_long_sent_rate (>2.4%) est le critère le plus binaire du GB.
84.5% des S sont au-dessus. C'est le "droit d'entrée" de la maîtrise.
Les maîtres ont le SOUFFLE syntaxique. Sans lui, rien d'autre ne compte.

## Loi 6 — Les Deux Inversions
TTR élevé = artificiel (le LLM diversifie par peur de la répétition).
Stabilité POV élevée = monotone (le LLM ne glisse jamais).
Les maîtres RÉPÈTENT stratégiquement et GLISSENT entre les POV.

## Loi 7 — Le Circuit Flaubert
desc→desc→intro = 12.1× enrichi chez les S. Les maîtres INSTALLENT
par la description (2 fenêtres de fond), puis PLONGENT dans l'introspection.
Les commerciaux alternent action→dialogue mécaniquement (6× enrichi en C/D).

## Loi 8 — Le Bonus d'Assemblage
Le tout vaut plus que la somme des parties. La variance rythmique BONDIT
de +1.81 chez les S quand on assemble 4 fenêtres, vs +0.18 chez les C.
Les maîtres créent du CONTRASTE entre fenêtres successives.

## Loi 9 — La Stabilité Souveraine
Les maîtres changent MOINS de type dominant entre 500w et 2000w (21.5%
vs 26.1%). Ils ont la CONFIANCE de tenir un registre sur la durée.
Les commerciaux zappent plus souvent, sans rendement structurel.

---

# 11. LIMITES CONNUES

## 11.1 Le classifieur de type est approximatif
Le classifieur passage-classifier.ts est basé sur des heuristiques
(compteurs de mots-clés, regex). Il n'utilise pas de NLP profond.
Un classifieur basé sur embeddings serait plus précis mais nécessiterait
un modèle pré-entraîné.

## 11.2 Les features sont partiellement redondantes
f26a_mean_sub_markers et f_subordination_depth_approx donnent des résultats
identiques en R-8.3 et R-8.4 (même MAE, mêmes γ). Ce sont probablement
des variantes du même signal.

## 11.3 Le corpus Tier D est petit (10→50 œuvres)
Avec seulement 50 œuvres D (dont 40 synthétiques), les statistiques D
sont fragiles. À renforcer avec des œuvres faibles réelles.

## 11.4 La non-linéarité séquentielle reste au GB
5/9 features "gamma targets" n'ont PAS été capturées par les termes croisés.
Leur non-linéarité est dans la SÉQUENCE (l'ordre des types), pas dans
la proportion. Le GB les capture mais on ne peut pas les DOCUMENTER
explicitement comme on documente les Tk.

## 11.5 Le bonus d'assemblage est moyen, pas par passage
Le bonus est calculé comme moyenne sur des centaines de blocs. Des blocs
individuels peuvent avoir un bonus négatif même chez les S.

---

# 12. CHEMINS DES FICHIERS

## Scripts

| Fichier | Chemin complet |
|---------|---------------|
| R-8.1 v2 | omega-autopsie/corpus_r/r8_type_profiles_v2.py |
| R-8.1 v1 (obsolète) | omega-autopsie/corpus_r/r8_type_profiles.py |
| R-8.2 | omega-autopsie/corpus_r/r8_additivity_test.py |
| R-8.3 | omega-autopsie/corpus_r/r8_lambda_estimation.py |
| R-8.3b | omega-autopsie/corpus_r/r8_residual_analysis.py |
| R-8.4 | omega-autopsie/corpus_r/r8_gamma_interactions.py |
| R-8.4 fix | omega-autopsie/corpus_r/r8_fix_json.py |
| R-8.5 | omega-autopsie/corpus_r/r8_tipping_points.py |
| R-8.6 | omega-autopsie/corpus_r/r8_assembly_analysis.py |

## Données JSON

| Fichier | Chemin complet |
|---------|---------------|
| Ci,f | omega-autopsie/results_phase_r8/TYPE_PROFILES_PURE.json |
| Additivité | omega-autopsie/results_phase_r8/R8_ADDITIVITY_TEST.json |
| Lambda | omega-autopsie/results_phase_r8/R8_LAMBDA_ESTIMATION.json |
| Résidus | omega-autopsie/results_phase_r8/R8_RESIDUAL_ANALYSIS.json |
| Gamma | omega-autopsie/results_phase_r8/R8_GAMMA_INTERACTIONS.json |
| Tipping Points | omega-autopsie/results_phase_r8/R8_TIPPING_POINTS.json |
| Assemblage | omega-autopsie/results_phase_r8/R8_ASSEMBLY_ANALYSIS.json |

## Documents

| Fichier | Chemin complet |
|---------|---------------|
| Ce rapport | docs/OMEGA_PHASE_R8_TECHNICAL_REPORT.md |
| SESSION_SAVE | docs/SESSION_SAVE_PHASE_R8_COMPLETE.md |
| Bible (à mettre à jour) | docs/OMEGA_PROTOCOLE_ANALYSE_COMPLET.md |

## Données source

| Fichier | Chemin complet |
|---------|---------------|
| Corpus textes | omega-autopsie/corpus_r/txt/ |
| Classification tiers | omega-autopsie/corpus_r/CORPUS_TIERS_V3.json |
| Features master | omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json |
| Depth features | omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json |
| Semantic features | omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES_MASTER.json |
| Classifieur TS | packages/sovereign-engine/src/scoring/passage-classifier.ts |

---

*OMEGA Phase R-8 — Rapport Technique Complet*
*2026-03-21 — Standard NASA-Grade L4 / DO-178C Level A*
*Tag : phase-r8-complete — Commit : 2b286deb*
*"Ce qui n'est pas mesuré n'est pas acceptable."*
