# ═══════════════════════════════════════════════════════════════════════════════
#
#   OMEGA — ROADMAP UNIFIÉE ART + GENIUS
#   Plan de travail complet avec dépendances et chronologie
#
#   Date:          2026-02-17
#   Version:       1.0
#   Spec GENIUS:   v1.2.0 (scellée)
#   Roadmap ART:   v1.0 (Sprints 9→20)
#   Standard:      NASA-Grade L4
#
# ═══════════════════════════════════════════════════════════════════════════════

STATUS: PRÊT À EXÉCUTER
TESTS ACTUELS: 288/288 PASS (pre-ART baseline)

---

# RÈGLE CARDINALE — ORDRE D'EXÉCUTION

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   Les sprints ART construisent les BRIQUES (axes M, modules).                 ║
║   Les sprints GENIUS construisent la COUCHE SUPÉRIEURE (G, prompt, C_llm).    ║
║                                                                               ║
║   GENIUS-01 (prompt) est INDÉPENDANT → démarre immédiatement.                ║
║   GENIUS-02 (metrics) DÉPEND de ART 11 + ART 13.                             ║
║   GENIUS-03 (calibrator) DÉPEND de GENIUS-01.                                ║
║   GENIUS-04 (intégration) DÉPEND de TOUT.                                    ║
║                                                                               ║
║   On suit les sprints dans l'ordre. Aucun saut.                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

# PHASE 1 — FONDATIONS (Semaines 1-2)

## Sprint GENIUS-00 : SPEC ONLY ← MAINTENANT

```
Status : COMPLET — En attente de commit
Effort : 0 (déjà fait)
```

| Commit | Description | Status |
|--------|-------------|--------|
| G00.1 | GENIUS_ENGINE_SPEC.md v1.2.0 dans le repo | ⬜ TODO |
| G00.2 | GENIUS_SSOT.json v1.2.0 dans le repo | ⬜ TODO |
| G00.3 | GENIUS_PLAN_FINAL.md dans le repo | ⬜ TODO |
| G00.4 | GENIUS_ROADMAP.md (ce document) dans le repo | ⬜ TODO |
| G00.5 | Tag `genius-00-spec` | ⬜ TODO |

Gate : zéro placeholder, 30 invariants définis, consensus 4 IA.

---

## Sprint GENIUS-01 : PROMPT CONTRACT (fer de lance n°1)

```
Dépendances : AUCUNE
Effort estimé : 1-2 sessions
Parallèle avec : ART Sprint 9 (Semantic Cortex)
```

| Commit | Description | Fichier(s) | Status |
|--------|-------------|------------|--------|
| G01.1 | Interface GeniusContractInput/Output + types | `genius-contract-compiler.ts` | ⬜ TODO |
| G01.2 | Enum NarrativeShape (5 shapes) + mode | `genius-contract-compiler.ts` | ⬜ TODO |
| G01.3 | Anti-pattern blacklist v1 (patterns + regex) | `anti-pattern-blacklist.json` | ⬜ TODO |
| G01.4 | Compilateur sections [0]-[7] + hiérarchie | `genius-contract-compiler.ts` | ⬜ TODO |
| G01.5 | Mode continuation : override rhythm/lexique par fingerprint | `genius-contract-compiler.ts` | ⬜ TODO |
| G01.6 | Escape hatch NONCOMPLIANCE injecté dans prompt | `genius-contract-compiler.ts` | ⬜ TODO |
| G01.7 | 10 exemplars calibrés v1 | `exemplars/` | ⬜ TODO |
| G01.8 | Tests unitaires (12 tests) | `__tests__/genius-contract.test.ts` | ⬜ TODO |
| G01.9 | Intégration avec buildSovereignPrompt existant | `prompt-builder.ts` (modifié) | ⬜ TODO |
| G01.10 | 5 golden runs : mesurer delta Q_text avant/après | validation live | ⬜ TODO |
| G01.11 | Gates + non-régression 288 tests | | ⬜ TODO |

### Tests obligatoires GENIUS-01

