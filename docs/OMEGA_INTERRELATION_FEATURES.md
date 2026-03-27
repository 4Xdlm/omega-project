# OMEGA — PHYSIQUE DES INTER-RELATIONS ENTRE FEATURES
**Date** : 2026-03-27
**Standard** : NASA-Grade L4 / DO-178C Level A
**Source** : 141 366 fenêtres 500w FR (Tier S/A/B/C) + audit multi-échelle 5 tailles
**Commits** : fca5923d (Angostura) + eacfedf2 (Hiérarchie) + interrelation audit
**Convergence** : Claude + ChatGPT + Gemini + Architecte

---

## RÉSUMÉ EXÉCUTIF

Ce document cartographie les inter-relations mesurées entre les 42 features
du corpus OMEGA. L'objectif : comprendre comment chaque "ingrédient" du cocktail
littéraire influence tous les autres, et identifier les leviers réels du moteur.

**Découverte fondamentale** : Le système littéraire est un jeu à somme quasi-nulle
entre deux blocs antagonistes. Les Maîtres ne maximisent pas un bloc — ils ALTERNENT.

---

## PARTIE 1 — LES DEUX BLOCS ANTAGONISTES

L'analyse de corrélation Spearman sur 141K fenêtres FR à 500w révèle deux
clusters de features fortement corrélées en interne et anti-corrélées entre elles.

### BLOC AMPLE (style littéraire, phrases longues)

Features qui montent ENSEMBLE :

```
semicolon_count ←→ std_sent_len ←→ f1a_rhythm_variance ←→ f26b_long_sent_rate
      ↕                  ↕                   ↕                     ↕
sub_per_sentence ←→ longest_sent_words ←→ f24c_contrast_delta ←→ ratio_alt
      ↕                  ↕
f9a_contradiction_rate ←→ mean_sent_len
```

Effet sur les axes du scorer :
- **ECC** (Émotion) : AIDE (r = +0.28 à +0.65)
- **SII** (Immersion) : AIDE (r = +0.23 à +0.90)
- **IFI** (Tension/Hooks) : **NUIT** (r = -0.15 à -0.41)

### BLOC PERCUTANT (accroche, phrases courtes)

Features qui montent ENSEMBLE :

```
dash_count ←→ excl_count ←→ quest_count ←→ ellipsis_count
      ↕              ↕             ↕
dialogue_ratio ←→ knife_rate ←→ f17_knife_count
      ↕
f35c_hook_score
```

Effet sur les axes :
- **IFI** (Tension) : AIDE (r = +0.17 à +0.29)
- **RCI** (Rythme) : AIDE (r = +0.12 à +0.36)
- **ECC** (Émotion) : **NUIT** (r = -0.16 à -0.23)
- **SII** (Immersion) : **NUIT** (r = -0.18 à -0.44)

### LE CONFLIT FONDAMENTAL

Quand le Bloc Ample monte → IFI baisse.
Quand le Bloc Percutant monte → ECC et SII baissent.

**C'est la raison physique pour laquelle RCI plafonne à 82-84 sur Menace/Révélation.**
Le scorer demande les deux blocs simultanément. Les Maîtres résolvent ce conflit
par l'ALTERNANCE (ratio_alt), pas par la maximisation simultanée.

---

## PARTIE 2 — TOP CORRÉLATIONS SPEARMAN (141K fenêtres)

### Corrélations fortes positives (>+0.80)

| Feature A | Feature B | ρ | Interprétation |
|-----------|-----------|---|----------------|
| std_sent_len | f1a_rhythm_variance | **+1.000** | IDENTIQUES mathématiquement |
| cv_sent | f19a_approx_entropy | **+1.000** | IDENTIQUES mathématiquement |
| knife_rate | f17_knife_count | +0.973 | f17 = compteur absolu de knife_rate |
| std_sent_len | longest_sent_words | +0.949 | La plus longue phrase drive la variance |
| std_sent_len | f24c_contrast_delta | +0.934 | Plus de variance = plus de contraste |
| std_sent_len | f26b_long_sent_rate | +0.907 | Variance → phrases longues |
| mean_sent_len | f24c_contrast_delta | +0.862 | Phrases longues → plus de contraste |
| f26b_long_sent_rate | mean_sent_len | +0.851 | Phrases longues ↔ longueur moyenne |
| f9a_contradiction_rate | mean_sent_len | +0.811 | Phrases longues → plus de contradictions |
| longest_sent_words | mean_sent_len | +0.801 | Logique |

