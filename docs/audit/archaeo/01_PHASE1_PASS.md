# OMEGA — ARCHAEOLOGY PHASE 1 · PASS CERTIFICATE

> **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · **Mode**: READ-ONLY (zero engine code touched)
> **Date**: 2026-05-31 · **HEAD at scan**: `d76143f3` · **Author**: Claude Code
> **Directive**: Architect "clôture Phase 1" (2026-05-31, GO contrôlé) — adjuger les 73 dossiers racine → "0 dossier racine non classé".

---

## VERDICT: ✅ PHASE 1 PASS

| PASS criterion (roadmap §Phase 1) | Status | Evidence |
|---|---|---|
| 0 dossier racine non classé | ✅ | **73/73** dirs `adjudicated=YES` in `01_ROOT_TREE_CLASSIFICATION.csv` |
| 0 moteur potentiel non inspecté | ✅ | 22 engine-bearing zones isolated (`isEngineZone=YES`); the 6 priority dirs agent-verified (`01_ENGINE_INVENTORY.md`) |
| Aucune supposition non prouvée | ✅ | every verdict traces to a deterministic rule (R0–R10) over measured signals; manual verdicts (R0) carry agent file\:line evidence |
| Lignée des moteurs d'écriture datée | ✅ | `01_LINEAGE_MAP.md` (git-dated genealogy) |

**No fusion / archive / deletion / DEC-009 action taken** (Phase 3 territory, out of scope per directive). This is a *classification* PASS, not a disposition decision.

---

## 1. Deterministic verdict ladder (reproducible)

Implemented in `scripts/metrology/root-tree-scan.ts` (`verdict()`), **first-match-wins** over measured signals (file counts, git dates, workspace/tsconfig membership, engine markers). Re-running on the same HEAD reproduces the CSV byte-for-byte (modulo injected stamp).

| Rule | Fires when | Class | engine? |
|------|-----------|-------|---------|
| **R0** | name ∈ {packages, gateway, src, OMEGA_SENTINEL_SUPREME, omega-phase23, genius-integration} | *manual* (agent-verified) | per §1 inventory |
| **R1** | `dist` or name matches `*cache*` | BUILD_ARTIFACT | no |
| **R2** | name ∈ {scripts, tools, bin, config, .github, .ci, GOVERNANCE, plugins} | TOOLING | no |
| **R3** | name ∈ {apps, omega-ui, omega-ui-bootstrap, src-tauri} | UI_SURFACE | no |
| **R4** | name ∈ {docs, ROADMAP} | DOC | no |
| **R5** | name ∈ {test, tests} | TEST_FIXTURE | no |
| **R6** | name = nexus | SUPPORT_INFRA | no |
| **R7** | name matches archive/version/phase pattern¹ | SNAPSHOT | YES iff ts>0 ∧ markers>0 |
| **R8** | ts>0 ∧ markers>0 ∧ has tsconfig (self-contained engine variant) | DORMANT | YES |
| **R9** | tsFiles = 0 (no source) | DATA_ARTIFACT | no |
| **R10** | residual (ts present, no engine signals) | DATA_ARTIFACT | no |

¹ `^OMEGA_MASTER_DOSSIER | ^OMEGA_PHASE\d | ^OMEGA_SNAPSHOTS$ | ^OMEGA_SPRINT | ^sprint\d | ^omega-v44 | titanium | ^EXPORT_FULL_PACK$ | ^archives$ | ^releases$ | ^history$ | ^deposit$`

## 2. Taxonomy (12 final classes)

**Engine zones** (`isEngineZone=YES` — the Phase 2/3 attention set):
- `ACTIVE_RUNTIME` — live product surface, in build, on trunk.
- `LEGACY_ANCESTOR` — certified ancestor stack, orphaned from the active build graph.
- `DORMANT` — complete/near-complete engine, self-contained, unintegrated (0 external refs), stale.
- `SNAPSHOT` — frozen point-in-time copy (version/phase/sprint export) carrying engine source.
- `PATCH_STAGED` — integration patch referenced by active code but not yet applied.

**Non-engine zones** (`isEngineZone=no`):
- `SUPPORT_INFRA` — active non-engine pipeline (proof/blueprint/evidence): `nexus`.
- `UI_SURFACE` — app / UI shells.
- `TOOLING` — build/automation/governance scripts.
- `DOC` — documentation trees.
- `TEST_FIXTURE` — root-level test/fixture dirs.
- `DATA_ARTIFACT` — pure data/proof/evidence dumps (no source).
- `BUILD_ARTIFACT` — generated output / caches.

## 3. Full classification — 73/73

