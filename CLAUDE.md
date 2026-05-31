# OMEGA — IA OPERATIONS MANUAL
**Version**: v3.161.0 | **Standard**: NASA-Grade L4 / DO-178C Level A

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

## H) DOCTRINAL AMENDMENTS (Sprint S8 sealed 2026-05-02 + Sprint S11 sealed 2026-05-26 + Sprint S12 sealed 2026-05-26 + CODEX v1.2 sealed 2026-05-28 + EMP-13 PROPOSED 2026-05-28 + EMP-14 RATIFIÉ 2026-05-30 + EMP-15 SCELLÉ 2026-05-31)

Quatorze amendements (treize scellés/ratifiés + EMP-13 PROPOSED) post Sprints S6+S7+S8+S11+S12 + CODEX v1.2 + Trame Contrôle Total 2000 + Museum Topology. Références complètes :
- Amendements 1-6 : [docs/governance/SPRINT_S8_DOCTRINAL_AMENDMENTS.md](docs/governance/SPRINT_S8_DOCTRINAL_AMENDMENTS.md)
- Amendements 7-8 (EMP-09 + EMP-10) : [docs/governance/SPRINT_S11_DOCTRINAL_AMENDMENTS.md](docs/governance/SPRINT_S11_DOCTRINAL_AMENDMENTS.md)
- Amendement 9 (EMP-11) : [docs/governance/SPRINT_S12_DOCTRINAL_AMENDMENTS.md](docs/governance/SPRINT_S12_DOCTRINAL_AMENDMENTS.md)
- Amendements 10-11 (EMP-12 + EMP-12.1) : [docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md](docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md) Partie IV + [docs/governance/codex/](docs/governance/codex/)
- Amendement 14 (EMP-14, Trame Contrôle Total 2000) : [docs/governance/OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.md](docs/governance/OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.md)
- Amendement 15 (EMP-15, Documentation Topology Museum) : [docs/archive/museum/README_MUSEUM.md](docs/archive/museum/README_MUSEUM.md)