### Corrélations fortes négatives (<-0.70)

| Feature A | Feature B | ρ | Interprétation |
|-----------|-----------|---|----------------|
| mean_sent_len | f17_knife_count | **-0.901** | Plus les phrases sont longues, moins de couteaux |
| mean_sent_len | knife_rate | -0.787 | Idem en ratio |
| f9a_contradiction | f17_knife_count | -0.727 | Texte complexe ≠ texte haché |
| sub_per_sentence | mean_sent_len | +0.713 | Subordination = longueur |

### REDONDANCES DÉTECTÉES

| Paire | ρ | Action recommandée |
|-------|---|-------------------|
| std_sent_len ↔ f1a_rhythm_variance | **+1.000** | **RETIRER L'UNE DES DEUX** — strictement identiques |
| cv_sent ↔ f19a_approx_entropy | **+1.000** | **RETIRER L'UNE DES DEUX** — strictement identiques |
| f17_knife_count ↔ knife_rate | +0.973 | Garder knife_rate uniquement (comparable entre tailles) |
| f26c_period_score ↔ f26b | médiation 97% | **RETIRER f26c** — pur proxy |

---

## PARTIE 3 — MATRICE D'ÉLASTICITÉ

**Question** : Quand feature X monte de +1 écart-type (standardisé), de combien
bouge feature Y ?

Valeurs = coefficients de régression linéaire standardisée (β).

### Effet des 5 principaux drivers sur les features structurelles

| Cible | semicolon | dash | excl | dialogue | f1a_rhythm |
|-------|-----------|------|------|----------|------------|
| **f26b** (phrases longues) | **+0.326** | -0.321 | -0.147 | -0.089 | **+0.619** |
| **mean_sent_len** | **+0.299** | -0.355 | -0.177 | -0.048 | **+0.850** |
| **cv_sent** (contraste) | +0.189 | -0.028 | +0.180 | +0.062 | **+0.513** |
| **knife_rate** | -0.241 | **+0.541** | **+0.340** | +0.239 | -0.266 |
| **ratio_alt** (alternance) | **+0.249** | -0.289 | -0.013 | -0.117 | **+0.320** |
| **sub_per_sentence** | +0.153 | -0.233 | -0.173 | -0.044 | **+0.639** |
| **f17_knife_count** | -0.262 | **+0.557** | **+0.303** | +0.220 | -0.306 |
| f29d_ttr (vocabulaire) | +0.021 | -0.013 | +0.012 | -0.013 | +0.056 |
| **f24c_contrast** | **+0.361** | -0.405 | -0.107 | -0.183 | **+0.429** |
| **f35c_hook** | -0.192 | **+0.386** | **+0.298** | +0.166 | -0.337 |
| f36c_cliff | -0.114 | +0.072 | +0.056 | -0.001 | -0.286 |

### Lecture de la matrice

**semicolon_count (+1σ)** : f26b monte de 0.33σ, mean_sent_len de 0.30σ, ratio_alt de 0.25σ.
Les couteaux baissent de 0.26σ, les hooks de 0.19σ. C'est le levier littéraire par excellence.

**dash_count (+1σ)** : knife_rate monte de 0.54σ, hooks de 0.39σ. Mais f26b baisse de 0.32σ
et mean_sent baisse de 0.36σ. C'est le levier de percussion — inverse exact du semicolon.

**f1a_rhythm_variance (+1σ)** : f26b monte de 0.62σ, mean_sent de 0.85σ, sub de 0.64σ.
C'est le MÉGA-LEVIER. Mais hooks baissent de 0.34σ et cliff de 0.29σ. Prix à payer.

**Constat critique** : f29d_ttr ne bouge pour AUCUN driver (max β = 0.056).
Le vocabulaire est INDÉPENDANT du style syntaxique. Confirmé.

---

## PARTIE 4 — TABLE DE PROPORTIONNALITÉ CONCRÈTE

**Question de l'Architecte** : "Quand on monte semicolon de 0.25, qu'est-ce qui bouge ?"

Méthode : chez les Maîtres (Tier S), découper en HAUT (au-dessus de la médiane)
vs BAS (en dessous) pour chaque driver, et mesurer le delta sur les cibles.

### Quand semicolon_count passe de P25=1 à P75=5 chez les Maîtres

