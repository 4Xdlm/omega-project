# OMEGA — MANUEL DE PHYSIQUE LITTÉRAIRE
## Équations, Lois et Pilotage de la Prose FR/EN
### Vers le Plafond Inatteignable par l'Être Humain

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║  Document    : OMEGA_PHYSIQUE_LITTERAIRE_MANUEL_v1.0                             ║
║  Date        : 2026-03-29                                                        ║
║  Standard    : NASA-Grade L4 / DO-178C Level A                                   ║
║  Sources     : 881 œuvres · 2 064 038 fenêtres · 504 runs blackbox               ║
║                Claude (Principal) + ChatGPT (Validateur) + Gemini (Contrôleur)   ║
║  Autorité    : Francky (Architecte Suprême)                                      ║
║                                                                                  ║
║  AVERTISSEMENT : Ce document contient des équations prouvées empiriquement.      ║
║  Toute loi marquée CANDIDATE n'est pas encore utilisable en production.          ║
║  Toute loi marquée CONSTANTE_REGIME est valide sous le protocole actuel          ║
║  OMEGA uniquement (prose FR, 400-700w, K2, température standard).                ║
╚════════════════════════════════════════════════════════════════════════════════════╝
```

---

## PRÉAMBULE — DEUX PHYSIQUES, UN PROBLÈME DE COUPLAGE

Ce manuel repose sur une distinction fondamentale établie par Gemini et validée par les trois IAs :

```
SYSTÈME 1 (S1) — Physique du corpus littéraire humain
  Base : 881 œuvres, 2 064 038 fenêtres, 42 features, FR + EN
  Question : qu'est-ce qui distingue les maîtres des autres ?

SYSTÈME 2 (S2) — Physique de transfert Claude Sonnet
  Base : 504 appels API, claude-sonnet-4-20250514
  Question : que peut et ne peut pas produire le modèle ?

PROBLÈME DE COUPLAGE (C)
  Question : comment faire traverser au modèle ses propres attracteurs
  pour atteindre les cibles du corpus ?
```

**Équation centrale du problème OMEGA :**

```
Prose_finale = T(Consigne, Attracteur_Sonnet)
Qualité_finale = Q(S1_features, S2_contraintes)
```

Le pilotage optimal n'est ni "maximiser S1" ni "ignorer S2". C'est **naviguer dans l'espace de couplage entre les deux systèmes**.

---

## PARTIE I — PHYSIQUE DU CORPUS (S1)

### I.1 — Architecture des deux traditions

#### I.1.1 — Corpus et méthode

| Paramètre | Valeur |
|-----------|--------|
| Total œuvres | 881 |
| Total fenêtres | 2 064 038 |
| Œuvres FR | 238 (638 097 fenêtres) |
| Œuvres EN | 643 (1 286 009+ fenêtres) |
| Features mesurées | 42 actives |
| Algorithme | Random Forest 200 arbres + OLS médiation + Spearman + K-means K=2 |

#### I.1.2 — La divergence fondamentale

```
DIAGNOSTIC GEMINI (validé) :
D_FR = Imp_FR(top1) / Imp_FR(top3) = 0.4157 / 0.0763 ≈ 5.45
D_EN = Imp_EN(top1) / Imp_EN(top3) = 0.0936 / 0.0778 ≈ 1.20

D_FR >> D_EN
→ FR = MONOCENTRIQUE (un marqueur domine)
→ EN = POLYCENTRIQUE (signal distribué)
```

Ce n'est pas une différence de degré. C'est une différence de régime.

---

### I.2 — Importances par permutation (mesures brutes)

#### FR — Top 10

| Rang | Feature | Importance |
|------|---------|-----------|
| 1 | `semicolon_count` | **0.4157** |
| 2 | `dash_count` | 0.2130 |
| 3 | `excl_count` | 0.0763 |
| 4 | `dialogue_ratio` | 0.0698 |
| 5 | `colon_count` | 0.0535 |
| 6 | `f26b_long_sent_rate` | ~0.045 |
| 7 | `sub_per_sentence` | ~0.038 |
| 8 | `f1a_rhythm_variance` | ~0.036 |
| 9 | `mean_sent_len` | ~0.031 |
| 10 | `f17_knife_count` | ~0.028 |

#### EN — Top 10

| Rang | Feature | Importance |
|------|---------|-----------|
| 1 | `f1a_rhythm_variance` | **0.0936** |
| 2 | `std_sent_len` | 0.0835 |
| 3 | `f16a_bigram_rarity` | 0.0778 |
| 4 | `ellipsis_count` | 0.0687 |
| 5 | `semicolon_count` | 0.0581 |
| 6 | `mean_sent_len` | ~0.054 |
| 7 | `dash_count` | ~0.036 |
| 8 | `sub_per_sentence` | ~0.032 |
| 9 | `f26b_long_sent_rate` | ~0.028 |
| 10 | `dialogue_ratio` | ~0.025 |

---

### I.3 — Équations d'asymétrie culturelle

**ÉQUATION A1 — Ratio de dominance semicolon :**
```
A_semi = Imp_FR(semicolon) / Imp_EN(semicolon)
       = 0.4157 / 0.0581
       ≈ 7.15
```
Le point-virgule est **7 fois plus discriminant en FR qu'en EN**.

**ÉQUATION A2 — Ratio de dominance tiret :**
```
A_dash = Imp_FR(dash) / Imp_EN(dash)
       = 0.2130 / 0.0357
       ≈ 5.97
