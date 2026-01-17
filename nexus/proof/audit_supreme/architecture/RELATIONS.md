# OMEGA Relations Map

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Module Relations Graph

```
                              ┌─────────────────────────────────────────────────┐
                              │                 APPLICATIONS                     │
                              │                                                  │
                              │    omega-ui (Tauri/React)                        │
                              │        │                                         │
                              └────────┼─────────────────────────────────────────┘
                                       │
                              ┌────────┼─────────────────────────────────────────┐
                              │        │     INTELLIGENCE LAYER                  │
                              │        │                                         │
                              │   @omega/oracle     @omega/search                │
                              │   (standalone)      (standalone)                 │
                              │                                                  │
                              └──────────────────────────────────────────────────┘

                              ┌──────────────────────────────────────────────────┐
                              │              INTEGRATION LAYER                   │
                              │                                                  │
                              │         @omega/integration-nexus-dep             │
                              │         (standalone - 14,262 LOC)                │
                              │                                                  │
                              └──────────────────────────────────────────────────┘

                              ┌──────────────────────────────────────────────────┐
                              │           CERTIFICATION LAYER                    │
                              │                                                  │
                              │            ┌──────────────────┐                  │
                              │            │  @omega/gold-    │                  │
                              │            │    master        │                  │
                              │            └────────┬─────────┘                  │
                              │                     │                            │
                              │     ┌───────────────┼───────────────┐            │
                              │     │               │               │            │
                              │     ▼               ▼               ▼            │
                              │ gold-internal   gold-suite    proof-pack         │
                              │     │               │               │            │
                              │     └───────┬───────┘               │            │
                              │             │                       │            │
                              │             ▼                       │            │
                              │       headless-runner ◄─────────────┘            │
                              │             │                                    │
                              └─────────────┼────────────────────────────────────┘
                                            │
                              ┌─────────────┼────────────────────────────────────┐
                              │             │   ANALYSIS LAYER (FROZEN)          │
                              │             │                                    │
                              │   @omega/genome ◄───────────────────────────┐    │
                              │        │                                    │    │
                              │        └──────────► @omega/mycelium ◄───────┤    │
                              │                                             │    │
                              │   mycelium-bio   aggregate-dna   segment    │    │
                              │   (standalone)   (standalone)    (standalone)   │
                              │                                                  │
                              └──────────────────────────────────────────────────┘

                              ┌──────────────────────────────────────────────────┐
                              │          INFRASTRUCTURE LAYER                    │
                              │                                                  │
                              │   contracts-canon ◄─────────────────┐            │
                              │         │                           │            │
                              │   hardening ◄───────────────────────┤            │
                              │         │                           │            │
                              │   performance ◄─────────────────────┤            │
                              │         │                           │            │
                              │         └───────────────────────────┤            │
                              │                                     │            │
                              └─────────────────────────────────────┼────────────┘
                                                                    │
                              ┌─────────────────────────────────────┼────────────┐
                              │                                     │            │
                              │          @omega/orchestrator-core   │            │
                              │          (FOUNDATION - NO DEPS)     ◄────────────┘
                              │                                                  │
                              └──────────────────────────────────────────────────┘
```

---

## Dependency Matrix

| Package | orchestrator-core | contracts-canon | hardening | performance | proof-pack | headless-runner | gold-internal | gold-suite | mycelium |
|---------|:-----------------:|:---------------:|:---------:|:-----------:|:----------:|:---------------:|:-------------:|:----------:|:--------:|
| contracts-canon | ✓ | - | - | - | - | - | - | - | - |
| hardening | ✓ | - | - | - | - | - | - | - | - |
| performance | ✓ | - | - | - | - | - | - | - | - |
| proof-pack | ✓ | ✓ | - | - | - | - | - | - | - |
| headless-runner | ✓ | - | - | - | - | - | - | - | - |
| gold-internal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| gold-suite | ✓ | - | - | - | - | - | ✓ | - | - |
| gold-cli | ✓ | - | - | - | ✓ | - | ✓ | - | - |
| gold-master | ✓ | - | ✓ | ✓ | ✓ | - | ✓ | ✓ | - |
| genome | - | - | - | - | - | - | - | - | ✓ |

---

## Coupling Analysis

### Afferent Coupling (Ca) - Who depends on this module

| Module | Ca (Incoming) | Dependents |
|--------|---------------|------------|
| @omega/orchestrator-core | 7 | contracts-canon, hardening, performance, proof-pack, headless-runner, gold-internal, gold-suite, gold-cli, gold-master |
| @omega/gold-internal | 3 | gold-suite, gold-cli, gold-master |
| @omega/contracts-canon | 2 | proof-pack, gold-internal |
| @omega/proof-pack | 2 | gold-cli, gold-master |
| @omega/mycelium | 1 | genome |
| @omega/headless-runner | 1 | gold-internal |
| @omega/hardening | 2 | gold-internal, gold-master |
| @omega/performance | 2 | gold-internal, gold-master |
| @omega/gold-suite | 1 | gold-master |

### Efferent Coupling (Ce) - What this module depends on

| Module | Ce (Outgoing) | Dependencies |
|--------|---------------|--------------|
| @omega/gold-master | 6 | orchestrator-core, gold-internal, gold-suite, proof-pack, hardening, performance |
| @omega/gold-internal | 6 | orchestrator-core, headless-runner, contracts-canon, proof-pack, hardening, performance |
| @omega/gold-cli | 3 | orchestrator-core, gold-internal, proof-pack |
| @omega/proof-pack | 2 | orchestrator-core, contracts-canon |
| @omega/gold-suite | 2 | orchestrator-core, gold-internal |
| @omega/genome | 1 | mycelium |
| @omega/contracts-canon | 1 | orchestrator-core |
| @omega/hardening | 1 | orchestrator-core |
| @omega/performance | 1 | orchestrator-core |
| @omega/headless-runner | 1 | orchestrator-core |

### Instability Index (I = Ce / (Ca + Ce))

| Module | Ca | Ce | I (Instability) | Interpretation |
|--------|----|----|-----------------|----------------|
| @omega/orchestrator-core | 7 | 0 | 0.00 | Maximally stable (foundation) |
| @omega/mycelium | 1 | 0 | 0.00 | Stable (no dependencies) |
| @omega/contracts-canon | 2 | 1 | 0.33 | Stable |
| @omega/gold-internal | 3 | 6 | 0.67 | Unstable (many deps) |
| @omega/gold-master | 0 | 6 | 1.00 | Maximally unstable (top layer) |
| @omega/genome | 0 | 1 | 1.00 | Unstable (but frozen) |
| @omega/oracle | 0 | 0 | N/A | Isolated |
| @omega/search | 0 | 0 | N/A | Isolated |

---

## Cohesion Analysis

### High Cohesion Packages (Single Responsibility)
- `@omega/mycelium` - Input validation only
- `@omega/genome` - Fingerprinting only
- `@omega/search` - Search only
- `@omega/oracle` - AI analysis only

### Medium Cohesion Packages
- `@omega/integration-nexus-dep` - Integration concerns (but large)
- `@omega/proof-pack` - Evidence bundling
- `@omega/headless-runner` - CLI execution

### Potential Cohesion Issues
- `@omega/gold-internal` - May be doing too much (6 dependencies)
- `@omega/integration-nexus-dep` - Large size suggests multiple responsibilities

---

## Layering Violations

**Analysis:** No layering violations detected.

The dependency graph shows:
- All arrows point downward (toward core)
- No circular dependencies
- No skip-level dependencies that bypass intermediate layers

---

*END RELATIONS.md*
