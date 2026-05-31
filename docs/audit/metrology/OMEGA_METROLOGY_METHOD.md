# OMEGA — METROLOGY METHOD & REPRODUCIBILITY

**Stamp**: `bd9e3066@2026-05-31T08:19:28Z` · **Lane**: STATIC ONLY (Architect directive 2026-05-31)
**Standard**: NASA-Grade L4 — every number = command + tool version + limit.

---

## 0. Environment (measured)

| Tool | Version | Role |
|------|---------|------|
| node | v24.12.0 | runtime |
| npm | 11.6.2 | — |
| typescript | 5.9.3 | AST parser (compiler API, **parser only**) |
| tsx | 4.21.0 | TS script runner |
| git | 2.53.0.windows.1 | churn (D7) |

**No external metrology deps installed.** `madge` / `jscpd` / `ts-morph` / `cloc` / `tokei`
were **deliberately NOT installed** (MINIMIZE_IT + lockfile stability). All static metrics are
produced from `typescript` (already a repo devDep) + Node `fs` + `git`. Trade-offs noted per domain.

## 1. Scope

- **Included**: `packages/` + `src/` (monolith) + `gateway/`.
- **Excluded from analysis**: `node_modules`, `dist`, `.git`, `coverage`, `.turbo`, `.next`
  (regex `EXCLUDE_RE` in `lib-metrology.ts`).
- File buckets: `src` = `*.ts` non-test; `test` = `*.test.ts|*.spec.ts`; `dts` = `*.d.ts` (excluded from AST);
  `json`, `md` counted volumetrically only.
- **Out of scope this lane**: top-level archive dirs (`OMEGA_*`, `omega-v44`, `archives/` …) — these are
  the archaeology Phase 1 root-tree classification, not the engine metrology surface.

## 2. Reproduce (deterministic)

```powershell
$env:METRO_STAMP = "$(git rev-parse --short HEAD)@2026-05-31T08:19:28Z"
$env:METRO_NOW   = "2026-05-31T00:00:00Z"   # age reference for D7
npx tsx scripts/metrology/scan-static.ts        # D1 D2 D6 D8 -> DATASET.json + PERFILE.json
npx tsx scripts/metrology/scan-git-churn.ts     # D7         -> CHURN.json
npx tsx scripts/metrology/aggregate-report.ts   # CSV + DASHBOARD
```

Determinism: file discovery is sorted (`rel.localeCompare`); no `Date.now()`/`Math.random()` in scan logic;
timestamps are injected via env. Same HEAD + same env ⇒ byte-identical JSON (modulo the injected stamp).

## 3. Metric → method → limit (per domain)

### D1 — Volumetry (`scan-static.ts`)
| Metric | How | Limit |
|--------|-----|-------|
| bytes/file | `fs.statSync().size` | exact |
| LOC total/code/comment/blank | line state-machine `classifyLines()` (tracks `/* */`, `//`, blank) | **approximation**: strings containing `//` or `/*` at line start are rare but possible misclass; cloc-grade |
| chars, max line length | `text.length`, per-line max | exact |
| functions/classes/interfaces/types/enums/exports/imports | TS AST node kinds (`analyzeAst`) | functions = decl + expr + arrow + method + ctor + get/set (callbacks counted) |
| fn LOC / params / cyclomatic / nesting | per function-like node | cyclomatic = 1 + {if, for, while, do, case, catch, `&&`, `||`, `??`, ternary}; nesting = max Block/CaseBlock depth, function body = level 0; non-braced `if` adds no nesting level |
| distributions (mean/median/stddev/p95/max) | `dist()` | p95 = nearest-rank |

### D2 — Dependency graph (`scan-static.ts`)
- **Nodes** = package buckets (`packages/<x>`, `src(monolith)`, `gateway`, `other`).
- **Edges** = cross-package imports. Relative specifiers resolved to a file (`.ts`/`/index.ts` candidates) then to its
  package; bare specifiers matched against workspace `package.json` `name` (longest-prefix).
- fan-out Ce = distinct target packages; fan-in Ca = distinct source packages; **instability I = Ce/(Ca+Ce)**.
- Cycles: DFS 3-color on package graph (count + first 25 listed). DAG depth: memoized longest-path (cycle-guarded).
- **Limit**: package-granularity (not module-granularity); dynamic `import()` and string-built specifiers not resolved;
  type-only imports counted as edges. Abstraction `A` and distance-to-main-sequence `D` **NOT computed** (would need
  abstract-vs-concrete type classification — deferred, noted as gap).

### D6 — Typing / safety (`scan-static.ts`)
- `as any` / `as unknown` via `AsExpression` AST; `any` keyword via `AnyKeyword` node; non-null `!` via `NonNullExpression`.
- `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error` / `eslint-disable` via text match (comment directives).
- **Limit**: `<any>x` angle-bracket casts not counted (only `as`); per-package tsconfig strictness flags **not** enumerated (gap).

### D7 — Git churn / age (`scan-git-churn.ts`)
- Single `git log --no-merges --numstat`, aggregated per file: commits, +/- lines, distinct authors, first/last commit ISO.
- `METRO_NOW` = age reference ⇒ `ageSinceLastCommitDays`, `filesStale90d`.
- **Hotspot = commits × Σcyclomatic** (join with `PERFILE.json`).
- **Limit**: **no `--follow`** — renames collapse heuristically (`{a => b}` parsing), lineage may break across renames;
  "first commit" = oldest observed in current history, not true creation if file was renamed.

### D8 — Duplication (`scan-static.ts`)
- Rolling window of **6 normalized code lines** (whitespace-collapsed, comments/blanks skipped), SHA-256 per window.
  A window hash seen in ≥2 locations = a clone group; intra- vs inter-package by location package set.
- `dupRatioPct = dupWindowGroups × window / totalCodeLines`.
- **Limit**: `[RECONSTRUCTION]` — line-window approximation, **not** token-AST clone detection (jscpd-grade, not jscpd).
  Over/under-counts vs a real PDG-based detector; intended as a relative signal, not an absolute %.

## 4. DEFERRED (not measured this lane — require Phase 1 PASS + GO)

| Domain | Why deferred | Unblock |
|--------|--------------|---------|
| **D3 transmission runtime** (latency p50/p95, throughput, payload bytes) | needs executable harness instrumenting module boundaries; `TRANSMISSION_MATRIX.csv` ships **static columns only** (importSites, symbols); latency/payload columns present but empty (`*_DEFERRED`) | Architect GO post Phase-1 |
| **D3 contract payload sizing** (IntentPack/ForgePacket/Scene… serialized bytes) | needs representative instances, not just interface shape | with D3 runtime |
| **D4 tests & coverage** | full `vitest --coverage` across 38 pkgs = long/flaky; not in directive's static list | separate run |
| **D5 build/TSC timing & dist size** | requires building; not in directive's static list | separate run |
| **D9 prose quality** (S-Oracle, determinism) | requires running engines (and possibly LLM = cost-gated) | Architect GO |
| **D10 runtime resources** (memory/CPU) | requires execution | Architect GO |

## 5. Integrity

All measurement code is under `scripts/metrology/` (tooling class). **Zero engine/source files modified.**
Outputs are regenerable from HEAD `bd9e3066` with the commands in §2.
