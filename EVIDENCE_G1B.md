# EVIDENCE — Phase G.1-B — Distribution Hostile

**Date**: 2026-02-10
**HEAD before**: fcd8a32a
**Standard**: NASA-Grade L4 / DO-178C Level A

---

## Scope

Phase G.1-B is a documentation-only phase. ZERO modifications to any SEALED package.
All hashes are real (observed), all commands tested, all attack results observed.

---

## BLOC 1 — Examples + Attack Catalog

### Intents Created

| File | Purpose |
|------|---------|
| `examples/intents/intent_quickstart.json` | Happy path, 5 paragraphs |
| `examples/intents/intent_minimal.json` | Minimal, 3 paragraphs |
| `examples/intents/intent_hostile.json` | SQL injection, XSS, path traversal, -1 paragraphs |
| `examples/intents/hostile/atk05_extreme_paragraphs.json` | 999999 paragraphs |
| `examples/intents/hostile/atk06_empty_intent.json` | Empty object `{}` |
| `examples/intents/hostile/atk07_malformed.json` | Invalid JSON |
| `examples/intents/hostile/atk09_unicode_adversarial.json` | Zero-width + RTL chars |

### Runs Executed

| Run | Intent | Seed | run_id | final_hash | Exit |
|-----|--------|------|--------|------------|------|
| quickstart | intent_quickstart.json | omega-quickstart-v1 | 53729082510e692d | 65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a | 0 |
| minimal | intent_minimal.json | omega-minimal-v1 | abfaf1c75efa5fe6 | a42c67752537722fadfd8e604f853a4d80392181913cba0c126a837890832d6b | 0 |
| hostile | intent_hostile.json | omega-hostile-v1 | 514a35b640cb4473 | (not rejected — NCR-G1B-001) | 0 |

### Determinism Proof

Replayed quickstart with same seed:
- Run 1 final_hash: `65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a`
- Run 2 final_hash: `65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a` (identical)
- Merkle root: `db6a1a34cc18e719cfab08bba7545b273f732390ed4bd8ed54fd27df05c8492d` (identical)

### Verification

```
omega verify --dir run_quickstart --strict  -> exit 0
omega verify --dir run_minimal --strict     -> exit 0
```

### Attack Catalog (10 attacks)

| ID | Attack | Exit Code | Verdict |
|----|--------|-----------|---------|
| ATK-01 | SQL injection via title | 0 | FAIL |
| ATK-02 | XSS via themes | 0 | FAIL |
| ATK-03 | Path traversal via emotion | 0 | FAIL |
| ATK-04 | Negative paragraphs | 0 | FAIL |
| ATK-05 | Extreme paragraphs (999999) | 0 | FAIL |
| ATK-06 | Empty intent {} | 0 | FAIL |
| ATK-07 | Malformed JSON | 1 | PASS |
| ATK-08 | ProofPack hash tampered | 6 | PASS |
| ATK-09 | Unicode adversarial | 0 | FAIL |
| ATK-10 | Seed mismatch replay | 0 | FAIL |

**Result: 2 PASS, 8 FAIL** — All FAILs stem from absent intent validation (NCR-G1B-001).

### Deliverables

- `examples/ATTACK_CATALOG.md` — Full attack results
- `examples/EXAMPLES_INDEX.md` — Index with real hashes
- `examples/runs/run_quickstart/` — Full pipeline run
- `examples/runs/run_minimal/` — Full pipeline run
- `examples/runs/run_hostile_rejected/NCR_HOSTILE_NOT_REJECTED.md` — NCR

**BLOC 1: PASS**

---

## BLOC 2 — docs/QUICKSTART.md

- Created `docs/QUICKSTART.md` with real commands, real hashes, real output structure
- Archived `docs/user/OMEGA_Quickstart_v1.7.0.md` -> `OMEGA_Quickstart_v1.7.0_ARCHIVED.md`
- Contains final_hash: `65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a`
- Contains merkle_root: `db6a1a34cc18e719cfab08bba7545b273f732390ed4bd8ed54fd27df05c8492d`

**BLOC 2: PASS**

---

## BLOC 3 — README.md Rewrite

- Archived `README.md` -> `README_v6_ARCHIVED.md`
- Created new README.md: 224 lines, 12 sections
- Zero v6.0.0 references
- Real attack verdicts (2 PASS, 8 FAIL)
- Real metrics (2328 tests, 94 invariants)

**BLOC 3: PASS**

---

## BLOC 4 — Release Artefacts

