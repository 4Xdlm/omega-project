# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — PROTOCOLE D'ANALYSE MÉTROLOGIQUE COMPLET
# Du texte brut à la formule de scoring exploitable
# Guide reproductible pour littérature, scénarios, ou tout corpus textuel
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date     : 2026-03-20
# Version  : 1.0
# Standard : NASA-Grade L4 / DO-178C Level A
# Usage    : Référence pour reproduire le pipeline sur un nouveau domaine
#            (ex: scénarios TV, poésie, non-fiction, dialogues jeux vidéo)
#
# ═══════════════════════════════════════════════════════════════════════════════

---

# TABLE DES MATIÈRES

1. Vue d'ensemble du pipeline
2. Phase 0 — Préparation du corpus
3. Phase 1 — Mesure multi-fenêtre
4. Phase 2 — Topologie narrative
5. Phase 3 — Cristallisation des coefficients
6. Phase 4 — Implémentation du scorer
7. Phase 5 — Portage des features
8. Phase 6 — Normalisation
9. Formules mathématiques complètes
10. Adaptation pour un nouveau domaine (scénarios, etc.)

---

# 1. VUE D'ENSEMBLE DU PIPELINE

```
CORPUS BRUT (textes)
    │
    ▼
PHASE 0 — PRÉPARATION
    Nettoyer, cataloguer, vérifier les data gates
    │
    ▼
PHASE 1 — MESURE MULTI-FENÊTRE
    N œuvres × M features × K fenêtres × P positions
    → cv_matrix, derived_constants
    │
    ▼
PHASE 2 — TOPOLOGIE
    Carte positionnelle, moments clés, hooks/cliffhangers,
    distribution chapitres, types de passage, naturalité de coupure
    │
    ▼
PHASE 3 — CRISTALLISATION
    confidence_table, weight_table, position_modifiers,
    type_modifiers, language_dependency, scoring_formula, backtest
    │
    ▼
PHASE 4 — IMPLÉMENTATION
    Scorer TypeScript (ou autre langage) avec les coefficients
    │
    ▼
PHASE 5 — PORTAGE FEATURES
    Features text-level dans le langage cible
    │
    ▼
PHASE 6 — NORMALISATION
    Baselines P10/P90 → scores 0-100
    │
    ▼
SCORING OPÉRATIONNEL
```

---

# 2. PHASE 0 — PRÉPARATION DU CORPUS

## 2.1 Prérequis

| Élément | Minimum | Optimal | Notre cas |
|---------|---------|---------|-----------|
| Nombre d'œuvres | 50 | 150+ | 187 |
| Langues | 1 | 3+ | FR + EN + ES |
| Périodes temporelles | 2 | 4+ | <1900, 1900-50, 1950-2000, >2000 |
| Styles variés | 3 | 5+ | Classique, Moderne, Nouveau Roman, etc. |
| Taille minimale par œuvre | 8000 mots | 30000+ | GATE_MIN_WORDS = 8000 |

## 2.2 Fichiers

| Fichier | Rôle |
|---------|------|
| `v5_config.py` | Catalogue des œuvres (auteur, titre, source, langue, IDs Gutenberg) |
| `v5_extraction.py` | Download, nettoyage, extraction chapitres, data gates |
| `v5_features.py` | Calcul des features F1-F38 |
| `full_work_analyzer_v5.py` | Orchestrateur principal |

## 2.3 Data Gates (filtrage qualité)

Chaque texte passe par des gates AVANT analyse :

| Gate | Seuil | Action si FAIL |
|------|-------|----------------|
| GATE_MIN_WORDS | 8000 mots | REJECT : "TRUNCATED_TEXT" |
| GATE_ALPHA_RATIO | 0.60 | REJECT : "GARBLED_TEXT" (OCR raté, encodage cassé) |

## 2.4 Protocole d'extraction (extract_protocol_v5)

Pour chaque œuvre, on extrait :

| Type d'extrait | Description | Usage |
|---------------|-------------|-------|
| APEX | Passage le plus dense en description (f25g max) | Calibration features hautes |
| NEUTRE | Passage médian en description | Calibration features médianes |
| SEUIL | Passage au P25 de description | Calibration features basses |
| INCIPIT | 600 premiers mots | Profil d'ouverture |
| EXPLICIT | 600 derniers mots | Profil de fermeture |
| CLIMAX | Passage au P_rel 0.75 | Zone de tension |
| RANDOM × N | N extraits aléatoires (N = taille/5000, min 5, max 30) | Couverture uniforme |
| ALL_CHAPTERS | Tous les chapitres réels (sans limite de taille) | Analyse ARC |

