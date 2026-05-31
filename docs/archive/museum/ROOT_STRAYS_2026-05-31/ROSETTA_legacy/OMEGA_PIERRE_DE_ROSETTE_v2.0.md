# OMEGA — PROTOCOLE "PIERRE DE ROSETTE" v2.0
## Ingénierie inverse causale des contraintes de production littéraire

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   Document ID:      OMEGA-PIERRE-DE-ROSETTE-v2.0                                     ║
║   Date:             2026-03-07                                                        ║
║   Status:           ACTIF — DRY-RUN EN COURS (S1 — Simon APEX)                      ║
║   Auteur:           Claude + audit croisé Gemini + ChatGPT                           ║
║   Autorité:         Francky (Architecte Suprême)                                     ║
║                                                                                       ║
║   Delta v1→v2:      Formalisation mathématique complète (thermodynamique,            ║
║                     identification inverse, champ de forces, matrice convergence)    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 PRINCIPE FONDAMENTAL — REFORMULATION EXACTE

**On ne demande PAS :**
> "Quel prompt exact reproduit ce texte ?"

**On résout un PROBLÈME INVERSE BIEN POSÉ :**
> Trouver l'ensemble minimal de contraintes causales **c** qui maximise
> la probabilité de générer un texte **T̂** tel que ses observables
> tombent dans la bulle de compatibilité stylistique du texte cible **T**.

Formellement :

```
c → génération → T̂ → analyse → (y, q)
                                     ↑
         On veut reconstruire c depuis (y, q) de T
```

Ce n'est pas de l'imitation. C'est de l'**identification inverse**.

---

## ⚛️ PHYSIQUE DU PROBLÈME — POURQUOI LES LLMs ÉCHOUENT PAR DÉFAUT

### 1. Thermodynamique de la Banalité

Un LLM minimise la Cross-Entropy Loss. Il cherche le token le plus probable.
La prose journalistique/clichée = **état de haute probabilité** = entropie maximale du point de vue prédictif.
Claude Simon ou Proust = **anomalie statistique** = état de très basse entropie.

```
H(X) = -Σ P(xᵢ) log P(xᵢ)
```

Le system prompt doit agir comme une **contrainte thermodynamique**, pas une demande polie.
En altérant localement la distribution Softmax :

```
σ(zᵢ/T) = e^(zᵢ/T) / Σ e^(zⱼ/T)
```

Les instructions doivent forcer des **températures locales** (lexicales, rythmiques)
qui autorisent des tokens à faible probabilité sans faire dérailler la cohérence.

### 2. Topologie des Attracteurs

Le style "SVO / paragraphes 4 lignes" est un **bassin d'attraction profond**.
Sans conditions aux limites infranchissables, la génération y retombe après 200 mots.

Pour atteindre l'orbite de Claude Simon :
→ Il faut une **vitesse de libération** = contraintes de type **impulsion de Dirac δ(t)**.
Exemple : *"Toutes les 150 mots, insère obligatoirement une phrase nominale ≤ 4 mots."*
Cela agit comme perturbation périodique empêchant le retour à l'attracteur.

### 3. Variance Spectrale Rythmique

Un LLM standard produit σ² ≈ 0 sur la longueur des phrases (15-20 mots stable).
Claude Simon = signal **hautement chaotique** à grande variance :

```
σ² = (1/N) Σ (lᵢ - μ)²
```

Et chez Simon, les subordonnées s'imbriquent de façon **fractale**.
→ Demander le **ratio d'imbrication** et la **profondeur d'arbre syntaxique**.

---

## 📐 MODÈLE MATHÉMATIQUE COMPLET

### Représentation d'un texte cible T

```
y(T) = [f₁(T), f₂(T), ..., fₙ(T)]   ← features quantitatives OMEGA (F1-F30)
q(T) = [q₁(T), q₂(T), ..., qₘ(T)]   ← qualitatifs structurés (voir Bloc 2)
```

Un texte = point dans un **espace mixte mesurable + qualitatif**.

### Contrat latent d'instructions

```
c = [c₁, c₂, ..., cₖ]
```
Avec : rythme, ouverture, émotion, image, interdits, conflit, voix.

### Fonction objectif (distance à minimiser)

