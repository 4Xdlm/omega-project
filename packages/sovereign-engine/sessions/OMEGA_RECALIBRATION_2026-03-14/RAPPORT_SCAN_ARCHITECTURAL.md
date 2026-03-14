# RAPPORT SCAN ARCHITECTURAL — OMEGA SOVEREIGN-ENGINE
**Date** : 2026-03-14 | **Branche** : `phase-u-transcendence`
**Standard** : NASA-Grade L4 / DO-178C
**Statut** : READ-ONLY SCAN — Aucun fichier modifie

---

## 1. INVENTAIRE COMPLET

**194 fichiers `.ts`** repartis dans **42 repertoires** sous `src/`.

### Repertoires principaux (nombre de fichiers)

| Repertoire | Fichiers | Role |
|------------|----------|------|
| `src/oracle/` | 5 | Aesthetic Oracle, S-Score, S-Oracle-v2, LLM-Judge, Macro-Axes |
| `src/oracle/axes/` | 18 | Axes individuels (banality, rhythm, metaphor-novelty, etc.) |
| `src/oracle/calc-judges/` | 3 | Juges calculatoires (rhythm, lexical, phonetic) |
| `src/oracle/physics-audit/` | 1 | Audit physique de prose |
| `src/validation/` | 5 | Core validation (continuity-plan, e1-multi-prompt-runner, etc.) |
| `src/validation/phase-u/` | 8 | Phase U exit validator, top-k, benchmark, harness |
| `src/cde/` | 6 | Context Distillation Engine (types, distiller, delta, pipeline, chain) |
| `src/genius/` | 7 | Genius Layer (prompt engineering, scoring, embeddings) |
| `src/genius/scorers/` | 2 | NLP scorers (sentence-variety, lexical-density) |
| `src/genius/embeddings/` | 1 | Embedding utilities |
| `src/filter/` | 3 | Soul-layer, banality-budget, index |
| `src/polish/` | 7 | Polish Engine, micro-polish, nano-polish, compressor, etc. |
| `src/metaphor/` | 6 | Metaphor detector, novelty scoring, cliche detection |
| `src/voice/` | 6 | Voice DNA, compliance, fingerprint, conformity |
| `src/phonetic/` | 4 | Phonetic analysis (cacophony, alliteration, rhythm) |
| `src/symbol/` | 3 | Symbol detection and tracking |
| `src/temporal/` | 3 | Temporal coherence analysis |
| `src/silence/` | 2 | Silence/ellipsis detection |
| `src/semantic/` | 3 | Semantic coherence, field analysis |
| `src/phantom/` | 2 | Phantom detection (AI patterns) |
| `src/authenticity/` | 2 | Authenticity scoring |
| `src/constraints/` | 2 | Constraint validation |
| `src/gates/` | 2 | Quality gates (pre/post) |
| `src/delta/` | 2 | Delta computation between drafts |
| `src/core/` | 3 | Core types, constants, errors |
| `src/compat/` | 2 | Backward compatibility shims |
| `src/utils/` | 5 | Utilities (text, hash, token, logger, retry) |
| `src/runtime/` | 3 | Provider abstraction (anthropic-provider, types, index) |
| `src/input/` | 4 | Forge packet assembler, prompt-assembler-v2, input types |
| `src/quality/` | 2 | Quality metrics aggregation |
| `src/prescriptions/` | 3 | Style prescriptions, kill-list enforcement |
| `src/pipeline/` | 3 | Sovereign pipeline (OFFLINE/CALC), pipeline types |
| `src/benchmark/` | 4 | Benchmark runner, comparator, reporter |
| `src/calibration/` | 5 | Score calibration, normalization curves |
| `src/exemplar/` | 1 | Exemplar management |
| `src/prose-directive/` | 4 | Prose directives, style injection |
| `src/proofpack/` | 7 | Evidence pack generation, hash chains |
| `src/genesis-v2/` | 5 | Genesis V2 (env-gated GENESIS_V2=1) |

### Fichiers racine `src/`

| Fichier | Role | Statut |
|---------|------|--------|
| `src/engine.ts` | Pipeline principal LIVE (16 etapes, ~8 LLM calls) | **SEALED** |
| `src/types.ts` | Types globaux (SovereignProvider, StyleProfile, etc.) | LIVE |
| `src/index.ts` | Re-exports publics | LIVE |
| `src/sovereign-loop.ts` | Boucle draft-polish-judge | LIVE |
| `src/duel-engine.ts` | Duel entre 2 drafts | LIVE |

