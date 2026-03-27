# OMEGA — AUDIT BRUT MULTI-ECHELLE — RAPPORT COMPLET
**Date** : 2026-03-27
**Standard** : NASA-Grade L4 / DO-178C Level A
**Mode** : CALCUL PUR — 0 API — ZERO INTERPOLATION

---

## RESUME EXECUTIF

Audit multi-echelle recalcule integralement depuis le texte brut.
571 livres | 23 005 chapitres | 1 381 345 fenetres mesurees | 40 features | 5 tailles + chapitre entier.

### Resultats principaux

1. **6 features fiables des 200 mots** : f29d_ttr, f16a_bigram, cv_sent, f19a_entropy, f35c_hook, f36c_cliff
2. **4 features structurellement instables** a toute taille : f26b_long_sent_rate, ratio_alt, f1a_rhythm_variance, knife_rate
3. **1 inversion de correlation detectee** : f29d_ttr vs f16a_bigram (+ a 200w, - a 2000w)
4. **f17_knife_count est un compteur lineaire** (R2=1.000) — JAMAIS comparer entre tailles
5. **Les maitres (S) ecrivent des phrases 76% plus longues** et ont 11x plus de phrases longues

### Faits marquants vs audit precedent

| Fait | Audit precedent (interpole) | Audit brut (mesure directe) |
|------|----------------------------|----------------------------|
| Fenetres mesurees | 9050 (R1 data reutilise) | **1 381 345** (texte brut) |
| Livres analyses | 181 (R1) | **571** (tous) |
| Chapitres | non (fenetres fixes) | **23 005** (chapitres reels) |
| Tailles mandatees | interpolees | **mesurees directement** |
| Tier matching | 8/181 (4.4%) | **571/571 (100%)** |
| Inversions detectees | 0 | **1** (ttr vs bigram) |

---

## SECTION 1 — ARCHEOLOGIE

Voir `docs/MASTER_RAW_ARCHAEOLOGY.md` pour le detail complet.

**Rejete** : MASTER_SCALE_LADDER.json, MASTER_SCALE_AUDIT.md (interpolations).
**Reutilise** : textes bruts (corpus_r/txt/), tiers (CORPUS_FEATURES_MASTER.json), regex de extraction.

---

## SECTION 2 — METHODE

- **Source** : 571 fichiers .txt dans omega-autopsie/corpus_r/txt/ (404 MB)
- **Split chapitres** : regex CHAPITRE/CHAPTER/LIVRE/BOOK/PART/PARTIE + numeraux
- **Split phrases** : regex `(?<=[.!?…»])\s+`, minimum 6 caracteres
- **Fenetres glissantes** : stride 10%, cap 20 fenetres par chapitre/taille
- **Fenetres ancrees** : START/MIDDLE/END pour chaque taille
- **Features** : 40 calculees depuis texte brut, 19 marquees UNAVAILABLE
- **Seuils** : LONG >40w, SHORT <10w, KNIFE <=5w, TRANS_LONG >30w, TRANS_SHORT <10w

---

## SECTION 3 — FEATURES PAR TAILLE (moyennes globales)

| Feature | @200w | @500w | @700w | @1000w | @2000w | @full |
|---------|-------|-------|-------|--------|--------|-------|
| mean_sent_len | 19.36 | 19.45 | 19.37 | 19.35 | 19.57 | 19.26 |
| cv_sent | 0.679 | 0.706 | 0.714 | 0.724 | 0.741 | 0.739 |
| f26b_long_sent_rate | 0.093 | 0.094 | 0.093 | 0.092 | 0.094 | 0.088 |
| f17_knife_count | 2.68 | 6.27 | 8.62 | 12.11 | 23.76 | 33.55 |
| ratio_alt | 0.060 | 0.058 | 0.058 | 0.059 | 0.060 | 0.059 |
| f29d_ttr_score | 0.707 | 0.746 | 0.750 | 0.753 | 0.756 | 0.751 |
| f1a_rhythm_variance | 13.13 | 13.82 | 13.94 | 14.15 | 14.79 | 14.58 |

**Constats** :
- mean_sent_len, f26b, ratio_alt : **INVARIANTS PAR ECHELLE** (moyenne constante)
- f17_knife_count : **CROISSANCE LINEAIRE** (compteur)
- cv_sent : **CROIT LOGARITHMIQUEMENT** avec la taille
- f29d_ttr : **SAUTE a 500w** puis plateau (0.71 -> 0.75)

---

## SECTION 4 — CV PAR TAILLE

