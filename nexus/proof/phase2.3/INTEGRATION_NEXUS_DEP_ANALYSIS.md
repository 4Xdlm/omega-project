# INTEGRATION_NEXUS_DEP_ANALYSIS.md
# Phase 2.3 - Package Analysis Report

**Date**: 2026-01-17
**Package**: @omega/integration-nexus-dep
**Version**: 0.7.0
**Mode**: READ-ONLY ANALYSIS

---

## 1. INVENTORY

### 1.1 Directory Structure

```
packages/integration-nexus-dep/
├── src/
│   ├── adapters/       (5 files)
│   ├── connectors/     (3 files)
│   ├── contracts/      (4 files)
│   ├── pipeline/       (4 files)
│   ├── router/         (4 files)
│   ├── scheduler/      (4 files)
│   ├── translators/    (4 files)
│   └── index.ts
├── test/               (12 files)
└── package.json
```

### 1.2 Source Files (src/ only)

| File | LOC |
|------|-----|
| scheduler/scheduler.ts | 390 |
| pipeline/executor.ts | 349 |
| adapters/orchestrator.adapter.ts | 349 |
| pipeline/builder.ts | 319 |
| translators/module.ts | 297 |
| contracts/types.ts | 272 |
| adapters/mycelium-bio.adapter.ts | 271 |
| connectors/cli.ts | 246 |
| scheduler/policies.ts | 244 |
| translators/input.ts | 236 |

### 1.3 LOC Summary