```
TEST-G01-01 : Prompt contient 8 sections dans l'ordre [0]→[7]
TEST-G01-02 : Hiérarchie de résolution présente (texte exact)
TEST-G01-03 : Escape hatch NONCOMPLIANCE injecté
TEST-G01-04 : Mode original → contraintes rythme universelles
TEST-G01-05 : Mode continuation → rythme = fingerprint auteur ±10%
TEST-G01-06 : Mode continuation sans fingerprint → throw Error
TEST-G01-07 : Mode continuation sans voiceGenome → throw Error
TEST-G01-08 : Anti-pattern blacklist versionnée et injectée
TEST-G01-09 : NarrativeShape injecté si spécifié
TEST-G01-10 : NarrativeShape absent → "aligné sur courbe 14D" injecté
TEST-G01-11 : Exemplars injectés dans section [7]
TEST-G01-12 : Invariant GENIUS-13 (priority order dans output)
```

### Checklist fin de sprint G01

```
□ Tests écrits et exécutés
□ 12/12 tests PASS
□ 288 tests existants toujours PASS
□ Delta Q_text mesuré sur 5 golden runs
□ Hash des fichiers calculé
□ Commit + tag genius-01-prompt-contract
```

---

# PHASE 2 — BRIQUES ART + CALIBRATEUR (Semaines 2-4)

## Sprint ART-09 : Semantic Cortex (parallèle avec GENIUS-01)

```
Dépendances : Aucune
Effort estimé : 2-3 sessions
```

| Commit | Description | Status |
|--------|-------------|--------|
| 9.1 | analyzeEmotionSemantic() interface + types | ⬜ TODO |
| 9.2 | LLM emotion analyzer implementation | ⬜ TODO |
| 9.3 | Cache layer (text_hash, model_id, prompt_hash) | ⬜ TODO |
| 9.4 | Emotion contradiction compiler | ⬜ TODO |
| 9.5 | Migration tension_14d + emotion_coherence | ⬜ TODO |
| 9.6 | Calibration 5 CAL-CASE + corrélation ancien/nouveau | ⬜ TODO |
| 9.7 | Gates + ProofPack | ⬜ TODO |

---

## Sprint ART-10 : Sentence Surgeon

```
Dépendances : ART-09
Effort estimé : 2 sessions
```

| Commit | Description | Status |
|--------|-------------|--------|
| 10.1 | sentence-surgeon interface + types | ⬜ TODO |
| 10.2 | Micro-rewrite engine (LLM micro-calls) | ⬜ TODO |
| 10.3 | Re-score guard (revert si régression) | ⬜ TODO |
| 10.4 | Paragraph-level patch (Quantum Suture) | ⬜ TODO |
| 10.5 | Emotion-to-action mapping dictionary | ⬜ TODO |
| 10.6 | Remplacement 3 no-op (polishRhythm, sweepCliches, enforceSignature) | ⬜ TODO |
| 10.7 | Tests + Gates + ProofPack | ⬜ TODO |

---

## Sprint ART-11 : Authenticity & SDT ← CRITIQUE pour GENIUS

```
Dépendances : ART-10
Effort estimé : 2 sessions
IMPACT GENIUS : fournit AS (Layer 0 kill switch) + AAI (macro-axe M)
```

| Commit | Description | Impact GENIUS | Status |
|--------|-------------|---------------|--------|
| 11.1 | show_dont_tell detector (patterns + LLM) | — | ⬜ TODO |
| 11.2 | authenticity scorer (anti-IA smell) | → AS gatekeeper Layer 0 | ⬜ TODO |
| 11.3 | 2 nouveaux axes (show_dont_tell, authenticity) | → δ_AS | ⬜ TODO |
| 11.4 | Macro-axe AAI (Authenticity & Art Index) | → M | ⬜ TODO |
| 11.5 | Intégration dans correction loop | — | ⬜ TODO |
| 11.6 | Tests + Gates + ProofPack | — | ⬜ TODO |