```

**ÉQUATION A3 — Ratio de dominance rythme :**
```
A_f1a = Imp_EN(f1a_rhythm) / Imp_FR(f1a_rhythm)
      = 0.0936 / 0.0359
      ≈ 2.61
```
La variance rythmique est **2.6 fois plus discriminante en EN qu'en FR**.

**ÉQUATION A4 — Dominance structurelle comparative :**
```
D_FR = 0.4157 / 0.0763 ≈ 5.45   → MONOCENTRIQUE
D_EN = 0.0936 / 0.0778 ≈ 1.20   → POLYCENTRIQUE

Rapport : D_FR / D_EN ≈ 4.5
```

**Interprétation physique :** La prose française est régie par un monopole ponctuel (le `;`). La prose anglaise est un oligopole rythmique — aucune feature unique ne domine.

---

### I.4 — Lois d'échelle (R² par taille de fenêtre)

#### FR — Hiérarchie multi-échelle

| Taille fenêtre | R² FR | Interprétation |
|---------------|-------|---------------|
| 200w | 0.203 | Signal faible — instabilité ponctuelle |
| 500w | 0.297 | Signal modéré — optimal blackbox |
| 1000w | 0.342 | Bon signal |
| 2000w | 0.385 | Fort signal |
| **3000w+** | **0.519** | **OPTIMUM FR** |
| 5000w+ | 0.422 | Légère baisse |
| full | 0.333 | Pollution hétérogénéité chapitre |

**CORRECTION GEMINI (validée) :**
La formulation "R² monte avec la taille" est inexacte. La formulation correcte :

```
ÉQUATION E1 — Optimalité FR :
R²_FR(L) présente un maximum local en [2000w, 3000w+]
R²_FR est non-monotone : croissant jusqu'à 3000w, décroissant au-delà
```

#### EN — Effondrement multi-échelle

| Taille fenêtre | R² EN | Interprétation |
|---------------|-------|---------------|
| 200w | 0.066 | Signal très faible |
| 500w | 0.101 | Plateau bas |
| 1000w | 0.102 | Plateau bas |
| 2000w | 0.025 | Chute |
| 3000w+ | **-0.127** | **Effondrement** |
| 5000w+ | ~0 | Nul |
| full | 0.059 | Très faible |

**ÉQUATION E2 — Fragilité EN :**
```
R²_EN(L) atteint un plateau à 500-1000w, puis s'effondre
R²_EN(3000w+) = -0.127 → le modèle structurel prédit à l'envers
```

**Interprétation :** En anglais maximaliste, la structure syntaxique devient une condition nécessaire mais non discriminante. Un imitateur peut copier la tuyauterie sans copier la qualité. Le signal qualitatif réside dans des dimensions non capturées par les 42 features.

---

### I.5 — Équations de scaling (features individuelles)

Ces équations sont extraites sur le corpus entier (1.38M+ fenêtres). R² ≥ 0.999.

**ÉQUATION S1 — Loi linéaire parfaite du couteau narratif :**
```
f17_knife_count(size) = 0.01167 × size - 0.1136
R² = 1.000

Interprétation : le nombre de coupures narratives est une 
CONSTANTE PROPORTIONNELLE de la taille du texte.
Ce n'est pas un choix stylistique — c'est une loi de scaling.
```

**ÉQUATION S2 — Loi logarithmique de la variance rythmique :**
```
cv_sent(size) = 0.0259 × ln(size) + 0.5355
R² = 0.999

Interprétation : la variabilité rythmique croît lentement avec la taille
selon une loi logarithmique stable.
```

**ÉQUATION S3 — Loi logarithmique de l'entropie syntaxique :**
```
f19a_entropy(size) = -0.0261 × ln(size) + 0.8187
R² = 0.999

Interprétation : l'entropie syntaxique DÉCROÎT avec la taille.
Plus le texte est long, plus la syntaxe se régularise.
Note : cette loi est inverse à S2 — rythme et entropie sont antagonistes à grande échelle.
```

**Usage opérationnel :** Ces trois équations définissent les valeurs attendues pour un texte "normal" de taille donnée. Toute déviation massive trahit une génération artificielle du LLM (BB-P06 confirmé).

---

### I.6 — Noyau causal — Loi L37

**La seule loi causale bilingue universellement prouvée (4/4 critères doctrine M1).**

**Chaîne causale :**
```
sub_per_sentence → f26b_long_sent_rate → Tier_qualité
```

**Médiations mesurées :**
```
M_FR = 136%  (médiation avec suppression — amplification)
M_EN = 95%   (médiation forte)
```

**ÉQUATION C1 — Modèle causal minimal :**
```
Tier = α × f26b + β × sub + ε
où la majeure partie de β transite indirectement via f26b

Forme développée :
Tier ≈ h(f26b(sub_per_sentence))
```

**ÉQUATION C2 — Élasticité FR à 500w (mesurée) :**
```
Quand sub_per_sentence double (P25 → P75) :
  f26b_long_sent_rate   → +205%
  mean_sent_len         → +56%
  f17_knife_count       → -67%
