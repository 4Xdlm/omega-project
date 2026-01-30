# PHASE ORACLES — PROOF INDEX
# ═══════════════════════════════════════════════════════════════════════════════════════════

## Purpose
This index provides navigation to all Phase ORACLES evidence and artifacts.
Use this document to locate any proof element in under 10 seconds.

---

## Quick Verification

**One-liner to verify Phase ORACLES integrity:**
```bash
npm run ignition
```

Expected result: `IGNITION: PASS`

---

## What is Phase ORACLES?

Phase ORACLES replaced raw stdout hashing (found non-deterministic in Phase T/Q audit)
with a structured oracle system:

| Oracle | Purpose | Script |
|--------|---------|--------|
| ORACLE-1 | Canonical test report | `npm run oracle:tests` |
| ORACLE-2 | Distribution manifest hash | `npm run oracle:dist` |
| ORACLE-X | Runtime environment manifest | `npm run oracle:runtime` |
| IGNITION | Unified gate (runs all) | `npm run ignition` |

---

## Evidence Locations

### Artefacts (Generated)
| File | Description |
|------|-------------|
| `artefacts/oracles/test_report.canon.json` | Normalized test results |
| `artefacts/oracles/test_report.canon.sha256` | Hash of canon report |
| `artefacts/oracles/dist_manifest.txt` | List of dist files |
| `artefacts/oracles/dist_manifest.sha256` | Hash of dist manifest |
| `artefacts/oracles/runtime_manifest.txt` | Environment fingerprint |
| `artefacts/oracles/runtime_manifest.sha256` | Hash of runtime manifest |
| `artefacts/oracles/ignition_summary.json` | Combined ignition result |

### Baselines
| File | Description |
|------|-------------|
| `baselines/oracles/dist_manifest.expected.sha256` | ORACLE-2 baseline (STRICT policy) |

### Evidence (Proof Pack)
| Path | Description |
|------|-------------|
| `nexus/proof/phase_oracles_impl/EVIDENCE/hashes/` | Canonical hash files |
| `nexus/proof/phase_oracles_impl/EVIDENCE/triple_run_oracle2/` | Determinism proof (3 runs) |
| `nexus/proof/phase_oracles_impl/EVIDENCE/git_head.txt` | Commit at certification |
| `nexus/proof/phase_oracles_impl/EVIDENCE/node_version.txt` | Node.js version |

### Canonical Hashes
| Oracle | Hash | File |
|--------|------|------|
| ORACLE-1 | `2F6F1B7CD0930BC0A8A09B04D614EFBA0C010AEF35F07BA23A5584650CD07F00` | `ORACLE_1_CANON_REPORT_SHA256.txt` |
| ORACLE-2 | `19CE02017768E3AE7DE683EA9C161D2B6E50273376000F5FBF0814D957B99382` | `ORACLE_2_TRIPLE_RUN_SHA256.txt` |
| ORACLE-X | `16A9DA799493DDDADC2F2D1815B38EC42857375E65FB1300667449012613C061` | `ORACLE_X_RUNTIME_MANIFEST_SHA256.txt` |

---

## Source Code

| Path | Description |
|------|-------------|
| `tools/oracles/oracle_test_report.ts` | ORACLE-1 implementation |
| `tools/oracles/oracle_dist_manifest.ts` | ORACLE-2 implementation |
| `tools/oracles/oracle_runtime_manifest.ts` | ORACLE-X implementation |
| `tools/oracles/ignition.ts` | IGNITION gate |

### Tests
| Path | Description |
|------|-------------|
| `tests/oracles/oracle_dist_manifest.test.ts` | ORACLE-2 unit tests |
| `tests/oracles/mm3_determinism.test.ts` | MM3 coverage |
| `tests/oracles/mm4_isolation.test.ts` | MM4 coverage |
| `tests/oracles/mm5_batch.test.ts` | MM5 coverage |

---

## Related Documents

| Document | Path |
|----------|------|
| User Documentation | `docs/IGNITION_ORACLES.md` |
| Decision Canon | `nexus/proof/decisions/DEC_IGNITION_ORACLES_POLICY__RUN_PHASE_C__SHA_0B56D405.md` |
| Decisions Index | `nexus/proof/decisions/DECISIONS_INDEX.md` |

---

## CI Enforcement

The IGNITION gate is enforced in CI:
- Workflow: `.github/workflows/ignition-gate.yml`
- Trigger: Push/PR to master/main
- Blocking: Yes (IGNITION must PASS)

---

## Phase Status

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║   Phase: ORACLES                                                                          ║
║   Status: SEALED                                                                          ║
║   Date: 2026-01-31                                                                        ║
║   Commits: c500ed5, 94e2bef                                                               ║
║   Tag: OMEGA_PHASE_C_SENTINEL_SEALED__2026-01-31                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
```

---
**END OF INDEX**
