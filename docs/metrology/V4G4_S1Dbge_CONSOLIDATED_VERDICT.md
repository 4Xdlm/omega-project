# V4-G4 (genre scalé honnête) + S1D-bge (radar qualité) — verdict consolidé

**Date** : 2026-06-03 · **Branche** : phase-r-dispatcher-v33 · **Standard** : S-1 · **Espace** : bge-m3
**Décision Architecte** : « 1+2 » = scaler le genre sur bge-m3 ET re-tester le radar qualité sur bge-m3.

---

## Partie A — S1D-bge : bge-m3 vs nomic comme RADAR QUALITÉ (Gold-Set scellé, 150 textes)

Même protocole que S1D-nomic : LOAO par auteur, AUC, bootstrap 2000 clusterisé auteur, permutation 1000.

| Contraste | nomic AUC [IC95] | bge-m3 AUC [IC95] | Gagnant |
|---|---|---|---|
| MASTER_FR vs C_formulaic_FR | 0.821 [0.56–0.92] | **0.943 [0.78–0.98]** | **bge-m3** (franchit S-1 AUC≥0.80 + IC-bas≥0.70) |
| MASTER_EN vs C_formulaic_EN | 0.860 [0.63–0.96] | 0.889 [0.65–0.96] | bge-m3 (léger) |
| MASTER_FR vs D_pulp_réel_FR | 0.840 [0.55–0.91] | 0.796 [0.42–0.91] | nomic (léger) |

**Lecture** : bge-m3 **domine sur le contraste maître-vs-formulaic** (FR : seul cas qui franchit S-1 sur AUC+IC) et égale/dépasse nomic sur l'EN. Il est **légèrement moins bon sur le contraste DUR** (maître vs pulp publié réel), où les deux plafonnent à ~0.80 avec IC large — cohérent avec le **plafond mondial ~0.77** (Underwood/van Cranenburgh). Aucun modèle ne « bat » ce plafond sur la discrimination qualité-de-publication réelle.

**Verdict A** : **bge-m3 ≥ nomic comme radar qualité**, nettement sur le formulaic, marginalement en deçà sur le pulp réel. Recommandation : **adopter bge-m3 comme embedding radar par défaut** (advisory, OBJ4), nomic conservé en comparaison. Le contraste dur reste au plafond mondial (non franchi, attendu).

---

## Partie B — V4-G4 : genre scalé, AUC HONNÊTE (LOAO), bge-m3

Correctif méthodologique majeur vs V4-G3 : l'AUC OVR de G3 (0.839) était calculée sur **centroïdes full-data (fuite : l'auteur testé était dans son propre centroïde)**. V4-G4 recalcule l'AUC avec **centroïdes LOAO** (auteur exclu) + bootstrap clusterisé auteur.

Sélection (corpus `lang_detected=fr`, OK) : **88 livres, 21 auteurs** — THRILLER 9 auteurs/34, SF_FANTASY 5/24, FEELGOOD 7/30. Le KB élargi n'a ajouté que **3 livres** → **corpus épuisé** pour les auteurs FR de genre célèbres.

| Métrique | Valeur | S-1 |
|---|---|---|
| LOAO accuracy (hasard 0.333) | 0.466 | — |
| **macro-OVR-AUC (LOAO honnête)** | **0.582** | ✗ (<0.80) |
| IC95 macro-AUC (bootstrap auteur) | [0.34–0.64] | ✗ (bas <0.70) |
| permutation p (accuracy) | 0.063 | ✗ (>0.05) |
| AUC par genre | FEELGOOD **0.779** · THRILLER 0.522 · SF 0.445 | — |

**L'AUC honnête (0.58) effondre l'AUC optimiste de G3 (0.84).** La fuite de centroïdes surestimait massivement. Honnêtement mesuré :
- **FEELGOOD est séparable** (0.78) — le feel-good/romance a une signature embedding distincte.
- **THRILLER ≈ hasard** (0.52), **SF sous le hasard** (0.45) — embeddings n'isolent pas ces genres entre eux.

Covariables : SF mean_words 140k vs feel-good 80k (longueur diffère, mais fenêtre 1500 mots fixe → neutralisé) ; tiers mixtes par genre (pas un proxy de tier pur).

**Verdict B** : `GENRE_NOT_SEPARABLE_AT_S1` (sur ce corpus, bge-m3, AUC honnête). Le genre n'est PAS prouvable au niveau S-1 : seul le feel-good ressort. Le « prometteur » de G3 était un **artefact de fuite** — corrigé ici. Le corpus est **épuisé** (~88 livres), donc scaler le n n'est pas possible avec les auteurs FR célèbres actuels. **Aucune couche genre adoptée.**

---

## Synthèse 1+2 (truth-control)
- **Gain net** : bge-m3 = meilleur radar qualité que nomic (Partie A) → adoptable en advisory (OBJ1/OBJ4).
- **Correction honnête** : le genre, mesuré rigoureusement (AUC LOAO, pas full-data), **n'est pas séparable au-delà du feel-good** sur ce corpus (Partie B). Le test honnête a démasqué la fuite qui faisait paraître G3 « prometteur ». Le contrôle-vérité a, une 3ᵉ fois, empêché une adoption sur une preuve fausse.
- **Donnée bloquante** : corpus FR de genre épuisé à ~88 livres ; prouver le genre exigerait un corpus auteur→genre bien plus large (hors source actuelle).

---

## VERDICT
- **Statut** : PASS (méthode) · **Résultats** : A=`BGE_M3_BETTER_QUALITY_RADAR` (adoptable advisory) · B=`GENRE_NOT_SEPARABLE_AT_S1` (corpus-limité, seul feel-good séparable)
- **Confiance** : Haute (méthodes honnêtes, fuite G3 corrigée, bootstrap+permutation)
- **Forces** : AUC LOAO honnête démasque la fuite de G3 ; bootstrap clusterisé auteur ; comparaison directe nomic/bge-m3 mêmes Gold-Set ; covariables vérifiées.
- **Faiblesses** : (1) genre n=88 corpus-limité — impossible de scaler sans nouveau corpus ; (2) contraste dur maître-vs-pulp reste au plafond mondial pour les deux modèles ; (3) feel-good séparable mais 1 genre ne fait pas une couche.
- **Risques restants** : surinterpréter la Partie A (bge-m3 ne bat PAS le plafond mondial sur le pulp réel) ; ne pas relancer la couche genre sur le seul feel-good.
- **Action requise** : décision Architecte — (a) adopter bge-m3 radar (ADR) ; (b) genre : geler (corpus-limité) OU acquérir un corpus auteur→genre élargi.

**Artefacts** : `scripts/metrology/s1d_embed_bgem3.py`, `v4g4_genre_scale.py` · `S1D_BGEM3_EMBED_RESULTS.json`, `V4G4_RESULTS.json` (workspace).