```
L_obs  = d_y(y(T), y(T̂)) + λ · d_q(q(T), q(T̂))
L_copy = α · lexical_overlap(T, T̂) + β · semantic_similarity_local(T, T̂)
L_total = L_obs + L_copy
```

Distance quantitative normalisée par variance corpus :
```
d_y = Σᵢ wᵢ · |fᵢ(T) - fᵢ(T̂)| / σᵢ(corpus_170)
```

→ Un écart sur une feature stable vaut plus qu'un écart sur une feature volatile.
→ Normaliser par σᵢ du corpus 170 œuvres = **calibration absolue**.

### Bulle de compatibilité stylistique

```
T̂ ∈ B(T, ε)
```

T̂ doit être dans la bulle **sans recopier** :
- proximité structurelle / stylistique → L_obs faible
- distance lexicale locale suffisante → L_copy faible

---

## 🏗️ SÉLECTION DU CORPUS — CONSENSUS 3 IA

### 3 auteurs, 3 signatures spectralement opposées

| Auteur | Œuvre | Signature dominante | Rôle dans le protocole |
|--------|-------|---------------------|----------------------|
| **Claude Simon** | La Route des Flandres | Phrase-fleuve, variance σ² maximale, imbrication fractale | Champion extrême — casse les réponses molles |
| **Albert Camus** | L'Étranger | Sécheresse totale, f1_mean minimal, présent de l'indifférence | Contrepoint sec — test des interdits |
| **Marcel Proust** | Du côté de chez Swann | Ramification sensorielle, f28d_sil_score élevé, tenue longue | Test du flux régulier — endurance syntaxique |

**Consensus Gemini + ChatGPT + Claude :**
- Dry-run : **Simon APEX** (variance maximale, test le plus discriminant)
- Chapitre long : **Proust** (meilleure matière pour tester la cohérence dynamique sur durée)

### Extraits sélectionnés

| ID | Auteur | Fichier | Type |
|----|--------|---------|------|
| S1 | Simon | `La_Route_des_Flandre_APEX.txt` | Court 300m — course hippique |
| S2 | Simon | `La_Route_des_Flandre_INCIPIT.txt` | Court 300m — pensée spirale |
| S3 | Simon | `La_Route_des_Flandre_NEUTRE.txt` | Court 300m — parenthèses imbriquées |
| C1 | Camus | `L'Étranger_APEX.txt` | Court 300m — procès, voix plate |
| C2 | Camus | `L'Étranger_INCIPIT.txt` | Court 300m — mort mère, détachement |
| P1 | Proust | `Du_côté_de_chez_APEX.txt` | Court 300m — chambres, sensoriel |
| P2 | Proust | `Du_côté_de_chez_NEUTRE.txt` | Court 300m — Verdurin, dialogue tendu |
| PL | Proust | `Du_côté_de_chez_CLIMAX.txt` | **Long 1200-2500m — flux régulier** |

---

## 🔬 PROMPTS D'INTERROGATION v2.0 — AUGMENTÉS MATHÉMATIQUEMENT

### PROMPT_A — Contrat causal (qualitatif)

```
Tu vas résoudre un problème d'identification inverse sur cet extrait littéraire.

[EXTRAIT]

Ne le reproduis pas. Ne l'imite pas. Ne le commente pas.

Résous ce problème : quelles contraintes de fabrication seraient nécessaires
pour générer un texte NOUVEAU appartenant à la même zone stylistique
que cet extrait, sans le reproduire ?

Tu dois produire un CONTRAT CAUSAL structuré. Format obligatoire,
rien d'autre :

OUVERTURE        : [règle de démarrage — friction, tension, neutralité, etc.]
CONFLIT          : [type de conflictualité — interne/externe/latente/absente]
RYTHME           : [règle rythmique — alternance, ratio, perturbation périodique]
VOIX             : [distance narrative — personne, registre, opacité]
IMAGE            : [règle d'image — densité, corporalité, abstraction]
TENSION          : [modèle de tension — progression, compression, retenue]
SOUS-TEXTE       : [présence/absence/niveau — ce que le texte ne dit pas]
INTERDIT_1       : [ce que ce texte n'utilise JAMAIS]
INTERDIT_2       : [second interdit absolu]
INTERDIT_3       : [troisième interdit absolu]
CONTRAT_FINAL    : [5 règles max, causales, actionnables, non décoratives]

Pas d'introduction. Pas d'explication. Que le schéma.
```

