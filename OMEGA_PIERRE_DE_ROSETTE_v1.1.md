# OMEGA — PROTOCOLE "PIERRE DE ROSETTE" v1.1
## Ingénierie inverse des contraintes de production littéraire

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   Document ID:      OMEGA-PIERRE-DE-ROSETTE-v1.1                                     ║
║   Date:             2026-03-07                                                        ║
║   Status:           DRAFT — EN ATTENTE EXÉCUTION                                     ║
║   Auteur:           Claude (IA Principal)                                             ║
║   Validé par:       ChatGPT (2 audits), Gemini (1 audit)                             ║
║   Autorité:         Francky (Architecte Suprême)                                     ║
║                                                                                       ║
║   Changelog v1.1 : intégration complète des retours ChatGPT (docs 1 et 2)           ║
║                    + retour Gemini — structure Bloc 1/2/3/4, Niveau 1/2,            ║
║                    variante cross-IA, 5 catégories autopsie, 5 auteurs               ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 PRINCIPE FONDAMENTAL — VALIDATION CROSS-IA

Trois IA ont audité l'idée. Verdict unanime : **PASS**.

### Ce qu'on NE fait PAS

> "Quel prompt exact reproduit ce texte ?"

**Raisons (ChatGPT) :**
1. Le prompt exact n'existe souvent pas — plusieurs chemins peuvent produire un texte proche
2. Risque de dérive vers reproduction trop proche d'œuvres existantes
3. On optimise pour **imiter**, pas pour **dépasser**

### Ce qu'on FAIT

> "Quelles contraintes de fabrication — métriques ET qualitatives — auraient maximisé
>  la probabilité d'atteindre le niveau de qualité mesuré dans ce texte ?"

**On ne cherche pas un prompt. On cherche une spécification de fabrication.**
*(ChatGPT : "ingénierie inverse des contraintes de production, pas recherche du prompt exact")*

---

## ⚠️ ASYMÉTRIE COGNITIVE — PIÈGE IDENTIFIÉ PAR GEMINI

> **Analyser ≠ Générer**

Un LLM est un critique d'art génial, mais un peintre moyen par défaut.

Si on lui fait analyser du Céline, il dicte parfaitement la recette du prompt.
Mais dans une fenêtre vierge, le poids de ses milliards de données d'entraînement
(99% prose moyenne et polie) reprend le dessus — il "lisse" le texte.

**Il sait ce qu'il faut faire, mais sa nature statistique l'empêche de le faire naturellement.**

→ **Conséquence OMEGA :** les règles extraites doivent être des **contraintes dures métriques**,
pas des suggestions stylistiques. C'est exactement ce que fait VOICE_COMPLIANCE dans
`prompt-assembler-v2.ts`. Le protocole Pierre de Rosette alimente ce pipeline.

---

## 📦 SÉLECTION DU CORPUS — 5 AUTEURS, 2 NIVEAUX

### Recommandation ChatGPT (doc 2) : 5 auteurs × 3 extraits courts + 1 long

| Auteur | Œuvre(s) disponibles | Signature dominante | Scores RANKING_V4 clés |
|--------|----------------------|---------------------|------------------------|
| **Claude Simon** | La Route des Flandres | Phrase-fleuve, accumulation parataxique, suspension temporelle | f1a_rhythm_variance=12.9 |
| **Albert Camus** | L'Étranger | Phrase courte, sécheresse absolue, voix froide | f1_mean=13.5, f24e=0.88 |
| **Marcel Proust** | Du côté de chez Swann | Phrase très longue, ramifiée, sensorielle | f26c élevé, f28d élevé |
| **Patrick Modiano** | Dora Bruder | Voix mémorielle, ellipse, flottement temporel | corpus disponible |
| **Louis-Ferdinand Céline** | Voyage au bout de la nuit | Oralité, rupture syntaxique, langue parlée stylisée | corpus disponible |

**Pourquoi 5 et non 3 :**
- 5 permet d'isoler **constantes d'auteur** vs **constantes de grande prose**
- Comparaison multi-auteur révèle le **socle universel** (ce qui est commun à tous)
- Contraste Simon/Camus = extrêmes de longueur de phrase → invariants indépendants du style

