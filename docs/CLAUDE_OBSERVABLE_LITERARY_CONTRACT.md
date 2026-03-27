# OMEGA — CONTRAT COMPORTEMENTAL OBSERVABLE DE CLAUDE SONNET
# EN ECRITURE LITTERAIRE FRANCAISE
**Date** : 2026-03-27
**Modele** : claude-sonnet-4-20250514
**Statut** : PRELIMINAIRE (consolidation existant, 0 API supplementaire)
**Standard** : OMEGA / NASA-Grade L4

---

## SECTION A — CE QUE CLAUDE FAIT SPONTANEMENT

Baseline mesuree sur 5 briques BESTOF3 (pipeline 19 etages, Duel 4 modes).

| Metrique | Moyenne | Std | Min | Max |
|----------|---------|-----|-----|-----|
| words | 512 | 86 | 418 | 605 |
| mean_sent_len | 31.6 | 1.9 | 29.9 | 33.9 |
| cv_sent | 0.800 | 0.119 | 0.626 | 0.915 |
| f26b_long_sent_rate | 0.376 | 0.090 | 0.267 | 0.500 |
| f17_knife_count | 2.4 | 1.5 | 1 | 4 |
| knife_rate | 0.147 | 0.088 | 0.056 | 0.267 |
| ratio_alt | 11.3% | 3.2% | 6.7% | 14.3% |
| semicolon_count | 0.2 | 0.4 | 0 | 1 |
| dash_count | 2.6 | 1.7 | 0 | 4 |
| sub_per_sentence | 1.70 | 0.11 | 1.53 | 1.80 |

**Profil spontane** : Prose a phrases moyennes-longues (~32 mots), haute subordination,
contraste modere (cv=0.80), peu de phrases-couteau (~2), alternance presente (11%),
quasi-absence de points-virgules, quelques tirets. Regime INTROSPECTIF par defaut.

### Profil par mode Duel (20 candidats, 5 briques)

| Mode | Words | f1_mean | f26b | f17 | cv_sent |
|------|-------|---------|------|-----|---------|
| loop_refined | 572 | 36.7 | 0.376 | 3.8 | 0.549 |
| tranchant_minimaliste | 378 | 31.0 | 0.439 | 5.8 | 0.926 |
| sensoriel_dense | 429 | 32.8 | 0.446 | 6.0 | 0.890 |
| experimental_signature | 401 | 31.9 | 0.432 | 6.4 | 0.968 |

**Les 3 modes stylises (tranchant/sensoriel/experimental)** produisent un profil SIMILAIRE :
~400 mots, mean ~32, f26b ~0.44, f17 ~6, cv ~0.93.
**loop_refined** est l'exception : plus long (572w), plus ample (f1=36.7), moins contraste (cv=0.55).

---

## SECTION B — CE QU'IL SAIT FAIRE SUR DEMANDE

Source : Rosetta pilotability audit (370 tests, modele claude-sonnet-4-20250514)

| Feature | Pilotabilite | Taux respect | Categorie |
|---------|-------------|-------------|-----------|
| f24e_contrast_score | **1.0** | 100% | SOLIDE — parfaitement controlable |
| f15b_redundancy | **1.0** | 100% | SOLIDE — obeit a la lettre |
| f16a_bigram_rarity | **1.0** | 100% | SOLIDE — obeit a la lettre |
| f36c_cliff_score | 0.0 | 100% | SOLIDE — le fait TOUJOURS (pas besoin de demander) |
| f35c_hook_score | 0.0 | 90% | SOLIDE — le fait quasi-toujours |
| f29d_ttr_score | **0.8** | 80% | SOLIDE — obeit generalement |
| f25g_description | 0.0 | 80% | AUTONOME — le fait sans instruction |
| **f17_knife_count** | **0.0** | **20%** | **ILLUSION DECLARATIVE** |

---

## SECTION C — CE QU'IL FAIT MAL OU PARTIELLEMENT

### C1. Puits gravitationnel INTROSPECTION (OBSERVE)

7 modes demandes, 7 fois INTROSPECTION produite. Le modele ne sait pas sortir de l'introspection.

| Demande | Produit | Distance au mode demande | Distance a INTROSPECTION |
|---------|---------|-------------------------|--------------------------|
| DESCRIPTION | INTROSPECTION | 0.819 | 0.645 |
| ACTION | INTROSPECTION | 8.286 | 5.476 |
| CONTEMPLATION | INTROSPECTION | 2.027 | 1.366 |
| LYRIQUE | INTROSPECTION | 1.196 | 0.975 |
| DIALOGUE | INTROSPECTION | 3.967 | 3.551 |
| TRANSITION | INTROSPECTION | 1.652 | 1.327 |

### C2. Illusion declarative f17 (OBSERVE)

Claude DECLARE ajouter des phrases-couteau (taux_respect = 20%), mais les donnees BESTOF3
montrent f17 = 2.4 en moyenne (sur ~15-20 phrases = 12-16% de knife_rate).
Le probleme n'est pas qu'il refuse — c'est qu'il ne COMPREND PAS la consigne comme operationnelle.

### C3. Micro-chirurgie = echec (OBSERVE)

Taux de succes phrase-par-phrase = 0%. Delta R6 = +0. La retouche fine ne fonctionne pas.

---

## SECTION D — CE QU'IL COMPRESSE / REINTERPRETE

### D1. Compression de volume (OBSERVE)

| Target | Produit moyen | Ratio |
|--------|--------------|-------|
| 500w | 302w | 60% |
| 750w | 357w | 48% |
| 1000w | 510w | 51% |

Claude produit systematiquement ~50-60% du volume demande. Le pipeline (Duel) compresse encore
via la selection de modes courts (~400w).

### D2. Normalisation modale (OBSERVE)

