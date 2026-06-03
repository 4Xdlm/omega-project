# S1D — VERDICT MESURE GÉOMÉTRIQUE (embeddings nomic)

**Date** : 2026-06-02 · **Auteur** : Claude Code · **Gold-Set** : v4 scellé (seal 4388b4b6, durci S1C+)
**Méthode** : embeddings `nomic-embed-text` (local), distance aux centroïdes, **K-fold PAR AUTEUR** (anti-fuite), AUC + IC95 bootstrap clusterisé par auteur + test de permutation 1000×. Fenêtre 1500 mots (cap nomic, quelques textes tronqués plus court sur retry 500).

## Résultats
| Contraste | n | AUC | IC95 (boot/auteur) | perm p |
|---|---|---|---|---|
| MASTER_NATIVE_FR vs D_SOURCE_REAL_FR | 30/30 | **0.840** | [0.55, 0.91] | **0.001** |
| MASTER_NATIVE_FR vs C_FORMULAIC_FR | 30/30 | **0.821** | [0.56, 0.92] | **0.001** |
| MASTER_NATIVE_EN vs C_FORMULAIC_EN | 30/30 | **0.860** | [0.63, 0.96] | **0.001** |

## Interprétation (honnête)
- **Signal RÉEL** : permutation p=0.001 sur les 3 contrastes → la séparation maître/bas n'est PAS due au hasard, **avec auteurs tenus hors échantillon** (le modèle ne reconnaît pas juste l'auteur).
- **FR ROBUSTE** : 0.82-0.84 en français — le pivot géométrique **ne s'effondre pas en FR** (contrairement à euphony legacy 0.59). C'est le point clé : une mesure FR non-circulaire et bon marché existe.
- **Comparable au juge LLM** : niveau AUC ≈ R5-large (juge pairwise FR 0.78-0.81 ; absolu ~0.85), mais ici **non-circulaire** (géométrie, pas auto-jugement LLM) et **~gratuit**.
- **Granularité limitée** : S-vs-D (0.84) ≈ S-vs-C (0.82) → la géométrie capte « maître vs non-maître » plus que la nuance pulp/genre.

## Limite bloquante (norme S-1)
- **Borne basse IC95 = 0.55-0.63 < 0.70** → critère PASS strict (borne basse ≥0.70) **NON atteint**. Cause : n=16-18 auteurs/cellule trop faible → bootstrap-par-auteur large. Le point AUC est bon, l'incertitude est grande.
- **Statut** : `SIGNAL_RÉEL_PROMETTEUR`, PAS `PROUVÉ_SEAL`. Pour passer : augmenter n (≥30-40 auteurs/cellule), donc étendre le Gold-Set (vers le full corpus) — rejoint le rail 5.
- Caveats techniques : troncature nomic (~2048 tokens) ; quelques textes embeddés plus courts (retry après 500) ; 1 modèle d'embedding seulement (challenger bge-m3 non testé).

## Suite
1. **Choc des titans** : comparer au juge LLM (`qwen3:32b` pairwise + `gemma4:31b` indépendant) sur le MÊME Gold-Set → GATE FORK géométrique vs juge.
2. **Resserrer l'IC** : étendre n (plus d'auteurs/cellule) — lien rail 5 full-corpus.
3. Challenger embedding FR (`bge-m3`) pour confirmer/améliorer.

## VERDICT
- **Statut** : S1D-embed = **signal réel prouvé (p=0.001) mais effet à IC large (n faible)** — PROMETTEUR, non scellé.
- **Confiance** : Moyenne-Haute sur l'existence du signal ; Basse sur la précision de l'effet (IC large).
- **Forces** : non-circulaire ; FR robuste ; K-fold par auteur ; permutation significative ; quasi gratuit.
- **Faiblesses** : IC95 borne basse < 0.70 (n trop petit) ; granularité grossière (S≈D≈C) ; 1 seul embedder ; troncature.
- **Action** : juge LLM comparatif (FORK) + expansion n. Décision pivot géométrique réservée Architecte après le comparatif juge.
