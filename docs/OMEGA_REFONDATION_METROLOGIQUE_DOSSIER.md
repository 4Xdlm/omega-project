# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — DOSSIER TECHNIQUE : REFONDATION MÉTROLOGIQUE
# Analyse de variance multi-échelle et révision du paradigme de mesure
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date        : 2026-03-18
# Statut      : DOSSIER DE CONSULTATION — NON FINAL
# Auteur      : Claude (IA Principal) + données corpus OMEGA v4
# Autorité    : Francky (Architecte Suprême)
# Objectif    : Produire les données et l'analyse nécessaires pour
#               une consultation croisée avec ChatGPT et Gemini
#               avant toute décision architecturale.
#
# Standard    : NASA-Grade L4 / DO-178C
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE 1 — LE CONSTAT : POURQUOI NOUS FRAPPONS UN PLAFOND

## 1.1 — Résumé exécutif

Après 5 full bench sur la config V-RECAL-1 (patches v10-v12b), les résultats sont :

| Run | SEAL | Médiane | Δ baseline | Anomalies |
|-----|------|---------|-----------|-----------|
| Run 1 (temp=1.0) | 1/8 | 91.3 | -0.7 | API 500 sur Élégie |
| Run 2 (temp=0.75) | 1/8* | 90.5 | -1.5 | Faux SEAL Monologue (pipeline tronqué) |
| Run 3 (v11 guard) | 0/8 | 91.4 | -0.6 | Aucune — premier bench propre |
| Run 4 (v12 judges) | 3/5 | 93.1 | +1.1 | 3× API 503 — bench incomplet |
| Run 5 (v12b clean) | 1/8 | 91.8 | -0.2 | Aucune — bench propre complet |

**La médiane oscille entre 90.5 et 91.8 sur 5 runs du même code.**
La variance de ±1.5 pts composite sur des configurations identiques
indique que le système de mesure est au moins aussi instable que le moteur de génération.

**Hypothèse fondatrice de Francky** :
> "Notre mesure se fait sur de petites scènes. Peut-être que la mesure sur une scène
> trop courte ne donne pas assez d'amplitude au LLM pour remplir tous les critères
> d'une prose extraordinaire. Nos mesures devraient se faire sur un morceau plus gros."

## 1.2 — Paramètres actuels du bench

| Paramètre | Valeur | Origine |
|-----------|--------|---------|
| target_word_count | 490-620 mots | Choix de praticité (coût API, temps bench) |
| Nombre de phrases | ~17-22 | Conséquence du word_count |
| Quartiles t14d | ~4-5 phrases / ~140 mots chacun | Conséquence du word_count |
| Nombre de beats | 4 par scène | Arbitraire |
| Duel | 4 drafts × 600 mots | Coût ×4 |
| Temps bench complet | ~45-55 min pour 8 scènes | Budget temps |

**Ces paramètres ont été choisis par praticité, pas par vérité littéraire.**

## 1.3 — Paramètres du full_work_analyzer v4

Le corpus de référence mesure les œuvres à DEUX échelles :

| Échelle | Taille | Protocole |
|---------|--------|-----------|
| Extraits | **300 mots** | 15 par œuvre (APEX, NEUTRE, SEUIL, INCIPIT, EXPLICIT, CLIMAX, 10 RANDOM) |
| Chapitres | **1500-33000 mots** | 5 par œuvre (KEY + 4 positions stratifiées) |

Les features F1-F30 sont mesurées aux DEUX échelles.
Les moyennes dans RANKING_V4.json sont calculées sur l'ENSEMBLE (extraits + chapitres).

---

# PARTIE 2 — LES DONNÉES : PREUVE EMPIRIQUE DU BIAIS D'ÉCHELLE

## 2.1 — Corpus analysé

| Corpus | Œuvres | Mots moyen | Range |
|--------|--------|-----------|-------|
| FR-ORIG | 54 | 72 472 | [15 620..185 440] |
| PD-FR | 23 | 110 293 | [23 955..217 024] |
| EN-ORIG | 31 | 115 705 | [18 183..355 158] |
| PD-EN | 21 | 135 832 | [37 917..353 463] |
| TR-FR | 14 | 118 884 | [28 251..384 209] |
| TR-EN | 9 | 86 150 | [42 857..154 449] |
| BONUS-GENRE | 5 | 81 399 | [53 435..100 724] |
| **TOTAL** | **158 œuvres** | | |