| # | Amendement | Règle synthétique |
|---|---|---|
| 1 | ANCHOR_PRE_FLIGHT | Anchors Cowork marqués `[À VÉRIFIER]` mandatory |
| 2 | MULTI_IA_RUNTIME_ARBITER | Claude Code = seul arbitre runtime empirique |
| 3 | NO_UNVERIFIED_EXTERNAL_ANCHORS | Aucune clôture NCR sur anchor non vérifié |
| 4 | STRUCTURED_MEMORY_PRIORITY | Mémoire = piste, pas preuve. Recoupage repo obligatoire |
| 5 | RECOVERY_TEST_DOCTRINE | Cleanup mass précédé NCR + test reverse |
| 6 | WORKSPACE_VS_REPO_DRIFT | Paths préfixés `[SANDBOX]` ou `[REPO]` |
| 7 | MASK_REVEAL_AUDIT (EMP-09) | Audit DRY-RUN 5 axes Windows-MCP avant activation `noEmitOnError` ou fix mécanique massif. Seuil `MASK_REVEAL_DELTA_THRESHOLD` configurable (défaut 0 strict). État `MASK_REVEAL_DETECTED` = STOP + NCR |
| 8 | TEST_BEFORE_COMMIT_STRICT (EMP-10) | Wrapper `commit-with-tests.ps1` obligatoire. Typologie A (code) = TSC PASS + Vitest PASS empirique requis. Typologie B (doc-only) = chemin `DOC_ONLY` du wrapper, scope diff vérifié, sans TSC/Vitest |
| 9 | PRE_SEAL_AUDIT_CHECKLIST (EMP-11) | Avant scellement Sprint significatif (≥3 commits OU ≥1 NCR à clore OU activation production OU ≥50 fichiers cumulés) : Bloc A 7 axes orthogonaux gouvernance (TSC cross-compile / npm test full / git hygiene / cohérence ADR↔git / security scan / dead code / autonomous checks) + Bloc B 7 anti-bug patterns sémantiques (type validation / resource leak / stats same-subset / lexique cross-set / filter chains / regex dead chars / gouvernance documentaire). État `FAIL_BLOCKING` = STOP + NCR. Wrapper `commit-with-tests.ps1 --audit-mode` extension Phase 2 (Sprint S13+) |
| 10 | CODEX_OMEGA_PREFLIGHT_MANDATORY (EMP-12) | Avant tout Sprint significatif (≥1 mesure, ≥1 calibration, ≥1 commit code production, ≥1 conclusion empirique nouvelle), consulter `docs/governance/codex/OMEGA_PREFLIGHT_LOOKUP.md` pour le domaine + lire CODEX v1.2 lois applicables + vérifier registre FORBID-* / HALLU-IA-* / NCR-*. État `FAIL_BLOCKING` = action sans preflight = invalide. Origine : 6 hallucinations 2/2 IA cumulées session 2026-05-27 (calibration cosmétique V2.1.x ~10-12h gaspillage) |
| 11 | CONTROL_BEFORE_WRITE (EMP-12.1) | Sous-règle EMP-12. Avant toute action OMEGA significative (code, calibration, mesure, conclusion), produire un bloc `CONTROL_BEFORE_WRITE` (format strict : domaine + documents lus + lois applicables + mesures historiques + NCRs liées + interdictions + hallucinations + conflits + verdict GO_WRITE / GO_READ_MORE / STOP_ARCHITECT_ARBITRATION). Cf [docs/governance/codex/OMEGA_CODEX_CONTROL_BEFORE_WRITE.md](docs/governance/codex/OMEGA_CODEX_CONTROL_BEFORE_WRITE.md). Wrapper `commit-with-tests.ps1 --codex-preflight` extension Phase 2 (Sprint S13+) |
| 12 | LFS_STAGING_DISCIPLINE (EMP-13) | **[PROPOSED 2026-05-28, ratification Tribunal pending]** Tout commit OMEGA depuis sandbox Linux (Bash MCP) DOIT utiliser staging explicite par chemin (`git add <path1> <path2>`), JAMAIS `git add -A` ni `git add .`. Binaires .exe/.msi/archives = git-lfs tracked (migration `598c80f6`). Sandbox Linux sans git-lfs voit blobs resolus (omega-bridge-win.exe 42 MB) vs pointeurs LFS (~132 o dans HEAD) -> `git add -A` reintroduirait les blobs et annulerait la migration LFS. Commits Windows-side OU liste de fichiers ciblee. Cf [docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-3-1.md](docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-3-1.md) PARTIE XVI. |
| 13 | CONTROL_TOTAL_FRAMEWORK_2000 (EMP-14) | **[RATIFIÉ 2026-05-30, Architecte]** Trame de contrôle total : 17 gates obligatoires (CONTROL_BEFORE_WRITE, ANCHOR_PRE_FLIGHT, matrice de portée, TEST_CAUSAL, NO_MEASURE_REDUNDANCY, PROMOTION_GATE, METRIC_HONESTY, MASK_REVEAL, TEST_BEFORE_COMMIT, ORACLE_COMPATIBILITY, BENCH_PROTOCOL, POST_RUN_AUDIT, CODEX_UPDATE, ADR/NCR, FINAL_REPORT) + 10 Règles d'Or. Ligne d'invocation obligatoire avant action significative : `J'applique OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 avant action.` Consolide/opérationnalise EMP-09/10/11/12/12.1. Cf [docs/governance/OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.md](docs/governance/OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.md). |
| 14 | DOCUMENTATION_TOPOLOGY_MUSEUM (EMP-15) | **[SCELLÉ 2026-05-31]** SSOT = `docs/` + `nexus/proof/` + `sessions/`. Tout doc sous `docs/archive/museum/` = **NON_SOURCE_OF_TRUTH_RUNTIME** : interdit d'y fonder SEUL une décision archi/NCR/modif moteur/identité moteur prod/état build-test. Avant usage : vérifier HEAD + `git status` + source courante via `docs/INDEX` + recoupage runtime. Un doc muséé explique POURQUOI OMEGA est devenu ainsi, pas ce qu'il EST maintenant. `MUSEUM_CATALOG.md` fait foi du contenu du musée. Cf [docs/archive/museum/README_MUSEUM.md](docs/archive/museum/README_MUSEUM.md). |

**Note** : Le concept "Plan Max v3.X" précédemment référencé dans
NCRs Sprint S8 est NON-CANONIQUE. Le seul document canonique de
doctrine OMEGA est ce CLAUDE.md (version v3.161.0) + [CODEX OMEGA v1.2](docs/CODEX_OMEGA_LOIS_CONTRAINTES_LLM_v1-2.md) + [Trame Contrôle Total 2000 (EMP-14)](docs/governance/OMEGA_TOTAL_CONTROL_FRAMEWORK_2000.md).

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
