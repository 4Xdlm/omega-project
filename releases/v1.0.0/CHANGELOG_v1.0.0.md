# OMEGA v1.0.0 — Release Changelog

**Release Date**: 2026-02-09
**Total Tests**: 2328
**Total Invariants**: 94
**Sealed Packages**: 8

---

## Added

### Phase A — canon-kernel
- Deterministic JSON canonicalization (`canonicalize`)
- SHA-256 hashing (`sha256`, `sha256Multi`)
- RootHash type with validation (`isValidRootHash`)
- 100% deterministic — no randomness, no IO

### Phase B — truth-gate
- Invariant enforcement engine
- Named invariant registration and verification
- Batch invariant checking with detailed results
- Fail-fast and collect-all modes

### Phase C.1 — genesis-planner
- IntentPack to BlueprintPack transformation
- Deterministic narrative planning
- Seed-based reproducible output

### Phase C.2 — scribe-engine
- BlueprintPack to DraftPack transformation
- Deterministic text generation (mock)
- Paragraph-level content creation

### Phase C.3 — style-emergence-engine
- DraftPack to StyledPack transformation
- Style application with deterministic output
- Theme-aware styling

### Phase C.4 — creation-pipeline
- End-to-end orchestration (Intent -> Styled)
- SHA-256 proof chain at every stage
- Deterministic pipeline with seed propagation

### Phase C.5 — omega-forge
- Emotional trajectory scoring (M1-M12 moments)
- ScoredPack generation with forge verdict
- Deterministic scoring with mock generators

### Phase D.1 — omega-runner
- CLI runner: `run create`, `run forge`, `run full`, `run report`
- `verify` command with strict mode
- ProofPack generation with Merkle tree
- Deterministic exit codes (0-6)
- Runner logging and stage orchestration

### Phase D.2 — omega-governance
- CI gate system (G0 through G5)
- Governance policy enforcement
- Non-regression baseline management

### Phase F — CI Gates
- 6-level CI gate pipeline
- Automated invariant verification
- Baseline replay for non-regression

### Phase G.0 — omega-release
- SemVer 2.0.0 version management
- Keep a Changelog parser/generator
- CycloneDX 1.4 SBOM generation
- Release packaging and manifest
- Self-test framework (5 checks)
- 10 release invariants (INV-G0-01 through INV-G0-10)

---

## Project Metrics

| Metric | Value |
|--------|-------|
| Total tests | 2046 |
| Total invariants | 94 |
| Sealed packages | 8 |
| Sealed phases | 9 (A through G.0) |
| CI gates | 6 (G0 through G5) |
| Attack catalog | 10 attacks (2 PASS, 8 FAIL) |

---

## Known Limitations

| Limitation | Status |
|------------|--------|
| Mock-only generators (no real LLM) | By design — determinism first |
| No intent validation | NCR-G1B-001 — planned |
| Forge verdict always FAIL (mock scores = 0) | Expected with mock generators |
| Built dist has ESM directory import issue | Use `npx tsx` on source |

---

## Verification

```bash
npx tsx packages/omega-runner/src/cli/main.ts verify --dir <run_directory> --strict
```

Every run produces a ProofPack with SHA-256 Merkle tree verification.

---

**Standard**: NASA-Grade L4 / DO-178C Level A
**Architect**: Francky
