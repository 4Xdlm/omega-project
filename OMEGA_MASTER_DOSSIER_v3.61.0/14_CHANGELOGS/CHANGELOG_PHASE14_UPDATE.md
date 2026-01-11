# ═══════════════════════════════════════════════════════════════════════════════
#                    CHANGELOG UPDATE — PHASE 14
#                    À INSÉRER DANS CHANGELOG.md
# ═══════════════════════════════════════════════════════════════════════════════

## [3.14.0] - 2026-01-04 — PHASE 14 COMPLETE (AI PIPELINE)

### 🎯 Résumé
Phase 14 complète avec pipeline IA intégré. Tests: **298 passants**, **34 invariants**.

### 🚀 Sprint 14.1 — IPC Bridge (Python)
**Commit**: `fc46d86` | **Tag**: `v3.14.0-SPRINT1-IPC`

Modules ajoutés:
- `src/llm/ipc/constants.ts` — Constantes IPC
- `src/llm/ipc/types.ts` — Types stricts
- `src/llm/ipc/ipc_client.ts` — Client IPC principal
- `src/llm/ipc/message_handler.ts` — Gestionnaire messages
- `src/llm/ipc/connection_pool.ts` — Pool connexions (max 10)
- `src/llm/ipc/health_monitor.ts` — Heartbeat 5s
- `src/llm/ipc/retry_manager.ts` — Retry max 3
- `src/llm/ipc/index.ts` — Exports publics

Invariants (8):
- INV-IPC-01: Message ID Unique (UUID v4)
- INV-IPC-02: Timeout 15s avec kill
- INV-IPC-03: Payload Max 2MB
- INV-IPC-04: JSON Only (pas pickle)
- INV-IPC-05: Pool Bounded (max 10)
- INV-IPC-06: Graceful Shutdown
- INV-IPC-07: Health Heartbeat 5s
- INV-IPC-08: Retry Max 3

Tests: **41/41** (100%)

---

### 🧠 Sprint 14.2 — LLM Smart Router
**Commit**: `0d88842` | **Tag**: `v3.14.0-SPRINT2-ROUTER`

Modules ajoutés:
- `src/llm/router/constants.ts` — Constantes router
- `src/llm/router/types.ts` — Types stricts
- `src/llm/router/provider_registry.ts` — Registre providers
- `src/llm/router/scoring_engine.ts` — Scoring multi-critères
- `src/llm/router/circuit_breaker.ts` — Circuit breaker 30s
- `src/llm/router/anti_flap.ts` — Anti-flap 5/min
- `src/llm/router/router_engine.ts` — Orchestrateur
- `src/llm/router/index.ts` — Exports publics

Invariants (6):
- INV-RTR-01: Deterministic Selection (seed)
- INV-RTR-02: Score Bounded [0,1]
- INV-RTR-03: Circuit Open 30s
- INV-RTR-04: Anti-Flap 5 switches/min
- INV-RTR-05: Fallback Chain
- INV-RTR-06: Cost Weighted

Tests: **43/43** (100%)

---

### 🔮 Sprint 14.3 — ORACLE v2 (Emotion Analysis)
**Commit**: `88d9b35` | **Tag**: `v3.14.0-SPRINT3-ORACLE`

Modules ajoutés:
- `src/oracle/emotion_v2.ts` — Modèle post-Plutchik
- `src/oracle/prompt_builder.ts` — Template engine
- `src/oracle/response_parser.ts` — JSON extraction
- `src/oracle/emotion_cache.ts` — LRU 1000 entries
- `src/oracle/confidence_calibrator.ts` — Calibration confiance
- `src/oracle/oracle_engine.ts` — Orchestrateur
- `src/oracle/index.ts` — Exports publics

Invariants (8):
- INV-ORC-01: Emotion Bounded [0,1]
- INV-ORC-02: Valence Bounded [-1,1]
- INV-ORC-03: Primary Required
- INV-ORC-04: Cache LRU 1000
- INV-ORC-05: Confidence [0,1]
- INV-ORC-06: Prompt Max 4000 tokens
- INV-ORC-07: Response Timeout 10s
- INV-ORC-08: Deterministic

Tests: **59/59** (100%)

---

### 🌌 Sprint 14.4 — MUSE DIVINE (Narrative Suggestions)
**Commit**: `f97bc23` | **Tag**: `v3.14.0-SPRINT4-MUSE`
**Root Hash**: `c5d0ec9c824475f74e2fb1e5420c5e80133ab9bbf1b732928d2e5d3a93ca829b`

Modules ajoutés (29 fichiers TypeScript):
```
src/oracle/muse/
├── constants.ts           # Paramètres fixes
├── types.ts               # Contrats stricts
├── prng.ts                # PRNG Mulberry32 déterministe
├── fingerprint.ts         # SHA-256 truncated
├── scoring.ts             # 6-axis scoring
├── diversity.ts           # Anti-clone (distance ≥ 0.35)
├── assess.ts              # Risk assessment (F2)
├── project.ts             # Trajectory projection (F3)
├── muse_engine.ts         # Orchestrator
├── index.ts               # Public exports
├── physics/
│   ├── inertia.ts         # Resistance to change
│   ├── gravity.ts         # Emotional attraction
│   ├── attractors.ts      # Resolution points
│   └── transitions.ts     # Valid transitions
└── suggest/
    ├── strat_beat_next.ts
    ├── strat_tension_delta.ts
    ├── strat_contrast_knife.ts
    ├── strat_reframe_truth.ts
    └── strat_agency_injection.ts
```

Architecture MUSE:
- **Narrative Physics**: Inertia, Gravity, Attractors, Transitions
- **6-Axis Scoring**: Actionability (0.22), Context (0.20), Leverage (0.18), Novelty (0.16), Safety (0.14), Arc (0.10)
- **5 Strategies**: Beat-Next, Tension-Delta, Contrast-Knife, Reframe-Truth, Agency-Injection
- **Anti-Clone**: Diversité minimum 0.35

Invariants (12):
- INV-MUSE-01: Score Bounded [0,1]
- INV-MUSE-02: PRNG Deterministic
- INV-MUSE-03: Diversity Min 0.35
- INV-MUSE-04: Max 5 Suggestions
- INV-MUSE-05: Strategy Named
- INV-MUSE-06: Fingerprint 16 Hex
- INV-MUSE-07: Weights Sum 1.0
- INV-MUSE-08: Inertia Positive
- INV-MUSE-09: Gravity Bounded
- INV-MUSE-10: Attractor Valid
- INV-MUSE-11: Risk Bounded [0,1]
- INV-MUSE-12: Projection 3-5 Steps

Tests: **155/155** (100%)

---

### 📊 Métriques Phase 14

| Métrique | Valeur |
|----------|--------|
| **Tests Total** | 298 |
| **Invariants** | 34 |
| **Sprints** | 4 |
| **Fichiers ajoutés** | ~80+ |
| **Lignes de code** | ~15,000+ |
| **Pass Rate** | 100% |

### 🏛️ Architecture Pipeline

```
IPC Bridge → Smart Router → ORACLE v2 → MUSE Divine
   [41]         [43]          [59]        [155]
```

### 🔒 Status

Phase 14 **FROZEN** — Aucune modification fonctionnelle autorisée.

---

**Dernière mise à jour**: 04 janvier 2026
**Version actuelle**: 3.14.0