| Feature | CV@200 | CV@500 | CV@700 | CV@1000 | CV@2000 |
|---------|--------|--------|--------|---------|---------|
| f29d_ttr_score | 0.060 | 0.033 | 0.029 | 0.026 | 0.024 |
| f16a_bigram_rarity | 0.020 | 0.019 | 0.019 | 0.020 | 0.023 |
| f36c_cliff_score | 0.155 | 0.155 | 0.154 | 0.154 | 0.155 |
| cv_sent | 0.297 | 0.251 | 0.236 | 0.226 | 0.216 |
| f19a_approx_entropy | 0.297 | 0.248 | 0.233 | 0.223 | 0.210 |
| f35c_hook_score | 0.338 | 0.343 | 0.344 | 0.345 | 0.349 |
| mean_sent_len | 0.546 | 0.582 | 0.617 | 0.672 | 0.857 |
| knife_rate | 0.916 | 0.778 | 0.729 | 0.685 | 0.641 |
| ratio_alt | 1.536 | 1.110 | 0.993 | 0.889 | 0.735 |
| f26b_long_sent_rate | 1.576 | 1.365 | 1.322 | 1.279 | 1.199 |
| f1a_rhythm_variance | 0.718 | 0.776 | 0.805 | 0.895 | 1.296 |

---

## SECTION 5 — CORRELATIONS PAR TAILLE

| Paire | r@200 | r@500 | r@700 | r@1000 | r@2000 | Stable ? |
|-------|-------|-------|-------|--------|--------|----------|
| f26b vs f1a | +0.85 | +0.91 | +0.93 | +0.94 | +0.95 | OUI |
| mean vs f26b | +0.78 | +0.88 | +0.91 | +0.92 | +0.94 | OUI |
| mean vs f1a | +0.81 | +0.88 | +0.89 | +0.89 | +0.90 | OUI |
| f26b vs f17 | -0.52 | -0.70 | -0.74 | -0.77 | -0.80 | OUI (- fort) |
| f26b vs ratio_alt | +0.28 | +0.41 | +0.48 | +0.54 | +0.62 | OUI (monte) |
| **f29d_ttr vs f16a** | **+0.15** | **-0.29** | **-0.35** | **-0.41** | **-0.49** | **INVERSION** |

---

## SECTION 6 — TIERS (a 500w)

| Feature | S | A | B | C | D | rho_rank |
|---------|---|---|---|---|---|----------|
| mean_sent_len | 22.10 | 19.13 | 16.62 | 12.59 | 17.82 | fort + |
| f26b_long_sent_rate | 0.126 | 0.092 | 0.061 | 0.011 | 0.065 | fort + |
| f1a_rhythm_variance | 16.08 | 13.67 | 11.22 | 8.17 | 12.04 | fort + |
| ratio_alt | 0.070 | 0.059 | 0.046 | 0.026 | 0.033 | modere + |
| cv_sent | 0.726 | 0.713 | 0.674 | 0.655 | 0.697 | faible + |
| sub_per_sentence | 0.828 | 0.767 | 0.629 | 0.472 | 0.607 | fort + |
| f29d_ttr_score | 0.746 | 0.747 | 0.744 | 0.744 | 0.752 | nul |
| f16a_bigram_rarity | 0.952 | 0.952 | 0.952 | 0.956 | 0.947 | nul |

**Les 3 meilleurs discriminateurs tier** (mesures brutes, 500w) :
1. **mean_sent_len** : S = 22.1 vs C = 12.6 (delta = +76%)
2. **f26b_long_sent_rate** : S = 12.6% vs C = 1.1% (delta = +1050%)
3. **sub_per_sentence** : S = 0.83 vs C = 0.47 (delta = +75%)

Les features lexicales (TTR, bigram rarity) ne discriminent PAS les tiers.

---

## SECTION 7 — EQUATIONS

Voir `docs/MASTER_RAW_EQUATIONS.md` pour le detail.

6 equations avec R2 > 0.80. 3 features sans equation stable (f26b, ratio_alt, cv_para).

---

## SECTION 8 — WHAT IS PROVEN / REFUTED / UNKNOWN

### PROUVE

1. **6 features sont fiables des 200 mots.** Mesure directe sur 385K fenetres.
2. **f26b_long_sent_rate est le meilleur discriminateur tier** (10x plus chez les maitres).
3. **f17 est un compteur lineaire** — equation parfaite R2=1.000.
4. **ratio_alt et f26b sont invariants par echelle en moyenne** — leur valeur ne change pas avec la taille.
5. **1 inversion de correlation existe** (ttr vs bigram) — artefact de petite fenetre.
6. **23 005 chapitres reels** extraits de 571 livres — structure narrative respectee.

### REFUTE

1. ~~"Les features deviennent toutes meilleures avec la taille"~~ : FAUX. mean_sent_len et f1a ont un CV qui MONTE.
2. ~~"ratio_alt est fiable a grande echelle"~~ : FAUX. CV = 0.74 meme a 2000w.
3. ~~"f26b se stabilise a grande echelle"~~ : FAUX. CV > 1.0 a toute taille. Feature structurellement bimodale.
4. ~~"Pas d'inversion de correlation"~~ (precedent audit) : FAUX. ttr vs bigram s'inverse.

### INCONNU

1. Comportement des 19 features NLP/API (literary_index, description_score, etc.)
2. Transitions de type (detecteur en quarantaine)
3. Interaction position x taille x tier (triple croisement)
4. Stabilite par auteur (n insuffisant pour la plupart)
