# SESSION SAVE — Analyse PVI Corpus Étendu (284 titres)

**Date**: 2026-03-29
**Phase**: phase-r-metrology-rebuild
**Opérateur**: Claude Code (IA Principal)
**Architecte**: Francky

---

## Résumé exécutif

Analyse PVI (Potentiel de Ventes Intrinsèques) étendue à 284 titres du corpus OMEGA :
- 86 titres FR (27 FR-A bestsellers, 49 FR-B chefs d'œuvre, 10 FR-C upmarket)
- 198 titres EN (80 EN-A bestsellers, 62 EN-B chefs d'œuvre, 56 EN-C upmarket)

### Résultats clés

| Signal | Pilote (20t) | Corpus étendu (284t) | Statut |
|--------|-------------|---------------------|--------|
| Ratio PVI A/B | 5.65× | FR: 5.41× / EN: 4.59× | **CONFIRMÉ** |
| LP5 (Maslej) | MS×(1-FL) A > B | FR: 0.493>0.445 / EN: 0.471>0.438 | **CONFIRMÉ** |
| LP1 (CE→Ventes) | ρ=0.667 | FR: −0.142 / EN: −0.780 | **INVALIDÉ intra-groupe** |
| Zone OMEGA | VIDE | FR: VIDE / EN: 2 titres (Hemingway, Fitzgerald) | **PARTIELLEMENT REMPLIE** |
| Variable la plus discriminante | FL | FR: CE (#1) / EN: CE (#1), FL (#2) | **CE universel, FL en EN** |

### Découvertes nouvelles

1. **Zone OMEGA EN occupée** : The Old Man and the Sea (Q=88, PVI=2.441) et The Great Gatsby (Q=90, PVI=1.699)
2. **LP1 reformulée** : CE sépare les groupes (~5×) mais ne classe pas au sein d'un groupe
3. **FL×(1−Ω)** est un meilleur prédicteur que CE seul (ρ=−0.827 vs −0.780 en EN)
4. **Signature culturelle FR** : Ω_FR-B (0.456) < Ω_EN-B (0.523), N_rev_FR-B (1.53) < N_rev_EN-B (2.16)
5. **Houellebecq anomalie** : bestseller FR avec FL élevé (0.32-0.38) → PVI sous-performant

---

## Fichiers produits

| Fichier | Contenu |
|---------|---------|
| inventaire_corpus_classifie.csv | 745 fichiers inventoriés, 576 inclus |
| pvi_corpus_FR.csv | 86 titres FR avec 25 colonnes de données PVI |
| pvi_corpus_EN.csv | 198 titres EN avec 25 colonnes de données PVI |
| rapport_analyse_FR.md | Analyse complète corpus FR |
| rapport_analyse_EN.md | Analyse complète corpus EN |
| rapport_comparatif_FR_EN.md | Comparatif bilingue + statut des lois |

---

## Réserves méthodologiques [CRITIQUE]

1. **TOUTES les variables PVI sont ESTIMÉES** — aucune mesure NLP instrumentée
2. Les rangs de ventes sont **approximatifs** pour la majorité des titres
3. Les coefficients du modèle PVI (0.40, 0.28, 0.17, 0.15) ne sont **pas calibrés** par régression
4. Le corpus surreprésente les classiques et sous-représente la production contemporaine
5. **Confiance estimation** : la majorité des variables sont cotées [ESTIMÉ], non [MESURÉ]
6. Le paradoxe Maslej (LP5) est le seul résultat robuste à travers les trois corpus
7. LP1 telle que formulée (corrélation rang CE / rang ventes) est **invalidée** à N>20

### Ce qui est solide
- Ratio PVI A/B ≈ 5× (stable sur 3 corpus)
- LP5 MS×(1-FL) bestsellers > chefs d'œuvre (confirmé FR ET EN)
- Zone OMEGA EN : Hemingway + Fitzgerald (FL≤0.25, MS≥0.85, Ω≥0.72)
- Direction de toutes les variables (sauf U) : convergente

### Ce qui est fragile
- LP1 intra-groupe : non reproductible
- LP2 (I×Ω) : faible dans tous les corpus
- Rangs FL en FR vs EN : dépendant de la composition du corpus
- Valeurs absolues des PVI : sensibles aux coefficients non calibrés

---

## Formule Zone OMEGA — Recommandation architecturale

```
I  ≥ 0.65   FL ≤ 0.25   MS ≥ 0.85   Ω ≥ 0.72   N_rev ≥ 2   T ≥ 0.75
```

Style cible : Hemingway (FL/MS) × Ferrante (I) × Christie (S/Arc) × Shriver (Ω)

---

**Statut session** : COMPLÈTE
**Prochaine étape** : calibration des coefficients par régression sur ventes documentées
