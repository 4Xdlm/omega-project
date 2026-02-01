# ROADMAP LINKAGE

## Overview

Ce document définit les liens formels entre BUILD, GOUVERNANCE et EXPLOITATION.

**Standard**: NASA-Grade L4
**Version**: 1.0.0
**Date**: 2026-02-01

---

## 1. Architecture de liaison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 OMEGA SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           BUILD (ROADMAP A)                          │   │
│  │  ┌─────────┐  ┌──────────────────┐  ┌─────────────────────────────┐ │   │
│  │  │ ORACLE  │  │ DECISION_ENGINE  │  │ WAIVER / PRECISION GATES   │ │   │
│  │  │ v1.1    │  │ v1.1             │  │ SEALED                     │ │   │
│  │  └────┬────┘  └────────┬─────────┘  └──────────────┬──────────────┘ │   │
│  │       │                │                           │                 │   │
│  │       └────────────────┼───────────────────────────┘                 │   │
│  │                        │                                             │   │
│  │                        ▼ IMMUTABLE OUTPUTS                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           │ READ-ONLY INTERFACE                            │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      GOUVERNANCE (ROADMAP B)                         │   │
│  │  ┌─────────┐  ┌──────────────────┐  ┌─────────────────────────────┐ │   │
│  │  │ OBSERVE │  │ DETECT           │  │ REPORT                     │ │   │
│  │  │         │  │                  │  │                             │ │   │
│  │  └────┬────┘  └────────┬─────────┘  └──────────────┬──────────────┘ │   │
│  │       │                │                           │                 │   │
│  │       └────────────────┼───────────────────────────┘                 │   │
│  │                        │                                             │   │
│  │                        ▼ EVENTS + ALERTS                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           │ ESCALATION                                      │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      EXPLOITATION (HUMAIN)                           │   │
│  │  ┌─────────┐  ┌──────────────────┐  ┌─────────────────────────────┐ │   │
│  │  │ REVIEW  │  │ DECIDE           │  │ EXECUTE                    │ │   │
│  │  │         │  │                  │  │                             │ │   │
│  │  └─────────┘  └──────────────────┘  └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Interfaces formelles

### BUILD → GOUVERNANCE

| Interface | Direction | Format | Contrat |
|-----------|-----------|--------|---------|
| Phase tags | B→G | Git tag | Immutable reference |
| Manifests | B→G | SHA256 file | Hash verification |
| Outputs | B→G | JSON | Schema validated |
| RUN_ID | B→G | Text file | Deterministic source |

### GOUVERNANCE → EXPLOITATION

| Interface | Direction | Format | Contrat |
|-----------|-----------|--------|---------|
| Events | G→E | NDJSON | Append-only |
| Reports | G→E | JSON | Schema validated |
| Alerts | G→E | Notification | SLA bounded |

### EXPLOITATION → BUILD

| Interface | Direction | Format | Contrat |
|-----------|-----------|--------|---------|
| **NONE** | - | - | BUILD is immutable |

### EXPLOITATION → GOUVERNANCE

| Interface | Direction | Format | Contrat |
|-----------|-----------|--------|---------|
| Decisions | E→G | Override/Waiver | 5 conditions |
| Rollback | E→G | Rollback plan | Human approval |

---

## 3. Mapping des artefacts

### BUILD Artefacts (SEALED)

| Artefact | Roadmap | Location |
|----------|---------|----------|
| ORACLE v1.1 | A (Phase C) | src/sentinel/oracle.ts |
| DECISION_ENGINE v1.1 | A (Phase C) | src/sentinel/decision_engine.ts |
| WAIVER_CHECK v1.1 | A (Phase C) | src/sentinel/waiver_check.ts |
| Q_MANIFEST.sha256 | A (Phase Q) | nexus/proof/phase_q_precision/ |
| C_MANIFEST.sha256 | A (Phase C) | nexus/proof/phase_c_sentinel/ |

### GOUVERNANCE Artefacts

| Artefact | Roadmap | Location |
|----------|---------|----------|
| GOVERNANCE_EVENT_SCHEMA | B (B-0) | schemas/ |
| GOVERNANCE_INVARIANTS | B (B-0) | docs/governance/ |
| Event templates | B (D-J) | templates/*/ |
| Governance tests | B (B-0/H) | tests/governance/ |

---

## 4. Règles de liaison

### LINK-001: No back-channel
Aucune communication directe EXPLOITATION → BUILD.

### LINK-002: Hash verification
Toute référence cross-domain = hash vérifiable.

### LINK-003: Event-driven only
Gouvernance réagit aux événements, jamais proactive.

### LINK-004: Human boundary
Seul l'humain peut décider de modifier/rollback.

### LINK-005: Audit complete
Toute interaction cross-domain = tracée.

---

## 5. Matrice de responsabilité

| Action | BUILD | GOUVERNANCE | EXPLOITATION |
|--------|-------|-------------|--------------|
| Create truth | ✅ | ❌ | ❌ |
| Seal phase | ✅ | ❌ | ❌ |
| Observe | ❌ | ✅ | ✅ |
| Detect drift | ❌ | ✅ | ❌ |
| Report | ❌ | ✅ | ❌ |
| Alert | ❌ | ✅ | ❌ |
| Decide | ❌ | ❌ | ✅ |
| Override | ❌ | ❌ | ✅ |
| Rollback | ❌ | ❌ | ✅ |

---

**Status**: COMPLETE
