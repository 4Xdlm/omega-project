# OMEGA — Opération Rosetta: Table de Rosette LLM ↔ Classiques
**Date**: 2026-03-20
**Branch**: phase-w-mixer
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## 1. Résumé exécutif

L'Opération Rosetta construit un pont entre les styles littéraires tels que mesurés sur le corpus classique (181 oeuvres, R2) et tels que produits par le LLM (claude-sonnet-4-20250514). L'infrastructure complète est prête : un orchestrateur autonome (8 phases) interroge le LLM, produit 7 styles × 600 mots, mesure 49 features, compare aux profils classiques R2, construit une matrice de confusion, et teste l'amélioration dirigée.

**Status**: Infrastructure PRÊTE. Exécution API requiert une clé Anthropic valide.

## 2. Infrastructure livrée

### Scripts
| Script | Rôle | API requis |
|--------|------|-----------|
| `rosetta-orchestrator.ts` | Pipeline complet 8 phases | OUI |
| `rosetta-measure.ts` | Mesure seule (Phases 3-5, 7) | NON |

### Phases et dépendances

| Phase | Description | API | Status |
|-------|-------------|-----|--------|
| 1 | Interrogation sémantique (7 styles) | OUI | Prêt |
| 2 | Production contrôlée (7 × 600 mots) | OUI | Prêt |
| 3 | Mesure 49 features | NON | Prêt |
| 4 | Profils classiques R2 | NON | **FAIT** (04_profiles_classiques.json) |
| 5 | Table de Rosette (ratios LLM/classique) | NON | Prêt (après Phase 2) |
| 6 | Interrogation croisée | OUI | Prêt |
| 7 | Matrice de confusion + Dictionnaire | NON | Prêt (après Phase 2) |
| 8 | Tests d'amélioration (3 rewrites) | OUI | Prêt |
| Bonus | Test Flaubert | OUI (1 rewrite) | Prêt |

## 3. Profils classiques R2 extraits (Phase 4)

| Type | Windows | % corpus | f1_mean | f5a_verb | f25g_desc | f28d_sil | f38c_speed |
|------|---------|----------|---------|----------|-----------|----------|------------|
| ACTION | 307 | 3.4% | 8.45 | 0.212 | 0.293 | 0.020 | 0.369 |
| DESCRIPTION | 6552 | 71.7% | 13.38 | 0.082 | 0.518 | 0.029 | 0.293 |
| DIALOGUE | 90 | 1.0% | 7.03 | 0.183 | 0.262 | 0.031 | 0.401 |
| INTROSPECTION | 826 | 9.0% | 16.11 | 0.070 | 0.533 | 0.044 | 0.264 |
| TRANSITION | 1366 | 14.9% | 14.41 | 0.078 | 0.527 | 0.029 | 0.282 |

Observations clés :
- ACTION : phrases courtes (8.45), haute densité verbale (0.212), description faible
- INTROSPECTION : phrases longues (16.11), basse densité verbale (0.070), SIL élevé (0.044)
- DESCRIPTION : phrases moyennes (13.38), richesse sensorielle (0.518)
- La frontière DESCRIPTION/TRANSITION est fine (1 pt de f1_mean, scores très proches)

## 4. Méthodologie de comparaison (Phases 5, 7)

### Ratio LLM/Classique
```
ratio = μ(feature, type, LLM) / μ(feature, type, R2_classique)
```
- 0.80-1.20 : ALIGNED
- 0.50-0.80 ou 1.20-2.00 : DECALE
- < 0.50 ou > 2.00 : DIVERGENT

### Matrice de confusion
Distance euclidienne normalisée sur 17 features clés entre chaque style LLM produit et les 5 profils R2. Le type classique le plus proche = ce que le LLM produit RÉELLEMENT.

## 5. Tests d'amélioration (Phase 8)

3 rewrites ciblés :
- DESCRIPTION → pousser f1_mean (longueur de phrase)
- INTROSPECTION → pousser f28d_sil_score (style indirect libre)
- CONTEMPLATION → pousser f25g_description_score (richesse sensorielle)

Chaque réécriture mesurée et comparée à l'original.

## 6. Commande d'exécution

```powershell
# Exécution complète (8 phases, ~15 API calls, ~5 min)
$env:ANTHROPIC_API_KEY = "sk-ant-..."
cd packages/sovereign-engine
npx tsx scripts/rosetta-orchestrator.ts

# Mesure seule (si les proses sont déjà générées)
npx tsx scripts/rosetta-measure.ts
```

## 7. Livrables produits

| Fichier | Phase | Status |
|---------|-------|--------|
| 01_definitions_llm.json | 1 | Après API |
| 02_prose_*.txt (×7) | 2 | Après API |
| 03_features_llm.json | 3 | Après Phase 2 |
| 04_profiles_classiques.json | 4 | **FAIT** |
| 05_table_rosette.json | 5 | Après Phase 2 |
| 06_interrogation_croisee.json | 6 | Après API |
| 07_confusion_matrix.json | 7 | Après Phase 2 |
| 08_dictionnaire_omega_llm_v1.json | 7 | Après Phase 2 |
| 09_amelioration_tests.json | 8 | Après API |
| 10_test_flaubert.json | Bonus | Après API |

## 8. Recommandations pour le PROFILEUR V1

1. **Les ratios LLM/classique** deviennent des facteurs de correction dans le scorer
2. **Le dictionnaire OMEGA↔LLM** alimente les prompts du Scribe
3. **La matrice de confusion** guide le choix des type_modifiers à réactiver
4. **Les tests d'amélioration** prouvent si le LLM peut être dirigé par feature

```
Architect: Francky          IA Principal: Claude Code
Standard:  NASA-Grade L4 / DO-178C Level A
```
