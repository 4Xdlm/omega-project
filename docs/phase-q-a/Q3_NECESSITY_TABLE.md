# Q3 — Necessity of Modules

**Phase**: Q-A (Architecture Audit)
**Date**: 2026-02-10
**HEAD**: 923df7c8
**Packages audited**: 8

---

## Summary

| Package | Phase | Tests | Invariants | Dependents | Dependencies | Verdict |
|---------|-------|-------|------------|------------|-------------|---------|
| genesis-planner | C.1 | 154 | 10 | 5 | 1 | ESSENTIAL |
| scribe-engine | C.2 | 232 | 8 | 4 | 2 | ESSENTIAL |
| style-emergence-engine | C.3 | 241 | 10 | 3 | 3 | ESSENTIAL |
| creation-pipeline | C.4 | 318 | 12 | 2 | 4 | ESSENTIAL |
| omega-forge | C.5 | 304 | 14 | 1 | 5 | ESSENTIAL |
| omega-runner | D.1+H1 | 207 | 13 | 0 | 6 | ESSENTIAL |
| omega-governance | D.2+F | 335 | 18 | 0 | 1 | ESSENTIAL |
| omega-release | G.0 | 218 | 10 | 0 | 1 | ESSENTIAL |

**Result: 8/8 ESSENTIAL. 0 REDUNDANT. 0 UNJUSTIFIED. 0 INCONCLUSIVE.**

---

## Detail by Package

### genesis-planner (C.1)

**1. Unique role**: Transforms 5 narrative inputs (Intent, Canon, Constraints, StyleGenome, EmotionTarget) into a structured GenesisPlan with arcs, scenes, beats, seeds, tension curves, and evidence chain.

**2. Inputs**: `Intent`, `Canon`, `Constraints`, `StyleGenomeInput`, `EmotionTarget`, `GConfig` (all defined locally in `types.ts`). Uses `canonicalize()` and `sha256()` from `@omega/canon-kernel`.

**3. Outputs**: `GenesisPlan`, `GenesisReport`, `ValidationResult`, `GEvidenceChain`, `GenesisMetrics` — consumed by creation-pipeline, scribe-engine, style-emergence-engine, omega-forge, omega-runner.

**4. If removed, what BREAKS**: creation-pipeline (stage-genesis fails), scribe-engine (10+ type imports break), style-emergence-engine (5 type imports), omega-forge (EmotionWaypoint re-export), omega-runner (GConfig/createDefaultConfig missing). 8 of 10 invariants (G-INV-01 through G-INV-10) fail.

**5. If removed, what stays unchanged**: canon-kernel, omega-governance, omega-release.

**6. Dependents**: creation-pipeline, scribe-engine, style-emergence-engine, omega-forge, omega-runner (5 packages).

**7. Dependencies**: `@omega/canon-kernel` only.

**Verdict**: **ESSENTIAL** — Sole narrative plan generator. 5 downstream consumers. No alternative implementation. Removal breaks entire pipeline from C.1 onward.

**Evidence**: `packages/genesis-planner/package.json`, `src/index.ts` (30+ exports), `src/planner.ts` (main entry), `src/types.ts`.

---

### scribe-engine (C.2)

**1. Unique role**: Transforms GenesisPlan into controlled prose through deterministic segmentation, skeleton construction, rhetorical weaving, and a multi-pass rewrite loop with 7 gates + 6 oracles.

**2. Inputs**: `GenesisPlan`, `Canon`, `StyleGenomeInput`, `EmotionTarget`, `Constraints` (from genesis-planner), `SConfig` (internal), `timestamp`. Uses `canonicalize()`, `sha256()` from canon-kernel.

**3. Outputs**: `ScribeOutput`, `ProseDoc`, `ProseParagraph`, `ScribeReport`, `SVerdict` — consumed by creation-pipeline (stage-scribe), style-emergence-engine (6 detector/profiler modules), omega-forge (quality envelope), omega-runner (transitive).

**4. If removed, what BREAKS**: creation-pipeline F2 stage (no prose generation), style-emergence-engine (no prose input to analyze), omega-forge (no quality measurement), omega-runner (pipeline incomplete). 8 invariants (S-INV-01 through S-INV-08) fail.

**5. If removed, what stays unchanged**: genesis-planner (upstream), canon-kernel.

**6. Dependents**: creation-pipeline, style-emergence-engine, omega-forge, omega-runner (4 packages).

**7. Dependencies**: `@omega/canon-kernel`, `@omega/genesis-planner`.

**Verdict**: **ESSENTIAL** — Sole prose generation module. 7 gates + 6 oracles for quality governance. No alternative. Removal eliminates narrative text output.

**Evidence**: `packages/scribe-engine/package.json`, `src/index.ts` (27 exports), `src/engine.ts` (S0-S6 pipeline), `src/types.ts`.