**Note : Si ART-11 tarde, GENIUS-02 démarre avec AS v0 standalone (blacklist only).**

---

## Sprint GENIUS-03 : C_LLM CALIBRATOR (après GENIUS-01)

```
Dépendances : GENIUS-01 (prompt contract)
Effort estimé : 1-2 sessions
Parallèle avec : ART-11
```

| Commit | Description | Fichier(s) | Status |
|--------|-------------|------------|--------|
| G03.1 | Interface CalibrationResult + types | `genius-calibrator.ts` | ⬜ TODO |
| G03.2 | 7 prompts fixes Core System | `benchmark/core-prompts.json` | ⬜ TODO |
| G03.3 | Pool 30+ prompts tournants + sélection par hash | `benchmark/rotating-pool.json` | ⬜ TODO |
| G03.4 | Calcul Conformity (hard constraints pass ratio) | `genius-calibrator.ts` | ⬜ TODO |
| G03.5 | Calcul Stability (σ sur 5 runs) | `genius-calibrator.ts` | ⬜ TODO |
| G03.6 | Calcul Creativity (S moyen sur tournants) | `genius-calibrator.ts` | ⬜ TODO |
| G03.7 | Calcul Honesty H1-H5 (contradictions, faux causaux, SDT, symbols, NONCOMPLIANCE abuse) | `genius-calibrator.ts` | ⬜ TODO |
| G03.8 | Pilotage mono/multi/max-assist | `genius-calibrator.ts` | ⬜ TODO |
| G03.9 | NONCOMPLIANCE parser | `noncompliance-parser.ts` | ⬜ TODO |
| G03.10 | Tests (8 tests) | `__tests__/genius-calibrator.test.ts` | ⬜ TODO |

### Tests obligatoires GENIUS-03

```
TEST-G03-01 : C_llm calculé sur 10 prompts
TEST-G03-02 : C_llm > 0.85 → mono-pass (GENIUS-09)
TEST-G03-03 : C_llm < 0.60 → max-assist (GENIUS-10)
TEST-G03-04 : Honesty = 0.1 → C_llm chute (GENIUS-07)
TEST-G03-05 : Budget tokens augmente sous 0.60 (GENIUS-08)
TEST-G03-06 : Prompts tournants changent par semaine (GENIUS-14)
TEST-G03-07 : Q_system ne touche pas seal_granted (GENIUS-06)
TEST-G03-08 : NONCOMPLIANCE parsé + cap 1/run (GENIUS-27, GENIUS-29)
```

---

# PHASE 3 — SCORING V3.1 + GENIUS METRICS (Semaines 4-6)

## Sprint ART-12 : Scoring V3.1 ← MILESTONE

```
Dépendances : ART-11
Effort estimé : 2 sessions
IMPACT : pose les 5 macro-axes + 14 axes + seuil 93
```

| Commit | Description | Status |
|--------|-------------|--------|
| 12.1 | Dead metaphor blacklist FR (500+) | ⬜ TODO |
| 12.2 | metaphor_novelty axe (LLM-judged) | ⬜ TODO |
| 12.3 | Scoring V3.1 (5 macro-axes, 14 axes, seuil 93) | ⬜ TODO |
| 12.4 | Recalibration complète sur 5 CAL-CASE | ⬜ TODO |
| 12.5 | Non-régression totale + ProofPack V2 | ⬜ TODO |
| 12.6 | Tag v3.0.0-art-foundations | ⬜ TODO |

**MILESTONE : FONDATIONS ARTISTIQUES SEALED**

---

## Sprint ART-13 : Voice Genome ← CRITIQUE pour GENIUS V

```
Dépendances : ART-12
Effort estimé : 1-2 sessions
IMPACT GENIUS : fournit voice_genome pour V scorer + mode continuation
```

| Commit | Description | Impact GENIUS | Status |
|--------|-------------|---------------|--------|
| 13.1 | Voice genome extension (10 paramètres) | → V reference | ⬜ TODO |
| 13.2 | Voice constraint compiler | → mode continuation | ⬜ TODO |
| 13.3 | voice_conformity axe + drift test | → RCI (M) | ⬜ TODO |
| 13.4 | Tests + ProofPack | — | ⬜ TODO |

