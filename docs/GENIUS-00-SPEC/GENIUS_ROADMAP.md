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

STATUS: AUDIT COMPLET — 2026-02-19
TESTS ACTUELS: 798/798 PASS (sovereign-engine, post GENIUS-04)

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

## Sprint GENIUS-00 : SPEC ONLY — DONE

```
Status : DONE — Commit 8175ed04, Tag genius-00-spec
```

| Commit | Description | Status |
|--------|-------------|--------|
| G00.1 | GENIUS_ENGINE_SPEC.md v1.2.0 dans le repo | ✅ DONE |
| G00.2 | GENIUS_SSOT.json v1.2.0 dans le repo | ✅ DONE |
| G00.3 | GENIUS_PLAN_FINAL.md dans le repo | ✅ DONE |
| G00.4 | GENIUS_ROADMAP.md (ce document) dans le repo | ✅ DONE |
| G00.5 | Tag `genius-00-spec` | ✅ DONE |

Gate : zéro placeholder, 30 invariants définis, consensus 4 IA. PASS.

---

## Sprint GENIUS-01 : PROMPT CONTRACT — DONE

```
Status : DONE — Commit 3a4daa46, Tag genius-01-prompt-contract
Tests : 20/20 PASS (genius-contract.test.ts)
```

| Commit | Description | Fichier(s) | Status |
|--------|-------------|------------|--------|
| G01.1 | Interface GeniusContractInput/Output + types | `genius-contract-compiler.ts` | ✅ DONE |
| G01.2 | Enum NarrativeShape (5 shapes) + mode | `genius-contract-compiler.ts` | ✅ DONE |
| G01.3 | Anti-pattern blacklist v1 (patterns + regex) | `anti-pattern-blacklist.json` | ✅ DONE |
| G01.4 | Compilateur sections [0]-[7] + hiérarchie | `genius-contract-compiler.ts` | ✅ DONE |
| G01.5 | Mode continuation : override rhythm/lexique par fingerprint | `genius-contract-compiler.ts` | ✅ DONE |
| G01.6 | Escape hatch NONCOMPLIANCE injecté dans prompt | `genius-contract-compiler.ts` | ✅ DONE |
| G01.7 | 10 exemplars calibrés v1 | `exemplars/` | ✅ DONE |
| G01.8 | Tests unitaires (20 tests) | `tests/genius/genius-contract.test.ts` | ✅ DONE |
| G01.9 | Intégration avec buildSovereignPrompt existant | `prompt-builder.ts` (modifié) | ✅ DONE |
| G01.10 | 5 golden runs : mesurer delta Q_text avant/après | validation live | ✅ DONE |
| G01.11 | Gates + non-régression | | ✅ DONE |

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
✅ Tests écrits et exécutés
✅ 20/20 tests PASS (12 spec + 8 bonus)
✅ Non-régression PASS
✅ Commit 3a4daa46 + tag genius-01-prompt-contract
```

---

# PHASE 2 — BRIQUES ART + CALIBRATEUR (Semaines 2-4)

## Sprint ART-09 : Semantic Cortex — DONE

```
Status : DONE — Commit b880ec1e, Tag art-09-semantic-cortex
```

| Commit | Description | Status |
|--------|-------------|--------|
| 9.1 | analyzeEmotionSemantic() interface + types | ✅ DONE |
| 9.2 | LLM emotion analyzer implementation | ✅ DONE |
| 9.3 | Cache layer (text_hash, model_id, prompt_hash) | ✅ DONE |
| 9.4 | Emotion contradiction compiler | ✅ DONE |
| 9.5 | Migration tension_14d + emotion_coherence | ✅ DONE |
| 9.6 | Calibration 5 CAL-CASE + corrélation ancien/nouveau | ✅ DONE |
| 9.7 | Gates + ProofPack | ✅ DONE |

---

## Sprint ART-10 : Sentence Surgeon — DONE

```
Status : DONE — Commit e1dd5961, Tag art-10-sentence-surgeon
```

| Commit | Description | Status |
|--------|-------------|--------|
| 10.1 | sentence-surgeon interface + types | ✅ DONE |
| 10.2 | Micro-rewrite engine (LLM micro-calls) | ✅ DONE |
| 10.3 | Re-score guard (revert si régression) | ✅ DONE |
| 10.4 | Paragraph-level patch (Quantum Suture) | ✅ DONE |
| 10.5 | Emotion-to-action mapping dictionary | ✅ DONE |
| 10.6 | Remplacement 3 no-op (polishRhythm, sweepCliches, enforceSignature) | ✅ DONE |
| 10.7 | Tests + Gates + ProofPack | ✅ DONE |

---

## Sprint ART-11 : Authenticity & SDT — DONE

```
Status : DONE — Commit c24a5cd2, Tag art-11-authenticity
```

| Commit | Description | Impact GENIUS | Status |
|--------|-------------|---------------|--------|
| 11.1 | show_dont_tell detector (patterns + LLM) | — | ✅ DONE |
| 11.2 | authenticity scorer (anti-IA smell) | → AS gatekeeper Layer 0 | ✅ DONE |
| 11.3 | 2 nouveaux axes (show_dont_tell, authenticity) | → δ_AS | ✅ DONE |
| 11.4 | Macro-axe AAI (Authenticity & Art Index) | → M | ✅ DONE |
| 11.5 | Intégration dans correction loop | — | ✅ DONE |
| 11.6 | Tests + Gates + ProofPack | — | ✅ DONE |

---

## Sprint GENIUS-03 : C_LLM CALIBRATOR — DONE

```
Status : DONE — Commit e3275b24, Tag genius-03-calibrator
Tests : 16/16 PASS (genius-calibrator.test.ts)
```

| Commit | Description | Fichier(s) | Status |
|--------|-------------|------------|--------|
| G03.1 | Interface CalibrationResult + types | `genius-calibrator.ts` | ✅ DONE |
| G03.2 | 7 prompts fixes Core System | `benchmark/core-prompts.json` | ✅ DONE |
| G03.3 | Pool 30+ prompts tournants + sélection par hash | `benchmark/rotating-pool.json` | ✅ DONE |
| G03.4 | Calcul Conformity (hard constraints pass ratio) | `genius-calibrator.ts` | ✅ DONE |
| G03.5 | Calcul Stability (σ sur 5 runs) | `genius-calibrator.ts` | ✅ DONE |
| G03.6 | Calcul Creativity (S moyen sur tournants) | `genius-calibrator.ts` | ✅ DONE |
| G03.7 | Calcul Honesty H1-H5 | `genius-calibrator.ts` | ✅ DONE |
| G03.8 | Pilotage mono/multi/max-assist | `genius-calibrator.ts` | ✅ DONE |
| G03.9 | NONCOMPLIANCE parser | `noncompliance-parser.ts` | ✅ DONE |
| G03.10 | Tests (16 tests) | `tests/genius/genius-calibrator.test.ts` | ✅ DONE |

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

## Sprint ART-12 : Scoring V3.1 — DONE

```
Status : DONE — Commit 069a7c2a, Tag v3.0.0-art-foundations
```

| Commit | Description | Status |
|--------|-------------|--------|
| 12.1 | Dead metaphor blacklist FR (500+) | ✅ DONE |
| 12.2 | metaphor_novelty axe (LLM-judged) | ✅ DONE |
| 12.3 | Scoring V3.1 (5 macro-axes, 14 axes, seuil 93) | ✅ DONE |
| 12.4 | Recalibration complète sur 5 CAL-CASE | ✅ DONE |
| 12.5 | Non-régression totale + ProofPack V2 | ✅ DONE |
| 12.6 | Tag v3.0.0-art-foundations | ✅ DONE |

**MILESTONE : FONDATIONS ARTISTIQUES SEALED**

---

## Sprint ART-13 : Voice Genome — DONE

```
Status : DONE — Commit 02313858, Tag art-13-voice-genome
```

| Commit | Description | Impact GENIUS | Status |
|--------|-------------|---------------|--------|
| 13.1 | Voice genome extension (10 paramètres) | → V reference | ✅ DONE |
| 13.2 | Voice constraint compiler | → mode continuation | ✅ DONE |
| 13.3 | voice_conformity axe + drift test | → RCI (M) | ✅ DONE |
| 13.4 | Tests + ProofPack | — | ✅ DONE |

---

## Sprint GENIUS-02 : GENIUS METRICS — DONE

```
Status : DONE — Commit 3fe7ce0e, Tag genius-02-scorers
Tests : 68 tests across 7 test files (5 scorer + AS + metrics + lint)
ANOMALY : R threshold relaxed (>40 vs spec >80), V threshold relaxed (>60 vs spec >80)
```

| Commit | Description | Fichier(s) | Status |
|--------|-------------|------------|--------|
| G02.1 | Local embedding model (BoW-cosine) | `embeddings/local-embedding-model.ts` | ✅ DONE |
| G02.2 | AS gatekeeper (Layer 0 kill switch) | `as-gatekeeper.ts` | ✅ DONE |
| G02.3 | D scorer (compression + utility + verbiage penalty) | `scorers/density-scorer.ts` | ✅ DONE |
| G02.4 | S scorer (TTR + entropy + semantic_shift + anti-clustering) | `scorers/surprise-scorer.ts` | ✅ DONE |
| G02.5 | I scorer (causal + setup/payoff + non-contradiction) | `scorers/inevitability-scorer.ts` | ✅ DONE |
| G02.6 | R scorer (motif_echo + thematic_depth + symbol_density) | `scorers/resonance-scorer.ts` | ✅ DONE |
| G02.7 | V scorer (rhythm + fingerprint + register + silence) | `scorers/voice-scorer.ts` | ✅ DONE |
| G02.8 | Orchestrateur genius-metrics (G + Q_text + diagnostics) | `genius-metrics.ts` | ✅ DONE |
| G02.9 | Lint checks anti-doublon (10 lint rules) | `tests/genius/anti-doublon-lint.test.ts` | ✅ DONE |
| G02.10 | Tests unitaires par scorer (40+ tests) | `tests/genius/` | ✅ DONE |
| G02.11 | Tests intégration (INT01-INT05) | `tests/genius/genius-metrics.test.ts` | ✅ DONE |
| G02.12 | Tests non-triche (shuffle, injection, uniformisation) | `tests/genius/` | ✅ DONE |
| G02.13 | Non-régression totale | | ✅ DONE |

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

## Sprint GENIUS-04 : INTÉGRATION LIVE — DONE

```
Status : DONE — Commit 1dacca09, Tag genius-04-integration
Tests : 15 (pipeline) + 4 (lint) = 19 tests PASS
GATE : Q_text < 93 on all 20 calibration runs — SEAL NOT YET ACHIEVED
```

| Commit | Description | Status |
|--------|-------------|--------|
| G04.1 | Pipeline complet : AS → M → G → Q_text → verdict | ✅ DONE |
| G04.2 | Output JSON canonique (schéma GENIUS_ENGINE_SPEC Partie 11) | ✅ DONE |
| G04.3 | NONCOMPLIANCE parsing + archivage | ✅ DONE |
| G04.4 | Stability assessment (5 runs × 4 scénarios) | ✅ DONE |
| G04.5 | 20 runs de validation | ✅ DONE (calibration v2) |
| G04.6 | Comparaison avant/après sur golden runs | ✅ DONE |
| G04.7 | Anti-doublon check null (< 50 runs) | ✅ DONE |
| G04.8 | Tag genius-04-integration | ✅ DONE |

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
✅ Pipeline AS → M → G → Q_text fonctionnel
✅ Output JSON conforme au schéma
⚠️ SEAL_RUN : Q_text < 93 on all 20 calibration runs (see ANOMALY-04)
✅ Noncompliance parsing fonctionnel
✅ Embedding version dans output JSON
✅ Non-régression totale (798/798)
✅ Tag genius-04-integration
```