## 2.5 Détection de chapitres (split_chapters_v5)

Regex de détection :
```python
patterns = [
    r"^(?:CHAPITRE|CHAPTER|CAPÍTULO)\s+[IVXLCDM\d]+",
    r"^(?:LIVRE|BOOK|LIBRO)\s+[IVXLCDM\d]+",
    r"^(?:PARTIE|PART|PARTE)\s+[IVXLCDM\d]+",
    r"^\d+\.\s+[A-Z]",  # "1. Titre"
    r"^[IVXLCDM]+\.\s*$",  # "III."
]
```

Seuil minimum par chapitre : CHAPTER_MIN_WORDS = 200 mots.
Pas de maximum (CHAPTER_MAX_WORDS supprimé en v5).

## 2.6 Sortie Phase 0

| Fichier | Contenu |
|---------|---------|
| `OMEGA_CORPUS_R0.json` | Catalogue complet (187 œuvres, métadonnées, statuts) |
| `results_r1/*.json` | Un JSON par œuvre (extraits + features) |

---

# 3. PHASE 1 — MESURE MULTI-FENÊTRE

## 3.1 Concept

Pour chaque œuvre, mesurer les features à PLUSIEURS tailles de texte
pour déterminer à partir de quelle taille chaque feature se STABILISE.

## 3.2 Paramètres

| Paramètre | Valeur | Justification |
|-----------|--------|---------------|
| Fenêtres | [30, 150, 300, 600, 1000, 1500, 2500, 5000, 10000, 20000] | Couvrir de la phrase au chapitre |
| Positions par fenêtre | 5 (P_rel 0.05, 0.275, 0.50, 0.725, 0.95) | Couvrir tout le roman |
| Chapitres réels | Tous (pas de limite) | Unités naturelles |

## 3.3 Script

`r1_multiwindow.py`

Pour chaque œuvre × chaque fenêtre × chaque position :
1. Extraire le texte à la position P_rel donnée
2. Calculer les M features (F1-F38)
3. Stocker le résultat

## 3.4 Agrégation : cv_matrix

Pour chaque feature × chaque taille de fenêtre :
```
mean(f, w) = moyenne des valeurs de f sur toutes les œuvres à la fenêtre w
stdev(f, w) = écart-type des valeurs de f sur toutes les œuvres à la fenêtre w
CV(f, w) = stdev(f, w) / mean(f, w)   [Coefficient de Variation]
n_samples(f, w) = nombre d'échantillons utilisés
```

## 3.5 Constantes dérivées

Pour chaque feature f :
```
window_min(f) = plus petite fenêtre où CV(f, w) < 0.30
window_opt(f) = fenêtre où |CV(f, w) - CV(f, w-1)| / CV(f, w-1) < 0.05
classification(f) = LOCAL si window_opt ≤ 1500, ARC si 1500 < window_opt ≤ 10000, MACRO sinon
```

## 3.6 Sortie Phase 1

| Fichier | Contenu | Taille |
|---------|---------|--------|
| `OMEGA_METROLOGIE_EMPIRIQUE_v1.json` | cv_matrix + derived_constants + cv_by_language + cv_by_passage_type | 25 MB |
| `results_r1/*.json` | 170 JSON individuels par œuvre | 106 MB |

---

# 4. PHASE 2 — TOPOLOGIE NARRATIVE

## 4.1 Les 7 analyses

| # | Analyse | Sortie | Ce qu'elle mesure |
|---|---------|--------|-------------------|
| 1 | Heatmap P_rel | OMEGA_PREL_HEATMAP.json | Features × 5 zones positionnelles (trend, μ, σ) |
| 2 | Profils positionnels | OMEGA_POSITION_PROFILES.json | Signature de chaque zone |
| 3 | Hooks/Cliffhangers | OMEGA_HOOKS_CLIFFHANGERS.json | 100 premiers/derniers mots de chaque chapitre |
| 4 | Distribution chapitres | OMEGA_CHAPTER_DISTRIBUTION.json | Taille par langue, siècle, auteur |
| 5 | Moments clés | OMEGA_KEY_MOMENTS.json | Chapitres divergeant de > 2σ du mean |
| 6 | Types de passage | OMEGA_PASSAGE_TYPES.json | Profil moyen par type (5 types) |
| 7 | Naturalité de coupure | OMEGA_CUT_NATURALNESS.json | Contraste inter-chapitre par auteur |

