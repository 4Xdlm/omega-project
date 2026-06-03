# V4-G4 — GEL de la couche GENRE (échec S-1 scellé)

**Statut** : FREEZE (gel) scellé — Tribunal 2/2 IA + Architecte, 2026-06-03 · commit racine `775771f8`
**Standard** : S-1 · **Verdict** : `GENRE_SEPARABILITY_FAIL_S1`

## Énoncé scellé
> La couche genre est bloquée par le **corpus/labels**, pas par le **modèle ni la méthode**.

## Preuve (bge-m3, AUC honnête LOAO)
3 genres ≥5 auteurs, 88 livres / 21 auteurs (corpus FR `lang_detected=fr`, OK). AUC one-vs-rest calculée avec **centroïdes LOAO** (auteur exclu) + bootstrap clusterisé auteur + permutation auteur.

| Métrique | Valeur | Seuil S-1 | Pass |
|---|---|---|---|
| macro-OVR-AUC (LOAO honnête) | 0.582 | ≥0.80 | ✗ |
| IC95 (bootstrap auteur) | [0.34–0.64] | bas ≥0.70 | ✗ |
| permutation p (accuracy) | 0.063 | <0.05 | ✗ |
| AUC par genre | FEELGOOD 0.779 · THRILLER 0.522 · SF 0.445 | — | seul feel-good |

## Pourquoi (mécanisme de l'échec)
1. **Fuite démasquée** : V4-G3 affichait AUC 0.839 — calculée sur **centroïdes full-data (l'auteur testé contribuait à son propre centroïde)**. En LOAO honnête, le signal s'effondre à **0.582**. Le « prometteur » de G3 était un artefact statistique.
2. **Corpus épuisé** : la sélection plafonne à 88 livres ; un KB auteur→genre élargi n'a ajouté que 3 livres. Les auteurs FR de genre célèbres sont déjà tous inclus. Impossible de scaler le n.
3. **Seul FEELGOOD séparable** (0.78) : champ lexical émotionnel très balisé. THRILLER/SF indistinguables par embedding à ce volume (overfitting / sous-échantillonnage par genre).

## Décision (interdits)
- ❌ Pas de **genre gate**.
- ❌ Pas de **percentile intra-genre**.
- ❌ Pas de **routeur genre**.
- ❌ Pas de **SEAL**, pas de **production gate**.
- ✅ `GenreRelativeQuality` reste **validé architecturalement** (concept) mais `GenreClassifier` est **NON validé empiriquement** → HOLD.

## Condition de relance
Relance uniquement après acquisition d'un **corpus genre-tagué élargi** (cf [V4_GENRE_CORPUS_REQUIREMENTS.md](V4_GENRE_CORPUS_REQUIREMENTS.md)). Sans cela, on mesure l'auteur ou la source, pas le genre.

## VERDICT
- Statut : FAIL S-1 (scellé) · Confiance : Haute
- Forces : AUC LOAO honnête a démasqué la fuite de G3 ; bootstrap+permutation ; covariables vérifiées.
- Faiblesses : n=88 corpus-limité ; 1 seul genre (feel-good) séparable.
- Action requise : geler. Relance conditionnée au corpus élargi.
