# V4-G3 — Genre : test powered 3-classes, multi-espaces (nomic vs bge-m3)

**Date** : 2026-06-03 · **Branche** : phase-r-dispatcher-v33 · **Standard** : S-1
**Suite de** : V4-G0/G1 (`GENRE_SEPARABILITY_UNPROVEN` au pilote n=16). Ici : test dimensionné + comparaison d'espaces.

---

## Design
- **3 genres propres**, chacun ≥5 auteurs (LOAO-valides) : THRILLER (8 auteurs/31 livres), SF_FANTASY (5/24), FEELGOOD (7/30). Total **85 livres, 20 auteurs**.
- **SPY (2 auteurs) et HISTORICAL (1 auteur Jacq) EXCLUS** : sous-puissants, confondraient auteur=genre.
- Corpus = `lang_detected=fr`, `status=OK` (extraction complète, pas seulement Gold-Set). **Langue FIXÉE (fr)**.
- Labels = KB auteur→genre d'auteurs FR publiés célèbres (genre = catégorie définitoire = fait).
- Idiosyncrasie d'auteur contrôlée par **leave-ONE-AUTHOR-out** ; **permutation au niveau auteur** (2000).
- **DEUX espaces comparés sur les MÊMES livres** : `nomic-embed-text` vs `bge-m3`. Teste l'hypothèse :
  le genre est-il inséparable, ou simplement dans le mauvais espace de features ?

## Résultats

| Métrique | nomic-embed-text | bge-m3 |
|---|---|---|
| LOAO accuracy (hasard 0.333) | 0.353 | **0.447** |
| macro-F1 | 0.316 | **0.449** |
| **permutation p (auteur, honnête)** | **0.297** | **0.078** |
| AUC one-vs-rest (centroïdes full-data, optimiste) | 0.680 | **0.839** |
| Δcosine intra−inter (inter-auteurs) | +0.004 | **+0.015** |
| SF_FANTASY correctement classé | 2/24 | **9/24** |
| FEELGOOD F1 | 0.49 | 0.52 |

## Lecture

1. **nomic n'encode PAS le genre** : accuracy ≈ hasard, permutation p=0.30, Δcos ≈ 0. Le SF est massacré (2/24 corrects, 16 pris pour du thriller). → confirme le pilote G1.
2. **bge-m3 sépare BIEN mieux le genre** : accuracy nettement > hasard, macro-F1 +42 %, AUC OVR 0.84 (dépasse la cible S-1 ≥0.80), Δcos ×3.5, SF redressé (9/24). 
3. **MAIS la permutation LOAO honnête reste à p=0.078 — sous le seuil 0.05.** L'AUC 0.84 est partiellement optimiste (centroïdes calculés sur données complètes, incluant l'auteur testé) ; la métrique honnête (permutation LOAO, qui exclut l'auteur testé) dit **« proche mais pas franchi »** à n=85/20 auteurs.

### Verdict : `GENRE_SEPARABILITY_PROMISING_ON_BGE_M3` — hypothèse « mauvais espace » CONFIRMÉE, pas encore S-1-prouvé
Le test dimensionné a **répondu à la question ouverte de G1** : la faiblesse du pilote venait **majoritairement de l'espace de features (nomic), pas seulement du n**. bge-m3 fait passer le signal genre de « nul » (p=0.30) à « fort mais juste sous le seuil » (p=0.078, AUC 0.84). Le genre **vit dans bge-m3**, pas dans nomic.
Ce n'est **pas encore une preuve S-1** (permutation p>0.05, n<100/genre, AUC OVR optimiste). **Aucune adoption.**

## Conséquences

- **bge-m3 = espace de features genre** (vs nomic). Implication large : bge-m3 mérite aussi d'être re-testé comme **radar qualité/era-robuste** (S1D actuellement sur nomic 0.79) — il pourrait dominer là aussi.
- Le genre EST un axe réel et séparable (direction claire, AUC 0.84) — il n'est juste pas encore prouvé au niveau de rigueur S-1.

## Prochaine étape pour franchir (proprement)
1. **Espace = bge-m3** (nomic abandonné pour le genre).
2. **Augmenter n** : ≥40 livres/genre, ≥8 auteurs/genre (élargir le KB FR — il reste des auteurs dans les 1011) ; viser p<0.05 à la permutation LOAO.
3. **AUC honnête** : recomputer l'AUC OVR avec **centroïdes LOAO** (pas full-data) + **bootstrap clusterisé par auteur** → IC95 ; cible S-1 AUC≥0.80 ET IC95-bas≥0.70.
4. **Covariables confond** : longueur + tier (vérifier que le genre n'est pas un proxy de qualité/longueur).
5. Si franchi → base du **Layer-1 genre** V4 (classifieur probabiliste sur bge-m3, scoring genre-relatif intra-genre).

---

## VERDICT
- **Statut** : PASS (méthode) · **Résultat** : `GENRE_SEPARABILITY_PROMISING_ON_BGE_M3` (pas S-1-prouvé)
- **Confiance** : Haute (espace de features décisif, bge-m3≫nomic) / Moyenne (séparabilité réelle mais p=0.078 > 0.05)
- **Forces** : 2 espaces comparés sur mêmes livres (réfute l'hypothèse « genre inséparable » en isolant la cause = espace) ; LOAO + permutation auteur honnêtes ; langue fixée ; labels sourcés ; 3 genres ≥5 auteurs.
- **Faiblesses** : (1) permutation LOAO p=0.078 ne franchit pas 0.05 → pas de preuve S-1 ; (2) AUC OVR optimiste (centroïdes full-data, fuite auteur) — à recomputer en LOAO ; (3) n=24-31/genre < 100 (S-1) ; (4) tier non fixé (genre/qualité potentiellement corrélés — covariable à contrôler).
- **Risques restants** : surinterpréter l'AUC 0.84 (optimiste). La preuve honnête est p=0.078 = trending, pas acquis.
- **Action requise** : décision Architecte — scaler sur bge-m3 (n élargi + AUC LOAO + covariables) pour franchir S-1, OU geler ici (signal documenté).

**Artefacts** : `scripts/metrology/v4g3_genre_multispace.py` · `V4G3_RESULTS.json`, `V4G3_embeddings_bgem3.json` (workspace, hors repo).