### releases/v1.0.0/ Contents

| File | Size | SHA-256 |
|------|------|---------|
| VERSION | 7 B | 4ca8bbd3c595ee306226c6996b32b8d47a900217c55a7ed0cfc868ee444f34f1 |
| CHANGELOG_v1.0.0.md | 3.1 KB | 2268a5f5c096a95d7a7a9a8828bc425476722ee25c2d6abe29cef72f45c0d294 |
| INSTALL.md | 2.8 KB | 0400305d86590b770b1cfa2c6bee2bb6af3d8fc2ed8338e6e7a9e0b91eff0a50 |
| omega-v1.0.0.tar.gz | 2.4 MB | 80875ed2f5053475acb3bfa2b8d9578707f3cb0b5cc013c439fa8de70c5d9afb |
| SHA256SUMS | 323 B | (self-referential) |

- Bundle excludes: node_modules, .git, archives
- SHA256SUMS: `sha256sum -c` passes for all 4 files

**BLOC 4: PASS**

---

## Invariant Verification

| Invariant | Description | Status |
|-----------|-------------|--------|
| INV-G1-01 | examples/ structure complete | PASS |
| INV-G1-02 | QUICKSTART.md with real hashes | PASS |
| INV-G1-03 | README.md ≤500 lines, 12 sections, no v6.0.0 | PASS |
| INV-G1-04 | releases/v1.0.0 with all files + SHA256SUMS | PASS |
| INV-G1B-01 | No SEALED packages modified (8/8 clean) | PASS |
| INV-G1B-02 | Both example runs verify (exit 0) | PASS |
| INV-G1B-03 | Attack catalog: 10 attacks, 2 PASS, 8 FAIL | PASS |
| INV-G1B-04 | Real hashes, no placeholders | PASS |

**8/8 invariants PASS**

---

## Non-Regression Tests

| Package | Tests | Status |
|---------|-------|--------|
| canon-kernel | 67 | PASS |
| truth-gate | 215 | PASS |
| genesis-planner | 154 | PASS |
| scribe-engine | 232 | PASS |
| style-emergence-engine | 241 | PASS |
| creation-pipeline | 318 | PASS |
| omega-forge | 304 | PASS |
| omega-runner | 158 | PASS |
| omega-governance | 335 | PASS |
| omega-release | 218 | PASS |
| root (plugin-sdk) | 86 | PASS |
| **TOTAL** | **2328** | **ALL PASS** |

**0 failures. 0 SEALED packages modified.**

---

## Files Created/Modified (G.1-B only)

### Created
- `examples/intents/intent_quickstart.json`
- `examples/intents/intent_minimal.json`
- `examples/intents/intent_hostile.json`
- `examples/intents/hostile/atk05_extreme_paragraphs.json`
- `examples/intents/hostile/atk06_empty_intent.json`
- `examples/intents/hostile/atk07_malformed.json`
- `examples/intents/hostile/atk09_unicode_adversarial.json`
- `examples/runs/run_quickstart/` (full run directory)
- `examples/runs/run_minimal/` (full run directory)
- `examples/runs/run_hostile_rejected/` (with NCR)
- `examples/ATTACK_CATALOG.md`
- `examples/EXAMPLES_INDEX.md`
- `docs/QUICKSTART.md`
- `releases/v1.0.0/VERSION`
- `releases/v1.0.0/CHANGELOG_v1.0.0.md`
- `releases/v1.0.0/INSTALL.md`
- `releases/v1.0.0/omega-v1.0.0.tar.gz`
- `releases/v1.0.0/SHA256SUMS`
- `EVIDENCE_G1B.md`

### Modified
- `README.md` (rewritten — old archived as `README_v6_ARCHIVED.md`)

### Archived
- `README.md` -> `README_v6_ARCHIVED.md`
- `docs/user/OMEGA_Quickstart_v1.7.0.md` -> `OMEGA_Quickstart_v1.7.0_ARCHIVED.md`

### NOT Modified (SEALED)
- packages/canon-kernel/ (0 changes)
- packages/truth-gate/ (0 changes)
- packages/genesis-planner/ (0 changes)
- packages/scribe-engine/ (0 changes)
- packages/style-emergence-engine/ (0 changes)
- packages/creation-pipeline/ (0 changes)
- packages/omega-forge/ (0 changes)
- packages/omega-runner/ (0 changes)

---

**Phase G.1-B: COMPLETE — 4/4 BLOCS PASS, 8/8 invariants PASS, 2328 tests PASS**
