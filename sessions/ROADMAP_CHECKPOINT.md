# OMEGA ROADMAP CHECKPOINT

**Standard**: RULE-ROADMAP-01 — Every commit must update this file
**Date Created**: 2026-02-15
**Version**: 1.0.0

This file tracks alignment between code implementation and `docs/OMEGA_ROADMAP_OMNIPOTENT.md`.

## Format

Each Sprint/Commit entry records:
- Sprint/Commit ID
- Roadmap Sprint reference
- Features implemented
- Files modified
- Tests added
- Checkpoint hash

---

## Sprint 5 — Roadmap Alignment

### Commit 5.1 — Physics Compliance Sub-Axis

**Date**: 2026-02-15
**Roadmap Sprint**: 3.4 (Physics Compliance)
**Status**: ✅ COMPLETE

**Features Implemented**:
- Created `physics_compliance` axis (weight=0, INFORMATIF)
- Integrated into ECC macro-axis as 5th sub-component
- Threaded `physicsAudit` parameter through call chain: `aesthetic-oracle.ts` → `macro-axes.ts` → `engine.ts`
- Added config entries: `PHYSICS_COMPLIANCE_ENABLED`, `PHYSICS_COMPLIANCE_WEIGHT`
- Created 4 tests (PC-01 to PC-04)

**Files Modified**:
```
packages/sovereign-engine/src/oracle/axes/physics-compliance.ts (CREATED)
packages/sovereign-engine/src/oracle/macro-axes.ts (MODIFIED — computeECC)
packages/sovereign-engine/src/oracle/aesthetic-oracle.ts (MODIFIED — judgeAestheticV3)
packages/sovereign-engine/src/engine.ts (MODIFIED — pass physicsAudit to judgeAestheticV3)
packages/sovereign-engine/src/config.ts (MODIFIED — add PHYSICS_COMPLIANCE_*)
packages/sovereign-engine/tests/oracle/axes/physics-compliance.test.ts (CREATED)
sessions/ROADMAP_CHECKPOINT.md (CREATED)
```

**Tests**:
- PC-01: audit undefined → neutral score 50
- PC-02: audit disabled → neutral score 50, weight=0
- PC-03: audit with physics_score → wraps score, weight=0
- PC-04: structure validation — AxisScore format

**Checkpoint Hash**: *(to be computed after commit)*

**Backward Compatibility**: ✅ Optional `physicsAudit` parameter preserves existing call sites

**Notes**:
- Weight remains 0 until calibration proves correlation
- MODE: INFORMATIF (logged but no effect on composite)
- DEFAULT: OFF (`PHYSICS_COMPLIANCE_ENABLED: false`)

### Commit 5.2 — gate:roadmap + ADR-002 Hashing Policy

**Date**: 2026-02-15
**Roadmap Sprint**: Governance / Traceability Enforcement
**Status**: ✅ COMPLETE

**Features Implemented**:
- Created `gate:roadmap` script with SHA-256 hash verification
- Implemented ADR-002: Hashing Policy for Governance Documents
- Added `npm run gate:roadmap` and `npm run gate:roadmap:update` commands
- Integrated gate into `npm run gate:all` CI pipeline
- Created 3 gate tests (GATE-RD-01 to GATE-RD-03)