### Extraits sélectionnés — Niveau 1 (courts, 300–500 mots)

| ID | Auteur | Fichier | Type |
|----|--------|---------|------|
| S1 | Simon | `La_Route_des_Flandre_APEX.txt` | Course hippique — accumulation |
| S2 | Simon | `La_Route_des_Flandre_INCIPIT.txt` | Voix narrative — spirale |
| S3 | Simon | `La_Route_des_Flandre_NEUTRE.txt` | Prisonniers — parenthèses imbriquées |
| C1 | Camus | `L'Étranger_APEX.txt` | Procès — voix plate |
| C2 | Camus | `L'Étranger_INCIPIT.txt` | Mort de la mère — détachement |
| P1 | Proust | `Du_côté_de_chez_APEX.txt` | Chambres — mémoire sensorielle |
| P2 | Proust | `Du_côté_de_chez_NEUTRE.txt` | Salon Verdurin — dialogue tendu |
| M1 | Modiano | `Dora_Bruder_APEX.txt` | Enquête mémorielle |
| M2 | Modiano | `Dora_Bruder_INCIPIT.txt` | Crépuscule et présence/absence |
| CE1 | Céline | `Voyage_au_Bout_de_la_APEX.txt` | Pastiche médical — ironie noire |

**Total Niveau 1 : 10 extraits**

### Extraits Niveau 2 (chapitre entier — flux régulier)

**Objectif :** tester la **stabilité du flux de qualité** sur la durée.
*(ChatGPT doc 2 : "un texte peut être magnifique sur 350 mots et s'écrouler au bout de 5 pages")*

On mesure sur un chapitre :
- Maintien de la voix
- Variation sans cassure
- Renouvellement des attaques de phrases
- Non-effondrement de la densité
- Tenue du conflit

| ID | Auteur | Fichier | Type |
|----|--------|---------|------|
| SL | Simon | `La_Route_des_Fl_CLIMAX.txt` | Long — climax narratif |
| CL | Camus | `L_Etranger_CLIMAX.txt` | Long — jugement final |
| PL | Proust | `Du_côté_de_chez_CLIMAX.txt` | Long — scène de salon |

**Total Niveau 2 : 3 extraits (à compléter avec Modiano + Céline si qualité confirmée)**

---

## 🔬 PROTOCOLE D'INTERROGATION — 2 QUESTIONS PAR EXTRAIT

*(Gemini : demander les "règles mathématiques / contraintes dures", pas le "prompt joli")*

### Question A — Directives qualitatives (comment formuler la commande)

```
PROMPT_A :

"Voici un extrait littéraire de très haut niveau, en français.

[INSÉRER L'EXTRAIT ICI]

Ingénierie inverse sur ce texte. Ne le reproduis pas. Ne l'imite pas.
Si tu devais PRODUIRE un texte de CE NIVEAU et de CETTE NATURE,
quelles instructions qualitatives aurais-tu voulu recevoir ?

Réponds UNIQUEMENT avec 8 à 12 directives :
- Formulées comme des commandes directes à un générateur
- Actionnables, non décoratives
- Portant sur : ton, voix, distance narrative, rythme perçu,
  traitement du temps, densité d'image, sous-texte, interdits stylistiques

Format :
DIRECTIVE_1 : [texte court]
DIRECTIVE_2 : [texte court]
...

Pas d'introduction. Pas d'explication. Juste les directives."
```

### Question B — Contraintes métriques (les chiffres)

```
PROMPT_B :

"Voici un extrait littéraire de très haut niveau, en français.

[INSÉRER L'EXTRAIT ICI]

Analyse et donne les contraintes NUMÉRIQUES et MESURABLES
pour qu'un système génératif atteigne ce niveau.

Format OBLIGATOIRE :
MÉTRIQUE_1 : [nom] | VALEUR_CIBLE : [chiffre ou fourchette] | DÉFINITION : [comment mesurer]
MÉTRIQUE_2 : ...

Couvre obligatoirement :
- Longueur moyenne des phrases (mots)
- Variance de longueur (court vs long)
- Ratio phrases courtes (< 5 mots)
- Fréquence synchrones/ruptures rythmiques
- Proportion ouvertures uniques (premier mot)
- Densité images/métaphores (pour 100 mots)
- Niveau de sous-texte (0-10, avec définition)
- Tout autre paramètre critique pour CE texte

Pas d'introduction. Pas d'explication. Juste les métriques."
```