---

## Sprint GENIUS-02 : GENIUS METRICS (fer de lance n°2)

```
Dépendances :
  HARD : ART-11 (AS), ART-13 (Voice Genome), GENIUS-01 (prompt)
  FALLBACK : si ART-11/13 pas finis → AS v0 standalone, V floor=70 only
Effort estimé : 2-3 sessions
```

| Commit | Description | Fichier(s) | Status |
|--------|-------------|------------|--------|
| G02.1 | Local embedding model (ONNX/xenova) | `embeddings/local-embedding-model.ts` | ⬜ TODO |
| G02.2 | AS gatekeeper (Layer 0 kill switch) | `as-gatekeeper.ts` | ⬜ TODO |
| G02.3 | D scorer (compression + utility + verbiage penalty) | `scorers/density-scorer.ts` | ⬜ TODO |
| G02.4 | S scorer (TTR + entropy + semantic_shift + anti-clustering) | `scorers/surprise-scorer.ts` | ⬜ TODO |
| G02.5 | I scorer (causal + setup/payoff + non-contradiction) | `scorers/inevitability-scorer.ts` | ⬜ TODO |
| G02.6 | R scorer (motif_echo + thematic_depth + symbol_density) | `scorers/resonance-scorer.ts` | ⬜ TODO |
| G02.7 | V scorer (rhythm + fingerprint + register + silence) | `scorers/voice-scorer.ts` | ⬜ TODO |
| G02.8 | Orchestrateur genius-metrics (G + Q_text + diagnostics) | `genius-metrics.ts` | ⬜ TODO |
| G02.9 | Lint checks anti-doublon (6 lint rules CI) | `__tests__/anti-doublon-lint.test.ts` | ⬜ TODO |
| G02.10 | Tests unitaires par scorer (25+ tests) | `__tests__/` | ⬜ TODO |
| G02.11 | Tests intégration (INT01-INT05) | `__tests__/genius-metrics.test.ts` | ⬜ TODO |
| G02.12 | Tests non-triche (shuffle, injection, uniformisation) | `__tests__/genius-metrics.test.ts` | ⬜ TODO |
| G02.13 | Non-régression totale | | ⬜ TODO |

### Tests obligatoires GENIUS-02

```
SCORERS :
  D : dense→D>90, verbeux→D<50, repeat pattern→penalty, lint SII (4 tests)
  S : riche→S>85, synonymes plats→S<70, cluster→S chute, S_shift warning,
      déterminisme embedding, lint SII+provider (7 tests)
  I : causal→I>80, shuffle→I chute, faux "donc"→baisse,
      contradiction→baisse, lint TemporalEngine (5 tests)
  R : motifs récurrents→R>80, sans motif→R<50, lint taxonomie (3 tests)
  V : varié→V>80, uniforme→V chute, continuation V<85→SEAL refusé,
      lint RCI (4 tests)
  AS : propre→gate PASS, injection→REJECT, skip M/G si fail (3 tests)

INTÉGRATION :
  INT01 : M=85,G=100 → Q_text=92.2 < 93 (GENIUS-02)
  INT02 : M=95,G=95 → Q_text=95.0 (GENIUS-03)
  INT03 : V=65 en original → SEAL refusé (GENIUS-04)
  INT04 : Provider-invariance ±0.5 (GENIUS-25)
  INT05 : Output JSON conforme (GENIUS-15)

LINT CI :
  LINT-01 : density-scorer ∉ import SII
  LINT-02 : surprise-scorer ∉ import SII.metaphor
  LINT-03 : surprise-scorer ∉ API provider embedding
  LINT-04 : inevitability-scorer ∉ import TemporalEngine.scores
  LINT-05 : resonance-scorer ∉ SymbolTaxonomy creation
  LINT-06 : voice-scorer ∉ import RCI.voice_conformity

NON-RÉGRESSION : tous tests existants PASS
```

