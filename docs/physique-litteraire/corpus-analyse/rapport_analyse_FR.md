# Rapport Analyse FR — PVI Corpus Étendu

**Date**: 2026-03-29 | **Corpus**: 86 titres FR | **Standard**: ESTIMÉ (non instrumenté)

## 1. Statistiques de base

### FR-A — Bestsellers FR (N=27)
| Métrique | Valeur |
|----------|--------|
| PVI moyen | 1.466 |
| PVI médiane | 1.533 |
| Écart-type | 0.677 |
| PVI min | 0.438 (Houellebecq — Possibilité d'une île) |
| PVI max | 2.905 (EL James — 50 Nuances FR) |

Variables moyennes FR-A:
I=0.691, T=0.713, S=0.599, FL=0.265, MS=0.683, Ω=0.698, U=0.773, CE=3.413, R=0.620, W=0.610

### FR-B — Chefs d'œuvre FR (N=49)
| Métrique | Valeur |
|----------|--------|
| PVI moyen | 0.271 |
| PVI médiane | 0.168 |
| Écart-type | 0.244 |
| PVI min | 0.016 (Beckett — Molloy) |
| PVI max | 1.044 |

Variables moyennes FR-B:
I=0.491, T=0.637, S=0.394, FL=0.442, MS=0.806, Ω=0.456, U=0.714, CE=1.600, R=0.435, W=0.398

### FR-C — Upmarket FR (N=10)
PVI moyen=0.889, médiane=0.837

## 2. Discrimination FR (Δ = FR-A − FR-B)

| Rang | Variable | Δ | |Δ| |
|------|----------|---|-----|
| 1 | CE | +1.812 | 1.812 |
| 2 | Ω | +0.243 | 0.243 |
| 3 | W | +0.212 | 0.212 |
| 4 | S | +0.205 | 0.205 |
| 5 | I | +0.200 | 0.200 |
| 6 | R | +0.185 | 0.185 |
| 7 | FL | −0.177 | 0.177 |
| 8 | MS | −0.123 | 0.123 |
| 9 | T | +0.076 | 0.076 |
| 10 | U | +0.059 | 0.059 |

**Observation critique FR** : En FR, FL n'est que 7e variable discriminante (|Δ|=0.177), contre 2e en EN. Cela s'explique : les bestsellers FR littéraires (Camus, Hugo, Houellebecq) ont un FL modérément élevé (0.18-0.42), tandis que les bestsellers EN de pur genre (Patterson, Steel, Hoover) ont FL ultra-bas (0.10-0.18). La tradition française tolère plus de friction lexicale dans ses succès commerciaux.

## 3. Validation LP1 FR — CE prédit-il les ventes ?

**Spearman ρ(CE_rang, Ventes_rang) = −0.142** (N=27)

**SIGNAL FAIBLE**. Le CE ne prédit PAS le classement des ventes au sein du groupe FR-A.

Explication : en FR, les plus gros vendeurs sont un mélange hétérogène de genre-commercial (Musso FL=0.15, 50 Nuances FL=0.10) et de littéraire-commercial (Camus FL=0.18-0.30, Hugo FL=0.42-0.45). Le CE sépare bien les groupes A et B (ratio 5.41×) mais ne discrimine pas AU SEIN du groupe A.

**Réserve méthodologique** : les rangs de ventes FR sont ESTIMÉS et non documentés avec précision. Le ρ négatif peut être un artefact de l'imprécision des rangs.

## 4. Validation LP5 FR — Paradoxe Maslej

| Groupe | MS moyen | FL moyen | MS×(1−FL) |
|--------|---------|---------|-----------|
| FR-A | 0.683 | 0.265 | **0.493** |
| FR-B | 0.806 | 0.442 | **0.445** |

**PARADOXE CONFIRMÉ en FR.**
Les chefs d'œuvre FR ont +0.123 de MS mais +0.177 de FL, ce qui ANNULE l'avantage syntaxique.
Le produit MS×(1−FL) est 10.8% plus élevé chez les bestsellers.

Titres FR qui "résolvent" le paradoxe (MS élevé ET FL bas) :
- L'Étranger (Camus): MS=0.82, FL=0.18 → MS×(1-FL) = 0.672
- La Peste (Camus): MS=0.80, FL=0.25 → MS×(1-FL) = 0.600
- Stupeur et tremblements (Nothomb): MS=0.70, FL=0.22 → MS×(1-FL) = 0.546

## 5. Zone OMEGA FR

**ZONE VIDE.** Aucun titre FR n'atteint Q_prose ≥ 87 ET PVI ≥ 1.59 simultanément.

Plus proches :
- Les Misérables (Hugo): Q=88, PVI=1.533 — manque 0.06 PVI (FL=0.42 bloque)
- L'Étranger (Camus): Q=88, PVI=1.125 — manque 0.47 PVI (I=0.55 bloque)
- Crime et Châtiment FR (Dostoïevski): Q=88, PVI=1.247 — manque 0.34 PVI

Le titre FR le plus proche de la Zone OMEGA est **Les Misérables** — son I élevé (0.82) et son Ω (0.85) compensent partiellement son FL (0.42), mais le vocabulaire du XIXe siècle le retient.

## 6. Spécificités FR

### Signature culturelle française dans les goulots
- **FL en FR** : les chefs d'œuvre FR (Nouveau Roman surtout) atteignent FL=0.50-0.72, contre 0.42-0.68 pour EN-B. Le Nouveau Roman français (Robbe-Grillet, Sarraute, Simon, Butor) est le mouvement littéraire le plus pénalisant en FL du corpus entier.
- **Ω en FR-B** : Ω_FR-B = 0.456 vs Ω_EN-B = 0.523. Les chefs d'œuvre FR laissent plus de fins ouvertes/ambiguës que les EN.
- **I en FR-B** : I_FR-B = 0.491 vs I_EN-B = 0.528. Les protagonistes FR littéraires sont plus distanciés que les EN.
- **Arc en FR** : N_rev FR-B = 1.53 vs EN-B = 2.16. Les chefs d'œuvre FR ont significativement MOINS de renversements que les EN.

### Interprétation
La littérature française "haute" maximise l'hermétisme (FL, fins ouvertes, distanciation du protagoniste, absence de rebondissements) comme MARQUEUR de prestige. C'est un signal culturel : en France, la difficulté EST la marque de qualité littéraire.

---
**Niveau de confiance** : [ESTIMÉ] pour toutes les variables. Aucune mesure NLP instrumentée.
**Réserve** : N=86 titres FR avec estimations basées sur la connaissance des textes.