| Cible | Bas (≤ médiane) | Haut (> médiane) | Delta | % |
|-------|-----------------|------------------|-------|---|
| f26b (phrases longues) | 0.077 | 0.118 | **+0.041** | **+54%** |
| mean_sent_len | 18.9 | 21.9 | +3.0 | +16% |
| ratio_alt (alternance) | 0.058 | 0.072 | +0.014 | +24% |
| f24c_contrast | 27.1 | 32.5 | +5.4 | +20% |
| knife_rate | 0.156 | 0.121 | -0.035 | **-22%** |
| f17_knife_count | 6.1 | 3.8 | -2.3 | **-38%** |
| f35c_hook | 0.565 | 0.532 | -0.033 | -6% |
| cv_sent | 0.717 | 0.733 | +0.017 | +2% |

**Traduction humaine** : Un Maître qui utilise beaucoup de points-virgules a
54% de phrases longues en plus, 38% de couteaux en moins, et 24% d'alternance
en plus. Il PERD 6% de hooks. C'est le prix du style ample.

### Quand dash_count passe de P25=0 à P75=3 chez les Maîtres

| Cible | Bas | Haut | Delta | % |
|-------|-----|------|-------|---|
| f26b | 0.105 | 0.089 | -0.016 | **-15%** |
| mean_sent_len | 21.3 | 19.3 | -2.1 | -10% |
| knife_rate | 0.117 | 0.162 | +0.045 | **+38%** |
| f17_knife_count | 4.1 | 6.0 | +2.0 | **+49%** |
| f35c_hook | 0.526 | 0.574 | +0.047 | **+9%** |
| cv_sent | 0.706 | 0.746 | +0.040 | +6% |

**Traduction** : Un Maître qui utilise des tirets cadratins a 49% de couteaux
en plus, 9% de hooks en plus, mais 15% de phrases longues en moins.
C'est le levier de percussion.

### Quand sub_per_sentence passe de P25=0.49 à P75=1.03 chez les Maîtres

| Cible | Bas | Haut | Delta | % |
|-------|-----|------|-------|---|
| f26b | 0.048 | 0.147 | **+0.099** | **+205%** |
| mean_sent_len | 15.9 | 24.9 | +9.0 | **+56%** |
| knife_rate | 0.183 | 0.094 | -0.089 | **-49%** |
| f17_knife_count | 7.5 | 2.5 | -5.0 | **-67%** |
| ratio_alt | 0.056 | 0.074 | +0.018 | +33% |
| f35c_hook | 0.595 | 0.502 | -0.093 | **-16%** |
| f24c_contrast | 25.0 | 34.5 | +9.5 | +38% |

**Traduction** : La subordination est le MÉGA-LEVIER. Un Maître à forte
subordination a 205% de phrases longues en plus et 67% de couteaux en moins.
C'est la feature qui transforme une prose plate en prose littéraire.
Mais elle tue les hooks (-16%).

### Quand f1a_rhythm_variance passe de P25=9.7 à P75=16.3 chez les Maîtres

| Cible | Bas | Haut | Delta | % |
|-------|-----|------|-------|---|
| f26b | 0.026 | 0.168 | **+0.142** | **+540%** |
| mean_sent_len | 15.1 | 25.6 | +10.5 | **+70%** |
| cv_sent | 0.650 | 0.799 | +0.149 | +23% |
| knife_rate | 0.167 | 0.110 | -0.057 | -34% |
| ratio_alt | 0.041 | 0.088 | +0.047 | **+116%** |
| f17_knife_count | 7.2 | 2.9 | -4.3 | -60% |
| f35c_hook | 0.608 | 0.489 | -0.119 | **-20%** |
| f24c_contrast | 21.5 | 38.0 | +16.5 | **+77%** |

**Traduction** : f1a_rhythm_variance est le SUPER-LEVIER. +540% de f26b,
+116% d'alternance, +77% de contraste. Mais -20% de hooks.

---

## PARTIE 5 — INTERACTIONS MULTIPLICATIVES

Certaines paires de features ont un effet qui DÉPASSE la simple addition.
Le produit (X × Y) prédit mieux le tier que (X + Y).

### Top interactions détectées