**Files Modified**:
```
packages/sovereign-engine/scripts/gate-roadmap.ts (CREATED)
packages/sovereign-engine/tests/gates/gate-roadmap.test.ts (CREATED)
package.json (MODIFIED — add gate:roadmap scripts)
docs/adr/ADR-002-HASHING-POLICY.md (CREATED)
.roadmap-hash.json (CREATED — hash reference)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Tests**:
- GATE-RD-01: gate passes when hash matches
- GATE-RD-02: hash file structure validation
- GATE-RD-03: gate update command creates/updates hash

**Gate Behavior**:
- Verify mode: `npm run gate:roadmap` (fails if hash mismatch)
- Update mode: `npm run gate:roadmap:update` (writes new hash)
- Skips gracefully if roadmap file missing

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- ADR-002: ✅ Hash policy documented and enforced
- DO-178C Level A: ✅ Traceability from roadmap to code

**Notes**:
- SHA-256 provides integrity, not authenticity
- Manual update required after roadmap changes (fail-closed)
- Hash file gitignored for local workflows

### Commit 5.3 — Calibration Runner

**Date**: 2026-02-15
**Roadmap Sprint**: Calibration / "20 LIVE runs" Phase
**Status**: ✅ COMPLETE

**Features Implemented**:
- Created calibration runner script for deterministic N-run pipeline execution
- Added config entries: `CALIBRATION_RUNS`, `CALIBRATION_SCENES`, `CALIBRATION_OUTPUT_PATH`
- Implemented metrics collection: score distribution, verdict counts, stddev
- Produces `calibration-report.json` with statistics
- Created 3 calibration tests (CAL-RUN-01 to CAL-RUN-03)

**Files Modified**:
```
packages/sovereign-engine/scripts/run-calibration.ts (CREATED)
packages/sovereign-engine/tests/calibration/calibration-runner.test.ts (CREATED)
packages/sovereign-engine/src/config.ts (MODIFIED — add CALIBRATION_*)
packages/sovereign-engine/package.json (MODIFIED — add calibrate script)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Tests**:
- CAL-RUN-01: config contains calibration entries
- CAL-RUN-02: calibration script produces report structure
- CAL-RUN-03: calibration counts match total runs

**Usage**:
```bash
npm run calibrate              # Default: 20 runs
npm run calibrate -- --runs=10 # Custom run count
```

**Report Structure**:
- `timestamp`: ISO 8601 timestamp
- `total_runs`: Number of runs executed
- `config`: Calibration configuration
- `results`: Aggregated statistics (seal_count, reject_count, avg_score, min_score, max_score, score_stddev)
- `runs`: Array of individual run results

**Checkpoint Hash**: *(to be computed after commit)*

**Notes**:
- Uses mock provider for deterministic calibration
- Phase "20 LIVE runs" preparation for real LLM calibration
- Report validates physics audit integration

### Hotfix 5.4 — RULE-ROADMAP-02 Enforcement

**Date**: 2026-02-15
**Roadmap Sprint**: Governance Hardening
**Status**: ✅ COMPLETE

roadmap_item: Hotfix 5.4 — RULE-ROADMAP-02 gate hardening
deviation: none
evidence: gate-roadmap.ts hardened with checkpoint parsing + tests GR-01..05

**Features Implemented**:
- Hardened gate:roadmap to parse ROADMAP_CHECKPOINT.md structure
- Validates: roadmap_item, deviation (none|proposed), evidence
- Backward compatible with existing checkpoint format
- Added 5 tests (GR-01 to GR-05)
- RULE-ROADMAP-02 formalized as enforcement rule

**Files Modified**:
```
packages/sovereign-engine/scripts/gate-roadmap.ts (MODIFIED — added checkpoint parsing)
packages/sovereign-engine/tests/gates/gate-roadmap.test.ts (MODIFIED — added GR-01..05)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED — this entry)
```

**Tests**:
- GR-01: PASS — valid checkpoint with all fields
- GR-02: FAIL — checkpoint without roadmap_item
- GR-03: FAIL — checkpoint with invalid deviation
- GR-04: FAIL — checkpoint without evidence
- GR-05: PASS — backward compat with existing format

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields enforced
- Backward compatibility: ✅ Existing format "Roadmap Sprint" still works

**Notes**:
- Hash verification logic preserved (no breaking changes)
- Deviation field is optional (warning only) for backward compat
- Future commits MUST include all three fields: roadmap_item, deviation, evidence

---

## Roadmap Coverage

| Roadmap Sprint | Commit | Status |
|---------------|--------|--------|
| 3.4 Physics Compliance | 5.1 | ✅ COMPLETE |
| Governance / Traceability | 5.2 | ✅ COMPLETE |
| Calibration / 20 LIVE Runs | 5.3 | ✅ COMPLETE |
| Governance Hardening | Hotfix 5.4 | ✅ COMPLETE |

---

