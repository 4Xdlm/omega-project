# OMEGA Phase R-6b — Tribunal de Contrefacon

**Date**: 2026-03-21
**Statut**: PASS PARTIEL
**Branche**: phase-r-metrology-rebuild

---

## Objectif

Construire une comparaison rigoureuse entre :
1. Baseline lineaire V3 (Ridge, 20 features)
2. V3 + 21 nouvelles features semantiques/contextuelles (Ridge)
3. V3 + semantiques + modele non lineaire (Gradient Boosting)

Critere central : reduire l'inversion **Claude Opus > Flaubert**.

---

## Architecture des features semantiques

Module : `packages/sovereign-engine/src/scoring/semantic-depth-features.ts`
Port Python : `omega-autopsie/corpus_r/r6b_semantic_features.py`

### 8 familles, 21 features

| Famille | Features | Meilleur rho individuel |
|---------|----------|------------------------|
| 1. Coherence referentielle | f_referent_continuity, f_referent_orphan_rate, f_entity_persistence | +0.146 |
| 2. Progression intra-passage | f_lexical_progression, f_semantic_stagnation, f_novelty_curve_slope | **-0.403** |
| 3. Precision contextuelle | f_contextual_precision, f_rare_word_isolation | +0.303 / -0.322 |
| 4. Originalite lexicale | f_hapax_contextual_rate, f_vocabulary_depth | ~0 (faible) |
| 5. Tension implicite | f_tension_density, f_desire_negation_rate, f_perception_conflict_rate | **+0.324** |
| 6. Contamination POV | f_pov_drift_rate, f_pov_rupture_rate, f_pov_stability | +0.212 / -0.218 |
| 7. Coherence causale | f_causal_density, f_causal_chain_length, f_temporal_anchor_rate | +0.267 |
| 8. Densite relationnelle | f_echo_density, f_lexical_callback_rate, f_motif_concentration | **-0.386** |

### Features discriminantes (rho > 0.20)

| Feature | Spearman | Direction | Interpretation |
|---------|----------|-----------|----------------|
| f_novelty_curve_slope | -0.403 | S plus negatif | Les maitres epuisent le vocabulaire (pente naturelle) |
| f_motif_concentration | -0.386 | S plus bas | LLM repete regulierement, maitres en clusters |
| f_tension_density | +0.324 | S plus haut | Maitres tissent des tensions implicites |
| f_rare_word_isolation | -0.322 | S plus bas | Mots rares soutenus par le contexte chez les maitres |
| f_contextual_precision | +0.303 | S plus haut | Mot juste, pas variete de surface |
| f_causal_density | +0.267 | S plus haut | Liens causaux reels, pas juxtaposition |
| f_perception_conflict_rate | +0.225 | S plus haut | Conflits perception/negation |
| f_temporal_anchor_rate | +0.221 | S plus haut | Ancrage temporel precis |
| f_pov_stability | -0.218 | S plus bas | Polyphonie narrative (moins stable = plus riche) |
| f_pov_drift_rate | +0.212 | S plus haut | Glissements de POV credibles |

### Features faibles (a eliminer si besoin)

- f_hapax_contextual_rate : rho = +0.0002 (nul)
- f_referent_orphan_rate : rho = -0.002 (nul)
- f_vocabulary_depth : rho = +0.034 (negligeable)

---

## Resultats : Comparaison des 3 modeles

### Split

- Seed : 42 (identique a V3)
- Train : 399 / Validation : 85 / Holdout : 87
- Total : 571 oeuvres

### Metriques globales

| Modele | Train R2 | Val R2 | Hold R2 | Full Spearman | S-D inversions |
|--------|----------|--------|---------|---------------|----------------|
| **Ridge V3 (baseline)** | 0.2507 | 0.1929 | 0.1865 | 0.5060 | 486/2780 (17.5%) |
| **Ridge V3 + Semantic** | 0.3446 | 0.2859 | 0.1993 | 0.5503 | 315/2780 (11.3%) |
| **Gradient Boosting + All** | 0.7490 | 0.4396 | 0.3260 | 0.7865 | 19/2780 (0.7%) |

### Predictions par tier (full corpus)

| Tier | Cible | V3 Ridge | Ridge+Sem | GB+All |
|------|-------|----------|-----------|--------|
| S | 5.0 | 4.216 | 4.295 | **4.449** |
| A | 4.0 | 4.028 | 3.998 | **4.043** |
| B | 3.0 | 3.849 | 3.835 | **3.601** |
| C | 2.0 | 3.332 | 3.116 | **2.827** |
| D | 1.0 | 3.560 | 3.228 | **2.530** |

**Observation critique** : Seul GB+All produit un ordonnancement S > A > B > C > D correct.
Ridge V3 et Ridge+Sem echouent sur D (surpredit massivement).

---

## Diagnostic cible : Claude Opus vs Flaubert

### LE TEST CENTRAL

| Modele | Flaubert | Claude Opus | Gap | Verdict |
|--------|----------|-------------|-----|---------|
| Ridge V3 | 4.181 | **5.023** | -0.843 | **ECHEC** : Claude > Flaubert |
| Ridge+Sem | 4.188 | **5.014** | -0.826 | **ECHEC** : Claude > Flaubert |
| GB+All | 4.463 | **4.755** | -0.292 | **AMELIORATION** mais Claude > Flaubert |

### Gap reduit de 65% avec GB

- V3 : gap = -0.843
- GB : gap = -0.292
- **Reduction : 65%**

Mais Claude Opus reste au-dessus de Flaubert dans les 3 modeles.

### Diagnostic auteurs complet

