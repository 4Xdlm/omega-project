# OMEGA — ARCHAEOLOGY PHASE 1 · ENGINE & MODULE INVENTORY

> **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode**: READ-ONLY (zero engine code touched)
> **Date**: 2026-05-31 · **HEAD at scan**: `ea2a01e7` · **Author**: Claude Code
> **Scope (Architect directive 2026-05-31, controlled GO)**: `src/` + `gateway/` + the three flagged root dirs (`OMEGA_SENTINEL_SUPREME`, `omega-phase23`, `genius-integration`). The full 73-root-dir signal sweep is in `01_ROOT_TREE_CLASSIFICATION.csv`; dirs outside this scope carry **measured-provisional** classes (`adjudicated=no`) pending the remaining Phase 1 passes.
> **Evidence base**: 3 parallel Explore agents (read-only) + deterministic `scripts/metrology/root-tree-scan.ts` + metrology dataset (`docs/audit/metrology/`).

---

## 0. Method & authority

- Deterministic signals (file counts, git first/last commit, workspace/tsconfig membership, engine markers) = `[MESURE]` from `root-tree-scan.ts`.
- Role / reference / runtime findings = `[MESURE]` from grep+read by Explore agents (file\:line cited where load-bearing).
- Class verdicts for in-scope dirs = `[RECONSTRUCTION]` adjudicated from the above; flagged `adjudicated=YES` in the CSV.
- Classes: `ACTIVE_RUNTIME · BENCH_ONLY · ORPHAN · GARAGE · DORMANT · FROZEN · SNAPSHOT · LEGACY · LEGACY_ANCESTOR · DUPLICATE · PATCH_STAGED · UNKNOWN`.
- **No fusion / archive / deletion proposed here** (Phase 3 territory, explicitly out of scope per directive item 4).

---

## 1. Adjudicated verdicts (directive scope)

| Root dir | Class | files / ts | git first→last | in build? | referenced by active code? | One-line basis |
|----------|-------|-----------:|----------------|-----------|----------------------------|----------------|
| `src/` | **LEGACY_ANCESTOR** | 202 / 163 | 2026-01-01 → 2026-03-29 | NO (no root tsconfig include) | **NO** — zero imports from `packages/`/`gateway/` | NASA-grade ancestor monolith (phases C–M); production re-implemented it under `packages/` |
| `gateway/` | **ACTIVE_RUNTIME** | 305 / 147 | 2026-01-02 → 2026-05-26 | YES (own tsconfigs) | NO (top-level leaf; nothing imports it) | `omega` CLI + security facade + abstract wiring; **does not import narrative engines** |
| `OMEGA_SENTINEL_SUPREME/` | **DORMANT** | 54 / 36 | 2026-01-07 → 2026-01-24 | self-contained tsconfig only | **NO** | `@omega/sentinel-supreme` v3.30.0 certification engine, complete but never integrated; 6 commits, frozen since Jan-24 |
| `omega-phase23/` | **SNAPSHOT** | 36 / 25 | 2026-01-06 → 2026-01-17 | self-contained tsconfig only | NO (self-refs only) | `@omega/resilience` v3.23.0 — **same version as live `gateway/resilience`**; phase-boundary archive copy |
| `genius-integration/` | **PATCH_STAGED** | 4 / 2 | 2026-02-22 (single commit) | NO (patch files, no tsconfig/pkg) | **YES** — `packages/sovereign-engine` ADR + scripts reference it, **not yet applied** | omega-p0 → sovereign-engine dual-mode scoring adapter (Step 4b), staged via `install-patch.ps1` |

---

## 2. `src/` — the ANCESTOR MONOLITH (LEGACY_ANCESTOR)

**Headline**: the entire root `src/` (19 modules) is a self-consistent NASA-Grade L4 / DO-178C engine stack that is **completely orphaned from the active build graph**. No file under `packages/` or `gateway/` imports it. Production lives in `packages/@omega/*` clones. This is an architectural fork: `src/` is the ancestor, `packages/` is the descendant.

