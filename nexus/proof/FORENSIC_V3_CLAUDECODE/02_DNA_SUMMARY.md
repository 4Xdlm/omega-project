# 02 — DNA SUMMARY (synthèse lisible)

Détail machine : `OMEGA_MODULE_DNA_REGISTRY.yaml`. Ci-dessous la lecture humaine, regroupée par fonction.

## Stores de faits narratifs (la « Bible »)
| Module | Fonction réelle | Câblé ? | Statut |
|---|---|---|---|
| `packages/canon-kernel` | Primitive double-rail truth/interpretation + PROMOTE + hash | OUI via book-factory | **ACTIVE** (SoT décrété) |
| `packages/book-factory/book-canon-adapter` | Enforce rails + épistémique (knows=JTB, isLie=relation) | NON (boucle prod ne l'instancie pas, V3) | **DRAFT** |
| `packages/book-factory/story-state` | Bible mutable = projection event-sourced (payoff_graph) | OUI dans la boucle démo book-factory | **DRAFT** |
| `src/canon` | Claims + lignée + DISPUTED + supersession (le + riche) | OUI mais `src/gates` only | **ACTIVE (test layer)** |
| `gateway/canon_engine` | FactType append-only (« Bible de Francky ») | NON (0 caller, NCR) | **ORPHAN** |
| `packages/genesis-planner` Canon | Canon d'entrée STATIQUE (validation) | interne | **DORMANT (statique)** |
| `OMEGA_PHASE18/20` canon-stores | Prototypes store+snapshot+merkle | tests only | **SNAPSHOT/ORPHAN** |

## World Model / mémoire / délestage
| Module | Fonction réelle | Câblé ? | Statut |
|---|---|---|---|
| `gateway/.../memory_layer_nasa` | Store+engine+digest+snapshot+**tiering(hot/cold)+decay+digest=délestage/compression** | NON (0 importeur V1 ; offload non exporté V2) | **ORPHAN** (doc dit ACTIF) |
| `book-factory/context-manager` | Délestage borné ≤600 mots (« RAG interne ») | OUI (book-orchestrator.ts:78) | **DRAFT vivant** |

## Sous-agents / dispatch / workers
| Module | Fonction réelle | Statut |
|---|---|---|
| `integration-nexus-dep/router` | Dispatcher+Registry+Router = handlers répondeurs invoqués par type (≈ « sous-agents qui répondent aux appels ») | **DORMANT** |
| `OMEGA_PHASE14/worker_manager` | Vrai daemon spawn/ready/kill | **SNAPSHOT (legacy)** |
| `sovereign-engine/dedale/reset-session` | Spawn/wake daemon Ollama (backend, pas agent Bible) | **ACTIVE** |
| `signal-registry` / `contracts-canon` | Catalogues/registres (uniques, pas fédérés) | DORMANT / ACTIVE-lib |

## Moteur de forge / juge
| Module | Fonction réelle | Statut |
|---|---|---|
| `scripts/metrology/*.py` | **LE moteur vivant** : forge gemma4:31b + radar N5 + juge LLM via Ollama | **ACTIVE_RUNTIME** |
| `packages/sovereign-engine` | Forge TS provider-injected (~30 sous-systèmes) | **ACTIVE_LIB mais OFF live path** |
| `src/runner/pipeline.ts` | Runner générique = **MOCK** (echo, TruthGate toujours PASS) | trompe-l'œil |
| `gateway/cli-runner` | `omega analyze` (scoring émotionnel déterministe) | **ACTIVE_RUNTIME** |
| `scribe-engine`, `creation-pipeline`, `genesis-planner`, `orchestrator-core` | Pipeline TS création (genesis→scribe→gates) | DORMANT/BENCH |

## Lecture clé pour l'Architecte
- Les briques « lourdes » (World Model, canon_engine, decision-engine) sont **certifiées mais débranchées**.
- Le code qui **tourne** est soit Python (forge/score), soit le tout récent `book-factory` (Bible légère vivante mais non câblée à un entrypoint), soit `gateway/cli-runner` (analyse émotionnelle).
- Aucun module ne réalise « marqueur unique par mention → rappel automatique » : c'est du DESIGN (voir `03_ENTITY_MARKERS_SCAN.md`).
