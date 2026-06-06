# 02 — CALL GRAPH (active runtime réel)

Le « graphe d'appel » de la machine **qui tourne**, pas de la machine rêvée. Trois runtimes coexistent ; aucun entrypoint unifié.

## A. Runtime VIVANT — Python metrology (forge + score)
C'est ce qui génère et score aujourd'hui (100 % des commits récents).
```
python scripts/metrology/forge_*.py            (forge_length_enforced.py, forge_chirurgicale.py,
   |                                             n6_atelier.py, n7_forge_semantique.py,
   |                                             rosetta_bridge_regen_gemma4.py)
   └─ urllib POST http://localhost:11434/api/generate   → Ollama gemma4:31b   (forge_length_enforced.py:26)

python scripts/metrology/n5_radar_*.py / n2_judge_hunt.py / calibration_check.py
   ├─ POST /api/embeddings  → Ollama bge-m3          (radar LOAO scoring)
   └─ POST /api/generate    → gemma4:31b             (LLM-judge)
   → résultats JSON: docs/research/, omega-autopsie/results_rosetta/
```
Gate amont : `calibration_check.py` = EMP-19 Power-On Self-Test (profil de calibration requis avant mesure).

## B. Runtime TS réel — analyse émotionnelle
```
bin/omega-pipe.mjs → gateway/cli-runner/dist/cli/runner.js → cli/commands/analyze.ts
   → tables mots-clés lang/{fr,en,es,de} → scores Plutchik → stdout NDJSON
```
Package `@omega/cli-runner` v3.16.0 (`bin: omega`). Seul chemin TS qui fait un vrai travail bout-en-bout.

## C. Runtime TS trompe-l'œil — runner générique (MOCK)
```
bin/omega-run.mjs → dist/runner/main.js (build de src/runner/) → src/runner/pipeline.ts
   → mockGenerate()  echoes intent       (pipeline.ts:167)
   → mockTruthGate() returns passed:true (pipeline.ts:197)
   → mockDelivery()  wraps unchanged     (pipeline.ts:234)
   → artefacts/runs/**
```
Squelette déterminisme/hash-chain, **pas un vrai générateur**. À ne pas confondre avec un moteur.

## D. Bibliothèque de forge TS (buildable mais OFF live path)
```
packages/sovereign-engine: runSovereignForge(packet, provider)   (src/index.ts:21)
   → SymbolMap → EmotionBrief → draft → passes (oracle, gates, microsurgery, dedale…)
   → provider INJECTÉ (le moteur ne fait AUCUN appel LLM lui-même)
   ⚠ aucun entrypoint live ne câble un provider réel → fonction faite par (A) Python aujourd'hui
```

## E. Boucle book-factory (DRAFT, démo seulement)
```
scripts/.../generate-real-demo.ts → book-orchestrator.generateBook()   (book-orchestrator.ts:54-102)
   pour chaque chapitre:
     → checkContinuity(current, delta, spec)        (continuity-oracle.ts ; SANS adapter → LEAK inerte)
     → buildContextDigest(current, spec, plan, book) (context-manager.ts:15-39 ; ≤600 mots)
     → chapterSpecToIntent → generator.generate()    (Ollama gemma4:31b OU déterministe)
     → story-state.append(events)                    (Bible mutable mise à jour)
     → previousTail = prose.slice(-180)              (continuité locale 180 chars)
   ⚠ BookCanonAdapter JAMAIS instancié ici (V3) → pas de knows()/épistémique/auto-recall dans la boucle réelle
```

## Keystones : ON-path vs OFF-path
| Package | Sur le runtime actif ? |
|---|---|
| `gateway/cli-runner` | **ON** (omega analyze) |
| `scripts/metrology` (Python) | **ON** (forge + score) |
| `sovereign-engine/dedale/reset-session` | **ON** (wake daemon Ollama) |
| `sovereign-engine` (forge) | OFF (lib, provider non câblé) |
| `book-factory` | OFF (démo/test, untracked) |
| `omega-segment-engine` | OFF (registry metadata only) |
| `scribe-engine`, `creation-pipeline`, `genesis-planner`, `orchestrator-core`, `decision-engine`, `signal-registry`, `truth-gate`, `canon-kernel`, `search`, `mycelium`, `integration-nexus-dep` | OFF (tests + cert + registry) |
| `genome` | OFF / FROZEN |
| `gateway/memory_layer_nasa` (World Model) | OFF / ORPHAN |

## Implication
Le « moteur OMEGA » au sens où l'Architecte le conçoit (Bible + sous-agents + délestage + forge souveraine) **n'existe pas en un seul flux exécuté**. Il est éclaté : forge en Python, Bible légère en TS draft, World Model lourd dormant, forge souveraine TS débranchée.