## 4.2 Zones positionnelles

| Zone | P_rel | Interprétation |
|------|-------|----------------|
| OPENING | 0.00-0.10 | Ouverture du roman |
| SETUP | 0.10-0.40 | Installation du monde narratif |
| MIDDLE | 0.40-0.60 | Zone la plus stable |
| TENSION | 0.60-0.85 | Montée de tension |
| CLOSING | 0.85-1.00 | Résolution |

## 4.3 Classification des types de passage

```python
def classify_passage(text):
    # DIALOGUE : > 40% de lignes avec guillemets/tirets
    # ACTION : f5a > 0.06 ET f38c > 0.28 ET f1_mean < 12
    # INTROSPECTION : f28d > 0.08 ET f27d > 0.45
    # TRANSITION : f12b > 0.12
    # DESCRIPTION : défaut (71.7% du corpus)
```

## 4.4 Script

`r2_topology.py` — charge les 170 JSON de R1 et produit les 7 analyses.

---

# 5. PHASE 3 — CRISTALLISATION DES COEFFICIENTS

## 5.1 Les 8 sections du JSON de sortie

| Section | Contenu | Formule |
|---------|---------|---------|
| confidence_table | Confiance par feature × taille | `conf(f,w) = max(0, min(1, 1 - CV(f,w)))` |
| disabled_below | Seuil de désactivation | Feature OFF si conf < 0.20 à toute taille |
| never_active | Features toujours OFF | 29 compteurs absolus |
| weight_table | Poids par étage | LOCAL_600 (49 features), ARC_2500 (78 features) |
| position_modifiers | Ajustement par zone P_rel | `mod(f,zone) = μ(f,zone) / μ(f,global)` |
| type_modifiers | Ajustement par type de passage | Ratio μ par type vs global |
| language_dependency | UNIVERSAL vs LANGUAGE_DEPENDENT | `|CV_fr - CV_en| < 0.20 → UNIVERSAL` |
| scoring_formula | α/β par taille | Proportion features LOCAL haute confiance |

## 5.2 Formule de scoring

```
score_FINAL = α × score_LOCAL + β × score_ARC

score_LOCAL = Σ(feature_i × weight_i × pos_mod_i × type_mod_i) / Σ(weight_i × pos_mod_i × type_mod_i)
score_ARC   = idem mais avec toutes les features (LOCAL + ARC)

weight_i = confidence(feature_i, wordCount)
pos_mod_i = position_modifier(feature_i, P_rel)  [si feature non-STABLE]
type_mod_i = type_modifier(feature_i, passage_type)

α(taille) ≈ 0.43 pour taille ≥ 150 mots
β(taille) ≈ 0.57 pour taille ≥ 150 mots
```

## 5.3 Backtest

Scorer les 181 œuvres avec les coefficients et vérifier :
- Les auteurs de référence sont au-dessus de la médiane
- Le classement est cohérent avec l'intuition littéraire

## 5.4 Script

`r3_coefficients.py` — charge R1 + R2 et produit le JSON de coefficients.

## 5.5 Sortie Phase 3

| Fichier | Taille |
|---------|--------|
| `OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json` | 105 KB |
| `OMEGA_BACKTEST_R3.json` | 55 KB |
| `OMEGA_UNPROVEN_RESOLVED.json` | 4 KB |

---

# 6. PHASE 4 — IMPLÉMENTATION DU SCORER

Le scorer est un module TypeScript (ou autre langage) qui :
1. Charge le JSON de coefficients
2. Reçoit un texte + ses features pré-calculées
3. Interpole la confiance pour la taille du texte
4. Applique les modifiers (position, type)
5. Calcule score_LOCAL et score_ARC
6. Fusionne avec α/β
7. Retourne le score composite + confiance + détails

Fichiers créés :
- `coefficients-loader.ts` : charge et interpole
- `passage-type-detector.ts` : détecte le type
- `quality-profiles.ts` : profils utilisateur
- `multi-stage-scorer.ts` : calcul du score
- `normalizer.ts` : normalisation 0-100

---

# 7. PHASE 5 — PORTAGE DES FEATURES

Les features F1-F38 sont initialement en Python (spaCy + regex).
Pour un usage en production, les porter dans le langage cible.

