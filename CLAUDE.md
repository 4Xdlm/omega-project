# ═══════════════════════════════════════════════════════════════════════════════
#
#   ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗ 
#  ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗
#  ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║
#  ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║
#  ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║
#   ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝
#
#   OMEGA PROJECT — CLAUDE CODE CONFIGURATION
#   Standard: NASA-Grade L4 / DO-178C Level A / SpaceX FRR
#   Version: v3.28.0
#   Date: 2026-01-09
#
# ═══════════════════════════════════════════════════════════════════════════════

# PROJECT OMEGA — Moteur d'Analyse Émotionnelle Narrative

## Description

OMEGA est un système de certification NASA-Grade L4 pour l'analyse émotionnelle
et stylistique d'œuvres narratives. Architecture modulaire avec chaîne de confiance
hermétique (Sentinel → Genome → DNA/Mycelium).

**ATTENTION** : Ce projet est sous contrainte d'exigence ABSOLUE.
Toute approximation, supposition ou "ça devrait marcher" est une VIOLATION.

## Version actuelle

```
Version:        v3.28.0
Phase active:   28 (Genome v1.2.0 SEALED)
Tests:          1007+ (898 Sentinel + 109 Genome)
Invariants:     101 (87 Sentinel + 14 Genome)
Repository:     https://github.com/4Xdlm/omega-project
Branch:         master
```

## Structure

```
omega-project/
├── packages/
│   ├── sentinel/          # ROOT — Système de preuve (FROZEN Phase 27)
│   │   ├── foundation/    # Axiomes et constantes
│   │   ├── crystal/       # Crystallisation invariants
│   │   ├── falsification/ # Falsification Popper
│   │   ├── regions/       # Régions épistémiques
│   │   ├── artifact/      # Artefacts certifiés
│   │   ├── refusal/       # Refus et blocages
│   │   ├── negative/      # Espace négatif
│   │   ├── gravity/       # Gravité épistémique
│   │   ├── meta/          # Méta-certification
│   │   └── tests/         # 898 tests
│   │
│   └── genome/            # CLIENT — Analyse narrative (SEALED Phase 28)
│       ├── src/
│       │   ├── api/       # Types, analyze, fingerprint, similarity
│       │   ├── core/      # canonical, emotion14, genome, version
│       │   └── utils/     # sha256
│       ├── test/          # 109 tests
│       └── artifacts/     # GENOME_SEAL.json, canonical_golden.json
│
├── certificates/          # Certificats de test par phase
├── archives/              # ZIPs horodatés par module
├── evidence/              # Preuves (logs, hashes, manifests)
├── docs/                  # Documentation
└── CLAUDE.md              # CE FICHIER
```

## Hiérarchie de confiance (NON NÉGOCIABLE)

```
SENTINEL (ROOT) — Phase 27 — FROZEN 🔒
    │
    └── GENOME (CLIENT) — Phase 28 — SEALED 🔒
            │
            └── [DNA/Mycelium] — Phase 29+ — PLANNED
```

**RÈGLE** : Le flux est UNIDIRECTIONNEL. Un client ne modifie JAMAIS son patron.

## Conventions

- Langage : TypeScript (strict mode)
- Tests : Vitest
- Package manager : npm
- OS cible : Windows (PowerShell) + Linux
- Hashes : SHA-256
- Float precision : 1e-6 (cross-platform)

## Phases FROZEN (INTERDICTION DE MODIFICATION)

| Phase | Module | Status |
|-------|--------|--------|
| 27 | Sentinel Self-Seal v1.0.0 | 🔒 FROZEN |
| 28 | Genome v1.2.0 | 🔒 SEALED |

---

# ═══════════════════════════════════════════════════════════════════════════════
# 🔒 BLOC D'EXIGENCE — OMEGA (ABSOLU)
# ═══════════════════════════════════════════════════════════════════════════════

These requirements are HARD CONSTRAINTS.
Violation = FAILURE.
No exception unless explicitly authorized by the Architect (Francky).

## E-01 — Zero Claim Without Proof

You are FORBIDDEN to claim:
- "working"
- "fixed"
- "validated"
- "certified"
- "compliant"
- "ready"
- "stable"

Unless you provide:
- the exact command executed
- its output or log location
- and the resulting artifact (file, hash, test count)

If proof is missing → say "NOT PROVEN".

## E-02 — Tests Are Mandatory, Not Optional

Any code change MUST:
- add tests OR justify why existing tests fully cover the change
- execute tests
- report:
  - number of tests run
  - number passed
  - number skipped
  - duration (if available)

