# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : ANALYSE D'UTILITÉ COMPLÈTE
# Corrélations, interactions, importance marginale de TOUTES les métriques
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# ZÉRO modification du scoring — ANALYSE PURE
#
# CONTEXTE :
# Phase R a déjà produit des analyses (R5 weights, R8 tipping points,
# R8 gamma interactions). Mais on n'a JAMAIS fait l'analyse complète
# croisée de TOUTES les features entre elles avec leur utilité marginale
# pour prédire la qualité. Ce script produit LE rapport définitif.
#
# DONNÉES EXISTANTES :
# - omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json (571 œuvres × 72 features)
# - omega-autopsie/corpus_r/CORPUS_TIERS_V3.json (tiers qualité S/A/B/C/D)
# - omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES_MASTER.json (features sémantiques profondes)
# - omega-autopsie/results_phase_r8/R8_TIPPING_POINTS.json (importance GB existante)
# - omega-autopsie/results_phase_r8/R8_GAMMA_INTERACTIONS.json (interactions type×feature)
# ═══════════════════════════════════════════════════════════════════════════════

## MISSION : Créer `scripts/analyze-full-metric-utility.ts`

Ce script charge TOUTES les données du corpus et produit un rapport complet.

### Étape 1 — Chargement

Charger :
1. `CORPUS_FEATURES_MASTER.json` — 571 entrées avec `filename`, `tier`, `language`, `features`
2. `CORPUS_TIERS_V3.json` — mapping filename → tier (S/A/B/C/D)

Filtrer sur les entrées FR uniquement (language === 'fr').
Convertir tier en score numérique : S=5, A=4, B=3, C=2, D=1.

### Étape 2 — Matrice de corrélation complète

Pour TOUTES les features (72+), calculer la matrice de corrélation de Pearson :
- Chaque feature vs chaque autre feature (matrice N×N)
- Chaque feature vs tier_score (corrélation avec la qualité)
- Trier les features par |corrélation avec tier_score| décroissant

Afficher :
```
=== TOP 20 FEATURES CORRÉLÉES À LA QUALITÉ (tier) ===
  1. f26b_long_sent_rate     r=+0.XXX  RYTHME
  2. f1_mean                 r=+0.XXX  RYTHME
  ...
```

### Étape 3 — Familles de features (clusters de corrélation)

Identifier les blocs de features fortement corrélées entre elles (|r| > 0.60).
Ce sont des "familles" : modifier une = modifier les autres.

Afficher :
```
=== FAMILLES DE FEATURES (|r| > 0.60) ===
  Famille RYTHME: f1_mean, f1a_rhythm_variance, f26b_long_sent_rate, f26c_period_score
  Famille VOCABULAIRE: f29d_ttr_score, f16c_lexical_surprise, f16a_bigram_rarity
  ...
```

### Étape 4 — Features liées aux métaphores/images

Identifier TOUTES les features qui touchent aux métaphores, images, clichés, originalité :
- f24a_banal_rate, f24b_apex_rate, f24c_contrast_delta, f24e_contrast_score
- f17_knife_count, f17_banal_count, f17_contrast_spacing
- f16c_lexical_surprise, f16a_bigram_rarity

Pour chacune :
1. Corrélation avec tier_score (utilité directe)
2. Corrélation avec les features de RYTHME (f1_mean, f1a, f26b)
3. Corrélation avec les features de NARRATION (f28d_sil_score, f25g_description_score)
4. Moyenne par tier (A vs B vs C vs D)
5. Écart-type par tier (variance intra-tier)

Afficher un tableau complet.

### Étape 5 — Utilité marginale (régression stepwise)

Faire une régression linéaire stepwise :
1. Commencer avec la feature la plus corrélée
2. Ajouter les features une par une par ordre de gain en R²
3. À chaque étape, noter le R² cumulé et le gain marginal

Objectif : montrer combien de R² chaque feature AJOUTE au-delà des autres.

