# 01 — ENGINE INVENTORY

Inventaire moteur, classé par réalité d'exécution. Source CSV exhaustif : `01_ROOT_TREE_CLASSIFICATION.csv`.

## Constat structurant : DEUX réalités parallèles
1. **« Moteur de référence » TypeScript** — `packages/*` (45) + `src/` + `gateway/`. Deux entrypoints CLI réels existent, mais le runner générique `src/runner/pipeline.ts` est **100 % mock** (echo + TruthGate toujours PASS, `pipeline.ts:167,197,234`). Le seul vrai travail TS bout-en-bout = la **CLI d'analyse émotionnelle** (`gateway/cli-runner` → `omega analyze`).
2. **Runtime VIVANT (juin 2026)** — scripts **Python** `scripts/metrology/*.py` appelant **`gemma4:31b` + `bge-m3` via Ollama (localhost:11434)**. C'est là qu'OMEGA génère (forge) et score (N5 radar / juge LLM) aujourd'hui. ~100 % des commits des ~10 derniers jours touchent `scripts/`, `docs/research`, `omega-autopsie` — pas les packages TS.

## A. ACTIVE_RUNTIME (réellement exécuté)
| Module | Rôle réel | Preuve |
|---|---|---|
| `scripts/metrology/*.py` | Forge (`forge_length_enforced.py`, `n6_atelier.py`, `rosetta_bridge_regen_gemma4.py`) + scoring (`n5_radar_reference.py`, `n2_judge_hunt.py`) + EMP-19 PoST (`calibration_check.py`) | POST Ollama `forge_length_enforced.py:26` ; commits 2026-06-04/05 |
| `gateway/cli-runner` → `bin/omega-pipe.mjs` | `omega analyze` : scoring émotionnel Plutchik déterministe FR/EN/ES/DE | `@omega/cli-runner` v3.16.0 `bin: omega` |
| `omega-autopsie/full_work_analyzer_v4.py` | Analyseur corpus 30 features | working tree modifié |

## B. ACTIVE_RUNTIME_LIB (buildable, vivant, mais OFF live path)
| Module | Note |
|---|---|
| `packages/sovereign-engine` | `runSovereignForge(packet, provider)` `src/index.ts:21` ; provider INJECTÉ (ne fait aucun appel LLM lui-même) ; aucun entrypoint ne câble un provider réel → sa fonction (forge) est faite par Python aujourd'hui |
| `packages/canon-kernel` | Seule primitive canon narrative consommée par du code package (via book-factory) |
| `packages/contracts-canon` | Hub registre des contrats/invariants (gouvernance) |
| `src/canon/` | Store claims+lignée, consommé par `src/gates` (couche test) |

## C. DRAFT / NON CÂBLÉ (codé+testé mais isolé)
| Module | Note |
|---|---|
| `packages/book-factory` | story-state + book-canon-adapter + context-manager + continuity-oracle + orchestrator ; 46 tests ; **untracked `??`** ; aucun appelant externe ; non câblé à un entrypoint |

## D. ORPHAN (certifié mais zéro consommateur)
| Module | Preuve |
|---|---|
| `gateway/src/memory/memory_layer_nasa/` | « World Model » : 0 importeur (V1), offload non exporté (V2) ; cert `MEMORY_LAYER_CERTIFICATION.md` |
| `gateway/src/gates/canon_engine.ts` | `NCR_CANON_ENGINE_JUNCTION_ORPHAN.md` ; 0 caller prod |
| `gateway/src/gates/ripple_engine.ts` | même sous-système gateway dormant |
| `packages/decision-engine` | 0 importeur externe (grep) |
| `OMEGA_PHASE18/20/20_1` canon/memory stores | importés seulement par leurs tests |

## E. BENCH_ONLY (harnais cert/test)
`packages/gold-cli`, `gold-master`, `gold-internal`, `gold-suite`, `orchestrator-core` (importé par contracts-canon + gold-*).

## F. DORMANT (lib buildable, hors live path)
`scribe-engine`, `creation-pipeline`, `genesis-planner`, `integration-nexus-dep`, `omega-segment-engine`, `signal-registry`, `truth-gate`, `sentinel-judge`, `search`, `mycelium`, `emotion-gate`, `omega-*` (metrics/observability/aggregate-dna/runner/forge/p0/governance/release/bridge), `plugin-*`, `hardening`, `performance`, `phase-q`, `proof-pack`, `style-emergence-engine`.

## G. FROZEN / SEALED
`gateway/sentinel/` (Phase 27), `packages/genome` (SEALED 2026-01-07), `packages/mycelium-bio` (cert v1.0.0), `gateway/src/profiles.ts` THE_SKEPTIC.

## H. SNAPSHOT / LEGACY / GARAGE (masse morte)
Tous `OMEGA_PHASE*`, `OMEGA_MASTER_DOSSIER_*`, `OMEGA_SNAPSHOTS`, `EXPORT_FULL_PACK`, `omega-v44*`, `sprint28_5`, `omega-phase23`, `omega-nexus*`, `src-tauri`, `genius-integration`, `scale_out`, `omega-narrative-genome`, `dist/`. Dates 2026-01..02 ou build outputs.

## UNKNOWN déclaré
- `packages/book-factory` rôle runtime (untracked, non commité).
- `packages/omega-segment-engine` couverture test (non confirmée au scan).
- `sentinel-judge` « ACTIVE » doctrinal : aucun appelant live trouvé.
