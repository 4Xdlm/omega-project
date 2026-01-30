# T0_BASELINE
**STATUS**: PASS
**RUN_ID**: B3B09F008BC17BDF

## SCOPE
Establish reproducibility baseline: RUN_ID, timestamp, git state, toolchain versions.

## ARTEFACTS
| File | SHA-256 (first 16 chars) | Path |
|------|--------------------------|------|
| RUN_ID.txt | (text: B3B09F008BC17BDF) | EVIDENCE/RUN_ID.txt |
| RUN_SEED.json | (see RUN_SEED_SHA256.txt) | EVIDENCE/RUN_SEED.json |
| time.txt | 2026-01-30T21:45:31+01:00 | EVIDENCE/time.txt |
| git_head.txt | b8afff6a99121d9c | EVIDENCE/git_head.txt |
| node_version.txt | v24.12.0 | EVIDENCE/node_version.txt |
| npm_version.txt | 11.6.2 | EVIDENCE/npm_version.txt |
| systeminfo.txt | Windows 11 26200 | EVIDENCE/systeminfo.txt |

## FINDINGS

### F0.1 RUN SEED CAPTURED
- **RUN_ID**: B3B09F008BC17BDF
- **Timestamp**: 2026-01-30T21:20:17.2103648+01:00
- **Git HEAD**: b8afff6a99121d9c4bd1ae5275ee4b41f3ed8ccc
- **Evidence**: EVIDENCE/RUN_SEED.json

### F0.2 TOOLCHAIN VERSIONS
- **Node.js**: v24.12.0
- **npm**: 11.6.2
- **Evidence**: EVIDENCE/node_version.txt, EVIDENCE/npm_version.txt

### F0.3 SYSTEM ENVIRONMENT
- **OS**: Microsoft Windows 11 Famille (10.0.26200)
- **CPU**: Intel64 Family 6 Model 198 @ 3900 MHz
- **RAM**: 65,242 MB total
- **Evidence**: EVIDENCE/systeminfo.txt

### F0.4 GIT STATE (WARNING)
- **Branch**: master
- **HEAD**: b8afff6a99121d9c4bd1ae5275ee4b41f3ed8ccc
- **Working Tree**: DIRTY (21 modified, 2 deleted, 5 untracked)
- **Evidence**: EVIDENCE/git_status_porcelain.txt

Modified files:
- concurrency_test.ts, index.ts, invariants.ts, load.ts, load_test.ts
- lock_manager_more_test.ts, quarantine.ts, quarantine_more_test.ts
- robustness_test.ts, run_pipeline.ts, save_test.ts, store_test.ts
- src/runner/capsule.ts, src/runner/main.ts, src/runner/types.ts
- packages/omega-segment-engine/tsconfig.json, tsconfig.json
- intents/intent_mvp.json, sessions/SESSION_INDEX.md

Deleted files: gen_analysis.ts, mock_runner.ts

Untracked: 11, artefacts/runs/run_intent_test_1/, intents/intent_test.json, nexus/proof/phase_t_launch_audit/, prompts/

---

**SECTION STATUS**: PASS (baseline captured, dirty tree noted as warning)
