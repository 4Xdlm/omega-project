# SESSION SAVE — Phase R-6b Tribunal de Contrefacon

**Date**: 2026-03-21
**Branche**: phase-r-metrology-rebuild
**Duree**: ~1 session
**Operateur IA**: Claude Code (Opus 4.6)

---

## Travail accompli

### 1. Module semantic-depth-features.ts
- 21 features dans 8 familles
- Port Python identique pour batch measurement
- 571 oeuvres mesurees (5 passages x 500 mots chacune)

### 2. Mesure corpus
- R6B_SEMANTIC_FEATURES.json : 571 entrees, features moyennees
- R6B_SEMANTIC_FEATURES_MASTER.json : 571 entrees, detail par passage

### 3. Comparaison 3 modeles
- Ridge V3 baseline (20 features, lambda=0.01)
- Ridge V3 + Semantic (42 features, lambda=0.01)
- Gradient Boosting (42 features, n_est=50, depth=4, lr=0.05)

### 4. Resultats cles

| Modele | Hold R2 | Full Spearman | S-D inv | Claude-Flaubert gap |
|--------|---------|---------------|---------|---------------------|
| Ridge V3 | 0.186 | 0.506 | 486 | -0.843 |
| Ridge+Sem | 0.199 | 0.550 | 315 | -0.826 |
| **GB+All** | **0.326** | **0.787** | **19** | **-0.292** |

### 5. Verdict
**PASS PARTIEL** : GB bat massivement V3, semantic features utiles, mais Claude Opus reste au-dessus de Flaubert.

---

## Decisions prises
- sklearn installe pour Gradient Boosting (pas de GB manuel)
- Split identique a V3 (seed=42, 70/15/15)
- Grid search GB : 27 combinaisons testees
- Grid search Ridge lambda : 11 valeurs testees

## Fichiers crees
- packages/sovereign-engine/src/scoring/semantic-depth-features.ts
- omega-autopsie/corpus_r/r6b_semantic_features.py
- omega-autopsie/corpus_r/r6b_tribunal.py
- omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json
- omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES_MASTER.json
- omega-autopsie/results_phase_r/R6B_MODEL_COMPARISON.json
- omega-autopsie/results_phase_r/R6B_DIAGNOSTIC_REPORT.json
- docs/OMEGA_PHASE_R_R6B_TRIBUNAL_DE_CONTREFACON.md
- docs/SESSION_SAVE_R6B.md

## Etat du repo
- Pas de commit effectue (en attente d'approbation)
- Aucun fichier FROZEN touche
- Aucun appel API effectue

## Point de reprise
- Si PASS PARTIEL insuffisant : travailler le SIL (style indirect libre) comme feature Flaubert-specifique
- Si passage au scoring par passage (et non par oeuvre) : le corpus existe deja en per-passage dans R6B_SEMANTIC_FEATURES_MASTER.json
