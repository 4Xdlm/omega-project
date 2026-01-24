# OMEGA TRUTH GATE — CI CHECKLIST
# Version: 1.0.0
# Status: BLOCKING

---

## Rule

```
IMPOSSIBLE TO MERGE IF TRUTH IS NOT SYNCHRONIZED
```

---

## Section A — Document Presence

| Check | File | Required |
|-------|------|----------|
| [ ] | `OMEGA_README.md` at root | YES |
| [ ] | `OMEGA_MASTER_PLAN.md` OR `OMEGA_MASTER_PLAN_v2.md` at root | YES |
| [ ] | `OMEGA_MASTER_PLAN_ANNEXES.md` at root | YES |
| [ ] | `artefacts/` directory exists | YES |
| [ ] | `sessions/` directory exists | YES |

---

## Section B — Scope Lock

| Check | Verification | Required |
|-------|--------------|----------|
| [ ] | `artefacts/REPO_SCOPE.txt` generated | YES |
| [ ] | Repo/branch/commit/tags documented | YES |
| [ ] | No out-of-scope files referenced | YES |

---

## Section C — DOC -> CODE Alignment

| Check | Verification | Required |
|-------|--------------|----------|
| [ ] | `artefacts/DOC_CODE_MATRIX.json` generated | YES |
| [ ] | Each PROUVE module has proof file | YES |
| [ ] | No PHANTOM described as implemented | YES |
| [ ] | Exports doc = Exports real | YES |

---

## Section D — Numbers & Contracts

| Check | Verification | Required |
|-------|--------------|----------|
| [ ] | `artefacts/NUMBERS_AUDIT.md` generated | YES |
| [ ] | No number without proof (or UNPROVEN) | YES |
| [ ] | `artefacts/INTERFACE_CONTRACTS.md` generated | YES |

---

## Section E — Impact & Assumptions

| Check | Verification | Required |
|-------|--------------|----------|
| [ ] | `artefacts/IMPACT_COUPLING_MATRIX.md` present | YES |
| [ ] | `artefacts/ASSUMPTIONS_VALIDITY.md` present | YES |

---

## Section F — Session Save

| Check | Verification | Required |
|-------|--------------|----------|
| [ ] | `sessions/SESSION_SAVE_YYYYMMDD.md` created | YES |
| [ ] | `sessions/SESSION_INDEX.md` updated | YES |

---

## CI Verdict

```
IF all checks = PASS:
  PASS — Merge authorized

IF any check = FAIL:
  FAIL — TRUTH DESYNC DETECTED
  MERGE BLOCKED
  List of gaps to fix
```

---

## Execution

```powershell
# Run verification
.\.ci\omega-truth-check.ps1

# In GitHub Actions
# See .github/workflows/omega-truth-gate.yml
```

---

**END OF CHECKLIST**