No test execution = no success claim.

## E-03 — Determinism Is Sacred

Any introduction of:
- time
- randomness
- ordering
- concurrency
- external IO
- environment-dependent behavior

MUST be:
- injected
- seeded
- frozen
- or explicitly proven irrelevant

If determinism cannot be guaranteed:
→ OPEN NCR
→ DO NOT PATCH SILENTLY

## E-04 — Frozen Means Frozen

If a phase, file, folder, or document is marked:
- FROZEN
- CERTIFIED
- GOLD MASTER
- CLOSED
- FINAL
- SEALED

You are STRICTLY FORBIDDEN to modify it.

Allowed alternatives:
- create a new version
- create a new phase
- create an extension layer
- open an NCR

Any direct modification = VIOLATION.

## E-05 — No Hidden Side Effects

You must identify and declare:
- all files touched
- all functions impacted
- all contracts/invariants affected

Silent behavioral changes are forbidden.

If impact scope is unclear → STOP and ANALYZE.

## E-06 — Minimal Change Principle

You must:
- change the smallest possible surface
- avoid refactors unless explicitly requested
- avoid renaming for aesthetics
- avoid "cleanup" without functional need

If a change touches more than required:
→ Justify explicitly
→ Or reduce scope

## E-07 — Evidence Pack Is Mandatory

Every completed task MUST produce or update:
- tests log
- hashes.sha256
- changelog or equivalent trace
- reference to commit or tag

No evidence pack = task incomplete.

## E-08 — NCR Over Heroics

When encountering:
- invariant violation
- ambiguity
- undocumented behavior
- conflicting specs
- impossible constraint

You MUST:
- open or update an NCR (Non-Conformance Report)
- describe the issue
- stop pretending it is solved

Never "be smart".
Be traceable.

## E-09 — No Forward Assumptions

You are FORBIDDEN to assume:
- future phases
- upcoming refactors
- "will be handled later"
- "planned improvements"

Only what exists in the repository is real.

## E-10 — Repo State Is Truth

If documentation, comments, or memory conflict with repository state:
→ Repository state wins
→ Document discrepancy
→ Propose correction

## E-11 — Windows Is First-Class

All commands must be:
- valid on Windows (PowerShell)
- reproducible
- explicit

Prefer PowerShell.
Avoid Bash unless explicitly requested.

## E-12 — Silence Is Failure

If something cannot be done, proven, or completed:
- say it clearly
- explain why
- propose options

Never hide uncertainty.
Never bluff.

## E-13 — No Emotional Language

Forbidden tone:
- enthusiasm
- marketing
- self-congratulation
- optimism without data

Allowed tone:
- factual
- cold
- precise
- verifiable

## E-14 — Architect Authority

If a rule conflicts with user instruction:
- STOP
- Ask the Architect (Francky)
- Do not choose yourself

You do not arbitrate OMEGA.
You execute it.

---

# ═══════════════════════════════════════════════════════════════════════════════
# 🔥 EXIGENCE DO-178C LEVEL A — STRICT
# ═══════════════════════════════════════════════════════════════════════════════

This repository is treated as Level A (catastrophic failure class).

## D-01 — Requirements First

No code is written until requirements are explicit.
Each task MUST have:
- Objective
- Acceptance criteria
- Non-regression criteria

If missing → STOP and request the minimum missing data.

## D-02 — Traceability Is Mandatory

Every change MUST be traceable:
```
Requirement → Code → Test → Evidence → Hash
```
If any link is missing → task is NOT DONE.

## D-03 — No Dead/Unused Code

Any new code MUST be:
- reachable
- used
- tested

Unused helpers, "future-proofing", or speculative structures are forbidden.

## D-04 — Negative Testing Required

For every new feature:
- at least one failure-path test is required
- input validation must be tested

No happy-path-only deliveries.

## D-05 — Coverage Obligation

If the repo has coverage tooling:
- run it
- report it

If not:
- propose minimal coverage tooling
- or document why it is intentionally absent

## D-06 — Strict Interfaces / Contracts

Public interfaces are contracts.
Any breaking change MUST:
- be versioned
- be documented
- include migration notes (if applicable)

## D-07 — No Undefined Behavior

If behavior is ambiguous:
- define it in docs/spec
- test it

Ambiguity is a bug.

## D-08 — Reproducible Builds/Tests

Commands must be reproducible:
- fixed commands
- explicit paths
- explicit env notes

No "works on my machine".

## D-09 — Review Gate (Self-check)

Before final output you MUST provide:
- diff summary (files + intent)
- risk list
- test results
- evidence pack location

