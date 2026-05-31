# OMEGA — PROTOCOLE "PIERRE DE ROSETTE"
## Ingénierie inverse des contraintes de production littéraire

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   Document ID:      OMEGA-PIERRE-DE-ROSETTE-v1.0                                     ║
║   Date:             2026-03-07                                                        ║
║   Status:           DRAFT — EN ATTENTE EXÉCUTION                                     ║
║   Auteur:           Claude (IA Principal)                                             ║
║   Autorité:         Francky (Architecte Suprême)                                     ║
║                                                                                       ║
║   Objectif:         Extraire les contraintes causales de production                  ║
║                     depuis les grands textes du corpus — pas imiter,                 ║
║                     mais comprendre le MOTEUR pour le DÉPASSER.                      ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 PRINCIPE FONDAMENTAL

**Ce qu'on NE fait PAS :**
> "Quel prompt exact reproduit ce texte ?"

**Ce qu'on FAIT :**
> "Quelles contraintes de fabrication — métriques ET qualitatives — auraient maximisé
>  la probabilité d'atteindre le niveau de qualité mesuré dans ce texte ?"

On décompose une Ferrari non pour refaire la même Ferrari rouge,
mais pour comprendre la géométrie, le moteur, l'aérodynamique.
Puis fabriquer MIEUX.

---

## 🏗️ SÉLECTION DU CORPUS — 3 AUTEURS, 3 SIGNATURES OPPOSÉES

### Justification : 3 profils stylistiques radicalement distincts

| Auteur | Œuvre | Signature dominante | Scores RANKING_V4 clés |
|--------|-------|---------------------|------------------------|
| **Claude Simon** | La Route des Flandres | Phrase-fleuve, accumulation parataxique, suspension temporelle | f1a_rhythm_variance=12.9, f22f_literary_index=élevé |
| **Albert Camus** | L'Étranger | Phrase courte, sécheresse absolue, voix froide, présent de l'indifférence | f1_mean=13.5, f24e_contrast_score=0.88, f30d_ps_imp_ratio=0.77 |
| **Marcel Proust** | Du côté de chez Swann | Phrase très longue, ramifiée, digressive, sensorielle, parenthèses enchâssées | f26c_period_score=élevé, f28d_sil_score=élevé |

**Pourquoi ces 3 et pas d'autres :**
- Ils représentent des EXTRÊMES métriques distincts dans le RANKING_V4
- Leur contraste maximal permet d'isoler les invariants universels (ce qui est commun)
  vs. les overlays de style (ce qui diverge)
- Tous 3 sont en français original dans le corpus (domaine public ou analysés)
- Tous 3 ont des textes mesurés F1–F30 dans nos données

---

## 📦 EXTRAITS SÉLECTIONNÉS

### Auteur 1 — Claude Simon (La Route des Flandres)

| ID | Fichier | Type | Caractéristique |
|----|---------|------|-----------------|
| S1 | `La_Route_des_Flandre_APEX.txt` | Court ~300m | Course hippique — accumulation maximale |
| S2 | `La_Route_des_Flandre_INCIPIT.txt` | Court ~300m | Voix narrative — pensée en spirale |
| S3 | `La_Route_des_Flandre_NEUTRE.txt` | Court ~300m | Prisonniers — parenthèses imbriquées |

**Chemin :** `omega-autopsie/scenes_v4/simon/`

### Auteur 2 — Albert Camus (L'Étranger)

| ID | Fichier | Type | Caractéristique |
|----|---------|------|-----------------|
| C1 | `L'Étranger_APEX.txt` | Court ~300m | Procès — voix plate face à l'accusation |
| C2 | `L'Étranger_INCIPIT.txt` | Court ~300m | Mort de la mère — détachement maximal |

**Chemin :** `omega-autopsie/scenes_v4/camus/`

### Auteur 3 — Marcel Proust (Du côté de chez Swann)

| ID | Fichier | Type | Caractéristique |
|----|---------|------|-----------------|
| P1 | `Du_côté_de_chez_APEX.txt` | Court ~300m | Chambres — sensation, mémoire involontaire |
| P2 | `Du_côté_de_chez_NEUTRE.txt` | Court ~300m | Salon Verdurin — dialogue social tendu |

**Chemin :** `omega-autopsie/scenes_v4/proust/`

**Total : 7 extraits courts (300–500 mots) × 2 questions = 14 appels LLM**

---

## 🔬 PROTOCOLE D'INTERROGATION — 2 QUESTIONS PAR EXTRAIT