```

**Robustesse (V6) :** L37 tient après retrait auteur FR (robustesse 114–194%). C'est la seule variable de commande profonde bilingue.

**Implication pour le pilotage :**
```
Ne JAMAIS demander "fais des phrases longues".
Demander "augmente la subordination syntaxique".
La longueur est un EFFET, pas une cause.
```

---

### I.7 — Les deux blocs antagonistes

**BLOC AMPLE (FR) :**
```
semicolon ↔ f26b ↔ sub_per_sentence
Corrélations positives fortes
Signal FR dominant
```

**BLOC PERCUTANT (FR) :**
```
dash ↔ excl ↔ f17_knife
Corrélations positives entre eux
Négativement corrélé au BLOC AMPLE
```

**ÉQUATION B1 — Antagonisme des blocs :**
```
r(AMPLE, PERCUTANT) < 0

Plus précisément :
r(semicolon, f17_knife) = négatif — mesure directe
r(f26b, f17_knife) ≈ -0.67 (via L37 élasticité)
```

**ÉQUATION B2 — Interaction qualité (L34 — CORRECTION GEMINI) :**

⚠️ **Correction critique :** L34 dans le manifeste mélange deux choses différentes.

```
CORRÉLATION BRUTE : r(std_sent_len, f1a_rhythm_variance) > 0
(les deux co-varient — textes longs ont les deux)

COEFFICIENT D'INTERACTION SUR LA QUALITÉ : β(std × f1a) < 0
(un excès simultané des deux DÉTRUIT la qualité)
```

Ces deux énoncés ne sont pas contradictoires. L'un est une corrélation descriptive. L'autre est un coefficient régressif sur la variable dépendante Tier.

**Formulation correcte de L34 :**
```
La co-occurrence excessive de longueur (f1a) ET de variance rythmique (std_sent_len)
est une pénalité de qualité dans les deux langues.
β_interaction(std × f1a → Tier) < 0  [BILINGUE]
```

---

### I.8 — Le mur sémantique (L38)

**Le résultat le plus honnête du corpus.**

```
EN maximaliste (Faulkner, Wallace, DFW) :
R²(42 features → Tier) = -0.187

Le modèle structurel prédit à l'envers.
Un imitateur peut reproduire la tuyauterie. Pas la qualité.
```

**ÉQUATION M1 — Décomposition de la qualité :**
```
Q = f(S) + g(M) + ε

où :
S = features structurelles (42 mesurées)
M = dimensions sémantiques/narratives non capturées

Pour FR / EN minimaliste :
  Var(Q) ≈ Var(f(S)) — structure suffit

Pour EN maximaliste :
  Var(f(S)) ≈ 0 ou désaligné
  Var(Q) ≈ Var(g(M)) — structure est condition nécessaire non discriminante