---

## 2. PIPELINES D'EXECUTION

### Pipeline A : `engine.ts` — LIVE / LLM

**16 etapes sequentielles** dans `runSovereignForge()` :

```
1.  assembleForgePacket(input)          [CALC]
2.  assemblePromptV2(packet)            [CALC]
3.  provider.generateDraft(prompt)      [LLM] — Draft 1
4.  provider.generateDraft(prompt)      [LLM] — Draft 2 (duel)
5.  duelEngine.selectBest(d1, d2)       [LLM] — Judge duel
6.  polishEngine.polish(winner)         [LLM] — Polish pass 1
7.  polishEngine.polish(polished)       [LLM] — Polish pass 2 (conditional)
8.  aestheticOracle.score(prose)        [CALC] — 18 axes scoring
9.  sScore.compute(axes)                [CALC] — S-Score composite
10. macroAxes.compute(axes)             [CALC] — ECC/RCI/SII/IFI/AAI
11. sOracleV2.evaluate(all)             [CALC] — Final evaluation
12. physicsAudit.audit(prose)           [CALC] — Physics checks
13. provider.judgeQuality(prose)        [LLM] — LLM quality judge
14. gatesCheck(all)                     [CALC] — Pre/post gates
15. verdictCompute(all)                 [CALC] — SEAL/REVISE/REJECT
16. proofpackGenerate(all)              [CALC] — Evidence pack
```

**Appels LLM dans le happy path** : ~8 (2 drafts + 1 duel + 2 polish + 1 judge + optionnel genesis/diffusion)

### Pipeline B : `pipeline/sovereign-pipeline.ts` — OFFLINE / CALC

Pipeline hors-ligne qui re-evalue de la prose existante sans appels LLM :

```
1. Parse prose input                    [CALC]
2. aestheticOracle.score(prose)         [CALC]
3. sScore.compute(axes)                 [CALC]
4. macroAxes.compute(axes)              [CALC]
5. verdict                              [CALC]
```

**Usage** : Validation harness, benchmarks, recalibration.

### Pipeline C : Genesis V2 (env-gated `GENESIS_V2=1`)

```
1. transcendentPlanner(intent)          [LLM] — Plan generation
2. paradoxGate.check(plan)              [CALC] — Contradiction detection
3. diffusionRunner.run(plan, N)         [LLM x N] — N drafts (max 4)
4. selection(drafts)                    [CALC] — Best draft selection
```

**Activation** : `process.env.GENESIS_V2 === '1'` uniquement.

### Pipeline D : CDE (Context Distillation Engine) — V-PROTO

```
1. distillBrief(cdeInput)              [CALC] — Compress to SceneBrief ≤150t
2. injectBrief(forgeInput, brief)      [CALC] — Clone + inject
3. runSovereignForge(injected)         [Pipeline A] — Full generation
4. extractDelta(prose, context)        [CALC] — Heuristic delta extraction
5. propagateDelta(input, delta)        [CALC] — Chain to next scene
```

---

## 3. CARTE DES INTERACTIONS

### SovereignProvider — Interface centrale

```typescript
interface SovereignProvider {
  generateDraft(prompt, options)     // LLM generation
  judgeDuel(a, b, criteria)          // LLM duel judging
  judgeQuality(prose, criteria)      // LLM quality assessment
  judgePolish(original, polished)    // LLM polish evaluation
  scoreAxes(prose)                   // Scoring wrapper
  scoreMacro(axes)                   // Macro computation
  computeSScore(axes)                // S-Score computation
  generatePlan(intent)               // Genesis planning
}
```

**Implementations** : `runtime/anthropic-provider.ts` (Anthropic Claude API)

### Dependances inter-modules (flux principal)

```
input/ ──────► engine.ts ──────► oracle/ ──────► validation/
  │               │                 │                │
  │               ▼                 ▼                ▼
  │           polish/ ◄──── filter/soul-layer    proofpack/
  │               │
  │               ▼
  │           genius/ (prompt engineering)
  │
  ▼
cde/ ──────► engine.ts (via cde-pipeline.ts)
```

### Dependances oracle/ internes