**Sprint 5 Status**: ✅ ALL 3 COMMITS + HOTFIX 5.4 COMPLETE

---

## Sprint 6 — Roadmap Sprint 4 (Quality + Activation + Compat)

### Commit 6.1 — Quality M1-M12 Bridge

**Date**: 2026-02-15
**Roadmap Sprint**: 4.1 — Quality M1-M12 rapport annexe
**Status**: ✅ COMPLETE

roadmap_item: Sprint 4.1 — Quality M1-M12 rapport annexe
deviation: proposed
evidence: quality-bridge.ts + engine.ts wiring + tests QM-01..06

**Deviation Note**: Bridge pattern used instead of direct buildQualityEnvelope call due to type incompatibility (StyledOutput, GenesisPlan, ScribeOutput not available in sovereign-engine context).

**Features Implemented**:
- Quality bridge: prose + ForgePacket → QualityM12Report
- 6/12 metrics computed via omega-forge SSOT: M1, M2, M3, M5, M9, M10
- 6/12 metrics degraded (types unavailable): M4, M6, M7, M8, M11, M12
- Wired into SovereignForgeResult as quality_m12
- Feature flag: QUALITY_M12_ENABLED: false (DEFAULT-OFF)

**Files Modified**:
```
packages/sovereign-engine/src/quality/quality-bridge.ts (CREATED)
packages/sovereign-engine/src/config.ts (MODIFIED — add QUALITY_M12_ENABLED)
packages/sovereign-engine/src/engine.ts (MODIFIED — wire quality report)
packages/sovereign-engine/src/index.ts (MODIFIED — export types)
packages/sovereign-engine/tests/quality/quality-bridge.test.ts (CREATED)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Tests**:
- QM-01: returns disabled report when QUALITY_M12_ENABLED=false
- QM-02: quality_score_partial is 0 when disabled
- QM-03: report_hash is deterministic
- QM-04: degraded metrics have reason
- QM-05: computed_count + degraded_count = 12
- QM-06: quality_score_partial is in 0-1 range

**Computed Metrics (6/12)**:
- M1 (contradiction_rate): Uses paragraphs + canon → SSOT omega-forge
- M2 (canon_compliance): Uses paragraphs + canon → SSOT omega-forge
- M3 (coherence_span): Uses paragraphs → SSOT omega-forge
- M5 (memory_integrity): Uses paragraphs → SSOT omega-forge
- M9 (semantic_density): Uses paragraphs → SSOT omega-forge
- M10 (reading_levels): Uses paragraphs → SSOT omega-forge

**Degraded Metrics (6/12)**:
- M4: GenesisPlan not available
- M6/M7: StyledOutput not available
- M8: ScribeOutput not available
- M11: StyledOutput.banality_result not available
- M12: Depends on all M1-M11

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields (roadmap_item, deviation, evidence)
- SSOT: ✅ Imports from omega-forge, no duplication
- DEFAULT-OFF: ✅ QUALITY_M12_ENABLED: false

### Commit 6.2 — Activation physics_compliance

**Date**: 2026-02-15
**Roadmap Sprint**: 4.2 — Activation physics_compliance (weight configurable)
**Status**: ✅ COMPLETE

roadmap_item: Sprint 4.2 — Activation physics_compliance (weight configurable)
deviation: none
evidence: physics-compliance.ts config wiring + macro-axes.ts ECC integration + tests PC-05..06

**Features Implemented**:
- Modified physics-compliance.ts to read weight from SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_WEIGHT
- Modified macro-axes.ts ECC calculation to conditionally include physics_compliance when weight > 0
- Added tests PC-05 (weight reads from config) and PC-06 (score reflects audit)
- Weight defaults to 0 (INFORMATIF mode), can be activated post-calibration

**Files Modified**:
```
packages/sovereign-engine/src/oracle/axes/physics-compliance.ts (MODIFIED — read weight from config)
packages/sovereign-engine/src/oracle/macro-axes.ts (MODIFIED — ECC includes PC when weight > 0)
packages/sovereign-engine/tests/oracle/axes/physics-compliance.test.ts (MODIFIED — add PC-05, PC-06)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Tests**:
- PC-05: weight reads from SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_WEIGHT (default 0)
- PC-06: score reflects audit physics_score