## 2.2 — Coefficient de variation (CV) intra-œuvre : extrait vs chapitre

**Méthodologie** : Pour chaque feature, calculer le CV (σ/μ) sur les extraits (300 mots)
et sur les chapitres d'une même œuvre. Le ratio CV_extrait / CV_chapitre = "gain de stabilité".
Plus le gain est élevé, plus la feature est instable à petite échelle.

**Données sur 5 œuvres de référence** (Flaubert, Proust, Camus, McCarthy, Woolf) :

| Feature | Catégorie | CV 300m | CV chapitre | Gain | Δμ% |
|---------|-----------|---------|-------------|------|-----|
| Médiane fenêtre (f19e) | MUSICALITÉ | 0.767 | 0.080 | **9.6×** | -22% |
| Budget contraste (f24e) | SENSORIEL | 0.074 | 0.009 | **8.5×** | +7% |
| Style indirect libre (f28d) | INTÉRIORITÉ | 2.354 | 0.334 | **7.1×** | -26% |
| Switch temporel (f12b) | TENSION | 0.567 | 0.095 | **6.0×** | +15% |
| Index littéraire (f22f) | COMPLEXITÉ | 0.829 | 0.141 | **5.9×** | -3% |
| Taux fragments (f18a) | TENSION | 0.721 | 0.136 | **5.3×** | -4% |
| Modalité épistémique (f27d) | INTÉRIORITÉ | 0.825 | 0.168 | **4.9×** | +32% |
| Densité émotionnelle (f8a) | ÉMOTION | 2.022 | 0.426 | **4.7×** | +4% |
| Variance rythmique (f1a) | MUSICALITÉ | 0.476 | 0.108 | **4.4×** | +6% |
| TTR fenêtre (f29b) | LEXICAL | 0.046 | 0.011 | **4.1×** | -1% |
| Score descriptif (f25g) | SENSORIEL | 0.274 | 0.070 | **3.9×** | **+73%** |
| Longueur phrase (f1) | MUSICALITÉ | 0.350 | 0.089 | **3.9×** | -3% |
| Période syntaxique (f26c) | COMPLEXITÉ | 0.809 | 0.207 | **3.9×** | -28% |
| Rituel incantatoire (f21e) | LEXICAL | 0.472 | 0.127 | **3.7×** | +36% |
| Ratio PS/Imp (f30d) | TENSION | 0.258 | 0.112 | **2.3×** | **+95%** |
| Causal littéraire (f23d) | TENSION | 0.476 | 0.283 | 1.7× | -7% |

### Résumé par catégorie OMEGA

| Catégorie | Gain moyen | Verdict |
|-----------|-----------|---------|
| MUSICALITÉ | >5× | 🔴 BRUIT à 300 mots |
| SENSORIEL | >5× | 🔴 BRUIT à 300 mots |
| INTÉRIORITÉ | 6.0× | 🔴 BRUIT à 300 mots |
| COMPLEXITÉ | 4.9× | 🔴 BRUIT à 300 mots |
| LEXICAL | 3.9× | 🔴 BRUIT à 300 mots |
| TENSION | 3.9× | 🔴 BRUIT à 300 mots |
| ÉMOTION | 4.7× | 🔴 BRUIT à 300 mots |

**RÉSULTAT : AUCUNE feature n'est stable à 300 mots. Toutes ont un gain ≥ 1.7×.**
**16 features sur 16 sont classées 🔴 ou 🟡.**

## 2.3 — INSIGHT CRITIQUE : la moyenne elle-même change entre les échelles

Pour certaines features, ce n'est pas seulement la VARIANCE qui change —
c'est la VALEUR MOYENNE elle-même. Cela signifie qu'on ne mesure PAS la même chose
à 300 mots et en chapitre :

