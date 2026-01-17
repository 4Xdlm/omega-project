# OMEGA Architecture Overview

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 OMEGA SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         USER INTERFACE LAYER                              │  │
│  │                                                                           │  │
│  │   omega-ui (Tauri + React + Zustand)                                      │  │
│  │   - Desktop application                                                   │  │
│  │   - Text input/output                                                     │  │
│  │   - Visualization                                                         │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         COMMAND LINE LAYER                                │  │
│  │                                                                           │  │
│  │   gold-cli          - Certification CLI                                   │  │
│  │   omega-templates   - Template management                                 │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         ORCHESTRATION LAYER                               │  │
│  │                                                                           │  │
│  │   headless-runner     - Deterministic test execution                      │  │
│  │   gold-suite          - Test suite management                             │  │
│  │   proof-pack          - Evidence bundling                                 │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                            AI LAYER                                       │  │
│  │                                                                           │  │
│  │   oracle              - AI decision engine                                │  │
│  │   oracle-types        - AI type definitions                               │  │
│  │   StreamingOracle     - Real-time AI responses                            │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         ANALYSIS LAYER                                    │  │
│  │                                                                           │  │
│  │   genome (FROZEN)     - Narrative fingerprinting                          │  │
│  │   search              - Full-text search                                  │  │
│  │   mycelium-bio        - Advanced content analysis                         │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                        VALIDATION LAYER                                   │  │
│  │                                                                           │  │
│  │   mycelium (FROZEN)   - Input validation gate                             │  │
│  │   - UTF-8 validation                                                      │  │
│  │   - Size limits                                                           │  │
│  │   - Binary detection                                                      │  │
│  │   - Markup rejection                                                      │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                          TYPES LAYER                                      │  │
│  │                                                                           │  │
│  │   types               - Shared type definitions                           │  │
│  │   genome-types        - Genome-specific types                             │  │
│  │   oracle-types        - AI-specific types                                 │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                          CORE LAYER                                       │  │
│  │                                                                           │  │
│  │   orchestrator-core   - Deterministic execution foundation                │  │
│  │   - Plan execution                                                        │  │
│  │   - State management                                                      │  │
│  │   - Error handling                                                        │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Package Count by Layer

| Layer | Packages | Primary Purpose |
|-------|----------|-----------------|
| UI | 1 | User interaction |
| CLI | 2 | Command line access |
| Orchestration | 3 | Test/proof management |
| AI | 2 | AI integration |
| Analysis | 3 | Core algorithms |
| Validation | 2 | Input sanitization |
| Types | 3 | Type definitions |
| Core | 1 | Foundation |
| Integration | 4 | Cross-cutting concerns |

---

## Key Architectural Decisions

### 1. Unidirectional Dependencies
Dependencies flow DOWN only. Upper layers depend on lower layers, never the reverse.

### 2. Frozen Sanctuary Modules
`genome` and `mycelium` are FROZEN. They cannot be modified, only replaced with new versions in new phases.

### 3. Stateless Core
Core packages (`genome`, `mycelium`, `orchestrator-core`) maintain no state between calls.

### 4. Explicit Error Handling
Uses Result types (`AcceptResult | RejectResult`) rather than exceptions for expected failures.

### 5. Determinism First
All core operations are deterministic. Non-deterministic operations (time, random) must be injected.

---

## Integration Points

| Point | Packages Involved | Protocol |
|-------|-------------------|----------|
| Validation → Analysis | mycelium → genome | AcceptResult |
| Analysis → AI | genome → oracle | NarrativeGenome |
| AI → UI | oracle → omega-ui | StreamingResponse |
| Test → Proof | gold-suite → proof-pack | TestResults |

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
