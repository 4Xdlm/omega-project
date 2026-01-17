# OMEGA Development Rules

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

These rules govern all OMEGA development. Violation is grounds for rejecting changes.

---

## Rule Categories

### R1 — Proof Requirements

**R1.1: Zero Claims Without Proof**
You are FORBIDDEN to claim "working", "fixed", "validated", "certified", "compliant", "ready", or "stable" without providing:
- The exact command executed
- Its output or log location
- The resulting artifact (file, hash, test count)

**R1.2: Evidence Pack Required**
Every completed task MUST produce:
- Test logs
- hashes.sha256
- Changelog or trace
- Commit or tag reference

**R1.3: Certificate Required**
Every module completion requires a test certificate.

---

### R2 — Testing Requirements

**R2.1: Tests Are Mandatory**
Any code change MUST:
- Add tests OR justify existing coverage
- Execute tests
- Report: total, passed, skipped, duration

**R2.2: Negative Testing Required**
For every new feature, at least one failure-path test is required.

**R2.3: No Untested Code**
Any new code MUST be:
- Reachable
- Used
- Tested

---

### R3 — Determinism Requirements

**R3.1: Determinism Is Sacred**
Any introduction of time, randomness, ordering, concurrency, external I/O, or environment-dependent behavior MUST be:
- Injected
- Seeded
- Frozen
- Or explicitly proven irrelevant

**R3.2: Reproducible Commands**
All commands must be reproducible:
- Fixed commands
- Explicit paths
- Explicit environment notes

---

### R4 — Frozen Module Rules

**R4.1: Frozen Means Frozen**
If a phase, file, folder, or document is marked FROZEN, CERTIFIED, GOLD MASTER, CLOSED, FINAL, or SEALED, you are STRICTLY FORBIDDEN to modify it.

**R4.2: Allowed Alternatives**
- Create a new version
- Create a new phase
- Create an extension layer
- Open an NCR

**R4.3: Currently Frozen**
- `@omega/genome` v1.2.0 (Phase 28)
- `@omega/mycelium` v1.0.0 (Phase 27)
- SENTINEL SUPREME (Phase 27)

---

### R5 — Change Management

**R5.1: No Hidden Side Effects**
You must identify and declare:
- All files touched
- All functions impacted
- All contracts/invariants affected

**R5.2: Minimal Change Principle**
You must:
- Change the smallest possible surface
- Avoid refactors unless explicitly requested
- Avoid renaming for aesthetics
- Avoid "cleanup" without functional need

**R5.3: No Forward Assumptions**
You are FORBIDDEN to assume:
- Future phases
- Upcoming refactors
- "Will be handled later"
- "Planned improvements"

---

### R6 — Interface Rules

**R6.1: Strict Interfaces**
Public interfaces are contracts. Any breaking change MUST:
- Be versioned
- Be documented
- Include migration notes

**R6.2: No Undefined Behavior**
If behavior is ambiguous:
- Define it in docs/spec
- Test it

---

### R7 — Documentation Rules

**R7.1: Repo State Is Truth**
If documentation conflicts with repository state:
- Repository state wins
- Document discrepancy
- Propose correction

**R7.2: NCR Over Heroics**
When encountering invariant violation, ambiguity, undocumented behavior, conflicting specs, or impossible constraint:
- Open or update an NCR
- Describe the issue
- Stop pretending it is solved

---

### R8 — Platform Rules

**R8.1: Windows Is First-Class**
All commands must be:
- Valid on Windows (PowerShell)
- Reproducible
- Explicit

**R8.2: Cross-Platform Determinism**
Float operations must use quantization (1e-6 precision) for cross-platform consistency.

---

### R9 — Communication Rules

**R9.1: Silence Is Failure**
If something cannot be done, proven, or completed:
- Say it clearly
- Explain why
- Propose options

**R9.2: No Emotional Language**
Forbidden tone: enthusiasm, marketing, self-congratulation, optimism without data.
Allowed tone: factual, cold, precise, verifiable.

---

### R10 — Authority Rules

**R10.1: Architect Authority**
If a rule conflicts with user instruction:
- STOP
- Ask the Architect (Francky)
- Do not choose yourself

You do not arbitrate OMEGA. You execute it.

---

## Trace Matrix Requirement

For every task, output this table completed:

| REQ ID | Requirement | Change | Test(s) | Command(s) | Evidence | SHA256 |
|--------|-------------|--------|---------|------------|----------|--------|
| R-01   |             |        |         |            |          |        |

If any row cannot be filled → task is NOT COMPLETE.

---

## Violation Penalties

### Critical Violations (IMMEDIATE STOP)

| Code | Violation | Action |
|------|-----------|--------|
| V-01 | Modifying FROZEN module | STOP — Open NCR |
| V-02 | Claiming success without tests | STOP — Run tests |
| V-03 | Missing evidence pack | STOP — Generate evidence |
| V-04 | Skipping certificate | STOP — Generate certificate |

### Warning Violations (DOCUMENT & CONTINUE)

| Code | Violation | Action |
|------|-----------|--------|
| W-01 | Incomplete trace matrix | Complete before conclusion |
| W-02 | Missing hash | Calculate and record |
| W-03 | Ambiguous requirement | Open NCR, propose clarification |

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
