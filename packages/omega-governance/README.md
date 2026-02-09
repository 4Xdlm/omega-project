# @omega/governance

Phase D.2 — Governance & Comparatifs layer for the OMEGA pipeline.

**READ-ONLY analysis** — this package observes, compares, and certifies ProofPack runs. It never modifies source files.

## Commands

```bash
omega-govern compare   --runs <dir1,dir2,...> --out <file.json>
omega-govern drift     --baseline <dir> --candidate <dir> --out <file.json>
omega-govern bench     --suite <suiteDir> --out <dir>
omega-govern certify   --run <runDir> --out <file.json>
omega-govern history   --log <path.ndjson> [--since <ISO>] [--until <ISO>]
```

## Modules

| Module | Description |
|--------|-------------|
| `core/` | Types, config (all thresholds), ProofPack reader, validator |
| `compare/` | Run comparison (artifact-differ, score-differ, report) |
| `drift/` | Drift detection and classification (3 types, 4 levels) |
| `bench/` | Benchmark suite execution and threshold checking |
| `certify/` | Certification with 10 checks and deterministic signatures |
| `history/` | NDJSON event logging, querying, trend analysis |
| `invariants/` | 8 governance invariants (INV-GOV-01 through INV-GOV-08) |

## Invariants

| ID | Name | Description |
|----|------|-------------|
| INV-GOV-01 | READ_ONLY | No source file modified after analysis |
| INV-GOV-02 | HASH_TRUST | All analysis relies on verified manifest + merkle |
| INV-GOV-03 | COMPARE_SYMMETRIC | compare(A,B).diffs = inverse(compare(B,A).diffs) |
| INV-GOV-04 | DRIFT_EXPLICIT | Every drift classified with explicit rule |
| INV-GOV-05 | BENCH_DETERMINISTIC | Same suite + same runs = same result |
| INV-GOV-06 | CERT_STABLE | certify(run) x2 = identical certificates |
| INV-GOV-07 | LOG_APPEND_ONLY | History log can only add, never delete |
| INV-GOV-08 | REPORT_DERIVED | All figures come from ProofPack, no local computation |

## Configuration

All thresholds are centralized in `GovConfig`. No magic numbers.

```typescript
import { createConfig } from '@omega/governance';
const config = createConfig({ DRIFT_SOFT_THRESHOLD: 0.10 });
```

## Phase F — CI Non-Regression

```bash
omega-govern baseline --action list --baselines-dir ./baselines
omega-govern baseline --action check --baselines-dir ./baselines --baseline-version v1.0.0
omega-govern replay   --baseline <dir> --candidate <dir> --seed omega-ci
omega-govern ci       --baselines-dir ./baselines --baseline-version v1.0.0 --baseline-dir <dir> --candidate <dir>
omega-govern badge    --result-file <report.json> --out badge.svg
```

### CI Modules

| Module | Description |
|--------|-------------|
| `ci/baseline/` | Baseline registration, verification, certification |
| `ci/replay/` | Deterministic replay comparison engine |
| `ci/gates/` | G0-G5 sequential gates with fail-fast |
| `ci/reporter/` | JSON and Markdown CI report generation |
| `ci/badge/` | SVG badge generation |

### CI Invariants (Phase F)

| ID | Name | Description |
|----|------|-------------|
| INV-F-01 | BASELINE_IMMUTABLE | Once registered, baselines cannot be changed |
| INV-F-02 | REPLAY_SAME_SEED | Replay uses same seed as original |
| INV-F-03 | REPLAY_BYTE_IDENTICAL | Replay output is byte-identical |
| INV-F-04 | GATES_SEQUENTIAL | Gates execute G0->G5, fail-fast |
| INV-F-05 | THRESHOLDS_FROM_CONFIG | All thresholds from config |
| INV-F-06 | CERTIFICATE_INCLUDES_GATES | Certificate references all gates |
| INV-F-07 | REPORT_PURE_FUNCTION | Report is deterministic |
| INV-F-08 | BASELINE_REGISTERED_IMMUTABLE | Re-registration throws |
| INV-F-09 | BADGE_REFLECTS_VERDICT | Badge matches real verdict |
| INV-F-10 | CI_DETERMINISTIC | Same inputs = same results |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | SUCCESS / CI PASS |
| 1 | GENERIC ERROR / CI FAIL |
| 2 | USAGE ERROR |
| 3 | PROOFPACK INVALID / BASELINE NOT FOUND |
| 4 | IO ERROR |
| 5 | INVARIANT BREACH |
| 6 | DRIFT DETECTED |
| 7 | CERTIFICATION FAIL |