---

### style-emergence-engine (C.3)

**1. Unique role**: Profiles prose style against a genome, runs tournament self-play variants, detects AI/genre/banality artifacts, harmonizes voice coherence, and produces certified styled output with evidence chain.

**2. Inputs**: `ScribeOutput` (from scribe-engine), `StyleGenomeInput`, `Constraints` (from genesis-planner), `EConfig` (internal), `timestamp`. Uses `canonicalize()`, `sha256()` from canon-kernel.

**3. Outputs**: `StyledOutput`, `StyleReport`, `StyledParagraph[]`, `StyleProfile`, `IADetectionResult`, `GenreDetectionResult`, `BanalityResult`, `TournamentResult`, `EEvidenceChain` — consumed by creation-pipeline (F3 stage + 8 unified gates), omega-forge (M6/M7 metrics), omega-runner (transitive).

**4. If removed, what BREAKS**: creation-pipeline F3 stage (compilation fails), all 8 unified gates (receive undefined StyledOutput), omega-forge metrics (M6/M7), omega-runner CLI (pipeline incomplete). 10 invariants (E-INV-01 through E-INV-10) fail.

**5. If removed, what stays unchanged**: canon-kernel, genesis-planner, scribe-engine (upstream layers).

**6. Dependents**: creation-pipeline, omega-forge, omega-runner (3 packages + 8 unified gates).

**7. Dependencies**: `@omega/canon-kernel`, `@omega/genesis-planner`, `@omega/scribe-engine`.

**Verdict**: **ESSENTIAL** — Sole style profiling and anti-AI detection module. Tournament self-play is unique. Removal collapses pipeline at F3 and all downstream gates.

**Evidence**: `packages/style-emergence-engine/package.json`, `src/index.ts`, `src/engine.ts` (E0-E6 pipeline), `src/types.ts`.

---

### creation-pipeline (C.4)

**1. Unique role**: Orchestrates the complete end-to-end flow (F0-F8) chaining genesis planning, prose generation, style emergence, 8 unified gates validation, evidence/proof-pack assembly into a deterministic CreationResult.

**2. Inputs**: `IntentPack` (internal composite type), `C4Config` (internal), `GConfig` (genesis), `SConfig` (scribe), `EConfig` (style), `timestamp`.

**3. Outputs**: `CreationResult` (comprehensive: pipeline_id, output_hash, all stage outputs, unified gates, evidence chain, proof pack, report, verdict) — consumed by omega-forge (mandatory input to C.5) and omega-runner (orchestrateCreate/orchestrateFull).

**4. If removed, what BREAKS**: omega-runner (runCreate/runFull call runCreation() with no fallback), omega-forge (requires CreationResult as input), CLI commands (omega create, omega run-full). 12 invariants (C4-INV-01 through C4-INV-12) fail.

**5. If removed, what stays unchanged**: genesis-planner, scribe-engine, style-emergence-engine (upstream self-contained phases), canon-kernel.

**6. Dependents**: omega-forge, omega-runner (2 packages).

**7. Dependencies**: `@omega/canon-kernel`, `@omega/genesis-planner`, `@omega/scribe-engine`, `@omega/style-emergence-engine`.

**Verdict**: **ESSENTIAL** — Sole pipeline orchestrator binding C.1/C.2/C.3 into a unified flow with unified gates and proof pack. No alternative orchestration exists.

**Evidence**: `packages/creation-pipeline/package.json`, `src/index.ts` (92 exports), `src/engine.ts` (F0-F8), `src/types.ts` (IntentPack, CreationResult).

---

### omega-forge (C.5)

**1. Unique role**: Validates CreationResult against OMEGA V4.4 Organic Physics laws (L1-L6), quality metrics (M1-M12), emotional trajectory compliance, dead zone detection, and prescription generation.

**2. Inputs**: `CreationResult` (from creation-pipeline), `GenesisPlan` (genesis-planner), `StyledParagraph[]` (style-emergence), `ProseDoc` (scribe-engine), `IntentPack` (creation-pipeline), `F5Config` (internal), `CanonicalEmotionTable` (14 Plutchik emotions), `timestamp`.

**3. Outputs**: `ForgeResult`, `TrajectoryAnalysis`, `LawComplianceReport`, `QualityEnvelope`, `Prescription[]`, `DeadZone[]`, `ForgeProfile`, `ForgeReport`, `F5EvidenceChain`, `ForgeMetrics` — consumed by omega-runner (orchestrateForge/orchestrateFull).

**4. If removed, what BREAKS**: omega-runner (runForge/runFull missing, ForgeResult type missing, F5Config/CanonicalEmotionTable unavailable), CLI run-forge command, SBOM in omega-release. 14 invariants (F5-INV-01 through F5-INV-14) fail.

