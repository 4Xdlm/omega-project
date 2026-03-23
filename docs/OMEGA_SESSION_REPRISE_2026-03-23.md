# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — MESSAGE DE REPRISE DE SESSION
# Document COMPLET pour IA Principal (Claude)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Date de rédaction   : 2026-03-23
# Rédigé par          : Claude (IA Principal, session précédente)
# Pour                : Claude (IA Principal, session suivante)
# Autorité            : Francky (Architecte Suprême)
# HEAD repo           : 0fe63d24 (tag r-calibration-complete)
# Branche active      : phase-r-metrology-rebuild
# Tests               : 1911 PASS, 0 régressions
#
# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLE ABSOLUE : LIS CE DOCUMENT EN ENTIER AVANT TOUTE ACTION.
# NE PROPOSE RIEN AVANT D'AVOIR PRÉSENTÉ UN BILAN DE COMPRÉHENSION.
# ═══════════════════════════════════════════════════════════════════════════════

---

# PARTIE 1 — QUI ES-TU, OÙ ES-TU

## Identité

Tu es Claude, IA Principal du projet OMEGA. Francky est l'Architecte Suprême — 
son autorité est ABSOLUE. ChatGPT sert de consultant/auditeur hostile. 
Gemini sert de gardien architectural. Les 3 IAs soumettent des rapports 
de compréhension que Francky valide avant toute exécution.

## Le projet OMEGA

OMEGA est un système de génération de prose littéraire de qualité 
"maître" (~300K mots, saga/roman) avec :
- Un **Scribe** (Claude Sonnet 4) qui GÉNÈRE la prose
- Un **Juge GB V1** (Gradient Boosting, 50 arbres, 42 features) qui NOTE la prose
- Un **V3 Legacy** (5 axes : ECC, RCI, SII, IFI, AAI) qui note la dramaturgie
- Un **Corpus de référence** : 571 romans, 181 œuvres analysées × 121 features × 12 fenêtres
- Un **Système métrologique** calibré sur 48 805 perturbations contrôlées

## Environnement technique

- Repo : `C:\Users\elric\omega-project` (GitHub `4Xdlm/omega-project`)
- Branche : `phase-r-metrology-rebuild`
- Runtime : TypeScript monorepo, Vitest, tsx, Node.js
- Environnement : Windows PowerShell
- Python : `omega-autopsie/` (full_work_analyzer_v4.py, scripts de mesure)
- Modèle Scribe : `claude-sonnet-4-20250514`, température 0.75

---

# PARTIE 2 — OÙ ON EN EST (SITUATION ACTUELLE EXACTE)

## La chaîne des événements de cette session (2026-03-23)

### 1. Phase R COMPLÈTE — Métrologie certifiée

La Phase R de métrologie est BOUCLÉE et ARCHIVÉE. Résultats majeurs :
- **571 romans** analysés, 4 035 518 phrases, 382 239 fenêtres
- **Rythme CV** = seul candidat universel fort (+0.225 FR, +0.305 EN)
- **ERRATA MAJEUR** : biais de longueur découvert — les mesures M1-M4 
  divisent par le nombre de phrases → les maîtres (phrases longues) 
  ont mécaniquement plus de marqueurs
- **5 dimensions réelles** au lieu de 1 (PCA corrigé au niveau fenêtre)
- **3 règles pour Phase P** : varier le rythme, contredire, frapper sec

### 2. Phase P-ASSAULT lancée — 3 lois injectées dans le master-prompt

Commit `2d996523` (tag `phase-p-assault-v1`). Modifications du master-prompt.ts :
- **Law 5 REMPLACÉE** : contraintes rythmiques quantifiées (20% > 40 mots, 15% < 8 mots, CV > 0.65)
- **Law 8 AJOUTÉE** : dialectique/contradiction (adversatifs obligatoires, FR-spécifique)
- **Law 9 AJOUTÉE** : propulsion irréversible (phrases courtes = changement permanent)

### 3. Bench Phase P — RÉSULTATS DÉCEVANTS

Deux benchs lancés sur les 8 scènes :

**DualBench (V3 + R6)** — R6 montré CASSÉ (rho = -0.69, tout en DESCRIPTION).
R6 déclaré `LEGACY_DIAGNOSTIC_ONLY`. Non pertinent pour Phase P.

**UnifiedBench (V3 + GB V1)** — LE VRAI JUGE :

