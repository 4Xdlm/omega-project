# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA PROJECT — ARCHITECTURE
# Version: v3.34.0
# Standard: NASA-Grade L4 / DO-178C Level A
# ═══════════════════════════════════════════════════════════════════════════════

## System Overview

OMEGA is a narrative genome extraction and analysis system with NASA-Grade L4
certification requirements. The architecture follows a strict trust hierarchy
with unidirectional data flow.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OMEGA PROJECT ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SENTINEL (ROOT MODULE)                            │    │
│  │                    Phase 27 - FROZEN                                 │    │
│  │                                                                      │    │
│  │  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌─────────┐             │    │
│  │  │Foundation│ │ Crystal   │ │Falsification│ │ Regions │             │    │
│  │  │ (Axioms) │ │(Invariants│ │  (Popper)   │ │(Epistemic│            │    │
│  │  └──────────┘ └───────────┘ └────────────┘ └─────────┘             │    │
│  │                                                                      │    │
│  │  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌─────────┐             │    │
│  │  │ Artifact │ │ Refusal   │ │  Negative  │ │ Gravity │             │    │
│  │  │(Certified│ │ (Blocks)  │ │  (Space)   │ │(Epistemic│            │    │
│  │  └──────────┘ └───────────┘ └────────────┘ └─────────┘             │    │
│  │                                                                      │    │
│  │  ┌──────────┐                                                       │    │
│  │  │   META   │   898 Tests | 87 Invariants                          │    │
│  │  │(Certify) │                                                       │    │
│  │  └──────────┘                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼ (Trust flows down)                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     GENOME (CLIENT MODULE)                           │    │
│  │                     Phase 28 - SEALED                                │    │
│  │                                                                      │    │
│  │  ┌───────────────────────────────────────────────────────────┐      │    │
│  │  │                        API Layer                           │      │    │
│  │  │  analyze | fingerprint | similarity | types               │      │    │
│  │  └───────────────────────────────────────────────────────────┘      │    │
│  │                              │                                       │    │
│  │  ┌───────────────────────────────────────────────────────────┐      │    │
│  │  │                       Core Layer                           │      │    │
│  │  │  canonical | emotion14 | genome | version                 │      │    │
│  │  └───────────────────────────────────────────────────────────┘      │    │
│  │                              │                                       │    │
│  │  ┌───────────────────────────────────────────────────────────┐      │    │
│  │  │                   Integrations Layer                       │      │    │
│  │  │  myceliumAdapter | myceliumTypes                          │      │    │
│  │  └───────────────────────────────────────────────────────────┘      │    │
│  │                                                                      │    │
│  │  109 Tests | 14 Invariants                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    MYCELIUM (FROZEN MODULE)                          │    │
│  │                    Phase 29.2 - FROZEN                               │    │
│  │                                                                      │    │
│  │  ┌───────────────────────────────────────────────────────────┐      │    │
│  │  │  validate | normalize | process | types                   │      │    │
│  │  └───────────────────────────────────────────────────────────┘      │    │
│  │                                                                      │    │
│  │  seal_ref: v3.30.0 | commit: 35976d1                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Trust Hierarchy

The trust hierarchy is UNIDIRECTIONAL and NON-NEGOTIABLE:

```
SENTINEL (ROOT)
    │
    └──▶ GENOME (CLIENT)
              │
              └──▶ MYCELIUM (DEPENDENCY)
```

**Rules:**
1. A client module NEVER modifies its patron module
2. Trust flows downward only
3. FROZEN/SEALED modules cannot be modified
4. All cross-module dependencies are explicit

## Module Status

| Module | Phase | Status | Tests | Invariants |
|--------|-------|--------|-------|------------|
| Sentinel | 27 | FROZEN | 898 | 87 |
| Genome | 28 | SEALED | 109 | 14 |
| Mycelium | 29.2 | FROZEN | N/A | N/A |

## Data Flow

### Text Processing Pipeline

```
Input Text
    │
    ▼
┌─────────────────────┐
│   MYCELIUM LAYER    │
│  (via Genome Adapter)│
├─────────────────────┤
│ 1. Validate request │
│ 2. Check empty text │
│ 3. Detect binary    │
│ 4. Filter control   │
│ 5. Normalize line   │
│    endings          │
└─────────────────────┘
    │
    ▼ (Valid)                    ▼ (Invalid)
┌─────────────────────┐    ┌─────────────────────┐
│   GENOME ANALYSIS   │    │   REJECTION         │
├─────────────────────┤    ├─────────────────────┤
│ 1. Extract emotion  │    │ REJ-MYC-* codes     │
│ 2. Extract style    │    │ REJ-INT-* codes     │
│ 3. Extract structure│    └─────────────────────┘
│ 4. Extract tempo    │
│ 5. Compute fingerprint
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│   OUTPUT            │
├─────────────────────┤
│ GenomeMyceliumOk    │
│ - normalized        │
│ - genome            │
│ - fingerprint       │
│ - seal_ref          │
└─────────────────────┘
```

### Similarity Comparison Pipeline

```
┌──────────────┐     ┌──────────────┐
│  Genome A    │     │  Genome B    │
└──────────────┘     └──────────────┘
       │                    │
       └────────┬───────────┘
                │
                ▼
       ┌─────────────────┐
       │ FLATTEN AXES    │
       │                 │
       │ - emotion axis  │
       │ - style axis    │
       │ - structure axis│
       │ - tempo axis    │
       └─────────────────┘
                │
                ▼
       ┌─────────────────┐
       │ COSINE SIMILARITY│
       │ per axis        │
       └─────────────────┘
                │
                ▼
       ┌─────────────────┐
       │ WEIGHTED AVERAGE │
       │                 │
       │ emotion: 0.40   │
       │ style: 0.25     │
       │ structure: 0.20 │
       │ tempo: 0.15     │
       └─────────────────┘
                │
                ▼
       ┌─────────────────┐
       │ VERDICT         │
       │                 │
       │ >= 0.90 IDENTICAL│
       │ >= 0.70 SIMILAR │
       │ >= 0.40 RELATED │
       │ <  0.40 DIFFERENT│
       └─────────────────┘
```

## Directory Structure

```
omega-project/
├── packages/
│   ├── sentinel/          # ROOT - Proof system (FROZEN)
│   │   ├── foundation/    # Axioms and constants
│   │   ├── crystal/       # Invariant crystallization
│   │   ├── falsification/ # Popper falsification
│   │   ├── regions/       # Epistemic regions
│   │   ├── artifact/      # Certified artifacts
│   │   ├── refusal/       # Refusal system
│   │   ├── negative/      # Negative space
│   │   ├── gravity/       # Epistemic gravity
│   │   ├── meta/          # Meta-certification
│   │   └── tests/         # 898 tests
│   │
│   ├── genome/            # CLIENT - Narrative analysis (SEALED)
│   │   ├── src/
│   │   │   ├── api/       # Public interface
│   │   │   ├── core/      # Internal implementation
│   │   │   ├── integrations/ # Mycelium adapter
│   │   │   └── utils/     # Utilities
│   │   ├── test/          # 109 tests
│   │   └── artifacts/     # Seals, golden files
│   │
│   └── mycelium/          # DEPENDENCY - Validation (FROZEN)
│       └── src/           # Validation logic
│
├── tests/
│   ├── e2e/               # End-to-end tests (Phase 30.0)
│   ├── benchmarks/        # Performance tests (Phase 30.1)
│   └── stress/            # Stress tests (Phase 31.0)
│
├── certificates/          # Test certificates by phase
├── archives/              # Timestamped ZIP archives
├── evidence/              # Logs, hashes, manifests
├── docs/                  # Documentation
└── history/               # NCR log, phase history
```

## Certification Trail

Every module maintains a certification trail:

```
Requirement ──▶ Code ──▶ Test ──▶ Evidence ──▶ Hash ──▶ Certificate
```

### Evidence Pack Contents

Each phase produces:
1. `tests.log` - Test execution output
2. `hashes.sha256` - SHA-256 hashes of all source files
3. `CERT_PHASE*.md` - Certification document
4. ZIP archive with complete phase state

### Seal Reference

Mycelium integration uses a seal reference for audit trail:

```typescript
MYCELIUM_SEAL_REF = {
  version: "v3.30.0",
  commit: "35976d1",
  date: "2026-01-09"
}
```

## Determinism Guarantees

The system guarantees deterministic behavior:

1. **Seeded RNG**: All random operations accept seed parameter
2. **Float precision**: 1e-6 tolerance for cross-platform consistency
3. **Canonical serialization**: Sorted keys, normalized floats
4. **SHA-256 fingerprints**: Reproducible genome identification

## Error Handling

### Discriminated Union Pattern

All API functions return discriminated unions:

```typescript
type Result =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

### Rejection Codes

Structured rejection codes for traceability:
- `REJ-MYC-*`: Mycelium validation errors
- `REJ-INT-*`: Integration layer errors

## Non-Conformance Reports

All deviations are documented in `history/NCR_LOG.md`:

| NCR | Phase | Status | Description |
|-----|-------|--------|-------------|
| NCR-001 | 29.3 | CLOSED | Mycelium tsconfig missing DOM lib |
| NCR-002 | 31.0 | OPEN | DEL character not rejected |
| NCR-003 | 31.0 | OPEN | ELF magic bytes not rejected |

## Security Considerations

1. **No external dependencies** at runtime for core logic
2. **Input validation** at Mycelium layer
3. **Binary detection** for magic bytes
4. **Control character filtering** (partial - see NCR-002, NCR-003)

## Performance Characteristics

Based on Phase 30.1 benchmarks:

| Metric | Value |
|--------|-------|
| Single validation latency | ~0.013ms |
| Large text (43KB) latency | ~0.482ms |
| Throughput | ~267,000 validations/sec |
| Stress test (1000 requests) | ~8ms |