```
oracle/aesthetic-oracle.ts
    ├── axes/ (18 axes individuels)
    │     ├── banality.ts, rhythm.ts, voice-conformity.ts, ...
    │     └── metaphor-novelty.ts, phonetic-texture.ts, ...
    ├── calc-judges/ (3 juges CALC)
    │     ├── rhythm-calc-judge.ts
    │     ├── lexical-calc-judge.ts
    │     └── phonetic-calc-judge.ts
    └── physics-audit/
          └── physics-audit.ts

oracle/s-score.ts ◄── aesthetic-oracle (axes scores)
oracle/macro-axes.ts ◄── aesthetic-oracle (axes scores)
    └── Composition: ECC(33%) + AAI(25%) + RCI(17%) + SII(15%) + IFI(10%)
oracle/s-oracle-v2.ts ◄── s-score + macro-axes + axes
```

### Modules consommes par engine.ts (direct imports)

1. `input/forge-packet-assembler.ts`
2. `input/prompt-assembler-v2.ts`
3. `oracle/aesthetic-oracle.ts`
4. `oracle/s-score.ts`
5. `oracle/macro-axes.ts`
6. `oracle/s-oracle-v2.ts`
7. `polish/polish-engine.ts`
8. `duel-engine.ts`
9. `filter/soul-layer.ts`
10. `genius/` (indirect via prompt assembly)
11. `proofpack/` (evidence generation)
12. `gates/` (quality gates)

---

## 4. SUSPECTS — Modules a investiguer

### SUSPECT-01 : `validation/continuity-plan.ts` + `validation/e1-multi-prompt-runner.ts`

**Probleme** : Gestion d'etat multi-scenes qui chevauche le CDE.
- `continuity-plan.ts` : Planifie la continuite entre scenes
- `e1-multi-prompt-runner.ts` : Execute des prompts en sequence avec etat
- **Chevauchement** : CDE (`scene-chain.ts` + `propagateDelta`) fait exactement la meme chose
- **Risque** : Deux systemes de propagation d'etat concurrents → derives possibles
- **Recommandation** : Unifier sous CDE ou documenter la frontiere (CDE = distillation, continuity-plan = validation)

### SUSPECT-02 : `genesis-v2/diffusion-runner.ts`

**Probleme** : Potentiel doublon avec `polish/polish-engine.ts`.
- `diffusion-runner.ts` : Genere N variants par diffusion iterative
- `polish-engine.ts` : Ameliore un draft par passes successives
- Les deux font : input prose → LLM → improved prose, en boucle
- **Difference** : Diffusion = divergence (N branches), Polish = convergence (1 branche)
- **Risque** : Si les deux tournent, cout LLM x2 sans gain clair
- **Recommandation** : Clarifier que diffusion remplace les 2 polish passes dans le path Genesis V2

### SUSPECT-03 : `oracle/s-oracle-v2.ts` vs `oracle/s-score.ts`

**Probleme** : Deux systemes de scoring coexistent.
- `s-score.ts` : Score composite original (formule ponderee)
- `s-oracle-v2.ts` : Evaluation enrichie avec macro-axes et contexte
- **Risque** : Confusion sur quel score fait autorite pour le verdict
- **Recommandation** : s-oracle-v2 est le successeur — documenter que s-score.ts est conserve pour backward compat uniquement

### SUSPECT-04 : `prescriptions/` vs `filter/`

**Probleme** : Deux modules qui controlent le style.
- `prescriptions/` : Injecte des directives de style dans le prompt
- `filter/soul-layer.ts` : Filtre post-generation (kill-lists, banality)
- **Difference** : Pre-generation (prescriptions) vs post-generation (filter)
- **Risque** : Faible — complementaires par design
- **Recommandation** : Aucune action, mais documenter la frontiere

---

## 5. DOUBLONS ET REDONDANCES

### DOUBLON-01 : Token estimation

| Localisation | Methode |
|-------------|---------|
| `cde/distiller.ts` | `Math.ceil(totalChars / 4)` |
| `utils/token.ts` | `estimateTokens(text)` — meme heuristique |
| `genius/` | Comptage inline similaire |

**Recommandation** : Centraliser dans `utils/token.ts`, importer partout.

### DOUBLON-02 : Hash computation

| Localisation | Methode |
|-------------|---------|
| `cde/distiller.ts` | `sortedStringify → SHA256` (deterministe) |
| `utils/hash.ts` | `computeHash(data)` |
| `proofpack/` | Hash chains avec SHA256 |