**5. If removed, what stays unchanged**: creation-pipeline (C.1-C.4 still functional), genesis/scribe/style engines, canon-kernel. omega-runner could partially function (C.1-C.4 only).

**6. Dependents**: omega-runner (1 package, critical dependency).

**7. Dependencies**: `@omega/canon-kernel`, `@omega/genesis-planner`, `@omega/scribe-engine`, `@omega/style-emergence-engine`, `@omega/creation-pipeline`.

**Verdict**: **ESSENTIAL** — Sole physics law validator and quality evaluator. Domain-specific to OMEGA V4.4 Organic Physics. No alternative implementation. Removal eliminates trajectory compliance and quality scoring.

**Evidence**: `packages/omega-forge/package.json`, `src/index.ts` (37 exports), `src/engine.ts` (V0-V5 pipeline), `src/physics/` (6 laws), `src/quality/` (M1-M12).

---

### omega-runner (D.1+H1)

**1. Unique role**: Orchestrates the full OMEGA pipeline (C.1-C.5) with deterministic ProofPack generation, Merkle tree verification, 12 invariant checks, intent validation (H1), and unified CLI interface.

**2. Inputs**: `IntentPack` (from creation-pipeline types), config objects (`GConfig`, `SConfig`, `EConfig`, `C4Config`, `F5Config`, `CanonicalEmotionTable`), `ParsedArgs` (CLI), seed/timestamp strings.

**3. Outputs**: ProofPack files on disk (manifest.json, merkle-tree.json, stage artifacts with SHA-256), `VerifyResult`, `ConsolidatedReport`, exit codes (0-6). No package consumers — omega-runner is the terminal node.

**4. If removed, what BREAKS**: CLI binary (`omega`) disappears, ProofPack generation stops, invariant checking system (INV-RUN-01 through INV-RUN-12) lost, intent validation (H1 hardening) lost, verification capability gone.

**5. If removed, what stays unchanged**: All upstream packages (creation-pipeline, omega-forge, etc.) still compile and function independently. omega-governance, omega-release unaffected.

**6. Dependents**: No package dependents. Terminal node. But CLI consumers and CI/CD depend on it operationally.

**7. Dependencies**: `@omega/canon-kernel`, `@omega/genesis-planner`, `@omega/scribe-engine`, `@omega/style-emergence-engine`, `@omega/creation-pipeline`, `@omega/omega-forge` (all 6 upstream packages).

**Verdict**: **ESSENTIAL** — Sole CLI entry point, sole ProofPack generator, sole intent validator. Phase D.1 delivery vehicle. Removal eliminates all user-facing pipeline execution.

**Evidence**: `packages/omega-runner/package.json`, `src/index.ts`, `src/types.ts` (exit codes), `src/orchestrator/runFull.ts`, `src/validation/intent-validator.ts` (H1).

---

### omega-governance (D.2+F)

**1. Unique role**: Read-only observer and certifier that analyzes ProofPack artifacts, detects drift (functional/qualitative/structural), produces certificates, and enforces CI gates (G0-G5) for non-regression.

**2. Inputs**: ProofPack directories (manifest.json, merkle-tree.json, forge-report.json), `GovConfig` (internal thresholds), `BaselineRegistry` (registered reference runs), NDJSON event logs.

**3. Outputs**: `DriftReport`, `Certificate`, `CompareResult`, `BenchReport`, `CIReport`, `BadgeResult`, `HistoryQuery` results, invariant results. No package consumers.

**4. If removed, what BREAKS**: CI/CD gate pipeline (G0-G5), drift detection, certification chain, baseline immutability enforcement, quality regression detection. 18 invariants (INV-GOV-01 through INV-GOV-08, INV-F-01 through INV-F-10) fail.

**5. If removed, what stays unchanged**: All other 7 packages. omega-runner still produces ProofPacks. Pipeline execution unaffected. Only verification/certification stops.

**6. Dependents**: No package dependents. Operationally consumed by CI/CD and governance workflows.

**7. Dependencies**: `@omega/canon-kernel` (declared in package.json but **unused in source code** — no import statements found).

**Verdict**: **ESSENTIAL** — Sole drift detector, certifier, and CI gate enforcer. NASA-Grade L4 compliance requires governance verification. No alternative exists.

**Evidence**: `packages/omega-governance/package.json`, `src/index.ts`, `src/governance/` (compare, drift, certify, bench, history), `src/ci/` (6 gates).

**Observation**: canon-kernel declared as dependency but not imported in source. This is a phantom dependency that could be cleaned up.

---

### omega-release (G.0)

**1. Unique role**: Production release hardening orchestrator managing SemVer versioning, changelog tracking, artifact building with deterministic hashing, installation verification, self-testing, support policies, and rollback planning.