### Dépendances npm à ajouter

```
@xenova/transformers  — embedding local ONNX (pour semantic_shift)
  → Modèle : paraphrase-multilingual-MiniLM-L12-v2
  → Téléchargé au premier run, versionné

compromise (optionnel) — POS tagger JS pour français (pour D)
  → Alternative : custom regex-based v1
```

---

# PHASE 4 — INTÉGRATION + PERCEPTION (Semaines 6-8)

## Sprint GENIUS-04 : INTÉGRATION LIVE

```
Dépendances : ART-12, GENIUS-01, GENIUS-02, GENIUS-03
Effort estimé : 2-3 sessions
GATE FINALE : au moins 1 SEAL_RUN sur 5 runs
```

| Commit | Description | Status |
|--------|-------------|--------|
| G04.1 | Pipeline complet : AS → M → G → Q_text → verdict | ⬜ TODO |
| G04.2 | Output JSON canonique (schéma GENIUS_ENGINE_SPEC Partie 11) | ⬜ TODO |
| G04.3 | NONCOMPLIANCE parsing + archivage | ⬜ TODO |
| G04.4 | Stability assessment (5 runs × 4 scénarios) | ⬜ TODO |
| G04.5 | 20 runs de validation (Tension + Contemplatif + Continuation + Enhancement) | ⬜ TODO |
| G04.6 | Comparaison avant/après sur golden runs | ⬜ TODO |
| G04.7 | Anti-doublon check null (< 50 runs) | ⬜ TODO |
| G04.8 | Tag genius-04-integration | ⬜ TODO |

### Scénarios de validation

```
Scénario A : Thriller (tension)
  Mode : original
  NarrativeShape : ThreatReveal
  5 runs → mesurer Q_text, σ, SEAL count

Scénario B : Littéraire (contemplation)
  Mode : original
  NarrativeShape : Contemplative
  5 runs → vérifier que D verbiage_penalty n'est PAS activé sur abstrait

Scénario C : Suite Camus
  Mode : continuation
  NarrativeShape : SlowBurn
  5 runs → vérifier V ≥ 85, rythme = fingerprint auteur ±10%

Scénario D : Texte amateur amélioré
  Mode : enhancement
  NarrativeShape : Spiral
  5 runs → vérifier V ≥ 75, style reconnaissable
```

### Gate finale GENIUS-04

```
□ Pipeline AS → M → G → Q_text fonctionnel
□ Output JSON conforme au schéma
□ Au moins 1 SEAL_RUN sur 5 runs (n'importe quel scénario)
□ Noncompliance parsing fonctionnel
□ Embedding version dans output JSON
□ Non-régression totale
□ Tag genius-04-integration
```

---

## Sprint ART-14 : Reader Phantom (parallèle avec GENIUS-04)

```
Dépendances : ART-13
Effort estimé : 1-2 sessions
```

| Commit | Description | Status |
|--------|-------------|--------|
| 14.1 | Reader Phantom state (attention, cognitive_load, fatigue) | ⬜ TODO |
| 14.2 | Phantom runner (traverse texte phrase par phrase) | ⬜ TODO |
| 14.3 | 2 axes (attention_sustain, fatigue_management) | ⬜ TODO |
| 14.4 | Tests + calibration + ProofPack | ⬜ TODO |

---

## Sprint ART-15 : Phonetic Engine Light

```
Dépendances : ART-14
```

| Commit | Description | Status |
|--------|-------------|--------|
| 15.1 | Cacophony detector (CALC, sans phonemizer) | ⬜ TODO |
| 15.2 | Rhythm variation v2 (amélioré) | ⬜ TODO |
| 15.3 | euphony_basic axe | ⬜ TODO |
| 15.4 | Tests + ProofPack | ⬜ TODO |

---

## Sprint ART-16 : Temporal Architect

```
Dépendances : ART-15
IMPACT GENIUS : enrichit les données brutes pour I scorer
```