**ECC Calculation Logic**:
- Base weights: tension_14d=3.0, emotion_coherence=2.5, interiority=2.0, impact=2.0 (total=9.5)
- If physics_compliance.weight > 0: add to total_weight, add weighted score to raw_sum
- If physics_compliance.weight = 0: excluded from calculation (INFORMATIF)

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields (roadmap_item, deviation, evidence)
- Activation ready: ✅ Weight configurable, no hardcoded values

---

### Commit 6.3 — Compat Guard v1/v2

**Date**: 2026-02-15
**Roadmap Sprint**: 4.4 — Compat guard v1/v2 (date window)
**Status**: ✅ COMPLETE

roadmap_item: Sprint 4.4 — Compat guard v1/v2 (date window)
deviation: none
evidence: version-guard.ts + engine.ts version field + tests VG-01..05

**Features Implemented**:
- Added `version: '2.0.0'` field to SovereignForgeResult interface
- Added version field to both engine.ts return paths
- Created assertVersion2() compat guard with date-based grace period
- Exported assertVersion2 from index.ts
- Created 5 tests (VG-01 to VG-05)

**Files Modified**:
```
packages/sovereign-engine/src/engine.ts (MODIFIED — add version field to interface and returns)
packages/sovereign-engine/src/compat/version-guard.ts (CREATED)
packages/sovereign-engine/src/index.ts (MODIFIED — export assertVersion2)
packages/sovereign-engine/tests/compat/version-guard.test.ts (CREATED)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Tests**:
- VG-01: v2.0.0 passes silently
- VG-02: undefined warns before cutoff (backward compat)
- VG-03: undefined fails after cutoff (2026-03-01)
- VG-04: wrong version fails immediately
- VG-05: guard structure validation

**Guard Behavior**:
- `version='2.0.0'` → pass silently ✅
- `version=undefined` + before 2026-03-01 → warning only ⚠️
- `version=undefined` + after 2026-03-01 → hard fail ❌
- `version=other` → hard fail ❌

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields (roadmap_item, deviation, evidence)
- Backward compatibility: ✅ Grace period until 2026-03-01
- Date injectable: ✅ currentDate parameter for deterministic testing

---

**Sprint 6 Status**: ✅ ALL 3 COMMITS COMPLETE (6.1 ✅, 6.2 ✅, 6.3 ✅)

---

## Sprint 7 — Post-Roadmap Hardening (IDL Codegen + ECC Sanity)

### Commit 7.1 — IDL + Codegen

**Date**: 2026-02-15
**Roadmap Sprint**: 4.3 — IDL + codegen pour signal-registry (optionnel, registry stabilized)
**Status**: ✅ COMPLETE

roadmap_item: Sprint 4.3 — IDL + codegen pour signal-registry
deviation: none
evidence: signal-registry.idl.json + scripts/codegen-registry.ts + tests IDL-01..08

**Features Implemented**:
- Created signal-registry.idl.json as the source of truth (22 signals)
- Created codegen script that generates registry.ts from IDL
- Added npm scripts: `codegen`, `codegen:verify`
- Generated registry.ts is identical to hand-written version (REGISTRY_HASH unchanged)
- Created 8 tests (IDL-01 to IDL-08)

**Files Created**:
```
packages/signal-registry/signal-registry.idl.json (CREATED — 22 signals extracted from registry.ts)
packages/signal-registry/scripts/codegen-registry.ts (CREATED — IDL → TS codegen)
packages/signal-registry/tests/idl-codegen.test.ts (CREATED — 8 tests)
```

**Files Modified**:
```
packages/signal-registry/package.json (MODIFIED — add codegen scripts)
packages/signal-registry/src/registry.ts (REGENERATED — now AUTO-GENERATED from IDL)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Tests**:
- IDL-01: IDL has valid schema marker
- IDL-02: IDL signal count matches registry (22)
- IDL-03: every IDL signal_id exists in compiled registry
- IDL-04: every registry signal_id exists in IDL
- IDL-05: REGISTRY_HASH is stable after codegen
- IDL-06: all IDL producers are in producers list
- IDL-07: no duplicate signal_id in IDL
- IDL-08: codegen --verify would pass (content match)

