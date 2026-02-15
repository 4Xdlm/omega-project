# ADR-002: Hashing Policy for Governance Documents

**Status**: ACCEPTED
**Date**: 2026-02-15
**Context**: Sprint 5 Commit 5.2 — Roadmap Alignment Enforcement
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## Context

OMEGA operates under strict governance requiring traceability from requirements (roadmap) to implementation (code) to verification (tests). The `OMEGA_ROADMAP_OMNIPOTENT` document serves as the **Single Source of Truth** for feature planning, Sprint definitions, and commitment tracking.

**Problem**: Without integrity verification, the roadmap can be modified without corresponding code updates, causing drift between documented intent and actual implementation.

---

## Decision

We implement **SHA-256 hash-based integrity verification** for critical governance documents.

### Scope

**Phase 1 (Sprint 5)**: `docs/OMEGA_ROADMAP_OMNIPOTENT_v1.md`

Future phases may extend to:
- `CLAUDE.md` (project instructions)
- `docs/adr/*.md` (architecture decisions)
- Sprint certification reports

### Implementation

1. **Hash Storage**: `.roadmap-hash.json` at repo root (gitignored for local workflows)
2. **Hash Algorithm**: SHA-256 (64-char hex)
3. **Gate Script**: `packages/sovereign-engine/scripts/gate-roadmap.ts`
4. **CI Integration**: `npm run gate:all` includes `gate:roadmap`

### Workflow

```bash
# Verify integrity (CI/local)
npm run gate:roadmap

# After intentional roadmap modification
npm run gate:roadmap:update
git add .roadmap-hash.json
git commit -m "docs: update roadmap hash after Sprint X changes"
```

---

## Consequences

### ✅ Benefits

1. **Drift Detection**: Automatic detection of undocumented roadmap changes
2. **Traceability**: Hash commits link roadmap versions to implementation phases
3. **Fail-Closed**: Gate fails if hash mismatch → forces conscious acknowledgment
4. **Deterministic**: SHA-256 ensures reproducible verification

### ⚠️ Trade-offs

1. **Manual Update Required**: Developers must run `gate:roadmap:update` after roadmap edits
2. **Not Cryptographic**: Hash provides integrity, not authenticity (no signature)
3. **Single File Scope**: Phase 1 only covers main roadmap (not subdocuments)

### 🔧 Mitigations

- Clear error messages guide developers to update command
- Gate skips gracefully if roadmap file missing (optional)
- Update command logs old/new hash for audit trail

---

## Rationale

### Why SHA-256?

- **Collision Resistance**: Cryptographically strong (2^256 space)
- **Deterministic**: Same content → same hash (cross-platform)
- **Portable**: Node.js `crypto` module native support
- **Fast**: <1ms for typical markdown files

### Why Not Git Commit Hash?

Git commit hashes track **repository state**, not **document state**. A roadmap can be edited across multiple commits, and we need to detect the **content change** itself, not the commit that introduced it.

### Why Fail-Closed?

Following OMEGA principle **E-06 (Minimal Change)** and **GOLDEN RULE #2 (Test It)**: if the roadmap changes, code/tests must be updated accordingly. The gate enforces this discipline.

---

## Compliance

| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| DO-178C Level A | Traceability from requirements to code | Roadmap hash links Sprint definitions to commit history |
| NASA-Grade L4 | Deterministic verification | SHA-256 hash reproducible across environments |
| RULE-ROADMAP-01 | Every commit updates checkpoint | `sessions/ROADMAP_CHECKPOINT.md` tracks alignment |

---

## Invariants

- **INV-HASH-01**: Hash file must exist in production builds
- **INV-HASH-02**: Hash format is exactly 64 hex chars (SHA-256)
- **INV-HASH-03**: Gate fails if hash mismatch (exit code 1)
- **INV-HASH-04**: Update mode writes timestamp + file path

---

## References

- [CLAUDE.md](../../CLAUDE.md) — Project instructions (GOLDEN RULES)
- [OMEGA_ROADMAP_OMNIPOTENT_v1.md](../OMEGA_ROADMAP_OMNIPOTENT_v1.md) — Governed document
- [gate-roadmap.ts](../../packages/sovereign-engine/scripts/gate-roadmap.ts) — Implementation
- [ROADMAP_CHECKPOINT.md](../../sessions/ROADMAP_CHECKPOINT.md) — Sprint alignment tracker

---

**Approved By**: Francky (Architect)
**Implemented By**: Claude Code (IA Principal)
**Version**: 1.0.0
