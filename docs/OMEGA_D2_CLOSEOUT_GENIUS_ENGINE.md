# OMEGA — BLOC 4 D2 CLOSEOUT — GENIUS ENGINE BACKTEST
## Standard : NASA-Grade L4 / DO-178C Level A
## Date : 2026-03-30 | HEAD : 6997b5c3

## VERDICT D2 : ❌ FAIL TOTAL

Critère D2 : r(G, Tier_EN_max) ≥ 0.40
Résultat : r = 0.030 (FAIL)

## RÉSULTATS PAR GROUPE

| Groupe | n | r(G_w, Tier) | Spearman ρ | Verdict |
|--------|---|-------------|-----------|---------|
| ALL | 793 | 0.012 | -0.017 | FAIL |
| FR | 238 | 0.024 | -0.042 | FAIL |
| EN | 488 | -0.046 | -0.020 | FAIL |
| EN_MIN | 285 | -0.091 | -0.054 | FAIL |
| EN_MAX | 203 | 0.030 | 0.033 | FAIL |

## MOYENNES PAR TIER (preuve de non-discrimination)

Tier S : G_w=66.2 | Tier A : G_w=66.1 | Tier B : G_w=66.1 | Tier C : G_w=66.2
→ G est une CONSTANTE. Il ne sépare pas les tiers.

## SIGNAUX INDIVIDUELS (FR uniquement)

| Axe | r(axe, Tier) FR | Interprétation |
|-----|----------------|----------------|
| D (density) | 0.266 | Signal faible positif |
| I (inevitability) | 0.275 | Signal faible positif |
| V (voice) | -0.278 | Signal INVERSÉ |
| S (surprise) | -0.117 | Bruit |
| R (resonance) | -0.071 | Bruit |

## CAUSE RACINE

Le Genius Engine (omega-p0) mesure la prosodie : rythme syllabique, euphonie,
densité lexicale, surprise n-gram, cohérence thématique superficielle.
Ce sont des features STRUCTURELLES/PHONÉTIQUES, pas sémantiques.

L38 prouve que les features structurelles sont INSUFFISANTES pour discriminer
la qualité dans le registre littéraire. Le Genius Engine confirme L38.

## DÉCISION

Genius Engine = MODULE DORMANT. Pas d'intégration (D2 FAIL).
Les sous-axes D et I en FR méritent investigation séparée (r≈0.27),
mais le composite G est mort.