---

### PROMPT_B — Conditions aux limites métriques (quantitatif)

```
Tu vas extraire les Boundary Conditions métriques de cet extrait littéraire.

[EXTRAIT]

Ne le commente pas. Résous ce problème d'ingénierie :
quelles contraintes numériques INFRANCHISSABLES dois-je imposer
à un système génératif pour qu'il ne régresse pas vers la moyenne statistique ?

Format obligatoire pour chaque métrique :

MÉTRIQUE         : [nom]
VALEUR_CIBLE     : [chiffre ou fourchette mesurable]
DÉFINITION       : [comment la mesurer exactement]
TYPE_CONTRAINTE  : [PLANCHER / PLAFOND / FOURCHETTE / DIRAC]
STABILITÉ        : [CONSTANTE_AUTEUR / CONSTANTE_EXTRAIT / UNIVERSEL]

Tu dois couvrir OBLIGATOIREMENT ces dimensions :

1. Longueur moyenne des phrases (mots)
2. Variance σ² de la longueur des phrases
3. Ratio phrases courtes (< 5 mots) sur total
4. Ratio phrases longues (> 40 mots) sur total
5. Profondeur d'arbre syntaxique (ratio subordonnées/principales)
6. Ratio d'imbrication fractale (subordonnées de subordonnées)
7. Densité d'images/métaphores pour 100 mots
8. Variation des attaques de phrases (% premiers mots uniques)
9. Ratio abstraction / corporéité (mots abstraits vs sensoriels)
10. Fréquence de perturbation rythmique (impulsion Dirac — phrase ≤ 3 mots)
11. [Toute autre Boundary Condition critique pour CET extrait spécifique]

Pas d'introduction. Pas d'explication. Que le schéma.
```

---

## 📊 GRILLE DE COMPARAISON — 4 BLOCS PAR EXTRAIT

### Bloc 1 — Causal Contract (c)
Instructions causales actionnables.

### Bloc 2 — Observable Signature (y)
Features OMEGA mesurées. Comparaison avec RANKING_V4.json.

### Bloc 3 — Forbidden Surface (B)
Patterns interdits. Ce que le texte rejette systématiquement.

### Bloc 4 — Stability Class
```
CONSTANTE_AUTEUR   : stable sur tous les extraits du même auteur
CONSTANTE_EXTRAIT  : propre à cet extrait seul
UNIVERSEL          : commun aux 3 auteurs → socle grande prose
```

### Template de remplissage (post-interrogation)

```
EXTRAIT : [ID]  AUTEUR : [Nom]
═══════════════════════════════════════════════════════════════

CONVERGENCES (LLM dit X, RANKING_V4 mesure X) :
  → [métrique] : LLM=[val] / RV4=[val] → ALIGNÉ

DIVERGENCES (LLM dit X, RV4 dit autre) :
  → [métrique] : LLM=[val] / RV4=[val] → GAP=Δ

ANGLES MORTS (contrainte absente de F1-F30) :
  → [nouvelle contrainte non couverte]

MÉTRIQUES RV4 IGNORÉES PAR LLM :
  → [feature non mentionnée]

CAUSAL ALIGNMENT SCORE (CAS) :
  CAS = 1 - L_obs = [0..1]

VERDICT : ALIGNÉ / PARTIEL / DIVERGENT
═══════════════════════════════════════════════════════════════
```

---

## 🏆 LIVRABLES FINAUX

### Par auteur : FICHE DE PRODUCTION

```
╔═══════════════════════════════════════════════════════╗
║  FICHE DE PRODUCTION — [AUTEUR]                       ║
╠═══════════════════════════════════════════════════════╣
║  HOOK_TYPE             :                              ║
║  RHYTHM_PROFILE        :                              ║
║  VOICE_PROFILE         :                              ║
║  IMAGE_DENSITY         :                              ║
║  TENSION_MODEL         :                              ║
║  ANTI_CLICHE_RULES     :                              ║
║  OPENING_CONSTRAINTS   :                              ║
║  FORBIDDEN_PATTERNS    :                              ║
║  DIRAC_RULE            : [perturbation périodique]    ║
╠═══════════════════════════════════════════════════════╣
║  CONTRAT DE GÉNÉRATION (≤15 règles causales)          ║
║  R1 :                                                 ║
║  ...                                                  ║
╚═══════════════════════════════════════════════════════╝
```

