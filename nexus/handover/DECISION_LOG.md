# OMEGA DECISION LOG

## Purpose

This document records key architectural decisions made during OMEGA development. Each decision is final unless explicitly superseded by a new decision with higher version.

---

## DEC-001: FROZEN Module Policy

**Date**: 2026-01-07
**Status**: ACTIVE
**Author**: Francky (Architect)

### Context
Core modules (genome, mycelium) reached certification level. Future changes risk invalidating certification.

### Decision
Modules marked FROZEN are permanently read-only. No exceptions without full re-certification process.

### Consequences
- genome v1.2.0: FROZEN
- mycelium v1.0.0: FROZEN
- Any modification = certification void
- Extensions must be in new packages

---

## DEC-002: NASA-Grade L4 / DO-178C Alignment

**Date**: 2026-01-01
**Status**: ACTIVE
**Author**: Francky (Architect)

### Context
OMEGA handles critical analysis. Reliability must be aerospace-grade.

### Decision
All development follows NASA-Grade L4 / DO-178C Level A principles:
- Traceability mandatory
- Proof for every claim
- Determinism required
- No hidden side effects

### Consequences
- Slower development pace
- Higher confidence
- Auditable history
- Legal defensibility

---

## DEC-003: Observability Opt-In Only

**Date**: 2026-01-17
**Status**: ACTIVE
**Author**: Claude (IA Principal)

### Context
Added observability layer in Chapter 5. Risk of performance overhead.

### Decision
All observability is opt-in. Default = no events emitted. Consumer must explicitly register handlers.

### Consequences
- Zero overhead when unused
- No breaking changes to existing code
- Consumer controls verbosity

---

## DEC-004: Performance Changes Require Baseline

**Date**: 2026-01-17
**Status**: ACTIVE
**Author**: Francky (Architect)

### Context
Performance "improvements" without measurement create invisible debt.

### Decision
Any performance change must:
1. Document baseline (before)
2. Document result (after)
3. Show >= 10% improvement
4. Include benchmark tests

### Consequences
- No micro-optimizations without proof
- Benchmark tests in repository
- PERF_BASELINE.md maintained

---

## DEC-005: Archive Excluded from Git

**Date**: 2026-01-17
**Status**: ACTIVE
**Author**: Claude (IA Principal)

### Context
Certified archive (omega-v3.160.0.zip) is 32.9 MB. Too large for git.

### Decision
Archive stored locally/externally. Git contains:
- SHA-256 hash (ARCHIVE_HASH.txt)
- Metadata (ARCHIVE_META.json)
- Regeneration command

### Consequences
- Repository stays lean
- Archive reproducible from tag
- Integrity verifiable via hash

---

## DEC-006: Single Source of Truth

**Date**: 2026-01-17
**Status**: ACTIVE
**Author**: Francky (Architect)

### Context
Multiple documents claimed authority. Confusion risk.

### Decision
STATE_OF_TRUTH.md is the ONLY authoritative document. All others are subordinate. External references marked obsolete.

### Consequences
- Clear authority chain
- No conflicting claims
- Delta note in STATE_OF_TRUTH

---

## DEC-007: Succession Without Original Author

**Date**: 2026-01-17
**Status**: ACTIVE
**Author**: Francky (Architect)

### Context
Project must survive if original creators unavailable.

### Decision
HANDOVER protocol enables any qualified maintainer to take over. Criteria defined. Anti-patterns documented.

### Consequences
- Project immortal (within constraints)
- Knowledge transfer documented
- Succession rules explicit

---

## Template for Future Decisions

```markdown
## DEC-XXX: [Title]

**Date**: YYYY-MM-DD
**Status**: ACTIVE | SUPERSEDED
**Author**: [Name] ([Role])

### Context
[Why this decision was needed]

### Decision
[What was decided]

### Consequences
[Impact of the decision]
```
