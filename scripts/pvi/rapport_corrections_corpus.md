# Rapport Corrections Corpus FL

**Date**: 2026-03-29
**Methode**: FL recalcule avec wordfreq top-5k + NER + len>=4

## Statistiques corrections

| Corpus | Recalcules NLP | Maintenus proxy |
|--------|---------------|----------------|
| FR | 80 | 6 |
| EN | 39 | 159 |

## Impact sur PVI moyens

| Groupe | PVI moyen (corrige) |
|--------|--------------------|
| FR-A | 1.3378 |
| FR-B | 0.2966 |
| FR-C | 0.9679 |
| EN-A | 1.9813 |
| EN-B | 0.4871 |
| EN-C | 1.2835 |

## Ratios A/B (corrige)
- FR: 4.51x (avant: 5.41x)
- EN: 4.07x (avant: 4.59x)

## Zone OMEGA (corrige)

- FR: Zone OMEGA VIDE
- **EN ZONE OMEGA**: The Old Man and the Sea Q=88 PVI=1.9036
- **EN ZONE OMEGA**: The Great Gatsby Q=90 PVI=1.7457
- **EN ZONE OMEGA**: No Country for Old Men Q=88 PVI=1.7894
- **EN ZONE OMEGA**: Beloved Q=92 PVI=1.6126

## Detail corrections FL