### Question A — Contraintes qualitatives (comment formuler la commande)

```
PROMPT_A (à donner mot pour mot au LLM) :

"Voici un extrait littéraire de très haut niveau, en français.

[INSÉRER L'EXTRAIT ICI]

Tu vas faire de l'ingénierie inverse sur ce texte.
Ne le reproduis pas. Ne l'imite pas.
Demande-toi : si tu devais PRODUIRE un texte de CE NIVEAU et de CETTE NATURE,
quelles instructions qualitatives aurais-tu voulu recevoir ?

Réponds UNIQUEMENT avec une liste de 8 à 12 directives :
- Formulées comme des commandes directes à un générateur
- Actionnables, non décoratives
- Portant sur : le ton, la voix, la distance narrative, le rythme perçu,
  le traitement du temps, la densité d'image, le sous-texte, les interdits stylistiques

Format obligatoire :
DIRECTIVE_1 : [texte court]
DIRECTIVE_2 : [texte court]
...

Pas d'introduction. Pas d'explication. Juste les directives."
```

---

### Question B — Contraintes métriques (les chiffres)

```
PROMPT_B (à donner mot pour mot au LLM) :

"Voici un extrait littéraire de très haut niveau, en français.

[INSÉRER L'EXTRAIT ICI]

Analyse ce texte et donne-moi les contraintes NUMÉRIQUES et MESURABLES
que je dois imposer à un système génératif pour atteindre ce niveau.

Réponds UNIQUEMENT avec ce format :

MÉTRIQUE_1 : [nom de la contrainte] | VALEUR_CIBLE : [chiffre ou fourchette] | DÉFINITION : [comment la mesurer]
MÉTRIQUE_2 : ...
...

Couvre obligatoirement :
- Longueur moyenne des phrases (mots)
- Variance de longueur des phrases (court vs long)
- Ratio de phrases courtes (< 5 mots)
- Fréquence des synchrones/ruptures rythmiques
- Proportion d'ouvertures de phrases uniques (premier mot)
- Densité d'images / métaphores (par 100 mots)
- Niveau de sous-texte (0-10, avec définition)
- Tout autre paramètre que tu juges critique pour CE texte spécifique

Pas d'introduction. Pas d'explication. Juste les métriques."
```

---

## 📊 GRILLE DE COMPARAISON — IA vs RANKING_V4

Après chaque interrogation, comparer les métriques produites par le LLM
avec les valeurs mesurées dans RANKING_V4.json.

### Template de comparaison (à remplir pour chaque extrait)

```
EXTRAIT : [ID]
AUTEUR : [Nom]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONVERGENCES (LLM dit X, RANKING_V4 mesure X) :
  - [métrique] : LLM=[valeur] / RV4=[valeur] → ALIGNÉ

DIVERGENCES (LLM dit X, RANKING_V4 dit autre chose) :
  - [métrique] : LLM=[valeur] / RV4=[valeur] → GAP=[delta]

ANGLES MORTS (LLM mentionne une contrainte absent du RANKING_V4) :
  - [contrainte non couverte par F1-F30]

MÉTRIQUES RANKING_V4 NON MENTIONNÉES PAR LE LLM :
  - [feature ignorée]

VERDICT : ALIGNÉ / PARTIEL / DIVERGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🏆 FICHE DE PRODUCTION STANDARDISÉE (livrable final)

Après traitement de tous les extraits, produire une **FICHE OMEGA DE PRODUCTION**
par auteur, puis une **FICHE SOCLE UNIVERSEL** (ce qui est commun aux 3).

### Structure fiche par auteur

```
╔═══════════════════════════════════════════════════════╗
║  FICHE DE PRODUCTION — [AUTEUR / OEUVRE]              ║
╚═══════════════════════════════════════════════════════╝