| Feature | μ à 300 mots | μ en chapitre | Δμ% | Interprétation |
|---------|-------------|---------------|-----|----------------|
| Score descriptif (f25g) | 0.43 | 0.74 | **+73%** | La description a BESOIN d'espace pour exister |
| Ratio PS/Imp (f30d) | 1.44 | 2.81 | **+95%** | La signature temporelle est invisible à petite échelle |
| Rituel incantatoire (f21e) | 0.26 | 0.35 | **+36%** | La répétition rituelle s'installe sur la durée |
| Modalité épistémique (f27d) | 0.28 | 0.37 | **+32%** | L'incertitude narrative se développe progressivement |
| Période syntaxique (f26c) | 0.19 | 0.14 | **-28%** | Les périodes longues sont rares dans les fragments |
| Style indirect libre (f28d) | 0.04 | 0.03 | **-26%** | Le SIL est surreprésenté dans les APEX (biais d'extraction) |

**Le score descriptif double quand on passe de 300 mots à un chapitre.**
Cela signifie qu'un extrait de 300 mots ne contient qu'une fraction de la capacité
descriptive d'un chapitre — et que notre scorer sous-estime systématiquement cette qualité.

## 2.4 — CAS D'ÉTUDE : FLAUBERT, Madame Bovary

### Structure des chapitres

- Roman : 144 247 mots total
- 4 chapitres analysés : 28 849 mots chacun (20% du roman)

### Distribution du Style Indirect Libre (f28d)

**Sur 16 extraits de 300 mots :**
```
Valeurs : 0.000, 0.100, 0.000, 0.000, 0.000, 0.000, 0.000, 0.222, 0.000, 0.000, 0.000, 0.261, 0.000, 0.000, 0.000, 0.000
μ = 0.0364, σ = 0.0841
Range/μ = 716%
```
→ 12 extraits sur 16 donnent ZÉRO. La feature est INVISIBLE à cette échelle.

**Sur 4 chapitres de 28 849 mots :**
```
Valeurs : 0.0141, 0.0123, 0.0120, 0.0112
μ = 0.0124, σ = 0.0012
Range/μ = 23%
```
→ La mesure est STABLE et COHÉRENTE. L'écart entre le min et le max est de 23%.

**La variance est 70× plus élevée à 300 mots qu'en chapitre.**
Notre bench mesure un dé lancé, pas une qualité littéraire.

### Distribution de la Densité Émotionnelle (f8a)

**Sur 16 extraits de 300 mots :**
```
Valeurs : 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.007, ...
μ = 0.0008, σ = 0.0019
Range/μ = 801%
```

**Sur 4 chapitres :**
```
Valeurs : 0.0008, 0.0008, 0.0005, 0.0014
μ = 0.0009, σ = 0.0004
Range/μ = 102%
```

**La densité émotionnelle est du bruit pur à 300 mots (Range/μ = 801%).**
C'est exactement la feature qui alimente notre scorer t14d — le scorer au poids ×3.

---

# PARTIE 3 — LA THÈSE : CE QUI DOIT CHANGER

## 3.1 — Constat fondamental (Francky)

> "Nous avons établi des tailles par praticité, pas par vérité.
> Le génie qui a écrit a senti qu'il devait couper à cet endroit —
> nous devons suivre leur génie et en tirer des mathématiques et de la physique."

> "La mesure de la tension sur une scène de 300 mots ne peut pas représenter
> le même coefficient d'importance que sur une scène de 3000 mots.
> C'est le sirop : selon le volume d'eau, son importance n'est pas la même."

> "Il faut calculer sur chaque donnée combien de pourcentage et de coefficient
> cette valeur représente, et même enlever certaines mesures qui ne peuvent être
> prises sur des scènes trop petites ou inversement trop longues."

## 3.2 — Les 5 principes de la refondation

**PRINCIPE 1 — Analyser les œuvres comme des entités complètes**
Les romans ne sont pas des recueils de nouvelles. Chaque œuvre doit être analysée
dans son ensemble — la découpe en fragments de 300 mots est une approximation
qui ne capture pas la structure réelle.

**PRINCIPE 2 — Les chapitres sont les unités naturelles de mesure**
Le découpage d'un roman en chapitres est une décision artistique du génie.
Un chapitre suspend, relance, laisse résonner, crée du manque, redistribue
l'énergie narrative. Il faut respecter ce découpage, pas imposer des fenêtres
arbitraires.

**PRINCIPE 3 — Les coefficients doivent être proportionnels à la taille**
Un même coefficient ne peut pas avoir le même poids à 300 mots et à 3000 mots.
La tension sur 300 mots est un micro-signal ; sur 3000 mots c'est un arc narratif.
Le poids doit refléter la fiabilité de la mesure à cette échelle.

**PRINCIPE 4 — Certaines mesures sont invalides sous un seuil minimal**
Si le CV d'une feature est >2.0 à 300 mots (comme f28d, f8a), cette mesure
est du bruit pur et ne devrait PAS contribuer au scoring. Le juge doit
avoir des seuils de validité par feature et par taille.

**PRINCIPE 5 — Les lois de la découpe sont elles-mêmes des features**
La ponctuation, les sauts de ligne, la longueur des chapitres, la position
relative dans l'œuvre (P_rel = mots_précédents / mots_totaux) — tout cela
fait partie du génie de l'œuvre et doit être mesuré comme une feature à part entière.

## 3.3 — Architectures cibles envisagées

### Option A — Juge multi-étages

| Étage | Échelle | Features | Poids |
|-------|---------|----------|-------|
| 1 LOCAL | 300-600 mots | rhythm, euphony, anti_cliche, signature, hook | Dominant à petite échelle |
| 2 ARC | 1500-3000 mots | t14d, interiority, impact, necessity, SIL, modal | Dominant à grande échelle |
| 3 MACRO | Chapitre entier | Endurance stylistique, cohérence globale, arc émotionnel complet | Nouveau |
| FUSION | Combinaison | Les 3 étages | Coefficients adaptés à la taille |

### Option B — Juge proportionnel unique

Un juge unique dont les poids changent dynamiquement selon la taille du texte mesuré.
Formule par feature :

```
weight_effective(feature, n_words) = weight_nominal × confidence(feature, n_words)

confidence(f, n) = clamp(0, 1, log(n / window_min(f)) / log(window_opt(f) / window_min(f)))
```

Où `window_min` = taille en dessous de laquelle la mesure est du bruit,
et `window_opt` = taille où la mesure se stabilise (CV < seuil).

Exemple (basé sur les données section 2.2) :

| Feature | À 300 mots | À 800 mots | À 1500 mots | À 3000 mots |
|---------|-----------|-----------|------------|------------|
| rhythm (f1a) | w ×0.65 | w ×0.85 | w ×0.95 | w ×1.0 |
| SIL (f28d) | w ×0.15 | w ×0.45 | w ×0.75 | w ×0.95 |
| densité émo (f8a) | w ×0.10 | w ×0.40 | w ×0.70 | w ×0.90 |
| anti_cliche | w ×1.0 | w ×1.0 | w ×1.0 | w ×1.0 |

### Avis préliminaire

L'option A (multi-étages) est plus lisible, plus auditable, et permet de DÉSACTIVER
complètement une feature à une échelle donnée plutôt que de la pondérer à 0.15.
Elle respecte aussi la réalité : un expert humain ne juge pas le rythme local
avec le même regard que l'arc émotionnel global.

L'option B est plus élégante mathématiquement mais moins intuitive et plus difficile
à auditer (chaque feature a une courbe de confiance différente).

**DÉCISION : soumise aux 3 IAs pour consultation croisée.**

---

# PARTIE 4 — LE PLAN : REFONDATION EN 5 PHASES

## Phase R1 — Mesure multi-fenêtre du corpus complet

**Objectif** : Mesurer chaque feature F1-F30 à 7 tailles de fenêtre sur les 158 œuvres.

**Fenêtres** : 300, 600, 1000, 1500, 2500, 5000, chapitre entier.

**Protocole** :
- Pour chaque œuvre, extraire des passages à chaque taille (fenêtre glissante)
- Calculer les 30 features à chaque taille
- Calculer le CV intra-œuvre par feature et par taille
- Tracer la courbe de stabilisation : CV(feature) = f(n_words)
- Déterminer le point d'inflexion où CV < 0.10 (mesure fiable)

**Livrable** : Tableau `window_min` et `window_opt` par feature.
Courbes de stabilisation pour les 30 features.

**Nouveau** : Respecter les chapitres réels de chaque œuvre comme unité naturelle,
en plus des fenêtres artificielles.

## Phase R2 — Analyse de la structure de découpe

**Objectif** : Extraire les lois de la découpe des chefs-d'œuvre.

**Mesures** :
- Position relative de chaque chapitre dans l'œuvre (P_rel)
- Longueur de chaque chapitre en mots
- Ratio ponctuation par type (points/virgules/tirets/points-virgules)
- Sauts de ligne (nombre de paragraphes par chapitre)
- Densité des 100 premiers mots (hook) vs 100 derniers mots (cliffhanger/résolution)
- Distribution des features F1-F30 en fonction de P_rel

**Livrable** : "Carte thermique" des features par position dans l'œuvre.
Profil-type d'un chapitre à 10%, 25%, 50%, 75%, 90% du roman.

## Phase R3 — Calcul des coefficients proportionnels

**Objectif** : Dériver les formules `weight_effective(feature, n_words)` depuis les données.

**Méthode** :
1. Pour chaque feature, tracer la courbe CV(n_words) sur les 7 fenêtres
2. Ajuster une fonction logarithmique : `confidence(n) = a × log(n) + b`
3. Normaliser pour que confidence(window_opt) = 1.0
4. Définir `window_min` = taille où confidence < 0.20 (= feature désactivée)

**Livrable** : Table complète des coefficients par feature × taille.
Formule de scoring composite adaptatif.

## Phase R4 — Reconstruction du scorer

**Objectif** : Implémenter le scoring à coefficients proportionnels.

**Options** :
- A : Multi-étages (3 juges spécialisés + fusion)
- B : Juge unique proportionnel

**Contrainte** : Les slopes de la physique Phase W (48 805 perturbations) doivent
être recalibrées sur la nouvelle taille de référence. Les multiplicateurs archétype
peuvent rester si la taille de test est homogène.

## Phase R5 — Bench sur textes longs

**Objectif** : Générer et scorer des scènes de 1500-2500 mots.

**Changements** :
- `target_word_count` : 600 → 2000-2500
- Beats : 4 → 8-12 (proportionnel)
- Duel : 4 drafts × 2000 mots (coût ×3.3)
- Temps bench : ~45 min → ~150 min
- Scorers : coefficients Phase R3
- Seuils : recalibrés depuis Phase R3/R4

---

# PARTIE 5 — QUESTIONS OUVERTES POUR CONSULTATION CROISÉE

## Q1 — Quelle architecture de juge ?

**Option A** : Multi-étages (LOCAL / ARC / MACRO + FUSION)
**Option B** : Juge unique proportionnel

Arguments pour A :
- Plus lisible, plus auditable
- Permet de désactiver complètement une feature à une échelle non fiable
- Chaque étage est testable indépendamment

Arguments pour B :
- Élégance mathématique
- Pas de logique de fusion à implémenter
- Un seul scoring pipeline

**DÉCISION REQUISE avant Phase R4.**

## Q2 — Taille cible de génération ?

**Option 1** : 1500 mots (petit chapitre, type Camus)
**Option 2** : 2500 mots (chapitre moyen)
**Option 3** : Adaptatif selon l'archétype (BRUTAL=1500, CATHEDRAL=3000, etc.)

L'option 3 est la plus cohérente avec la thèse "la qualité a besoin de son espace",
mais la plus complexe à implémenter et à benchmarker.

**DÉCISION REQUISE avant Phase R5.**

## Q3 — Doit-on recalibrer les slopes Phase W ?

Les slopes (48 805 perturbations) ont été calculées sur des extraits de ~500 mots.
Si on passe à 2000 mots, les amplitudes des perturbations changent (diluées).
Options :
- Relancer les perturbations sur la nouvelle taille (coûteux mais rigoureux)
- Ajuster les slopes par un facteur proportionnel (approximation)
- Garder les slopes et ne recalibrer que les thresholds du Damage Gate

**DÉCISION REQUISE avant Phase R4.**

## Q4 — Quel corpus pour la Phase R1 ?

- Toutes les 158 œuvres ? (massif mais complet)
- Un sous-ensemble de 30-40 œuvres représentatives ? (rapide mais potentiellement biaisé)
- Focus sur FR-ORIG uniquement ? (pertinent pour le Scribe qui génère en français)

**DÉCISION REQUISE avant Phase R1.**

## Q5 — Comment analyser la découpe ?

Francky demande d'analyser :
- La ponctuation (ratio points/virgules = "rythme cardiaque" staccato/legato)
- Les sauts de ligne (paragraphes = respirations)
- Les débuts et fins de chapitre (hooks et cliffhangers)
- La position de chaque chapitre dans le roman (P_rel)

Cela nécessite un nouveau module d'analyse qui n'existe pas encore dans le
full_work_analyzer_v4. Il faut :
1. Parser les chapitres réels (split_chapters existe déjà)
2. Pour chaque chapitre : calculer P_rel, longueur, ponctuation, paragraphes
3. Pour les 100 premiers et 100 derniers mots : mesurer les features de tension
4. Agréger sur le corpus pour trouver les profils-types par position

**DÉCISION REQUISE : ampleur et priorité de ce module.**

---

# PARTIE 6 — DONNÉES BRUTES POUR VÉRIFICATION

## 6.1 — Protocole de mesure actuel du full_work_analyzer v4

```
SCENE_WORDS        = 300       # Taille des extraits
N_RANDOM           = 10        # Extraits aléatoires par œuvre
N_CHAPTERS         = 5         # Chapitres par œuvre
CHAPTER_MIN_WORDS  = 1500      # Chapitre min
CHAPTER_MAX_WORDS  = 7000      # Chapitre max (ATTENTION: les chapitres > 7000 sont tronqués !)
GATE_MIN_WORDS     = 15000     # Œuvres < 15k mots rejetées
```

**ALERTE** : CHAPTER_MAX_WORDS = 7000 tronque les chapitres longs.
Flaubert (28 849 mots/chapitre), Proust (33 473 mots/chapitre),
McCarthy (23 622 mots/chapitre) sont mesurés sur des morceaux de chapitre, pas des chapitres entiers.
Pour Phase R1, il faut lever cette limite et mesurer les chapitres réels complets.

## 6.2 — Tailles réelles des chapitres dans le corpus (échantillon)

| Œuvre | Auteur | Mots total | Chapitres analysés | Mots/chapitre |
|-------|--------|-----------|-------------------|---------------|
| Madame Bovary | Flaubert | 144 247 | 4 | 28 849 |
| Du côté de chez Swann | Proust | 167 366 | 4 | 33 473 |
| L'Étranger | Camus | 32 278 | 4 | 6 455 |
| Blood Meridian | McCarthy | 118 112 | 4 | 23 622 |
| Mrs Dalloway | Woolf | 73 043 | 4 | 14 608 |

## 6.3 — Scènes OMEGA actuelles (bench)

| Scène | Archétype | target_word_count | Beats |
|-------|-----------|-------------------|-------|
| Confrontation | BRUTAL | 620 | 4 |
| Élégie | INTERIOR | 560 | 4 |
| Panique | BRUTAL | 580 | 4 |
| Contemplation | SENSORY | 520 | 4 |
| Dialogue tendu | BALANCED | 570 | 4 |
| Description lyrique | CATHEDRAL | 490 | 4 |
| Action pure | BRUTAL | 540 | 4 |
| Monologue intérieur | INTERIOR | 560 | 4 |

## 6.4 — Rappel des formules de scoring actuelles

```
ECC = (t14d×3 + emotion_coherence×2.5 + interiority×2 + impact×2) / 9.5 + bonus(max 3)
RCI = (rhythm×1 + signature×1 + hook_presence×0.2 + euphony×0.5) / 2.7
SII = (anti_cliche×1 + necessity×1 + metaphor_novelty×1) / 3
IFI = (sensory×0.25 + corporeal×0.25 + focalisation×0.25 + attention×1 + fatigue×1) / 2.75 + bonus
AAI = (authenticity×3 + show_dont_tell×2) / 5
composite = ECC×0.33 + AAI×0.25 + RCI×0.17 + SII×0.15 + IFI×0.10
SEAL = composite ≥ 93.0 ET min_axis ≥ 80
```

---

# PARTIE 7 — RÉSUMÉ DES DÉCISIONS À PRENDRE

| ID | Question | Options | Impact |
|----|----------|---------|--------|
| Q1 | Architecture du juge | Multi-étages vs Proportionnel | Fondation de Phase R4 |
| Q2 | Taille cible de génération | 1500 / 2500 / Adaptatif | Coût API, temps bench, recalibration |
| Q3 | Recalibration slopes Phase W | Relancer / Ajuster / Garder | Intégrité physique |
| Q4 | Corpus pour Phase R1 | 158 / 30-40 / FR-ORIG seul | Temps d'analyse, représentativité |
| Q5 | Module de découpe | Ampleur et priorité | Nouveau composant à développer |

**Ce document est soumis à consultation croisée Claude + ChatGPT + Gemini.**
**Aucune décision n'est prise avant convergence 3/3 + validation Francky.**

---

*Document produit le 2026-03-18 — Standard NASA-Grade L4 / DO-178C Level A*
*Autorité : Francky (Architecte Suprême)*
*Statut : CONSULTATION — NON SCELLÉ*