**Recommandation** : Le pattern `sortedStringify` du CDE devrait etre dans `utils/hash.ts`.

### DOUBLON-03 : Saga-ready / min_axis computation

| Localisation | Methode |
|-------------|---------|
| `cde/scene-chain.ts:115-127` | `isSceneSagaReady()` — min_axis from macro_axes |
| `validation/phase-u/top-k-selection.ts` | Min_axis computation for seal_path |
| `validation/phase-u/phase-u-exit-validator.ts` | SSI computation |

**Recommandation** : Extraire `computeMinAxis(macroAxes)` dans un utilitaire partage.

### DOUBLON-04 : SAGA_READY thresholds

| Localisation | Valeur |
|-------------|--------|
| `cde/scene-chain.ts` | `SAGA_READY_COMPOSITE_MIN=92, SAGA_READY_MIN_AXIS=85` |
| `validation/phase-u/top-k-selection.ts` | Memes constantes, definies independamment |
| `validation/phase-u/phase-u-exit-validator.ts` | Memes seuils en dur |

**Recommandation** : Centraliser dans `core/constants.ts` ou `validation/phase-u/thresholds.ts`.

---

## 6. FICHIERS `.bak` ET ORPHELINS

### Fichiers `.bak` detectes dans le repo

Aucun fichier `.bak` detecte dans `src/`. Un fichier `.bak` existe dans `omega-autopsie/` hors perimetre :
- `omega-autopsie/full_work_analyzer_v4.py.bak_td_path01`

### Orphelins potentiels dans `src/`

| Fichier | Statut | Raison |
|---------|--------|--------|
| `src/compat/` (2 fichiers) | A verifier | Shims de compatibilite — peuvent etre obsoletes si tous les consumers sont migres |
| `src/exemplar/` (1 fichier) | A verifier | Usage limite — potentiellement vestige d'une phase anterieure |
| `src/calibration/` (5 fichiers) | Actif | Utilise par les benchmarks — pas orphelin |

### Index files (`index.ts`) — Couverture

42 repertoires, la majorite disposent d'un `index.ts` pour les re-exports. Exceptions notables :
- `src/oracle/axes/` : Pas d'index — importe directement par aesthetic-oracle
- `src/oracle/calc-judges/` : Pas d'index — importe directement
- `src/oracle/physics-audit/` : Pas d'index — 1 seul fichier

---

## 7. CARTOGRAPHIE DES RESPONSABILITES

### Matrice Module → Responsabilite

| Module | Responsabilite | Entrees | Sorties |
|--------|---------------|---------|---------|
| `input/` | Assemblage du packet forge | ForgePacketInput | ForgePacket, PromptV2 |
| `engine.ts` | Orchestration pipeline LIVE | ForgePacket + Provider | SovereignForgeResult |
| `pipeline/` | Evaluation OFFLINE | Prose + Config | Scores + Verdict |
| `oracle/` | Scoring esthetique | Prose | 18 axes + S-Score + Macro-Axes |
| `polish/` | Amelioration iterative | Draft + Directives | Polished prose |
| `filter/` | Filtrage post-gen | Prose + KillLists | Cleaned prose + Violations |
| `genius/` | Prompt engineering | Scene + Style | Engineered prompt |
| `voice/` | Analyse vocale | Prose + DNA | Conformity scores |
| `metaphor/` | Detection metaphores | Prose | Metaphor inventory + Novelty |
| `phonetic/` | Analyse phonetique | Prose | Cacophony/Alliteration scores |
| `validation/` | Certification Phase U | ForgeResults[] | Exit report + Metrics |
| `cde/` | Distillation contextuelle | CDEInput | SceneBrief + StateDelta |
| `proofpack/` | Evidence tracabilite | All results | Hash chains + Proof files |
| `genesis-v2/` | Planification transcendante | Intent | GenesisPlan + N drafts |
| `runtime/` | Abstraction provider | API config | SovereignProvider |
| `gates/` | Quality gates | Scores | Pass/Fail |
| `constraints/` | Validation contraintes | Prose + Constraints | Violations |
| `prescriptions/` | Directives de style | StyleProfile | Prompt injection text |
| `benchmark/` | Benchmarking | Config | Comparison reports |
| `calibration/` | Normalisation scores | Raw scores | Calibrated scores |

### Couches architecturales