| Auteur | V3 | Ridge+S | GB+All | True |
|--------|-----|---------|--------|------|
| Flaubert | 4.181 | 4.188 | 4.463 | 5.0 |
| Proust | 4.779 | 4.467 | 4.648 | 5.0 |
| Hugo | 4.522 | 4.496 | 4.429 | 5.0 |
| Camus | 4.253 | 4.328 | 4.428 | 5.0 |
| Zola | 3.999 | 4.179 | 4.422 | 5.0 |
| Claude Opus | 5.023 | 5.014 | 4.755 | 5.0 |

**Note** : Claude Opus est classe tier S dans le corpus (target=5.0).
Le probleme n'est pas que Claude est surpredit — c'est que Flaubert est sous-predit.
Flaubert a des features structurelles inhabituelles (phrases tres longues, subordination extreme) que le modele peine a recompenser assez.

---

## Features GB : Top 15 importances

| Feature | Importance | Type |
|---------|-----------|------|
| f26b_long_sent_rate | 0.290 | V3 original |
| **f_pov_stability** | 0.058 | **SEMANTIC** |
| ix_variance_x_longrate | 0.056 | V3 interaction |
| f_pov_shift_rate | 0.044 | Depth |
| f29d_ttr_score | 0.042 | V3 suspect |
| **f_causal_density** | 0.038 | **SEMANTIC** |
| f1a_rhythm_variance | 0.036 | V3 original |
| **f_pov_drift_rate** | 0.036 | **SEMANTIC** |
| f19a_approx_entropy | 0.035 | V3 original |
| f_clause_per_sentence | 0.026 | Depth |
| **f_semantic_stagnation** | 0.025 | **SEMANTIC** |
| **f_hapax_contextual_rate** | 0.023 | **SEMANTIC** |
| f1_mean | 0.021 | V3 original |
| **f_pov_rupture_rate** | 0.021 | **SEMANTIC** |
| **f_referent_continuity** | 0.020 | **SEMANTIC** |

**7 des 15 features les plus importantes sont SEMANTIQUES.**

---

## Verdicts

### V3 battu ou non ?

**OUI.** Les 3 metriques principales s'ameliorent :
- R2 holdout : 0.186 -> 0.326 (+75%)
- Spearman full : 0.506 -> 0.787 (+55%)
- S-D inversions : 486 -> 19 (-96%)

### Les nouvelles features apportent-elles un gain reel ?

**OUI, significatif.**
- Ridge+Semantic vs Ridge V3 seul : R2 val +48%, inversions -35%
- 7 features semantiques dans le top 15 GB
- f_pov_stability, f_causal_density, f_pov_drift_rate sont des separateurs authentiques

Mais certaines features sont faibles :
- f_hapax_contextual_rate (rho ~0) — ne separe rien seule, mais utile en interaction
- f_vocabulary_depth (rho 0.034) — negligeable
- f_referent_orphan_rate (rho -0.002) — nulle

### Le non-lineaire apporte-t-il un gain reel ?

**OUI, massif.** C'est le facteur dominant :
- Ridge+Sem holdout R2 = 0.199 vs GB holdout R2 = 0.326 (+64%)
- S-D inversions : 315 -> 19 (-94%)
- Seul modele a produire un ordonnancement S>A>B>C>D correct

Le lineaire est fondamentalement insuffisant pour ce probleme.
Les interactions entre features (longue phrase ET subordination ET tension) ne sont captees que par le non-lineaire.

### Quelle combinaison devient la nouvelle baseline ?

**Gradient Boosting + V3 + Semantic (42 features).**

Parametres optimaux :
- n_estimators : 50
- max_depth : 4
- learning_rate : 0.05
- subsample : 0.8
- min_samples_leaf : 5

### R-6b est-il PASS, FAIL, ou PASS partiel ?

## **VERDICT : PASS PARTIEL**

| Critere | Resultat | Statut |
|---------|----------|--------|
| V3 battu | Oui, sur toutes les metriques | PASS |
| Semantic features utiles | Oui, 7/15 top features | PASS |
| Non-lineaire utile | Oui, gain massif | PASS |
| Ordonnancement S>A>B>C>D | Oui (GB seul) | PASS |
| Claude Opus < Flaubert | Non (gap reduit de 65% mais pas inverse) | **FAIL** |
| Holdout R2 > 0.40 | Non (0.326) | **FAIL** |
| Zero S-D inversions | Non (19/2780 = 0.7%) | **FAIL** (mais 96% reduction) |

**Le Tribunal n'acquitte pas encore Flaubert au-dessus de Claude Opus.**
Mais il reduit le gap de 65% et elimine 96% des inversions S/D.

---

## Prochaines etapes recommandees

1. **Features manquantes** : style indirect libre detecte plus finement (le SIL est la signature Flaubert)
2. **Passage-level scoring** : scorer par passage et non par moyenne d'oeuvre
3. **Calibration** : post-processing pour etirer les predictions vers les cibles
4. **Corpus LLM** : ajouter plus d'exemples Claude Opus pour mieux caracteriser le pattern
5. **Feature engineering** : interactions manuelles f_tension * f_subordination_depth

---

## Fichiers produits

| Fichier | Chemin |
|---------|--------|
| Module TS | packages/sovereign-engine/src/scoring/semantic-depth-features.ts |
| Port Python | omega-autopsie/corpus_r/r6b_semantic_features.py |
| Tribunal Python | omega-autopsie/corpus_r/r6b_tribunal.py |
| Features corpus | omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json |
| Features master | omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES_MASTER.json |
| Comparaison | omega-autopsie/results_phase_r/R6B_MODEL_COMPARISON.json |
| Diagnostic | omega-autopsie/results_phase_r/R6B_DIAGNOSTIC_REPORT.json |

---

```
Architecte: Francky    IA Principal: Claude Code
Standard: NASA-Grade L4 / DO-178C Level A
Phase R-6b: PASS PARTIEL — 2026-03-21
```