| Famille | Méthode | Nécessite spaCy ? |
|---------|---------|-------------------|
| F1 (rythme) | Split phrases par regex, compter mots | NON |
| F5 (densité verbale) | Regex sur terminaisons verbales | NON (approximatif) |
| F9 (adversatives) | Liste de mots | NON |
| F12 (tense switches) | Regex sur terminaisons temporelles | NON |
| F15 (redundancy) | Compression ratio, bigrams | NON |
| F16 (hapax/bigrams) | Comptage pur | NON |
| F17 (knife/contrast) | Liste de mots forts | NON |
| F18 (fragments) | POS tagging | OUI (spaCy) |
| F19 (entropy) | Shannon entropy | NON |
| F21 (repetition) | Anaphore/épistrophe | NON |
| F24 (contrast) | Quartiles longueur phrases | NON |
| F25 (description) | Mots sensoriels | NON |
| F26 (period) | Marqueurs subordination | NON |
| F27 (modal) | Verbes épistémiques | NON |
| F28 (SIL) | Patterns style indirect libre | NON |
| F29 (TTR) | Type-token ratio windowed | NON |
| F30 (tense) | Regex terminaisons verbales | NON |
| F33 (punctuation) | Comptage points/virgules | NON |
| F34 (paragraph) | Comptage paragraphes | NON |
| F35 (hook) | 100 premiers mots | NON |
| F36 (cliffhanger) | 100 derniers mots | NON |
| F38 (speed) | Paragraphes courts + ponctuation | NON |

Résultat : 44/49 features portables SANS spaCy. 5 nécessitent un bridge.

---

# 8. PHASE 6 — NORMALISATION

## 8.1 Principe

Les features brutes ont des échelles différentes (f1_mean ≈ 15, f24e ≈ 0.91).
Normaliser sur 0-100 en utilisant les percentiles du corpus.

## 8.2 Formule

```
P10(f, w) ≈ mean(f, w) - 1.28 × stdev(f, w)   [approximation gaussienne]
P90(f, w) ≈ mean(f, w) + 1.28 × stdev(f, w)

score_normalized(f) = clamp((value - P10) / (P90 - P10) × 100, 0, 100)
```

## 8.3 Interprétation

| Score normalisé | Signification |
|----------------|---------------|
| 0 | En dessous du P10 du corpus |
| 50 | À la médiane du corpus |
| 100 | Au-dessus du P90 du corpus |

---

# 9. FORMULES MATHÉMATIQUES COMPLÈTES

## 9.1 Coefficient de Variation

```
CV(f, w) = σ(f, w) / μ(f, w)
```

## 9.2 Confiance

```
confidence(f, w) = max(0, min(1, 1 - CV(f, w)))
```

## 9.3 Classification

```
Si window_opt(f) ≤ 1500  → LOCAL
Si 1500 < window_opt(f) ≤ 10000 → ARC
Si window_opt(f) > 10000 → MACRO
```

## 9.4 Position modifier

```
pos_mod(f, zone) = μ(f, zone) / μ(f, global)
```
Appliqué seulement aux features non-STABLE (trend ≠ STABLE dans le heatmap).

## 9.5 Type modifier

```
type_mod(f, type) = μ(f, type) / μ(f, global)
```
Dérivé des profils moyens par type de passage.

## 9.6 Scoring composite

```
score_LOCAL = Σᵢ(fᵢ × confᵢ × pos_modᵢ × type_modᵢ) / Σᵢ(confᵢ × pos_modᵢ × type_modᵢ)
score_ARC = idem (features LOCAL + ARC)
score_FINAL = α × score_LOCAL + β × score_ARC
```

## 9.7 α/β

```
α(w) = n_local_high_conf(w) / n_total_high_conf(w)
β(w) = 1 - α(w)
high_conf = confidence ≥ 0.80
```

## 9.8 Normalisation

```
score_100 = clamp((value - P10) / (P90 - P10) × 100, 0, 100)
P10 ≈ μ - 1.28σ
P90 ≈ μ + 1.28σ
```

---

# 10. ADAPTATION POUR UN NOUVEAU DOMAINE

## 10.1 Scénarios TV/Film

Pour adapter ce pipeline aux scénarios de séries ou de films :

