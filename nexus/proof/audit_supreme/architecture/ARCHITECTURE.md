# OMEGA Architecture — Reality Map

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)
- Source: Static analysis of repository state

---

## Overview

OMEGA is a **narrative emotional analysis system** designed to extract, fingerprint, and compare emotional content of textual works. The architecture follows a layered approach with:

1. **Certification Layer** (SENTINEL SUPREME) - Falsification-based quality assurance
2. **Validation Layer** (MYCELIUM) - Input sanitization and validation
3. **Analysis Layer** (GENOME) - Emotional fingerprinting
4. **Integration Layer** (NEXUS DEP) - Cross-package orchestration
5. **Application Layer** (UI, CLI) - User interfaces

---

## Layers (Bottom to Top)

### Layer 1: Core Infrastructure

**Packages:**
- `@omega/orchestrator-core` - Deterministic execution engine (foundation)

**Purpose:** Provides deterministic execution guarantees. All other packages depend on this foundation, ensuring reproducible behavior.

**Key Characteristics:**
- Zero internal OMEGA dependencies
- Deterministic by design
- Provides execution primitives

---

### Layer 2: Contracts & Utilities

**Packages:**
- `@omega/contracts-canon` - Interface contracts and invariants
- `@omega/hardening` - Security utilities
- `@omega/performance` - Benchmarking utilities
- `omega-observability` - Progress callbacks

**Purpose:** Define cross-cutting concerns: types, security, performance, and observability.

**Dependencies:** All depend on orchestrator-core

---

### Layer 3: Validation (Sanctuary - FROZEN)

**Packages:**
- `@omega/mycelium` - Input validation guardian

**Purpose:** Gates all input to the analysis pipeline. Rejects malformed, binary, or dangerous input before processing.

**Status:** FROZEN at Phase 29.2
- 12 invariants
- 20 rejection types
- 5 validation gates

**Key Functions:**
- `validate()` - Main entry point
- Hard validations: UTF-8, size, binary detection
- Soft normalizations: Line endings, whitespace

---

### Layer 4: Analysis (Sanctuary - FROZEN)

**Packages:**
- `@omega/genome` - Narrative fingerprinting
- `@omega/mycelium-bio` - Bio-based analysis
- `@omega/aggregate-dna` - Segment aggregation
- `@omega/segment-engine` - Text segmentation
- `omega-bridge-ta-mycelium` - Analyzer bridge

**Purpose:** Extract emotional and stylistic fingerprints from validated text.

**Key Outputs:**
- `NarrativeGenome` - 14-dimensional emotional profile
- `GenomeFingerprint` - Unique content hash
- `SimilarityResult` - Comparison scores

**Genome Status:** FROZEN at Phase 28 (v1.2.0)
- 14 invariants
- Deterministic fingerprinting

---

### Layer 5: Evidence & Certification

**Packages:**
- `@omega/proof-pack` - Evidence bundling
- `@omega/headless-runner` - Deterministic plan execution
- `@omega/gold-internal` - Certification internals
- `@omega/gold-suite` - Test suite runner
- `@omega/gold-cli` - Certification CLI
- `@omega/gold-master` - Master certification

**Purpose:** Package evidence, run certification tests, produce proof artifacts.

**Dependency Chain:**
```
gold-master
    └── gold-internal
        └── gold-suite
            └── headless-runner
                └── orchestrator-core
```

---

### Layer 6: Integration

**Packages:**
- `@omega/integration-nexus-dep` - Dependency integration (14,262 LOC)

**Purpose:** Route, schedule, and orchestrate cross-package workflows.

**Sub-modules:**
- adapters/
- connectors/
- contracts/
- pipeline/
- router/
- scheduler/
- translators/

**Note:** Largest package by LOC, acts as integration hub.

---

### Layer 7: Intelligence

**Packages:**
- `@omega/oracle` - AI decision engine
- `@omega/search` - Text search engine

**Purpose:** High-level analysis, search, and recommendation.

**Oracle Features:**
- Prompt generation
- Streaming responses
- Caching
- Metrics collection

**Search Features:**
- Query parsing
- Faceted search
- Export/import
- Analytics

---

### Layer 8: Application

**Packages:**
- `omega-ui` (apps/omega-ui) - Desktop application

**Purpose:** User-facing interface for emotional analysis.

**Technology Stack:**
- Tauri (Rust backend)
- React (UI framework)
- Zustand (State management)
- TailwindCSS (Styling)

---

## Package Map

| Package | Layer | Purpose | Deps In | Deps Out |
|---------|-------|---------|---------|----------|
| @omega/orchestrator-core | 1 | Foundation | 7 | 0 |
| @omega/contracts-canon | 2 | Contracts | 4 | 1 |
| @omega/hardening | 2 | Security | 3 | 1 |
| @omega/performance | 2 | Benchmarks | 2 | 1 |
| @omega/mycelium | 3 | Validation | 1 | 0 |
| @omega/genome | 4 | Analysis | 0 | 1 |
| @omega/headless-runner | 5 | Execution | 2 | 1 |
| @omega/proof-pack | 5 | Evidence | 3 | 2 |
| @omega/gold-internal | 5 | Certification | 3 | 6 |
| @omega/gold-master | 5 | Master | 0 | 6 |
| @omega/integration-nexus-dep | 6 | Integration | 0 | 0 |
| @omega/oracle | 7 | AI Engine | 0 | 0 |
| @omega/search | 7 | Search | 0 | 0 |
| omega-ui | 8 | Desktop App | 0 | 3 |

---

## Architectural Patterns Used

### 1. Falsification-Based Certification (SENTINEL)
- Derived from Popper's philosophy of science
- Systems certified by failing to disprove them
- Explicit axioms declared, not hidden

### 2. Layered Architecture
- Clear separation of concerns
- Unidirectional dependency flow
- Lower layers more stable

### 3. Sanctuary Pattern
- Critical modules frozen after certification
- Read-only after sealing
- Version-controlled evolution

### 4. Dependency Injection
- IO abstracted via interfaces
- Testable by design
- Mockable for deterministic tests

### 5. Pipeline Architecture
- Data flows through stages
- Each stage transforms immutably
- Composable processing

---

## Architectural Tensions

### Tension 1: Integration Layer Size
- `@omega/integration-nexus-dep` at 14,262 LOC is 19% of all package code
- Risk of becoming a "God package"
- Recommendation: Consider decomposition

### Tension 2: Isolated High-Level Packages
- Oracle and Search have no OMEGA dependencies
- May indicate missed integration opportunities
- Or intentional isolation for flexibility

### Tension 3: Frozen vs Active Development
- Frozen modules (genome, mycelium) cannot evolve
- New features must work around frozen APIs
- Creates pressure to "get it right" before freezing

### Tension 4: Multiple Certification Packages
- 4 gold-* packages for certification
- Potentially over-engineered
- Could be consolidated

---

## Critical Path

The primary data flow for text analysis:

```
User Input
    │
    ▼
┌─────────────────────────────┐
│     @omega/mycelium         │  ← Validation Gate
│     validate()              │
└────────────┬────────────────┘
             │ (accepted)
             ▼
┌─────────────────────────────┐
│     @omega/genome           │  ← Fingerprinting
│     analyze()               │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│     @omega/genome           │  ← Comparison
│     compare()               │
└────────────┬────────────────┘
             │
             ▼
        SimilarityResult
```

---

*END ARCHITECTURE.md*
