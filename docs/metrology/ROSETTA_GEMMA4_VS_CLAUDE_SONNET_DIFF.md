# Rosetta — diff gemma4 vs claude-sonnet (preuve EMP-19)

**Date** : 2026-06-04. Source : `ROSETTA_GEMMA4_VS_CLAUDE_DIFF.json`. But : montrer que chaque LLM a sa propre physique de pilotage → on ne transfère pas un profil.

## Couverture
- **claude-sonnet-4** : 19 features benchées (run 2026-03-20, 370 tests).
- **gemma4:31b** : 8 features benchées (run 2026-06-04, 370 tests).
- **8 communes** ; **11 features uniquement claude** (f1_mean, f1b_rhythm, f5a_verb, f5c_action, f9a_contradiction, f21c_diacope, f26b_long_sent, f27d_modal, f28d_sil, f38c_speed, semicolon) → **NON calibrées pour gemma4** = inconnues (à bencher si besoin, ne pas réutiliser la valeur claude).

## Features communes (8)
| Feature | gemma4 | claude-sonnet | Verdict |
|---|---|---|---|
| f24e_contrast | SOLIDE (1.0) | SOLIDE | concordant |
| f15b_compression | SOLIDE (1.0) | SOLIDE | concordant |
| f16a_bigram_rarity | SOLIDE (1.0) | SOLIDE | concordant |
| f29d_ttr | SOLIDE (0.8) | SOLIDE | concordant |
| f35c_hook | SOLIDE (pilot 0) | SOLIDE | concordant (mais pilot 0 gemma) |
| f36c_cliff | SOLIDE (pilot 0) | SOLIDE | concordant (pilot 0 gemma) |
| f17_knife | ILLUSION | ILLUSION | concordant (illusion sur les 2) |
| **f25g_description** | **PROMETTEUSE** | **SOLIDE** | **DIVERGENT** |

## Divergence clé
**f25g_description_score** : SOLIDE chez claude-sonnet, rétrogradé **PROMETTEUSE** chez gemma4. → claude pilote la densité descriptive de façon fiable ; gemma4 ne la pilote pas de manière robuste. **Utiliser le profil claude pour gemma sur cette feature serait une erreur de pilotage** (on prescrirait une instruction que gemma ne sait pas suivre). C'est exactement la justification empirique d'EMP-19.

## Conséquence
- Les 4 leviers actifs gemma4 (contraste, compression, rareté, TTR) sont **concordants** avec claude → bonne nouvelle, ces axes structurels/lexicaux sont robustes cross-modèle.
- Mais f25g diverge et 11 features claude sont hors-couverture gemma → le bridge **doit** dispatcher par modèle (DEC-021), jamais réutiliser un profil étranger.

## VERDICT
- Statut : PASS — divergence documentée, dispatch model-aware justifié empiriquement.
- f17 interdit (illusion) sur les deux modèles ; f25g advisory seulement pour gemma4.
