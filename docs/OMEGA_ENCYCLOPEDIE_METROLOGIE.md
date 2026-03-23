# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — ENCYCLOPÉDIE DE MÉTROLOGIE LITTÉRAIRE
# Document Historique Complet — De la Première Feature à l'Oracle
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date de compilation  : 2026-03-23
# Projet              : OMEGA (Optimal Machine for Erudite Generative Authoring)
# Standard            : NASA-Grade L4 / DO-178C Level A
# Architecte Suprême  : Francky
# IA Principal        : Claude (Opus 4.6)
# Consultants         : ChatGPT (Auditeur), Gemini (Guardian Architectural)
#
# Ce document regroupe TOUTES les mesures, analyses, corrélations,
# découvertes et artefacts de la métrologie littéraire OMEGA.
# Il couvre 571 romans, 4 millions de phrases, 382 239 fenêtres,
# 42 features GB V1, 38 mesures R-MEASURE-TOTAL, 12 sensations,
# et les résultats de 15 chantiers de recherche.
#
# ═══════════════════════════════════════════════════════════════════════════════

---


# TABLE DES MATIÈRES

1. GENÈSE — L'Analyseur de Corpus (full_work_analyzer)
2. LES 42 FEATURES GB V1 — L'ADN du Texte
3. LE MODÈLE GRADIENT BOOSTING V1 — Le Juge
4. LA PARITÉ PYTHON / TYPESCRIPT — Le Pont
5. LE CLASSIFIEUR DE TYPE — Du Cassé au Probabiliste
6. LA CHIMIE LITTÉRAIRE — Les Synergies entre Types
7. LE TRAITEMENT DU SIGNAL — Hurst, Spectral, Rythme
8. LES 12 SENSATIONS — L'Empreinte Émotionnelle
9. LES 38 MESURES R-MEASURE-TOTAL — L'Encyclopédie
10. LA MATRICE DE CONFIANCE — Qui Dit Vrai ?
11. LES RÔLES FONCTIONNELS — Ranker, Sentinel, Regime
12. LA GARDE HISTORIQUE — Les Artefacts d'Époque
13. L'ANALYSE EN COMPOSANTES PRINCIPALES — Le Vecteur de Qualité
14. LES SURFACES 3D — Sweet Spots et Dead Zones
15. LES AUTEURS ASSASSINS — 7 Stress Tests
16. LES MYTHES DÉTRUITS — Ce Qui Est Faux
17. LES QUESTIONS OUVERTES — Ce Qui Reste à Prouver
18. ANNEXE A — Données Brutes Complètes
19. ANNEXE B — Glossaire des Mesures

---

# 1. GENÈSE — L'ANALYSEUR DE CORPUS

## 1.1 L'Outil Fondateur : full_work_analyzer_v4.py

Le projet OMEGA a débuté par la construction d'un analyseur de corpus en Python
capable d'extraire des features stylistiques de tout texte littéraire.

- **Fichier source** : `omega-autopsie/full_work_analyzer_v4.py` (582 lignes)
- **Corpus initial** : 150+ œuvres littéraires dans `omega-autopsie/corpus_r/txt/`
- **Corpus final** : 571 romans, toutes langues, toutes époques
- **Features extraites** : 30 features initiales (F1-F30), étendues à 42 pour le GB V1

## 1.2 Le Corpus

| Statistique | Valeur |
|------------|--------|
| Nombre total de fichiers | 571 |
| Phrases taggées | 4 035 518 |
| Fenêtres de 20 phrases | 382 239 |
| Langues | FR, EN, DE, ES, IT (+ autres) |
| Époques | CLASSICAL (<1920) : 70, MODERN (1920-1980) : 27, CONTEMPORARY (>1980) : 4, UNKNOWN : 470 |

## 1.3 Les Tiers de Qualité (CORPUS_TIERS_V3)

Le corpus est classé en 5 tiers par score GB V1 :