| Module | Claimed (header) | Real role | Markers | Class | Descendant in `packages/`? |
|--------|------------------|-----------|---------|-------|---------------------------|
| `src/scribe` | **SCRIBE v1.0.0** (AS9100D NASA-GRADE, certified 2026-01-01) | record/replay prompt-generation engine + scoring/staging | scribe, generate, runner, oracle | ANCESTOR | → `scribe-engine` |
| `src/genesis` | GENESIS_FORGE v1.1.2 (Emotion 14D) | text generation, 7 blocking judges (J1–J7) + 2 Pareto, prism constraints, mutation loop | forge, generate, weave, judge | ANCESTOR | → `genesis-planner` / `omega-forge` |
| `src/canon` | CANON v1.0 (Phase E) | claim-entity-evidence triple store, append-only ledger, hashing | canon, memory, truth | ANCESTOR | → `canon-kernel` |
| `src/gates` | TRUTH_GATE v1.0 (Phase F) | fact extract→classify→canon-match→verdict + quarantine | truth, judge, gate, oracle | ANCESTOR | → `truth-gate` |
| `src/orchestrator` | ORCHESTRATOR v1.0 (Phase G) | intent→policy→contract→forge pipeline, deterministic seeds | orchestrator, forge, pipeline | ANCESTOR | → `orchestrator-core` / `creation-pipeline` |
| `src/delivery` | DELIVERY_ENGINE v1.0 (Phase H) | profile-locked rendering, manifest/bundle/proof-pack | delivery, proof | ANCESTOR | → `proof-pack` |
| `src/runner` | RUNNER v1.0 (Phase I) | CLI parser, pipeline stages, capsule/verification, reporting | runner, pipeline, capsule | ANCESTOR | → `omega-runner` / `headless-runner` |
| `src/text_analyzer` | TEXT_ANALYZER v1.0.0 | 827-line monolith: grapheme/word/sentence/mycelium/gematria metrics (cyclo max 127 — repo extreme) | analyzer, K2, truth | ANCESTOR | partial → `omega-segment-engine` |
| `src/sentinel` | SENTINEL (Phase C) | rule-based authorization engine | sentinel, judge | ORPHAN | → `sentinel-judge` |
| `src/oracle` | ORACLE EMOTION_V2 (mock) | EmotionId/Signal/Appraisal/Dynamics (14+3 emotions) | oracle, emotion, K2 | DORMANT | → `emotion-gate` |
| `src/memory`, `src/memory-write-runtime` | MEMORY_SYSTEM (Phase D2/CD) | ledger reader/api/tiering/governance | memory, ledger | ORPHAN | → `mycelium*` (candidate) |
| `src/providers` | PROVIDERS (Phase K) | Claude/Gemini/Mock provider abstraction + lock verify | provider, oracle | ORPHAN | — |
| `src/replay` | REPLAY (Phase L) | replay-verify, tamper detection, hash recompute | replay, verify | ORPHAN | — |
| `src/auditpack` | AUDITPACK (Phase M) | capsule verify, zip hashing/validation | auditpack, verify, capsule | ORPHAN | → `proof-pack` (candidate) |
| `src/governance`, `src/shared`, `src/scoring` | infra/data | event emitter; clock/hash/lock utils; Claude blackbox JSON datasets | governance, shared, scoring | ORPHAN/DORMANT | — |

> `src/scribe` is the **certified ancestor** referenced in commit `66445855`. It is the lineage root of the narrative writing path and the priority subject of Phase 3's ancestor-delta audit (NOT performed here).

## 3. `gateway/` — ACTIVE_RUNTIME surface (but NOT the engine orchestrator)

**Headline**: `gateway/` is live (last commit 2026-05-26, TSC hardening) and is the **CLI + security perimeter**, *not* the narrative-engine orchestrator. The narrative engines (`scribe-engine`, `sovereign-engine`, `creation-pipeline`, …) are **absent from every gateway import**.

| Subdir | Role | Markers | Class |
|--------|------|---------|-------|
| `cli-runner` | `omega` binary; routes analyze/compare/export/batch/health | emotion, scribe (analysis only) | ACTIVE_RUNTIME |
| `facade` | security gateway: rate-limit → sentinel → quarantine pipeline | judge, weave, quarantine | ACTIVE_RUNTIME |
| `wiring` | NEXUS messaging/orchestration: envelope validation, **abstract HandlerRegistry**, chronicle, circuit-breaker | weave, canon, pipeline, judge, memory | ACTIVE_RUNTIME |
| `src/` (gateway root) | policy engine, module registry, ledger, snapshot, creation/memory layers | forge, creation, memory, canon | ACTIVE_RUNTIME |
| `limiter` / `sentinel` / `quarantine` | rate strategies / input validation / isolation chamber | judge | BENCH_ONLY |
| `chaos` | fault injection / resilience testing | judge, pipeline | BENCH_ONLY |
| `resilience` | Phase-23 formal resilience proofs (temporal logic) — **live copy** (cf. §5 `omega-phase23` snapshot) | truth | DORMANT |
| `schemas` / `tests` | type defs / test suite | — | ORPHAN / BENCH_ONLY |

