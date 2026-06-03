# Règle de validité — AUC sur centroïdes = LOAO/LOFO obligatoire

**Statut** : RÈGLE MÉTROLOGIE scellée + **amendement doctrinal PROPOSÉ** (ratification Architecte → CLAUDE.md §H / CODEX)
**Date** : 2026-06-03 · **Origine** : V4-G3→V4-G4 (AUC 0.839 full-data → 0.582 LOAO, fuite démasquée)

## Énoncé de la règle
> **Toute AUC (ou accuracy, F1, distance-au-centroïde) calculée à partir de centroïdes de classe DOIT être évaluée en LOAO (leave-one-author-out) ou LOFO (leave-one-family-out). Un centroïde calculé sur l'ensemble complet des données — incluant l'item ou l'auteur testé — est INVALIDE (fuite de données / data leakage) et son score est NUL ET NON AVENU.**

## Mécanisme de la fuite
Si l'item testé (ou un autre livre de son auteur) contribue au centroïde de sa propre classe, le score de similarité est artificiellement gonflé : le modèle « reconnaît » une moyenne qui le contient déjà. L'effet est massif sur petits n / peu d'auteurs.

## Preuve empirique (cas fondateur)
| Mesure | AUC | Méthode |
|---|---|---|
| V4-G3 (optimiste) | 0.839 | centroïdes **full-data** (auteur testé inclus) — INVALIDE |
| V4-G4 (honnête) | **0.582** | centroïdes **LOAO** (auteur testé exclu) — VALIDE |

Écart = +0.257 d'illusion. Sans la règle, OMEGA aurait construit un classifieur genre sur une hallucination statistique.

## Application
- **LOAO** : exclure tous les livres de l'auteur testé du calcul des centroïdes d'entraînement.
- **LOFO** : si des familles/séries existent (ex. SAS, OSS117), exclure la famille entière.
- Couplé obligatoirement à : **bootstrap clusterisé par auteur** (IC95) + **permutation au niveau auteur** (jamais au niveau livre, qui sous-estime la variance).
- S'applique à TOUTE mesure centroïde future (genre, qualité, style, ADN, radar).

## Statut doctrinal
Proposé comme amendement (famille METRIC_HONESTY / TEST_CAUSAL du Total Control Framework EMP-14). **Ratification = Architecte** (Claude ne modifie pas CLAUDE.md §H seul). En attendant, la règle est **active de facto** pour tous les travaux métrologie OMEGA.

## VERDICT
- Statut : RÈGLE active / amendement PROPOSÉ · Confiance : Haute
- Forces : preuve empirique du cas fondateur (0.84→0.58) ; règle simple, vérifiable.
- Faiblesses : LOAO coûte plus cher en compute (recalcul centroïdes par fold) — acceptable.
- Action requise : ratification doctrinale par l'Architecte.
