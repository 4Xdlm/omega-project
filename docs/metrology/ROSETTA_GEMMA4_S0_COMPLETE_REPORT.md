# Rosetta S0 gemma4 — calibration COMPLÈTE (cap-400)

**Date** : 2026-06-04 · **Commit run** : `7f090d5d` · **Modèle** : gemma4:31b (générateur local OMEGA) · **Standard** : EMP-19.
**Run** : `scripts/rosetta-s0-ollama.ts` (adaptateur Anthropic→Ollama), 370 tests réels, 8 phases, ~3h30, RAM stable (zéro fuite).

## Résultat : carte de pilotabilité gemma4 (s06_classification)
8 features benchées. Catégorisation par la pipeline Rosetta (variantes A/B/C contradictoires) :

| Feature | Catégorie | Pilotabilité | Levier OMEGA |
|---|---|---|---|
| f24e_contrast_score | SOLIDE | **1.0** | **A — actif** |
| f15b_redundancy_compression | SOLIDE | **1.0** | **A — actif** |
| f16a_bigram_rarity | SOLIDE | **1.0** | **A — actif** |
| f29d_ttr_score | SOLIDE | **0.8** | **A — actif** |
| f25g_description_score | PROMETTEUSE | 0 | B — advisory |
| f35c_hook_score | SOLIDE | 0 | C — inactif (pilot 0) |
| f36c_cliff_score | SOLIDE | 0 | C — inactif (pilot 0) |
| **f17_knife_count** | **ILLUSION_DÉCLARATIVE** | 0 | **C — INTERDIT** |

## Lecture
- **4 leviers fiables (A)** pour gemma4 : contraste syntaxique, anti-redondance/compression, rareté des bigrammes, richesse lexicale (TTR). gemma4 les pilote à 0.8–1.0 → instructions de forge fiables.
- **f17_knife_count = illusion déclarative** : gemma *prétend* ajouter des « mots percutants » mais ne déplace pas la métrique → **interdit comme levier de forge** (Principe P6 « le LLM ne se connaît pas »). Loi confirmée empiriquement : un LLM est un moteur probabiliste, pas une calculatrice de motifs.
- **f35c/f36c (hook/cliff)** : SOLIDE en mesure mais pilotabilité 0 dans le bench contradictoire → inactifs comme leviers (instruction vide).
- Instructions gagnantes gemma4 = **variantes métriques C** (ex. f15b : « aucun bigramme >2 fois », f16a : « >90% bigrammes uniques », f24e : « plus longue phrase 3× la plus courte »). gemma répond aux contraintes structurelles chiffrées, pas aux injonctions vagues.

## Conséquence architecturale
Bridge régénéré model-aware (DEC-20260604-021) : `ROSETTA_BRIDGE_MATRIX_GEMMA4.json` (4 leviers actifs), dispatch `ROSETTA_BRIDGE_MATRIX_BY_MODEL.json` (gemma4 / claude-sonnet / unknown→CALIBRATION_REQUIRED). Le profil claude-sonnet n'est **plus** utilisé pour gemma4.

## VERDICT
- Statut : PASS — calibration gemma4 complète, EMP-19 génération **fermé**.
- Forces : 370 tests réels, 8 phases, RAM stable ; carte de pilotage du générateur de prod réel ; illusion f17 démasquée.
- Faiblesses : (1) 8 features benchées seulement (claude en avait 19 — 11 features gemma non calibrées → inconnues, à benncher si besoin) ; (2) hook/cliff non pilotables (pilot 0) ; (3) S0.4/S0.5 (contournables/micro-chirurgie) partielles.
- Artefacts : `rosetta_gemma4-31b_v1.json`, `ROSETTA_BRIDGE_MATRIX_GEMMA4.json`, `..._BY_MODEL.json`, `..._VS_CLAUDE_DIFF.json`.