### Socle universel : FICHE GRANDE PROSE FRANÇAISE

```
INVARIANTS (Simon ∩ Camus ∩ Proust) → I1, I2, ...
OVERLAYS : Simon=[...], Camus=[...], Proust=[...]
PARAMÈTRES INTERDITS UNIVERSELS : X1, X2, ...
```

### Matrice de Convergence

```
M[contrainte causale i][feature OMEGA j] = accord/désaccord
```

Corrélations à tester :
- "ouverture friction" ↔ hook_presence élevé ?
- "retenue émotionnelle" ↔ necessity + anti_cliche ?
- "variation d'attaque" ↔ voice/rhythm ?

---

## 📐 3 MODULES OMEGA FUTURS (post-protocole)

| Module | Formule | Objectif |
|--------|---------|---------|
| **CAS** — Causal Alignment Score | CAS = 1 - L_obs | Mesure si le contrat explique les observables |
| **SS** — Stability Signature | SS_a = Var⁻¹(fᵢ sur auteur a) | Isole les constantes d'auteur vs variations |
| **III** — Instruction Interpretability Index | Score [concret, non-redondant, actionnable] | Valide que le contrat est utilisable par un LLM |

---

## 📐 ESTIMATION DES COÛTS ACTUALISÉE

| Phase | Appels | Tokens | Coût |
|-------|--------|--------|------|
| Dry-run S1 (2 appels) | 2 | ~3k | ~0.03€ |
| Run court complet (7×2) | 14 | ~21k | ~0.21€ |
| Long Proust (2 appels) | 2 | ~6k | ~0.06€ |
| Synthèse fiches (4 appels) | 4 | ~8k | ~0.08€ |
| **TOTAL** | **22** | **~38k** | **~0.38€** |

---

## ✅ CRITÈRES PASS/FAIL DU DRY-RUN

| Critère | PASS | FAIL |
|---------|------|------|
| PROMPT_A sort ≥8 directives actionnables | directives causales concrètes | commentaire littéraire vague |
| PROMPT_A respecte le schéma imposé | tous champs remplis | champs manquants ou fusionnés |
| PROMPT_B sort ≥8 métriques avec valeurs numériques | chiffres explicites | "environ", "beaucoup" |
| PROMPT_B inclut le TYPE_CONTRAINTE | DIRAC/PLANCHER/PLAFOND | absent |
| PROMPT_B inclut la STABILITÉ | AUTEUR/EXTRAIT/UNIVERSEL | absent |
| Au moins 1 angle mort identifié | nouvelle contrainte non dans F1-F30 | rien de nouveau |
| Zéro critique littéraire dans les réponses | 0 phrase décorative | prose explicative |

---

## 🚀 SÉQUENCE D'EXÉCUTION

```
[EXÉCUTÉ]  Étape 0 : Validation Architecte ✓
[EXÉCUTÉ]  Étape 1 : Commit protocole v2.0
[EN COURS] Étape 2 : DRY-RUN S1 — Simon APEX
              → PROMPT_A sur Simon APEX
              → PROMPT_B sur Simon APEX
              → Évaluation PASS/FAIL
              → Validation Architecte
[PENDING]  Étape 3 : Run court complet (7 extraits × 2 prompts)
[PENDING]  Étape 4 : Long Proust (CLIMAX ou SEUIL ~2000m)
[PENDING]  Étape 5 : Synthèse + 3 fiches + socle universel
[PENDING]  Étape 6 : Intégration sprint U-ROSETTE-01
              → Enrichissement VOICE_COMPLIANCE
              → Nouveaux rules LOT1/LOT2/LOT3
              → Possible F31+ si angles morts significatifs
```

---

**FIN DU DOCUMENT OMEGA-PIERRE-DE-ROSETTE-v2.0**
*Produit sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.*
*Fusion Claude + Gemini + ChatGPT — consensus tri-IA validé.*
