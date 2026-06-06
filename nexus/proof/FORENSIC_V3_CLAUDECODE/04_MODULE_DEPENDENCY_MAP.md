# 04 — MODULE DEPENDENCY MAP (dépendances réelles, prouvées par imports)

## Graphe d'imports observés (par grep)
```
ENTRYPOINTS LIVE
  bin/omega-pipe.mjs ──► @omega/cli-runner (gateway/cli-runner) ──► lang tables
  bin/omega-run.mjs  ──► dist/runner ◄build─ src/runner (MOCK, n'importe rien de réel)
  python scripts/metrology/*.py ──► (urllib) Ollama  [aucun import TS]

book-factory (DRAFT, self-contained)
  generate-real-demo ─► book-orchestrator ─► { continuity-oracle, context-manager,
                                               story-state, chapter-generator, book-planner }
  book-canon-adapter ─► @omega/canon-kernel + @omega/truth-gate
  story-state        ─► @omega/canon-kernel (canonicalize, sha256)
  continuity-oracle  ─► (book-canon-adapter)  [seulement si adapter passé ; pas en prod]
  ⚠ book-orchestrator NE dépend PAS de book-canon-adapter (V3)

sovereign-engine (lib, off-path)
  ◄── signal-registry (codegen IDL)
  ◄── omega-forge, omega-p0 (consumer tests)
  ─► dedale/reset-session ─► (child_process) Ollama daemon

contracts-canon (registry hub gouvernance)
  ◄références── omega-segment-engine, integration-nexus-dep, orchestrator-core  (métadonnées registre)

src/ (couche test)
  src/gates/fact-classifier ─► src/canon (validatePredicate)

GATEWAY (totalement isolé des packages — V1)
  gateway/src/gates/{canon_engine, truth_gate, ripple_engine} ─► gates/index (barrel) + tests
  gateway/src/memory/memory_layer_nasa/* ─► (interne) ; index.ts N'exporte PAS tiering/decay/digest/hybrid (V2)
  gateway/cli-runner ─► (autonome, ne dépend pas du reste de gateway/src)

ORPHELINS (zéro importeur externe)
  packages/decision-engine            [grep: 0 importeur]
  gateway/src/gates/canon_engine.ts   [NCR existante]
  gateway/.../memory_layer_nasa       [V1]
  OMEGA_PHASE18/20/20_1 stores        [tests only]
```

## Tableau dépendances clés
| Module | Dépend de | Dépend de lui (callers réels) |
|---|---|---|
| `canon-kernel` | (rien d'OMEGA) | book-factory (adapter, story-state) |
| `truth-gate` (pkg) | — | book-canon-adapter |
| `book-factory` | canon-kernel, truth-gate, Ollama | **personne (externe)** |
| `sovereign-engine` | signal-registry types, Ollama (dedale) | signal-registry, omega-forge, omega-p0 (tests) |
| `src/canon` | — | `src/gates/fact-classifier` |
| `gateway memory_layer_nasa` | (interne) | **personne (V1)** |
| `gateway canon_engine` | (interne) | **personne (NCR)** |
| `decision-engine` | — | **personne** |
| `omega-segment-engine` | — | contracts-canon (registre) |
| `integration-nexus-dep` | genome/mycelium adapters | contracts-canon (registre) |
| `contracts-canon` | (références registre) | hub gouvernance |

## Lecture
- **Couplage réel minimal** : le seul cluster applicatif vivant est `book-factory → canon-kernel/truth-gate`. Tout le reste est soit registre/cert/test, soit orphelin.
- **`contracts-canon` est un faux-positif de couplage** : il référence beaucoup de packages pour les *cataloguer* (métadonnées d'invariants), pas pour les exécuter.
- **gateway = silo** : aucune arête entre `gateway/src/{gates,memory}` et `packages/**` ni `src/**`. Le World Model et les canons gateway sont structurellement inatteignables depuis le code vivant.
