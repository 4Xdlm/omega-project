# LR1 — MODULE INVENTORY

## packages/ — 30 Packages, 408 Files

### FROZEN Modules

| Package | Files | Status | Sealed |
|---------|-------|--------|--------|
| `genome` | 19 | SEALED | 2026-01-07 |
| `mycelium` | 15 | SEALED | 2026-01-09 |

### High-Priority Packages (>20 files)

| Package | Files | Description |
|---------|-------|-------------|
| `integration-nexus-dep` | 45 | Pipeline router, adapters |
| `emotion-gate` | 37 | Emotion processing gate |
| `truth-gate` | 36 | Content governance gate |
| `orchestrator-core` | 24 | Orchestration engine |
| `canon-kernel` | 24 | Canonical forms kernel |
| `search` | 24 | Search engine |

### Medium Packages (10-20 files)

| Package | Files | Description |
|---------|-------|-------------|
| `sentinel-judge` | 17 | Policy validation |
| `headless-runner` | 16 | Runner harness |
| `oracle` | 15 | Oracle engine |
| `omega-segment-engine` | 15 | Segmentation |
| `hardening` | 14 | Security utilities |
| `performance` | 14 | Performance monitoring |
| `mycelium-bio` | 13 | Biological validation |

### Small Packages (<10 files)

| Package | Files | Description |
|---------|-------|-------------|
| `contracts-canon` | 10 | Canon contracts |
| `gold-cli` | 10 | Gold CLI |
| `gold-internal` | 10 | Gold internal |
| `proof-pack` | 9 | Proof packaging |
| `omega-aggregate-dna` | 8 | DNA aggregation |
| `omega-bridge-ta-mycelium` | 7 | TA-Mycelium bridge |
| `gold-master` | 7 | Gold master |
| `gold-suite` | 7 | Gold suite |
| `omega-observability` | 6 | Observability |
| `mod-narrative` | 2 | Narrative module |
| `hostile` | 1 | Test stub |
| `sbom` | 1 | SBOM manifest |
| `schemas` | 1 | Schema validator |
| `trust-version` | 1 | Version tracking |

---

## gateway/ — 9 Modules, 246 Files

### FROZEN

| Module | Files | Status |
|--------|-------|--------|
| `sentinel` | 12 | FROZEN |

### Active Modules

| Module | Files | Description |
|--------|-------|-------------|
| `wiring` | 45 | Wiring framework |
| `resilience` | 33 | Chaos + temporal verification |
| `cli-runner` | 30 | CLI command executor |
| `quarantine` | 13 | Quarantine system |
| `facade` | 12 | Gateway facade |
| `chaos` | 12 | Chaos injection |
| `limiter` | 12 | Rate limiting |
| `src` | 67 | Gateway core logic |

---

## src/ — 18 Modules, 181 Files

| Module | Files | Description |
|--------|-------|-------------|
| `oracle` | 30 | Oracle/MUSE engine |
| `genesis` | 23 | Genesis narrative forge |
| `memory` | 19 | Memory system |
| `canon` | 13 | Canonical system |
| `scribe` | 11 | Narrative recording |
| `orchestrator` | 11 | Orchestration |
| `governance` | 9 | Governance system |
| `delivery` | 9 | Delivery pipeline |
| `gates` | 9 | Content gates |
| `runner` | 9 | Task runner |
| `sentinel` | 9 | Sentinel rules engine |
| `providers` | 7 | Provider adapters |
| `replay` | 7 | Record/replay |
| `auditpack` | 5 | Audit utilities |
| `memory-write-runtime` | 4 | Write runtime |
| `shared` | 3 | Shared utilities |
| `text_analyzer` | 3 | Text analysis |

---

## nexus/ — 18 Modules, 87 Files

| Module | Files | Description |
|--------|-------|-------------|
| `raw` | 18 | Raw storage backend |
| `proof-utils` | 16 | Proof utilities |
| `atlas` | 14 | Index store |
| `ledger` | 12 | Event ledger |
| `shared` | 8 | Nexus shared utilities |
| `bench` | 5 | Benchmarking |
| `tooling` | 4 | Tool support |
| `src` | 9 | Nexus core |

---

## genesis-forge/src/ — 14 Files

| Path | Description |
|------|-------------|
| `genesis/core/prism.ts` | Core prism engine |
| `genesis/core/emotion_bridge.ts` | Emotion binding |
| `genesis/core/omega_converter.ts` | Type conversion |
| `genesis/core/omega_types.ts` | Type definitions |
| `genesis/engines/provider_*.ts` | Provider implementations |
| `genesis/engines/drafter.ts` | Drafter engine |
| `genesis/judges/j1_emotion_binding.ts` | Judge 1 |
| `genesis/config/defaults.ts` | Configuration |
| `genesis/types/index.ts` | Type exports |

---

## Root Level — 46 Files

- 23 test files (`*_test.ts`)
- 23 source files (utilities, configs)
- 2 vitest config files

---

## SUMMARY STATISTICS

| Metric | Value |
|--------|-------|
| Total TypeScript Files | 969 |
| Packages | 30 |
| Gateway modules | 9 |
| Src modules | 18 |
| Nexus modules | 18 |
| FROZEN modules | 3 |
| FROZEN files | 46 |