**Codegen Behavior**:
- Reads signal-registry.idl.json
- Validates schema, producers, and signal structure
- Groups signals by section (EMOTION, TENSION, NARRATIVE, SCORING, META)
- Generates registry.ts with AUTO-GENERATED header
- `--verify` mode compares generated output with existing file

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields (roadmap_item, deviation, evidence)
- SSOT: ✅ IDL is the source, registry.ts is generated
- DÉTERMINISME: ✅ Same IDL → same registry.ts → same REGISTRY_HASH
- R13-TODO-00: ✅ No TODOs added
- RULE-DEPS-01: ✅ No new dependencies (uses tsx already in devDeps)

**Impact**:
- Zero error risk: Human no longer manually edits registry.ts
- Roadmap 4.3 (optional): ✅ NOW DONE
- Tests: 14 → 22 (+8 IDL tests)

### Commit 7.2 — Gate IDL-drift

**Date**: 2026-02-15
**Roadmap Sprint**: 4.3 — IDL + codegen (gate enforcement)
**Status**: ✅ COMPLETE

roadmap_item: Sprint 4.3 — IDL + codegen (gate enforcement)
deviation: none
evidence: gate:idl wired in gate:all + root package.json

**Features Implemented**:
- Added gate:idl to root package.json
- Wired gate:idl into gate:all CI pipeline
- Gate runs `npm run codegen:verify` to detect manual edits to registry.ts

**Files Modified**:
```
package.json (MODIFIED — add gate:idl, wire into gate:all)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Gate Behavior**:
- Executes `cd packages/signal-registry && npm run codegen:verify`
- Compares generated registry.ts with existing file
- Exit 0 if match (pass), exit 1 if drift detected (fail)
- Prevents manual edits to registry.ts without updating IDL

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields (roadmap_item, deviation, evidence)
- Gates: 4 → 5 (added gate:idl)

**Notes**:
- Double protection: Tests (IDL-03/04) verify content, gate verifies format
- Any manual edit to registry.ts will fail gate:idl
- To add/modify signals: edit IDL → run codegen → tests pass

### Commit 7.3 — ECC Weights Sanity Test

**Date**: 2026-02-15
**Roadmap Sprint**: Post-roadmap — ChatGPT audit finding (ECC weights sanity)
**Status**: ✅ COMPLETE

roadmap_item: Post-roadmap — ChatGPT audit finding (ECC weights sanity)
deviation: none
evidence: tests/oracle/macro-axes-ecc-sanity.test.ts + ECC-SAN-01..04

**Features Implemented**:
- Created ECC weights sanity tests (4 tests: ECC-SAN-01 to ECC-SAN-04)
- Verifies physics_compliance integration doesn't corrupt ECC calculation
- Tests cover: score range validation, physics weight=0 behavior, sub_scores structure

**Files Created**:
```
packages/sovereign-engine/tests/oracle/macro-axes-ecc-sanity.test.ts (CREATED — 4 tests)
```

**Files Modified**:
```
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Tests**:
- ECC-SAN-01: ECC score is 0-100 range without physics
- ECC-SAN-02: ECC score is 0-100 range WITH physics audit
- ECC-SAN-03: ECC with physics_compliance weight=0 ignores physics score
- ECC-SAN-04: ECC sub_scores includes physics_compliance

**Test Logic**:
- ECC-SAN-01: Verifies normal ECC calculation produces valid 0-100 scores
- ECC-SAN-02: Verifies ECC with physics audit still produces valid 0-100 scores
- ECC-SAN-03: **Critical**: With weight=0 (default), physics_score should NOT affect ECC
  - Tests: no physics, perfect physics (100), bad physics (0) → all produce SAME ECC score
  - This validates the conditional inclusion logic in macro-axes.ts