If any missing → do not conclude success.

---

# ═══════════════════════════════════════════════════════════════════════════════
# 🚀 EXIGENCE FRR — NASA / SpaceX STYLE
# ═══════════════════════════════════════════════════════════════════════════════

Treat every delivery like a Flight Readiness Review.

## F-01 — Pre-Flight Checklist (Mandatory)

Before coding:
- git status clean (or explain)
- identify HEAD + branch + latest tag
- identify affected modules + invariants

## F-02 — Hazard Mindset (Failure is expected)

You MUST assume the change can fail.
Provide:
- failure modes (top 3)
- mitigations
- how tests cover them

## F-03 — No-Go Criteria

Define explicit NO-GO conditions, e.g.:
- any test failure
- determinism not proven
- frozen violation
- missing evidence pack

If any NO-GO occurs → STOP and report.

## F-04 — Rollback Plan Required

Every change MUST state rollback:
- how to revert (git revert / reset strategy)
- what artifacts to restore (zip snapshot, evidence)

## F-05 — Evidence Or It Didn't Happen

You must attach:
- exact commands executed
- logs locations
- hashes for evidence
- final state: commit hash (and tag if used)

## F-06 — Post-Flight Debrief

End of task MUST include:
- what changed
- what could still break (known risks)
- what is intentionally NOT addressed

No hiding residual risk.

---

# ═══════════════════════════════════════════════════════════════════════════════
# 🧾 TRACE MATRIX — REQUIRED OUTPUT PER TASK
# ═══════════════════════════════════════════════════════════════════════════════

For every task, you MUST output this table completed.
If any row cannot be filled → task is NOT COMPLETE.

```
| REQ ID | Requirement / Invariant | Change (file/function) | Test(s) added/used | Command(s) run | Evidence file(s) | SHA256 |
|-------:|-------------------------|------------------------|--------------------|----------------|------------------|--------|
| R-01   |                         |                        |                    |                |                  |        |
| R-02   |                         |                        |                    |                |                  |        |
| R-03   |                         |                        |                    |                |                  |        |
```

## Rules

- "Test(s) added/used" must reference actual test names or paths.
- "Command(s) run" must be copy-paste reproducible.
- "Evidence file(s)" must point to stored logs/output files.
- "SHA256" must be the actual hash from hashes.sha256 (or equivalent).

## Minimum rows

- At least 1 row per invariant impacted
- At least 1 row per new behavior introduced
- At least 1 row for determinism (if relevant)

---

# ═══════════════════════════════════════════════════════════════════════════════
# 📜 CERTIFICAT DE TEST — OBLIGATOIRE APRÈS CHAQUE MODULE
# ═══════════════════════════════════════════════════════════════════════════════

After completing ANY module or sprint, you MUST generate a TEST CERTIFICATE.

## Certificate Format

Create file: `certificates/CERT_PHASE{N}_{MODULE}_{YYYYMMDD_HHMMSS}.md`

```markdown
# ═══════════════════════════════════════════════════════════════════════════════
# CERTIFICAT DE TEST — OMEGA PROJECT
# ═══════════════════════════════════════════════════════════════════════════════

## IDENTIFICATION

| Field | Value |
|-------|-------|
| **Phase** | {PHASE_NUMBER} |
| **Module** | {MODULE_NAME} |
| **Version** | v{X.Y.Z} |
| **Date** | {YYYY-MM-DD HH:MM:SS UTC} |
| **Commit** | {COMMIT_HASH} |
| **Tag** | {TAG_IF_ANY} |
| **Certified By** | Claude Code |
| **Authorized By** | Francky (Architecte Suprême) |

## TEST RESULTS

| Metric | Value |
|--------|-------|
| **Test Files** | {N} passed ({N}) |
| **Tests** | {N} passed ({N}) |
| **Failed** | {N} |
| **Skipped** | {N} |
| **Duration** | {X}ms |
| **Platform** | {Windows/Linux} |

## INVARIANTS VERIFIED

| ID | Description | Status |
|----|-------------|--------|
| INV-XXX-01 | {Description} | ✅ PASS |
| INV-XXX-02 | {Description} | ✅ PASS |

## HASHES

| Artifact | SHA-256 |
|----------|---------|
| Source Bundle | {HASH} |
| Test Log | {HASH} |
| ZIP Archive | {HASH} |

## NCR (Non-Conformance Reports)

| NCR ID | Description | Status |
|--------|-------------|--------|
| (none) | — | — |

## ATTESTATION

```
I, Claude Code, certify that:
1. All tests have been executed and passed
2. All invariants have been verified
3. No frozen/sealed modules have been modified
4. Evidence pack is complete
5. This certificate is accurate and traceable

