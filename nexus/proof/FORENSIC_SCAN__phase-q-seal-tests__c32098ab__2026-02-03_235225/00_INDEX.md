# 00_INDEX.md â€” FORENSIC SCAN x1000

## Scan Metadata
| Field | Value |
|-------|-------|
| Branch | phase-q-seal-tests |
| HEAD | c32098ab |
| Date | 2026-02-03 |
| Output | nexus/proof/FORENSIC_SCAN__phase-q-seal-tests__c32098ab__2026-02-03_235225/ |

## How to Read This Pack
1. Start with `01_EXEC_SUMMARY.md` for high-level overview
2. Check `FINAL_VERDICT.md` for PASS/FAIL
3. Review `FIND_01_FINDINGS.md` for issues
4. Follow `FIND_02_PATCH_PLAN.md` for remediation

---

## Table of Contents

### BLOC A â€” Index & Synthesis
- [00_INDEX.md](./00_INDEX.md) â€” This file
- [01_EXEC_SUMMARY.md](./01_EXEC_SUMMARY.md) â€” Executive summary
- [02_REPO_TREE.txt](./02_REPO_TREE.txt) â€” Full file tree with sizes
- [03_SHA256_MANIFEST.txt](./03_SHA256_MANIFEST.txt) â€” SHA256 of all files
- [FINAL_VERDICT.md](./FINAL_VERDICT.md) â€” Final PASS/FAIL

### BLOC B â€” Environment & Traceability
- [04_TOOLCHAIN_LOCK.md](./04_TOOLCHAIN_LOCK.md) â€” Node, npm, vitest, OS
- [05_EXECUTION_LOG.ndjson](./05_EXECUTION_LOG.ndjson) â€” Event log
- [06_SIZE_INVENTORY.md](./06_SIZE_INVENTORY.md) â€” Sizes + top 100 files
- [07_TIMESTAMP_LOCK.md](./07_TIMESTAMP_LOCK.md) â€” Start/end/duration

### BLOC C â€” Git Forensics
- [GIT_01_STATE.md](./GIT_01_STATE.md) â€” Branch, HEAD, remotes, log
- [GIT_02_TAGS_AUDIT.md](./GIT_02_TAGS_AUDIT.md) â€” Tags
- [GIT_03_SESSIONS_MAP.md](./GIT_03_SESSIONS_MAP.md) â€” SESSION_SAVE commits
- [GIT_04_DIFF_CLEAN.md](./GIT_04_DIFF_CLEAN.md) â€” Working tree state
- [GIT_05_ROADMAP_TRACE.md](./GIT_05_ROADMAP_TRACE.md) â€” Roadmaps/versions

### BLOC D â€” Quality Gates
- [QA_01_TEST_BASELINE.md](./QA_01_TEST_BASELINE.md) â€” Full test suite
- [QA_02_TEST_DECISION_ENGINE.md](./QA_02_TEST_DECISION_ENGINE.md) â€” Decision engine
- [QA_03_BUILD.md](./QA_03_BUILD.md) â€” Build results
- [QA_04_TYPECHECK.md](./QA_04_TYPECHECK.md) â€” Typecheck
- [QA_05_TODO_ANY_TSIGNORE.md](./QA_05_TODO_ANY_TSIGNORE.md) â€” Code quality scan
- [QA_06_VITEST_WIRING.md](./QA_06_VITEST_WIRING.md) â€” Wiring check
- [QA_07_COVERAGE.md](./QA_07_COVERAGE.md) â€” Coverage status

### BLOC E â€” Determinism
- [DET_01_PRIMITIVES_SCAN.md](./DET_01_PRIMITIVES_SCAN.md) â€” Non-deterministic primitives
- [DET_02_REPEATABILITY.md](./DET_02_REPEATABILITY.md) â€” Back-to-back runs
- [DET_03_SEEDED_PRNG_AUDIT.md](./DET_03_SEEDED_PRNG_AUDIT.md) â€” SeededPRNG usage

### BLOC F â€” Architecture
- [ARCH_01_PACKAGES_INVENTORY.md](./ARCH_01_PACKAGES_INVENTORY.md) â€” Package list
- [ARCH_02_DEP_GRAPH.md](./ARCH_02_DEP_GRAPH.md) â€” Dependency graph
- [ARCH_03_CYCLE_DETECTION.md](./ARCH_03_CYCLE_DETECTION.md) â€” Cycle check
- [ARCH_04_EXCHANGE_CONTRACTS.md](./ARCH_04_EXCHANGE_CONTRACTS.md) â€” I/O contracts
- [ARCH_05_PUBLIC_API_SURFACE.md](./ARCH_05_PUBLIC_API_SURFACE.md) â€” Public exports

### BLOC G â€” Documentation
- [DOC_01_DOC_INDEX.md](./DOC_01_DOC_INDEX.md) â€” All docs
- [DOC_02_TRACEABILITY_MATRIX.md](./DOC_02_TRACEABILITY_MATRIX.md) â€” Module traceability
- [DOC_03_ROADMAP_STATUS.md](./DOC_03_ROADMAP_STATUS.md) â€” Roadmap status
- [DOC_04_PROOF_PACKS_INDEX.md](./DOC_04_PROOF_PACKS_INDEX.md) â€” Proof packs

### BLOC H â€” Security
- [SEC_01_NPM_AUDIT.md](./SEC_01_NPM_AUDIT.md) â€” npm audit
- [SEC_02_BINARIES.md](./SEC_02_BINARIES.md) â€” Binary inventory
- [SEC_03_LICENSE_FOOTPRINT.md](./SEC_03_LICENSE_FOOTPRINT.md) â€” Licenses

### BLOC I â€” Performance
- [PERF_01_TIMINGS.md](./PERF_01_TIMINGS.md) â€” Test/build timings
- [PERF_02_TOP_SLOW_TESTS.md](./PERF_02_TOP_SLOW_TESTS.md) â€” Slowest tests
- [PERF_03_SCALE_RISKS.md](./PERF_03_SCALE_RISKS.md) â€” Scale projections

### BLOC J â€” Findings
- [FIND_01_FINDINGS.md](./FIND_01_FINDINGS.md) â€” All findings
- [FIND_02_PATCH_PLAN.md](./FIND_02_PATCH_PLAN.md) â€” Remediation plan
- [FIND_03_QUICK_WINS.md](./FIND_03_QUICK_WINS.md) â€” Quick wins

### BLOC K â€” Radical
- [RADICAL_01_ATLAS.md](./RADICAL_01_ATLAS.md) â€” Knowledge graph

### BLOC L â€” Archive
- [ARCHIVE_SHA256.txt](./ARCHIVE_SHA256.txt) â€” ZIP hash
- [ARCHIVE_CONTENTS.txt](./ARCHIVE_CONTENTS.txt) â€” ZIP file list

### Raw Outputs
- [QA_01_raw_baseline.txt](./QA_01_raw_baseline.txt)
- [QA_02_raw_decision_engine.txt](./QA_02_raw_decision_engine.txt)
- [QA_03_raw_build.txt](./QA_03_raw_build.txt)
- [QA_04_raw_typecheck.txt](./QA_04_raw_typecheck.txt)
- [SEC_01_raw_npm_audit.txt](./SEC_01_raw_npm_audit.txt)
- [DET_02_raw_decision_engine_run2.txt](./DET_02_raw_decision_engine_run2.txt)
- [DET_02_raw_baseline_run2.txt](./DET_02_raw_baseline_run2.txt)