| Commit | Description | Status |
|--------|-------------|--------|
| 16.1 | temporal_contract dans ForgePacket | ⬜ TODO |
| 16.2 | Dilatation/compression scoring | ⬜ TODO |
| 16.3 | Emotional foreshadowing dans constraint compiler | ⬜ TODO |
| 16.4 | Tests + ProofPack | ⬜ TODO |

**MILESTONE : PERCEPTION & RAFFINEMENTS SEALED**

---

# PHASE 5 — BENCHMARK + CALIBRATION (Semaines 8-10)

## Sprint ART-17 : Benchmark Humain

```
Dépendances : ART-16 + GENIUS-04
```

| Commit | Description | Status |
|--------|-------------|--------|
| 17.1 | Corpus benchmark (10 OMEGA + 10 humains) | ⬜ TODO |
| 17.2 | Protocole blind + grille évaluation | ⬜ TODO |
| 17.3 | Rapport corrélation axes ↔ perception | ⬜ TODO |

---

## Sprint ART-18 : Calibration Fine

```
Dépendances : ART-17
```

| Commit | Description | Status |
|--------|-------------|--------|
| 18.1 | Ajustement poids basé sur benchmark | ⬜ TODO |
| 18.2 | Activation progressive physics_compliance | ⬜ TODO |
| 18.3 | Seuils ajustés par genre | ⬜ TODO |

---

## Sprint GENIUS-05 : RECALIBRATION POST-BENCHMARK (nouveau)

```
Dépendances : ART-17 + ART-18 + 50 runs archivés
Effort estimé : 1 session
```

| Commit | Description | Status |
|--------|-------------|--------|
| G05.1 | CLI omega recalibrate --genius | ⬜ TODO |
| G05.2 | Floors recalibrés via P10/P20 sur corpus 50 runs | ⬜ TODO |
| G05.3 | Anti-doublon GENIUS-16→20 : premières corrélations réelles | ⬜ TODO |
| G05.4 | Correlation logging (longueur, genre, scene_type) si trigger | ⬜ TODO |
| G05.5 | FLOORS_VERSION incrémenté | ⬜ TODO |

---

# PHASE 6 — CERTIFICATION (Semaines 10-12)

## Sprint ART-19 : ProofPack V3

| Commit | Description | Status |
|--------|-------------|--------|
| 19.1 | ProofPack V3 complet | ⬜ TODO |
| 19.2 | Documentation SSOT mise à jour | ⬜ TODO |
| 19.3 | Audit hostile ChatGPT | ⬜ TODO |

---

## Sprint ART-20 : Certification Finale

| Commit | Description | Status |
|--------|-------------|--------|
| 20.1 | Certification finale | ⬜ TODO |
| 20.2 | Tag v3.0.0-art | ⬜ TODO |
| 20.3 | Roadmap ART v2 (basée sur résultats benchmark) | ⬜ TODO |

---

# VUE CHRONOLOGIQUE (Gantt simplifié)

```
SEM 1  │ G00 commit ──── G01 start ──────────────────────────────
       │                  ART-09 start ───────────────────────────
       │
SEM 2  │ G01 continue ── ART-09 continue ────────────────────────
       │                  ART-10 start ───────────────────────────
       │
SEM 3  │ G01 DONE ────── ART-10 DONE ──── ART-11 start ─────────
       │                  G03 start (après G01) ──────────────────
       │
SEM 4  │ G03 continue ── ART-11 DONE ──── ART-12 start ─────────
       │
SEM 5  │ G03 DONE ────── ART-12 DONE ──── ART-13 start ─────────
       │                  ★ MILESTONE: FONDATIONS ARTISTIQUES ★
       │                  G02 start (après ART-11 + ART-13) ─────
       │
SEM 6  │ G02 continue ── ART-13 DONE ───────────────────────────
       │
SEM 7  │ G02 DONE ────── G04 start (intégration) ───────────────
       │                  ART-14 start (parallèle) ──────────────
       │
SEM 8  │ G04 DONE ────── ART-14 DONE ──── ART-15 start ─────────
       │                  ★ GATE: Premier SEAL_RUN ★
       │
SEM 9  │ ART-15 DONE ── ART-16 start ───────────────────────────
       │                  ★ MILESTONE: PERCEPTION SEALED ★
       │
SEM 10 │ ART-16 DONE ── ART-17 start (benchmark) ───────────────
       │
SEM 11 │ ART-17 DONE ── ART-18 start ── G05 start ──────────────
       │
SEM 12 │ ART-18 DONE ── G05 DONE ── ART-19 ── ART-20 ──────────
       │                  ★ CERTIFICATION FINALE ★
       │                  ★ Tag v3.0.0-art ★
```