Afficher :
```
=== UTILITÉ MARGINALE (R² cumulé) ===
  Step 1: +f26b_long_sent_rate      R²=0.120  gain=+0.120
  Step 2: +f29d_ttr_score           R²=0.165  gain=+0.045
  Step 3: +f9a_contradiction_rate   R²=0.190  gain=+0.025
  ...
  Step N: +f24a_banal_rate          R²=0.XXX  gain=+0.00X  ← métaphore
```

### Étape 6 — Interactions critiques (paires de features)

Pour les 15 paires les plus intéressantes (features métaphore × features qualité) :
- Calculer la corrélation de la PAIRE avec le tier
- Calculer si l'interaction `f_A × f_B` prédit mieux que `f_A + f_B`
- Identifier les cas où une feature "inutile seule" devient "utile en contexte"

Paires à tester obligatoirement :
- f24a_banal_rate × f1a_rhythm_variance (banalité × rythme)
- f24a_banal_rate × f35c_hook_score (banalité × accroche)
- f24a_banal_rate × f38c_speed_score (banalité × vitesse)
- f24e_contrast_score × f28d_sil_score (contraste image × intériorité)
- f16c_lexical_surprise × f25g_description_score (surprise × description)
- f17_knife_count × f1_mean (coupes × longueur phrase)
- f24b_apex_rate × f26b_long_sent_rate (apex images × phrases longues)

### Étape 7 — Tiers A vs Reste : qu'est-ce qui distingue les maîtres ?

Pour chaque feature, calculer :
- mean_A (moyenne tier A)
- mean_BCD (moyenne tier B+C+D)
- effect_size = (mean_A - mean_BCD) / stdev_global (Cohen's d)

Trier par |effect_size| décroissant.

Afficher :
```
=== CE QUI DISTINGUE TIER A DES AUTRES (Cohen's d) ===
  1. f26b_long_sent_rate     d=+0.XXX  Les maîtres ont PLUS de phrases longues
  2. f1_mean                 d=+0.XXX  Les maîtres ont des phrases PLUS longues
  ...
  N. f24a_banal_rate         d=-0.XXX  Les maîtres ont [PLUS/MOINS] de banalité
```

### Étape 8 — Rapport final

Sauvegarder dans `docs/OMEGA_METRIC_UTILITY_REPORT.md` :
1. Matrice de corrélation (top 30 paires)
2. Familles de features
3. Utilité marginale stepwise
4. Focus métaphore/image (toutes les corrélations)
5. Interactions critiques
6. Cohen's d tier A vs reste
7. Recommandation de poids pour SII basée sur les données

Aussi sauvegarder les données brutes dans
`src/scoring/data/METRIC_UTILITY_ANALYSIS.json`

### IMPORTANT — NE PAS MODIFIER LE SCORING

Ce script est de l'ANALYSE PURE. Aucun fichier de production ne doit être modifié.
Seul le rapport et les données d'analyse sont créés.

### Exécution

```bash
npx tsx scripts/analyze-full-metric-utility.ts
```

Le script doit fonctionner avec les paths Windows suivants :
- `../../omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json` (relatif depuis sovereign-engine)
- `../../omega-autopsie/corpus_r/CORPUS_TIERS_V3.json`

Ou utiliser un path absolu avec `C:\Users\elric\omega-project\omega-autopsie\corpus_r\`

### Commit

```
chore(analysis): full metric utility analysis — corrélations, interactions, importance

Script d'analyse pure (0 modification du scoring).
Charge les 571 œuvres du corpus R × 72 features.
Calcule: matrice corrélation, utilité marginale stepwise,
interactions critiques, Cohen's d tier A vs reste.
Focus métaphore/image vs qualité littéraire.

Rapport: docs/OMEGA_METRIC_UTILITY_REPORT.md
Données: src/scoring/data/METRIC_UTILITY_ANALYSIS.json
```
