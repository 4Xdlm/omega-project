# ARCHEOLOGIE DES BRIQUES SAGA_READY — Etape 0
**Date** : 2026-03-27
**Methode** : Analyse pure sur donnees existantes. Zero generation. Zero API.
**Sources** : sessions/BESTOF3_2026-03-26T13-39-57/ + TELEMETRY5 + TELEMETRY

---

## PARTIE 1 — C1 : Les 3 briques GAGNANTES (SAGA_READY)

### Tableau de metriques

| Brique | Words | Sents | f26b | f17 | f1a | cv | mean | Trans_LC | Trans_CL | Ratio_alt |
|---|---|---|---|---|---|---|---|---|---|---|
| contemplation (93.2) SAGA | 475 | 14 | 0.500 | 5 | 819 | 0.844 | 33.9 | 1 | 1 | 14.3% |
| confrontation (92.1) SAGA | 605 | 23 | 0.304 | 11 | 755 | 1.045 | 26.3 | 2 | 0 | 8.7% |
| souvenir (92.4) SAGA | 602 | 20 | 0.300 | 4 | 489 | 0.734 | 30.1 | 2 | 2 | 20.0% |

### Distribution des longueurs de phrases

- **contemplation** : [7, 13, 59, 71, 44, 47, 6, 3, 9, 14, 8, 89, 58, 47]
  - Pattern : COURT-moyen-LONG-LONG-LONG-LONG-COURT-COURT-COURT-moyen-COURT-LONG-LONG-LONG
  - Alternance nette : bloc long (3-6) -> bloc court (7-11) -> bloc long (12-14)

- **confrontation** : [24, 28, 57, 87, 54, 59, 7, 1, 1, 6, 5, 4, 4, 1, 7, 6, 10, 47, 84, 51, 3, 28, 31]
  - Pattern : moyen-LONG-LONG-LONG-LONG-COURT(x8)-moyen-LONG-LONG-LONG-COURT-moyen
  - Alternance en BLOCS : un seul grand changement de regime (long->court->long)

- **souvenir** : [46, 38, 39, 1, 10, 82, 20, 1, 67, 9, 56, 24, 43, 17, 4, 29, 27, 15, 29, 45]
  - Pattern : LONG-moyen-moyen-COURT-moyen-LONG-moyen-COURT-LONG-COURT-LONG-moyen-LONG-moyen-COURT-moyen-moyen-moyen-moyen-LONG
  - Alternance DISTRIBUEE : transitions frequentes tout au long du texte

### Reponse a la question cle

Les 3 briques SAGA_READY ont une alternance naturelle :
- contemplation : ratio_alt = 14.3%
- confrontation : ratio_alt = 8.7%
- souvenir : ratio_alt = 20.0%
- **Moyenne gagnantes : 14.3%**

---

## PARTIE 2 — C2 : Tous les candidats Duel (telemetrie)

### Tableau complet (24 candidats : 6 scenes x 4 modes)

| Source | Scene | Mode | Words | f26b | f17 | f1a | cv | mean | Cohab f17>=4+f26b>=0.15 |
|---|---|---|---|---|---|---|---|---|---|
| TEL5 | contemplation | loop_refined | 466 | 0.500 | 1 | 217 | 0.380 | 38.8 | NON |
| TEL5 | contemplation | tranchant_minimaliste | 380 | 0.500 | 6 | 730 | 0.853 | 31.7 | OUI |
| TEL5 | contemplation | sensoriel_dense | 501 | 0.353 | 7 | 745 | 0.926 | 29.5 | OUI |
| TEL5 | contemplation | experimental_signature | 415 | 0.385 | 6 | 1031 | 1.006 | 31.9 | OUI |
| TEL5 | confrontation | loop_refined | 581 | 0.054 | 15 | 165 | 0.827 | 15.5 | NON |
| TEL5 | confrontation | tranchant_minimaliste | 365 | 0.500 | 4 | 984 | 0.859 | 36.5 | OUI |
| TEL5 | confrontation | sensoriel_dense | 464 | 0.500 | 5 | 1063 | 0.843 | 38.7 | OUI |
| TEL5 | confrontation | experimental_signature | 453 | 0.357 | 8 | 1240 | 1.088 | 32.4 | OUI |
| TEL5 | souvenir | loop_refined | 578 | 0.700 | 0 | 1017 | 0.552 | 57.8 | NON |
| TEL5 | souvenir | tranchant_minimaliste | 396 | 0.462 | 6 | 790 | 0.922 | 30.5 | OUI |
| TEL5 | souvenir | sensoriel_dense | 385 | 0.500 | 5 | 636 | 0.786 | 32.1 | OUI |
| TEL5 | souvenir | experimental_signature | 427 | 0.500 | 6 | 942 | 0.864 | 35.5 | OUI |
| TEL5 | menace | loop_refined | 389 | 0.000 | 2 | 53 | 0.391 | 18.5 | NON |
| TEL5 | menace | tranchant_minimaliste | 381 | 0.333 | 6 | 1136 | 1.061 | 31.8 | OUI |
| TEL5 | menace | sensoriel_dense | 387 | 0.417 | 7 | 1082 | 1.020 | 32.2 | OUI |
| TEL5 | menace | experimental_signature | 353 | 0.455 | 5 | 955 | 0.963 | 32.1 | OUI |
| TEL5 | revelation | loop_refined | 847 | 0.625 | 1 | 997 | 0.597 | 52.9 | NON |
| TEL5 | revelation | tranchant_minimaliste | 368 | 0.400 | 7 | 526 | 0.935 | 24.5 | OUI |
| TEL5 | revelation | sensoriel_dense | 409 | 0.462 | 6 | 754 | 0.873 | 31.5 | OUI |
| TEL5 | revelation | experimental_signature | 358 | 0.462 | 7 | 641 | 0.919 | 27.5 | OUI |
| TEL1 | contemplation | loop_refined | 364 | 1.000 | 0 | 623 | 0.274 | 91.0 | NON |
| TEL1 | contemplation | tranchant_minimaliste | 466 | 0.333 | 5 | 888 | 0.959 | 31.1 | OUI |
| TEL1 | contemplation | sensoriel_dense | 474 | 0.500 | 5 | 1847 | 0.907 | 47.4 | OUI |
| TEL1 | contemplation | experimental_signature | 443 | 0.417 | 6 | 1616 | 1.089 | 36.9 | OUI |