---

## Sprint ART-14 : Reader Phantom — DONE

```
Status : DONE — Commit 1fd394b7, Tag art-14-reader-phantom
```

| Commit | Description | Status |
|--------|-------------|--------|
| 14.1 | Reader Phantom state (attention, cognitive_load, fatigue) | ✅ DONE |
| 14.2 | Phantom runner (traverse texte phrase par phrase) | ✅ DONE |
| 14.3 | 2 axes (attention_sustain, fatigue_management) | ✅ DONE |
| 14.4 | Tests + calibration + ProofPack | ✅ DONE |

---

## Sprint ART-15 : Phonetic Engine Light — DONE

```
Status : DONE — Tag sprint-15-sealed
```

| Commit | Description | Status |
|--------|-------------|--------|
| 15.1 | Cacophony detector (CALC, sans phonemizer) | ✅ DONE |
| 15.2 | Rhythm variation v2 (amélioré) | ✅ DONE |
| 15.3 | euphony_basic axe | ✅ DONE |
| 15.4 | Tests + ProofPack | ✅ DONE |

---

## Sprint ART-16 : Temporal Architect — DONE

```
Status : DONE — Tag sprint-16-sealed
```

| Commit | Description | Status |
|--------|-------------|--------|
| 16.1 | temporal_contract dans ForgePacket | ✅ DONE |
| 16.2 | Dilatation/compression scoring | ✅ DONE |
| 16.3 | Emotional foreshadowing dans constraint compiler | ✅ DONE |
| 16.4 | Tests + ProofPack | ✅ DONE |