HOOK_TYPE         : [type d'ouverture caractéristique]
RHYTHM_PROFILE    : [profil rythmique — court/long/alternance]
VOICE_PROFILE     : [distance narrative, personne, registre]
IMAGE_DENSITY     : [densité d'images pour 100 mots]
TENSION_MODEL     : [comment la tension est construite]
ANTI_CLICHE_RULES : [ce que ce texte n'utilise JAMAIS]
OPENING_CONSTRAINTS : [contraintes sur les attaques de phrase]
FORBIDDEN_PATTERNS  : [patterns explicitement interdits]

CONTRAT DE GÉNÉRATION (10-15 règles max, causales, actionnables) :
  R1 : ...
  R2 : ...
  ...
```

### Structure fiche socle universel

```
╔═══════════════════════════════════════════════════════╗
║  SOCLE UNIVERSEL — GRANDE PROSE FRANÇAISE             ║
╚═══════════════════════════════════════════════════════╝

INVARIANTS (communs à Simon + Camus + Proust) :
  I1 : ...
  I2 : ...

OVERLAYS DE STYLE (divergences par auteur) :
  Simon  : ...
  Camus  : ...
  Proust : ...

PARAMÈTRES INTERDITS (universels) :
  X1 : ...
  X2 : ...
```

---

## ⚙️ IMPLÉMENTATION TECHNIQUE

### Script Python d'extraction et d'appel

Fichier à créer : `omega-autopsie/pierre_de_rosette_runner.py`

```python
# Lecture des extraits depuis scenes_v4/
# Appel API (Claude ou autre LLM) avec PROMPT_A et PROMPT_B
# Sauvegarde des réponses en JSON structuré
# Comparaison automatique avec RANKING_V4.json
# Génération du rapport de comparaison
```

**Output attendu :**
```
omega-autopsie/results_pierre_de_rosette/
  ├── S1_qualitative.json
  ├── S1_metrics.json
  ├── S1_comparison.json
  ├── ...
  ├── FICHE_simon.md
  ├── FICHE_camus.md
  ├── FICHE_proust.md
  └── FICHE_SOCLE_UNIVERSEL.md
```

---

## 📐 ESTIMATION DES COÛTS

| Phase | Appels LLM | Tokens estimés | Coût estimé |
|-------|-----------|----------------|-------------|
| Question A × 7 extraits | 7 | ~1500 tokens/appel | ~0.10€ |
| Question B × 7 extraits | 7 | ~1500 tokens/appel | ~0.10€ |
| Fiches de synthèse × 4 | 4 | ~2000 tokens/appel | ~0.08€ |
| **TOTAL** | **18** | **~25k tokens** | **~0.28€** |

**DRY-RUN OBLIGATOIRE** avant exécution complète :
- Tester avec 1 extrait (S1 ou C1)
- Valider la qualité des réponses
- Valider la grille de comparaison
- Obtenir validation Architecte avant les 17 appels restants

---

## ✅ CRITÈRES DE SUCCÈS (PASS/FAIL)

| Critère | PASS | FAIL |
|---------|------|------|
| Chaque extrait produit ≥8 directives qualitatives actionnables | ✅ actionnable | ❌ vague/poétique |
| Chaque extrait produit ≥6 métriques numériques | ✅ avec chiffres | ❌ sans valeur |
| Convergence LLM/RANKING_V4 ≥60% des métriques | ✅ alignement | ❌ contradictions |
| Au moins 1 angle mort identifié (contrainte absente de F1-F30) | ✅ découverte | ❌ rien de nouveau |
| Fiche socle universel produite avec ≥5 invariants | ✅ synthèse | ❌ fragmentation |

---

## 🚀 ÉTAPES D'EXÉCUTION

```
ÉTAPE 1 — Validation Architecte (ce document)
  → Francky confirme les 3 auteurs et les 7 extraits
  → Francky valide les 2 prompts d'interrogation

ÉTAPE 2 — Dry-run (1 extrait, sans frais)
  → Tester PROMPT_A + PROMPT_B sur S1 (Simon APEX)
  → Valider la qualité et la structure des réponses
  → Ajuster les prompts si nécessaire

ÉTAPE 3 — Run complet (16 appels restants)
  → Obtenir validation explicite Architecte
  → Exécuter tous les extraits
  → Sauvegarder toutes les réponses en JSON

ÉTAPE 4 — Synthèse
  → Grille de comparaison vs RANKING_V4
  → 3 fiches auteur + 1 fiche socle universel
  → Identifier les gaps à intégrer dans prompt-assembler

ÉTAPE 5 — Intégration (sprint U-ROSETTE-01)
  → Nouveaux invariants → VOICE_COMPLIANCE étendue
  → Nouvelles règles métriques → sections LOT1/LOT2/LOT3
  → Possibles nouvelles features F31+ si angles morts significatifs
```

---

## 🔒 STATUT

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA-PIERRE-DE-ROSETTE-v1.0                                                        ║
║                                                                                       ║
║   Status:     DRAFT — EN ATTENTE VALIDATION ARCHITECTE                                ║
║   Étape:      0 — Validation du protocole                                             ║
║   Action req: Francky valide → Étape 2 (dry-run)                                     ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DU DOCUMENT OMEGA-PIERRE-DE-ROSETTE-v1.0**
*Produit sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.*