Standard: NASA-Grade L4 / DO-178C Level A
```

## SIGNATURES

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║   Certified By:   Claude Code                                                 ║
║   Authorized By:  Francky (Architecte Suprême)                                ║
║   Date:           {YYYY-MM-DD}                                                ║
║   Status:         ✅ CERTIFIED                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
```

## Certificate Storage

- Location: `certificates/`
- Naming: `CERT_PHASE{N}_{MODULE}_{YYYYMMDD_HHMMSS}.md`
- Example: `CERT_PHASE29_DNA_20260109_143022.md`

## Certificate History

Maintain file: `certificates/CERTIFICATE_HISTORY.md`

```markdown
# CERTIFICATE HISTORY — OMEGA PROJECT

| # | Date | Phase | Module | Version | Tests | Invariants | Certificate File |
|---|------|-------|--------|---------|-------|------------|------------------|
| 1 | 2026-01-07 | 27 | Sentinel | v3.27.0 | 898 | 87 | CERT_PHASE27_SENTINEL_... |
| 2 | 2026-01-07 | 28 | Genome | v3.28.0 | 109 | 14 | CERT_PHASE28_GENOME_... |
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# 📦 ZIP HORODATÉ — OBLIGATOIRE APRÈS CHAQUE MODULE
# ═══════════════════════════════════════════════════════════════════════════════

After completing ANY module or sprint, you MUST create a timestamped ZIP archive.

## ZIP Naming Convention

```
OMEGA_PHASE{N}_{MODULE}_v{X.Y.Z}_{YYYYMMDD_HHMMSS}.zip
```

Examples:
- `OMEGA_PHASE29_DNA_v3.29.0_20260109_143022.zip`
- `OMEGA_PHASE30_MYCELIUM_v3.30.0_20260110_091500.zip`

## ZIP Contents (MANDATORY)

```
OMEGA_PHASE{N}_{MODULE}_v{X.Y.Z}_{TIMESTAMP}/
├── src/                    # Source code
├── test/                   # Test files
├── artifacts/              # Seals, golden files
├── evidence/
│   ├── test_log.txt        # npm test output
│   └── hashes.sha256       # All file hashes
├── CERTIFICATE.md          # Test certificate
├── MANIFEST.md             # File listing with hashes
├── README.md               # Module documentation
└── package.json            # Version info
```

## ZIP Creation Commands (PowerShell)

```powershell
# 1. Generate timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# 2. Define variables
$phase = "29"
$module = "DNA"
$version = "3.29.0"
$zipName = "OMEGA_PHASE${phase}_${module}_v${version}_${timestamp}.zip"

# 3. Create ZIP (exclude node_modules)
Compress-Archive -Path ".\packages\${module}\*" -DestinationPath ".\archives\${zipName}" -CompressionLevel Optimal

# 4. Calculate hash
$hash = (Get-FileHash -Algorithm SHA256 ".\archives\${zipName}").Hash
Write-Output "ZIP: ${zipName}"
Write-Output "SHA-256: ${hash}"

# 5. Log to archive history
Add-Content -Path ".\archives\ARCHIVE_HISTORY.md" -Value "| ${timestamp} | ${phase} | ${module} | v${version} | ${hash} |"
```

## Archive Storage

- Location: `archives/`
- History file: `archives/ARCHIVE_HISTORY.md`

## Archive History Format

```markdown
# ARCHIVE HISTORY — OMEGA PROJECT

| Timestamp | Phase | Module | Version | SHA-256 |
|-----------|-------|--------|---------|---------|
| 20260107_120000 | 27 | Sentinel | v3.27.0 | abc123... |
| 20260107_180000 | 28 | Genome | v3.28.0 | def456... |
```

## ZIP Verification

After creating ZIP, ALWAYS verify:

```powershell
# Verify hash
$expected = "{RECORDED_HASH}"
$actual = (Get-FileHash -Algorithm SHA256 ".\archives\{ZIP_NAME}").Hash
if ($expected -eq $actual) { Write-Output "✅ VERIFIED" } else { Write-Output "❌ MISMATCH" }
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# 🔄 WORKFLOW COMPLET — FIN DE MODULE
# ═══════════════════════════════════════════════════════════════════════════════

At the END of every module/sprint, execute this COMPLETE workflow:

## Step 1 — Run Tests

```powershell
cd .\packages\{MODULE}
npm test > .\evidence\test_log.txt 2>&1
# Capture: tests passed, duration, any failures
```