---

## 📋 STRUCTURE PAR EXTRAIT — 4 BLOCS (ChatGPT doc 2)

Pour chaque extrait, forcer le LLM à produire cette structure complète :

### Bloc 1 — Instructions idéales perçues (qualitatif)
- Type d'ouverture
- Gestion du conflit
- Type de rythme
- Niveau d'abstraction
- Densité d'image
- Pression émotionnelle
- Degré de retenue
- Type de voix

### Bloc 2 — Propriétés mesurables observées (quantitatif)
- Longueur et alternance de phrases
- Variation d'attaque
- Densité lexicale
- Densité d'images
- Corporalité
- Tension implicite
- Sous-texte
- Nécessité
- Anti-cliché

### Bloc 3 — Interdits
- Ce qu'il ne fallait surtout pas écrire
- Quelles erreurs auraient fait tomber le texte
- Quelles formulations auraient détruit la qualité

### Bloc 4 — Contrat de génération reconstruit
- 10 à 20 règles maximum
- Causales et actionnables
- Non décoratives

---

## 🔭 5 CATÉGORIES D'AUTOPSIE (ChatGPT doc 1)

Pour chaque extrait, l'analyse couvre ces 5 niveaux :

### 1) Contraintes de surface
- Longueur moyenne des phrases
- Alternance court / long
- Densité lexicale
- Répétitions contrôlées
- Niveau d'abstraction
- Attaques de phrases

### 2) Contraintes narratives
- Type d'ouverture
- Vitesse d'entrée dans le conflit
- Niveau de tension implicite
- Part dialogue / narration / perception
- Rythme des micro-basculements

### 3) Contraintes émotionnelles
- Trajectoire affective
- Distance émotionnelle
- Pression interne
- Intensité / retenue
- Points de compression et relâchement

### 4) Contraintes stylistiques profondes
- Quantité de métaphores
- Nature des images
- Degré de corporalité
- Niveau de sous-texte
- Manière de faire exister la voix

### 5) Contraintes d'interdiction
- Ce que le texte **n'utilise jamais**
- Clichés absents
- Mots ou structures évitées
- Types d'ouverture interdits
- Banalités rejetées

---

## 🤖 VARIANTE CROSS-IA — 3 IA EN PARALLÈLE (ChatGPT doc 1)

Au lieu d'une seule IA sur chaque extrait, envoyer le même extrait à 3 IA :

| IA | Rôle | Ce qu'elle extrait |
|----|------|-------------------|
| **IA 1** (Claude) | Contraintes visibles | Surface, rythme, structure |
| **IA 2** (ChatGPT) | Contraintes invisibles / implicites | Sous-texte, tension, voix profonde |
| **IA 3** (Gemini) | Interdits et erreurs à éviter | Ce qui tuerait la qualité |

Puis **fusion en une spec causale unique**.

> "Là, tu commences à faire de la vraie ingénierie inverse de littérature." (ChatGPT doc 1)

**Coût variante cross-IA :** ~3× les appels → à décider par l'Architecte si on active pour les 5 meilleurs extraits seulement.

---

## 📊 GRILLE DE COMPARAISON — LLM vs RANKING_V4

Après chaque interrogation, comparer avec `RANKING_V4.json`.

**Le pont (ChatGPT doc 2) :**
1. Ce que l'IA dit qu'elle aurait eu besoin de recevoir = **instructions idéales perçues**
2. Ce que nos métriques montrent réellement = **signatures objectivées** des textes

But :
- Où l'IA a raison
- Où elle oublie des causes
- Où nos métriques manquent quelque chose ← **possible découverte de F31+**
- Où les deux convergent

