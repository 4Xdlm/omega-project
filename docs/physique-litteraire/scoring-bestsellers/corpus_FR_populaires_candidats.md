# Corpus FR Bestsellers Populaires — Candidats 2020-2024

**Date** : 2026-04-01 | **Statut** : CANDIDATS (a scorer quand epub disponibles)

---

## Titres candidats (non encore dans le corpus PVI)

### Tier 1 — Bestsellers massifs (>500K exemplaires)

| # | Titre | Auteur | Annee | Genre | Ventes est. | Statut |
|---|-------|--------|-------|-------|-------------|--------|
| 1 | Angele | Guillaume Musso | 2020 | Thriller | >500K | A SCORER |
| 2 | La vie est un roman | Guillaume Musso | 2021 | Thriller | >500K | A SCORER |
| 3 | La jeune fille et la nuit | Guillaume Musso | 2023 | Thriller | >400K | A SCORER |
| 4 | Ghost in Love | Marc Levy | 2020 | Romance | >300K | A SCORER |
| 5 | C'est arrive la nuit | Marc Levy | 2021 | Thriller | >300K | A SCORER |

### Tier 2 — Bestsellers confirms (>100K exemplaires)

| # | Titre | Auteur | Annee | Genre | Ventes est. | Statut |
|---|-------|--------|-------|-------|-------------|--------|
| 6 | Il est grand temps de rallumer les etoiles | Virginie Grimaldi | 2020 | Feel-good | >200K | A SCORER |
| 7 | Les possibles | Virginie Grimaldi | 2022 | Feel-good | >150K | A SCORER |
| 8 | Les gens heureux lisent et boivent du cafe | Agnes Martin-Lugand | 2020 | Romance | >200K | A SCORER |
| 9 | Quelqu'un m'attend quelque part | Anna Gavalda | 2023 | Nouvelles | >150K | A SCORER |
| 10 | Le parfum du bonheur est plus fort sous la pluie | Virginie Grimaldi | 2021 | Feel-good | >150K | A SCORER |

### Tier 3 — Traductions bestsellers FR

| # | Titre | Auteur | Annee | Genre | Statut |
|---|-------|--------|-------|-------|--------|
| 11 | After (FR) | Anna Todd | 2020 | New Adult | A SCORER |
| 12 | PS : I Love You (FR) | Cecelia Ahern | traduit | Romance | A SCORER |
| 13 | Twilight (FR) | Stephenie Meyer | traduit | Fantasy Romance | A SCORER |

---

## Profils PVI attendus (hypotheses)

### Musso / Levy (thriller populaire FR)

| Variable | Attendu | Justification |
|----------|---------|---------------|
| FL | 0.20-0.30 | Prose accessible, phrases moyennes |
| I | 0.40-0.60 | Protagoniste identifiable mais generique (cf Instant Present I=0.41) |
| Omega | 0.72-0.82 | Twist final + resolution — signature Musso |
| T | 0.65-0.75 | Suspense eleve mais prose moins immersive |
| MS | 0.83-0.87 | Rythme page-turner |
| PVI attendu | 0.8-1.5 | PASS probable |

Note : L'Instant Present (Musso) a score PVI=0.348 avec I=0.41, ce qui est
sous-estime par I_proxy NLP v1. Avec I_proxy v2, Musso devrait scorer plus haut.

### Grimaldi / Martin-Lugand (feel-good FR)

| Variable | Attendu | Justification |
|----------|---------|---------------|
| FL | 0.18-0.25 | Prose tres accessible |
| I | 0.60-0.75 | Protagoniste feminin fort, POV 1ere personne frequent |
| Omega | 0.70-0.80 | Resolution emotionnelle satisfaisante |
| T | 0.55-0.65 | Tension moderee (pas de suspense) |
| PVI attendu | 0.5-1.2 | BORDERLINE a PASS |

### Traductions (After, Twilight FR)

| Variable | Attendu | Justification |
|----------|---------|---------------|
| FL | 0.22-0.30 | Traduction lissee, vocabulaire standard |
| I | 0.50-0.70 | I perd en traduction (cf Fourth Wing FR I=0.46 vs EN I=0.86) |
| Omega | 0.65-0.78 | Resolution presente |
| T | 0.60-0.70 | Immersion variable selon traduction |
| PVI attendu | 0.4-0.8 | BORDERLINE (perte en I systematic) |

---

## Actions requises

1. Obtenir les epub/txt des 13 titres candidats
2. Scorer avec `py -3.11 pvi_module_autonome.py --input X.epub --lang fr --assisted`
3. Ajouter les resultats a `pvi_corpus_FR.csv`
4. Re-calibrer les coefficients FR si necessaire (si N_train change significativement)

---

## Observation cle : Bug I_proxy FR systematique

Les titres FR deja scores dans le batch 2022-2025 montrent des I tres bas :
- Serge : I=0.026 | Aneantir : I=0.079 | Vivre vite : I=0.153
- Sauve (Musso) : I=0.131 | La delicatesse : I=0.116

**I_proxy v2 (commit 8dc293fd) devrait rehausser ces scores.**
Une re-evaluation du batch complet avec v2 est recommandee.

---

**Standard : OMEGA NASA-Grade L4 / DO-178C Level A**