| Étape | Adaptation | Effort |
|-------|-----------|--------|
| Phase 0 | Remplacer le corpus littéraire par des scénarios (.fountain/.fdx) | Nouveau corpus ~100 scénarios |
| Phase 0 | Adapter le parser : actes au lieu de chapitres, scènes au lieu de paragraphes | Nouveau extract_protocol |
| Phase 0 | Adapter les data gates : seuils différents (scénarios plus courts) | GATE_MIN_WORDS ≈ 2000 |
| Phase 1 | Fenêtres adaptées : [10, 50, 100, 300, 500, 1000, 2000, 5000] | Scènes plus courtes |
| Phase 1 | Features adaptées : DIALOGUE dominant (60%+), pas 1% | Seuils de classification différents |
| Phase 2 | Topologie : structure en actes (3 ou 5), pas en chapitres | P_rel par acte |
| Phase 2 | Hooks/cliffhangers : par scène, pas par chapitre | Unité de coupure = scène |
| Phase 3 | Nouveaux coefficients calculés sur le corpus scénario | Refaire R3 entièrement |
| Phases 4-6 | Scorer identique (architecture réutilisable) | Charger le nouveau JSON |

## 10.2 Ce qui est RÉUTILISABLE tel quel

| Composant | Réutilisable ? |
|-----------|---------------|
| Architecture 2 étages (LOCAL + ARC) | ✅ OUI |
| Formule de confiance (1 - CV) | ✅ OUI |
| Formule de scoring (α × LOCAL + β × ARC) | ✅ OUI |
| Normalisation P10/P90 | ✅ OUI |
| Scorer TypeScript | ✅ OUI (charger un autre JSON) |
| Features F24-F38 | ⚠️ PARTIELLEMENT (F24 contrast, F29 TTR, F33 punctuation = universels ; F25 description = à adapter) |
| Features F1 rythme | ✅ OUI |
| Détecteur de type | ❌ NON (à recalibrer sur le nouveau domaine) |
| Baselines / coefficients | ❌ NON (spécifiques au corpus) |

## 10.3 Nouvelles features potentielles pour les scénarios

| Feature | Ce qu'elle mesure | Pertinence |
|---------|-------------------|-----------|
| F_dialogue_density | Ratio répliques / description | HAUTE |
| F_subtext_score | Écart entre ce qui est dit et ce qui est signifié | HAUTE |
| F_scene_transition | Contraste entre scènes consécutives | MOYENNE |
| F_character_balance | Équilibre du temps de parole entre personnages | MOYENNE |
| F_page_minute_ratio | 1 page ≈ 1 minute (convention scénario) | HAUTE |
| F_visual_instruction | Densité des didascalies visuelles | MOYENNE |

## 10.4 Protocole complet pour un nouveau domaine

```
1. Constituer un corpus de 50-200 œuvres de référence dans le domaine
2. Adapter le parser (chapitres → actes/scènes)
3. Ajuster les data gates (tailles minimales)
4. Lancer Phase 1 (mesure multi-fenêtre) → cv_matrix
5. Lancer Phase 2 (topologie) → 7 analyses
6. Lancer Phase 3 (coefficients) → JSON
7. Charger le JSON dans le scorer existant
8. Calibrer les profils de qualité pour le domaine
9. Bench + validation
```

---

# ANNEXE — SCRIPTS ET COMMANDES

## Environnement

```bash
# Python 3.11 avec spaCy
cd omega-autopsie
python -m venv .venv311
.venv311/Scripts/pip install spacy
.venv311/Scripts/python -m spacy download fr_core_news_md
.venv311/Scripts/python -m spacy download en_core_web_md
.venv311/Scripts/python -m spacy download es_core_news_md
```

## Lancement

```bash
# Phase 0 : Analyse complète du corpus
.venv311/Scripts/python full_work_analyzer_v5.py

# Phase 1 : Mesure multi-fenêtre
.venv311/Scripts/python r1_multiwindow.py

# Phase 2 : Topologie narrative
.venv311/Scripts/python r2_topology.py

# Phase 3 : Coefficients
.venv311/Scripts/python r3_coefficients.py
```

## Vérification

```bash
# Vérifier que les features sont cohérentes
.venv311/Scripts/python -c "
import json
c = json.load(open('results_r3/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json'))
print(f'Features: {len(c[\"confidence_table\"])}')
print(f'Never active: {len(c[\"never_active_features\"])}')
print(f'LOCAL_600: {len(c[\"weight_table\"][\"LOCAL_600\"])}')
print(f'ARC_2500: {len(c[\"weight_table\"][\"ARC_2500\"])}')
"
```

---

*Protocole v1.0 — 2026-03-20*
*Standard NASA-Grade L4 / DO-178C Level A*
*Reproductible pour tout domaine textuel*
