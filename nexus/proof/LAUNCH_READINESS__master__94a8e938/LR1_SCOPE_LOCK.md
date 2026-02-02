# LR1 — SCOPE LOCK & INVENTORY

## Audit Scope Definition

| Parameter | Value |
|-----------|-------|
| Repository | `omega-project` |
| Branch | `master` |
| Commit | `94a8e938b652418f1b967a348f460713729344c7` |
| Scan Date | 2026-02-02 |
| Total Source Files | 969 TypeScript files |

---

## INCLUSIONS (In-Scope)

### Primary Source Directories

| Directory | Files | Status | Description |
|-----------|-------|--------|-------------|
| `packages/` | 408 | ACTIVE | Core packages (30 sub-packages) |
| `gateway/` | 246 | ACTIVE | Gateway layer (9 modules) |
| `src/` | 181 | ACTIVE | Root source (18 modules) |
| `nexus/` | 87 | ACTIVE | Nexus subsystem (18 modules) |
| `genesis-forge/src/` | 14 | ACTIVE | Genesis narrative forge |
| Root `.ts` files | 46 | ACTIVE | Utilities, configs, tests |

### Configuration Files

| File | Status |
|------|--------|
| `package.json` | ACTIVE |
| `tsconfig.json` | ACTIVE |
| `vitest.config.ts` | ACTIVE |
| `CLAUDE.md` | ACTIVE (governance) |

---

## EXCLUSIONS (Out-of-Scope)

### Automatically Excluded

| Path Pattern | Reason |
|--------------|--------|
| `**/node_modules/**` | Dependencies (external) |
| `**/dist/**` | Generated output |
| `**/.git/**` | Version control |
| `**/build/**` | Build artifacts |
| `**/*.d.ts` in node_modules | Type definitions (external) |

### Historical/Archive Exclusions

| Path | Reason |
|------|--------|
| `OMEGA_PHASE*/` | Historical phase folders |
| `archives/` | Archived phase snapshots |
| `omega-v44*/` | Legacy versions |
| `sprint28_5/` | Legacy sprint |
| `*-graveyard/` | Deprecated code |

---

## FROZEN MODULES (IMMUTABLE)

Per CLAUDE.md and FROZEN_MODULES.md:

| Module | Path | Status | Sealed Date | Files |
|--------|------|--------|-------------|-------|
| genome | `packages/genome/` | **SEALED** | 2026-01-07 | 19 |
| mycelium | `packages/mycelium/` | **SEALED** | 2026-01-09 | 15 |
| gateway/sentinel | `gateway/sentinel/` | **FROZEN** | 2026-01-07 | 12 |

**Rule**: No modifications allowed. Bug fixes require v2 creation in new location.

---

## CLASSIFICATION SUMMARY

| Classification | Count | Percentage |
|----------------|-------|------------|
| FROZEN | 34 | 3.5% |
| SEALED (historical) | ~150 | 15.5% |
| ACTIVE | 735 | 75.8% |
| GENERATED | ~50 | 5.2% |
| **TOTAL** | **969** | **100%** |

---

## SCOPE LOCK HASH

```
SCOPE_LOCK_DEFINITION_v1
Branch: master
Commit: 94a8e938b652418f1b967a348f460713729344c7
Files: 969 TypeScript source files
Frozen: genome, mycelium, gateway/sentinel
Excluded: node_modules, dist, .git, archives, OMEGA_PHASE*
```

**This scope is LOCKED for the duration of this audit.**
