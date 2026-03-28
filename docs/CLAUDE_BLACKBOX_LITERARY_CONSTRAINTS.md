# OMEGA — CONTRAINTES LITTÉRAIRES OBSERVÉES DE CLAUDE SONNET
**Date** : 2026-03-28
**Modèle** : claude-sonnet-4-20250514
**Standard** : Inférence empirique black-box
**Données** : 354 échantillons (90 baseline + 144 compliance + 78 ceilings + 24 attractors + 18 conflicts)
**Runs** : 3 par test

---

## THERMOMÈTRES (features stables, peu discriminantes)

- f29d_ttr_score — stable entre catégories, faible pouvoir discriminant
- f19a_approx_entropy — régulier, peu sensible aux consignes
- f16a_bigram_rarity — varie peu d'une catégorie à l'autre

## DRIVERS (features très discriminantes)

- f1_mean — très discriminant entre styles, mais plafonné en extrême
- f28d_sil_score — levier majeur, exécuté sur exemplar
- f26b_long_sent_rate — corrélé à f1_mean, plafonné après 50w
- f25g_description_score — varie fortement selon la scène
- f38c_speed_score — sensible à la consigne, inversement lié à f1_mean
- f34b_para_per_1000w — proxy dialogue fiable

## RÈGLES ÉMERGENTES

| # | Loi | Score | Confiance | Evidence |
|---|-----|-------|-----------|----------|
| 1 | Claude recentre les extrêmes syntaxiques | 0.68 | MOYENNE | B4: oralite_sale f1_mean delta=+0.91 (7% baseline), zero_description desc -15%, prose_lyrique f1 +52.7% |
| 2 | Claude exécute mieux l'exemplar que la consigne abstraite | 0.25 | FAIBLE | B2: exemplar >= best abstract dans 3/12 familles seulement |
| 3 | Claude comprime les demandes d'alternance | 0.00 | FAIBLE | B2: rhythm_ratio baseline=16.4, simple=60.7, exemplar=35.7 — le ratio AUGMENTE, pas de compression |
| 4 | Claude favorise un régime introspectif par défaut | 0.75 | HAUTE | B1: marqueurs introspectifs dans 4/4 catégories non-introspectives. B4: zero_introsp modal=0.078 |
| 5 | Claude lisse la violence et l'inconfort | 0.56 | MOYENNE | B4: inconfort f1 delta=-1.72 (13.2% baseline), speed delta=-0.049, desc +10.6% |
| 6 | Claude injecte de l'introspection spontanée même sans consigne | 0.23 | FAIBLE | B1: action SIL=0.009, desc SIL=0.020. Signal faible, std élevé |
| 7 | Claude ferme sémantiquement (résolution) même sans consigne | 0.96 | HAUTE | B1: cliff_score=0.499 constant (std inter-catégories=0.004). Fermeture systématique |
| 8 | En conflit de consignes, la consigne la plus standard gagne | 0.50 | MOYENNE | B5: consigne structurelle gagne dans ~3/6 conflits. Pas de direction forte |

### Détail des mesures inter-runs

| # | Loi | delta_mean | std_inter_runs |
|---|-----|-----------|----------------|
| 1 | Recentrage extrêmes | 0.35 | 2.14 |
| 2 | Exemplar > abstrait | 6.40 | 10.38 |
| 3 | Compression alternance | 29.49 | 8.61 |
| 4 | Régime introspectif | 0.08 | 0.07 |
| 5 | Lissage violence | 0.11 | 0.59 |
| 6 | Introspection spontanée | 0.04 | 0.04 |
| 7 | Fermeture sémantique | 0.50 | 0.01 |
| 8 | Standard gagne conflit | — | — |

## CONTRAINTES OBSERVÉES

| # | Contrainte | Score | Confiance | Détails |
|---|-----------|-------|-----------|---------|
| 1 | Plafond phrase longue | 0.08 | FAIBLE | B3: 20w→18.2, 35w→35.4, 50w→52.6, 70w→61.8, 90w→96.1. Pas de vrai plafond mais variance haute (std=17.0 à 70w) |
| 2 | Plafond oralité | 0.93 | HAUTE | B4: oralite_sale TTR=0.685 (baseline 0.740). Vocabulaire reste riche malgré consigne orale |
| 3 | Résistance au dialogue pur | 0.65 | MOYENNE | B4: dialogue_pur desc_score=0.408 (baseline 0.579). 70% de description survit |
| 4 | Difficulté deux leviers contradictoires | 0.50 | MOYENNE | B5: les deux leviers exécutés dans 3/6 conflits seulement |
| 5 | Subordination maximale atteinte | 0.99 | HAUTE | B3: moyenne=0.099, forte=0.098, saturée=0.129. Plafond net entre moyenne et forte (delta=0.001) |

## CENTRE DE GRAVITÉ SPONTANÉ (baseline, n=90)

| Feature | Mean | Std |
|---------|------|-----|
| f1_mean (longueur phrase) | 13.04 | 3.87 |
| f28d_sil_score (style indirect libre) | 0.029 | — |
| f29d_ttr_score (richesse lexicale) | 0.740 | — |
| f25g_description_score (densité descriptive) | 0.579 | — |
| f38c_speed_score (vitesse typographique) | 0.462 | — |
| f35c_hook_score (accroche) | 0.537 | — |
| f_subordination_depth (subordination) | 0.040 | — |
| f26b_long_sent_rate (phrases longues) | 0.002 | — |

## NOTE MÉTHODOLOGIQUE

Confiance calculée par rapport signal/bruit (SNR) :
- **Score** = `clamp(|delta_mean| / (std_inter_runs + eps) / 3, 0, 1)`
- Adapté par loi selon la nature de l'evidence (recentrage, compliance, plafond)
- **HAUTE** >= 0.7 | **MOYENNE** >= 0.4 | **FAIBLE** < 0.4
- n = 3 runs par test. Intervalle de confiance limité par la taille d'échantillon.

Toutes les conclusions sont **INFÉRÉES** à partir de données empiriques observées en sortie.
Aucune n'est une extraction de règle interne.