| Titre | Groupe | FL_proxy | FL_NLP | Delta |
|-------|--------|---------|--------|-------|
| Dora Bruder | FR-B | 0.32 | 0.8682 | +0.5482 |
| Si par une nuit d'hiver un voyageur | FR-C | 0.38 | 0.9015 | +0.5215 |
| Désert | FR-B | 0.42 | 0.9214 | +0.5014 |
| Les Misérables | FR-A | 0.42 | 0.8921 | +0.4721 |
| Madame Bovary | FR-B | 0.45 | 0.8966 | +0.4466 |
| The Sound and the Fury | EN-B | 0.62 | 0.1756 | -0.4444 |
| Du côté de chez Swann | FR-B | 0.72 | 0.2771 | -0.4429 |
| Notre-Dame de Paris | FR-A | 0.45 | 0.8915 | +0.4415 |
| Gravity's Rainbow | EN-B | 0.72 | 0.2902 | -0.4298 |
| Lolita | EN-B | 0.48 | 0.9027 | +0.4227 |
| Mémoires d'Hadrien | FR-B | 0.48 | 0.8989 | +0.4189 |
| Absence | FR-B | 0.50 | 0.9068 | +0.4068 |
| Infinite Jest | EN-B | 0.68 | 0.2937 | -0.3863 |
| Un balcon en forêt | FR-B | 0.55 | 0.9185 | +0.3685 |
| La Maison de Rendez-Vous | FR-B | 0.55 | 0.8881 | +0.3381 |
| Le Rivage des Syrtes (Opposing Shor | FR-B | 0.58 | 0.9088 | +0.3288 |
| As I Lay Dying | EN-B | 0.50 | 0.1903 | -0.3097 |
| Blood Meridian | EN-B | 0.60 | 0.2970 | -0.3030 |
| Voyage au bout de la nuit | FR-B | 0.55 | 0.2534 | -0.2966 |
| The Waves | EN-B | 0.58 | 0.2835 | -0.2965 |
| To the Lighthouse | EN-B | 0.50 | 0.2137 | -0.2863 |
| La Route des Flandres | FR-B | 0.62 | 0.3383 | -0.2817 |
| Le Planétarium | FR-B | 0.52 | 0.2484 | -0.2716 |
| Underworld | EN-B | 0.48 | 0.2307 | -0.2493 |
| Monts Mers et Géants | FR-B | 0.62 | 0.3738 | -0.2462 |
| Enfance | FR-B | 0.48 | 0.2436 | -0.2364 |
| Mrs Dalloway | EN-B | 0.48 | 0.2437 | -0.2363 |
| La Jalousie | FR-B | 0.52 | 0.2841 | -0.2359 |
| Suttree | EN-B | 0.55 | 0.3190 | -0.2310 |
| La Nausée | FR-B | 0.50 | 0.2703 | -0.2297 |
| Pale Fire | EN-B | 0.55 | 0.3207 | -0.2293 |
| Martereau | FR-B | 0.50 | 0.2718 | -0.2282 |
| Beloved | EN-B | 0.42 | 0.1958 | -0.2242 |
| Song of Solomon | EN-B | 0.40 | 0.1835 | -0.2165 |
| L'Amant | FR-B | 0.40 | 0.1876 | -0.2124 |
| La Modification | FR-B | 0.48 | 0.2691 | -0.2109 |
| Molloy | FR-B | 0.70 | 0.9010 | +0.2010 |
| No Country for Old Men | EN-B | 0.38 | 0.1814 | -0.1986 |
| White Noise | EN-B | 0.42 | 0.2359 | -0.1841 |
| Terrasse à Rome | FR-B | 0.52 | 0.3366 | -0.1834 |
| Le Voyeur | FR-B | 0.50 | 0.3189 | -0.1811 |
| Alexis ou le Traité du vain combat | FR-B | 0.45 | 0.2697 | -0.1803 |
| Cinquante nuances (FR) | FR-A | 0.10 | 0.2668 | +0.1668 |
| Le malheur indifférent | FR-B | 0.42 | 0.2551 | -0.1649 |
| Texaco | FR-B | 0.55 | 0.3897 | -0.1603 |
| La Vie mode d'emploi | FR-B | 0.52 | 0.3691 | -0.1509 |
| L'Insoutenable Légèreté | FR-B | 0.42 | 0.2704 | -0.1496 |
| The Secret History | EN-A | 0.35 | 0.2051 | -0.1449 |
| Crime et Châtiment (FR) | FR-C | 0.40 | 0.2555 | -0.1445 |
| 50 Shades of Grey (EN) | EN-A | 0.10 | 0.2445 | +0.1445 |
| Ourania | FR-B | 0.42 | 0.2795 | -0.1405 |
| Le salon du Wurtemberg | FR-B | 0.48 | 0.3456 | -0.1344 |
| L'Œuvre au noir | FR-B | 0.50 | 0.3688 | -0.1312 |
| Les Mandarins | FR-A | 0.38 | 0.2523 | -0.1277 |
| La Moustache | FR-A | 0.22 | 0.3456 | +0.1256 |
| Encre sympathique | FR-B | 0.32 | 0.1951 | -0.1249 |
| L'Argent | FR-C | 0.42 | 0.2983 | -0.1217 |
| The Road | EN-B | 0.35 | 0.2381 | -0.1119 |
| La Quarantaine | FR-B | 0.40 | 0.2931 | -0.1069 |
| Maison flamme/ombre (FR) | FR-A | 0.20 | 0.3064 | +0.1064 |
| The Goldfinch | EN-A | 0.32 | 0.2187 | -0.1013 |
| Le nom de la rose | FR-A | 0.42 | 0.3205 | -0.0995 |
| Wuthering Heights | EN-C | 0.38 | 0.2807 | -0.0993 |
| Tous les matins du monde | FR-B | 0.45 | 0.3609 | -0.0891 |
| L'Œuvre | FR-C | 0.40 | 0.3172 | -0.0828 |
| Americanah | EN-C | 0.28 | 0.1974 | -0.0826 |
| Trois Femmes puissantes | FR-B | 0.40 | 0.3181 | -0.0819 |
| Ce qu'ils disent ou rien | FR-B | 0.30 | 0.2182 | -0.0818 |
| La Voie royale | FR-B | 0.42 | 0.3403 | -0.0797 |
| La possibilité d'une île | FR-A | 0.38 | 0.3008 | -0.0792 |
| Stupeur et tremblements | FR-A | 0.22 | 0.2989 | +0.0789 |
| The Old Man and the Sea | EN-C | 0.15 | 0.2252 | +0.0752 |
| Quartier Perdu | FR-B | 0.33 | 0.2625 | -0.0675 |
| Carrie | EN-A | 0.18 | 0.2454 | +0.0654 |
| Kevin (FR) | FR-C | 0.35 | 0.2850 | -0.0650 |
| East of Eden | EN-C | 0.25 | 0.1851 | -0.0649 |
| Rue des Boutiques Obscures | FR-B | 0.35 | 0.2872 | -0.0628 |
| Courir | FR-B | 0.32 | 0.2585 | -0.0615 |
| And Then There Were None | EN-A | 0.15 | 0.2103 | +0.0603 |
| Harry Potter Philosopher's Stone | EN-A | 0.15 | 0.2098 | +0.0598 |
| Les Mystères de Marseille | FR-C | 0.38 | 0.3224 | -0.0576 |
| Divergent | EN-A | 0.15 | 0.2069 | +0.0569 |
| La mort heureuse | FR-A | 0.28 | 0.3345 | +0.0545 |
| Les Vestiges du Jour (FR) | FR-C | 0.28 | 0.2256 | -0.0544 |
| Les Particules élémentaires | FR-A | 0.35 | 0.2964 | -0.0536 |
| Une page d'amour | FR-C | 0.38 | 0.3274 | -0.0526 |
| 1984 | EN-C | 0.18 | 0.2322 | +0.0522 |
| L'Amie prodigieuse (FR) | FR-A | 0.22 | 0.2714 | +0.0514 |
| L'Exil et le Royaume | FR-A | 0.28 | 0.3298 | +0.0498 |
| L'Événement | FR-B | 0.30 | 0.2504 | -0.0496 |
| Millénium 1 (FR) | FR-A | 0.30 | 0.2556 | -0.0444 |
| En finir avec Eddy Bellegueule | FR-B | 0.28 | 0.2368 | -0.0432 |
| Fight Club | EN-A | 0.25 | 0.2072 | -0.0428 |
| Atonement | EN-C | 0.28 | 0.2373 | -0.0427 |
| Au Bonheur des Dames | FR-C | 0.38 | 0.3377 | -0.0423 |
| L'Étranger | FR-A | 0.18 | 0.2201 | +0.0401 |
| Catching Fire | EN-A | 0.15 | 0.1897 | +0.0397 |
| Mémoire de fille | FR-B | 0.30 | 0.2606 | -0.0394 |
| La Chute | FR-A | 0.30 | 0.2629 | -0.0371 |
| Les Années | FR-B | 0.35 | 0.3144 | -0.0356 |
| La Chambre de Giovanni (FR) | FR-C | 0.28 | 0.2453 | -0.0347 |
| La Peste | FR-A | 0.25 | 0.2835 | +0.0335 |
| Une femme | FR-B | 0.28 | 0.2501 | -0.0299 |
| La danseuse | FR-B | 0.32 | 0.2901 | -0.0299 |
| La Carte et le Territoire | FR-A | 0.32 | 0.2907 | -0.0293 |
| Limonov | FR-A | 0.30 | 0.2717 | -0.0283 |
| To Kill a Mockingbird | EN-C | 0.18 | 0.2066 | +0.0266 |
| Pars vite et reviens tard | FR-A | 0.28 | 0.3042 | +0.0242 |
| Kolkhoze | FR-A | 0.28 | 0.2570 | -0.0230 |
| The Catcher in the Rye | EN-C | 0.15 | 0.1276 | -0.0224 |
| La Place | FR-B | 0.28 | 0.2584 | -0.0216 |
| The Grapes of Wrath | EN-C | 0.28 | 0.2615 | -0.0185 |
| It Ends With Us | EN-A | 0.12 | 0.1379 | +0.0179 |
| The Martian | EN-A | 0.22 | 0.2055 | -0.0145 |
| La femme gelée | FR-B | 0.28 | 0.2927 | +0.0127 |
| The Great Gatsby | EN-C | 0.25 | 0.2383 | -0.0117 |
| Gone Girl | EN-A | 0.20 | 0.1954 | -0.0046 |
| Un cœur simple | FR-B | 0.40 | 0.4018 | +0.0018 |
| La Ronde de nuit | FR-B | 0.35 | 0.3507 | +0.0007 |
