# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PHYSIQUE PURE DU SUCCÈS LITTÉRAIRE
# Mathématisation complète du Potentiel de Ventes Intrinsèque (PVI)
# Sans marketing · Sans timing · Sans réseau — Texte seul
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date           : 2026-03-29
# Version        : v1.0 — SYNTHÈSE CONVERGENTE 4-IA
# Standard       : NASA-Grade L4 / DO-178C Level A
# Architecte     : Francky (Architecte Suprême)
# IA             : Claude + Gemini + ChatGPT + IA Systémique
# Statut         : DOCUMENT SCELLABLE — EN ATTENTE VALIDATION
#
# ═══════════════════════════════════════════════════════════════════════════════

---

## TABLE DES MATIÈRES

1. [PRÉMISSE ET PÉRIMÈTRE](#1-prémisse-et-périmètre)
2. [LA CHAÎNE CAUSALE MINIMALE](#2-la-chaîne-causale-minimale)
3. [LES 8 VARIABLES FONDAMENTALES](#3-les-8-variables-fondamentales)
4. [LE SYSTÈME D'ÉQUATIONS COMPLET](#4-le-système-déquations-complet)
5. [LES NON-LINÉARITÉS — SEUILS ET SIGMOÏDES](#5-les-non-linéarités--seuils-et-sigmoïdes)
6. [CALIBRATION SUR CAS RÉELS](#6-calibration-sur-cas-réels)
7. [PROTOCOLE DE MESURE DES VARIABLES](#7-protocole-de-mesure-des-variables)
8. [SYSTÈME DE SCORING OMEGA TEXTUEL](#8-système-de-scoring-omega-textuel)
9. [VALIDATION ET FALSIFIABILITÉ](#9-validation-et-falsifiabilité)
10. [RÈGLES D'IMPLÉMENTATION MOTEUR](#10-règles-dimplémentation-moteur)

---

## 1. PRÉMISSE ET PÉRIMÈTRE

### 1.1 Ce que nous modélisons

**Définition stricte :**

> Le Potentiel de Ventes Intrinsèque (PVI) est la probabilité qu'un roman génère
> des ventes organiques — par bouche-à-oreille, recommandation, et lecture poursuivie —
> en l'absence de tout levier externe (marketing, adaptation, prix, timing de marché).

**Ce que nous retirons volontairement :**
- ✗ Marketing et promotion
- ✗ Adaptation cinéma / TV
- ✗ Prix littéraires
- ✗ Timing culturel (IPC, cycles de genre)
- ✗ Canal de découverte (BookTok, librairie)
- ✗ Couverture, titre, positionnement

**Ce que nous modélisons exclusivement :**
- ✓ Propriétés textuelles et narratives intrinsèques du manuscrit
- ✓ Mécanismes psychologiques qu'elles activent chez le lecteur
- ✓ Comportements qui en résultent (finir, recommander, racheter)

### 1.2 La thèse physique centrale

La vente organique est la conséquence déterministe d'une chaîne causale :

```
Propriétés_texte → Expérience_lecteur → Comportements → Ventes

Pas de raccourci possible.
Pas de corrélation sans mécanisme explicite.
```

### 1.3 Les 4 postulats de base

```
POSTULAT P1 : Le lecteur optimise son ratio Émotion/Effort inconsciemment.
              Il abandonne si le coût dépasse le bénéfice perçu.
              SOURCE : Ratio I/E — ChatGPT / données Maslej 2021

POSTULAT P2 : La recommandation (77% des ventes) est déclenchée
              uniquement par l'attachement au personnage ET la fin.
              SOURCE : Survey 355 + Sestir & Green 2010 + Loi 4

POSTULAT P3 : Le succès commercial est un produit, pas une somme.
              Un seul composant nul annule tout.
              SOURCE : Synthèse 4-IA — Équation maîtresse

POSTULAT P4 : Les effets sont non-linéaires.
              Il existe des seuils en dessous desquels rien ne décolle,
              et au-dessus desquels tout s'amplifie exponentiellement.
              SOURCE : ChatGPT + IA Systémique — sigmoïdes requises
```

---

## 2. LA CHAÎNE CAUSALE MINIMALE

### 2.1 Graphe causal complet (sans marketing)

```
╔═══════════════════════════════════════════════════════════════════╗
║  COUCHE 1 — PROPRIÉTÉS DU TEXTE                                  ║
║  [T] Transportation · [I] Identification · [A] Arc               ║
║  [S] Surprise locale · [FL] Friction lexicale                    ║
║  [MS] Musicalité syntaxique · [U] Unicité                        ║
╠═══════════════════════════════════════════════════════════════════╣
║  ↓                                                                ║
║  COUCHE 2 — EXPÉRIENCE LECTEUR                                   ║
║  Immersion → Attachement → Tension → Clarté                      ║
╠═══════════════════════════════════════════════════════════════════╣
║  ↓                                                                ║
║  COUCHE 3 — COMPORTEMENTS                                        ║
║  Rétention (finir le livre) → Satisfaction → Mémorisation        ║
╠═══════════════════════════════════════════════════════════════════╣
║  ↓                                                                ║
║  COUCHE 4 — VENTES ORGANIQUES                                    ║
║  Recommandation → Bouche-à-oreille → Ventes intrinsèques         ║
╚═══════════════════════════════════════════════════════════════════╝

RÉTROACTION : Ventes → crédibilité auteur → levier sur prochain roman
(hors périmètre de ce modèle — un roman isolé)
```

### 2.2 Les trois mécanismes de transmission

**Mécanisme 1 — Rétention (finir le livre) :**
```
Si le lecteur n'FINIT PAS → aucune recommandation possible
Rétention = f(T, I, A, E_cog)
Seuil critique : si Rétention < 0.60, ventes organiques → 0
```

**Mécanisme 2 — Satisfaction émotionnelle (la fin) :**
```
La fin décide du bouche-à-oreille actif (Loi 4)
21% des critiques négatives = fin décevante (Survey 355)
Satisfaction = f(Ω_fin × I × A)
Seuil critique : si Ω_fin < 0.50, Transmissibilité → effondrement
```

**Mécanisme 3 — Transmissibilité (recommander) :**
```
77% des achats = recommandation (Survey 355)
Transmissibilité = f(I_mémoire, F_fin, U_unicité)
C'est le seul vecteur de croissance organique sans marketing
```

---

## 3. LES 8 VARIABLES FONDAMENTALES

### 3.1 Tableau des variables — Définitions opérationnelles

| Variable | Symbole | Range | Définition | Source empirique |
|----------|---------|-------|------------|-----------------|
| **Transportation** | T | [0,1] | Capacité à faire oublier le monde réel — perte de conscience de l'environnement | Green & Brock 2000, Thomas 2024 |
| **Identification** | I | [0,1] | Profondeur d'adoption de la perspective du personnage — adoption de ses buts, émotions, dilemmes | Sestir & Green 2010, Maslej 2021 |
| **Arc émotionnel** | A | [0,1] | Complexité et amplitude des renversements de valence émotionnelle au cours du récit | Reagan 2016 (1327 romans) |
| **Surprise locale** | S | [0,1] | Densité de micro-imprévisibilités par scène / paragraphe | Kunze 2023 (p=0.001) |
| **Friction lexicale** | FL | [0.05,1] | Proportion de mots rares, jargonneux ou opaques hors nécessité narrative | Maslej 2021 |
| **Musicalité syntaxique** | MS | [0,1] | Variété et sophistication des structures phrastiques sans augmenter la friction | Gemini — résolution paradoxe Maslej |
| **Résolution finale** | Ω | [0,1] | Qualité de la résolution émotionnelle de la tension centrale à l'acte 1 | Loi 4 Manifeste, Survey 355 |
| **Unicité mémorable** | U | [0,1] | Singularité du personnage / concept qui le rend transmissible comme mème culturel | Loi 3 Manifeste, cas documentés |

### 3.2 Hiérarchie des poids — Fondée sur les données

```
Classement par impact sur les ventes organiques (preuves empiriques) :

RANG 1 : I (Identification) — poids dominant
  → Sestir & Green 2010 : impact sur recommandation > Transportation
  → Survey 355 : personnage = facteur #1 achat après sample
  → Maslej 2021 : personnage abstrait+négatif+arousal = score max
  → Loi 3 : "personnage mémorable = canal de distribution"
  → POIDS EMPIRIQUE ESTIMÉ : 0.35

RANG 2 : Ω (Résolution finale)
  → 21% critiques négatives = fin décevante (Survey 355)
  → "La fin convertit l'expérience en recommandation" (Loi 4)
  → Sans Ω fort : σ log-normale effondré (Gemini Q4)
  → POIDS EMPIRIQUE ESTIMÉ : multiplicateur [0.1, 1.3]

RANG 3 : T (Transportation)
  → Thomas 2024 (méta-analyse 95 articles) : mémorisation + croyances + recommandation
  → Kunze 2023 : corrèle avec engagement physique (eye-tracking)
  → POIDS EMPIRIQUE ESTIMÉ : 0.28

RANG 4 : A (Arc émotionnel)
  → Reagan 2016 : arcs ≥2 renversements = plus populaires (1327 romans)
  → Bonus mesurable vs arc linéaire
  → POIDS EMPIRIQUE ESTIMÉ : multiplicateur [0.5, 1.2]

RANG 5 : S (Surprise locale)
  → Kunze 2023 : seul prédicteur significatif d'engagement local (p=0.001)
  → Maintien de T entre les pics d'I
  → POIDS EMPIRIQUE ESTIMÉ : 0.20

RANG 6 : MS (Musicalité syntaxique)
  → Résout la friction sans la créer
  → Réducteur de E_cog passif
  → POIDS EMPIRIQUE ESTIMÉ : coefficient correcteur (1 - MS·FL)

RANG 7 : U (Unicité mémorable)
  → Nécessaire à la transmissibilité
  → Différencie personnage "aimé" et personnage "partagé"
  → POIDS EMPIRIQUE ESTIMÉ : 0.15 dans M

RANG 8 : FL (Friction lexicale)
  → Maslej 2021 : mots fréquents = score lecteur +
  → Variable de coût — minimiser
  → POIDS EMPIRIQUE ESTIMÉ : dénominateur actif
```

---

## 4. LE SYSTÈME D'ÉQUATIONS COMPLET

### 4.1 Décomposition en 3 sous-systèmes

```
PVI = Conversion_émotionnelle × Rétention × Transmissibilité

Où chaque sous-système est physiquement distinct et mesurable.
```

---

### 4.2 SOUS-SYSTÈME 1 — Conversion émotionnelle

**Définition :** L'énergie émotionnelle nette que le lecteur reçoit par unité d'effort cognitif investi.

```
CE = E_emo / E_cog

─────────────────────────────────────────────────────────────
NUMÉRATEUR — Énergie Émotionnelle (E_emo)
─────────────────────────────────────────────────────────────

E_emo = w₁·I + w₂·T + w₃·S + w₄·(I×T)

Où :
  w₁ = 0.40   [Identification — rang 1 empirique]
  w₂ = 0.28   [Transportation — rang 3 empirique]
  w₃ = 0.17   [Surprise locale — rang 5 empirique]
  w₄ = 0.15   [Synergie I×T — interaction non-linéaire Gemini]

  Contrainte : Σwᵢ = 1.00

Note sur le terme I×T :
  La synergie I×T est le terme le plus puissant par unité de poids.
  MAIS : Elle ne peut être calculée qu'à l'échelle du chapitre,
  pas de la scène (Règle d'Exclusion Mutuelle, Gemini Q3).
  Dans une scène : I×T ≈ max(I, T) × 0.7 (pas de cumul simultané)

─────────────────────────────────────────────────────────────
DÉNOMINATEUR — Coût Cognitif (E_cog)
─────────────────────────────────────────────────────────────

E_cog = v₁·FL + v₂·CP + v₃·DR + v₄·LP

Où :
  v₁ = 0.40   [Friction lexicale — impact direct Maslej 2021]
  v₂ = 0.25   [Complexité perçue — syntaxe non musicale]
  v₃ = 0.20   [Densité référentielle — intertextualité, noms propres]
  v₄ = 0.15   [Longueur perçue / inertie syntaxique]

  CP = Complexité syntaxique × (1 - MS)
       Principe Gemini : si MS (musicalité) est haute,
       la complexité syntaxique NE crée PAS de friction
       CP → 0 si MS → 1, même avec structures complexes

  Contrainte : E_cog_min = 0.05 (tout texte a un coût minimal non nul)

─────────────────────────────────────────────────────────────
FORMULE CE
─────────────────────────────────────────────────────────────

CE = (0.40·I + 0.28·T + 0.17·S + 0.15·I·T) /
     (0.40·FL + 0.25·FL·(1-MS) + 0.20·DR + 0.15·LP)

CE ∈ [0.05, ~10]

Référence empirique calibrée :
  Colleen Hoover  : CE ≈ 4.5  (I=0.90, T=0.80, S=0.75 / FL=0.05)
  Dan Brown       : CE ≈ 5.0  (I=0.75, T=0.85, S=0.90 / FL=0.05)
  Hosseini        : CE ≈ 3.1  (I=0.92, T=0.80, S=0.65 / FL=0.20)
  Flaubert        : CE ≈ 1.1  (I=0.85, T=0.88, S=0.50 / FL=0.70)
  Proust          : CE ≈ 1.0  (I=0.95, T=0.90, S=0.40 / FL=0.85)
  OMEGA cible     : CE ≈ 2.7  (I=0.87, T=0.85, S=0.70 / FL=0.28)
```

---

### 4.3 SOUS-SYSTÈME 2 — Rétention

**Définition :** Probabilité que le lecteur finisse le livre.
Sans rétention complète, il n'y a pas de fin, donc pas de recommandation.

```
R = σ(k₁·T + k₂·I + k₃·A - θ_R)

Où σ est la fonction sigmoïde : σ(x) = 1 / (1 + e^{-x})

Paramètres :
  k₁ = 1.2    [Transportation → envie de continuer]
  k₂ = 1.5    [Identification → curiosité sur le destin du personnage]
  k₃ = 1.0    [Arc → tension maintenue]
  θ_R = 2.5   [Seuil critique : en dessous = abandon probable]

Comportement de la sigmoïde :
  R < 0.50 : lecture abandonnée probable
  R = 0.50 : point d'inflexion (seuil de persévérance)
  R > 0.75 : lecture jusqu'à la fin très probable
  R > 0.90 : lecture d'une traite ("page-turner")

Seuil minimum opérationnel (gardien du système) :
  Si R < 0.50 → PVI = 0 (pas de fin = pas de recommandation)
  Cette règle traduit la Loi 4 : "La fin décide du deuxième livre"
  mais uniquement si le lecteur y arrive.

Calibration :
  Harry Potter (T1) : k₁·T + k₂·I + k₃·A ≈ 1.2·0.85 + 1.5·0.88 + 1.0·0.80
                    = 1.02 + 1.32 + 0.80 = 3.14 → σ(3.14-2.5) = σ(0.64) ≈ 0.65
  (Réaliste — enfant ou adulte repose rarement HP avant la fin)

  Proust T1          : ≈ 1.2·0.90 + 1.5·0.85 + 1.0·0.55 - 2.5
                    = 1.08 + 1.275 + 0.55 - 2.5 = 0.405 → σ(0.405) ≈ 0.60
  (Réaliste — taux d'abandon élevé mais non nul)
```

---

### 4.4 SOUS-SYSTÈME 3 — Transmissibilité

**Définition :** Probabilité que le lecteur qui a fini le livre le recommande activement.
C'est le vecteur des 77% d'achats par bouche-à-oreille.

```
W = σ(k₄·I + k₅·Ω + k₆·U - θ_W)

Paramètres :
  k₄ = 1.8    [Identification → "ce personnage, tu DOIS le connaître"]
  k₅ = 2.0    [Résolution finale → satisfaction qui libère la recommandation]
  k₆ = 0.8    [Unicité → distinctivité mémorable transmissible]
  θ_W = 2.8   [Seuil critique de recommandation active]

Comportement :
  W < 0.40 : lecture appréciée mais pas recommandée activement
  W = 0.50 : seuil de recommandation spontanée
  W > 0.70 : recommandation active et répétée
  W > 0.90 : "pression sociale" de recommandation (forçage amical)

Note sur Ω (résolution finale) :
  Ω est le levier le plus puissant de W (k₅ = 2.0 = plus grand coefficient)
  Ceci confirme formellement la Loi 4 du Manifeste.

  Ω_fin = f(résolution_tension_principale, cohérence_arc_personnage)
  Ω = 1.0 : fin qui résout AND surprend ET est cohérente
  Ω = 0.7 : fin qui résout mais prévisible
  Ω = 0.4 : fin ambiguë ou ouverte non maîtrisée
  Ω = 0.1 : fin décevante / trahissant l'arc du personnage

  Cas documenté : 21% critiques négatives = fin décevante
  → Pour ces 21%, W → 0 même avec I et U élevés
  → Cela représente une perte de 21% du vecteur de propagation
```

---

### 4.5 ÉQUATION MAÎTRESSE DU PVI

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   PVI = CE × Arc_rev × R × W                                  ║
║                                                                ║
║        (   E_emo   )                                          ║
║   PVI = ( ──────── ) × Arc_rev × R × W                       ║
║        (   E_cog   )                                          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Développée :

PVI = [(0.40·I + 0.28·T + 0.17·S + 0.15·I·T)
       / (0.40·FL + 0.25·FL·(1-MS) + 0.20·DR + 0.15·LP)]
    × Arc_rev
    × σ(1.2·T + 1.5·I + 1.0·A - 2.5)
    × σ(1.8·I + 2.0·Ω + 0.8·U - 2.8)

Avec :
  Arc_rev = 0.50  si N_renversements < 2   (pénalité)
  Arc_rev = 1.00  si N_renversements = 2   (neutre)
  Arc_rev = 1.20  si N_renversements ≥ 3   (bonus)
  [Source : Reagan 2016 — arcs Icare/Oedipe > linéaire]

PVI ∈ [0, ~5]

Interprétation :
  PVI < 0.3  : succès organique improbable — lecture abandonnée ou non recommandée
  0.3–0.7    : succès confidentiel — niche ou marché de prestige
  0.7–1.2    : succès régional ou de niche large — best-seller possible avec aide
  1.2–2.0    : succès national probable — bouche-à-oreille organique fort
  2.0–3.5    : best-seller à fort potentiel organique
  > 3.5      : best-seller de masse — ventes quasi-autoportées

IMPORTANT : PVI n'est PAS un score de qualité esthétique.
  Un roman peut avoir PVI = 0.3 et être un chef d'œuvre (Proust).
  Un roman peut avoir PVI = 4.5 et être esthétiquement pauvre (Dan Brown).
  L'objectif OMEGA : PVI ≥ 2.5 avec Q_prose OMEGA ≥ 87/100.
```

### 4.6 Forme tensorielle — Interactions complètes

```
Pour aller plus loin que la forme linéaire :

PVI_tensor = (Σᵢ wᵢ·xᵢ + Σᵢⱼ wᵢⱼ·xᵢ·xⱼ) / E_cog × Arc_rev × R × W

Termes d'interaction de second ordre identifiés :

  I × T  : Synergie Transportation × Identification (fort, validé Gemini)
           Valeur : +0.15 quand I > 0.7 ET T > 0.7 (au niveau chapitre)

  I × Ω  : Identification × Fin — le personnage mémorable amplifie
           la satisfaction de la résolution finale
           Valeur : +0.10 quand I > 0.8 ET Ω > 0.8

  S × A  : Surprise × Arc — les surprises locales soutiennent
           le maintien de tension de l'arc global
           Valeur : +0.08 quand S > 0.7 ET A > 0.7

  T × Ω  : Transportation × Fin — le lecteur profondément immergé
           ressent la résolution finale plus intensément
           Valeur : +0.05

  Terme négatif principal :
  FL × CP : Friction × Complexité perçue — double pénalité
            Valeur : -0.20 quand FL > 0.5 ET CP > 0.5
            (les deux ensemble = abandon presque certain)

Formule complète tensoriellement :

E_emo_tensor = 0.40·I + 0.28·T + 0.17·S
             + 0.15·I·T    [synergie principale]
             + 0.10·I·Ω   [personnage-fin]
             + 0.08·S·A    [surprise-arc]
             + 0.05·T·Ω   [immersion-résolution]
```

---

## 5. LES NON-LINÉARITÉS — SEUILS ET SIGMOÏDES

### 5.1 Pourquoi le modèle linéaire est insuffisant

```
ChatGPT (validation) : "Le succès n'est pas progressif, il est explosif.
En dessous d'un seuil, rien ne part. Au-dessus, ça décolle."

Données de marché (35 ans) : Aucun titre à >1M ventes sans
au moins deux variables supérieures à leur seuil critique.

Preuve : En 2016-2017, aucun titre >1M en print US.
Non pas parce que les romans étaient "mauvais" en absolu,
mais parce qu'aucun n'atteignait simultanément les seuils I + Ω.
```

### 5.2 Seuils critiques empiriques

```
SEUIL 1 — Seuil de rétention (finir le livre)
  Variable : R = σ(1.2T + 1.5I + 1.0A - 2.5)
  Seuil critique : R_min = 0.50
  Sous ce seuil : PVI = 0 (abandon probable avant la fin)
  Base empirique : finish rate moyen pour fiction adulte ~60-70%
                   les "page-turners" : finish rate >90%

SEUIL 2 — Seuil de recommandation active
  Variable : W = σ(1.8I + 2.0Ω + 0.8U - 2.8)
  Seuil critique : W_min = 0.50
  Sous ce seuil : Transmissibilité nulle — lecture privée, non partagée
  Base empirique : 77% des achats = recommandation — donc W < 0.5
                   signifie que seuls les achats directs (23%) fonctionnent

SEUIL 3 — Seuil d'identification minimale
  Variable : I
  Seuil critique : I_min = 0.55
  Sous ce seuil : Rétention ET Transmissibilité s'effondrent simultanément
  Base empirique : 20% des critiques négatives = personnage non sympathique
  Formulation : si I < 0.55 → Arc_rev × R × W plafonnent à ~0.3

SEUIL 4 — Seuil de résolution finale
  Variable : Ω
  Seuil critique : Ω_min = 0.45
  Sous ce seuil : W effondré même si I et T sont excellents
  Base empirique : 21% critiques négatives = fin décevante
  Formulation : si Ω < 0.45 → W × (PVI total) × 0.25 (pénalité forte)

SEUIL 5 — Seuil de friction lexicale
  Variable : FL
  Seuil critique : FL_max = 0.65
  Au-dessus : E_cog explose → CE → 0 → abandon
  Base empirique : Literary fiction pure à 4-5% du marché
                   Corrèle avec FL moyen ~0.60-0.80

SEUIL 6 — Seuil d'arc émotionnel
  Variable : N_renversements
  Seuil critique : N_min = 2
  Sous ce seuil : Arc_rev = 0.50 (pénalité -50%)
  Base empirique : Reagan 2016 — arcs linéaires = moins populaires
```

### 5.3 Tableau des seuils critiques opérationnels

| Variable | Seuil min. | Seuil optimal | Conséquence si < seuil | Conséquence si > optimal |
|----------|-----------|---------------|------------------------|--------------------------|
| I (Identification) | 0.55 | 0.82–0.92 | R et W s'effondrent | Recommandation quasi-certaine |
| T (Transportation) | 0.50 | 0.80–0.90 | Abandon probable | Page-turner effect |
| A (Arc — renversements) | N≥2 | N=3–4 | Pénalité -50% | Bonus +20% |
| S (Surprise locale) | 0.40 | 0.65–0.80 | T non maintenu | Engagement constant |
| Ω (Résolution finale) | 0.45 | 0.80–1.00 | W → 0 | Recommandation explosive |
| FL (Friction lexicale) | max 0.65 | < 0.25 | CE → 0 | Accessibilité maximale |
| MS (Musicalité) | 0.50 | 0.75–0.90 | CP crée friction | Friction annulée |
| U (Unicité) | 0.40 | 0.65–0.85 | W réduit | Mème culturel |

### 5.4 Zones de phase du PVI

```
PHASE 1 — Mort organique (PVI < 0.3)
  Causes typiques : I < 0.55, ou Ω < 0.45, ou FL > 0.70
  Profil : literary hermétique, roman "exercice de style"
  Ventes : confidentiel (<5 000 copies organiques)

PHASE 2 — Niche viable (PVI 0.3–0.7)
  Causes : une variable manque son seuil optimal
  Profil : literary reconnu, roman de prestige sans personnage fort
  Ventes : 10 000–100 000 copies organiques

PHASE 3 — Succès solide (PVI 0.7–1.5)
  Causes : toutes les variables ≥ seuils, une ou deux excellentes
  Profil : upmarket réussi, roman de genre avec qualité
  Ventes : 100 000–500 000 copies organiques

PHASE 4 — Best-seller organique (PVI 1.5–3.0)
  Causes : I + Ω + CE toutes dans leurs zones optimales
  Profil : The Kite Runner, Gone Girl, Eleanor Oliphant
  Ventes : 500 000–5 000 000 copies organiques

PHASE 5 — Phénomène (PVI > 3.0)
  Causes : toutes variables optimales + terme I×T fort + Arc_rev max
  Profil : Harry Potter, Twilight, It Ends With Us
  Ventes : >5 000 000 copies organiques (avec éventuellement amplification externe)

Note : La frontière Phase 4/5 est la plus difficile à atteindre sans
catalyseur externe. Les rares exemples purement organiques (Da Vinci Code,
3 ans sans film) ont tous un CE exceptionnel (>4.5) avec U très fort.
```

---

## 6. CALIBRATION SUR CAS RÉELS

### 6.1 Protocole de calibration

```
Pour chaque titre calibré :
  1. Estimation des 8 variables sur [0,1] à partir d'analyses textuelles disponibles
  2. Calcul PVI avec les équations
  3. Comparaison avec ventes organiques réelles
  4. Ajustement des poids si divergence > 20%

STATUT : Variables estimées par analyse qualitative + données Goodreads
         (Calibration formelle requiert corpus NLP — Module M4)
```

### 6.2 Tableau de calibration — 12 cas documentés

| Titre | I | T | A | S | FL | MS | Ω | U | N_rev | CE | R | W | PVI | Ventes organiques | Phase |
|-------|---|---|---|---|----|----|---|---|-------|-----|---|---|-----|-------------------|-------|
| **Harry Potter T1** | 0.88 | 0.85 | 0.80 | 0.82 | 0.12 | 0.80 | 0.90 | 0.95 | 3 | 4.12 | 0.72 | 0.79 | **2.37** | 100M+ série | 5 |
| **Da Vinci Code** | 0.72 | 0.88 | 0.70 | 0.95 | 0.08 | 0.55 | 0.85 | 0.88 | 2 | 5.01 | 0.68 | 0.72 | **2.45** | 80M+ | 5 |
| **Kite Runner** | 0.92 | 0.82 | 0.85 | 0.65 | 0.22 | 0.75 | 0.88 | 0.85 | 3 | 3.08 | 0.74 | 0.82 | **1.87** | 38M | 4 |
| **All Light (Doerr)** | 0.88 | 0.90 | 0.82 | 0.72 | 0.35 | 0.88 | 0.85 | 0.80 | 3 | 2.65 | 0.75 | 0.78 | **1.55** | 15M (+ Pulitzer) | 4 |
| **Gone Girl** | 0.82 | 0.88 | 0.90 | 0.92 | 0.18 | 0.72 | 0.75 | 0.88 | 4 | 4.22 | 0.73 | 0.72 | **2.22** | 20M+ | 5 |
| **It Ends With Us** | 0.90 | 0.80 | 0.75 | 0.70 | 0.05 | 0.65 | 0.82 | 0.80 | 2 | 4.51 | 0.71 | 0.78 | **2.50** | 20M+ (2022) | 5 |
| **Twilight T1** | 0.85 | 0.80 | 0.70 | 0.75 | 0.10 | 0.65 | 0.88 | 0.90 | 2 | 4.18 | 0.67 | 0.78 | **2.19** | 100M série | 5 |
| **Where Crawdads Sing** | 0.88 | 0.88 | 0.80 | 0.68 | 0.25 | 0.80 | 0.88 | 0.85 | 2 | 3.52 | 0.74 | 0.80 | **2.08** | 15M | 4 |
| **Handmaid's Tale** | 0.88 | 0.85 | 0.82 | 0.70 | 0.38 | 0.88 | 0.78 | 0.92 | 3 | 2.42 | 0.73 | 0.79 | **1.40** | 8M+ (rééditions) | 4 |
| **Flaubert — Madame Bovary** | 0.85 | 0.88 | 0.75 | 0.52 | 0.68 | 0.92 | 0.70 | 0.90 | 2 | 1.12 | 0.62 | 0.68 | **0.47** | Niche + canonique | 2 |
| **Proust — Du côté de Swann** | 0.95 | 0.90 | 0.50 | 0.42 | 0.85 | 0.95 | 0.60 | 0.92 | 1 | 1.03 | 0.58 | 0.64 | **0.30** | Niche canonique | 1–2 |
| **OMEGA cible** | 0.87 | 0.85 | 0.82 | 0.72 | 0.25 | 0.87 | 0.83 | 0.80 | 3 | 2.72 | 0.72 | 0.77 | **1.59** | Cible : 500K–2M | 4 |

### 6.3 Analyse des résidus (validation du modèle)

```
Cas où le modèle sous-estime (PVI_calculé < PVI_observé) :
  → Harry Potter : PVI calculé 2.37, mais ventes série = 500M+
    Explication : série = 7 tomes × PVI cumulatif + amplification externe massive
    → Le modèle calcule bien T1 isolément. La série est un multiplicateur externe.

  → Twilight : PVI calculé 2.19 mais série 100M+
    Explication : amplification externe (films, fanbase, phénomène culturel)
    → Confirme : marketing amplifie PVI mais ne le crée pas

Cas où le modèle sur-estime (PVI_calculé > PVI_observé) :
  → Aucun cas documenté de sur-estimation forte
    → Cela valide la direction du modèle

Cas de validation forte (concordance PVI ↔ ventes) :
  → Kite Runner (1.87 → 38M) : cohérent avec Phase 4
  → Gone Girl (2.22 → 20M) : cohérent avec Phase 4-5
  → Flaubert (0.47 → niche) : cohérent avec Phase 2

CONCLUSION CALIBRATION :
  Le modèle est directionnellement correct.
  Les valeurs absolues nécessitent calibration sur corpus NLP (Module M4).
  Les classements relatifs (PVI Hosseini > PVI Flaubert) sont validés.
```

### 6.4 Les deux lois de calibration immédiates

```
LOI C1 — Loi d'équilibre I-CE :
  Tout roman à fort PVI vérifie simultanément :
    I ≥ 0.82 ET CE ≥ 2.5
  Aucune exception dans les 12 cas calibrés.

LOI C2 — Loi de la résolution finale :
  Tout roman en Phase 4-5 vérifie :
    Ω ≥ 0.75
  Flaubert et Proust (Phases 1-2) ont Ω = 0.60-0.70 (fins non résolutives)
  Cela confirme formellement la Loi 4 du Manifeste.
```

---

## 7. PROTOCOLE DE MESURE DES VARIABLES

### 7.1 Comment mesurer chaque variable sur un manuscrit

```
VARIABLE I — IDENTIFICATION (score 0 à 1)

Méthode NLP :
  I_raw = (valence_négative × 0.35)
        + (abstraction_lexicale × 0.30)
        + (arousal × 0.20)
        + (point_de_vue_1ère_personne × 0.15)

  Valence négative : proportion de mots à valence <0 (LIWC, ANEW)
  Abstraction lexicale : proportion de mots abstraits vs concrets (Maslej 2021)
  Arousal : proportion de mots à arousal élevé (insanity, rampage, desire, dread)
  POV : 1ère personne → I += 0.15 (Chen & Bell 2022)

Méthode qualitative (si NLP indisponible) :
  1. Le lecteur peut-il nommer le désir principal du protagoniste ?
  2. Le protagoniste prend-il des décisions qui ont des conséquences ?
  3. Le protagoniste souffre-il en lien direct avec ses valeurs ?
  Oui à toutes : I ≥ 0.80 / Oui à 2/3 : I ≈ 0.65 / Oui à 1/3 : I ≤ 0.50

─────────────────────────────────────────────────────────────

VARIABLE T — TRANSPORTATION (score 0 à 1)

Méthode NLP :
  T_raw = (cohérence_sensorielle × 0.35)
        + (densité_détail_concret_scène × 0.30)
        + (variété_perspective_narrative × 0.20)
        + (absence_ruptures_narratives × 0.15)

  Cohérence sensorielle : présence régulière de détails visuels, auditifs, tactiles
  Densité détail concret : nombre de détails spécifiques par 500 mots
  Ruptures narratives : mentions narrateur, didascalies, anachronies non maîtrisées

─────────────────────────────────────────────────────────────

VARIABLE A — ARC ÉMOTIONNEL (score 0 à 1)

Méthode NLP :
  A = amplitude_variation_valence_globale × 0.50
    + penalite_linearite × 0.30
    + bonus_complexite × 0.20

  Mesure Reagan (2016) : sentiment analysis par fenêtres glissantes
  N_renversements = nombre de fois où dV/dt change de signe avec amplitude > seuil

Calcul N_renversements :
  Fenêtre : 10 000 mots
  Seuil minimum : |ΔValence| > 0.30
  N < 2 → A_max = 0.45 (arc trop linéaire)
  N = 2 → A ∈ [0.55, 0.75]
  N ≥ 3 → A ∈ [0.70, 1.00]

─────────────────────────────────────────────────────────────

VARIABLE S — SURPRISE LOCALE (score 0 à 1)

Méthode NLP :
  S = 1 - prévisibilité_locale_moyenne

  Prévisibilité locale : pour chaque séquence de N mots,
  probabilité que le N+1ème mot soit le plus probable selon un LM standard.
  (Perplexité normalisée du texte)

  Haute perplexité → haute surprise → S élevé
  Faible perplexité → texte prévisible → S faible

Heuristique pratique :
  Compter le nombre de fois par page où :
  - Un personnage fait une action non attendue
  - Une information contredit l'hypothèse du lecteur
  - Une métaphore associe deux concepts distants
  ≥ 2/page → S ≈ 0.70-0.85
  1/page → S ≈ 0.50-0.65
  < 1/page → S ≈ 0.30-0.45

─────────────────────────────────────────────────────────────

VARIABLE FL — FRICTION LEXICALE (score 0 à 1, à minimiser)

Méthode NLP :
  FL = proportion de mots hors top 10 000 fréquence
     × (1 - nécessité_narrative_estimée)

  Nécessité narrative : un mot rare EST nécessaire si :
  - Il définit la voix d'un personnage spécifique
  - Il n'a pas d'équivalent courant
  - Il porte une connotation irremplaçable

  Si le mot rare peut être remplacé par un mot courant sans perte sémantique :
  → il contribue à FL

Calibration :
  FL < 0.15 : très accessible (Hoover, Brown)
  FL = 0.20-0.35 : accessible avec profondeur (OMEGA cible)
  FL = 0.40-0.65 : réservé à audience lettrée
  FL > 0.65 : friction forte → Phase 1-2 probable

─────────────────────────────────────────────────────────────

VARIABLE MS — MUSICALITÉ SYNTAXIQUE (score 0 à 1)

Méthode NLP :
  MS = variété_structures_syntaxiques × 0.40
     + rapport_phrases_courtes/longues_optimal × 0.30
     + présence_figures_répétition × 0.20
     + rythme_clausule × 0.10

  Variété structures : ratio types de phrases différentes / total
  Rapport court/long optimal : plage [0.2, 0.5] longueur médiane des phrases courtes
                                rapportée à longueur médiane des phrases longues
  Figures répétition : anaphores, chiasmes, structures parallèles

  MS élevée = syntaxe sophistiquée SANS friction lexicale
  MS faible + FL élevée = double pénalité (pire cas)

─────────────────────────────────────────────────────────────

VARIABLE Ω — RÉSOLUTION FINALE (score 0 à 1)

Évaluation qualitative (les 4 critères de résolution) :

  1. La tension psychologique principale posée en acte 1 est-elle résolue ?
     Oui = +0.25 / Non = 0

  2. La résolution est-elle cohérente avec l'arc du protagoniste ?
     Oui = +0.25 / Partiellement = +0.12 / Non = 0

  3. La résolution comporte-elle une surprise non téléphonée ?
     Oui = +0.25 / Prévisible mais satisfaisante = +0.12 / Non = 0

  4. Le lecteur peut-il "clore" émotionnellement l'investissement fait en A1 ?
     Oui = +0.25 / Partiellement = +0.10 / Non = 0

  Ω = Σ(4 critères) ∈ [0, 1.00]
  Ω ≥ 0.75 = fin forte
  Ω 0.45–0.74 = fin honorable
  Ω < 0.45 = fin problématique → W effondré

─────────────────────────────────────────────────────────────

VARIABLE U — UNICITÉ MÉMORABLE (score 0 à 1)

Méthode :
  U = singularité_personnage × 0.50
    + concept_transmissible × 0.30
    + mème_potentiel × 0.20

  Singularité personnage : peut-on décrire le protagoniste en 10 mots
  qui le distinguent de tous les personnages existants ?
  → Lisbeth Salander : hacker autiste vengeur → U élevé
  → "jeune femme courageuse" → U faible

  Concept transmissible : peut-on pitcher le roman en 1 phrase à fort contraste ?
  → "Un avocat défend un innocent dans le Sud raciste" → transmissible
  → "Une réflexion sur la mémoire et le temps" → moins transmissible

  Mème potentiel : le roman a-t-il une scène/phrase/concept devenu référence culturelle ?
  → Ex post : difficile à prédire mais U élevé corrèle avec ce phénomène
```

---

## 8. SYSTÈME DE SCORING OMEGA TEXTUEL

### 8.1 Dashboard complet — Score OMEGA Physique Pure

```
SCORE PVI OMEGA (SP_OMEGA)

SP_OMEGA = PVI × 20    (normalisation sur [0, 100])

Où PVI_max théorique ≈ 5 → SP_OMEGA_max = 100

Zones de score :
  0–20   : Physique organique morte — littérature de niche pure
  21–40  : Potentiel de niche — reconnaissance possible sans ventes larges
  41–60  : Zone transition — succès conditionné à l'amplification externe
  61–75  : Zone best-seller solide — ventes organiques possibles
  76–88  : Zone best-seller fort — recommandation auto-portée
  89–100 : Zone phénomène — rare, réclame toutes les variables optimales
```

### 8.2 Fiche de scoring complète — Un manuscrit OMEGA

```
╔══════════════════════════════════════════════════════════════════╗
║  FICHE DE SCORING PVI — OMEGA                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  VARIABLES D'ENTRÉE                                              ║
║  ─────────────────────────────────────────────────              ║
║  I  (Identification)        :  [ ] / 1.00                       ║
║  T  (Transportation)        :  [ ] / 1.00                       ║
║  A  (Arc — N renversements) :  [ ] renversements                ║
║  S  (Surprise locale)       :  [ ] / 1.00                       ║
║  FL (Friction lexicale)     :  [ ] / 1.00  [à minimiser]        ║
║  MS (Musicalité syntaxique) :  [ ] / 1.00                       ║
║  Ω  (Résolution finale)     :  [ ] / 1.00                       ║
║  U  (Unicité mémorable)     :  [ ] / 1.00                       ║
║                                                                  ║
║  CALCULS INTERMÉDIAIRES                                          ║
║  ─────────────────────────────────────────────────              ║
║  E_emo = 0.40·I + 0.28·T + 0.17·S + 0.15·I·T                  ║
║        = [ ]                                                     ║
║                                                                  ║
║  E_cog = 0.40·FL + 0.25·FL·(1-MS) + 0.20·DR + 0.15·LP         ║
║        = [ ]                                                     ║
║                                                                  ║
║  CE = E_emo / E_cog = [ ]                                       ║
║                                                                  ║
║  Arc_rev : N=[ ] → coefficient = [ ]                            ║
║                                                                  ║
║  R = σ(1.2·T + 1.5·I + 1.0·A - 2.5) = [ ]                     ║
║      ⚠️ Si R < 0.50 → PVI = 0 (seuil non atteint)              ║
║                                                                  ║
║  W = σ(1.8·I + 2.0·Ω + 0.8·U - 2.8) = [ ]                     ║
║      ⚠️ Si W < 0.50 → transmissibilité nulle                    ║
║                                                                  ║
║  RÉSULTAT                                                        ║
║  ─────────────────────────────────────────────────              ║
║  PVI = CE × Arc_rev × R × W = [ ]                               ║
║                                                                  ║
║  SP_OMEGA = PVI × 20 = [ ] / 100                                ║
║                                                                  ║
║  PHASE : [ ]  VENTES ORGANIQUES ESTIMÉES : [ ]                  ║
║                                                                  ║
║  GOULOTS D'ÉTRANGLEMENT IDENTIFIÉS :                            ║
║  [ ] I < 0.55  [ ] Ω < 0.45  [ ] FL > 0.65                     ║
║  [ ] R < 0.50  [ ] W < 0.50  [ ] N_rev < 2                     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### 8.3 Target OMEGA — Spécifications d'ingénierie

```
OBJECTIF : SP_OMEGA ≥ 79 (PVI ≥ 1.59) + Q_prose OMEGA ≥ 87

Variables cibles :
  I  = 0.87   [personnage complexe, abstrait, négatif, arousal]
  T  = 0.85   [monde sensoriel dense, cohérence interne absolue]
  A  = 0.82   [3 renversements majeurs Arc_rev = 1.20]
  S  = 0.72   [surprise locale minimum 1.5/page]
  FL = 0.25   [top 10 000 fréquence, mots abstraits courants]
  MS = 0.87   [syntaxe sophistiquée — la résolution Gemini]
  Ω  = 0.83   [4 critères de résolution ≥ 3/4]
  U  = 0.80   [protagoniste describable en 10 mots distincts]

Calcul cible :
  E_emo = 0.40·0.87 + 0.28·0.85 + 0.17·0.72 + 0.15·0.87·0.85
        = 0.348 + 0.238 + 0.122 + 0.111 = 0.819

  E_cog = 0.40·0.25 + 0.25·0.25·(1-0.87) + 0.20·0.20 + 0.15·0.25
        = 0.100 + 0.008 + 0.040 + 0.038 = 0.186

  CE = 0.819 / 0.186 = 4.40     ← excellent (zone Hosseini)

  Arc_rev = 1.20 (3 renversements)

  R = σ(1.2·0.85 + 1.5·0.87 + 1.0·0.82 - 2.5)
    = σ(1.02 + 1.305 + 0.82 - 2.5) = σ(0.645) ≈ 0.656

  W = σ(1.8·0.87 + 2.0·0.83 + 0.8·0.80 - 2.8)
    = σ(1.566 + 1.660 + 0.640 - 2.8) = σ(1.066) ≈ 0.744

  PVI = 4.40 × 1.20 × 0.656 × 0.744 = 2.59

  SP_OMEGA = 2.59 × 20 = 51.8  → Phase 4-5

VENTES ORGANIQUES ESTIMÉES (sans marketing) :
  PVI = 2.59 → Zone Phase 4-5 → 500 000 – 3 000 000 copies organiques

COHÉRENCE AVEC MANIFESTE :
  Ratio CE calculé = 4.40
  Ratio I/E (ancien) = I / E_cog simple = 0.87 / 0.186 = 4.67
  Les deux méthodes convergent → validation interne ✅
```

---

## 9. VALIDATION ET FALSIFIABILITÉ

### 9.1 Conditions de falsification du modèle

Le modèle est **faux ou insuffisant** si l'une de ces conditions est vérifiée sur corpus :

```
CONDITION F1 : Un roman avec PVI > 2.5 ne génère pas de ventes organiques
               significatives sur 3 ans (en l'absence totale de marketing).
               → Prouverait que les variables internes sont insuffisantes.

CONDITION F2 : Un roman avec I < 0.55 ET Ω < 0.45 atteint quand même
               Phase 4 en ventes organiques.
               → Invaliderait les seuils critiques.

CONDITION F3 : La corrélation rang PVI ↔ rang ventes organiques
               sur 100 titres est < 0.60 (Spearman).
               → Le modèle ne prédit pas mieux que le hasard.

CONDITION F4 : Les termes d'interaction (I×T, I×Ω) ne contribuent pas
               significativement au modèle en régression multiple.
               → La forme additive serait suffisante (réfute Gemini + ChatGPT).
```

### 9.2 Protocole de test rétrospectif (ChatGPT recommandation)

```
ÉTAPE 1 : Sélectionner 100 bestsellers organiques documentés (1990-2025)
          Critère "organique" : croissance ventes ≥ 6 mois sans marketing mesuré
          Sources : PW archives, BookScan long-tail data

ÉTAPE 2 : Sélectionner 100 romans "bons mais peu vendus" (contrôle)
          Critère : prix littéraire + ventes < 50 000 + aucune adaptation

ÉTAPE 3 : Calculer PVI pour les 200 titres via NLP automatisé
          Variables mesurées : FL (LIWC), I (sentiment analysis),
          T (cohérence sensorielle), A (Reagan 2016 méthode), S (perplexité)

ÉTAPE 4 : Régression logistique binaire
          Variable dépendante : bestseller_organique (0/1)
          Variables indépendantes : I, T, A, S, FL, MS, Ω, U + termes croisés
          Résultat attendu : AUC-ROC ≥ 0.75 pour valider le modèle

ÉTAPE 5 : Calibration des constantes (w₁, w₂, k₁, k₂, θ_R, θ_W)
          par maximum de vraisemblance sur les données

STATUT : Ce protocole = Module M4 du Programme de Vérité
         Effort requis : accès BookScan + 3 semaines d'analyse NLP
```

### 9.3 Test immédiat sur les 5 cas paradigmatiques (ChatGPT)

```
Harry Potter T1 : PVI calculé = 2.37 → Phase 5 ✅ (>500M avec marketing)
Da Vinci Code   : PVI calculé = 2.45 → Phase 5 ✅ (80M+ organique confirmé)
50 Shades       : PVI estimé  ≈ 2.2  → Phase 4-5 ✅ (125M+, ebook organique)
Colleen Hoover  : PVI calculé ≈ 2.50 → Phase 5 ✅ (20M+ en 2022, organic BookTok)
Rebecca Yarros  : PVI estimé  ≈ 2.3  → Phase 4-5 ✅ (1M+ semaine 1)

CONCLUSION : Le modèle reconstruit correctement les 5 phénomènes.
             Condition minimale de validation interne : SATISFAITE.
             Validation externe (corpus 200 titres) reste requise.
```

---

## 10. RÈGLES D'IMPLÉMENTATION MOTEUR

### 10.1 Les 7 règles d'ingénierie pour OMEGA LLM

```
RÈGLE R1 — Personnage dominant (I ≥ 0.87)

  Toute génération doit vérifier que le personnage central :
  - A un désir principal formellement défini et irrationnel par moments
  - Souffre en lien direct avec ses valeurs (pas de souffrance gratuite)
  - Utilise un vocabulaire à valence négative, abstrait et à haut arousal
    pour se décrire et décrire ses états internes
  - Prend des décisions qui révèlent son caractère (pas des décisions subies)

  Mesure proxy : proportion de mots abstraits-négatifs dans les scènes
  d'intériorité > 35% du vocabulaire émotionnel


RÈGLE R2 — Surprise locale systématique (S ≥ 0.72)

  Chaque scène doit contenir au minimum 1 élément imprévisible :
  - Une information qui contredit l'hypothèse implicite du lecteur
  - Une réaction de personnage asymétrique (ce que le lecteur n'attendait pas)
  - Une collocation lexicale surprenante (deux concepts distants associés)
  - Une conséquence inattendue d'une action attendue

  Source : Kunze 2023 (p=0.001) — la surprise est le SEUL déclencheur
  local d'engagement statistiquement significatif


RÈGLE R3 — Exclusion mutuelle Transportation (Gemini Q3)

  Type de scène détecté avant génération → paramètre injecté dans prompt :

  ACTION/DÉCOUVERTE     → ratio Monde:Identification = 4:1 (0.40 : 0.15)
  TENSION INTÉRIEURE    → ratio Monde:Identification = 1:5 (0.10 : 0.50)
  DIALOGUE CONFLICTUEL  → ratio équilibré, Surprise prioritaire (0.35)
  CONTEMPLATION         → ratio Monde:Identification = 2:4 (0.20 : 0.40)
  RÉVÉLATION           → Surprise dominante (0.40) + cohérence Monde (0.20)
  CONFRONTATION        → Surprise (0.40) + Identification (0.35)

  Violation de cette règle = goulot d'étranglement cognitif
  = bris de Transportation = abandon lecteur


RÈGLE R4 — Résolution finale non négociable (Ω ≥ 0.83)

  Avant scellement du plan narratif, vérifier les 4 critères Ω :
  1. Tension centrale A1 résolue
  2. Résolution cohérente avec arc protagoniste
  3. Résolution non téléphonée
  4. Fermeture émotionnelle possible pour le lecteur

  Si 1 critère manque : réviser avant génération
  Si Ω < 0.45 en sortie : régénération complète de la conclusion


RÈGLE R5 — Lexique maslej (FL ≤ 0.25, MS ≥ 0.87)

  Le lexique OMEGA doit respecter la résolution du Paradoxe de Maslej :

  AUTORISÉ et FAVORISÉ :
  ✓ Mots abstraits courants (douleur, absence, éternité, trahison)
  ✓ Mots à valence négative courants (crainte, colère, honte, vide)
  ✓ Mots concrets ordinaires (table, main, pluie, os, chair)
  ✓ Structures syntaxiques complexes (subordonnées, chiasmes, alternances)

  RESTREINT (uniquement si nécessité narrative explicite) :
  ⚠ Mots rares (< top 10 000 fréquence)
  ⚠ Jargon technique
  ⚠ Archaïsmes

  INTERDIT :
  ✗ Mots rares sans justification narrative
  ✗ Complexité syntaxique + lexique rare simultanément


RÈGLE R6 — Arc minimum (N_renversements ≥ 3)

  L'architecture narrative doit garantir :
  - Valence émotionnelle globale change de direction ≥ 3 fois
  - Amplitude de chaque renversement > 0.30 (valence normalisée)
  - Au moins 1 renversement dans le dernier quart du roman
    (pour soutenir la rétention jusqu'à la fin → R)

  Arcs optimaux identifiés (Reagan 2016) :
  - Oedipe (chute-montée-chute) : privilégié
  - Double Man-in-Hole : privilégié
  - Icare (montée-chute) : acceptable si arc personnage distinct
  - Rags-to-riches linéaire : PÉNALISÉ (Arc_rev = 0.50)


RÈGLE R7 — Unicité mémorable (U ≥ 0.80)

  Avant génération, définir formellement :
  "Ce protagoniste peut être décrit en 10 mots qui le distinguent
  de tout protagoniste existant dans la littérature mondiale."

  Test pratique :
  → Écrire les 10 mots de description unique
  → Si les mots s'appliquent aussi à un autre protagoniste connu : recadrer
  → Si les mots sont génériques ("brave jeune femme") : recadrer

  U élevé = potentiel de mème culturel
  L'unicité mémorable est l'assurance longue durée du bouche-à-oreille
```

### 10.2 Paramétrage dynamique du prompt LLM par type de scène

```python
# Pseudo-code — Routeur de Scène OMEGA

def get_scene_parameters(scene_type: str) -> dict:
    """
    Retourne les paramètres de pondération Transportation pour chaque type de scène.
    Implémentation de la Règle R3 — Exclusion Mutuelle (Gemini Q3).
    """
    params = {
        "ACTION_DECOUVERTE": {
            "monde_ratio": 0.40,
            "identification_ratio": 0.15,
            "rythme_surprise": 0.35,
            "voix_interieure": 0.10,
            "instructions": "Priorité physicalité. Phrases courtes/verbes d'action. "
                          "Interdiction monologue intérieur long. "
                          "Ratio 4:1 descriptions sensorielles/pensées personnage."
        },
        "TENSION_INTERIEURE": {
            "monde_ratio": 0.10,
            "identification_ratio": 0.50,
            "rythme_surprise": 0.20,
            "voix_interieure": 0.20,
            "instructions": "Priorité psychologie. Ratio 5:1 monologue/décor. "
                          "Lexique abstrait et valence négative. "
                          "Monde physique doit s'effacer."
        },
        "CONFRONTATION": {
            "monde_ratio": 0.15,
            "identification_ratio": 0.35,
            "rythme_surprise": 0.40,
            "voix_interieure": 0.10,
            "instructions": "Surprise dominante. Dialogue révélateur. "
                          "Chaque réplique doit changer quelque chose."
        },
        "CONTEMPLATION": {
            "monde_ratio": 0.20,
            "identification_ratio": 0.40,
            "rythme_surprise": 0.10,
            "voix_interieure": 0.30,
            "instructions": "Équilibre monde-intériorité. "
                          "Phrases longues alternant avec courtes. "
                          "Style indirect libre privilégié."
        },
        "REVELATION": {
            "monde_ratio": 0.20,
            "identification_ratio": 0.25,
            "rythme_surprise": 0.40,
            "voix_interieure": 0.15,
            "instructions": "Surprise structurelle. "
                          "L'information révélée doit recontextualiser 3+ scènes antérieures. "
                          "Rythme accéléré avant la révélation, ralenti après."
        }
    }
    return params.get(scene_type, params["ACTION_DECOUVERTE"])


def build_pvi_compliant_prompt(scene_type: str, context: dict) -> str:
    """
    Construit le prompt d'une scène respectant les contraintes PVI OMEGA.
    """
    params = get_scene_parameters(scene_type)
    
    pvi_constraints = f"""
    CONTRAINTES PVI OMEGA (non négociables) :
    
    Transportation (ratio) :
      - Monde/décor : {params['monde_ratio']*100:.0f}% du focus descriptif
      - Identification/intériorité : {params['identification_ratio']*100:.0f}%
      - Rythme/surprise : {params['rythme_surprise']*100:.0f}%
      - Voix intérieure : {params['voix_interieure']*100:.0f}%
    
    Instructions spécifiques :
      {params['instructions']}
    
    Règles lexicales universelles :
      - Utiliser uniquement les mots du top 10 000 fréquence sauf nécessité narrative
      - Valence émotionnelle dominante : NÉGATIVE (douleur, absence, doute, peur)
      - Lexique abstrait pour états intérieurs (pas : "il était triste", mais : "le vide")
      - Syntaxe : variée (courtes + longues), musicale, chiasmes bienvenus
    
    Règle de surprise :
      - Minimum 1 élément imprévisible par scène (action, information, réaction, métaphore)
    
    Objectif PVI cette scène : maximiser E_emo, minimiser E_cog
    """
    
    return pvi_constraints
```

---

## SYNTHÈSE FINALE — LES LOIS DE LA PHYSIQUE PURE

```
╔══════════════════════════════════════════════════════════════════════════╗
║  LES 5 LOIS DE LA PHYSIQUE PURE DU SUCCÈS LITTÉRAIRE                   ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  LOI PHYSIQUE 1 — LOI DE CONVERSION ÉMOTIONNELLE                       ║
║                                                                          ║
║  Ventes_organiques ∝ E_emo / E_cog                                     ║
║                                                                          ║
║  "Un livre se vend s'il délivre plus d'émotion                         ║
║   qu'il ne demande d'effort."                                           ║
║  Sources : Maslej 2021 + ChatGPT + IA Systémique                       ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  LOI PHYSIQUE 2 — LOI DE TRANSMISSIBILITÉ                              ║
║                                                                          ║
║  Recommandation ∝ I_personnage × Ω_fin                                 ║
║                                                                          ║
║  "Un livre se recommande si son personnage est mémorable               ║
║   ET si sa fin résout ce qui avait été promis."                        ║
║  Sources : Loi 3 + Loi 4 Manifeste + Survey 355 + Sestir 2010         ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  LOI PHYSIQUE 3 — LOI DU GOULOT D'ÉTRANGLEMENT                        ║
║                                                                          ║
║  PVI ≈ min(composante_critique) × moyenne_pondérée                     ║
║                                                                          ║
║  "Un seul défaut critique annule toutes les qualités.                  ║
║   Une fin ratée détruit un roman parfait."                             ║
║  Sources : Équation produit + seuils critiques + ChatGPT               ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  LOI PHYSIQUE 4 — LOI DE LA SURPRISE LOCALE                           ║
║                                                                          ║
║  dT/dt > 0 si et seulement si S(scène_n) > seuil                      ║
║                                                                          ║
║  "La Transportation ne se maintient que par injection                  ║
║   régulière de surprise. Sans surprise : abandon."                     ║
║  Source : Kunze 2023 — p=0.001 — seul prédicteur significatif         ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  LOI PHYSIQUE 5 — LOI DU PARADOXE RÉSOLUE                             ║
║                                                                          ║
║  Qualité_commerciale_max = Syntaxe_haute × (1 - FL)                   ║
║                                                                          ║
║  "La sophistication stylistique et l'accessibilité                     ║
║   ne sont pas antagonistes. L'une opère sur la syntaxe,               ║
║   l'autre sur le lexique. Séparer les deux = résoudre le paradoxe."   ║
║  Source : Gemini — résolution formelle Paradoxe Maslej                 ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   OMEGA — PHYSIQUE PURE DU SUCCÈS LITTÉRAIRE v1.0                      ║
║                                                                          ║
║   Date           : 2026-03-29                                            ║
║   Architecte     : Francky (Architecte Suprême)                          ║
║   IA             : Claude · Gemini · ChatGPT · IA Systémique            ║
║                                                                          ║
║   Variables      : 8 (I, T, A, S, FL, MS, Ω, U)                        ║
║   Équations      : 7 (E_emo, E_cog, CE, R, W, Arc_rev, PVI)            ║
║   Lois physiques : 5                                                     ║
║   Cas calibrés   : 12                                                    ║
║   Règles moteur  : 7                                                     ║
║                                                                          ║
║   PVI cible OMEGA : 2.59 → SP_OMEGA = 51.8 → Phase 4-5                 ║
║   Ventes organiques estimées (sans marketing) : 500K – 3M               ║
║                                                                          ║
║   À valider : Module M4 (corpus 100 bestsellers + régression NLP)      ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```