---

# DIAGRAMME DE DÉPENDANCES

```
G00 (spec)
  │
  ├──→ G01 (prompt contract) ──→ G03 (calibrator)
  │         │                         │
  │         │     ART-09 (semantic)   │
  │         │       │                 │
  │         │     ART-10 (surgeon)    │
  │         │       │                 │
  │         │     ART-11 (AS+SDT) ───┐│
  │         │       │                ││
  │         │     ART-12 (V3.1) ──┐  ││
  │         │       │             │  ││
  │         │     ART-13 (voice) ─┤  ││
  │         │                     │  ││
  │         ├─────────────────────┘  ││
  │         │                        ││
  │         └──→ G02 (metrics) ←─────┘│
  │                   │               │
  │                   └───→ G04 (intégration) ←── G03
  │                           │
  │                         ART-14..16 (perception)
  │                           │
  │                         ART-17 (benchmark)
  │                           │
  │                         G05 (recalibration)
  │                           │
  │                         ART-19..20 (certification)
  │
  └──→ v3.0.0-art (tag final)
```

---

# MÉTRIQUES DE PROGRESSION

| Milestone | Tests attendus | Sprints | Semaine |
|-----------|---------------|---------|---------|
| GENIUS-00 scellé | 288 (baseline) | G00 | 1 |
| Prompt contract livré | 300+ | G01 | 2-3 |
| Fondations ART sealed | 350+ | ART 9-12 | 5 |
| Genius metrics opérationnel | 420+ | G02 | 6-7 |
| Premier SEAL_RUN | 450+ | G04 | 7-8 |
| Perception sealed | 480+ | ART 14-16 | 9 |
| Recalibration post-benchmark | 500+ | G05 | 11 |
| Certification finale v3.0.0-art | 520+ | ART 19-20 | 12 |

---

# RISQUES ET MITIGATION

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Embedding ONNX trop lourd (RAM) | Moyen | Bloque S | Option C (micro-service Python) en fallback |
| ART-11 retardé (AS manquant) | Faible | Bloque G02 | AS v0 standalone (blacklist only) |
| ART-13 retardé (voice genome manquant) | Faible | V limité | V en mode original only (floor=70) |
| I proxy v1 trop imprécis | Moyen | I scores incohérents | Shuffle-test comme garde-fou, itérer en v2 |
| SEAL jamais atteint en G04 | Faible | Gate échoue | Recalibrer floors via CLI, ajuster exemplars |
| NONCOMPLIANCE abusé par LLM | Moyen | Triche | Cap 1/run + H5 penalty (déjà intégré) |

---

# RÈGLE DE FIN DE SPRINT (pour chaque sprint)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   □ Tests écrits et exécutés                                                  ║
║   □ Résultat : X/Y (100%)                                                    ║
║   □ Non-régression : tous tests précédents PASS                               ║
║   □ Hash des fichiers modifiés (SHA-256)                                      ║
║   □ Commit avec message structuré : feat(genius): [description] [INV-xxx]     ║
║   □ Tag si milestone                                                          ║
║   □ Verdict : PASS ou FAIL                                                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

**FIN DE ROADMAP — OMEGA ART + GENIUS UNIFIÉE v1.0**
**12 semaines • 6 phases • 25 sprints • 520+ tests cible • 1 SEAL à atteindre**