| Paire | R² additif | R² avec interaction | Gain R² | Coefficient |
|-------|-----------|--------------------|---------| ------------|
| **std_sent_len × f1a_rhythm** | 0.070 | **0.136** | **+0.067** | -0.030 |
| **std_sent_len × sub_per_sentence** | 0.070 | **0.098** | +0.028 | -0.022 |
| **semicolon × std_sent_len** | 0.205 | **0.233** | +0.028 | -0.069 |
| **semicolon × f1a_rhythm** | 0.205 | **0.233** | +0.028 | -0.069 |
| dialogue × f16a_bigram | 0.091 | 0.112 | +0.021 | -0.105 |
| semicolon × sub_per_sentence | 0.194 | 0.203 | +0.009 | -0.069 |
| excl × sub_per_sentence | 0.048 | 0.056 | +0.008 | +0.205 |
| semicolon × dash | 0.335 | 0.341 | +0.005 | +0.128 |

### Interprétation du coefficient d'interaction

**std_sent_len × f1a_rhythm = -0.030** : Quand les deux sont hauts simultanément,
le tier BAISSE. C'est le point de bascule : trop de variance + trop de longueur
= excès verbeux, pas génie. Il y a un OPTIMUM, pas un maximum.

**semicolon × std_sent_len = -0.069** : Même effet. Trop de points-virgules
COMBINÉS avec trop de variance = style maniéré, pas littéraire.

**excl × sub_per_sentence = +0.205** : L'exclamation COMBINÉE avec la subordination
est POSITIVE. C'est le style "Céline" — exclamatif ET complexe. Rare, puissant.

**semicolon × dash = +0.128** : Utiliser les deux (semicolons ET tirets) est
PLUS efficace que l'un sans l'autre. C'est l'alternance des outils de ponctuation.

### LOI OMEGA DÉDUITE

> Il existe un optimum, pas un maximum. Les meilleurs textes ne maximisent pas
> une feature — ils trouvent l'ÉQUILIBRE entre les blocs antagonistes.
> Trop de variance + trop de longueur = excès. Le coefficient d'interaction
> négatif (-0.030) en est la preuve mathématique.

---

## PARTIE 6 — CHAÎNES CAUSALES (MÉDIATION)

### Méthode