```
EXTRAIT : [ID]   AUTEUR : [Nom]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONVERGENCES (LLM dit X, RANKING_V4 mesure X) :
  - [métrique] : LLM=[valeur] / RV4=[valeur] → ALIGNÉ

DIVERGENCES :
  - [métrique] : LLM=[valeur] / RV4=[valeur] → GAP=[delta]

ANGLES MORTS (contrainte mentionnée par LLM, absente de F1-F30) :
  - [contrainte → candidat F31+]

MÉTRIQUES RV4 NON MENTIONNÉES PAR LE LLM :
  - [feature ignorée]

VERDICT : ALIGNÉ / PARTIEL / DIVERGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🏆 FICHES DE PRODUCTION — LIVRABLES FINAUX

### Fiche par auteur (×5)

```
╔═══════════════════════════════════════════════════╗
║  FICHE DE PRODUCTION — [AUTEUR / OEUVRE]          ║
╚═══════════════════════════════════════════════════╝

HOOK_TYPE           : [type d'ouverture caractéristique]
RHYTHM_PROFILE      : [court/long/alternance, CV mesuré]
VOICE_PROFILE       : [distance narrative, personne, registre]
IMAGE_DENSITY       : [images pour 100 mots, mesurée]
TENSION_MODEL       : [comment la tension est construite]
ANTI_CLICHE_RULES   : [ce que ce texte n'utilise JAMAIS]
OPENING_CONSTRAINTS : [contraintes sur les attaques de phrase]
FORBIDDEN_PATTERNS  : [patterns explicitement interdits]

CONTRAT DE GÉNÉRATION (10–15 règles, causales, actionnables) :
  R1 : ...
  R2 : ...
  ...
```

### Fiche socle universel (1 — grande prose française)

Séparation (ChatGPT doc 2) :
- **Constantes d'auteur** : ce qui revient toujours chez cet auteur
- **Constantes de livre** : ce qui appartient à cette œuvre précise
- **Constantes de grande prose** : ce qui dépasse l'auteur lui-même

```
╔═══════════════════════════════════════════════════╗
║  SOCLE UNIVERSEL — GRANDE PROSE FRANÇAISE         ║
╚═══════════════════════════════════════════════════╝

INVARIANTS (communs à Simon + Camus + Proust + Modiano + Céline) :
  I1 : ...
  I2 : ...

OVERLAYS DE STYLE (divergences par auteur) :
  Simon   : [signature]
  Camus   : [signature]
  Proust  : [signature]
  Modiano : [signature]
  Céline  : [signature]

PARAMÈTRES INTERDITS UNIVERSELS :
  X1 : ...
  X2 : ...
```

---

## ⚙️ IMPLÉMENTATION TECHNIQUE

### Script `pierre_de_rosette_runner.py`

```python
# Chemin : omega-autopsie/pierre_de_rosette_runner.py
#
# Fonctions :
#   1. Lire extraits depuis scenes_v4/
#   2. Appel API (Claude Sonnet) avec PROMPT_A et PROMPT_B
#   3. Sauvegarder réponses en JSON structuré (4 blocs)
#   4. Comparer automatiquement avec RANKING_V4.json
#   5. Générer rapport de convergence/divergence/angles morts
#   6. Exporter fiches auteur + fiche socle universel en Markdown

# Output :
# omega-autopsie/results_pierre_de_rosette/
#   ├── S1_bloc1_qualitative.json
#   ├── S1_bloc2_metrics.json
#   ├── S1_bloc3_interdits.json
#   ├── S1_bloc4_contrat.json
#   ├── S1_comparison_rv4.json
#   ├── ...
#   ├── FICHE_simon.md
#   ├── FICHE_camus.md
#   ├── FICHE_proust.md
#   ├── FICHE_modiano.md
#   ├── FICHE_celine.md
#   └── FICHE_SOCLE_UNIVERSEL.md
```

---

## 📐 ESTIMATION DES COÛTS

### Scénario A — 1 seule IA (Claude)

| Phase | Appels | Tokens (~) | Coût (~) |
|-------|--------|-----------|---------|
| PROMPT_A × 10 extraits courts | 10 | 1500/appel | ~0.15€ |
| PROMPT_B × 10 extraits courts | 10 | 1500/appel | ~0.15€ |
| Niveau 2 × 3 chapitres × 2 prompts | 6 | 3000/appel | ~0.18€ |
| Synthèses fiches × 6 | 6 | 2000/appel | ~0.12€ |
| **TOTAL scénario A** | **32** | **~55k** | **~0.60€** |

### Scénario B — Variante cross-IA (3 IA × 5 meilleurs extraits)

| Phase | Appels | Coût (~) |
|-------|--------|---------|
| Scénario A complet | 32 | ~0.60€ |
| Cross-IA sur 5 extraits × 2 IA externes | 20 | ~0.30€ |
| **TOTAL scénario B** | **52** | **~0.90€** |

**DRY-RUN OBLIGATOIRE :** 1 extrait (S1) × 2 prompts = 2 appels → ~0.03€
→ Validation Architecte avant le run complet.

---

## ✅ CRITÈRES DE SUCCÈS (PASS/FAIL)

| Critère | PASS | FAIL |
|---------|------|------|
| Chaque extrait → ≥8 directives qualitatives actionnables | actionnable | vague/poétique |
| Chaque extrait → ≥6 métriques numériques | avec chiffres | sans valeur |
| Convergence LLM/RANKING_V4 ≥60% des métriques | alignement | contradictions |
| ≥1 angle mort identifié (absent de F1-F30) | découverte F31+ | rien de nouveau |
| Fiche socle universel avec ≥5 invariants | synthèse réelle | fragmentation |
| Niveau 2 : flux maintenu sur tout le chapitre | cohérence prouvée | effondrement détecté |

---

## 🚀 ÉTAPES D'EXÉCUTION

```
ÉTAPE 0 — Validation Architecte (ce document v1.1)
  → Confirmer les 5 auteurs et les 13 extraits
  → Valider les 2 prompts d'interrogation
  → Choisir scénario A ou B (1 IA vs cross-IA)

ÉTAPE 1 — Dry-run (2 appels, ~0.03€)
  → PROMPT_A + PROMPT_B sur S1 (Simon APEX)
  → Valider qualité et structure des réponses
  → Ajuster les prompts si nécessaire
  → Validation Architecte avant suite

ÉTAPE 2 — Run Niveau 1 (20 appels, ~0.30€)
  → 10 extraits courts × 2 prompts
  → Sauvegarder toutes les réponses JSON

ÉTAPE 3 — Run Niveau 2 (6 appels, ~0.18€)
  → 3 chapitres × 2 prompts
  → Comparer avec Niveau 1 (même auteur)

ÉTAPE 4 — Synthèse et comparaison RV4
  → Grille convergence/divergence/angles morts
  → Identifier candidats F31+

ÉTAPE 5 — Fiches de production (6 appels, ~0.12€)
  → 5 fiches auteur + 1 fiche socle universel

ÉTAPE 6 — Intégration dans OMEGA (sprint U-ROSETTE-01)
  → Enrichir VOICE_COMPLIANCE (prompt-assembler-v2.ts)
  → Nouvelles règles métriques → LOT1/LOT2/LOT3
  → Évaluer features F31+ si angles morts critiques
  → Micro-benchmark pour mesurer delta voice_conformity
```

---

## 🎯 RÉSULTAT ATTENDU — LA VRAIE VALEUR

*(ChatGPT doc 2 : "le jackpot")*

On ne va pas juste améliorer le prompt.
On va aussi potentiellement **améliorer le système de mesure lui-même** :
- Certaines métriques F1–F30 trop faibles
- Certaines incomplètes
- Certaines mal pondérées

**On n'apprend plus juste "à écrire".**
**On apprend comment l'IA doit être instruite pour produire les signatures mesurées de la grande prose.**

---

## 🔒 STATUT

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA-PIERRE-DE-ROSETTE-v1.1                                                        ║
║                                                                                       ║
║   Status:     DRAFT — EN ATTENTE VALIDATION ARCHITECTE                                ║
║   Étape:      0 — Validation du protocole v1.1                                        ║
║   Inputs:     ChatGPT (2 audits) + Gemini (1 audit) + Francky                        ║
║   Action req: Architecte valide → Étape 1 (dry-run S1, ~0.03€)                      ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT OMEGA-PIERRE-DE-ROSETTE-v1.1**
*Produit sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.*
*Intègre les retours complets : ChatGPT doc 1, ChatGPT doc 2, Gemini audit.*