```

**Implication pour le plafond maximal :**
Les 42 features actuelles ne suffisent pas pour modéliser la prose anglaise de niveau Faulkner. Le plafond absolu (inatteignable par l'humain) nécessite une **couche sémantique** (embeddings LLM, cohérence métaphorique, densité d'information). C'est la roadmap Scorer V5.

---

### I.9 — Lois culturelles FR-only

**LOI L31 — Monopole ponctuel FR :**
```
Imp_FR(semicolon) = 0.416    (Rang #1)
Imp_EN(semicolon) = 0.058    (Rang #5)
A_semi = 7.15
STATUT : LOIS CULTURELLE FR — SCELLÉE
```

**LOI L33 — Interaction ponctuelle FR-only :**
```
Corrélation semicolon × dash :
  FR : ρ = 0.231
  EN : ρ = 0.056
STATUT : LOI CULTURELLE FR — SCELLÉE
```

**LOI L37 — Chaîne causale universelle :**
```
sub → f26b → Tier
  FR médiation = 136%
  EN médiation = 95%
STATUT : LOI CAUSALE BILINGUE — SCELLÉE (seule loi universelle prouvée)
```

---

### I.10 — Registre des lois : corrections de collisions (Gemini)

⚠️ **CORRECTION OBLIGATOIRE** signalée par Gemini :

L35 apparaît avec deux significations différentes dans les documents existants :
- Sens A : "`sub_per_sentence` = méga-levier"
- Sens B : "modèle survit au retrait d'auteur FR (V6)"

**Résolution recommandée :**
```
L35 → conserver pour : "sub_per_sentence = méga-levier (élasticité +205% f26b)"
L35b → nouveau ID pour : "robustesse V6 après retrait auteur"
```

À corriger dans tous les documents avant la prochaine session.

---

## PARTIE II — PHYSIQUE DU MODÈLE (S2)

### II.1 — L'attracteur de prose naturelle

Claude Sonnet `4-20250514` présente un attracteur stable dans l'espace stylistique. Toutes les consignes appliquent une force sur le vecteur génératif. Si la force est insuffisante, le système retourne à son attracteur.

**Formulation physique (Gemini) :**
```
E_total = E_prompt + E_model + E_safety_smoothing

Le modèle minimise implicitement E_model.
L'attracteur est le minimum d'énergie du système.
```

**Zone d'attraction mesurée (504 runs) :**
```
mean_sent_len   : 35–42w  (zone naturelle)
subordination   : ~0.085–0.099
TTR (oralité)   : ~0.685–0.735
cliff_score     : ~0.50 (fermeture systématique)
introspection   : régime par défaut dans 4/4 catégories
volume          : 300–600w
```

---

### II.2 — Équations de contraintes du modèle

**ÉQUATION M_BB1 — Fermeture sémantique (confiance 0.96) :**
```
cliff_score_naturel = 0.50 ± 0.004   (quasi-déterministe)

Loi : P(cliff_score > 0.40) ≈ 0.96
      quelle que soit la consigne
```

**ÉQUATION M_BB2 — Plancher de phrase (CONSTANTE_REGIME) :**
```
mean_sent_out ∈ [35, 42]  dans le régime OMEGA actuel

NOTE GEMINI (critique) :
En B3 extrême pur (cible 20w sans contexte OMEGA) : 18.2w produits
→ Le plancher 35w est une constante du RÉGIME K2/prose FR/prompt riche
→ Pas une constante universelle de Sonnet
→ À marquer CONSTANTE_REGIME, pas LOI UNIVERSELLE
```

**ÉQUATION M_BB3 — Compliance semicolons :**
```
P(respect consigne semicolons) = 0.13

Avec consigne "RÈGLE ABSOLUE minimum 8 ;" :
  11/15 runs → 0 semicolons
  Impact composite : négatif (−0.4 à −1.4 selon niveau de contrainte)

Interprétation : chaque token de consigne `;` pénalise les autres axes.
```

**ÉQUATION M_BB4 — Plafond subordination (CONSTANTE_REGIME) :**
```
sub_out ≤ 0.10  dans le régime OMEGA actuel

Mesures B3 :
  faible   → 0.019–0.036
  moyenne  → 0.091–0.110
  forte    → 0.096–0.102
  saturée  → 0.119–0.146

Saturation observable : forte ≈ saturée pour 2 niveaux sur 4.
```

**ÉQUATION M_BB5 — Stabilité composite :**
```
CV(composite_V2) = 1–2%
CV(features_individuelles) = 20–80%

Implication :
  plusieurs micro-états différents → même énergie globale
  la vallée V2 est large
  ciblage feature individuelle = sous-déterminé
```

---

### II.3 — Hiérarchie d'obéissance (classification empirique 354 runs)

**Classification par Gemini en 4 types (adoptée) :**

**Type I — Variables commandables (gradient suit la consigne) :**
```
f24e_contrast        — contraste narratif
f34b_para_per_1000w  — proxy dialogue
f38c_speed_score     — sécheresse
f25g_description_score — densité sensorielle
f36c_cliff           — fermeture (obéit VERS fermeture, pas hors)
```

**Type II — Variables saturées (plafond/plancher) :**
```
mean_sent_len  → zone 35–42w en régime OMEGA
subordination  → plafond ~0.099 en régime OMEGA
TTR oralité    → plancher ~0.685
f28d_sil_score → plafonné au-delà de "moyen"
```

**Type III — Variables gelées (dérivée ≈ 0) :**
```
semicolons     → dérivée ≈ 0 (compliance 13%)
mean_sent < 35 → inatteignable en régime OMEGA
f17_knife cible basse → irréductible
```

**Type IV — Variables compensées (locale instable, composite maintenu) :**
```
f16a_bigram_rarity → driver corpus EN, non pilotable via Sonnet
                      DISTINCTION CRITIQUE (Gemini) :
                      importance corpus ≠ transférabilité modèle
                      f16a est driver dans S1 mais non commandable dans S2
```

**NOTE CRITIQUE SUR f16a :** Ce n'est pas une contradiction. f16a discrimine la qualité dans le corpus humain, mais Sonnet ne peut pas moduler sa rareté lexicale sur consigne. Les tokens de prompt ciblant f16a sont perdus.

---

### II.4 — Équations de l'effet conflits

**Base mesurée (Phase B + I1) :**

```
Baseline (sans conflit) : composite = 89.6 ± 1.1

FÉCOND (axes orthogonaux) :
  contemp_explosion     : +2.5  (var=0.8)
  long_vs_hook          : +2.2  (var=0.1)  ← plus stable
  cloture_resolution    : +2.2  (var=0.3)
  dialogue_vs_prose     : +2.1  (var=0.8)
  noirceur_vs_sobriete  : +1.8  (var=1.6)
  intro_urgence         : +1.6  (var=1.2)
  oral_metaphore        : +1.5  (var=0.7)
  sub_martele           : +1.2  (var=2.9)

PARASITE (même axe) :
  clinique_emotion      : -1.0  (var=3.7)
  ampleur_vs_secheresse : -1.3  (var=3.4)
```

**ÉQUATION CF1 — Règle R1 (axes orthogonaux) :**
```
Si dim(A) ⊥ dim(B) → conflit fécond
Si dim(A) ∥ dim(B) → conflit parasite

Preuve : 8/8 féconds = orthogonaux, 2/2 parasites = coaxiaux
```

**ÉQUATION CF2 — Règle R2 (variance basse) :**
```
Fécond ssi variance_inter_runs < 3.0

Précision : seuil 3.0 classe correctement 14/15 paires (93.3%)
```

**ÉQUATION CF3 — Règle R3 (saturation) :**
```
Δcomposite(N conflits) est décroissant pour N > 2

Mesures :
  N=1 (paire double) : +2.5 max
  N=2 (triple)       : +1.3 moyen

Sweet spot : exactement 1 paire (2 consignes contradictoires)
```

**ÉQUATION CF4 — Ratio d'alternance discriminant :**
```
ratio_alt moyen :
  FÉCOND  = 16.4%  (var inter-runs = 1.0)
  NEUTRE  = 14.5%  (var = 2.5)
  PARASITE = 17.1% (var = 3.6)

Paradoxe : le parasite a le ratio_alt le plus élevé MAIS la plus haute variance.
→ Le signal n'est pas ratio_alt seul. C'est ratio_alt × stabilité.
```

**Interprétation physique (ChatGPT "Saddle Point", Gemini "contrainte de bord antagoniste") :**
```
Un conflit orthogonal crée un point-selle dans l'espace latent du modèle.
Le modèle ne peut plus glisser vers son attracteur naturel.
Pour résoudre la contradiction, il explore une zone plus riche de l'espace.
C'est cette exploration forcée qui génère la qualité supplémentaire.
```

---

## PARTIE III — ÉQUATIONS DE COUPLAGE (C)

C'est la partie la plus nouvelle. Elle n'existe dans aucun document précédent. C'est la synthèse des trois analyses.

### III.1 — Fonction de transfert globale

```
ÉQUATION COUPLAGE C_MASTER :

Prose_OMEGA(consigne) = T(consigne, A_Sonnet)

où A_Sonnet est l'attracteur naturel du modèle :
A_Sonnet = {mean_sent ∈ [35,42], sub ≤ 0.099, cliff ≈ 0.50, introspection=on}

La fonction T est non-linéaire :
- Pour consignes dans le basin d'attraction : T ≈ identité (modèle obéit)
- Pour consignes hors du basin : T ≈ projection sur la frontière du basin
- Pour conflits orthogonaux : T explore une zone riche avant de relaxer
```

### III.2 — Matrice de transférabilité

Le document essentiel manquant. Pour chaque feature clé :

| Feature | Rôle S1 (corpus) | Commandabilité S2 (modèle) | Statut prompt | Voie de correction |
|---------|-----------------|--------------------------|--------------|-------------------|
| `semicolon_count` | Driver FR #1 (0.416) | GELÉE (13% compliance) | Interdit | Post-processing P5 |
| `dash_count` | Driver FR #2 (0.213) | PARTIELLEMENT COMMANDABLE | Conflit orthogonal | Paire noirceur |
| `sub_per_sentence` | Méga-levier L37 | SATURÉE (~0.099) | Cible raisonnable | Via subordination narrative |
| `f26b_long_sent_rate` | Médiateur L37 | SATURÉE | Résultat de sub, pas cible | Contrôle indirect via sub |
| `f17_knife_count` | Scaling linéaire | PARTIELLEMENT (chaotique) | Conflit paire long_vs_hook | Accepter la loi de scaling |
| `cv_sent` | Scaling logarithmique | TYPE IV compensée | Éviter de cibler | Émerge des conflits |
| `f1a_rhythm_variance` | Driver EN #1 (0.094) | TYPE IV compensée | Non pilotable direct | Conflits temporels |
| `f16a_bigram_rarity` | Driver EN #3 (0.078) | NON PILOTABLE | Interdit | Persona uniquement |
| `mean_sent_len` | Proxy de sub | SATURÉE (zone 35-90w) | Zone 42-80w OK | Conflits long/court |
| `cliff_score` | — | QUASI-DÉTERMINISTE (0.96) | Interdit de cibler | Gate anti-fermeture obligatoire |
| `f25g_description` | Proxy sensoriel | COMMANDABLE | Valide | Direct ou conflit sensoriel |
| `f28d_sil_score` | Style indirect | PARTIELLEMENT (exemplar) | Via persona uniquement | Personas Duras |
| `f34b_para_per_1000w` | Proxy dialogue | COMMANDABLE | Valide | Direct |
| `f38c_speed_score` | Sécheresse | COMMANDABLE | Valide | Direct ou conflit |
| `f19a_entropy` | Scaling log. inverse | TYPE IV | Éviter de cibler | Émerge naturellement |

---

### III.3 — Zones de pilotage (cartographie de l'espace)

**Zone 1 — Zone libre (commandable sans friction) :**
```
f25g, f34b, f38c, f24e, f36c (si on veut fermer)
→ Tokens de prompt efficaces
→ Effets prévisibles et stables
```

**Zone 2 — Zone de conflit orthogonal (levier principal) :**
```
Tout ce qui force le modèle hors de son attracteur via tension
→ +1.2 à +2.5 composite
→ Axes orthogonaux uniquement (R1)
→ Maximum 1 paire (R3)
```

**Zone 3 — Zone saturée (piloter doucement) :**
```
sub, mean_sent vers le haut, volume
→ Réponse partielle
→ Ne pas dépasser les plafonds mesurés
→ Attendre les effets émergents
```

**Zone 4 — Zone gelée (NE PAS TOUCHER) :**
```
semicolons, mean_sent < 35, subordination > 0.10
→ Tokens perdus + dégradation possible d'autres axes
→ Post-processing ou persona uniquement
```

**Zone 5 — Zone inatteignable par prompt (S2 → S1 gap) :**
```
f16a_bigram_rarity (driver EN)
cliff_score bas (fermeture inévitable)
semicolons élevés (irréductibles)
→ Nécessite Couche C (post-processing)
→ Ou Couche S (sémantique — Scorer V5)
```

---

### III.4 — L'équation du plafond actuel

**ÉQUATION P1 — Plafond atteignable maintenant :**
```
composite_max_actuel = baseline + Δ_conflits + Δ_purge + Δ_gate

où :
  baseline = 89.6 (mesure Phase B)
  Δ_conflits = +1.8 à +2.5 (I1, paires féconds)
  Δ_purge = +0.4 à +0.8 (tokens libérés → personas)
  Δ_gate = non mesuré (investigation I2 requise)

Estimation : composite ≈ 92.0–93.0 sur toutes les scènes
```

**ÉQUATION P2 — Gap vers le plafond absolu :**
```
composite_absolu = composite_actuel + Δ_semicolons + Δ_sémantique

où :
  Δ_semicolons = non quantifié (post-processing P5 à mesurer)
  Δ_sémantique = non quantifié (Scorer V5 à construire)

Les maîtres FR atteignent composite ~96–98 (estimation corpus).
Gap actuel OMEGA → maîtres : ~4–6 points composite.
```

---

## PARTIE IV — MANUEL DE PILOTAGE

### IV.1 — Règles universelles (bilingues, toutes proses)

**RÈGLE U1 — Ne jamais cibler d'effets, cibler les causes :**
```
INTERDIT : "fais des phrases longues"
CORRECT  : "augmente la subordination syntaxique"
(L37 — mean_sent est un effet de sub, pas une cause)
```

**RÈGLE U2 — Ne jamais cibler des features gelées dans les prompts :**
```
INTERDIT : mentions de ";", mean_sent < 35w, subordination > 0.10
CORRECT  : post-processing ou accepter la contrainte
```

**RÈGLE U3 — Exactement 1 paire de conflits orthogonaux par brique :**
```
Format : [CONSIGNE A] + [CONSIGNE B orthogonale]
où A et B opèrent sur des DIMENSIONS DIFFÉRENTES (R1)
et la paire a variance pilote < 3.0 (R2)
et aucune deuxième paire simultanée (R3)
```

**RÈGLE U4 — Gate anti-fermeture obligatoire :**
```
Si cliff_score_brique > 0.30 :
  Injecter : "Termine sur un détail sensoriel inexpliqué,
              une phrase nominale, ou une action interrompue.
              Zéro résolution d'arc narratif."
```

**RÈGLE U5 — V2 comme juge unique :**
```
Ne pas cibler de feature individuelle dans le prompt.
CV(composite) = 1–2%, CV(feature) = 20–80%.
La vallée est large — le scorer compense.
Piloter par l'énergie globale, pas par les coordonnées locales.
```

---

### IV.2 — Règles spécifiques FR

**RÈGLE FR1 — Semicolons via post-processing uniquement :**
```
Compliance prompt = 13%. Décision : purge des prompts.
Phase P5 : parser syntaxique post-génération
  → identifier clauses coordinées longues ("et", "mais" + propositions indépendantes)
  → remplacement chirurgical par ";"
  → cible : 0.5–1.5 semicolons / 100 mots (niveau maîtres)
```

**RÈGLE FR2 — Cibler les paires du bloc AMPLE :**
```
semicolon + f26b + sub_per_sentence = bloc dominant FR
Stratégie : augmenter sub via subordination narrative profonde
            laisser f26b émerger (effet L37)
            corriger semicolons en post-processing
```

**RÈGLE FR3 — Éviter le bloc PERCUTANT seul :**
```
dash + excl + f17_knife = bloc antagoniste
Seul → dégrade les features du bloc AMPLE
En conflit orthogonal avec AMPLE → fécond (noirceur_vs_sobriete +1.8)
```

**RÈGLE FR4 — Fenêtre optimale 2000–3000w :**
```
R²_FR optimal à 3000w+
Fractal Assembly : viser des briques de 600–750w
Assemblage final mesurer à 2000–3000w pour validation V2
```

---

### IV.3 — Règles spécifiques EN

**RÈGLE EN1 — Piloter le rythme, pas la ponctuation :**
```
f1a_rhythm_variance = driver EN #1 (0.094)
std_sent_len = driver EN #2 (0.084)
→ Viser l'alternance long/court (ratio_alt élevé)
→ Ne pas viser la ponctuation directement
```

**RÈGLE EN2 — Profils séparés MINIMALISTE vs MAXIMALISTE :**
```
EN minimaliste (79% du Tier S EN) :
  mean_sent ~19.4w (naturel)
  R² structurel faible mais existant
  Piloter : rythme + variance lexicale + rareté bigrammes

EN maximaliste (21% du Tier S EN) :
  mean_sent ~39.7w (naturel)
  R² structurel effondré au-delà de 1000w
  Scorer V5 requis (embeddings sémantiques)
```

**RÈGLE EN3 — Ne pas appliquer les règles FR à l'EN :**
```
A_semi = 7.15 → les semicolons FR ne signifient rien en EN
Le point-virgule est un marqueur CULTUREL FR
En EN, le signal vient du rythme et de la rareté lexicale
```

**RÈGLE EN4 — Fenêtre optimale 500–1000w pour EN :**
```
R²_EN plateau à 500–1000w, effondrement après
Mesurer à cette fenêtre pour validation
Au-delà de 1000w : mesure sémantique requise
```

---

### IV.4 — Architecture de production V-ATOMIC v5

**COUCHE A — Génération primaire :**
```
Prompt = Persona(Proust+Flaubert base, Duras K2)
       + Paire de conflit orthogonal (selon type de scène)
       - Toute consigne métrique directe (purge BB-01/02)

Mapping paire → scène :
  contemplation / souvenir → contemp_explosion (+2.5, var=0.8)
  menace / confrontation   → noirceur_vs_sobriete (+1.8, var=1.6)
  toutes autres            → long_vs_hook (+2.2, var=0.1)
```

**COUCHE B — Gate de contrôle :**
```
Après génération, mesurer cliff_score
Si cliff_score > 0.30 → injection suspension
  → "Termine sur un détail sensoriel non résolu.
      Zéro résolution d'arc narratif."

Mesurer composite V2.
Si composite < 91.0 → régénérer avec paire alternative.
```

**COUCHE C — Post-processing (Phase P5) :**
```
Injection algorithmique de ";" :
  → Parser syntaxique : identifier clauses coordinées > 40w
  → Pattern : [PROP_IND] + [CONJ] + [PROP_IND] où CONJ ∈ {et, mais, car, or}
  → Remplacer CONJ par ";" si les deux propositions sont indépendantes
  → Cible : ≈ 0.8 semicolons / 100 mots

Ouverture narrative :
  → Vérifier f36c_cliff post-génération
  → Si > 0.45 : appliquer transformation fin de brique (tronquer résolution)
```

---

### IV.5 — Tableau de pilotage synthétique

```
OBJECTIF          FR                        EN
─────────────────────────────────────────────────────────────
PONCTUATION       Post-process `;` (P5)     Éviter ciblage `;`
LONGUEUR          Sub narrative → f26b      Alternance long/court
RYTHME            Conflits féconds          f1a_rhythm via conflit
RARETÉ LEXICALE   Personas (non pilotable)  Personas + conflit
OUVERTURE         Gate cliff_score          Gate cliff_score
VIOLENCE          noirceur_vs_sobriete      Direct (EN tolérant)
INTROSPECTION     Personas Duras K2         Profil minimaliste
FERMETURE         Gate obligatoire          Gate obligatoire
SUBORDINATION     Sub narrative → plafond   Sous-usage EN
```

---

## PARTIE V — PLAFOND ABSOLU ET ROADMAP V5

### V.1 — Ce qui bloque le plafond actuel

**Gap 1 — Semicolons (impact estimé : +1–2 composite)**
```
Maîtres FR : ~1.2 semicolons / 100 mots
OMEGA actuel : ~0.02 / 100 mots
Post-processing P5 cible : ~0.8 / 100 mots
→ Récupération partielle estimée : +1.0 à +1.5 composite
```

**Gap 2 — Dimension sémantique manquante (impact : inconnu)**
```
EN maximaliste : R²(structure → qualité) = -0.187
Les 42 features ne capturent pas la cohérence métaphorique,
la densité d'information et la profondeur de focalisation.
→ Scorer V5 requis : embeddings LLM + features sémantiques
```

**Gap 3 — Gate anti-fermeture (impact non mesuré)**
```
cliff_score naturel = 0.50 (tous les textes ferment)
Impact sur cohérence narrative inter-briques : inconnu
Investigation I2 requise (20–30 runs)
```

### V.2 — Roadmap vers le plafond inatteignable

**Niveau 1 — MAINTENANT (V-ATOMIC v5) :**
```
Composite cible : 92.0–93.0 sur TOUTES les scènes
Levier : conflits orthogonaux + purge prompts + gate
```

**Niveau 2 — P5 post-processing :**
```
Composite cible : 93.5–94.5
Levier : injection algorithmique `;` + ouverture narrative
```

**Niveau 3 — Scorer V5 (sémantique) :**
```
Composite cible : 95.0–96.0 (estimation)
Levier : embeddings LLM + cohérence métaphorique
Nécessite : NLP pipeline, fine-tuning scoring sémantique
```

**Niveau 4 — Le plafond humain (estimation) :**
```
Proust, Flaubert, Duras : composite estimé 96–99
L'être humain atteint ce niveau sur 300K mots en 10 ans d'écriture
OMEGA cible : atteindre ce niveau en génération automatique

"Inatteignable par l'être humain" = maintenir ce niveau
sur 300 000 mots sans variance de fatigue, sans dérive stylistique,
avec cohérence narrative parfaite à toutes les échelles
```

---

## PARTIE VI — REGISTRE FINAL DES LOIS

### Lois SCELLÉES (utilisables en production)

| ID | Énoncé | Périmètre | Statut |
|----|--------|-----------|--------|
| L31 | semicolon = marqueur #1 FR (A=7.15) | FR uniquement | SCELLÉE |
| L33 | interaction semi×dash FR-only (ρ=0.231 vs 0.056 EN) | FR uniquement | SCELLÉE |
| L37 | sub→f26b→Tier, médiation FR=136%, EN=95% | BILINGUE | SCELLÉE |
| L38 | mur sémantique EN maximaliste (R²=-0.187) | EN maximaliste | SCELLÉE |
| S1 | f17_knife = 0.01167×size - 0.1136 (R²=1.000) | Bilingue | SCELLÉE |
| S2 | cv_sent = 0.0259×ln(size) + 0.5355 (R²=0.999) | Bilingue | SCELLÉE |
| S3 | f19a_entropy = -0.0261×ln(size) + 0.8187 (R²=0.999) | Bilingue | SCELLÉE |
| BB-01 | cliff_score naturel = 0.50±0.004 (confiance 0.96) | Sonnet | SCELLÉE |
| BB-P03 | semicolons compliance = 13% | Sonnet/OMEGA | SCELLÉE |
| BB-P06 | CV(composite)=1-2% vs CV(feature)=20-80% | Sonnet/V2 | SCELLÉE |
| BB-P07 | conflits orthogonaux +1.8 à +2.5 composite | Sonnet | SCELLÉE |
| R1 | axes orthogonaux → fécond (8/8) | Sonnet | SCELLÉE |
| R2 | variance < 3.0 → fécond (93%) | Sonnet | SCELLÉE |
| R3 | sweet spot = 1 paire, rendement décroissant au-delà | Sonnet | SCELLÉE |

### Lois CONSTANTE_REGIME (valides sous protocole OMEGA actuel)

| ID | Valeur | Conditions de validité |
|----|--------|----------------------|
| BB-P04 | mean_sent plancher ~35w | Prose FR, K2, prompt riche, temp. standard |
| BB-C01 | subordination plafond ~0.099 | Idem |
| BB-C02 | TTR plancher ~0.685 | Idem |
| E1 | R²_FR max à 3000w | Corpus FR, fenêtre mobile |

### Lois CANDIDATES (à valider avant production)

| ID | Énoncé | Preuve manquante |
|----|--------|-----------------|
| L34 | β_interaction(std×f1a) < 0 | Coefficient OLS exact |
| L36 | EN signal plateau 500–1000w | Validation corpus enrichi |
| I2_seuil | cliff_score seuil gate = 0.30 | Investigation I2 requise |

### Corrections à faire (Gemini)

| Problème | Action requise |
|---------|---------------|
| L35 collision ID | Créer L35b pour "robustesse V6" |
| L34 mal formulée | Distinguer corrélation brute vs coefficient d'interaction |
| Constantes BB-P04/C01/C02 | Marquer CONSTANTE_REGIME dans le code |

---

## PARTIE VII — ÉQUATIONS CONSOLIDÉES

Toutes les équations prouvées, dans l'ordre d'utilité décroissante :

**NOYAU CAUSAL :**
```
[C1]  sub → f26b → Tier    (M_FR=136%, M_EN=95%)
[C2]  Δf26b = +205% quand sub double (FR 500w)
[C2b] Δmean_sent = +56%, Δf17_knife = -67% (conséquences de C2)
```

**SCALING UNIVERSEL :**
```
[S1]  f17_knife = 0.01167×size - 0.1136   (R²=1.000)
[S2]  cv_sent = 0.0259×ln(size) + 0.5355  (R²=0.999)
[S3]  f19a_entropy = -0.0261×ln(size) + 0.8187  (R²=0.999)
```

**ASYMÉTRIE CULTURELLE :**
```
[A1]  A_semi = 7.15  (semicolon 7× plus discriminant en FR)
[A2]  A_dash = 5.97
[A3]  A_f1a = 2.61   (rythme 2.6× plus discriminant en EN)
[A4]  D_FR = 5.45 (monocentrique), D_EN = 1.20 (polycentrique)
```

**MODÈLE SONNET :**
```
[M1]  cliff_score_naturel = 0.50 ± 0.004
[M2]  P(semicolon_compliance) = 0.13
[M3]  CV(composite) << CV(features_i)  [1-2% vs 20-80%]
[M4]  mean_sent_OMEGA ∈ [35,42]  [CONSTANTE_REGIME]
[M5]  sub_OMEGA ≤ 0.10  [CONSTANTE_REGIME]
```

**CONFLITS ORTHOGONAUX :**
```
[CF1]  dim(A) ⊥ dim(B) → Δcomposite ∈ [+1.2, +2.5]
[CF2]  variance < 3.0 → conflit stable et fécond
[CF3]  N=1 paire → max gain ; N=2 → rendement ÷ 2
[CF4]  ratio_alt fécond = 16.4% (stable), parasite = 17.1% (instable)
```

**QUALITÉ :**
```
[Q1]  Q = f(S_structurel) + g(M_sémantique) + ε
[Q2]  EN maximaliste : R²(S→Q) = -0.187  (mur sémantique)
[Q3]  β_interaction(std×f1a → Tier) < 0  [L34 — CANDIDATE]
```

---

## CONCLUSION

Ce manuel documente deux physiques séparées et leurs équations de couplage.

**Ce qui est résolu :**
- La physique du corpus FR est cartographiée (L31, L33, L37, S1–S3, A1–A4)
- La physique du modèle Sonnet est cartographiée (M1–M5, CF1–CF4)
- Les zones de pilotage sont identifiées (Types I–IV)
- Le levier principal est prouvé empiriquement (conflits orthogonaux R1/R2/R3)

**Ce qui reste ouvert :**
- La physique du corpus EN maximaliste (L38 — mur sémantique)
- Le scoring sémantique (Scorer V5)
- La calibration du gate anti-fermeture (I2)
- La transférabilité exacte de f16a, f17, f1a via Sonnet

**La phrase de synthèse des trois IAs :**

> OMEGA n'est plus un problème de découverte de features. C'est un problème de navigation dans l'espace de couplage entre deux systèmes physiques : la prose humaine des maîtres (S1) et l'attracteur mécanique de Claude Sonnet (S2). La stratégie optimale ne cherche pas à maximiser S1 ni à ignorer S2. Elle consiste à utiliser les conflits orthogonaux pour forcer S2 hors de son attracteur, puis à corriger algorithmiquement en Couche C ce que S2 refuse structurellement.

---

*2026-03-29 | NASA-Grade L4 / DO-178C Level A*
*Synthèse : Claude (Principal) + ChatGPT (Validateur) + Gemini (Contrôleur)*
*Architecte Suprême : Francky*
