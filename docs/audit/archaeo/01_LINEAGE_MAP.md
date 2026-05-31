# OMEGA — ARCHAEOLOGY PHASE 1 · LINEAGE MAP (writing-engine genealogy)

> **Framework**: OMEGA_TOTAL_CONTROL_FRAMEWORK_2000 · READ-ONLY · 2026-05-31 · HEAD `ea2a01e7`
> Dated genealogy of the **narrative writing / scoring** engines. Dates = git first/last commit per zone (`[MESURE]`, `root-tree-scan.ts`); descent links = code/role correspondence (`[RECONSTRUCTION]`, Explore-agent evidence). Bench-proven supersession is **Phase 4** (not asserted here).

---

## 1. Timeline (git-dated)

```
2026-01-01  src/scribe         SCRIBE v1.0.0 (AS9100D NASA-GRADE)  ── ANCESTOR root of the writing path
2026-01-01  src/* monolith     phases C–M certified (canon/gates/genesis/orchestrator/delivery/runner/…)
2026-01-02  packages/ , gateway/ first commits  ── descendant workspace begins
2026-01-06  omega-phase23      @omega/resilience v3.23.0 (snapshot)
2026-01-07  OMEGA_SENTINEL_SUPREME  @omega/sentinel-supreme v3.30.0 (dormant cert engine)
2026-01-11  omega_titanium_ultimate (snapshot, 1 commit)
2026-01-24  omega-v44          (snapshot, 1 commit) · OMEGA_SENTINEL_SUPREME last touch · OMEGA_SNAPSHOTS
2026-02-22  genius-integration omega-p0→SE dual-mode adapter (patch staged, 1 commit)
2026-03-29  src/  last touch    ── ancestor monolith goes quiet
2026-05-26  gateway/ last touch (TSC hardening)
2026-05-31  packages/ , nexus/ active HEAD  ── live surface
```

## 2. Narrative writing lineage (the priority chain)

```
                    src/scribe  (SCRIBE v1.0.0, 2026-01-01, certified, ORPHAN/out-of-build)
                         │  [ancestor — record/replay prompt gen + scoring/staging]
                         ▼
              packages/scribe-engine  (ACTIVE, fanIn 4 / fanOut 2, last 2026-…, prose engine)
                         │  consumes ▼
                 packages/genesis-planner ──┐   packages/canon-kernel  (SPOF hub, fanIn 12)
                                            │
   src/genesis (GENESIS_FORGE v1.1.2) ──────┼──▶ packages/omega-forge  (forge K2 surface)
   [ancestor: 7 blocking judges + Pareto]   │
                                            ▼
                 packages/sovereign-engine  (ACTIVE, 107,748 LOC — largest engine)
                   K2 forge + S-Oracle V2/R6 + macro-axes (ECC/RCI/SII/IFI/AAI)
                   consumes: canon-kernel, omega-forge  (fanOut 5)
                         ▲
                         │ dual-mode scoring bridge (STAGED, not applied)
            genius-integration  (omega-p0 @omega/phonetic-stack → SE adapter, 2026-02-22)
```

**Three writing-engine incarnations** (corroborates commit `66445855`):
1. `src/scribe` — **SCRIBE v1.0.0**, certified ancestor, orphaned from build → *reference/garage candidate* (Phase 3 delta-audit subject).
2. `packages/scribe-engine` — active prose engine, descendant; wired into `genesis-planner`/`canon-kernel`.
3. `packages/sovereign-engine` — largest active engine (K2 forge + S-Oracle); the heavy narrative+scoring path.

> The fusion target (DEC-009) concerns #2/#3; #1 is the ancestor to delta-audit for lost capabilities. **No fusion/archive decision is made in Phase 1.**

## 3. Scoring / oracle lineage

```
src/oracle (EMOTION_V2 mock, 14+3 emotions)  ──▶  packages/emotion-gate
src/gates  (TRUTH_GATE v1.0)                 ──▶  packages/truth-gate
                                                  packages/sovereign-engine/oracle  (S-Oracle V2, macro-axes, GB/MS)
omega-p0 (@omega/phonetic-stack) ──[genius-integration adapter]──▶ sovereign-engine GENIUS scorer (dual-mode)
```

## 4. Control / certification lineage (collisions)

```
src/sentinel (Phase C rule auth)  ──▶  packages/sentinel-judge  (@omega/sentinel-judge, ACTIVE arbiter)
                                       OMEGA_SENTINEL_SUPREME    (@omega/sentinel-supreme v3.30.0, DORMANT cert/falsification)
                                       ⇧ NAME COLLISION, distinct impls — Phase 3 tribunal candidate

gateway/resilience (@omega/resilience v3.23.0, live)  ══  omega-phase23 (@omega/resilience v3.23.0, SNAPSHOT)
                                       ⇧ identical name+version — duplicate pair, Phase 3 candidate
```

## 5. Snapshot / archive branches (frozen lineage stubs)

| Zone | git | nature |
|------|-----|--------|
| `omega-v44`, `omega-v44-phase7` | 2026-01-24, 1 commit | full-tree version snapshot |
| `omega_titanium_ultimate` | 2026-01-11, 1 commit | snapshot (0 ts) |
| `OMEGA_SNAPSHOTS` | 2026-01-17→24 | snapshot bundle |
| `OMEGA_MASTER_DOSSIER_v3.21/61/83`, `OMEGA_PHASE12…23` | Jan–Feb | phase-milestone dossiers |
| `omega-narrative-genome` | 2026-01-07→19, 3 commits | early genome variant (has tsconfig) |

These are dated **branches off the main trunk**, not descendants in the active import graph (all graph-orphan). Provisional `SNAPSHOT?` in the CSV; final adjudication = remaining Phase 1 work.

## 6. Lineage verdict (Phase 1 scope)

- **Trunk**: `src/` ancestor monolith (2026-01-01) → `packages/` descendant workspace (2026-01-02 →) → live HEAD.
- **Writing path** flows ancestor `src/scribe`/`src/genesis` → active `scribe-engine` + `sovereign-engine`, hubbed on `canon-kernel`.
- **gateway/** sits *beside* the engines (CLI+security perimeter), not above them — the engine-binding seam is unresolved (Phase 2/4).
- **Dormant/snapshot/collision** zones (`OMEGA_SENTINEL_SUPREME`, `omega-phase23`, v44/titanium snapshots) are off-trunk; duplicates/collisions are flagged for **Phase 3**, not resolved here.

---
*Companion: `01_ENGINE_INVENTORY.md`, `01_ROOT_TREE_CLASSIFICATION.csv`. Dates are git-commit dates, not authored/creation claims; renames not followed (see metrology `METHOD.md` D7 limits).*
