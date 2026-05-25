# 02 — OMEGA FULL TREE WITH UTILITY
**IRM Livrable 02** | Generated: 2026-04-02 | Branch: `phase-r-metrology-rebuild`

---

## Summary

| Category | Count |
|----------|-------|
| packages/ modules | 45 |
| Root-level modules (gateway, omega-autopsie, omega-narrative-genome) | 3 |
| Script zones (scripts/, scripts/pvi/, tools/) | 3 |
| **Total MODULE_CARDs** | **51** |

### Criticality Legend

| Level | Meaning |
|-------|---------|
| C4 | Mission-critical — pipeline cannot function without it |
| C3 | Core logic — key analytical or orchestration capability |
| C2 | Infrastructure — test, CI, hardening, metrics |
| C1 | Support — small utility, bridge, or adapter |
| C0 | Dead weight — no src, placeholder, or fully redundant |

### Lifecycle Legend

| Status | Meaning |
|--------|---------|
| LIVE | Active development or active usage in pipeline |
| SEALED | Frozen by governance decision — no modification allowed |
| ARCHIVE | Superseded or redundant — kept for reference only |
| DEAD | No functional code, placeholder only |
| PHANTOM | Exists on disk but not wired into any pipeline |
| EXPERIMENTAL | R&D or phase-specific, not production |
| QUARANTINE | Isolated for security or stability reasons |

---

## A) packages/ — 45 MODULE_CARDs

### canon-kernel
```
name: @omega/canon-kernel
path: packages/canon-kernel
role: Universal Truth Engine — SHA-256 hashing, canonicalization, deterministic serialization
files_count: 19
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ dist/ vitest.config.ts tsconfig.json package.json
```