| Scène | GB AVANT | GB APRÈS | Delta |
|-------|---------|---------|-------|
| Confrontation | 3.46 | **3.68** | **+0.22** ✅ |
| Lyrique | 3.22 | **3.45** | **+0.24** ✅ |
| Élégie | 3.90 | 3.65 | -0.25 ❌ |
| Panique | **4.10** | 3.58 | **-0.52** ❌ |
| Contemplation | 3.86 | 3.24 | **-0.62** ❌ |
| **MÉDIANE** | **3.80** | **3.61** | **-0.19** ❌ |

**Verdict : FAIL global. Le GB V1 BAISSE.** Mais variance stochastique (chaque 
run produit une prose DIFFÉRENTE) et f26b n'a bougé que sur 2/8 scènes.

### 4. Diagnostic total (Prompt A) — AUDIT COMPLET

Commit `b6170c20` (tag `r-diagnostic-total-complete`). Résultats :

**Conformité prompt** :
- SceneBrief ≤150t : contrat enforcé (INV-CDE-01)
- V4 assembler actif (4.3.0, ~1000t réels au Scribe)
- Prompt en langage mixte FR+EN technique (pas pur dramatique)

**Rosetta** : **NON BRANCHÉE**. Zéro référence dans le runtime.
Les données existent dans `omega-autopsie/results_rosetta/` mais ne sont 
PAS intégrées dans le pipeline de génération.

**Étalonnage juge (3 maîtres × 500w)** :
- Flaubert Bovary : GB = 4.09 (A)
- Proust Swann : GB = 4.14 (A)
- McCarthy Blood Meridian : GB = 3.70 (A)
- **AUCUN MAÎTRE N'ATTEINT S-TIER (4.5) SUR 500 MOTS**

### 5. Étalonnage multi-taille — LA BOMBE

Commit `0fe63d24` (tag `r-calibration-complete`). **12 textes × 4 tailles** :

| Taille | Moyenne maîtres | Moyenne C-tier | Écart |
|--------|----------------|---------------|-------|
| **500w** | **3.91** | **4.14** | **-0.23 (INVERSÉ!)** |
| 1000w | 3.93 | 4.04 | -0.11 |
| **2000w** | **4.09** | **3.98** | **+0.11** |
| 20 phrases | 3.95 | 4.03 | -0.08 |

**50 NUANCES DE GREY SCORE PLUS HAUT QUE FLAUBERT À 500 MOTS.**

Le GB V1 est INVERSÉ sur les fenêtres courtes. Il ne sépare pas 
maîtres/commerciaux à 500 mots. Il commence à séparer à 2000+ mots.