```
┌─────────────────────────────────────────────────────┐
│                   VALIDATION LAYER                    │
│   validation/ + proofpack/ + benchmark/ + calibration │
├─────────────────────────────────────────────────────┤
│                   ORCHESTRATION LAYER                 │
│        engine.ts + pipeline/ + cde/ + genesis-v2/     │
├─────────────────────────────────────────────────────┤
│                   SCORING LAYER                       │
│    oracle/ + quality/ + gates/ + constraints/         │
├─────────────────────────────────────────────────────┤
│                   GENERATION LAYER                    │
│    genius/ + polish/ + filter/ + prescriptions/       │
├─────────────────────────────────────────────────────┤
│                   ANALYSIS LAYER                      │
│  voice/ + metaphor/ + phonetic/ + symbol/ + silence/  │
│  temporal/ + semantic/ + phantom/ + authenticity/      │
├─────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE LAYER                │
│      runtime/ + input/ + core/ + utils/ + compat/     │
└─────────────────────────────────────────────────────┘
```

---

## 8. RECOMMANDATIONS

### PRIO HAUTE

| ID | Recommandation | Impact |
|----|---------------|--------|
| R-01 | **Unifier les seuils SAGA_READY** dans un fichier unique (`core/thresholds.ts`) | Elimine DOUBLON-04, reduit risque de desynchronisation |
| R-02 | **Clarifier frontiere CDE vs continuity-plan** | Elimine SUSPECT-01, evite 2 systemes de propagation |
| R-03 | **Centraliser `computeMinAxis()`** dans utils ou core | Elimine DOUBLON-03 (3 implementations identiques) |

### PRIO MOYENNE

| ID | Recommandation | Impact |
|----|---------------|--------|
| R-04 | Centraliser estimation tokens dans `utils/token.ts` | Elimine DOUBLON-01 |
| R-05 | Deplacer `sortedStringify` dans `utils/hash.ts` | Elimine DOUBLON-02 |
| R-06 | Documenter que `s-score.ts` est legacy, `s-oracle-v2.ts` fait autorite | Clarifie SUSPECT-03 |
| R-07 | Documenter le path Genesis V2 vs path standard dans un ADR | Clarifie SUSPECT-02 |

### PRIO BASSE

| ID | Recommandation | Impact |
|----|---------------|--------|
| R-08 | Verifier si `compat/` est encore necessaire | Nettoyage potentiel |
| R-09 | Ajouter `index.ts` dans `oracle/axes/` pour exports propres | Hygiene |
| R-10 | Evaluer si `exemplar/` est encore utilise | Nettoyage potentiel |

---

## 9. METRIQUES CLES

| Metrique | Valeur |
|----------|--------|
| **Fichiers source `.ts`** | 194 |
| **Repertoires** | 42 |
| **Fichiers `engine.ts` pipeline** | 16 etapes |
| **Appels LLM (happy path)** | ~8 |
| **Axes esthetiques** | 18 |
| **Macro-axes** | 5 (ECC 33%, AAI 25%, RCI 17%, SII 15%, IFI 10%) |
| **Methodes SovereignProvider** | 8 |
| **Pipelines distincts** | 4 (engine, pipeline, genesis-v2, cde) |
| **Doublons identifies** | 4 |
| **Suspects identifies** | 4 |
| **Recommandations** | 10 (3 haute, 4 moyenne, 3 basse) |
| **Fichiers .bak dans src/** | 0 |
| **Orphelins potentiels** | 3 modules a verifier |
| **Fichiers SEALED** | 1 (`engine.ts`) |
| **Modules FROZEN** | 0 dans sovereign-engine (genome/sentinel sont dans d'autres packages) |

---

## ANNEXE : Composition Macro-Axes

```
ECC (Emotional-Coherence Composite)  = 33%
  ← emotional-arc, tension-management, subtext-depth

AAI (Aesthetic-Authenticity Index)    = 25%
  ← banality, ai-detection, authenticity, voice-conformity

RCI (Rhythm-Craft Index)             = 17%
  ← rhythm, sentence-variety, phonetic-texture

SII (Structural-Integrity Index)     = 15%
  ← narrative-coherence, constraint-compliance, temporal-logic

IFI (Imagery-Freshness Index)        = 10%
  ← metaphor-novelty, sensory-density, symbol-recurrence
```

---

*Rapport genere le 2026-03-14 — Scan read-only, aucun fichier source modifie.*
