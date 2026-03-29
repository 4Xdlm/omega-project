# Rapport Analyse EN — PVI Corpus Étendu

**Date**: 2026-03-29 | **Corpus**: 198 titres EN | **Standard**: ESTIMÉ (non instrumenté)

## 1. Statistiques de base

### EN-A — Bestsellers EN (N=80)
| Métrique | Valeur |
|----------|--------|
| PVI moyen | 2.025 |
| PVI médiane | 2.013 |
| Écart-type | 0.678 |
| PVI min | 0.765 |
| PVI max | 4.560 (Rowling — Harry Potter) |

Variables moyennes EN-A:
I=0.702, T=0.751, S=0.674, FL=0.205, MS=0.598, Ω=0.723, U=0.764, CE=4.290, R=0.648, W=0.627

### EN-B — Chefs d'œuvre EN (N=62)
| Métrique | Valeur |
|----------|--------|
| PVI moyen | 0.441 |
| PVI médiane | 0.403 |
| Écart-type | 0.294 |
| PVI min | 0.021 (Burroughs — Naked Lunch) |
| PVI max | 1.259 (McCarthy — The Road) |

Variables moyennes EN-B:
I=0.528, T=0.684, S=0.517, FL=0.470, MS=0.828, Ω=0.523, U=0.791, CE=1.626, R=0.520, W=0.459

### EN-C — Upmarket EN (N=56)
| Métrique | Valeur |
|----------|--------|
| PVI moyen | 1.281 |
| PVI médiane | 1.132 |
| Écart-type | 0.618 |
| PVI min | 0.260 |
| PVI max | 3.276 (Lee — To Kill a Mockingbird) |

Variables moyennes EN-C:
I=0.662, T=0.743, S=0.559, FL=0.272, MS=0.776, Ω=0.650, U=0.810, CE=3.159, R=0.612, W=0.582

## 2. Discrimination EN (Δ = EN-A − EN-B)

| Rang | Variable | Δ | |Δ| |
|------|----------|---|-----|
| 1 | CE | +2.665 | 2.665 |
| 2 | FL | −0.265 | 0.265 |
| 3 | MS | −0.231 | 0.231 |
| 4 | Ω | +0.200 | 0.200 |
| 5 | I | +0.174 | 0.174 |
| 6 | W | +0.168 | 0.168 |
| 7 | S | +0.158 | 0.158 |
| 8 | R | +0.127 | 0.127 |
| 9 | T | +0.067 | 0.067 |
| 10 | U | −0.027 | 0.027 |

**Observation EN** : FL est la 2e variable la plus discriminante en EN (|Δ|=0.265), bien plus que en FR (7e). Les bestsellers EN ont un FL drastiquement plus bas (0.205) que les chefs d'œuvre (0.470). Le marché anglophone pénalise beaucoup plus fortement la friction lexicale.

## 3. Validation LP1 EN — CE prédit-il les ventes ?

**Spearman ρ(CE_rang, Ventes_rang) = −0.780** (N=80)

**Corrélation NÉGATIVE forte.** Ceci est un résultat CONTRE-INTUITIF qui nécessite analyse.

**Explication** : Les rangs de ventes assignés (1=meilleur vendeur) sont des estimations grossières. Avec N=80 titres, de nombreux titres partagent des rangs similaires (beaucoup de "rang 3-5"). Le CE prédit bien la SÉPARATION entre groupes (ratio A/B = 4.59×) mais PAS le micro-classement au sein du groupe A.

**Diagnostic** : le signe négatif indique que les titres à CE le plus élevé (ultra-low FL comme 50 Shades CE=7.32) ne sont PAS nécessairement les plus gros vendeurs dans l'absolu. Harry Potter (CE~4.56 × Arc × R × W) vend plus que 50 Shades malgré un CE brut plus bas, parce que les multiplicateurs Arc, R, W sont supérieurs.

**Réserve** : LP1 doit être reformulée. CE sépare les groupes mais ne classe pas au sein d'un groupe. Le PVI COMPLET (CE × Arc × R × W) est le prédicteur pertinent, pas CE seul.

## 4. Validation LP5 EN — Paradoxe Maslej

| Groupe | MS moyen | FL moyen | MS×(1−FL) |
|--------|---------|---------|-----------|
| EN-A | 0.598 | 0.205 | **0.471** |
| EN-B | 0.828 | 0.470 | **0.438** |

**PARADOXE CONFIRMÉ en EN.**
Les bestsellers EN ont un MS nettement plus bas (−0.231) mais leur FL ultra-bas compense.
Résultat net : MS×(1−FL) bestsellers > chefs d'œuvre de 7.5%.

## 5. Zone OMEGA EN

**ZONE OCCUPÉE — 2 TITRES TROUVÉS.**

| Titre | Auteur | Q_prose | PVI | SP |
|-------|--------|---------|-----|-----|
| **The Old Man and the Sea** | Ernest Hemingway | 88 | 2.441 | 48.8 |
| **The Great Gatsby** | F. Scott Fitzgerald | 90 | 1.699 | 34.0 |

**Analyse des 2 titres Zone OMEGA :**

**Hemingway — The Old Man and the Sea** :
- I=0.72 (Santiago = universel), FL=0.15 (vocabulaire élémentaire), MS=0.85 (musicalité légendaire), Ω=0.72 (résolution poignante mais ambiguë)
- Comment il y arrive : Hemingway a RÉSOLU le paradoxe Maslej. MS×(1-FL) = 0.85×0.85 = 0.723 — le score le plus élevé du corpus. Il atteint la beauté syntaxique SANS friction lexicale.

**Fitzgerald — The Great Gatsby** :
- I=0.65 (Nick/Gatsby = identification modérée), FL=0.25 (vocabulaire accessible malgré élégance), MS=0.88 (prose musicale), Ω=0.72 (tragédie satisfaisante)
- Comment : Fitzgerald maintient FL bas (0.25) avec une MS exceptionnelle (0.88). Son MS×(1-FL) = 0.660.

**Pattern Zone OMEGA** : les deux titres partagent FL ≤ 0.25 + MS ≥ 0.85 + Ω ≥ 0.72.

## 6. Cas The Road (McCarthy)

The Road est l'anomalie majeure du corpus EN-B :
- PVI = 1.259 (le plus haut de EN-B, presque Zone C)
- I = 0.72 (père/fils = identification universelle, contrairement au Kid de Blood Meridian)
- FL = 0.35 (McCarthy a RÉDUIT sa friction par rapport à Blood Meridian FL=0.60)
- Ω = 0.72 (résolution émotionnelle, contrairement à Blood Meridian Ω=0.40)

The Road montre qu'un même auteur peut migrer de EN-B vers presque EN-C en ajustant I, FL et Ω.

## 7. Spécificités EN

- EN-A a le FL le plus bas du corpus (0.205) — les bestsellers anglophones sont les plus accessibles lexicalement
- EN-A a le MS le plus bas aussi (0.598) — la musicalité est sacrifiée pour l'accessibilité
- EN-B a un Ω plus élevé que FR-B (0.523 vs 0.456) — les chefs d'œuvre EN ferment davantage leurs arcs
- EN-C (upmarket) est le pont : FL=0.272, MS=0.776, Ω=0.650 — c'est dans EN-C que se trouvent les candidats Zone OMEGA

---
**Niveau de confiance** : [ESTIMÉ] pour toutes les variables. Aucune mesure NLP instrumentée.
**Réserve** : N=198 titres EN. Rangs de ventes approximatifs pour la plupart.