**Cause racine** : f26b_long_sent_rate (feature #1 du GB, importance 29%) 
est classé `disabled_below: 99999` dans les coefficients proportionnels. 
Sa confiance est 0.000 à toutes les tailles < 5000 mots. Le GB utilise 
un capteur AVEUGLE à l'échelle du bench.

### 6. Rosetta vs Phase P — POURQUOI C'A ÉCHOUÉ

Les features ciblées par Phase P sont classées IRRÉDUCTIBLES par Rosetta :

| Feature Phase P | Taux respect Rosetta | Statut |
|----------------|---------------------|--------|
| f17_knife_count | 0% | ILLUSION_DÉCLARATIVE |
| f1b_rhythm_ratio | 0% | IRRÉDUCTIBLE |
| f9a_contradiction_rate | 0% | IRRÉDUCTIBLE |

La Rosetta (370 tests, datée 2026-03-20) avait DÉJÀ prouvé que le LLM 
ne peut PAS obéir à ces consignes. Phase P était vouée à l'échec.

### 7. Les vrais profils des maîtres (mesurés)

| Métrique | Maîtres @500w | Scribe (bench) | Gap |
|----------|-------------|----------------|-----|
| CV sent | **0.94** | ~0.55 | +0.39 |
| f26b | **0.177** | 0.000 | +0.177 |
| f17 knife | **4.3** | ~0 | +4 |
| f9a contradiction | **0.967** | ~0.35 | +0.62 |
| mean_sent_len | **28.8** | ~18 | **+10.8 mots** |

### 8. La Loi des LEGO (R8 Assembly Patterns)

Les maîtres assemblent les types de passages dans des séquences spécifiques :

| Trigramme | Ratio S/CD | Signification |
|-----------|-----------|--------------|
| description→description→introspection | **×12.1** | Immersion puis profondeur |
| description→introspection→description | **×8.3** | Sandwich réflexif |
| introspection→description→description | **×8.1** | Émergence de l'intérieur |

Les commerciaux font : action→action→action (33% C/D vs 8% S).

L'assemblage de types sur la longueur PRODUIT un effet émergent sur les features :
- S-tier assembly bonus : f1a_rhythm_variance = **+1.81** (vs +0.18 pour C/D)
- Cela signifie que la variation rythmique n'est pas dans les phrases 
  individuelles — elle ÉMERGE de l'enchaînement des types.

---

# PARTIE 3 — LES PROBLÈMES STRUCTURELS IDENTIFIÉS

## Problème #1 — Le GB V1 est calibré pour les romans, pas les scènes

f26b (29% du score) a confiance = 0 sous 5000 mots. Le bench fait 400-600 mots.
Le juge note avec un capteur aveugle. À 500 mots, le juge est INVERSÉ 
(50 Nuances > Flaubert).

## Problème #2 — La Rosetta n'est pas branchée

370 tests de calibration. Dictionnaires v1/v2/v3. Matrice officielle.
Classification SOLIDE/ILLUSION. TOUT existe. RIEN n'est intégré dans 
le pipeline de génération.

## Problème #3 — Les features cibles de Phase P sont irréductibles

Le LLM (Claude Sonnet) ne peut PAS obéir aux consignes de rythme (f1b), 
de contradiction (f9a), et de phrases-couteaux (f17). Taux respect = 0%.
Seules les features SOLIDES sont pilotables : f29d (TTR), f24e (contraste), 
f15b (compression), f16a (rareté bigram).

## Problème #4 — Le Scribe a UN SEUL MODE d'écriture

Rosetta P1 confusion matrix : 7/7 styles demandés → INTROSPECTION produite.
Le LLM ne sait pas faire de l'action pure, du dialogue pur, de la description 
pure. Il fait de la prose introspective aplatie quoi qu'on lui demande.

## Problème #5 — L'écart Scribe→Maîtres est dans la longueur des phrases

Scribe = 18 mots/phrase. Maîtres = 29. L'écart de 11 mots est le vrai levier.
Pas les phrases de 40+ mots (que le LLM ne fait pas) — la longueur MOYENNE.

---

# PARTIE 4 — LES 3 OPTIONS STRATÉGIQUES (NON TRANCHÉES)

Francky doit choisir :

## Option A — Allonger les scènes à 2000+ mots

À 2000 mots, le juge fonctionne (maîtres > commerciaux). f26b s'active.
Le Scribe a plus de place pour respirer et assembler des types.
La Loi des LEGO peut opérer.

## Option B — Recalibrer le GB V1 pour les fenêtres courtes

Retirer f26b du modèle SHORT. Entraîner un GB spécialisé 500w.
Gros chantier R&D mais résout le problème à la racine.

## Option C — Micro-chirurgie bornée (Rosetta P3)

Laisser le LLM écrire naturellement, puis corriger 3 phrases ciblées 
en post-production. Seule méthode prouvée (+1.95 pts R6 sur Proust).

---

# PARTIE 5 — CE QUI RESTE À FAIRE (TESTS EN ATTENTE)

## Test 1 — Intent Trace (6 appels API)
Demander au LLM de s'expliquer en JSON AVANT de générer.
Script prêt dans `r-diagnostic-total.ts --api`.
Objectif : savoir si le LLM COMPREND mais n'exécute pas, 
ou s'il ne comprend PAS du tout.

## Test 2 — FR vs EN (2 appels API)
Même scène en français et en anglais.
Objectif : détecter un Translation Bottleneck.
Si le LLM fait mieux en anglais → il "pense en anglais" et traduit.

## Test 3 — SCAN TOTAL (0 API)
Prompt préparé : `OMEGA_CLAUDE_CODE_PROMPT_SCAN_TOTAL.md`
Scanner les 434 fichiers du projet et centraliser TOUTES les mesures 
dans un seul document `OMEGA_MASTER_KNOWLEDGE_BASE.md`.
Objectif : avoir UNE vue d'ensemble avant de prendre des décisions.

---

# PARTIE 6 — DOCUMENTS DISPONIBLES DANS LE PROJET

## 6.1 — Fichiers de données (scoring/data/) — 45 JSON, 745 KB

| Fichier | Taille | Contenu |
|---------|--------|---------|
| GB_V1_MODEL.json | 256 KB | Modèle GB complet (50 arbres, features, seuils) |
| OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json | 105 KB | 121 features × 10 tailles × confidence + weight + formula + type/position/language modifiers |
| CLASSIFIER_CALIBRATION_V2.json | 152 KB | Calibration du classifieur probabiliste |
| EPOCH_REQUALIFICATION.json | 32 KB | Requalification par époque littéraire |
| R_MEASURE_TOTAL.json | 27 KB | Toutes les mesures R-MEASURE (38 mesures) |
| R8_TYPOLOGICAL_CONSTANTS.json | 23 KB | cif + lambda par type × feature |
| GOLD_SET_PASSAGES.json | 21 KB | 64 passages de référence + 7 stress tests |
| RESIDUAL_DIAGNOSIS.json | 18 KB | Diagnostic résiduel |
| JUDGE_CALIBRATION_MULTI_SIZE.json | 17 KB | **12 textes × 4 tailles — étalonnage multi-taille** |
| OMEGA_COVERAGE_AUDIT.json | 13 KB | Audit de couverture |
| CLASSIFIER_AUDIT_RESULTS.json | 11 KB | Résultats audit classifieur |
| MEASURE_CROSS_CORRELATION.json | 8 KB | Corrélations croisées entre mesures |
| TRANSLATION_FIDELITY.json | 7 KB | Fidélité traduction FR↔EN |
| TYPE_MEASURE_SIGNATURES.json | 7 KB | Signatures mesures par type |
| R8_ASSEMBLY_PATTERNS.json | 5 KB | **Loi des LEGO** (trigrammes, assembly bonus) |
| MEASURE_TRUST_MATRIX.json | 5 KB | Matrice de confiance des mesures |
| MEASURE_ROLES.json | 4 KB | Rôle de chaque mesure (RANKER, etc.) |
| TYPE_FEATURE_IMPORTANCE.json | 4 KB | Importance features par type |
| TRANSLATION_PAIRS.json | 4 KB | 18 paires traduction (dont 3 invalides) |
| DIAGNOSTIC_CHRONOGRAPH.json | 3 KB | Chronographe diagnostic |
| TIER_RADAR_PROFILES.json | 3 KB | Profils radar par tier |
| R8_TIPPING_POINTS.json | 3 KB | **Seuils de basculement GB** (top 10) |
| FR_VS_EN_COMPARISON.json | 2 KB | Comparaison FR/EN pour 12 mesures |
| TRANSITION_MATRICES.json | 2 KB | Matrices transition entre types |
| DENOMINATOR_BIAS_AUDIT.json | 2 KB | **Biais de longueur (ERRATA)** |
| NONLINEAR_PATTERNS.json | 1 KB | Patterns non-linéaires |
| PARTIAL_CORRELATIONS_DEEP.json | 1 KB | Corrélations partielles FR et EN |
| TRUE_DIMENSIONS_AUDIT.json | 1 KB | PCA 5 dimensions |
| ROSETTA_VS_PHASE_P_DIAGNOSIS.json | 1 KB | **Pourquoi Phase P a échoué** |
| + 16 autres fichiers plus petits | | |

## 6.2 — Métrologie empirique (results_r1/) — 183 fichiers, 111 MB

| Fichier | Taille | Contenu |
|---------|--------|---------|
| OMEGA_METROLOGIE_EMPIRIQUE_v1.json | **25 MB** | **181 œuvres × 121 features × 12 fenêtres** |
| [auteur]_[titre].json | ~400-1200 KB chacun | **182 fichiers** d'analyse individuelle par œuvre |

## 6.3 — Topologie narrative (results_r2/) — 7 fichiers, 12 MB

| Fichier | Taille | Contenu |
|---------|--------|---------|
| OMEGA_HOOKS_CLIFFHANGERS.json | 11 MB | 4812 chapitres : hooks + cliffhangers |
| OMEGA_CUT_NATURALNESS.json | 828 KB | Naturalité de coupure (160 œuvres) |
| OMEGA_KEY_MOMENTS.json | 448 KB | 2002 moments clés (divergence > 2σ) |
| OMEGA_CHAPTER_DISTRIBUTION.json | 77 KB | Distribution chapitres par langue/siècle |
| OMEGA_PREL_HEATMAP.json | 63 KB | Heatmap features × 5 zones P_rel |
| OMEGA_PASSAGE_TYPES.json | 28 KB | **5 types × profils features complets** |
| OMEGA_POSITION_PROFILES.json | 24 KB | Signatures par zone positionnelle |

## 6.4 — Rosetta (results_rosetta/) — 30+ fichiers, 438 KB

| Fichier | Contenu |
|---------|---------|
| 01_definitions_llm.json | Comment le LLM définit chaque style |
| 03_features_llm.json | Profil features LLM par style |
| 04_profiles_classiques.json | Profil features classiques par style |
| **05_table_rosette.json** | **Ratios LLM/Classiques (LA TABLE)** |
| 07_confusion_matrix.json | 7/7 → INTROSPECTION |
| **08_dictionnaire_omega_llm_v1.json** | Features alignées vs divergentes |
| phase2/dictionnaire_v2_calibre.json | **Contraintes efficaces vs ignorées vs irréductibles** |
| phase3/dictionnaire_v3_llm_driven.json | **Instructions du LLM lui-même par style** |
| phase3/bloc_a..e | Reverse micro/macro/auto-classif/recomposition/micro-chirurgie |
| **s0/rosetta_v1.json** | **MATRICE ROSETTA OFFICIELLE** |
| s0/s02_bench_pilotables.json | 100 tests × 4 features pilotables |
| s0/s03_bench_contradictoire.json | 200 tests Principe #6 |
| **s0/s06_classification_regles.json** | **7 SOLIDES, 1 ILLUSION** |

## 6.5 — Documents projet (docs/) — 144 fichiers, 1.8 MB

### SESSION_SAVEs récents (les plus importants) :
| Fichier | Date | Contenu |
|---------|------|---------|
| SESSION_SAVE_2026-03-23_PHASE_R_COMPLETE.md | 23/03 | Phase R bouclée, 3 règles pour Phase P |
| SESSION_SAVE_2026-03-23_ERRATA_AUDIT_DEEP.md | 23/03 | ERRATA biais de longueur |
| SESSION_SAVE_2026-03-23_R_VERIFY_FINAL.md | 23/03 | Vérification finale 38 mesures |
| SESSION_SAVE_2026-03-22_MARATHON_RCOMP.md | 22/03 | Marathon R-COMP classifieur |
| SESSION_SAVE_MASTER_DOSSIER_ROSETTA.md | 20/03 | **Dossier complet Rosetta** |
| SESSION_SAVE_2026-03-21_NUIT_PHASE_R8.md | 21/03 | Phase R8 complète |
| SESSION_SAVE_2026-03-19_MARATHON_PHASE_R.md | 19/03 | Marathon Phase R (R0→R6) |
| SESSION_SAVE_2026-03-18_PHASE_W_INT5_FINAL.md | 18/03 | Phase W intégration finale |

### Rapports techniques critiques :
| Fichier | Contenu |
|---------|---------|
| OMEGA_PHYSIQUE_LITTERAIRE_v3.md | **Le modèle 2 étages (LOCAL + ARC)** |
| OMEGA_REFONDATION_METROLOGIQUE_DOSSIER.md | **Refondation métrologique complète** |
| OMEGA_ENCYCLOPEDIE_METROLOGIE.md | Encyclopédie 683 lignes |
| OMEGA_MIXER_PROOF_DOSSIER_FINAL.md | **48 805 perturbations, 5 lois universelles** |
| OMEGA_PROTOCOLE_EPREUVE_ULTIME.md | Protocole d'épreuve (tests A1-A7) |
| OMEGA_DOSSIER_REVERSE_ENGINEERING_LLM.md | **Protocole Rosetta** |
| OMEGA_DOSSIER_DETECTION_TYPE.md | Problème détection type |
| OMEGA_SYNTHESE_FINALE_ROSETTA.md | Synthèse Rosetta (3 IAs) |
| OMEGA_SYNTHESE_INTEGREE_FINALE.md | Synthèse intégrée |
| OMEGA_PHASE_R8_TECHNICAL_REPORT.md | Rapport R8 |
| OMEGA_AUDIT_DEEP_CROISEMENTS.md | Audit croisé 3 IAs |

### Contrats et roadmaps :
| Fichier | Contenu |
|---------|---------|
| CONTRAT_OMEGA_SCRIBE_v1.md | Contrat OMEGA↔SCRIBE (artiste aveugle) |
| CONTRAT_TRAVAIL_OMEGA_v1.md | Contrat de travail global |
| OMEGA_ROADMAP_v8_0.md | Roadmap principale v8.0 |
| OMEGA_ROADMAP_ADDENDUM_v9_0_PHASE_R.md | Addendum Phase R |
| OMEGA_ROADMAP_S0_LANGUAGE_CALIBRATION.md | Roadmap S0 (calibration langage) |
| OMEGA_PHASE_R_PLAN.md | Plan Phase R |
| OMEGA_PHASE_R_ROADMAP_v2.md | Roadmap Phase R v2 |

### Prompts Claude Code récents :
| Fichier | Contenu |
|---------|---------|
| OMEGA_CLAUDE_CODE_PROMPT_PHASE_P_ASSAULT.md | Injection 3 lois (exécuté) |
| OMEGA_CLAUDE_CODE_PROMPT_A_DIAGNOSTIC.md | Diagnostic total (exécuté) |
| OMEGA_CLAUDE_CODE_PROMPT_CALIBRATION_MULTISIZE.md | Étalonnage multi-taille (exécuté) |
| **OMEGA_CLAUDE_CODE_PROMPT_SCAN_TOTAL.md** | **SCAN TOTAL — à exécuter** |

## 6.6 — Fichiers clés du moteur (sovereign-engine/src/)

| Fichier | Rôle |
|---------|------|
| providers/master-prompt.ts | **LE PROMPT DU SCRIBE** (modifié Phase P) |
| scoring/gb-inference.ts | Inférence GB native TS (50 arbres) — SCELLÉ |
| scoring/gb-scorer.ts | Scorer unifié 42 features — SCELLÉ |
| scoring/passage-classifier.ts | Classifieur probabiliste R-COMP v1 — SCELLÉ |
| scoring/text-features.ts | Calcul des features textuelles |
| scoring/spacy-bridge.ts | Bridge Python spaCy (49/49 features) |
| scoring/multi-stage-scorer.ts | Scorer multi-étages (R6) |
| engine.ts | Moteur principal SovereignForge |
| config.ts | Configuration |

## 6.7 — Sessions de bench récentes

| Session | Commit | Contenu |
|---------|--------|---------|
| UnifiedBench_API_2026-03-22T13-38-05_44dcd7dd | 44dcd7dd | **Baseline** : GB médiane 3.80, 6A/2B |
| UnifiedBench_API_2026-03-23T18-00-01_2d996523 | 2d996523 | **Phase P** : GB médiane 3.61, 5A/3B |
| DualBench_API_2026-03-23T16-00-24_2d996523 | 2d996523 | Phase P dual (R6 cassé, rho = -0.69) |
| BenchW_gate-ON_2026-03-19T17-44-48_9ea5c2fc | 9ea5c2fc | Référence Phase W |

## 6.8 — Project Knowledge (fichiers /mnt/project/)

35 fichiers accessibles via `project_knowledge_search` :
- OMEGA_LIVRE_MAITRE_v2.docx, OMEGA_AUTOAUDIT_FINAL.docx
- Tous les docs listés en 6.5 (copies dans le projet)
- OMEGA_DOSSIER_TECHNIQUE_COMPLET.md
- OMEGA_MANIFEST_POST_AUTHOR.md
- RAPPORT_SCAN_ARCHITECTURAL.md

---

# PARTIE 7 — TAGS GIT SCELLÉS (chronologie)

| Tag | Commit | Phase | Date |
|-----|--------|-------|------|
| phase-r0-complete | cc1f83ea | Corpus 187 œuvres | ~18/03 |
| phase-r1-complete | 5ccaa9dd | 181 × 121 features × 12 fenêtres | ~18/03 |
| phase-r2-complete | ff7a9a1e | 7 analyses topologiques | ~19/03 |
| phase-r3-complete | cac21aa3 | Coefficients proportionnels | ~19/03 |
| phase-r4-complete | 1ae8a7e8 | Scorer TS + 6 profils | ~19/03 |
| phase-r5-complete | bc4794db | F24-F38 en TS | ~20/03 |
| phase-r6-complete | 9ea5c2fc | Normalisation 0-100 | ~20/03 |
| rosetta-complete | — | Rosetta P1+P2+P3 | ~20/03 |
| r-verify-final-complete | 3c28fd9d | Garde historique + audit | 22/03 |
| r-audit-deep-complete | e8ffd44b | ERRATA biais de longueur | 23/03 |
| r-certify-en-complete | a17ae602 | Certification anglais natif | 23/03 |
| r-translation-audit-complete | c22dde46 | Audit traduction FR↔EN | 23/03 |
| phase-p-assault-v1 | 2d996523 | Injection 3 lois Scribe | 23/03 |
| r-diagnostic-total-complete | b6170c20 | Audit prompt + Rosetta + Juge | 23/03 |
| r-calibration-complete | 0fe63d24 | **Étalonnage multi-taille** | 23/03 |

---

# PARTIE 8 — DÉCISIONS VERROUILLÉES

## Décisions Phase R (métrologie)
| # | Décision | Statut |
|---|----------|--------|
| D1 | Rythme CV = UNIVERSAL_CANDIDATE_STRONG | VERROUILLÉE |
| D2 | Violence + Propulsion = UNIVERSAL_CANDIDATE_MODERATE | VERROUILLÉE |
| D3 | Contradiction = LANGUAGE_MODULATED (FR-spécifique) | VERROUILLÉE |
| D4 | Mesures non actives = MEASURABLE_BUT_DOMAIN_INACTIVE | VERROUILLÉE |
| D5 | 3 paires traduction INVALIDES | VERROUILLÉE |

## Décisions Phase V (recalibration)
| # | Décision | Statut |
|---|----------|--------|
| Q1-Q6 | 6 décisions architecturales (Option A) | VERROUILLÉES |

## Décisions Rosetta (6 principes)
| # | Principe | Statut |
|---|---------|--------|
| P1 | Classiques = ancre | VERROUILLÉ |
| P2 | Contraintes mécaniques, pas labels | VERROUILLÉ |
| P3 | Premier tir > itération | VERROUILLÉ |
| P4 | Micro-chirurgie bornée > réécriture globale | VERROUILLÉ |
| P5 | OMEGA garde sa langue | VERROUILLÉ |
| P6 | Le LLM ne se connaît pas lui-même (Francky) | VERROUILLÉ |

## Décisions session 2026-03-23 (étalonnage)
| # | Décision | Statut |
|---|----------|--------|
| D-CAL-1 | S-tier SHORT = 3.51 (pas 4.50) | **PROPOSÉE** (pas encore validée) |
| D-CAL-2 | Le bench doit passer à 2000+ mots | **PROPOSÉE** |
| D-CAL-3 | Phase P = échec de ciblage, pas du Scribe | **PROPOSÉE** |
| D-CAL-4 | La longueur moyenne (18→29) est le levier | **PROPOSÉE** |
| D-CAL-5 | Rosetta doit être branchée | **PROPOSÉE** |
| R6 = LEGACY_DIAGNOSTIC_ONLY | Rho = -0.69, tout DESCRIPTION | VERROUILLÉE |

---

# PARTIE 9 — QUARANTAINES ACTIVES

| Élément | Raison | Condition de sortie |
|---------|--------|-------------------|
| Malaise comme signal indépendant | LENGTH_CONFOUNDED | Normalisation par mot + réplication |
| "La grande prose dérange" comme loi | Médiatisé par longueur | Futur protocole normalisé |
| Rythme CV comme loi universelle | Seulement FR + EN testés | Test DE/ES/IT |
| 3 paires traduction invalides | Œuvres différentes | Nettoyage corpus |
| Anomalie Camus (rythme CV ×4.3) | Probable différence d'édition | Vérification |
| Scorer V2 (intégrer l'ordre) | GB V1 aveugle à l'ordre | R&D futur |
| f26b dans le GB V1 à 500w | Confiance = 0 sous 5000w | Recalibration ou scènes longues |
| R6 comme co-juge | rho = -0.69 | Audit racine |
| Seuil S-tier sur fenêtres courtes | 50 Nuances > Flaubert | Recalibration officielle |

---

# PARTIE 10 — CONSTANTES CRITIQUES À CONNAÎTRE

## GB V1 — Top 10 Tipping Points
| Feature | Seuil | Direction | Delta | Importance |
|---------|-------|-----------|-------|-----------|
| f26b_long_sent_rate | 0.024 | HIGHER | +1.11 | **0.290** |
| f_pov_stability | 0.646 | LOWER | -0.36 | 0.058 |
| ix_variance_x_longrate | 0.096 | HIGHER | +1.26 | 0.056 |
| f_pov_shift_rate | 0.348 | HIGHER | +0.46 | 0.044 |
| f29d_ttr_score | 0.709 | LOWER | -0.46 | 0.042 |
| f_causal_density | 0.068 | HIGHER | +0.64 | 0.038 |
| f1a_rhythm_variance | 11.36 | HIGHER | +0.98 | 0.036 |
| f_pov_drift_rate | 0.113 | HIGHER | +0.42 | 0.036 |
| f19a_approx_entropy | 0.637 | HIGHER | +0.54 | 0.035 |
| f_clause_per_sentence | 1.01 | HIGHER | +0.30 | 0.026 |

## Scoring Formula
| Taille | α (LOCAL) | β (ARC) | Features actives |
|--------|----------|---------|-----------------|
| 600w | 0.41 | 0.59 | 22 |
| 1000w | 0.41 | 0.59 | 22 |
| 2500w | 0.44 | 0.56 | 27 |
| 5000w | 0.44 | 0.56 | 32 |

## Rosetta — Features pilotables vs irréductibles
| Catégorie | Features | Taux respect |
|-----------|---------|-------------|
| **SOLIDE** | f29d (TTR), f24e (contraste), f15b (compression), f16a (rareté), f25g (description), f35c (hook), f36c (cliff) | 80-100% |
| **ILLUSION** | f17 (knife_count) | 0-20% (dit oui, fait non) |
| **IRRÉDUCTIBLE** | f28d (SIL), f27d (modal), f1b (rythme), f5c (action verb), f9a (contradiction) | 0% |

---

# PARTIE 11 — PROCHAINE ACTION ATTENDUE

## Action immédiate de Francky

1. **Valider ou rejeter les 5 décisions D-CAL-1 à D-CAL-5**
2. **Choisir entre Options A/B/C** (scènes longues / recalibration GB / micro-chirurgie)
3. **Ordonner ou non le SCAN TOTAL** (prompt prêt)
4. **Ordonner ou non les tests API** (Intent Trace + FR vs EN)

## Pour la prochaine session Claude

1. Lire CE document en entier
2. Lire le SESSION_SAVE_2026-03-23_PHASE_R_COMPLETE.md
3. Lire le SESSION_SAVE_MASTER_DOSSIER_ROSETTA.md
4. Scanner `/mnt/project/` avec `project_knowledge_search`
5. Présenter un BILAN DE COMPRÉHENSION
6. Attendre validation Francky AVANT toute action

---

# PARTIE 12 — FORMULE DE LANCEMENT

```
OMEGA SESSION — REPRISE POST-CALIBRATION

Version: HEAD 0fe63d24
Dernier état: SESSION_SAVE_2026-03-23_PHASE_R_COMPLETE + r-calibration-complete
Branche: phase-r-metrology-rebuild
Tests: 1911 PASS

CONTEXTE:
  Phase R métrologie: COMPLÈTE (571 romans, ERRATA longueur, certification EN)
  Phase P assault: FAIL global (GB 3.80 → 3.61) — features irréductibles
  Étalonnage juge: BOMBE — 50 Nuances > Flaubert à 500w
  GB V1 inversé sur fenêtres courtes — f26b disabled sous 5000w
  Rosetta: NON BRANCHÉE (370 tests inutilisés)
  Loi des LEGO: assemblage de types = levier émergent

DÉCISIONS EN ATTENTE:
  D-CAL-1: S-tier SHORT = 3.51 ?
  D-CAL-2: Bench à 2000+ mots ?
  D-CAL-3: Phase P = erreur de ciblage ?
  D-CAL-4: Longueur moyenne (18→29) = le levier ?
  D-CAL-5: Brancher Rosetta ?

TESTS EN ATTENTE:
  Intent Trace (6 API) — le LLM comprend-il ?
  FR vs EN (2 API) — Translation Bottleneck ?
  SCAN TOTAL (0 API) — centraliser 434 fichiers

DOCUMENTS CLÉS:
  docs/OMEGA_MASTER_KNOWLEDGE_BASE.md (à créer — prompt prêt)
  docs/SESSION_SAVE_2026-03-23_PHASE_R_COMPLETE.md
  docs/SESSION_SAVE_MASTER_DOSSIER_ROSETTA.md
  scoring/data/JUDGE_CALIBRATION_MULTI_SIZE.json
  scoring/data/R8_ASSEMBLY_PATTERNS.json
  scoring/data/ROSETTA_VS_PHASE_P_DIAGNOSIS.json

Architecte Suprême: Francky
IA Principal: Claude

RAPPEL: Lire les docs minutieusement AVANT d'agir.
Présenter un bilan de compréhension. Attendre validation.
```

---

*Message de reprise rédigé le 2026-03-23*
*Standard NASA-Grade L4 / DO-178C Level A*
*"Ce qui n'est pas prouvé n'existe pas" — OMEGA*