**Synthesis answers** (Explore evidence):
1. **Product surface?** Partly — `cli-runner` (`omega` bin, `gateway/cli-runner/src/cli/runner.ts`) is the user CLI; `facade` is the security gate. Routing of analyze/compare points at a "NEXUS backend" with **no direct engine import**.
2. **Which narrative engine does gateway call?** **None directly.** No imports of `scribe-engine`/`sovereign-engine`/`creation-pipeline`/`genesis-planner`/`canon-kernel`/`omega-forge`/`sentinel-judge` anywhere in `gateway/`. `wiring/orchestrator.ts` resolves handlers from a **caller-provided** `HandlerRegistry` — bindings are not in gateway.
3. **Who imports gateway?** Nobody — top-level **leaf** (only `gateway/facade/package.json` declares `@omega/gateway`). Entry point, not a dependency.

> **Open question for Phase 2/4** (not resolved here): *where* are the concrete engine bindings wired into gateway's `HandlerRegistry` at runtime — separate launcher, or unwired? This is the gateway↔engine seam to bench.

## 4. Cross-reference — active workspace packages (metrology join)

The 38 workspace packages are the live `packages/` surface. Top engine-bearing packages by LOC (from `docs/audit/metrology/OMEGA_METROLOGY_DATASET.json`), with dep-graph role:

| Package | LOC code | fanIn / fanOut | Role (markers) |
|---------|---------:|----------------|----------------|
| `sovereign-engine` | 107,748 | 0 / 5 | narrative forge K2 + S-Oracle V2/R6 (largest engine; consumes `canon-kernel`, `omega-forge`) |
| `scribe-engine` | 9,004 | 4 / 2 | prose engine (descendant of `src/scribe`); consumes `genesis-planner`, `canon-kernel` |
| `canon-kernel` | — | **12 / —** | **fan-in hub / SPOF** (12 dependents) — canonical contracts |
| `creation-pipeline` | — | 2 / 4 | orchestration pipeline (consumes `canon-kernel`) |
| `genesis-planner` | — | 6 / — | plan/genesis stage (hub) |
| `orchestrator-core` | — | 6 / — | orchestration hub |

Full per-package metrics: `docs/audit/metrology/OMEGA_METROLOGY_BY_PACKAGE.csv`. Static dep edges: `OMEGA_TRANSMISSION_MATRIX.csv`. The metrology graph reports **0 cycles**, max DAG depth 6, and 17 graph-orphan buckets.

## 5. The three flagged dirs — duplication/name-collision notes

- **`OMEGA_SENTINEL_SUPREME`** (`@omega/sentinel-supreme` v3.30.0) vs active **`packages/sentinel-judge`** (`@omega/sentinel-judge`): **name-collision, distinct implementations** — SUPREME = falsification/proof-cryptography certification; sentinel-judge = decision arbiter. SUPREME is DORMANT (0 external refs). → Phase 3 duplicate-tribunal candidate (NOT adjudicated here).
- **`omega-phase23`** (`@omega/resilience` v3.23.0) vs active **`gateway/resilience`** (`@omega/resilience` v3.23.0): **identical package name + version** = SNAPSHOT/DUPLICATE pair. → Phase 3 candidate.
- **`genius-integration`**: PATCH_STAGED — referenced by `packages/sovereign-engine/docs/ADR-GENIUS-DUAL-MODE.md` and `scripts/genius-backtest-corpus.ts` / `run-dual-benchmark.ts`, but the patch files are **not applied** into sovereign-engine. Transitional dual-mode (omega-p0 ↔ SE). Watch for an inverted/hidden dependency at apply-time.

## 6. PASS status (CLOSED)

**Phase 1 = PASS** (closure directive 2026-05-31). All **73/73** root dirs now carry `adjudicated=YES` in `01_ROOT_TREE_CLASSIFICATION.csv`, via the deterministic verdict ladder R0–R10 (`scripts/metrology/root-tree-scan.ts`). The 6 dirs in §1 are agent-verified (R0); the other 67 are rule-classified over measured signals. **22 engine-bearing zones** isolated (`isEngineZone=YES`) as the Phase 2/3 attention set. Full certificate + taxonomy + rule table: **`01_PHASE1_PASS.md`**.

**Out of scope / deferred** (directive items 3-4): Phase 2 ADN; Phase 3 tribunal; any fusion/archive/DEC-009 action. D3/D9/D10 dynamic metrology + bench M0.b are **unlocked by this PASS** (next runs, separate GO).

---
*Companion deliverables: `01_LINEAGE_MAP.md`, `01_ROOT_TREE_CLASSIFICATION.csv`, `01_ROOT_TREE_SIGNALS.json`. Metrology cross-ref: `../metrology/`.*