- ECC-SAN-04: Verifies physics_compliance appears in sub_scores with weight=0

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields (roadmap_item, deviation, evidence)
- ChatGPT audit: ✅ RESOLVED (ECC weights sanity confirmed)
- DÉTERMINISME: ✅ Uses MockSovereignProvider for deterministic tests

**Impact**:
- Tests sovereign: 250 → 254 (+4 ECC sanity)
- ChatGPT audit finding: ✅ ADDRESSED

---

**Sprint 7 Status**: ✅ ALL 3 COMMITS COMPLETE (7.1 ✅, 7.2 ✅, 7.3 ✅)

---

## Sprint 8 — Hardening Minimum (Release Discipline + Proof Pack + Calibration CI)

### Commit 8.1 — ProofPack Generator

**Date**: 2026-02-15
**Roadmap Sprint**: HARDEN-PP-01
**Status**: ✅ COMPLETE

roadmap_item: HARDEN-PP-01
deviation: none
evidence: scripts/proofpack/generate-proofpack.ts + tests PP-01..03 + npm run proofpack:generate

**Features Implemented**:
- Created deterministic ProofPack generator (MANIFEST.json, HASHES.sha256, EVIDENCE.md)
- Exported `generateProofPack()` function with CLI wrapper
- Generates in `proofpacks/<tag_or_run_id>/` with stable output
- SHA-256 hashes sorted lexicographically for determinism
- BOM-safe JSON parsing for package.json files

**Files Created**:
```
scripts/proofpack/generate-proofpack.ts (CREATED — generator + CLI)
packages/sovereign-engine/tests/proofpack/generate-proofpack.test.ts (CREATED — 3 tests)
proofpacks/local/ (GENERATED — MANIFEST + HASHES + EVIDENCE)
```

