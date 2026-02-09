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

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | SUCCESS |
| 1 | GENERIC ERROR |
| 2 | USAGE ERROR |
| 3 | PROOFPACK INVALID |
| 4 | IO ERROR |
| 5 | INVARIANT BREACH |
| 6 | DRIFT DETECTED |
| 7 | CERTIFICATION FAIL |
