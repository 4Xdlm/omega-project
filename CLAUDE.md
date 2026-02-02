# OMEGA — IA OPERATIONS MANUAL
**Version**: v3.155.0 | **Standard**: NASA-Grade L4 / DO-178C Level A

---

## A) MISSION & NON-GOALS

### Mission
OMEGA = Moteur d'Analyse Emotionnelle Narrative avec certification NASA-Grade.
Architecture modulaire : Sentinel (ROOT) -> Genome -> DNA/Mycelium (clients).

### Non-Goals
- NOT a prototype — production-grade
- NOT flexible — constraints are HARD
- NOT negotiable — Francky (Architect) decides

---

## B) REPO MAP

```
omega-project/
├── packages/
│   ├── sentinel-judge/        # Sentinel Judge — ACTIVE
│   ├── genome/                # CLIENT — FROZEN
│   ├── hardening/             # Security utilities
│   ├── search/                # Search engine
│   ├── integration-nexus-dep/ # Pipeline & Router
│   └── omega-segment-engine/  # Canonical & Segmentation
├── nexus/proof/               # Phase reports
├── certificates/              # Test certificates
├── archives/                  # ZIP snapshots
└── evidence/                  # Logs, hashes
```

---

## C) GOLDEN RULES

1. **PROVE IT** — No claim without command + output + artifact
2. **TEST IT** — Every change runs tests. No exception.
3. **TRACE IT** — Requirement -> Code -> Test -> Evidence -> Hash
4. **FREEZE IT** — FROZEN/SEALED = untouchable. Create new, never modify.
5. **MINIMIZE IT** — Smallest change possible. No refactors unless requested.
6. **DETERMINISM** — Seed randomness, freeze time, inject IO. Always.
7. **EVIDENCE PACK** — Every task produces: test log + hashes + report
8. **NCR OVER HEROICS** — Ambiguity? Open NCR. Don't guess.
9. **REPO = TRUTH** — If docs conflict with code, code wins.
10. **WINDOWS FIRST** — PowerShell commands. Explicit paths.

---

## D) WHAT NOT TO DO

### FORBIDDEN ACTIONS

| DO NOT | WHY |
|--------|-----|
| Modify FROZEN modules (sentinel, genome) | Violation V-01 — IMMEDIATE STOP |
| Claim "fixed" without test proof | Violation V-02 — Run tests first |
| Skip evidence pack | Violation V-03 — Generate before claiming done |
| Add dead/unused code | DO-178C D-03 — All code must be reachable + tested |
| Refactor without request | E-06 — Minimal change principle |
| Assume future phases | E-09 — Only repo state is real |
| Use Bash on Windows | E-11 — PowerShell required |
| Hide uncertainty | E-12 — Silence is failure |
| Use emotional language | E-13 — Factual, cold, precise only |
| Decide on conflicts | E-14 — Ask Francky |

### FORBIDDEN WORDS (without proof)

- "working" / "fixed" / "validated"
- "certified" / "compliant" / "ready"
- "should work" / "probably fine"

### FROZEN MODULES — NEVER TOUCH

```
gateway/sentinel/      -> Phase 27 — FROZEN
packages/genome/       -> Phase 28 — SEALED
```

**Creating extension layers = OK. Modifying frozen = VIOLATION.**

---

## E) WORKFLOW STANDARD

### Before Coding
```powershell
git status                    # Clean state?
git log -1 --oneline          # Current HEAD?
git describe --tags           # Latest tag?
```

### During Coding
1. Identify affected files + invariants
2. Make minimal changes
3. Add/update tests for new behavior
4. Run tests frequently

### After Coding
```powershell
# 1. Run tests
npm test

# 2. Generate hashes (if needed)
Get-FileHash -Algorithm SHA256 .\file.ts

# 3. Commit
git add -A
git commit -m "feat(phaseN): description - X tests"
```

### Deliverable Checklist
- [ ] Tests pass (count + duration)
- [ ] Evidence files generated (if module complete)
- [ ] Report written (nexus/proof/phaseX.Y/)
- [ ] No FROZEN modules touched
- [ ] Trace matrix complete (if required)

---

## F) EVIDENCE COMMANDS

### Test Execution
```powershell
npm test                                    # Run all tests
npm test -- --reporter=verbose              # Detailed output
```

### Hash Generation
```powershell
# Single file
(Get-FileHash -Algorithm SHA256 .\file.ts).Hash

# All source files
Get-ChildItem -Recurse -File -Include *.ts,*.json | ForEach-Object {
    "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash)  $($_.FullName)"
}
```

### Git Verification
```powershell
git status                    # Working tree state
git log -1 --oneline          # Last commit
git diff --stat HEAD~1        # What changed
```

### Search for Proof
```powershell
# Using Grep tool (preferred)
Grep pattern="export function" path="./src"
Grep pattern="INV-" path="./src"
```

---

## G) ESCALATION / DECISION

### When to STOP and ASK

| Situation | Action |
|-----------|--------|
| FROZEN module needs change | STOP -> Ask Francky |
| Conflicting requirements | STOP -> Open NCR -> Ask Francky |
| Ambiguous spec | STOP -> Document options -> Ask Francky |
| Test fails unexpectedly | STOP -> Investigate -> Report |
| Determinism uncertain | STOP -> Prove it or NCR |

### NCR Format

Create `nexus/proof/NCR_{ID}.md`:
```markdown
# NCR-{ID}: {Title}
**Status**: OPEN | **Severity**: HIGH/MEDIUM/LOW

## Issue
{Description}

## Options
1. {Option A}
2. {Option B}

## Decision
{Pending Francky approval}
```

### Authority Chain

```
Francky (Architect) — FINAL AUTHORITY
    |
    +-- Claude Code (IA Principal)
            |
            +-- All changes require evidence
```

**Rule**: If unsure -> Ask. If blocked -> NCR. Never guess.

---

## QUICK REFERENCE

| Task | Command |
|------|---------|
| Run tests | `npm test` |
| Check status | `git status` |
| Get hash | `Get-FileHash -Algorithm SHA256 .\file` |
| Create ZIP | `Compress-Archive -Path ".\src\*" -DestinationPath ".\archive.zip"` |

---

**Remember**: PROVE IT OR DON'T CLAIM IT.

```
Architect: Francky          IA Principal: Claude Code
Standard:  NASA-Grade L4 / DO-178C Level A
```
