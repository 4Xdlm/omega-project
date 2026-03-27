# OMEGA — ARCHEOLOGIE AUDIT BLACK-BOX CLAUDE SONNET
**Date** : 2026-03-27
**Mode** : Consolidation avant execution

---

## 1. CE QUI EXISTE DEJA (et couvre une GRANDE partie du protocole)

### 1.1 Rosetta — Audit de pilotabilite (370 tests calibres)

**Fichier** : `results_rosetta/s0/rosetta_claude-sonnet-4-20250514_v1.json`
**Modele** : claude-sonnet-4-20250514 (EXACT modele utilise par le Scribe)
**Couverture** : 8 features testees avec 3 niveaux (declared/validated/optimized)

**RESULTATS DEJA CONNUS :**

| Feature | Pilotabilite | Categorie | Taux respect |
|---------|-------------|-----------|-------------|
| f24e_contrast_score | 1.0 | SOLIDE | 100% |
| f15b_redundancy | 1.0 | SOLIDE | 100% |
| f16a_bigram_rarity | 1.0 | SOLIDE | 100% |
| f36c_cliff_score | 0.0 | SOLIDE | 100% (mais pilotabilite=0 car toujours fait) |
| f35c_hook_score | 0.0 | SOLIDE | 90% |
| f29d_ttr_score | 0.8 | SOLIDE | 80% |
| f25g_description_score | 0.0 | SOLIDE | 80% |
| **f17_knife_count** | **0.0** | **ILLUSION_DECLARATIVE** | **20%** |

**LOI DEJA ETABLIE** : f17 (phrases-couteau) est une ILLUSION DECLARATIVE — Claude pretend les ajouter, ne le fait pas.

### 1.2 Matrice de confusion (7 modes)

**Fichier** : `results_rosetta/07_confusion_matrix.json`
**RESULTAT EXPLOSIF** :

| Mode demande | Mode produit | Verdict |
|-------------|-------------|---------|
| DESCRIPTION | INTROSPECTION | SUBSTITUTION |
| ACTION | INTROSPECTION | SUBSTITUTION |
| INTROSPECTION | INTROSPECTION | MATCH |
| CONTEMPLATION | INTROSPECTION | SUBSTITUTION |
| LYRIQUE | INTROSPECTION | SUBSTITUTION |
| DIALOGUE | INTROSPECTION | SUBSTITUTION |
| TRANSITION | INTROSPECTION | SUBSTITUTION |

**LOI DEJA ETABLIE** : Claude a un **puits gravitationnel vers l'INTROSPECTION**. Quel que soit le mode demande, il produit de l'introspection. Seul le mode INTROSPECTION est un MATCH.

### 1.3 Benchmarks contradictoires

**Fichier** : `results_rosetta/s0/s03_bench_contradictoire.json`
**Couverture** : Tests d'instructions contradictoires

### 1.4 Micro-chirurgie

**Fichier** : `results_rosetta/s0/s05_bench_micro_chirurgie.json`
**RESULTAT** : taux_succes = 0, delta_r6 = +0. La micro-chirurgie phrase par phrase ne fonctionne PAS.

### 1.5 Cross-interrogation

**Fichier** : `results_rosetta/06_interrogation_croisee.json`
**Couverture** : Auto-evaluation de Claude vs comportement reel

### 1.6 Dictionnaires de conversion

| Fichier | Version | Contenu |
|---------|---------|---------|
| phase2/dictionnaire_v2_calibre.json | V2 | Instructions calibrees par feature |
| phase3/dictionnaire_v3_llm_driven.json | V3 | Instructions optimisees par LLM |
| 08_dictionnaire_omega_llm_v1.json | V1 | Mapping instruction → impact feature |

### 1.7 Textes generes mesures

| Source | Textes | Features mesurees |
|--------|--------|-------------------|
| BESTOF3 (5 briques) | 5 winners + 8 candidats | Scores 5 axes + features |
| TELEMETRY5 (5 briques) | 20 candidats Duel | 8 features par candidat |
| VOLUME_TEST (6 runs) | 6 textes | Scores 5 axes |

