# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PHASE R — REFONDATION MÉTROLOGIQUE
# DOSSIER COMPLET DE LA NUIT DE GUERRE
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date         : 2026-03-21
# Durée        : ~8h de travail continu
# Architecte   : Francky
# IA Principal : Claude (Opus)
# Exécutant    : Claude Code
# Consultants  : ChatGPT, Gemini, Grok
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# 1. CE QUI A ÉTÉ ACCOMPLI CETTE NUIT

## R-1 : Extraction du corpus ✅
- 571 œuvres extraites (220 epub + 151 pdf + 200 gutenberg)
- 67,138,760 mots
- Commit d3d6211a

## R-2 : Classification en tiers ✅
- V1 → V2 → V3 : de 335 "?" à ZÉRO
- S=278, A=91, B=101, C=91, D=10
- Commit inclus dans R-3

## R-3 : Mesure massive ✅
- 571 œuvres × 49 features
- CORPUS_FEATURES_MASTER.json (952 KB)
- Commit e76a6c66

## R-4 : Audit des features ✅ — RÉSULTAT CRITIQUE
- 72 features analysées
- 4 discriminantes (dont 3 artefacts, 1 vraie : f28b_irony ρ=0.49)
- 15 TROMPEUSES (f17_knife, f29d_ttr, f35c_hook, f36c_cliff, etc.)
- 10 non-linéaires (les VRAIES discriminantes : f26b ×9.5, f1a ×2.0, f1_mean ×1.85)
- 43 neutres
- Commit 9b2dd2b9

## R-5 V2 : Premier scorer ✅ — FAIL
- R² = 0.22, 32% inversions
- Claude Opus à 90.0 (manipulation)
- knife_excess mal calibré
- Commit 5566cb84

## R-5bis : Features de profondeur ✅ — PASS MASSIF
- 5 nouvelles features, 2 TRÈS discriminantes :
  - f_pov_shift_rate : Flaubert 0.36 vs Riviera 0.10 (×3.6)
  - f_subordination_depth : Flaubert 0.83 vs Riviera 0.19 (×4.4)
- Commit 45b732dc

## R-6 : Scorer V3 Ridge ✅ — PASS DIRECTION / FAIL SÉPARATION
- Spearman 0.52 holdout (> 0.5 ✅)
- R² = 0.16 holdout (< 0.40 ✗)
- Flaubert 5.86, Proust 6.08 (correct)
- MAIS Claude Opus 6.82 > Flaubert (inversion ✗)
- Riviera 4.49, Gemini 4.88 (correct)
- Conclusion : le modèle LINÉAIRE a atteint sa limite
- Commit 363203aa