### contracts-canon
```
name: @omega/contracts-canon
path: packages/contracts-canon
role: Unified interface contracts and invariants for cross-package type safety
files_count: 5
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### creation-pipeline
```
name: @omega/creation-pipeline
path: packages/creation-pipeline
role: Literary creation pipeline with adversarial gates, intent-pack normalization, and evidence collection
files_count: 30
criticality: C2
lifecycle: ARCHIVE
repo_live_confirmed: true
contents: src/ tests/ artefacts/ dist/ vitest.config.ts tsconfig.json package.json
```

### decision-engine
```
name: @omega/decision-engine
path: packages/decision-engine
role: NASA-Grade L4 compliant decision system for pipeline orchestration
files_count: 31
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ coverage/ README.md SPEC.md vitest.config.ts tsconfig.json package.json
```

### emotion-gate
```
name: @omega/emotion-gate
path: packages/emotion-gate
role: Emotional validation layer with passive validators and SSOT compliance
files_count: 24
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ CERTIFICATION_PHASE_A3.md HASHES_PHASE_A3.sha256 vitest.config.ts tsconfig.json package.json
```

### genesis-planner
```
name: @omega/genesis-planner
path: packages/genesis-planner
role: Plan generation engine with validators, providers, evidence collection, and report output
files_count: 27
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ dist/ vitest.config.ts tsconfig.json package.json
```

### genome
```
name: @omega/genome
path: packages/genome
role: Narrative Genome — Fingerprint for narrative works (OMEGA). SEALED Phase 28.
files_count: 13
criticality: C3
lifecycle: SEALED
repo_live_confirmed: true
contents: src/ test/ artifacts/ evidence/ README.md vitest.config.ts tsconfig.json package.json
```

### gold-cli
```
name: @omega/gold-cli
path: packages/gold-cli
role: Command-line certification runner for OMEGA gold-standard validation
files_count: 6
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### gold-internal
```
name: @omega/gold-internal
path: packages/gold-internal
role: Cross-package validation and certification internals
files_count: 5
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### gold-master
```
name: @omega/gold-master
path: packages/gold-master
role: Ultimate certification system — gold-master seal generation
files_count: 3
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### gold-suite
```
name: @omega/gold-suite
path: packages/gold-suite
role: Consolidated test suite runner for cross-package gold certification
files_count: 4
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### hardening
```
name: @omega/hardening
path: packages/hardening
role: Security utilities and attack surface reduction
files_count: 6
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### headless-runner
```
name: @omega/headless-runner
path: packages/headless-runner
role: CLI for deterministic plan execution in headless/CI environments
files_count: 7
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### hostile
```
name: hostile
path: packages/hostile
role: Hostile input generators for adversarial testing (CJS module, no TypeScript src)
files_count: 0
criticality: C1
lifecycle: LIVE
repo_live_confirmed: true
contents: generators.cjs __tests__/
```

### integration-nexus-dep
```
name: @omega/integration-nexus-dep
path: packages/integration-nexus-dep
role: NEXUS DEP — Dependency integration layer, pipeline router
files_count: 29
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ docs/ GOLD_SEAL.md vitest.config.ts tsconfig.json package.json
```

### mod-narrative
```
name: @omega/mod-narrative
path: packages/mod-narrative
role: Narrative modification utilities (minimal module, 2 source files)
files_count: 2
criticality: C0
lifecycle: PHANTOM
repo_live_confirmed: true
contents: src/ package.json (no tests, no tsconfig, no vitest)
```

### mycelium
```
name: @omega/mycelium
path: packages/mycelium
role: Input validation guardian for DNA/Genome pipeline
files_count: 6
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ artifacts/ README.md vitest.config.ts tsconfig.json package.json
```

### mycelium-bio
```
name: @omega/mycelium-bio
path: packages/mycelium-bio
role: ADN emotionnel des livres — Mycelium Bio Engine for biological emotion extraction
files_count: 10
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ module.omega.json CERTIFICATION_MYCELIUM_BIO_v1.0.0.md vitest.config.ts tsconfig.json package.json
```

### omega-aggregate-dna
```
name: @omega/omega-aggregate-dna
path: packages/omega-aggregate-dna
role: NASA-grade aggregation of MyceliumDNA segments into composite DNA profiles
files_count: 6
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ module.omega.json README.md vitest.config.ts tsconfig.json package.json
```

### omega-bridge-ta-mycelium
```
name: @omega/omega-bridge-ta-mycelium
path: packages/omega-bridge-ta-mycelium
role: Bridge adapter from TextAnalyzer output to Mycelium Bio input format
files_count: 4
criticality: C1
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ module.omega.json README.md vitest.config.ts tsconfig.json package.json
```

### omega-forge
```
name: @omega/omega-forge
path: packages/omega-forge
role: ForgeEmotionBrief — emotion physics engine, quality diagnosis, and benchmark tooling
files_count: 31
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ artefacts/ sessions/ dist/ vitest.config.ts tsconfig.json package.json
```

### omega-governance
```
name: @omega/governance
path: packages/omega-governance
role: Governance engine — certification, drift detection, CI gates, invariant enforcement, benchmarking
files_count: 70
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ baselines/ benchmarks/ scripts/ dist/ README.md ASSUMPTIONS.md vitest.config.ts tsconfig.json package.json
```

### omega-metrics
```
name: @omega/omega-metrics
path: packages/omega-metrics
role: Metrics collection, hashing, scoring, and report generation
files_count: 14
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ dist/ vitest.config.ts tsconfig.json package.json
```

### omega-observability
```
name: @omega/observability
path: packages/omega-observability
role: Progress callbacks and observability — zero-impact design for NASA-grade pipeline
files_count: 5
criticality: C1
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ module.omega.json tsconfig.json package.json (no vitest.config)
```

### omega-p0
```
name: @omega/phonetic-stack
path: packages/omega-p0
role: Phonetic analysis stack — prosody, rhythm, and phonetic feature extraction
files_count: 10
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ cli/ corpus/ dist/ SESSION_SAVE files vitest.config.ts tsconfig.json package.json
```

### omega-release
```
name: @omega/omega-release
path: packages/omega-release
role: Production hardening and release pipeline — Phase G.0 release automation
files_count: 43
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ scripts/ README.md ASSUMPTIONS.md vitest.config.ts tsconfig.json package.json
```

### omega-runner
```
name: @omega/runner
path: packages/omega-runner
role: Full pipeline runner — CLI orchestrator with proofpack generation and validation gates
files_count: 28
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ dist/ e2e-run.ts README.md ASSUMPTIONS.md vitest.config.ts tsconfig.json package.json
```

### omega-segment-engine
```
name: @omega/omega-segment-engine
path: packages/omega-segment-engine
role: Deterministic NASA-grade text segmentation engine (canonical splitting)
files_count: 11
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ module.omega.json README.md vitest.config.ts tsconfig.json package.json
```

### oracle
```
name: @omega/oracle
path: packages/oracle
role: AI-powered emotional analysis engine — LLM integration for semantic scoring
files_count: 8
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### orchestrator-core
```
name: @omega/orchestrator-core
path: packages/orchestrator-core
role: Deterministic execution engine — core orchestration logic
files_count: 13
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ dist/ README.md vitest.config.ts tsconfig.json package.json
```

