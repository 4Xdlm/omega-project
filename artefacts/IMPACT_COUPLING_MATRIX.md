# OMEGA IMPACT & COUPLING MATRIX
# Generated: 2026-01-24
# By: Claude EXECUTOR OMEGA

---

## Key Question

> "If this module changes, what breaks elsewhere?"

This matrix identifies CONCEPTUAL dependencies (not just technical imports).

---

## GENESIS FORGE — Impact Matrix (PROUVE)

| Module Source | Modules Impacted | Impact Type | Criticality | Notes |
|---------------|------------------|-------------|-------------|-------|
| **EMOTION_BRIDGE** | J1_JUDGE, PRISM, DRAFTER | Emotion vectors, thresholds | CRITIQUE | Normalization change = cascade |
| **OMEGA_TYPES** | EMOTION_BRIDGE, OMEGA_CONVERTER, J1_JUDGE | Data structures | CRITIQUE | Interface contracts |
| **OMEGA_CONVERTER** | EMOTION_BRIDGE (indirect) | Bidirectional mapping | MOYEN | Losslessness critical |
| **PRISM** | J1_JUDGE (can use scores) | Multi-axis scoring | FAIBLE | Weakly coupled |
| **DRAFTER** | None internal | Generation | FAIBLE | Terminal point |
| **J1_JUDGE** | None internal | Verdict | FAIBLE | Terminal point |
| **PROVIDERS** | DRAFTER | LLM execution | MOYEN | Stable abstraction |
| **DeterministicRNG** | PROVIDER_MOCK | Tests only | FAIBLE | Isolation OK |
| **TYPES** | ALL modules | Type definitions | CRITIQUE | Foundation |

---

## OMEGA 2.0 — Impact Matrix (SPECIFIE)

| Module Source | Modules Impacted | Impact Type | Criticality | Notes |
|---------------|------------------|-------------|-------------|-------|
| **CANON** | TRUTH_GATE, ORACLE, SCRIBE, MEMORY_* | Source of truth | CRITIQUE | SINGLE POINT OF TRUTH |
| **INTENT_LOCK** | ORACLE, THE_SKEPTIC | Constraints | MOYEN | Author protection |
| **COST_LEDGER** | ORACLE, THE_SKEPTIC | Decision | MOYEN | Choice weights |
| **GENESIS_PLANNER** | SCRIBE, GPS Narratif | Narrative structure | CRITIQUE | Plan -> execution |
| **SCRIBE** | None downstream | Final generation | FAIBLE | Terminal point |
| **ORACLE** | None downstream | Options | FAIBLE | Terminal point |
| **TRUTH_GATE** | Feedback to SCRIBE | Validation | MOYEN | Correction loop |
| **EMOTION_GATE** | Feedback to SCRIBE | Emotional validation | MOYEN | Uses J1_JUDGE |

---

## Critical Coupling Graph

```
                    +-------------------------------------------+
                    |           CRITICAL LEVEL                   |
                    |                                            |
                    |   +---------------+     +---------------+  |
                    |   |  OMEGA_TYPES  |<----|    CANON      |  |
                    |   | (structures)  |     |   (truth)     |  |
                    |   +-------+-------+     +-------+-------+  |
                    |           |                     |          |
                    +-----------|--------------------|----------|
                                |                     |
           +--------------------+-------+------+------+------+
           |                    |       |      |             |
           v                    v       v      v             v
    +---------------+   +-----------+  +----+  +----+  +----------+
    |EMOTION_BRIDGE |   |CONVERTER  |  |GATE|  |ORACLE| |PLANNER   |
    +-------+-------+   +-----------+  +----+  +------+ +----+-----+
            |                                               |
            |                                               |
    +-------+---------------------+                         |
    |               |             |                         |
    v               v             v                         v
+-------+     +---------+   +---------+               +---------+
| PRISM |     | J1_JUDGE|   | DRAFTER |<--------------| SCRIBE  |
+-------+     +---------+   +---------+               +---------+
```

---

## Propagation Rules

| If you change... | You MUST verify... | Minimum action |
|------------------|---------------------|----------------|
| OMEGA_TYPES | ALL type importers | Full integration tests |
| CANON | Gates + ORACLE + SCRIBE | Coherence tests |
| EMOTION_BRIDGE | J1_JUDGE + PRISM | Distance tests |
| Threshold tau (J1) | Domain calibration | Acceptance tests |
| DeterministicRNG seed | Mock tests | Hash mock outputs |

---

## Coupling Strength Legend

| Level | Symbol | Definition |
|-------|--------|------------|
| CRITIQUE | 🔴 | Change here breaks multiple modules |
| MOYEN | 🟡 | Change may require updates elsewhere |
| FAIBLE | 🟢 | Change is isolated |

---

## Module Stability Ranking

| Rank | Module | Reason |
|------|--------|--------|
| 1 | TYPES | Foundation - never change lightly |
| 2 | OMEGA_TYPES | OMEGA integration contracts |
| 3 | EMOTION_BRIDGE | Core emotion processing |
| 4 | J1_JUDGE | Verdict algorithm |
| 5 | PROVIDERS | External API abstraction |
| 6 | DRAFTER | Orchestration |
| 7 | PRISM | Analysis utility |
| 8 | CONFIG | Runtime parameters |

---

**END OF IMPACT & COUPLING MATRIX**