## Step 2 — Generate Hashes

```powershell
Get-ChildItem -Recurse -File | Where-Object { $_.Extension -match '\.(ts|js|json|md)$' } | ForEach-Object {
    $hash = (Get-FileHash -Algorithm SHA256 $_.FullName).Hash
    "$hash  $($_.FullName)" | Add-Content .\evidence\hashes.sha256
}
```

## Step 3 — Create Certificate

Generate `certificates/CERT_PHASE{N}_{MODULE}_{TIMESTAMP}.md` with all required fields.

## Step 4 — Update Certificate History

Append to `certificates/CERTIFICATE_HISTORY.md`.

## Step 5 — Create ZIP Archive

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipName = "OMEGA_PHASE{N}_{MODULE}_v{X.Y.Z}_${timestamp}.zip"
Compress-Archive -Path ".\packages\{MODULE}\*" -DestinationPath ".\archives\${zipName}"
```

## Step 6 — Record ZIP Hash

```powershell
$hash = (Get-FileHash -Algorithm SHA256 ".\archives\${zipName}").Hash
Add-Content -Path ".\archives\ARCHIVE_HISTORY.md" -Value "| ${timestamp} | {N} | {MODULE} | v{X.Y.Z} | ${hash} |"
```

## Step 7 — Git Commit & Tag

```powershell
git add -A
git commit -m "feat(phase{N}): {MODULE} complete - {X} tests, {Y} invariants [CERTIFIED]"
git tag -a v{X.Y.Z}-{MODULE} -m "Phase {N} {MODULE} - CERTIFIED"
git push origin master --tags
```

## Step 8 — Final Report

Output to Architect:

```markdown
## ✅ MODULE COMPLETE

| Field | Value |
|-------|-------|
| Phase | {N} |
| Module | {MODULE} |
| Version | v{X.Y.Z} |
| Tests | {X} passed |
| Invariants | {Y} verified |
| Certificate | CERT_PHASE{N}_{MODULE}_{TIMESTAMP}.md |
| Archive | OMEGA_PHASE{N}_{MODULE}_v{X.Y.Z}_{TIMESTAMP}.zip |
| ZIP Hash | {SHA256} |
| Commit | {HASH} |
| Tag | v{X.Y.Z}-{MODULE} |

**Status: ✅ CERTIFIED — READY FOR NEXT PHASE**
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# 🚨 VIOLATIONS & PENALTIES
# ═══════════════════════════════════════════════════════════════════════════════

## Critical Violations (IMMEDIATE STOP)

| Code | Violation | Action |
|------|-----------|--------|
| V-01 | Modifying FROZEN/SEALED module | STOP — Open NCR |
| V-02 | Claiming success without tests | STOP — Run tests |
| V-03 | Missing evidence pack | STOP — Generate evidence |
| V-04 | Skipping certificate | STOP — Generate certificate |
| V-05 | Skipping ZIP archive | STOP — Create archive |

## Warning Violations (DOCUMENT & CONTINUE)

| Code | Violation | Action |
|------|-----------|--------|
| W-01 | Incomplete trace matrix | Complete before conclusion |
| W-02 | Missing hash | Calculate and record |
| W-03 | Ambiguous requirement | Open NCR, propose clarification |

---

# ═══════════════════════════════════════════════════════════════════════════════
# 📋 QUICK REFERENCE — COMMANDS
# ═══════════════════════════════════════════════════════════════════════════════

## Git

```powershell
git status
git log -1 --oneline
git describe --tags
git add -A
git commit -m "feat(phaseN): description [INV-XXX]"
git tag -a vX.Y.Z -m "description"
git push origin master --tags
```

## Tests

```powershell
cd .\packages\{MODULE}
npm install
npm test
```

## Hashes

```powershell
Get-FileHash -Algorithm SHA256 .\{FILE}
```

## ZIP

```powershell
Compress-Archive -Path ".\source\*" -DestinationPath ".\archive.zip"
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# 🔒 END OF CLAUDE.md — OMEGA PROJECT
# ═══════════════════════════════════════════════════════════════════════════════

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   This configuration file is BINDING.                                         ║
║   Any deviation requires explicit authorization from the Architect.           ║
║                                                                               ║
║   Standard:        NASA-Grade L4 / DO-178C Level A / SpaceX FRR               ║
║   Architect:       Francky                                                    ║
║   IA Principal:    Claude Code                                                ║
║                                                                               ║
║   Remember: PROVE IT OR DON'T CLAIM IT.                                       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```