**2. Inputs**: `SemVer`, `ChangelogEntry`, `ReleaseConfig`, `InstallConfig`, `SelfTestResult`, `SupportPolicy`, `RollbackPlan` (all internal types). File system paths (VERSION, CHANGELOG.md, package.json). CLI argv.

**3. Outputs**: `ReleaseResult`, `ReleaseManifest`, `SBOM`, `SelfTestResult`, `InstallResult`, `RollbackPlan`, `InvariantResult`, checksums, exit codes. No package consumers.

**4. If removed, what BREAKS**: Release workflow (no artifact building), version management (no SemVer parser/validator/bumper), changelog system (no parser/generator), installation verification, self-test framework (5 checks), 10 invariants (INV-G0-01 through INV-G0-10).

**5. If removed, what stays unchanged**: All other 7 packages. Core pipeline unaffected. Only release/packaging tooling disappears.

**6. Dependents**: No package dependents. Operationally consumed by release workflow.

**7. Dependencies**: `@omega/canon-kernel` (for hashing).

**Verdict**: **ESSENTIAL** — Sole release tooling module. Phase G.0 certification requirement. Production release workflow impossible without it. 10 release-gate invariants unique to this package.

**Evidence**: `packages/omega-release/package.json`, `src/index.ts` (25 exports), `src/version/parser.ts`, `src/release/builder.ts`, `src/invariants/release-invariants.ts`.

---

## Couplage Analysis

### Fan-in (dependency count per package)

| Package | Dependencies | Level |
|---------|-------------|-------|
| genesis-planner | 1 (canon-kernel) | Low |
| scribe-engine | 2 (canon-kernel, genesis) | Low |
| style-emergence | 3 (canon-kernel, genesis, scribe) | Medium |
| creation-pipeline | 4 (canon-kernel, genesis, scribe, style) | Medium-High |
| omega-forge | 5 (canon-kernel, genesis, scribe, style, creation) | High |
| omega-runner | 6 (all upstream) | High |
| omega-governance | 1 (canon-kernel, unused) | Low |
| omega-release | 1 (canon-kernel) | Low |

**Observation**: The pipeline follows a strict linear accumulation pattern (C.1 -> C.2 -> C.3 -> C.4 -> C.5 -> D.1). Each stage adds the previous as a dependency. This is architecturally expected for a sequential pipeline but creates high fan-in at the terminal nodes.

### Circular dependencies

**NONE detected.** The dependency graph is a strict DAG (directed acyclic graph):
```
canon-kernel (root)
  -> genesis-planner
    -> scribe-engine
      -> style-emergence-engine
        -> creation-pipeline
          -> omega-forge
            -> omega-runner (terminal)
  -> omega-governance (isolated leaf)
  -> omega-release (isolated leaf)
```

### Leaf nodes (no reverse dependencies)

Three packages have zero downstream consumers:
- **omega-runner**: Terminal CLI node. Expected — it IS the user-facing entry point.
- **omega-governance**: Standalone observer. Expected — governance must NOT modify pipeline.
- **omega-release**: Standalone tooling. Expected — release tools are orthogonal to pipeline.

All three are justified because they serve distinct operational roles (execution, governance, release).

### High-coupling observation

omega-forge (5 deps) and omega-runner (6 deps) have the highest dependency counts. This is an architectural consequence of the linear pipeline pattern where later stages need types from all earlier stages. This is not a defect — it reflects the data flow:
- omega-forge needs CreationResult (which contains all upstream outputs)
- omega-runner needs to configure all upstream stages

### Phantom dependency

omega-governance declares `@omega/canon-kernel` in package.json but has **zero imports** of it in source code. This is a minor hygiene issue — the dependency could be removed without any code change.

---

## Conclusion Q3

All 8 packages are **ESSENTIAL**. Each fulfills a unique, non-redundant role:

| Package | Unique capability |
|---------|------------------|
| genesis-planner | Narrative plan generation (arcs/scenes/beats) |
| scribe-engine | Prose generation with 7 gates + 6 oracles |
| style-emergence-engine | Style profiling + tournament self-play + AI detection |
| creation-pipeline | E2E orchestration + unified gates + proof pack |
| omega-forge | Physics law validation (L1-L6) + M1-M12 quality |
| omega-runner | CLI + ProofPack generation + intent validation |
| omega-governance | Drift detection + certification + CI gates (G0-G5) |
| omega-release | Version/changelog/release management + 10 invariants |

No package is REDUNDANT (no overlapping functionality found). No package is UNJUSTIFIED (all have tests, invariants, and active consumers or operational roles). The dependency graph is a clean DAG with no cycles. The linear pipeline accumulation pattern creates high fan-in at terminal nodes but this is architecturally expected.

One minor finding: omega-governance has a phantom dependency on canon-kernel (declared but unused).