Les 3 modes stylises convergent vers un profil IDENTIQUE :
- mean ~31-33
- f26b ~0.43-0.45
- cv ~0.89-0.97

La "diversite" des modes est une illusion — seule la CV varie reellement.

---

## SECTION E — PLAFONDS MECANIQUES

| Plafond | Valeur observee | Evidence |
|---------|----------------|---------|
| Composite max (best-of-3) | 93.2 | Contemplation, 1 attempt |
| Composite moyen | 91.3 | Moyenne 5 briques |
| min_axis max | 88.4 | Contemplation |
| Menace composite max | 91.8 | Volume test @1000w |
| Revelation composite max | 91.6 | BESTOF3 attempt 1 |
| Volume max produit | ~600w | Pour 2500w demande |
| Micro-chirurgie | 0% succes | Rosetta |
| Modes distincts | 1 (INTROSPECTION) | 7/7 convergent |
| Semicolons spontanes | 0.2/texte | Baseline BESTOF3 |

---

## SECTION F — 10 LOIS EMERGENTES D'ECRITURE LITTERAIRE

### LOI L01 — PUITS D'INTROSPECTION [OBSERVE]
**Enonce** : Claude produit de l'INTROSPECTION quel que soit le mode demande.
**Confiance** : HAUTE (7/7 modes testes, n=370 tests Rosetta)
**Fragilise par** : Les textes BESTOF3 contiennent de l'action et de la description — le puits est reel mais pas absolu.
**Portee** : S'applique au premier tir sans contrainte forte.

### LOI L02 — ILLUSION DECLARATIVE [OBSERVE]
**Enonce** : f17 (phrases-couteau) est declare pilotable mais ne l'est pas (taux 20%).
**Confiance** : HAUTE (Rosetta + BESTOF3 convergent)
**Ne prouve pas** : Que TOUTES les features declarees soient illusoires — f24e est a 100%.

### LOI L03 — SEMICOLON = MARQUEUR #1 [OBSERVE]
**Enonce** : semicolon_count est le premier predicteur de qualite litteraire (imp=0.42).
**Confiance** : TRES HAUTE (141K fenetres, 5 tailles, invariant)
**Fragilise par** : Claude spontane produit tres peu de semicolons (0.2/texte).
**Portee** : Discrimine les MAITRES humains — pas encore teste comme levier de generation.

### LOI L04 — COMPRESSION SYSTEMATIQUE [OBSERVE]
**Enonce** : Claude produit 50-60% du volume demande.
**Confiance** : HAUTE (6 runs volume test, 5 BESTOF3)
**Ne prouve pas** : Que la compression est fixe — elle varie selon la scene.

### LOI L05 — MICRO-CHIRURGIE = ECHEC [OBSERVE]
**Enonce** : La retouche phrase-par-phrase ne fonctionne pas (0% succes).
**Confiance** : HAUTE (Rosetta)
**Ne prouve pas** : Que des approches alternatives (rewrite partiel, injection) echouent aussi.

### LOI L06 — f24e PARFAITEMENT PILOTABLE [OBSERVE]
**Enonce** : Le contraste lexical (alternance courtes/longues) est controlable a 100%.
**Confiance** : TRES HAUTE (Rosetta + corpus Angostura)
**Portee** : Seule feature 100% obediente identifiee.

### LOI L07 — TTR = THERMOMETRE [OBSERVE]
**Enonce** : La richesse lexicale (TTR) est stable mais ne discrimine pas les tiers.
**Confiance** : HAUTE (Angostura)
**Portee** : Utile pour la mesure, inutile pour le scoring.

### LOI L08 — CONFLIT ECC/SII vs IFI [INFERE]
**Enonce** : Les phrases longues (ECC+SII) tuent les hooks (IFI).
**Confiance** : MODEREE (26 features en conflit, mais mecanisme non teste directement)
**Portee** : Implique un arbitrage explicite dans le scorer.

### LOI L09 — PONCTUATION = 64% DU SIGNAL [OBSERVE]
**Enonce** : semicolon + dash capturent 64% de l'importance predictive.
**Confiance** : TRES HAUTE (Angostura 141K fenetres + hierarchie 5 tailles)
**Fragilise par** : Le scorer actuel ne mesure PAS la ponctuation.

### LOI L10 — R2 MONTE AVEC LA TAILLE [OBSERVE]
**Enonce** : La prediction de qualite s'ameliore de 0.20 (200w) a 0.39 (2000w).
**Confiance** : HAUTE (5 tailles mesurees)
**Portee** : Plus de texte = meilleure evaluation. Mais plateau a ~0.39.

---

## LIMITES DU CONTRAT PRELIMINAIRE

1. **n=5** pour la baseline BESTOF3 — insuffisant pour des lois definitives
2. **Rosetta ne couvre que 8 features** — les 32 autres sont inconnues
3. **Pas de gradient** — on ne sait pas comment le modele reagit a des consignes graduees
4. **Pas de test de conflit** — les paires antagonistes ne sont pas testees
5. **Pas de stabilite inter-run** — les 3 attempts BESTOF3 ne suffisent pas
6. **semicolon comme levier de generation** — non teste (seulement comme discriminant corpus)

## PROCHAINES ETAPES (API necessaire)

| Phase | Runs API | Objectif |
|-------|----------|---------|
| B1 — Baseline etendue | 30 | 10 types de scenes x 3 runs |
| B2 — Gradient semicolons | 15 | 5 niveaux x 3 runs |
| B3 — Gradient mean_sent_len | 15 | 5 niveaux x 3 runs |
| B4 — Conflits top 5 | 15 | 5 paires x 3 runs |
| B5 — Stabilite | 20 | 2 prompts x 10 runs |
| **TOTAL** | **~95** | |