Pour chaque chaîne X → Médiateur → Tier, on mesure :
- **Effet total** (c) : X → Tier directement
- **Effet indirect** (a×b) : X → Médiateur → Tier
- **Effet direct** (c') : X → Tier en contrôlant le médiateur
- **Médiation %** = |indirect / total| × 100

### Chaînes principales

| Source | → | Médiateur | → | Tier | Médiation | Type |
|--------|---|-----------|---|------|-----------|------|
| std_sent_len | → | mean_sent_len | → | Tier | **106%** | AMPLIFICATION |
| std_sent_len | → | f26b | → | Tier | **65%** | AMPLIFICATION |
| excl_count | → | mean_sent_len | → | Tier | **62%** | SUPPRESSION |
| excl_count | → | f26b | → | Tier | **54%** | SUPPRESSION |
| ellipsis_count | → | mean_sent_len | → | Tier | **47%** | AMPLIFICATION |
| ellipsis_count | → | f26b | → | Tier | **44%** | AMPLIFICATION |
| excl_count | → | sub_per_sentence | → | Tier | **35%** | SUPPRESSION |
| excl_count | → | cv_sent | → | Tier | **33%** | AMPLIFICATION |
| colon_count | → | ratio_alt | → | Tier | **31%** | AMPLIFICATION |
| std_sent_len | → | ratio_alt | → | Tier | **30%** | AMPLIFICATION |

### Interprétation des médiations

**std_sent_len → mean_sent_len → Tier (106%)** : L'effet de la variance sur le
tier passe ENTIÈREMENT par la longueur moyenne. La variance n'a pas d'effet
propre une fois qu'on contrôle la longueur — elle agit UNIQUEMENT via la
longueur. Médiation de 106% = effet de suppression (l'effet direct s'inverse).

**excl_count → mean_sent_len → Tier (62%, SUPPRESSION)** : L'exclamation aide
le tier directement (les bons auteurs exclamant) mais NUIT via mean_sent_len
(les exclamations raccourcissent les phrases). L'effet net est positif mais
le mécanisme est complexe. C'est un SUPPRESSEUR classique.

**colon_count → ratio_alt → Tier (31%)** : Les deux-points (dialogue, listes)
augmentent l'alternance, qui elle-même aide le tier. 31% de l'effet passe
par ce chemin.

### Architecture des flux

```
ÉTAGE 3 (Atomique — Ponctuation)
  semicolon_count ───────┐
  colon_count ──────────┐│
  dash_count ──────────┐││
  excl_count ─────────┐│││
  ellipsis_count ────┐││││
                     ↓↓↓↓↓
ÉTAGE 2 (Mécanique — Syntaxe)
  sub_per_sentence ←──── semicolon (médiation 17%)
  ratio_alt ←──────────── colon (médiation 31%)
  knife_rate ←─────────── dash, excl
                     ↓↓↓
ÉTAGE 1 (Style — Régime)
  f26b_long_sent_rate ←── sub_per_sentence (médiation 136% via f26b)
  mean_sent_len ←──────── std_sent_len (médiation 106%)
  f1a_rhythm_variance ←── (identique à std_sent_len)
  f24c_contrast_delta ←── f1a (ρ = +0.934)
                     ↓↓↓
ÉTAGE 0 (Impact — Axes)
  ECC ←── f26b, mean_sent, semicolon
  SII ←── sub_per_sentence, mean_sent
  IFI ←── dash, excl, knife_rate, hook
  RCI ←── ratio_alt, cv_sent, knife_rate
```

---

## PARTIE 7 — INVARIANCE PAR ÉCHELLE

L'audit hiérarchique multi-échelle (200/500/1000/2000/full, FR-only)
confirme que les top drivers sont INVARIANTS.

### Top 5 par taille (importance de permutation)

| Rang | @200w | @500w | @1000w | @2000w | @Full |
|------|-------|-------|--------|--------|-------|
| 1 | **semicolon** (0.259) | **semicolon** (0.419) | **semicolon** (0.442) | **semicolon** (0.402) | **semicolon** (0.297) |
| 2 | **dash** (0.161) | **dash** (0.216) | **dash** (0.279) | **dash** (0.212) | **dash** (0.247) |
| 3 | dialogue (0.113) | excl (0.077) | excl (0.094) | excl (0.124) | **mean_para_len** (0.158) |
| 4 | excl (0.061) | dialogue (0.072) | dialogue (0.090) | **f1a_rhythm** (0.078) | dialogue (0.102) |
| 5 | ellipsis (0.052) | colon (0.053) | colon (0.059) | dialogue (0.077) | ellipsis (0.086) |

### Constats

1. **semicolon + dash = invariants absolus** — rang #1 et #2 de 200w au chapitre entier
2. **R² monte avec la taille** : 0.20 (200w) → 0.30 (500w) → 0.34 (1000w) → 0.39 (2000w)
3. **f1a_rhythm_variance ÉMERGE à 2000w** (rang #4) — le rythme discrimine sur le long
4. **mean_para_len SURGIT au chapitre** (rang #3) — la structure macro n'est visible qu'à cette échelle
5. **cv_para SURGIT au chapitre** (rang #6) — variation paragraphes = signal chapitre uniquement

---

## PARTIE 8 — CLASSIFICATION DES 42 FEATURES

### Par rôle fonctionnel

| Rôle | N | Features | Définition |
|------|---|----------|-----------|
| **DRIVER** | 13 | semicolon, dash, excl, dialogue, colon, ellipsis, std_sent_len, f1a_rhythm, sub_per_sentence, f16a_bigram, quest, longest_sent_words, f9a_contradiction | Importance permutation > 0.01, influence directe sur tier |
| **CONFLICT** | 15 | mean_sent_len, f26b, f17, knife_rate, ratio_alt, f24c_contrast, range_sent, n_long, n_short, longest_run_long, longest_run_short, shortest_sent, sentence_count, median_sent, f1_mean | Aide un axe, nuit à un autre |
| **THERMOMETER** | 3 | f29d_ttr, f35c_hook, f36c_cliff | Stable mais ne discrimine pas le tier |
| **CONDITIONAL** | 3 | cv_sent, f19a_entropy, f1b_ratio | Influence modérée, contextuelle |
| **MEDIATOR** | 1 | f26c_period_score | 97% médié par f26b — pur proxy |
| **NOISE** | 7 | words, paragraph_count, mean_para_len*, std_para_len*, cv_para*, T_LC, T_CL | Aucune influence à 500w |

*Note : mean_para_len et cv_para sont NOISE à 500w mais deviennent DRIVERS au chapitre entier.

### Par bloc antagoniste

| Bloc | Features DRIVERS | Effet sur axes |
|------|-----------------|----------------|
| **AMPLE** | semicolon, sub_per_sentence, f1a_rhythm, f9a_contradiction, longest_sent_words | ECC↑ SII↑ IFI↓ |
| **PERCUTANT** | dash, excl, quest, ellipsis, dialogue_ratio | IFI↑ RCI↑ ECC↓ SII↓ |
| **NEUTRE** | colon, f16a_bigram, std_sent_len | Pas de bloc clair |

---

## PARTIE 9 — REDONDANCES À ÉLIMINER

| Paire redondante | ρ Spearman | Action |
|------------------|-----------|--------|
| std_sent_len ↔ f1a_rhythm_variance | **+1.000** | Garder f1a (plus interprétable) |
| cv_sent ↔ f19a_approx_entropy | **+1.000** | Garder cv_sent (plus simple) |
| f26c_period_score ↔ f26b | médiation 97% | Garder f26b (plus discriminant) |
| f17_knife_count ↔ knife_rate | +0.973 | Garder knife_rate (comparable entre tailles) |
| f1_mean ↔ mean_sent_len | +0.999 | Garder mean_sent_len (standard) |

Après élimination : 42 - 5 = **37 features utiles**, dont 13 DRIVERS.

---

## PARTIE 10 — IMPLICATIONS POUR LE MOTEUR OMEGA

### 10.1 Pour le Scorer

1. **Intégrer semicolon_count et dash_count** — les 2 premiers prédicteurs universels,
   absents des axes actuels du scorer
2. **Retirer f26c, f19a, std_sent_len, f1_mean, f17_knife_count** — redondants
3. **Modéliser les INTERACTIONS** — le produit (std_sent × f1a) double le R²
4. **Pondérer IFI selon le type de scène** — le conflit ECC/SII vs IFI est structurel

### 10.2 Pour le Prompt/Scribe

1. **La subordination est le méga-levier** — "+205% de f26b" quand sub monte.
   Instruction prompt : "utilise des subordonnées, des incises, des relatives"
2. **Le point-virgule est le marqueur #1** — instruction prompt : "utilise des
   constructions avec point-virgule pour les enchaînements complexes"
3. **L'alternance semicolon + dash est synergique** (interaction +0.128) —
   mélanger les outils de ponctuation produit un meilleur résultat

### 10.3 Pour le diagnostic Menace/Révélation

Le bloqueur RCI à 82-84 s'explique maintenant :
- Le prompt V4 demande implicitement des phrases longues (Bloc Ample)
- Ce qui tue les hooks (IFI baisse)
- Ce qui réduit les couteaux (RCI perd en contraste)
- La variante C (system prompt enrichi) contourne ce problème en produisant
  des phrases longues MIEUX ÉCRITES (sub + semicolon hauts) → RCI monte quand même

---

## PARTIE 11 — LOIS SCELLÉES

### LOI L33 (candidate) — Le conflit structurel

> Les features littéraires sont organisées en deux blocs antagonistes
> (AMPLE vs PERCUTANT). Quand un bloc monte, l'autre baisse. Les Maîtres
> ne maximisent pas un bloc — ils trouvent l'ÉQUILIBRE par l'alternance.
> Le coefficient d'interaction négatif (std×f1a = -0.030) prouve
> l'existence d'un OPTIMUM, pas d'un maximum.

### LOI L34 (candidate) — Les invariants de ponctuation

> semicolon_count et dash_count sont les deux premiers prédicteurs
> du tier littéraire à TOUTE échelle (200w à chapitre entier).
> Ce sont des INVARIANTS STRUCTURAUX du style, pas des artefacts
> de petite fenêtre.

### LOI L35 (candidate) — La hiérarchie des leviers

> La subordination (sub_per_sentence) est le méga-levier :
> +205% de f26b, +56% de mean_sent_len, -67% de f17_knife.
> Le point-virgule (semicolon) est le marqueur de surface :
> +54% de f26b, -38% de f17. L'influence descend par étages :
> Ponctuation → Syntaxe → Régime → Impact.

---

*Document produit le 2026-03-27*
*Standard NASA-Grade L4 / DO-178C Level A*
*141 366 fenêtres FR 500w + audit multi-échelle 5 tailles*
*Convergence : Claude + ChatGPT + Gemini + Francky*
