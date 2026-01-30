# DECISION: IGNITION ORACLES POLICY
# ═══════════════════════════════════════════════════════════════════════════════════════════

## DECISION ID
DEC-IGNITION-001

## DATE
2026-01-31T00:30:00+01:00

## RUN_ID
PHASE_C

## AUTHORITY
Francky (Architecte Suprême)

---

## 1. CONTEXT

### Problem Statement
During Phase T/Q audit, finding **T4** identified that raw `vitest` stdout is **non-deterministic**:
- Test order may vary
- Benchmark timings fluctuate
- Progress indicators interleave
- Memory reports change between runs

This made `stdout` unusable as a **release gate hash**.

### Solution Implemented
Replace raw stdout hashing with a **structured oracle system**:
- **ORACLE-1**: Canonical test report (normalized JSON, stable hash)
- **ORACLE-2**: Distribution manifest (build artifacts hash)
- **ORACLE-X**: Runtime manifest (environment fingerprint)
- **IGNITION**: Unified gate that executes all oracles

---

## 2. DEFINITION OF PASS

### ORACLE-1 (Test Canon)
- Execute: `npm run oracle:tests`
- Output: `artefacts/oracles/test_report.canon.json`
- PASS condition: All tests pass, hash is produced

### ORACLE-2 (Dist Manifest)
- Execute: `npm run oracle:dist`
- Output: `artefacts/oracles/dist_manifest.sha256`
- PASS condition: Hash matches baseline in `baselines/oracles/dist_manifest.expected.sha256`

### ORACLE-X (Runtime Manifest)
- Execute: `npm run oracle:runtime`
- Output: `artefacts/oracles/runtime_manifest.sha256`
- PASS condition: Hash is produced (informational, not baselined by default)

### IGNITION (Unified Gate)
- Execute: `npm run ignition`
- PASS condition: 
  - ORACLE-1 tests pass
  - ORACLE-2 baseline matches
  - ORACLE-X recorded
  - Summary written to `artefacts/oracles/ignition_summary.json`

---

## 3. BASELINE POLICY (STRICT)

Updates to `baselines/oracles/*` are allowed **ONLY IF**:

1. **Intentional change**: The commit message explicitly documents the reason for baseline change
2. **Triple-run proof**: Three independent runs produce identical hashes, stored in `nexus/proof/*/EVIDENCE/triple_run_*`
3. **Architect approval**: Francky has reviewed and approved the change

### Baseline Files Governed
- `baselines/oracles/dist_manifest.expected.sha256`
- (Future) Any additional baseline files in this directory

---

## 4. FORBIDDEN

The following are **STRICTLY FORBIDDEN**:

| Forbidden Practice | Reason |
|--------------------|--------|
| Raw vitest stdout as blocking gate | Non-deterministic (T4) |
| Baseline updates without triple-run proof | No reproducibility guarantee |
| Silent baseline updates | Audit trail required |
| Hash comparison without canonical normalization | Order-dependent hashes fail |

---

## 5. SOURCES

### Phase Audit Trail
| Phase | Path | Status |
|-------|------|--------|
| Phase T | `nexus/proof/phase_t_launch_audit/` | SEALED |
| Phase Q | `nexus/proof/phase_q_precision/` | SEALED |
| Phase ORACLES | `nexus/proof/phase_oracles_impl/` | SEALED |

### Key Commits
- `c500ed5`: feat(oracles): ignition oracle system + MM3-MM5 coverage
- `94e2bef`: docs(phase-oracles): add context comments to evidence hash files

### Documentation
- `docs/IGNITION_ORACLES.md`: User-facing documentation

### Evidence
- `nexus/proof/phase_oracles_impl/EVIDENCE/hashes/`: Canonical hashes
- `nexus/proof/phase_oracles_impl/EVIDENCE/triple_run_oracle2/`: Determinism proof

---

## 6. ENFORCEMENT

This policy is enforced by:
- **CI Gate**: `.github/workflows/ignition-gate.yml` (added Phase C)
- **Manual Review**: PR review must check baseline changes against policy
- **Audit Trail**: All decisions logged in `DECISIONS_INDEX.md`

---

## 7. SELF-HASH

**SHA-256 of this document (computed before insertion):**
`0B56D405FFDA9260C5597573027389C92A42B26600F9A8175E1CEB25150B0058`

*This hash will be computed after file creation and written here.*

---

## SEAL

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║   DECISION: DEC-IGNITION-001                                                              ║
║   Status: CANONICAL                                                                       ║
║   Date: 2026-01-31                                                                        ║
║   Authority: Francky (Architecte Suprême)                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---
**END OF DECISION DEC-IGNITION-001**