## Recherche académique ✅
- Grille Vaezi & Rezaei (9 éléments d'évaluation de la fiction)
- Méthode Flaubert (critique génétique, BnF, OpenEdition)
- Processus Nobel/Goncourt/Booker
- Dossier complet : docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md

---

# 2. LES VÉRITÉS ÉTABLIES

## A. Ce que le scorer V1 (R6) faisait de faux
- Mesurait la CONFORMITÉ au centre, pas la qualité
- Récompensait ce que les LLM font naturellement (phrases courtes, TTR élevé)
- Pénalisait ce que les génies font (phrases longues, ironie, subordination)
- GPT 5.4 scorait 61.56 vs Flaubert 50.52

## B. Les features qui SÉPARENT le génie du LLM

### Rang 1 — Les tueurs (ratio > 3.0)
| Feature | Flaubert | LLM | Ratio |
|---------|----------|-----|-------|
| f26b_long_sent_rate | 0.123 | 0.013 | ×9.5 |
| f28b_irony_density | 0.120 | 0.026 | ×4.6 |
| f_subordination_depth | 0.83 | 0.19 | ×4.4 |
| f_pov_shift_rate | 0.36 | 0.10 | ×3.6 |

### Rang 2 — Les séparateurs (ratio > 1.5)
| Feature | Tier S | Tier C | Ratio |
|---------|--------|--------|-------|
| f27a_epistemic_rate | 11.47 | 4.74 | ×2.4 |
| f27c_negation_rate | 3.73 | 1.61 | ×2.3 |
| f26c_period_score | 0.134 | 0.058 | ×2.3 |
| f9a_contradiction | 0.982 | 0.467 | ×2.1 |
| f1a_rhythm_variance | 16.68 | 8.30 | ×2.0 |
| f1_mean | 23.18 | 12.51 | ×1.85 |

### Les TROMPEUSES (LLM > classiques)
| Feature | Tier S | Tier C | Direction |
|---------|--------|--------|-----------|
| f17_knife_count | 6.17 | 10.96 | C > S |
| f29d_ttr_score | 0.710 | 0.726 | C > S |
| f35c_hook_score | 0.531 | 0.649 | C > S |
| f36c_cliff_score | 0.631 | 0.667 | C > S |
| f24e_contrast_score | 0.876 | 0.902 | C > S |

## C. Ce que les académies jugent (convergence 4 IAs + web)
1. Qualité de langue / style
2. Originalité / singularité
3. Profondeur de réflexion
4. Tenue du monde / cohérence
5. Voix narrative
6. Caractérisation
7. Structure / architecture
8. Portée humaine

## D. La technique de Flaubert est mathématisable
- f_pov_shift = Style Indirect Libre
- f_subordination_depth = Emboîtement syntaxique
- f1a_rhythm_variance = Le Gueuloir
- f26b_long_sent_rate = Le Souffle maîtrisé
- f28b_irony = L'impersonnalité
- 7 techniques sur 8 captées par nos features

---

# 3. LE PROBLÈME RESTANT

Un modèle LINÉAIRE ne suffit pas. Claude Opus imite assez bien les structures
syntaxiques (f_subordination, f_clause_per_sentence) pour tromper la régression.
Il faut soit :
- Des features SÉMANTIQUES (cohérence narrative, originalité contextuelle)
- Un modèle NON-LINÉAIRE (random forest, gradient boosting)
- Des features de CONSTRUCTION (méthode Flaubert mathématisée)

La direction de Francky est claire : on arrête de mesurer des ingrédients
isolés, on mathématise la MÉTHODE de construction.

---

# 4. ÉTAT TECHNIQUE

| Attribut | Valeur |
|----------|--------|
| Branche | phase-r-metrology-rebuild |
| Dernier commit | 363203aa (R-6 scorer V3) |
| Tests sovereign-engine | 1859 GREEN (scorer V1 gelé) |
| Scorer V1 (R6) | GELÉ — invalide |
| Scorer V2 | GELÉ — R²=0.22, 32% inversions |
| Scorer V3 | EN TEST — Spearman 0.52, mais Opus > Flaubert |
| Corpus | 571 œuvres classées, 67M mots |
| Features | 72 existantes + 5 R-5bis (depth) |

---

# 5. FICHIERS CLÉS PRODUITS CETTE NUIT

| Fichier | Contenu |
|---------|---------|
| docs/OMEGA_PHASE_R_PLAN.md | Plan complet Phase R |
| docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md | Dossier recherche académique |
| docs/OMEGA_PHASE_R_PROMPT_CLAUDE_CODE.md | Prompts R-1/R-2 |
| omega-autopsie/corpus_r/txt/ | 571 textes .txt |
| omega-autopsie/corpus_r/CORPUS_TIERS_V3.json | Classification complète |
| omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json | Features 571 œuvres |
| omega-autopsie/results_phase_r/R4_FEATURE_AUDIT_REPORT.md | Audit R-4 |
| omega-autopsie/results_phase_r/R5B_DEPTH_FEATURES_DIAGNOSTIC.json | R-5bis |
| packages/sovereign-engine/src/scoring/depth-features.ts | Nouvelles features |
| packages/sovereign-engine/src/scoring/multi-stage-scorer-v2.ts | V2 (gelé) |

---

# 6. PROCHAINES ÉTAPES

## PRIORITÉ 1 : Mathématiser la méthode Flaubert
- Pas mesurer des features isolées
- Construire des features de RELATION et de CONSTRUCTION
- Pipeline en couches (F0→F9) inspiré de la critique génétique

## PRIORITÉ 2 : Modèle non-linéaire
- Random forest ou gradient boosting sur les features existantes
- Tester si les INTERACTIONS (subordination × longueur × contraste)
  séparent mieux qu'un modèle linéaire

## PRIORITÉ 3 : Features sémantiques
- Densité informationnelle (ratio mots pleins / mots outils)
- Cohérence narrative macro
- Originalité lexicale contextuelle (le "mot juste" ≠ TTR)
- Divergence de registre inter-paragraphe

## PRIORITÉ 4 : Validation croisée élargie
- Plus d'échantillons Tier D (10 insuffisant)
- Identifier les PG Gutenberg classés "B par défaut"
- Fenêtres de 1000 et 2000 mots en plus de 500

---

# 7. MESSAGE DE REDÉMARRAGE

```
OMEGA SESSION — PHASE R (REFONDATION MÉTROLOGIQUE) — Suite

HEAD : 363203aa (phase-r-metrology-rebuild)
Tests : 1859 GREEN (scorer v1 gelé)

CONTEXTE :
  R-1 à R-6 exécutés en une nuit.
  571 œuvres, 72+5 features, 3 versions de scorer testées.
  
  V3 (Ridge) : Spearman 0.52 mais Claude Opus > Flaubert.
  Le modèle LINÉAIRE a atteint sa limite.
  
  R-5bis PASS : f_pov_shift (×3.6) et f_subordination_depth (×4.4)
  sont les features les plus discriminantes jamais trouvées.

DIRECTION FRANCKY :
  "On arrête d'essayer d'écrire, on construit le texte
  comme Flaubert le faisait et on le mathématise."

  Trois axes :
  1. Features de CONSTRUCTION (pas d'ingrédients isolés)
  2. Modèle NON-LINÉAIRE (random forest / XGBoost)
  3. Features SÉMANTIQUES (densité, cohérence, mot juste)

DOCUMENTS À LIRE :
  docs/OMEGA_PHYSIQUE_LITTERAIRE_v3.md (dossier recherche)
  results_phase_r/R4_FEATURE_AUDIT_REPORT.md
  results_phase_r/R5B_DEPTH_FEATURES_DIAGNOSTIC.json

Architecte Suprême : Francky
IA Principal : Claude
```

---

*SESSION_SAVE — Nuit de guerre Phase R*
*571 œuvres. 77 features. 3 scorers. 1 vérité : le génie est mesurable.*
*"On ne mesure plus la banalité. On mathématise la maîtrise."*