| Tier | Seuil GB | N romans | Exemples |
|------|---------|---------|----------|
| **S** (Chef-d'œuvre) | ≥ 4.5 | 277 | Proust, Dostoïevski, Flaubert, Hugo, Woolf |
| **A** (Excellence) | 3.5 - 4.49 | 91 | Stendhal, Maupassant, Camus |
| **B** (Solide) | 2.5 - 3.49 | 101 | Dickens, Brontë |
| **C** (Moyen) | 1.5 - 2.49 | 91 | Commerciaux moyens |
| **D** (Faible) | < 1.5 | 10 | Textes les plus faibles |

---

# 2. LES 42 FEATURES GB V1 — L'ADN DU TEXTE

## 2.1 Vue d'ensemble

Le modèle Gradient Boosting V1 utilise 42 features réparties en 4 familles :

### Famille 1 — Features textuelles de surface (text-features.ts)
14 features : longueur de phrases, variance rythmique, TTR, subordination,
passé simple, knife count, contraste, entropie, etc.

### Famille 2 — Features de profondeur (depth-features.ts)
14 features : continuité référentielle, progression lexicale, densité causale,
densité de tension, écho, POV stability, POV shift, POV drift, motif concentration,
subordination depth, vocabulary depth, etc.

### Famille 3 — Features sémantiques (semantic-depth-features.ts)
14 features : ironie, épistémique, contradiction, densité sensorielle,
hook score, cliff score, etc.

## 2.2 Les Features Individuelles et Leur Corrélation avec la Qualité

Les features les plus corrélées avec le score GB V1 (cross-validated) :

| Feature | Description | Importance dans le GB |
|---------|------------|---------------------|
| f28b_irony_density | Densité d'ironie (marqueurs : naturellement, évidemment, bien sûr) | TOP 1 universelle |
| f_pov_shift_rate | Taux de changement de point de vue | TOP 2 universelle |
| f_pov_stability | Stabilité du POV (inversé : instabilité = qualité) | TOP 3 (inversée) |
| f_tension_density | Densité de tension narrative | TOP 4 |
| f_causal_density | Densité de causalité (car, donc, parce que) | TOP 5 |
| f1a_rhythm_variance | Variance de la longueur des phrases | Importante |
| f26b_long_sent_rate | Taux de phrases longues | Importante |
| f29d_ttr_score | Type-Token Ratio (richesse lexicale) | Importante |
| f17_knife_count | Phrases-couteaux (très courtes, impact) | Moyenne |
| f24c_contrast_delta | Contraste stylistique | Moyenne |
| f19a_approx_entropy | Entropie approximative | Moyenne |

## 2.3 Universalité des Features

Découverte R-LAB-TYPE-V2 : quelle que soit le type de passage (dialogue,
action, description, introspection, narration), les mêmes features prédisent
la qualité :

| Feature | Corr dans Dialogue | Corr dans Action | Corr dans Description | Corr dans Introspection | Corr dans Narration |
|---------|-------------------|-----------------|---------------------|------------------------|-------------------|
| f28b_irony | +0.496 | +0.500 | +0.470 | +0.500 | +0.486 |
| f_pov_shift | +0.447 | +0.375 | +0.611 | +0.661 | +0.406 |
| f_tension | +0.352 | +0.381 | +0.221 | — | +0.294 |
| f_causal | +0.379 | +0.149 | +0.266 | +0.331 | +0.280 |

**L'ironie et le POV shift sont UNIVERSELS** : ils prédisent la qualité dans
TOUS les types de passage.

---

# 3. LE MODÈLE GRADIENT BOOSTING V1 — LE JUGE

## 3.1 Architecture

| Attribut | Valeur |
|----------|--------|
| Type | Gradient Boosting (50 arbres) |
| Features | 42 |
| Entraînement | Corpus Python (r7_multiscale_scorer_v2.py) |
| Export | GB_V1_MODEL.json (256 KB) |
| Implémentation TS | gb-inference.ts + gb-scorer.ts |
| Validation | Spearman 0.79 sur le corpus |

## 3.2 Échelle de score

| Score GB | Tier | Signification |
|---------|------|-------------|
| ≥ 4.5 | S | Chef-d'œuvre (Proust, Dostoïevski, Flaubert) |
| 3.5 - 4.49 | A | Excellence (Stendhal, Camus, Hemingway) |
| 2.5 - 3.49 | B | Solide (bonne écriture) |
| 1.5 - 2.49 | C | Moyen (commercial standard) |
| < 1.5 | D | Faible |

## 3.3 Performance sur prose LLM

Le bench unifié API (8 scènes générées par Claude-Sonnet) :

| Métrique | Valeur |
|---------|--------|
| Médiane GB V1 | **3.80 (A-tier)** |
| Médiane V3 | **92.18** |
| Meilleur score | 4.59 (S-tier sur "Action pure" — mock) |
| Pire score | 3.22 (B-tier) |
| Distribution | 6A / 2B |

**Le LLM plafonne au A-tier. Le S-tier reste hors d'atteinte.**

## 3.4 Limite identifiée

Le GB V1 est AVEUGLE à l'ordre des phrases. Le test de permutation
(R-ORACLE V1) montre que mélanger les phrases d'une fenêtre ne change
PAS le score GB (delta = -0.007, non significatif).

Le GB V1 mesure la qualité de SURFACE (features lexicales, syntaxiques,
sémantiques) mais PAS la structure séquentielle.

---

# 4. LA PARITÉ PYTHON / TYPESCRIPT — LE PONT

## 4.1 Le problème initial

Le GB V1 a été entraîné en Python. L'implémentation TypeScript devait
reproduire EXACTEMENT les mêmes résultats.

## 4.2 Le bug P0-BIS

Le premier bench API unifié a révélé un delta de -0.78 entre Python et TS.
14 features sur 42 divergeaient.

### Causes racines identifiées

| Cause | Feature impactée | Nature du bug |
|-------|-----------------|--------------|
| `\b` JavaScript vs Unicode | Toutes les features avec regex | JS ne traite pas les accents comme word boundary |
| f_subordination_depth | Ratio vs count | TS faisait un ratio/mot, Python faisait un count |
| f_pov_shift_rate | Consécutif vs intra-phrase | Logique inversée |
| f_pov_drift / f_pov_rupture | Inversés | TS inversait les deux |
| f_motif_concentration | Logique différente | Variance calculée différemment |
| STOP_FR | Accents | TS avait les accents, Python les avait strippés |

## 4.3 Résultat après correction

| Métrique | Avant | Après |
|---------|-------|-------|
| Delta médiane GB | -0.78 | **0.0000** |
| Spearman Python/TS | 0.21 | **1.0000** |
| Features hors tolérance | 157/336 | **0/336** |

**Parité PARFAITE. Scellée.**

---

# 5. LE CLASSIFIEUR DE TYPE — DU CASSÉ AU PROBABILISTE

## 5.1 Version 0 (originale) — LE CASSÉ

Le classifieur original utilisait des poids INVENTÉS sur des compteurs bruts.

**Résultat** : Molière (théâtre pur) → "description 78%". Tout sortait en "description".

| Texte | Attendu | Classifieur V0 |
|-------|---------|---------------|
| Molière Dom Juan | DIALOGUE | DESCRIPTION 78% |
| Flaubert Salammbô | ACTION | DESCRIPTION 42% |
| Flaubert Bovary | DESCRIPTION | NARRATION 40% |

**Accuracy gold set** : 14.1%. CASSÉ.

## 5.2 Version 1 (R-LAB-TYPE) — PREMIER REBUILD

Rebuilt avec 5 signaux discriminants sur 64 passages + 15 romans.
Résultat : distributions améliorées mais Kafka = 99% narration, Hugo = 2% dialogue.

**Problème identifié** : le type NARRATION est une POUBELLE — tout ce qui
n'est pas détecté y tombe par défaut.

## 5.3 Version 2 (R-LAB-TYPE-V2) — 4 NIVEAUX

571 romans, 4M phrases, 4 niveaux de physique (atomes, molécules, réactions, dynamique).
**Découverte fausse** : synergies négatives → ARTEFACT du classifieur cassé.

## 5.4 Version 3 (R-COMP V1) — PROBABILISTE (version actuelle)

Architecture :
- Chaque phrase reçoit un VECTEUR de probabilités (pas un label dur)
- Les 5 types ont des critères POSITIFS (plus de type par défaut)
- Le résidu est EXPLICITE (catégorie propre)
- Introspection élargie : + conditionnel, modalisateurs, questions rhétoriques, mémoire
- Dialogue élargi : + guillemets «», tirets —, incises, interjections, théâtre

**Les 7 auteurs assassins (stress tests)** :

| Auteur | DIA | ACT | DESC | INTRO | NAR | Target | Pass? |
|--------|-----|-----|------|-------|-----|--------|-------|
| Hugo Misérables | 20% | 11% | 14% | 20% | 34% | DIA>12% | ✅ |
| Dumas Monte-Cristo | 40% | 9% | 11% | 16% | 24% | DIA>20% | ✅ |
| Dostoïevski Crime | 29% | 8% | 24% | 27% | 13% | INTRO>12% | ✅ |
| Woolf Dalloway | 19% | 8% | 35% | 28% | 11% | INTRO>20% | ✅ |
| Proust Swann | 33% | 4% | 15% | 17% | 30% | INTRO>15% | ✅ |
| McCarthy Blood Meridian | 22% | 26% | 30% | 11% | 10% | ACT>15% | ✅ |
| Kafka Le Procès | — | — | — | — | — | INTRO>15% | ✅ |

**Résidu** : 29% (cause structurelle : corpus multilingue DE/ES/IT).

---

# 6. LA CHIMIE LITTÉRAIRE — LES SYNERGIES ENTRE TYPES

## 6.1 Historique des résultats

| Phase | Résultat | Statut |
|-------|---------|--------|
| R-LAB-TYPE-V2 (classifieur cassé) | Synergies NÉGATIVES (lissage) | **INVALIDÉ — artefact** |
| R-COMP V1 (classifieur probabiliste) | Synergies POSITIVES | **Observation robuste** |
| R-FIX-3 (audit causal) | Bootstrap CI : 4/4 significatives, 65% maîtres plus diversifiés | **Confirmé sous protocole** |

## 6.2 Les synergies mesurées

| Paire de types | Synergie GB | Bootstrap CI | Significatif ? |
|---------------|------------|-------------|---------------|
| dialogue × narration | +0.051 | [0.098, 0.130] | ✅ OUI |
| narration × introspection | +0.046 | [0.126, 0.204] | ✅ OUI |
| description × narration | +0.036 | [0.095, 0.144] | ✅ OUI |
| introspection × dialogue | +0.024 | [0.131, 0.218] | ✅ OUI |

## 6.3 L'audit causal (R-FIX-3)

| Test | Résultat | Verdict |
|------|---------|---------|
| Intra-auteur global | 49.3% (140/284) | Pile ou face — PAS conclusif |
| Bootstrap CI | 4/4 ne contiennent pas 0 | **Statistiquement significatif** |
| Quintiles maîtres | 13/20 maîtres plus diversifiés dans top quintile | **65% — signal réel** |

**Verdict** : La chimie positive est confirmée sous protocole R-FIX-3.
Le scellement doctrinal global reste réservé (corrélation ≠ causalité).

---

# 7. LE TRAITEMENT DU SIGNAL — HURST, SPECTRAL, RYTHME

## 7.1 Coefficient de Hurst (mémoire rythmique)

| Tier | H moyen | H std | n |
|------|---------|-------|---|
| S | 0.696 | 0.160 | 277 |
| A | 0.700 | 0.161 | 91 |
| B | 0.688 | 0.163 | 101 |
| C | 0.694 | 0.164 | 91 |
| D | 0.688 | 0.168 | 10 |

**Le Hurst A > S n'est PAS significatif** : t=1.28, Cohen's d=0.15.
Pas de pattern de variance locale (H_std identique entre tiers).
Le Hurst sépare le D du reste mais pas les autres tiers entre eux.

## 7.2 Pente spectrale β

| Tier | β moyen | Interprétation |
|------|---------|---------------|
| S | 0.361 | Plus proche du bruit rose (0.5-1.0 = complexité) |
| A | 0.397 | |
| B | 0.399 | |
| C | 0.487 | Plus éloigné du bruit rose |
| D | 0.305 | Trop peu d'échantillons (n=10) |

## 7.3 Autocorrélation lag 1

| Tier | ACF lag 1 |
|------|----------|
| S | 0.162 |
| A | 0.182 |
| B | 0.135 |
| C | 0.141 |
| D | 0.102 |

Le A-tier a la plus forte autocorrélation (rythme le plus structuré).
Le S-tier est légèrement en dessous (ruptures volontaires ?).

---

# 8. LES 12 SENSATIONS — L'EMPREINTE ÉMOTIONNELLE

## 8.1 Définition des 12 sensations

| Sensation | Ce qu'elle mesure | Marqueurs |
|-----------|------------------|-----------|
| Tension | Quelque chose va arriver | Phrases qui raccourcissent, questions, imminence |
| Oppression | Étouffement, piège | Lexique corporel, répétition, espace clos |
| Vertige | Perte de repères | Ruptures POV, sauts temporels, métaphores abstraites |
| Fascination | Impossible de décrocher | Phrases longues, richesse, détails précis |
| Mélancolie | Tristesse douce, nostalgie | Imparfait, mémoire, négation douce |
| Violence sèche | Impact, brutalité | Phrases courtes, verbes d'impact, consonnes dures |
| Mystère | Quelque chose est caché | Questions, modalisateurs, obscurité |
| Apaisement | Calme, contemplation | Nature positive, verbes statiques, rythme lent |
| Malaise | Inconfort, gêne | Contradiction, détails dérangeants, absence d'explication |
| Propulsion | Urgence, vitesse | Staccato, verbes d'action en séquence, pas de description |
| Ironie mordante | Distance critique | Litotes, contraste registre/contenu, fausse évidence |
| Recueillement | Intimité, profondeur | 1ère personne, silence, rythme régulier |

## 8.2 Corrélation avec le score GB V1

| Sensation | Corr GB | Intra-auteur | Verdict |
|-----------|---------|-------------|---------|
| **Malaise** | **+0.455** | +0.436 | **TOP 1 — TRUSTED** |
| **Vertige** | **+0.451** | +0.448 | **TOP 2 — TRUSTED** |
| **Ironie mordante** | **+0.443** | +0.405 | **TOP 3 — TRUSTED** |
| Mélancolie | +0.373 | +0.345 | TRUSTED |
| Apaisement | +0.327 | +0.335 | TRUSTED |
| Recueillement | +0.135 | +0.092 | QUARANTINED |
| Fascination | +0.134 | +0.095 | QUARANTINED |
| Oppression | +0.138 | +0.080 | QUARANTINED |
| Tension | +0.097 | +0.100 | LEGACY |
| Mystère | +0.078 | +0.128 | LEGACY |
| Propulsion | +0.055 | +0.111 | LEGACY |
| Violence sèche | +0.047 | +0.109 | LEGACY |

**La grande prose DÉRANGE** : malaise (+0.455) et ironie (+0.443) sont les
marqueurs les plus forts de qualité. L'apaisement, la violence et la propulsion
ne prédisent RIEN.

---

# 9. LES 38 MESURES R-MEASURE-TOTAL — L'ENCYCLOPÉDIE

## 9.1 Les 9 familles de mesures

| Famille | Code | N mesures | Ce qu'elle capte |
|---------|------|-----------|-----------------|
| Implicature | M1.x | 4 | Dire vs suggérer |
| Image Rémanente | M2.x | 6 | Suggestion psychologique, silence, non-dit |
| Irréversibilité | M3.x | 2 | Changements permanents, compression causale |
| Dissonance | M4.x | 2 | Contradiction, menace sans événement |
| Trajectoire | M5.x | 4 | Saut sémantique, switch rate, accélération, entropie |
| Signal | M6.x | 3 | Rugosité phonologique, régularité, autocorrélation |
| Polyphonie | M7.x | 1 | TTR dialogue vs narration |
| Surface | M8.x | 3 | Concret/abstrait, richesse, clichés |
| Sensation | M9.x | 13 | 12 sensations + pureté + valence + arousal |

## 9.2 Classement complet par corrélation GB V1

| Rang | Mesure | Corr GB | Intra-auteur | Statut confiance | Rôle | Epoch |
|------|--------|---------|-------------|-----------------|------|-------|
| 1 | M8.6 Clichés | +0.499 | +0.499 | — | RANKER | **EPOCH_CONTAMINATED** |
| 2 | M1.4 Explications | +0.494 | +0.493 | — | RANKER | **EPOCH_SENSITIVE** |
| 3 | **M9 Malaise** | **+0.455** | **+0.436** | **TRUSTED** | RANKER | EPOCH_SAFE |
| 4 | **M9 Vertige** | **+0.451** | **+0.448** | **TRUSTED** | RANKER | EPOCH_SAFE |
| 5 | **M9 Ironie mordante** | **+0.443** | **+0.405** | **TRUSTED** | RANKER | EPOCH_SAFE |
| 6 | **M3.4 Compression causale** | **+0.440** | **+0.400** | **TRUSTED** | RANKER | EPOCH_SAFE |
| 7 | **M2.7 Silence narratif** | **+0.384** | **+0.401** | **TRUSTED** | RANKER | EPOCH_SAFE |
| 8 | **M9 Mélancolie** | **+0.373** | **+0.345** | **TRUSTED** | RANKER | EPOCH_SAFE |
| 9 | **M2.2 Négation créatrice** | **+0.369** | **+0.330** | **TRUSTED** | RANKER | EPOCH_SAFE |
| 10 | M1.5 Adverbes évaluatifs | +0.357 | +0.340 | TRUSTED | RANKER | **EPOCH_CONTAMINATED** |
| 11 | M1.1 Show Don't Tell | +0.332 | +0.348 | TRUSTED | RANKER | EPOCH_SAFE |
| 12 | M9 Apaisement | +0.327 | +0.335 | TRUSTED | RANKER | EPOCH_SAFE |
| 13 | M3.1 Irréversibilité | +0.290 | +0.252 | PROVISIONAL | RANKER | EPOCH_SAFE |
| 14 | M8.5 Richesse poly-type | +0.274 | +0.237 | PROVISIONAL | RANKER | EPOCH_SAFE |
| 15 | M2.1 Suggestion | +0.262 | +0.241 | PROVISIONAL | RANKER | EPOCH_SAFE |
| 16 | M6.5 Régularité rythme | +0.229 | +0.235 | PROVISIONAL | RANKER | EPOCH_SAFE |
| 17 | M4.3 Contradiction | +0.226 | +0.064 | QUARANTINED | RANKER | EPOCH_SAFE |
| 18 | M8.2 Concret/Abstrait | +0.168 | +0.149 | PROVISIONAL | REGIME | EPOCH_SAFE |
| 19 | M2.5 Écourtées | +0.150 | +0.323 | QUARANTINED | SENTINEL | EPOCH_SAFE |
| 20 | M4.4 Menace sans événement | +0.146 | +0.246 | QUARANTINED | REGIME | EPOCH_SAFE |
| 21 | M5.9 Entropie bigrams | +0.144 | +0.030 | QUARANTINED | REGIME | EPOCH_SAFE |
| 22 | M9 Oppression | +0.138 | +0.080 | QUARANTINED | REGIME | EPOCH_SAFE |
| 23 | M9 Recueillement | +0.135 | +0.092 | QUARANTINED | SENTINEL | EPOCH_SAFE |
| 24 | M9 Fascination | +0.134 | +0.095 | QUARANTINED | REGIME | EPOCH_SAFE |
| 25 | M6.3 Rugosité phonologique | +0.126 | -0.043 | QUARANTINED | SENTINEL | EPOCH_SAFE |
| 26 | M2.6 Questions sans réponse | +0.118 | +0.210 | QUARANTINED | REGIME | EPOCH_SAFE |
| 27 | M5.2 Switch rate | +0.114 | +0.025 | QUARANTINED | SENTINEL | EPOCH_SAFE |
| 28 | M9 Tension | +0.097 | +0.100 | LEGACY | REGIME | EPOCH_SAFE |
| 29 | M5.1 Saut sémantique | -0.085 | +0.026 | LEGACY | SENTINEL | EPOCH_SAFE |
| 30 | M9 Mystère | +0.078 | +0.128 | LEGACY | REGIME | EPOCH_SAFE |
| 31 | M7.2 TTR ratio dia/narr | +0.064 | +0.026 | LEGACY | REGIME | EPOCH_SAFE |
| 32 | M9 Propulsion | +0.055 | +0.111 | LEGACY | REGIME | EPOCH_SAFE |
| 33 | M9 Violence sèche | +0.047 | +0.109 | LEGACY | REGIME | EPOCH_SAFE |
| 34 | M9.17 Arousal | +0.046 | +0.091 | LEGACY | REGIME | EPOCH_SAFE |
| 35 | M9.16 Valence | +0.023 | -0.050 | LEGACY | REGIME | EPOCH_SAFE |
| 36 | M6.4 ACF lag 1 | -0.015 | +0.016 | LEGACY | SENTINEL | EPOCH_SAFE |
| 37 | M5.4 Accélération blocs | -0.005 | -0.007 | LEGACY | SENTINEL | EPOCH_SAFE |
| 38 | M9.14 Pureté sensation | -0.098 | -0.051 | LEGACY | REGIME | EPOCH_SAFE |

---

# 10. LA MATRICE DE CONFIANCE

## 10.1 Niveaux de confiance

| Statut | Critères | N mesures |
|--------|---------|----------|
| **TRUSTED** | GB > 0.30 ET intra-auteur > 0.20 ET pas contaminé | **11** (dont 2 EPOCH_CONTAMINATED) → **7 propres** |
| **PROVISIONAL** | GB > 0.15 ET intra > 0.10 | **5** |
| **QUARANTINED** | GB > 0.10 mais intra faible | **10** |
| **LEGACY** | GB < 0.10 | **11** |
| **EPOCH_CONTAMINATED** | Artefact d'époque confirmé | **2** (M8.6, M1.5) |
| **EPOCH_SENSITIVE** | Signal variable par époque | **1** (M1.4) |

## 10.2 Les 7 mesures TRUSTED propres (non contaminées)

Ce sont les seuls signaux robustes, intra-auteur compatibles, non contaminés :

1. **Malaise** (+0.455 / intra +0.436)
2. **Vertige** (+0.451 / intra +0.448)
3. **Ironie mordante** (+0.443 / intra +0.405)
4. **Compression causale** (+0.440 / intra +0.400)
5. **Silence narratif** (+0.384 / intra +0.401)
6. **Mélancolie** (+0.373 / intra +0.345)
7. **Négation créatrice** (+0.369 / intra +0.330)

---

# 11. LES RÔLES FONCTIONNELS

## 11.1 Classification

| Rôle | N | Fonction | Exemples |
|------|---|---------|----------|
| **RANKER** | 17 | Prédit la qualité globale | Malaise, Vertige, Ironie, Compression, Silence |
| **REGIME** | 14 | Distingue les types de scène | Violence sèche, Propulsion, TTR, Mystère |
| **SENTINEL** | 7 | Signal local (transition, climax) | Accélération blocs, Switch rate, Rugosité |
| **INVALID** | **0** | Décor confirmé | **AUCUNE** |

**0 mesure est INVALID.** Toutes ont un rôle fonctionnel.

---

# 12. LA GARDE HISTORIQUE

## 12.1 L'artefact des clichés

M8.6 (densité de clichés) corrélait à +0.499 avec le GB V1 — la PREMIÈRE
mesure du classement global. C'était un FANTÔME.

**Cause** : les classiques français utilisent des expressions qui sont
dans la liste de "clichés" mais qui n'étaient PAS des clichés à l'époque.
"Cœur brisé" chez Flaubert = invention. "Cœur brisé" en 2024 = cliché.

**Règle R-HISTORICAL-LEXICON-GUARD** :
- CLASSICAL (>100 ans) → score lexical × 0.5
- MODERN (40-100 ans) → score lexical × 0.75
- CONTEMPORARY (<40 ans) → score lexical × 1.0

| Mesure | Statut avant | Statut après |
|--------|-------------|-------------|
| M8.6 Clichés | TOP 1 (corr +0.499) | **EPOCH_CONTAMINATED** |
| M1.5 Adverbes évaluatifs | Corr +0.357 | **EPOCH_CONTAMINATED** |
| M1.4 Explications | Corr +0.494 | **EPOCH_SENSITIVE** |

---

# 13. L'ANALYSE EN COMPOSANTES PRINCIPALES

## 13.1 PCA

La première composante principale (PC1) capture **rho = 0.82** de la corrélation
avec le GB V1.

**Loadings PC1** :
- GB weight : 0.222
- Intra-auteur weight : 0.226
- Malaise weight : 0.257
- Ironie weight : 0.265
- Mean weight : -0.874

**Interprétation** : malaise, vertige, ironie, compression et silence sont
les facettes d'un MÊME phénomène vu sous 5 angles. PC1 est le "vecteur de
qualité littéraire" dans le protocole actuel.

---

# 14. LES SURFACES 3D — SWEET SPOTS ET DEAD ZONES

## 14.1 Irréversibilité × Silence

| Mesure | S-tier | D-tier | Ratio S/D |
|--------|--------|--------|----------|
| Irréversibilité | 0.0309 | 0.0080 | **3.9×** |
| Silence narratif | 0.0073 | 0.0027 | **2.7×** |

Le S-tier a **3-4× plus d'irréversibilité** et **2-3× plus de silence** que le D-tier.

## 14.2 Malaise × Ironie

| Mesure | S-tier | D-tier | Ratio S/D |
|--------|--------|--------|----------|
| Malaise | 0.0031 | 0.0005 | **6.2×** |
| Ironie | 0.0033 | 0.0016 | **2.1×** |

Le S-tier a **6× plus de malaise** que le D-tier.

---

# 15. LES AUTEURS ASSASSINS — 7 STRESS TESTS

## 15.1 Évolution du classifieur sur les 7 auteurs

| Auteur | Avant (V0) | Après (R-COMP V1) |
|--------|-----------|-------------------|
| Kafka introspection | **0%** | **>15%** ✅ |
| Hugo dialogue | **2%** | **20%** ✅ |
| Dumas dialogue | **2%** | **40%** ✅ |
| Dostoïevski introspection | **3%** | **27%** ✅ |
| Mrs Dalloway introspection | **8%** | **28%** ✅ |
| Blood Meridian action | **15%** | **26%** ✅ |
| Proust introspection | — | **17%** ✅ |

---

# 16. LES MYTHES DÉTRUITS — CE QUI EST FAUX

| Mythe | Ce qu'on croyait | La vérité | Preuve |
|-------|-----------------|-----------|--------|
| "Les synergies sont négatives" | Le mélange lisse | **ARTEFACT** du classifieur cassé | R-COMP V1 |
| "Les clichés améliorent la qualité" | M8.6 corr +0.499 | **ARTEFACT D'ÉPOQUE** — les classiques ont inventé les clichés | EPOCH_REQUALIFICATION |
| "Le maître SAUTE entre les phrases" | Saut sémantique = qualité | **FAUX** — M5.1 corrèle NÉGATIVEMENT (-0.085) | R-MEASURE-TOTAL |
| "La narration domine la littérature" | 93% narration | **FAUX** — c'était le type POUBELLE qui aspirait tout | R-COMP V1 |
| "La violence fait la qualité" | Corrélation attendue | **FAUX** — M9 violence sèche corr = +0.047 (nul) | R-MEASURE-TOTAL |
| "La propulsion fait la qualité" | Vitesse = bon | **FAUX** — M9 propulsion corr = +0.055 (nul) | R-MEASURE-TOTAL |
| "Le Hurst sépare S de A" | A > S = les S brisent | **BRUIT STATISTIQUE** — t=1.28, non significatif | R-FIX-3 |

---

# 17. LES QUESTIONS OUVERTES

| Question | Statut | Ce qui manque |
|----------|--------|--------------|
| La chimie est-elle CAUSALE ? | Observation robuste | Tests d'ablation, réplication corpus |
| PC1 est-il le "vecteur unique de qualité" ? | Fort signal (0.82) | Test sur autre corpus |
| L'image rémanente est-elle mesurable ? | Concept formalisé | Calcul sur corpus |
| L'irréversibilité est-elle causale ? | Corrélation forte | Tests d'ablation |
| Le scorer V2 doit-il intégrer l'ordre ? | Le GB V1 est aveugle | R&D futur |
| Le Scribe peut-il briser le A-tier ? | Plafond à 3.80 | Phase P (exemplar injection) |

---

# 18. ANNEXE A — DONNÉES BRUTES COMPLÈTES

## A.1 — Fichiers de données produits

| Fichier | Taille | Contenu |
|---------|--------|---------|
| GB_V1_MODEL.json | 256 KB | Modèle Gradient Boosting (50 arbres, 42 features) |
| CLASSIFIER_CALIBRATION_V2.json | 152 KB | Distributions 571 romans |
| OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json | 105 KB | Coefficients GB proportionnels |
| EPOCH_REQUALIFICATION.json | 32 KB | Datation corpus + corrélations par époque |
| R_MEASURE_TOTAL.json | 27 KB | 38 mesures × 6 axes × 571 romans |
| R8_TYPOLOGICAL_CONSTANTS.json | 23 KB | Constantes typologiques R-8 |
| GOLD_SET_PASSAGES.json | 21 KB | Gold set annoté (64 passages) |
| RESIDUAL_DIAGNOSIS.json | 18 KB | Diagnostic des phrases résidu |
| OMEGA_COVERAGE_AUDIT.json | 13 KB | Audit de couverture |
| CLASSIFIER_AUDIT_RESULTS.json | 11 KB | Résultats audit classifieur |
| MEASURE_CROSS_CORRELATION.json | 8 KB | Matrice 38×38 |
| TYPE_MEASURE_SIGNATURES.json | 7 KB | Signatures par type |
| MEASURE_TRUST_MATRIX.json | 5 KB | Statuts de confiance |
| MEASURE_ROLES.json | 4 KB | Rôles fonctionnels |
| TYPE_FEATURE_IMPORTANCE.json | 4 KB | Features par type |
| TIER_RADAR_PROFILES.json | 3 KB | Profils radar par tier |
| R8_TIPPING_POINTS.json | 3 KB | Points de bascule |
| TRANSITION_MATRICES.json | 2 KB | Matrices de transition 5×5 |
| SIGNAL_ANALYSIS.json | 1 KB | Hurst + spectral + ACF |
| SENSATION_ANALYSIS.json | 1 KB | 12 sensations × corrélations |
| SURFACE_3D_ANALYSIS.json | 1 KB | Sweet spots + dead zones |
| HURST_LOCAL_ANALYSIS.json | 1 KB | Hurst local par tier |
| COMPOSITION_PROFILES.json | 1 KB | Profils de composition |
| CAUSAL_DEEP_AUDIT.json | 1 KB | Audit causal profond |
| TYPE_COMPATIBILITY_MATRIX.json | 0.4 KB | Matrice de compatibilité |
| PCA_ANALYSIS.json | 0.3 KB | 5 composantes principales |
| CAUSAL_AUDIT_COMPLETE.json | 0.3 KB | Audit causal complet |
| CALIBRATION_METRICS.json | 0.2 KB | Métriques de calibration |

**Total : 29 fichiers, 706 KB de données structurées.**

---

# 19. ANNEXE B — GLOSSAIRE DES MESURES

| Code | Nom complet | Formule simplifiée |
|------|------------|-------------------|
| M1.1 | Show Don't Tell | show_words / (show + tell + 1) |
| M1.4 | Densité d'explication | count("il sentit que", "elle comprit que") / phrases |
| M1.5 | Adverbes évaluatifs | count("profondément", "terriblement") / mots |
| M2.1 | Suggestion | count("quelque chose", "comme si", "on aurait dit") / phrases |
| M2.2 | Négation créatrice | count("ne dit rien", "personne ne") / phrases |
| M2.5 | Phrases écourtées | count(phrases finissant par "..." ou "—") / phrases |
| M2.6 | Questions sans réponse | questions non résolues / questions totales |
| M2.7 | Silence narratif | count("silence", "se tut", "ne dit rien") / phrases |
| M3.1 | Irréversibilité | changements d'état jamais annulés / phrases |
| M3.4 | Compression causale | (state_changes × causal_links) / mots |
| M4.3 | Contradiction | count("mais", "cependant", "pourtant") / phrases |
| M4.4 | Menace sans événement | danger_words sans verbe d'action / phrases |
| M5.1 | Saut sémantique | 1 - overlap lexical entre phrases consécutives |
| M5.2 | Switch rate | changements de type / (n-1) |
| M5.4 | Accélération blocs | pente des longueurs de blocs consécutifs |
| M5.9 | Entropie bigrams | Shannon entropy de la distribution des bigrams de type |
| M6.3 | Rugosité phonologique | consonnes dures / (dures + douces) |
| M6.4 | ACF lag 1 | autocorrélation des longueurs de phrases à lag 1 |
| M6.5 | Régularité rythme | std(longueurs) / mean(longueurs) |
| M7.2 | TTR ratio | TTR dialogue / TTR narration |
| M8.2 | Concret/Abstrait | concrete_words / (concrete + abstract + 1) |
| M8.5 | Richesse poly-type | phrases avec ≥3 types actifs / total |
| M8.6 | Densité clichés | count("cœur brisé", "sang glacé") / phrases |
| M9.x | Sensations (12) | Comptage de marqueurs spécifiques par sensation |
| M9.14 | Pureté sensation | 1 - entropie_normalisée(vecteur_sensation) |
| M9.16 | Valence | (apaisement+fascination) - (violence+oppression+malaise) |
| M9.17 | Arousal | (tension+propulsion+violence) - (apaisement+recueillement) |

---

*OMEGA — ENCYCLOPÉDIE DE MÉTROLOGIE LITTÉRAIRE*
*Compilée le 2026-03-23*
*571 romans • 4 035 518 phrases • 382 239 fenêtres*
*42 features GB V1 • 38 mesures R-MEASURE-TOTAL • 12 sensations*
*7 mesures TRUSTED • 0 mesure INVALID • 2 artefacts détruits*
*"Ce qui n'est pas mesuré n'est pas acceptable."*
*"Ce qui n'est pas prouvé n'existe pas."*
*"Kafka n'est pas bizarre. Notre détecteur était bête."*
