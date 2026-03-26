# OMEGA — AUDIT COHABITATION f26b vs RYTHME SUR CORPUS DES MAITRES
## 241 oeuvres FR — 2026-03-26

## DECOUVERTE MAJEURE

**r(f26b, f1a) = +0.840** (global), **+0.816** (Tier A), **+0.950** (Spearman)

Les phrases longues et la variance rythmique sont **fortement correlees positivement** chez les maitres. **ZERO victimes** du conflit (aucune oeuvre n'a f26b haut + f1a bas).

Le conflit r=-0.802 observe dans OMEGA entre f26b et RCI est un **ARTEFACT** du moteur de generation, pas une loi de la prose litteraire.

---

## MATRICE DE CORRELATION (Pearson, 241 oeuvres FR)

```
             f26b    f1a   f1_mean  f17     cv_sent
f26b         1.000   0.840  0.785  -0.520  -0.787
f1a          0.840   1.000  0.777  -0.448  -0.605
f1_mean      0.785   0.777  1.000  -0.331  -0.653
f17_knife   -0.520  -0.448 -0.331   1.000   0.801
cv_sent     -0.787  -0.605 -0.653   0.801   1.000
```

## PAR TIER

| Tier | N | r(f26b,f1a) | r(f26b,f17) | f26b moy | f1a moy | f17 moy |
|------|---|-------------|-------------|----------|---------|---------|
| A (maitres) | 38 | **+0.816** | -0.570 | 0.080 | 13.1 | 6.6 |
| B (bon) | 34 | +0.918 | -0.436 | 0.023 | 9.0 | 9.7 |
| C (moyen) | 37 | +0.898 | -0.492 | 0.011 | 7.9 | 10.5 |
| S (non classe) | 129 | +0.815 | -0.482 | 0.110 | 16.2 | 5.7 |

La correlation est forte et POSITIVE a tous les tiers.

## ZONE OPTIMALE TIER A (P25-P75)

| Feature | P25 | P75 |
|---------|-----|-----|
| f26b | 0.011 | 0.138 |
| f1a | 9.5 | 16.2 |
| f17 (knife) | 3 | 8 |
| f1_mean | 13.0 | 22.1 |
| cv_sent | 0.178 | 0.231 |

## CHAMPIONS DE COHABITATION (f26b P75+ ET f1a P75+)

50 oeuvres, dont 9 Tier A. Top 5 :
1. Claude Simon — La Route des Flandres (f26b=0.703, f1a=54.8)
2. Claude Simon — The Flanders Road (f26b=0.680, f1a=90.7)
3. Zola — Au Bonheur des Dames (f26b=0.486, f1a=43.6)
4. Diderot — Le Neveu de Rameau (f26b=0.456, f1a=28.9)
5. Claude Simon — L'Herbe (f26b=0.443, f1a=68.4)

**ZERO victimes** : aucune oeuvre ne combine f26b haut avec f1a bas.

## PROFILS PAR TYPE

| Type | N | f26b moy | f1a moy | f1_mean moy |
|------|---|----------|---------|-------------|
| CONTEMPLATIF | 20 | **0.166** | **21.9** | **44.9** |
| ACTION | 36 | 0.122 | 16.7 | 21.3 |
| AUTRE | 183 | 0.058 | 11.7 | 16.5 |

Les contemplatifs ont les phrases les plus longues (f1_mean=44.9) ET la plus forte variance rythmique (f1a=21.9).

## LOI L31 — COHABITATION

> "Les maitres font cohabiter phrases longues et rythme.
> La cle est l'ALTERNANCE : des phrases tres courtes (knife)
> intercalees dans les phrases longues creent la variance.
> Le conflit r=-0.802 observe dans OMEGA est un artefact du LLM
> qui genere des textes monotones, pas une loi de la prose."

## RECOMMANDATIONS

1. **Le conflit OMEGA est un artefact** — le LLM ne produit pas assez de contraste
2. **Enrichir le prompt** avec la loi d'alternance : paragraphes longs + coupes courtes
3. **Le scorer fonctionne correctement** — f26b et f1a sont independants dans la formule, et ils DEVRAIENT monter ensemble
4. **Le probleme est en amont** : le moteur de generation (Duel single-shot) produit des textes a variance trop faible
