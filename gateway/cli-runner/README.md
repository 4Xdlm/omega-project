# OMEGA CLI_RUNNER

## Phase 16.0 — NASA-Grade CLI Tool

> Outil ligne de commande pour tester OMEGA sans UI

## 📋 Commandes

| Commande | Description | Routing |
|----------|-------------|---------|
| `omega analyze <file>` | Analyse émotionnelle | NEXUS |
| `omega compare <f1> <f2>` | Comparaison de textes | NEXUS |
| `omega export <project>` | Export de projet | DIRECT |
| `omega batch <dir>` | Traitement batch | NEXUS |
| `omega health` | Diagnostic système | DIRECT |
| `omega version` | Affiche la version | DIRECT |
| `omega info` | Informations système | DIRECT |

## 🔒 Invariants

| ID | Description | Status |
|----|-------------|--------|
| INV-CLI-01 | Exit Code Coherent | ✅ PROUVÉ |
| INV-CLI-02 | No Silent Failure | ✅ PROUVÉ |
| INV-CLI-03 | Deterministic Output | ✅ PROUVÉ |
| INV-CLI-04 | Duration Always Set | ✅ PROUVÉ |
| INV-CLI-05 | Contract Enforced | ✅ PROUVÉ |
| INV-CLI-06 | Help Available | ✅ PROUVÉ |

## 🚀 Installation

```bash
npm install
npm test
```

## 📊 Tests

- **Total**: 133 tests
- **Résultat**: 133/133 PASSED ✅

## 🔀 Routing Policy

- **DIRECT**: Compute pur, pas d'IO persistant, pas d'audit
  - `export`, `health`, `version`, `info`
  
- **NEXUS**: Stockage, audit trail, décisions
  - `analyze`, `compare`, `batch`

## 📁 Structure

```
src/cli/
├── constants.ts      # Exit codes, defaults
├── types.ts          # Interfaces CLI
├── contract.ts       # Module Contract
├── parser.ts         # Argument parser
├── runner.ts         # Orchestrateur
├── commands/
│   ├── analyze.ts    # omega analyze
│   ├── compare.ts    # omega compare
│   ├── export.ts     # omega export
│   ├── batch.ts      # omega batch
│   ├── health.ts     # omega health
│   └── info.ts       # omega version/info
└── index.ts          # Entry point
```

## 📦 Version

- **CLI**: v3.16.0
- **OMEGA Core**: v3.15.0-NEXUS_CORE-STABLE

---

*OMEGA Project — Phase 16.0 CLI_RUNNER*
*NASA-Grade Certification*
