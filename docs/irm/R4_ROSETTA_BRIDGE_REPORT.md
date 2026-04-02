# Rosetta Bridge — Rapport d'Intégration
**Date** : 2026-04-02 | **Standard** : NASA-Grade L4 / DO-178C Level A

---

## Architecture
```
src/coupling/
  ├── rosetta-bridge.ts     ← Module principal (RosettaBridge class)
  ├── types.ts              ← Types (FeatureRoute, FeatureDirective, etc.)
  └── index.ts              ← Exports publics
src/scoring/data/
  └── ROSETTA_BRIDGE_MATRIX.json  ← Matrice de classification (19 features)
tests/coupling/
  └── rosetta-bridge.test.ts  ← 9 tests
```

## Statistiques de la matrice
| Catégorie | Nombre | Route | Action |
|-----------|--------|-------|--------|
| PILOTABLE | 7 | PROMPT_DIRECT | Injecter dans prompt V4/V5 |
| ILLUSION | 7 | SHADOW | Ne PAS injecter (LLM ne contrôle pas) |
| INDIRECT | 3 | INDIRECT_VIA_L37 / SHADOW | Piloter indirectement |
| IRREDUCTIBLE | 1 | IRREDUCTIBLE | Attracteur BB — ignorer |
| CONTOURNABLE | 1 | POST_PROCESSING | Post-processing uniquement |
| **Total** | **19** | | |

## Features PILOTABLE (par compliance_rate)
1. f24e_contrast_score (100%) — Contraste narratif
2. f15b_redundancy_compression (100%) — Compression redondance
3. f16a_bigram_rarity (100%) — Rareté bigrammes
4. f29d_ttr_score (80%) — Richesse lexicale (TTR)
5. f25g_description_score (0%) — Score description (SOLIDE mais taux 0)
6. f35c_hook_score (0%) — Score accroche (SOLIDE mais taux 0)
7. f36c_cliff_score (0%) — Score suspense (SOLIDE mais taux 0)

## Features ILLUSION (ne PAS injecter dans le prompt)
- f17_knife_count — LLM déclare comprendre mais delta = 0
- f1_mean — Divergent LLM vs classique (ratio ~2.5)
- f28d_sil_score — Divergent
- f27d_modal_score — Divergent
- f1b_rhythm_ratio — Divergent
- f5c_action_verb_ratio — Divergent
- f9a_contradiction_rate — Divergent

## Comment l'utiliser dans le pipeline
Le Rosetta Bridge ne modifie PAS engine.ts.
Il est prévu pour être appelé par le futur prompt-assembler-v5 :
1. ForgePacket → extraire les target_features (calibrated via scorer V1)
2. RosettaBridge.translate(targets) → directives calibrées
3. prompt-assembler-v5 injecte les directives PILOTABLE dans le prompt
4. Les features ILLUSION sont ignorées (mesure shadow seulement)
5. Les features CONTOURNABLE sont routées vers post-processing

## Prochaine étape
Le bridge est en mode **SHADOW** : il produit des directives mais ne les injecte pas encore.
L'injection sera activée quand prompt-assembler-v5 sera prêt (Phase P2-03).

## Part A — V1 Normalized Validation

V1 multi-stage scorer avec normalisation R1 (P10/P90 Gaussian) :
- **Spearman vs tiers = -0.05** (p=0.59) — NON significatif
- **GB V1 vs tiers = +0.04** (p=0.66) — NON significatif
- **ROOT CAUSE** : corpus déséquilibré (100S/37A/7C/0B/0D)
- **VERDICT** : INVALID pour ranking de tiers. Corpus trop skewed.
- GB V1 reste seule autorité CALC pour microbench.
- R5 nécessite corpus balancé (S/A/B/C/D égaux).

---

*"Ce qui n'est pas mesuré n'est pas acceptable."*