**Files Modified**:
```
package.json (MODIFIED — add proofpack:generate, proofpack:clean)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Tests**:
- PP-01: generateProofPack creates all 3 files (MANIFEST, HASHES, EVIDENCE)
- PP-02: HASHES.sha256 sorted lexicographically by path
- PP-03: Generation does not modify files outside outDir

**ProofPack Contents**:
- MANIFEST.json: schema_version, git info, node version, packages, gates list
- HASHES.sha256: SHA-256 hashes of critical files (ROADMAP_CHECKPOINT, IDL, registry.ts, MANIFEST canonical)
- EVIDENCE.md: Reproduction steps and file listing

**Determinism**:
- BOM removal for package.json parsing
- Lexicographic path sorting in HASHES.sha256
- Canonical MANIFEST hash (excludes created_utc timestamp)

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields (roadmap_item, deviation, evidence)
- DÉTERMINISME: ✅ Sorted hashes, BOM-safe, canonical manifest
- FAIL-CLOSED: ✅ Warns on missing files
- NO-MAGIC: ✅ No inline constants
- RULE-DEPS-01: ✅ No new dependencies (uses existing tsx)

**Impact**:
- Tests sovereign: 254 → 257 (+3 proofpack tests)
- New artifacts: MANIFEST, HASHES, EVIDENCE

### Commit 8.2 — Gate ProofPack fail-closed

**Date**: 2026-02-15
**Roadmap Sprint**: HARDEN-GATE-PP-01
**Status**: ✅ COMPLETE

roadmap_item: HARDEN-GATE-PP-01
deviation: none
evidence: scripts/gate-proofpack.ts + tests GP-PP-01..04 + gate:all integration

**Features Implemented**:
- Created gate:proofpack script with fail-closed verification
- Exported `verifyProofPack()` function for testing
- Checks presence of MANIFEST.json, HASHES.sha256, EVIDENCE.md
- Verifies HASHES.sha256 contains required critical files (ROADMAP_CHECKPOINT, IDL, registry.ts)
- Wired gate:proofpack into gate:all (last position)

**Files Created**:
```
scripts/gate-proofpack.ts (CREATED — gate script + testable function)
packages/sovereign-engine/tests/gates/gate-proofpack.test.ts (CREATED — 4 tests)
packages/sovereign-engine/tests/fixtures/proofpack-valid/ (CREATED — test fixture)
```

**Files Modified**:
```
package.json (MODIFIED — add gate:proofpack, wire into gate:all)
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
```

**Tests**:
- GP-PP-01: FAIL if MANIFEST.json absent
- GP-PP-02: FAIL if HASHES.sha256 absent
- GP-PP-03: FAIL if ROADMAP_CHECKPOINT.md absent from HASHES
- GP-PP-04: PASS on valid proofpack fixture

**Gate Behavior**:
- Fail-closed: exits 1 if any required file missing
- Explicit error messages for each missing component
- Verifies content of HASHES.sha256 (not just presence)

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields (roadmap_item, deviation, evidence)
- FAIL-CLOSED: ✅ Fails on missing artifacts
- RULE-DEPS-01: ✅ No new dependencies

**Impact**:
- Tests sovereign: 257 → 261 (+4 gate proofpack tests)
- Gates: 5 → 6 (added gate:proofpack)

### Commit 8.3 — Calibration Corpus Figé + CI

**Date**: 2026-02-15
**Roadmap Sprint**: HARDEN-CAL-CI-01
**Status**: ✅ COMPLETE

roadmap_item: HARDEN-CAL-CI-01
deviation: none
evidence: calibration-corpus/ (5 cases) + tests/calibration/calibration-ci.test.ts (5 tests)

**Features Implemented**:
- Created fixed calibration corpus (5 cases: CAL-CASE-01 to CAL-CASE-05)
- Each case: stable run_id, seed, prose >= 8 paragraphs
- Created CI test suite validating corpus structure and pipeline execution
- Tests execute judgeAesthetic on each case (no LIVE LLM, uses MockSovereignProvider)
- Validates corpus readability, paragraph count, and scoring output

**Files Created**:
```
packages/sovereign-engine/tests/fixtures/calibration-corpus/CAL-CASE-01.json (CREATED)
packages/sovereign-engine/tests/fixtures/calibration-corpus/CAL-CASE-02.json (CREATED)
packages/sovereign-engine/tests/fixtures/calibration-corpus/CAL-CASE-03.json (CREATED)
packages/sovereign-engine/tests/fixtures/calibration-corpus/CAL-CASE-04.json (CREATED)
packages/sovereign-engine/tests/fixtures/calibration-corpus/CAL-CASE-05.json (CREATED)
packages/sovereign-engine/tests/calibration/calibration-ci.test.ts (CREATED — 5 tests)
```

**Files Modified**:
```
sessions/ROADMAP_CHECKPOINT.md (MODIFIED)
proofpacks/local/ (REGENERATED — includes corpus in hashes)
```

**Tests**:
- CAL-CI-01: Case 01 corpus valid structure + judgeAesthetic runs
- CAL-CI-02: Case 02 corpus valid structure + judgeAesthetic runs
- CAL-CI-03: Case 03 corpus valid structure + judgeAesthetic runs
- CAL-CI-04: Case 04 corpus valid structure + judgeAesthetic runs
- CAL-CI-05: Case 05 corpus valid structure + judgeAesthetic runs

**Corpus Themes**:
- CAL-CASE-01: Peur → Espoir (8 paragraphes)
- CAL-CASE-02: Joie explosive (8 paragraphes)
- CAL-CASE-03: Colère → Calme (8 paragraphes)
- CAL-CASE-04: Tristesse avec espoir distant (8 paragraphes)
- CAL-CASE-05: Surprise → Compréhension (8 paragraphes)

**Checkpoint Hash**: *(to be computed after commit)*

**Compliance**:
- RULE-ROADMAP-01: ✅ Checkpoint updated
- RULE-ROADMAP-02: ✅ Structured fields (roadmap_item, deviation, evidence)
- DÉTERMINISME: ✅ Fixed corpus, stable run_id/seed
- NO LIVE LLM: ✅ MockSovereignProvider used
- >= 8 paragraphs: ✅ All cases validated

**Impact**:
- Tests sovereign: 261 → 266 (+5 calibration CI tests)
- Corpus: 0 → 5 fixed cases

---

**Sprint 8 Status**: ✅ ALL 3 COMMITS COMPLETE (8.1 ✅, 8.2 ✅, 8.3 ✅)
