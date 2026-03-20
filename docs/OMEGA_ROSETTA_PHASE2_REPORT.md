# OMEGA — Rosetta Phase 2 : Calibration Mécanique

**Date** : 2026-03-20
**Modèle** : claude-sonnet-4-20250514
**Appels API** : 25
**Passages extraits** : 20
**Tests rétro-ingénierie** : 20
**Convergences** : 4

## 1. Matrice de faisabilité par style

| Style | Passages | Dist min | R6 max LLM | R6 classique | Gap | Converge? |
|-------|----------|----------|-----------|-------------|-----|-----------|
| DESCRIPTION | 4 | 0.5903 | 54.52 | 49.16 | -5.36 | Oui (2 iter) |
| ACTION | 4 | 1.8716 | 57.8 | 51.06 | -6.74 | Non testé |
| INTROSPECTION | 4 | 0.4635 | 60.33 | 44.83 | -15.5 | Oui (2 iter) |
| CONTEMPLATION | 4 | 49.337 | 57.28 | 48.06 | -9.22 | Non testé |
| LYRIQUE | 4 | 0.9312 | 54.64 | 43.84 | -10.8 | Non testé |

## 2. Features maîtrisées (taux respect > 60%)

- **f29d_ttr_score** : maîtrisée
- **f24e_contrast_score** : maîtrisée
- **f15b_redundancy_compression** : maîtrisée
- **f16a_bigram_rarity** : maîtrisée
- **f35c_hook_score** : maîtrisée
- **f25g_description_score** : maîtrisée
- **f17_knife_count** : maîtrisée
- **f36c_cliff_score** : maîtrisée

## 3. Features irréductibles (taux respect < 20%)

- **f28d_sil_score** : irréductible
- **f27d_modal_score** : irréductible
- **f1b_rhythm_ratio** : irréductible
- **f5c_action_verb_ratio** : irréductible
- **f17_knife_count** : irréductible
- **f9a_contradiction_rate** : irréductible
- **f5a_verb_density** : irréductible
- **f21c_diacope_rate** : irréductible
- **f38c_speed_score** : irréductible

## 4. Réponse à la question de Francky

> "Si on donne au LLM les MÉTRIQUES PRÉCISES d'un passage réel,
>  peut-il produire un texte avec les mêmes métriques ?"

**Résultats chiffrés :**
- Moyenne features alignées (ratio 0.80-1.20) : 6.8/17
- Moyenne features divergentes : 10.3/17
- Distance euclidienne moyenne : 263.8232
- Meilleure distance après convergence : 0.6586

**Verdict** : MIXTE — Le LLM maîtrise certaines features mais a des LIMITES STRUCTURELLES.
Certaines dimensions stylistiques ne sont pas contrôlables par prompt seul.

## 5. Facteurs de conversion par feature

| Feature | Demandé (moy) | Produit (moy) | Facteur Y/X |
|---------|--------------|--------------|-------------|
| f1_mean | 31.9079 | 24.0517 | 0.7538 |
| f5a_verb_density | 0.1217 | 0.1059 | 0.8702 |
| f25g_description_score | 0.4871 | 0.6157 | 1.264 |
| f28d_sil_score | 0.1422 | 0.0298 | 0.2096 |
| f27d_modal_score | 0.3775 | 0.2635 | 0.698 |
| f38c_speed_score | 0.2872 | 0.2991 | 1.0414 |
| f29d_ttr_score | 0.7117 | 0.7303 | 1.0261 |
| f24e_contrast_score | 0.8778 | 0.8576 | 0.977 |
| f1b_rhythm_ratio | 9.8454 | 9.8096 | 0.9964 |
| f15b_redundancy_compression | 0.9433 | 0.9716 | 1.03 |
| f16a_bigram_rarity | 0.9433 | 0.9716 | 1.03 |
| f5c_action_verb_ratio | 0.1505 | 0.3011 | 2.0007 |
| f17_knife_count | 19.4286 | 6.4286 | 0.3309 |
| f9a_contradiction_rate | 1.4421 | 0.8903 | 0.6174 |
| f21c_diacope_rate | 0.0253 | 0.0077 | 0.3043 |
| f36c_cliff_score | 0.5802 | 0.45 | 0.7756 |
| f35c_hook_score | 0.4602 | 0.4701 | 1.0215 |

## 6. Recommandations pour le prompt-assembler

1. **Features contrôlables** : intégrer dans le prompt avec valeurs cibles.
   - f29d_ttr_score, f24e_contrast_score, f15b_redundancy_compression, f16a_bigram_rarity, f35c_hook_score, f25g_description_score, f17_knife_count, f36c_cliff_score
2. **Features irréductibles** : appliquer un facteur de conversion inverse.
   - f28d_sil_score, f27d_modal_score, f1b_rhythm_ratio, f5c_action_verb_ratio, f17_knife_count, f9a_contradiction_rate, f5a_verb_density, f21c_diacope_rate, f38c_speed_score
3. **Convergence itérative** : efficace pour les 4-5 features les plus faciles.
4. **Limite** : au-delà de 3-4 itérations, le LLM stagne.

## 7. SESSION_SAVE

```
Date: 2026-03-20T08:50:27.417Z
Phase: Rosetta Phase 2 — Calibration Mécanique
Passages extraits: 20
Tests rétro-ingénierie: 20
Convergences: 4
API calls: 25
Features maîtrisées: 8
Features irréductibles: 9
```

---

**Message de redémarrage** : Pour reprendre, exécuter `npx tsx scripts/rosetta-phase2.ts`.
Les résultats sont dans `omega-autopsie/results_rosetta/phase2/`.