### 1.8 Prompts et modes du Scribe

| Fichier | Contenu |
|---------|---------|
| prompt-assembler-v4.ts | Prompt 12 sections, ~800 tokens |
| draft-modes.ts | 3 modes Duel (tranchant, sensoriel, experimental) |
| golden-exemplars.ts | 2 exemplars SAGA-ready dans le prompt |
| constraint-compiler.ts | Emotion → physique conversion |

---

## 2. CE QUI MANQUE (et necessite de NOUVELLES mesures)

| Bloc | Couvert par l'existant | Manquant |
|------|----------------------|----------|
| BLOC 1 — Baseline | Partiellement (5 scenes x 1-3 runs) | Besoin de 10 types de scenes x 3 runs |
| BLOC 2 — Instruction Matrix | Rosetta couvre 8 features | Besoin des 20 familles x 4 modes |
| BLOC 3 — Gradients | Volume test = 1 gradient (longueur) | Besoin de 13 gradients x 5 niveaux |
| BLOC 4 — Attracteurs | Confusion matrix donne le puits | Besoin de tests extremes explicites |
| BLOC 5 — Conflits | s03_bench_contradictoire existe | Besoin de quantifier les 10 paires |
| BLOC 6 — Stabilite | 3 runs par brick dans BESTOF3 | Besoin de 10+ runs sur prompts critiques |
| BLOC 7 — Hierarchie | Pilotabilite Rosetta + confusion | Synthese a faire |
| BLOC 8 — Contrat | Rien | Synthese de tout |

## 3. ESTIMATION BUDGET API

### Approche MINIMALE realiste (consolidation + delta)

| Bloc | Runs API | Calcul |
|------|----------|--------|
| BLOC 1 — Baseline extended | 30 | 10 scenes x 3 runs |
| BLOC 2 — Instruction (delta Rosetta) | 60 | 5 familles critiques x 4 modes x 3 runs |
| BLOC 3 — Gradients (3 axes prioritaires) | 45 | 3 axes x 5 niveaux x 3 runs |
| BLOC 4 — Attracteurs extremes | 18 | 6 prompts extremes x 3 runs |
| BLOC 5 — Conflits top 5 | 15 | 5 paires x 3 runs |
| BLOC 6 — Stabilite | 20 | 2 prompts x 10 runs |
| **TOTAL** | **~188 runs** | ~$15-25 en API |

Chaque run = 1 appel Scribe (~4K tokens) + 1 eval features = **~188 appels API Scribe**.

### Approche COMPLETE (protocole integral)

~800-1200 API calls. Trop pour une session. A faire en phases.

## 4. PLAN D'EXECUTION RECOMMANDE

**Phase A** (cette session, ~30 API) : Consolider Rosetta + BESTOF3 + telemetrie dans le format du contrat. Produire BLOCS 7 + 8 preliminaires.

**Phase B** (cette session, ~50 API) : BLOC 1 baseline (10 scenes x 3 runs = 30 runs) + BLOC 6 stabilite (2 prompts x 10 runs = 20 runs).

**Phase C** (session suivante, ~100 API) : BLOC 3 gradients sur 3 axes prioritaires (mean_sent_len, semicolon density, dialogue ratio).

**Phase D** (session suivante) : BLOC 2 instruction matrix + BLOC 5 conflits.

## 5. CE QUI EST REJETE / INSUFFISANT

| Artefact | Raison |
|----------|--------|
| Rosetta pilotabilite (8 features) | Ne couvre que 8/40 features. Les 32 autres sont inconnues. |
| Micro-chirurgie (taux 0%) | Confirme echec mais ne dit pas pourquoi. |
| Cross-model benchmark | Utile mais pas le meme protocole. |
| MASTER_SCALE_LADDER.json | Interpole, rejete comme source de verite (cf audit brut). |