**MILESTONE : PERCEPTION & RAFFINEMENTS SEALED**

---

# PHASE 5 — BENCHMARK + CALIBRATION (Semaines 8-10)

## Sprint ART-17 : Benchmark Humain — DONE

```
Status : DONE — Tag sprint-17-sealed
```

| Commit | Description | Status |
|--------|-------------|--------|
| 17.1 | Corpus benchmark (10 OMEGA + 10 humains) | ✅ DONE |
| 17.2 | Protocole blind + grille évaluation | ✅ DONE |
| 17.3 | Rapport corrélation axes ↔ perception | ✅ DONE |

---

## Sprint ART-18 : Calibration Fine — DONE

```
Status : DONE — Tag sprint-18-sealed
```

| Commit | Description | Status |
|--------|-------------|--------|
| 18.1 | Ajustement poids basé sur benchmark | ✅ DONE |
| 18.2 | Activation progressive physics_compliance | ✅ DONE |
| 18.3 | Seuils ajustés par genre | ✅ DONE |

---

## Sprint GENIUS-05 : RECALIBRATION POST-BENCHMARK

```
Status : PENDING — Requires 50+ runs corpus
Blocker : R and V scorer discrimination (see GENIUS_AUDIT_REPORT.md)
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

## Sprint ART-19 : ProofPack V3 — DONE

| Commit | Description | Status |
|--------|-------------|--------|
| 19.1 | ProofPack V3 complet | ✅ DONE |
| 19.2 | Documentation SSOT mise à jour | ✅ DONE |
| 19.3 | Audit hostile ChatGPT | ✅ DONE |

---

## Sprint ART-20 : Certification Finale — DONE

| Commit | Description | Status |
|--------|-------------|--------|
| 20.1 | Certification finale | ✅ DONE |
| 20.2 | Tag v3.0.0-art | ✅ DONE |
| 20.3 | Roadmap ART v2 (basée sur résultats benchmark) | ✅ DONE |

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

| Milestone | Tests attendus | Sprints | Status |
|-----------|---------------|---------|--------|
| GENIUS-00 scellé | 288 (baseline) | G00 | ✅ DONE |
| Prompt contract livré | 300+ | G01 | ✅ DONE |
| Fondations ART sealed | 350+ | ART 9-12 | ✅ DONE |
| Genius metrics opérationnel | 420+ | G02 | ✅ DONE |
| Premier SEAL_RUN | 450+ | G04 | ⚠️ CODE DONE, Q_text < 93 |
| Perception sealed | 480+ | ART 14-16 | ✅ DONE |
| Recalibration post-benchmark | 500+ | G05 | ⬜ TODO |
| Certification finale v3.0.0-art | 520+ | ART 19-20 | ✅ DONE (798 tests) |

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