| Category | Files | LOC |
|----------|-------|-----|
| **src/** | 29 | 5,535 |
| **test/** | 12 | 6,006 |
| **Total** | 41 | 11,541 |

### 1.4 Top 10 Files (by LOC)

1. test/integration.test.ts (742)
2. test/red-team.test.ts (671)
3. test/e2e.test.ts (639)
4. test/performance.test.ts (604)
5. test/adapters.test.ts (559)
6. test/edge-cases.test.ts (532)
7. test/stress.test.ts (513)
8. test/determinism.test.ts (479)
9. test/pipeline.test.ts (470)
10. src/scheduler/scheduler.ts (390)

---

## 2. RESPONSIBILITY MAP

### 2.1 Sub-modules Identified

| Module | Responsibility | Files | LOC |
|--------|---------------|-------|-----|
| **contracts** | Types, IO schemas, errors | 4 | 648 |
| **adapters** | READ-ONLY wrappers for external modules | 5 | 1,206 |
| **connectors** | CLI and filesystem I/O | 3 | 494 |
| **translators** | Data format conversion | 4 | 816 |
| **router** | Request routing and dispatch | 4 | 595 |
| **pipeline** | Execution flow orchestration | 4 | 863 |
| **scheduler** | Job scheduling with policies | 4 | 820 |

### 2.2 Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                      index.ts (entry point)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   SCHEDULER   │   │    ROUTER     │   │   PIPELINE    │
│  (job queue)  │   │  (dispatch)   │   │  (execution)  │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        │                   ▼                   │
        │           ┌───────────────┐           │
        └──────────►│   ADAPTERS    │◄──────────┘
                    │ (READ-ONLY)   │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  TRANSLATORS  │   │   CONTRACTS   │   │  CONNECTORS   │
│ (data format) │   │  (types/io)   │   │  (CLI/FS)     │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 3. INTERNAL DEPENDENCY GRAPH

### 3.1 Import Map

```
contracts ──────────────────────────────────────────────────┐
    │                                                       │
    ├──► adapters ◄─────────────────────────────────────────┤
    │        │                                              │
    │        ├──► pipeline ◄────────────────────────────────┤
    │        │        │                                     │
    │        │        └──► scheduler                        │
    │        │                                              │
    │        └──► router ◄──────────────────────────────────┘
    │
    └──► translators

connectors (standalone - no internal deps)
```

### 3.2 Detailed Dependencies

| Module | Depends On |
|--------|-----------|
| contracts | (none - base layer) |
| adapters | contracts |
| connectors | (none - standalone) |
| translators | contracts, adapters (types only) |
| router | contracts, adapters |
| pipeline | contracts, adapters |
| scheduler | pipeline |

### 3.3 Cycles Detected

**AUCUN** - Le graphe est acyclique (DAG)

---

## 4. PUBLIC API SURFACE

### 4.1 Main Exports (index.ts)

```typescript
// Constants
export const VERSION = "0.7.0";
export const PROFILE = "L4";

// Re-exports (7 sub-modules)
export * from "./contracts/index.js";
export * from "./adapters/index.js";
export * from "./router/index.js";
export * from "./translators/index.js";
export * from "./connectors/index.js";
export * from "./pipeline/index.js";
export * from "./scheduler/index.js";

// Utilities
export function generateRequestId(): string;
export function getTimestamp(): string;
```

### 4.2 Key Public Types/Classes

| Export | Type | Module |
|--------|------|--------|
| NexusRequest | interface | contracts |
| NexusResponse | interface | contracts |
| NexusError | interface | contracts |
| GenomeAdapter | class | adapters |
| MyceliumAdapter | class | adapters |
| MyceliumBioAdapter | class | adapters |
| OrchestratorAdapter | class | adapters |
| Router | class | router |
| PipelineBuilder | class | pipeline |
| PipelineExecutor | class | pipeline |
| JobScheduler | class | scheduler |
| ConsoleWriter | class | connectors |
| FileConnector | class | connectors |

### 4.3 Entry Points

1. **Direct Import**: `import { ... } from "@omega/integration-nexus-dep"`
2. **Adapters**: Wrap external modules (genome, mycelium, mycelium-bio)
3. **Pipeline**: Build and execute analysis pipelines
4. **Scheduler**: Queue and execute jobs with policies

---

## 5. COUPLING/COHESION ASSESSMENT

### 5.1 Score

| Metric | Score | Justification |
|--------|-------|---------------|
| **Coupling** | MODERE | Cross-module imports présents mais via interfaces |
| **Cohésion** | FORT | Chaque sous-module a une responsabilité claire |
| **Overall** | MIXTE | Bon design mais package trop large |

### 5.2 Coupling Details

- **contracts** → 0 deps (EXCELLENT)
- **adapters** → 1 dep (GOOD)
- **connectors** → 0 deps (EXCELLENT)
- **translators** → 2 deps (OK)
- **router** → 2 deps + adapters directs (MODERATE)
- **pipeline** → 2 deps + adapters directs (MODERATE)
- **scheduler** → 1 dep sur pipeline (GOOD)

### 5.3 Risques Concrets

| # | Risque | Impact | Probabilité |
|---|--------|--------|-------------|
| 1 | **Maintenance**: Un changement dans contracts cascade partout | HIGH | HIGH |
| 2 | **Testabilité**: Pipeline et Router importent adapters concrets (pas d'injection) | MEDIUM | MEDIUM |
| 3 | **Évolutivité**: Ajout d'un nouvel adapter nécessite modification de pipeline/router | MEDIUM | HIGH |

---

## 6. REFACTOR PROPOSAL

### Option A: Découpage en 3-4 Packages

```
@omega/nexus-contracts     (contracts)           ~650 LOC
@omega/nexus-adapters      (adapters)            ~1200 LOC
@omega/nexus-core          (router+pipeline)     ~1500 LOC
@omega/nexus-scheduler     (scheduler)           ~820 LOC
@omega/nexus-connectors    (connectors)          ~500 LOC  [OPTIONAL]
@omega/nexus-translators   (translators)         ~800 LOC  [OPTIONAL]
```

| Critère | Score |
|---------|-------|
| **Bénéfice** | Isolation claire, tests indépendants, versionning séparé |
| **Risque** | Complexité de publication, coordination inter-packages |
| **Effort** | MEDIUM (2-3 jours) |

### Option B: Rester Monolithique

| Critère | Score |
|---------|-------|
| **Bénéfice** | Simplicité, un seul point de versionning |
| **Risque** | Croissance difficile à contrôler |
| **Effort** | ZERO |

**Justification**: Le package est déjà bien structuré avec des sous-modules cohérents. La taille (5535 LOC src) est gérable.

### 6.1 Recommandation Finale

```
RECOMMANDATION: OPTION B — RESTER MONOLITHIQUE

RAISONS:
1. Taille raisonnable (5535 LOC src)
2. Structure interne déjà claire et cohérente
3. Aucune dépendance externe @omega (standalone)
4. Pas de cycle de dépendances
5. Tests exhaustifs (12 fichiers, 6006 LOC)

AMÉLIORATION SUGGÉRÉE (sans split):
- Ajouter injection de dépendances dans pipeline/router
- Exposer interfaces au lieu d'imports directs d'adapters
- Cela facilitera testabilité sans restructuration majeure
```

---

## 7. PROOF PACK

### 7.1 Commandes Exécutées

```bash
# LOC par fichier
find packages/integration-nexus-dep -name "*.ts" -not -path "*/node_modules/*" | xargs wc -l | sort -rn

# Structure des répertoires
find packages/integration-nexus-dep -type d -not -path "*/node_modules/*" | sort

# Imports internes
grep -rn "from '\.\|from \"\." packages/integration-nexus-dep/src/

# Exports index.ts
cat packages/integration-nexus-dep/src/index.ts

# Dépendances package
cat packages/integration-nexus-dep/package.json

# Imports cross-module
grep "from \"\.\." packages/integration-nexus-dep/src/*/*.ts

# Count src files
find packages/integration-nexus-dep/src -name "*.ts" -not -path "*/node_modules/*" | wc -l
```

### 7.2 Git Status

```bash
# À vérifier après création du rapport
git status
```

### 7.3 Git Diff

```bash
# À vérifier après création du rapport
git diff --stat
```

---

## SUMMARY

| Metric | Value |
|--------|-------|
| Package | @omega/integration-nexus-dep |
| Version | 0.7.0 |
| Source LOC | 5,535 |
| Test LOC | 6,006 |
| Sub-modules | 7 |
| External @omega deps | 0 |
| Dependency cycles | 0 |
| Recommendation | KEEP MONOLITHIC |

**Standard**: NASA-Grade L4 / DO-178C Level A