### Resultats

```
Candidats avec f17>=4 ET f26b>=0.15 : 18 sur 24 total (75.0%)

Cohabitation par MODE :
  tranchant_minimaliste        : 6/6 = 100%
  sensoriel_dense              : 6/6 = 100%
  experimental_signature       : 6/6 = 100%
  loop_refined                 : 0/6 = 0%

Mode le plus alternant  : tranchant/sensoriel/experimental (100% tous les trois)
Mode le moins alternant : loop_refined (0%)
```

**Constat majeur** : loop_refined est le SEUL mode qui echoue systematiquement a produire la cohabitation. Il produit soit tout-long (f26b eleve, f17=0-1) soit tout-court (f26b bas, f17 eleve), jamais les deux.

---

## PARTIE 3 — C1b : Gagnantes vs Perdantes

### Moyennes comparees

| Groupe | Words | f26b | f17 | f1a | cv | mean | Trans | Ratio_alt |
|---|---|---|---|---|---|---|---|---|
| GAGNANTES (3) | 561 | 0.368 | 6.7 | 688 | 0.874 | 30.1 | 2.7 | 14.3% |
| PERDANTES (2) | 438 | 0.348 | 5.5 | 604 | 0.808 | 30.2 | 1.5 | 10.5% |

### Deltas

| Metrique | Gagnantes | Perdantes | Delta |
|---|---|---|---|
| f26b | 0.368 | 0.348 | +0.020 |
| f17 | 6.7 | 5.5 | +1.2 |
| f1a | 688 | 604 | +84 |
| cv | 0.874 | 0.808 | +0.066 |
| mean | 30.1 | 30.2 | -0.1 |
| ratio_alt | 14.3% | 10.5% | +3.9% |
| **words** | **561** | **438** | **+123** |

### Analyse du VRAI differenciateur

1. **mean_sent_len** : quasi-identique (30.1 vs 30.2) — PAS un differenciateur
2. **f26b** : quasi-identique (0.368 vs 0.348) — PAS un differenciateur
3. **f17** : leger avantage gagnantes (+1.2) — FAIBLE differenciateur
4. **cv_sent** : avantage gagnantes (+0.066) — MODERE differenciateur
5. **f1a** : avantage gagnantes (+84) — MODERE differenciateur
6. **ratio_alt** : avantage gagnantes (+3.9%) — MODERE differenciateur
7. **words** : LE PLUS GROS DELTA (+123 mots, +28%) — FORT differenciateur

Le facteur dominant qui separe gagnantes de perdantes est le **NOMBRE DE MOTS**.
Les gagnantes ont en moyenne 561 mots vs 438 pour les perdantes.
Plus de mots = plus de phrases = plus d'espace pour la variance rythmique = meilleur score composite.

L'alternance est presente dans les DEUX groupes. Les gagnantes en ont legerement plus,
mais c'est une CONSEQUENCE du volume (plus de phrases = plus d'opportunites de transition),
pas une cause independante.

---

## VERDICT

### L'alternance existe-t-elle dans les gagnantes ?

**OUI** — ratio_alt moyen = 14.3% (> seuil 10%).

### L'alternance existe-t-elle dans les candidats Duel ?

**OUI massivement** — 75% des candidats ont la cohabitation f17>=4 + f26b>=0.15.
Les 3 modes stylises (tranchant, sensoriel, experimental) la produisent a 100%.
Seul loop_refined (0%) ne la produit jamais.

### Le moteur SAIT-il le faire stochastiquement ?

**OUI** — 3 modes sur 4 la produisent SYSTEMATIQUEMENT.
Le Duel lui-meme selectionne naturellement un mode alternant.

### Best-of-5 pourrait-il suffire sans modification ?

**OUI, SOUS CONDITION** : exclure ou deprioritiser loop_refined dans le Duel.
Avec les 3 autres modes, la cohabitation est garantie a 100%.

### Faut-il A1/B1/B3 ?

**NON** — L'alternance est deja un produit naturel du pipeline existant.
Le vrai levier pour passer de 90.3 (perdantes) a 92+ (gagnantes) est le **VOLUME** :
les briques gagnantes ont ~560 mots vs ~440 pour les perdantes.

### Recommandation

1. **STOP sur l'injection d'alternance** — elle est deja la
2. **INVESTIGUER le volume** — pourquoi menace/revelation produisent des textes plus courts
3. **Si best-of-N** : augmenter a best-of-5 pour maximiser les chances d'un candidat long + alternant
4. **Si loop_refined** : investiguer pourquoi ce mode produit des textes monotones (tout-long ou tout-court)