### performance
```
name: @omega/performance
path: packages/performance
role: Benchmarking and optimization utilities for pipeline performance measurement
files_count: 7
criticality: C1
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### phase-q
```
name: @omega/phase-q
path: packages/phase-q
role: Justesse / Precision / Necessite — Triple-Oracle evaluation system
files_count: 12
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ vitest.config.ts tsconfig.json package.json
```

### plugin-gateway
```
name: @omega/plugin-gateway
path: packages/plugin-gateway
role: Single entry/exit point for external plugin modules — INV-PNP-01 enforced
files_count: 7
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ schemas/ vitest.config.ts tsconfig.json package.json
```

### plugin-sdk
```
name: @omega/plugin-sdk
path: packages/plugin-sdk
role: Kit for building compliant plugins — schema-first, compliance-gated
files_count: 8
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ schemas/ package.json (no vitest.config)
```

### proof-pack
```
name: @omega/proof-pack
path: packages/proof-pack
role: Evidence bundling and audit trail generation for certification
files_count: 5
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ vitest.config.ts tsconfig.json package.json
```

### sbom
```
name: sbom
path: packages/sbom
role: Software Bill of Materials generator (CJS module, no TypeScript src)
files_count: 0
criticality: C1
lifecycle: LIVE
repo_live_confirmed: true
contents: generator.cjs __tests__/
```

### schemas
```
name: schemas
path: packages/schemas
role: JSON Schema definitions (manifest, sealed-zones, trust) with CJS validator
files_count: 0
criticality: C1
lifecycle: LIVE
repo_live_confirmed: true
contents: manifest.schema.json sealed-zones.schema.json trust.v1.schema.json validator.cjs __tests__/
```

### scribe-engine
```
name: @omega/scribe-engine
path: packages/scribe-engine
role: Literary prose generation engine with oracles, gates, prosepack, and evidence collection
files_count: 45
criticality: C2
lifecycle: ARCHIVE
repo_live_confirmed: true
contents: src/ tests/ dist/ vitest.config.ts tsconfig.json package.json
```

### search
```
name: @omega/search
path: packages/search
role: Intelligent text search engine for corpus analysis
files_count: 11
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ test/ tests/ benchmark.ts tsconfig.json package.json
```

### sentinel-judge
```
name: @omega/sentinel-judge
path: packages/sentinel-judge
role: Input gates and evidence assembler — Sentinel Judge (Phase C). SEALED Phase 27.
files_count: 10
criticality: C3
lifecycle: SEALED
repo_live_confirmed: true
contents: src/ tests/ dist/ run-tests.ps1 vitest.config.ts tsconfig.json package.json
```

### signal-registry
```
name: @omega/signal-registry
path: packages/signal-registry
role: Signal type registry with validators and IDL schema for inter-module communication
files_count: 4
criticality: C1
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ scripts/ signal-registry.idl.json vitest.config.ts tsconfig.json package.json
```

### sovereign-engine
```
name: @omega/sovereign-engine
path: packages/sovereign-engine
role: NASA-Grade literary prose generator with 14D emotion guidance and 92/100 threshold — MAIN ENGINE
files_count: 222
criticality: C4
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ sessions/ calibration/ docs/ nexus/ proofpack/ proofpacks/ retro-engineering/ runtime/ scripts/ dist/ package.json
```

### style-emergence-engine
```
name: @omega/style-emergence-engine
path: packages/style-emergence-engine
role: Style emergence detection — tournament-based harmonizer with metrics and detectors
files_count: 21
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ dist/ vitest.config.ts tsconfig.json package.json
```

### trust-version
```
name: trust-version
path: packages/trust-version
role: Trust version compatibility detector and migration tool (CJS module, no TypeScript src)
files_count: 0
criticality: C1
lifecycle: LIVE
repo_live_confirmed: true
contents: compat.cjs detector.cjs migrate.cjs __tests__/
```

### truth-gate
```
name: @omega/truth-gate
path: packages/truth-gate
role: Validation layer with blocking verdicts and deterministic validators
files_count: 25
criticality: C3
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ vitest.config.ts tsconfig.json package.json
```

---

## B) Root-Level Modules

### gateway
```
name: @omega/gateway
path: gateway/
role: Gateway Universel NASA/SpaceX-Grade — facade, sentinel, resilience, limiter, chaos, CLI runner
files_count: 47
criticality: C3
lifecycle: SEALED
repo_live_confirmed: true
contents: src/ tests/ sentinel/ facade/ limiter/ resilience/ chaos/ cli-runner/ wiring/ quarantine/ schemas/ vitest.config.ts tsconfig.json package.json
notes: Contains FROZEN sentinel/ submodule (Phase 27). Multiple certification documents present.
```

### omega-autopsie
```
name: omega-autopsie
path: omega-autopsie/
role: Python-based corpus autopsie engine — feature extraction, benchmarking, perturbation analysis, universality testing
files_count: 0 (TypeScript); ~40+ Python files
criticality: C3
lifecycle: EXPERIMENTAL
repo_live_confirmed: true
contents: autopsie_v3.py autopsie_v4.py full_work_analyzer_v5.py perturbation_engine.py saga_analysis.py r1_multiwindow.py r2_topology.py r3_coefficients.py + bench_results*/ results*/ scenes*/ extracts/ corpus_r/ resources/ ssot/
notes: Pure Python research module. Multiple generation versions (v3, v4, v5). Extensive bench results and corpus data.
```

### omega-narrative-genome
```
name: omega-narrative-genome
path: omega-narrative-genome/
role: Advanced narrative genome fingerprinting for literary works
files_count: 15
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: src/ tests/ vitest.config.ts tsconfig.json package.json
```

---

## C) Script & Tool Zones

### scripts/pvi
```
name: pvi-module
path: scripts/pvi/
role: PVI (Predictive Value Index) autonomous scoring module — NLP-based bestseller prediction with calibration
files_count: 0 (TypeScript); ~10+ Python files
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: pvi_module_autonome.py pvi_nlp_scorer.py pvi_calibration.py pvi_validation_p3.py benchmark_fl_ms_v2.py coefficients_v2*.json test_set_gele.csv rapport_*.md
notes: Pure Python. Contains frozen test set (test_set_gele.csv) and bilingual coefficients (FR/EN).
```

### scripts
```
name: scripts
path: scripts/
role: CI gates, audit scripts, build tooling, release automation, proofpack generation, and compliance checks
files_count: 13 (TypeScript); ~20+ Python/Shell files
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: gate-c1-determinism.ts gate-c2-coverage.ts gate-c3-hostile.ts gate-c4-trace.ts gate-cd-integration.ts audit/ ci/ compliance/ gates/ gold-seal/ integrity/ master/ metrics/ proofpack/ release/ save/ seal/ verify/ + Python audit scripts
notes: Heterogeneous tooling zone. Mix of TypeScript gates, Python audits, shell scripts, and PowerShell runners.
```

### tools
```
name: tools
path: tools/
role: Calibration harness, certifier, verifier, oracles, and phase initialization tooling
files_count: 17 (TypeScript)
criticality: C2
lifecycle: LIVE
repo_live_confirmed: true
contents: harness/ harness_official/ omega-certifier/ omega-verify/ oracles/ calibration/ blueprint/ _graveyard/ policy-check.cjs phase_d_init.ps1
notes: Contains official harness and certification tooling. _graveyard/ holds deprecated tools.
```

---

## D) Statistical Summary

### By Criticality

| Level | Count | Packages |
|-------|-------|----------|
| C4 | 1 | sovereign-engine |
| C3 | 14 | canon-kernel, decision-engine, emotion-gate, genome, integration-nexus-dep, mycelium-bio, omega-forge, omega-governance, omega-runner, omega-segment-engine, oracle, orchestrator-core, sentinel-judge, truth-gate + gateway, omega-autopsie |
| C2 | 24 | contracts-canon, creation-pipeline, genesis-planner, gold-cli, gold-internal, gold-master, gold-suite, hardening, headless-runner, mycelium, omega-aggregate-dna, omega-metrics, omega-observability (note: listed C1 in card), omega-p0, omega-release, omega-narrative-genome, phase-q, plugin-gateway, plugin-sdk, proof-pack, scribe-engine, search, style-emergence-engine + scripts, scripts/pvi, tools |
| C1 | 7 | hostile, omega-bridge-ta-mycelium, omega-observability, performance, sbom, schemas, signal-registry, trust-version |
| C0 | 1 | mod-narrative |

### By Lifecycle

| Status | Count | Packages |
|--------|-------|----------|
| LIVE | 39 | Most active packages |
| SEALED | 3 | genome, sentinel-judge, gateway |
| ARCHIVE | 2 | creation-pipeline, scribe-engine |
| EXPERIMENTAL | 1 | omega-autopsie |
| PHANTOM | 1 | mod-narrative |
| DEAD | 0 | — |
| QUARANTINE | 0 | — |

### By File Count (Top 10)

| Package | .ts files (non-test) |
|---------|---------------------|
| sovereign-engine | 222 |
| omega-governance | 70 |
| scribe-engine | 45 |
| gateway | 47 |
| omega-release | 43 |
| omega-forge | 31 |
| decision-engine | 31 |
| creation-pipeline | 30 |
| integration-nexus-dep | 29 |
| omega-runner | 28 |

### Packages With Zero TypeScript Source

| Package | Type | Notes |
|---------|------|-------|
| hostile | CJS | generators.cjs only |
| sbom | CJS | generator.cjs only |
| schemas | JSON+CJS | Schema files + validator.cjs |
| trust-version | CJS | compat.cjs, detector.cjs, migrate.cjs |

---

## E) Integrity Notes

1. **SEALED modules** (genome, sentinel-judge, gateway/sentinel) must not be modified per CLAUDE.md governance.
2. **sovereign-engine** at 222 source files is the dominant module — 3x larger than the next largest.
3. **omega-autopsie** is the only pure-Python analytical module; it is not part of the TypeScript build graph.
4. **mod-narrative** has no tests, no tsconfig, no vitest config — classified PHANTOM.
5. **scribe-engine** (45 files) and **creation-pipeline** (30 files) are ARCHIVE — significant code mass that is no longer on the active path.
6. Three CJS-only packages (hostile, sbom, trust-version) plus schemas operate outside the TypeScript compilation pipeline.
7. **omega-governance** (70 files) is the largest non-engine package, reflecting the heavy governance/certification infrastructure.

---

*End of Livrable 02 — IRM Full Tree With Utility*
