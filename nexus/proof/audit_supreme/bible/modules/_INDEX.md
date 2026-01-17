# OMEGA Modules Index

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Module Summary

| Package | Version | Status | LOC | Tests | Layer |
|---------|---------|--------|-----|-------|-------|
| @omega/orchestrator-core | 0.1.0 | Active | 4,990 | 156 | Core |
| @omega/types | 3.155.0 | Active | ~500 | - | Types |
| @omega/genome-types | 1.0.0 | Stable | ~400 | - | Types |
| @omega/oracle-types | 0.6.0 | Active | ~300 | - | Types |
| @omega/mycelium | 1.0.0 | FROZEN | 2,591 | 147 | Validation |
| @omega/mycelium-bio | 0.1.0 | Active | 1,243 | 12 | Validation |
| @omega/genome | 1.2.0 | FROZEN | 3,646 | 109 | Analysis |
| @omega/search | 3.155.0 | Active | 9,142 | 287 | Analysis |
| @omega/oracle | 3.145.0 | Active | 5,227 | 98 | AI |
| @omega/headless-runner | 0.6.0 | Active | 1,892 | 45 | Orchestration |
| @omega/gold-suite | 0.6.0 | Active | 1,434 | 23 | Orchestration |
| @omega/proof-pack | 0.3.0 | Active | 2,156 | 67 | Orchestration |
| @omega/gold-cli | 0.6.0 | Active | 3,245 | 34 | CLI |
| @omega/gateway | 3.155.0 | Active | 2,834 | 89 | Integration |
| @omega/integration-nexus-dep | 0.7.0 | Active | 14,262 | 156 | Integration |

---

## Module Documentation

| Module | Documentation File |
|--------|-------------------|
| genome | [genome.md](./genome.md) |
| mycelium | [mycelium.md](./mycelium.md) |
| oracle | [oracle.md](./oracle.md) |
| search | [search.md](./search.md) |

---

## Dependency Graph

```
                                    ┌──────────────┐
                                    │   omega-ui   │
                                    └──────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
            │   gateway    │       │    oracle    │       │    search    │
            └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
                   │                      │                      │
                   ▼                      ▼                      ▼
            ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
            │    genome    │       │ oracle-types │       │    genome    │
            │   (FROZEN)   │       └──────────────┘       │   (FROZEN)   │
            └──────┬───────┘                              └──────┬───────┘
                   │                                             │
                   ▼                                             │
            ┌──────────────┐                                     │
            │   mycelium   │◄────────────────────────────────────┘
            │   (FROZEN)   │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │    types     │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │orchestrator- │
            │    core      │
            └──────────────┘
```

---

## Module Categories

### Sanctuary Modules (FROZEN)
- **genome** - Core fingerprinting, no modifications allowed
- **mycelium** - Input validation, no modifications allowed

### Active Development
- **search** - Full-text search, active improvements
- **oracle** - AI integration, adding backends
- **integration-nexus-dep** - NEXUS integration

### Stable (Low Change)
- **orchestrator-core** - Foundation, rarely changes
- **types** - Shared types, version-locked
- **proof-pack** - Evidence bundling

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
