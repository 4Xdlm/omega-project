# ROADMAP GOVERNANCE

## Overview

Cette roadmap définit le système de gouvernance OMEGA, complément du BUILD.

**Standard**: NASA-Grade L4
**Version**: 1.0.0
**Date**: 2026-02-01

---

## Plans Implemented

### B-0: Init Gouvernance
- [x] GOVERNANCE_SCOPE.md — Frontières et autorité
- [x] GOVERNANCE_INVARIANTS.md — 15 invariants
- [x] GOVERNANCE_EVENT_SCHEMA.json — Schema base
- [x] schema.test.ts — 20 tests

### D: Runtime Governance
- [x] RUNTIME_EVENT.template.json — Format événement
- [x] GOVERNANCE_LOG.template.ndjson — Format log
- [x] RUN_INDEX.template.sha256 — Index runs
- [x] runtime.test.ts — 9 tests

### E: Drift Detection
- [x] DRIFT_MODEL.md — Types et escalade
- [x] DRIFT_REPORT.template.json — Format rapport

### F: Non-Regression
- [x] NON_REGRESSION.md — Principes
- [x] REGRESSION_MATRIX.template.json — Format matrice

### G: Abuse Control
- [x] ABUSE_CASES.md — Catalogue 5 cas
- [x] MISUSE_EVENT.template.json — Format événement

### H: Human Override
- [x] HUMAN_OVERRIDE.md — 5 conditions obligatoires
- [x] OVERRIDE.template.json — Format override
- [x] override.test.ts — 8 tests

### I: Versioning
- [x] VERSIONING_CONTRACT.md — Règles compatibilité
- [x] VERSION_CONTRACT.template.json — Format version

### J: Incident & Rollback
- [x] INCIDENT_PROCESS.md — Processus complet
- [x] INCIDENT.template.md — Template post-mortem
- [x] ROLLBACK_PLAN.template.json — Format rollback

---

## Arborescence

```
docs/governance/
├── GOVERNANCE_SCOPE.md
├── GOVERNANCE_INVARIANTS.md
├── DRIFT_MODEL.md
├── NON_REGRESSION.md
├── ABUSE_CASES.md
├── HUMAN_OVERRIDE.md
├── VERSIONING_CONTRACT.md
└── INCIDENT_PROCESS.md

schemas/
└── GOVERNANCE_EVENT_SCHEMA.json

templates/
├── runtime/
│   ├── RUNTIME_EVENT.template.json
│   ├── GOVERNANCE_LOG.template.ndjson
│   └── RUN_INDEX.template.sha256
├── drift/
│   └── DRIFT_REPORT.template.json
├── regression/
│   └── REGRESSION_MATRIX.template.json
├── misuse/
│   └── MISUSE_EVENT.template.json
├── override/
│   └── OVERRIDE.template.json
├── version/
│   └── VERSION_CONTRACT.template.json
├── incident/
│   └── INCIDENT.template.md
└── rollback/
    └── ROLLBACK_PLAN.template.json

tests/governance/
├── schema.test.ts
├── runtime.test.ts
└── override.test.ts
```

---

## Invariants clés

| ID | Invariant |
|----|-----------|
| INV-GOV-001 | Read-only BUILD |
| INV-GOV-002 | Append-only logs |
| INV-GOV-003 | Human escalation |
| INV-GOV-004 | No silent drift |
| INV-GOV-005 | Hashable events |

---

## Métriques

| Métrique | Valeur |
|----------|--------|
| Documents | 8 |
| Templates | 10 |
| Schemas | 1 |
| Tests | 37 |
| Invariants | 15 |

---

**Status**: COMPLETE