### ACTIVE_RUNTIME (2) · engine
`gateway`, `packages`
### LEGACY_ANCESTOR (1) · engine
`src`
### DORMANT (3) · engine
`OMEGA_SENTINEL_SUPREME`, `omega-narrative-genome`, `omega-nexus`
### SNAPSHOT (23) · engine where ts>0
`EXPORT_FULL_PACK`, `OMEGA_MASTER_DOSSIER_v3.21.0_PERFECT`, `OMEGA_MASTER_DOSSIER_v3.61.0`, `OMEGA_MASTER_DOSSIER_v3.83.0`, `OMEGA_PHASE12`, `OMEGA_PHASE13A`, `OMEGA_PHASE14`, `OMEGA_PHASE18_MEMORY`, `OMEGA_PHASE19_PERSIST`, `OMEGA_PHASE20_1_MEMORY_HOOK`, `OMEGA_PHASE20_INTEGRATION`, `OMEGA_PHASE21_QUERY_ENGINE`, `OMEGA_SNAPSHOTS`, `OMEGA_SPRINT15`, `archives`, `deposit`, `history`, `omega-phase23`, `omega-v44`, `omega-v44-phase7`, `omega_titanium_ultimate`, `releases`, `sprint28_5`
### PATCH_STAGED (1) · engine
`genius-integration`
### SUPPORT_INFRA (1)
`nexus`
### UI_SURFACE (4)
`apps`, `omega-ui`, `omega-ui-bootstrap`, `src-tauri`
### TOOLING (8)
`.ci`, `.github`, `GOVERNANCE`, `bin`, `config`, `plugins`, `scripts`, `tools`
### DOC (2)
`ROADMAP`, `docs`
### TEST_FIXTURE (2)
`test`, `tests`
### DATA_ARTIFACT (24)
`.claude`, `artefacts`, `baselines`, `bench-results`, `budgets`, `certificates`, `evidence`, `examples`, `golden`, `intents`, `manifests`, `metrics`, `omega`, `omega-autopsie`, `omega-nexus-package`, `omega_templates`, `profiling-results`, `proofpacks`, `requests`, `scale_out`, `schemas`, `sessions`, `templates`, `waivers`
### BUILD_ARTIFACT (2)
`.test-cache-concurrent`, `dist`

**Distribution**: ACTIVE_RUNTIME 2 · LEGACY_ANCESTOR 1 · DORMANT 3 · SNAPSHOT 23 · PATCH_STAGED 1 · SUPPORT_INFRA 1 · UI_SURFACE 4 · TOOLING 8 · DOC 2 · TEST_FIXTURE 2 · DATA_ARTIFACT 24 · BUILD_ARTIFACT 2 = **73**. Engine zones = **22**, non-engine = **51**.

## 4. The 22 engine zones (Phase 2/3 attention set — NOT acted on)

| # | dir | class | git last | note |
|---|-----|-------|----------|------|
| 1 | `packages` | ACTIVE_RUNTIME | 2026-05-31 | live workspace (38 pkgs) |
| 2 | `gateway` | ACTIVE_RUNTIME | 2026-05-26 | CLI+security perimeter (no narrative-engine import) |
| 3 | `src` | LEGACY_ANCESTOR | 2026-03-29 | ancestor monolith (19 modules), orphaned |
| 4 | `OMEGA_SENTINEL_SUPREME` | DORMANT | 2026-01-24 | `@omega/sentinel-supreme` v3.30.0 |
| 5 | `omega-narrative-genome` | DORMANT | 2026-01-19 | early genome variant |
| 6 | `omega-nexus` | DORMANT | 2026-01-17 | early nexus variant |
| 7 | `genius-integration` | PATCH_STAGED | 2026-02-22 | omega-p0→SE adapter, unapplied |
| 8–22 | `omega-phase23`, `omega-v44`, `omega-v44-phase7`, `OMEGA_PHASE12/13A/14/18/19/20_1/20_INT/21`, `OMEGA_SPRINT15`, `sprint28_5`, `deposit`, `archives` | SNAPSHOT | 2026-01→02 | frozen version/phase copies carrying engine source |

> Duplicates / name-collisions already flagged for **Phase 3 tribunal** (not adjudicated here): `omega-phase23` ≡ `gateway/resilience` (@omega/resilience v3.23.0); `OMEGA_SENTINEL_SUPREME` vs active `sentinel-judge`; `src/*` ancestor vs `packages/*` descendants.

## 5. Limits (honest)

- Engine-zone flag is a **routing signal** (where to look in Phase 2/3), not a disposition. SNAPSHOT/DORMANT ≠ "safe to delete" — that requires Phase 3 loss-matrix + Phase 4 bench.
- `nexus` (1320 files, 65 ts, active) classed SUPPORT_INFRA by name rule; if it later proves to host a runtime engine path, re-route to Phase 2. Marked for confirmation.
- Git dates have no `--follow` (renames not tracked) — see metrology `METHOD.md` D7.
- R7/R8 engine flag uses `ts>0 ∧ markers>0`; a snapshot with engine source but zero marker hits would read non-engine (none observed in this repo).

## 6. Unlocked by this PASS (NEXT — not performed here)

Per directive, Phase 1 PASS releases the gates (separate GO/runs, still no fusion/DEC-009):
- **Métrologie dynamique** — D3 transmission runtime (latency p50/p95, payload), D9 prose quality (S-Oracle V2), D10 runtime resources. Deferred harness in metrology `METHOD.md §4`.
- **Bench M0.b** — `scribe-engine` vs `sovereign-engine`, **same brief / same seed**, judged by S-Oracle V2 (per `OMEGA_ARCHAEOLOGY_MASTER_ROADMAP.md` Phase 4 protocol; Ollama dev, Anthropic only for final validation under `llm-cost-guard`).

---
*Deliverables: `01_ENGINE_INVENTORY.md`, `01_LINEAGE_MAP.md`, `01_ROOT_TREE_CLASSIFICATION.csv` (73 rows, `adjudicated=YES`), `01_ROOT_TREE_SIGNALS.json`, this certificate. Reproduce: `npx tsx scripts/metrology/root-tree-scan.ts`.*
