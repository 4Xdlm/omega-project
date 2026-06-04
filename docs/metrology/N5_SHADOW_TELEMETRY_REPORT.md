# N5-RUN — Télémétrie shadow bge-m3 radar sur prose OMEGA (activation réelle)

**Date** : 2026-06-04 · **Branche** : phase-r-dispatcher-v33 · **Décision Architecte** : GO activation `OMEGA_BGEM3_RADAR=shadow`.
**Nature** : exécution du VRAI chemin shadow (`shadowLogBgem3Radar`) avec provider bge-m3 Ollama réel, sur prose OMEGA générée (BOOK_FULL). Lecture seule, zéro impact moteur.

## Exécution
- Module : `packages/sovereign-engine/src/oracle/intrinsic-quality/bgem3-radar.ts` (DEC-019), flag `OMEGA_BGEM3_RADAR=shadow`.
- Harnais : `scripts/metrology/n5_shadow_run.ts` (npx tsx) → émet les lignes `[BGEM3_RADAR shadow] scene=… dim=1024 score=… band=…`.
- Source : 42 chapitres `chapter_NN.txt` de sessions `BOOK_FULL_*` (prose OMEGA réelle, fenêtre 1500 mots milieu).
- **8 doublons** (sessions BOOK_FULL répliquées, scores identiques) → **34 prose distinctes** analysées.

## Télémétrie brute (`N5_SHADOW_TELEMETRY.json`)
- score = cos(prose, master_centroid) − cos(prose, low_centroid). >0 = plus proche des maîtres.
- mean −0.0014, médiane +0.0006, min −0.0224, max +0.0119.
- Bandes (34 uniques) : **22 mixed, 7 low-like, 5 master-like**.

## Calibration vérité-terrain (`N5_RADAR_REFERENCE.json`, LOAO EMP-18)
Score LOAO (centroïdes excluant l'auteur testé) sur le Gold-Set scellé :

| Groupe | n | mean | médiane | p25–p75 | min–max |
|---|---|---|---|---|---|
| Maîtres | 60 | **+0.0119** | +0.0101 | [+0.004, +0.020] | [−0.033, +0.048] |
| Pulp/formulaic | 90 | **−0.0156** | −0.0162 | [−0.027, −0.008] | [−0.061, +0.033] |
| **OMEGA BOOK_FULL** | 34 | **−0.0014** | +0.0006 | [−0.007, +0.006] | [−0.022, +0.012] |

**Position OMEGA sur l'axe pulp(0) → maître(1) = 0.516.**

## Verdict (advisory, télémétrie)
1. **Le hook shadow fonctionne en production** : flag activé, provider réel, télémétrie émise, **zéro impact verdict** (radar advisory, non-gating). Déterminisme préservé (embedding hors chemin hashé).
2. **Positionnement OMEGA V1 = mi-chemin (0.52)** entre pulp et maîtres sur le radar géométrique bge-m3.
   - Clairement **au-dessus du pulp/formulaic** (médiane OMEGA +0.0006 vs pulp −0.0162).
   - **N'atteint PAS le cluster des maîtres** : le p75 d'OMEGA (+0.006) est sous la médiane des maîtres (+0.010) ; seules 5/34 prose franchissent en zone master-like, et aucune n'approche le haut du cluster maître (+0.020 à +0.048).
   - Cohérent avec les **plafonds V1 SEAL** (auth≈80, rhythm≈82) : OMEGA produit une prose compétente supra-commerciale, pas encore magistrale.
3. **Le radar discrimine** (rappel S1D-bge : maîtres vs formulaic AUC 0.943) → ce placement à 0.52 est **un signal réel**, pas du bruit.

## Caveats
- Bandes ±0.01 de `interpretRadar` : seuils initiaux arbitraires → **recalibrés** sur ces distributions (voir commit suivant : low-like < pulp-p75, master-like > maître-p25).
- Échelle de score étroite (±0.05 max) : normal pour des centroïdes 1024-dim ; l'AUC (0.94) reste la mesure de séparation, le score brut est un **positionnement advisory**.
- 8 sessions BOOK_FULL sont des répliques (hygiène : à dédupliquer si bench futur).

## N5-AGREE — Radar (cheap) vs juge OMEGA (cher) : accord ? (`N5_RADAR_VS_JUDGE.json`)
Appariement par chapitre du radar score avec le composite OMEGA (chapter_NN_result.json), 34 prose uniques.

| Corrélation (Spearman) | Valeur |
|---|---|
| radar vs **composite** | **−0.059** |
| radar vs min_axis | +0.037 |
| radar vs ecc | +0.015 |

- plage composite : [79.3, 91.3] (étroite — tous chapitres déjà sélectionnés/passing) ; plage radar [−0.022, +0.012].
- **Verdict : ORTHOGONALITÉ.** Le radar géométrique bge-m3 et le composite multi-axes OMEGA mesurent des choses **indépendantes** sur la prose d'OMEGA. Conséquences :
  1. Le radar **n'est PAS un proxy** du composite (corrélation nulle) → ne peut pas remplacer le juge pour la sélection.
  2. Le radar **n'est pas redondant** non plus → il apporte un axe géométrique indépendant (proximité-aux-maîtres), potentiellement complémentaire en advisory.
- **Caveat fort** : plage composite restreinte (79–91, post-sélection). Un vrai test d'accord exige une plage qualité LARGE (inclure les candidats rejetés / bas). L'orthogonalité est réelle sur ce set mais le test est range-restricted → conclusion prudente. Test large = travail futur (nécessite scores juge par-livre sur tout le spectre).

## VERDICT
- Statut : PASS · Confiance : Haute (calibration LOAO vérité-terrain) / Moyenne (accord radar-juge range-restricted).
- Forces : vrai chemin shadow exercé ; placement OMEGA quantifié contre vérité-terrain ; EMP-18 respecté.
- Faiblesses : n=34 prose distinctes (BOOK_FULL répliqué) ; score brut étroit ; un seul moteur de prose (BOOK_FULL, pas atelier/golden récents).
- Action requise : aucune (advisory). Recalibration des bandes appliquée séparément.
- Artefacts : `n5_shadow_run.ts`, `n5_radar_reference.py`, `N5_SHADOW_TELEMETRY.json`, `N5_RADAR_REFERENCE.json`.
