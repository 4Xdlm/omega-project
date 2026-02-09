# OMEGA Governance — Phase F: Non-Regression Runtime & CI Gates

## Overview

Phase F extends `@omega/governance` with a complete non-regression CI system.
The past defines truth. The present must conform to it.

## Architecture

```
src/ci/
├── types.ts              # CIResult, CIReport, CISummary, exit codes
├── config.ts             # CIConfig with configurable thresholds
├── index.ts              # Barrel exports
├── baseline/
│   ├── types.ts          # BaselineRegistry, BaselineEntry, BaselineManifest
│   ├── registry.ts       # Read/write baseline registry
│   ├── register.ts       # Register new baselines (immutable)
│   ├── checker.ts        # Verify baseline integrity
│   └── certificate.ts    # Generate baseline certificates
├── replay/
│   ├── types.ts          # ReplayResult, ReplayDifference
│   ├── engine.ts         # Deterministic replay comparison
│   └── comparator.ts     # Byte-identical directory comparison
├── gates/
│   ├── types.ts          # GateId, GateResult, GateContext
│   ├── g0-precheck.ts    # G0: Verify baseline exists and is intact
│   ├── g1-replay.ts      # G1: Verify deterministic replay
│   ├── g2-compare.ts     # G2: Compare baseline vs candidate
│   ├── g3-drift.ts       # G3: Detect and classify drift
│   ├── g4-bench.ts       # G4: Benchmark against thresholds
│   ├── g5-certify.ts     # G5: Certify the candidate run
│   └── orchestrator.ts   # Sequential gate execution with fail-fast
├── reporter/
│   ├── types.ts          # ReportFormat, ReportOutput
│   ├── json-reporter.ts  # JSON CI report generation
│   ├── markdown-reporter.ts # Markdown CI report generation
│   └── summary.ts        # Summary and recommendations builder
└── badge/
    ├── types.ts          # BadgeStatus, BadgeConfig, BadgeResult
    └── generator.ts      # SVG badge generation
```

## Gates Pipeline (G0 -> G5)

| Gate | Name       | Description                              |
|------|------------|------------------------------------------|
| G0   | Pre-check  | Verify baseline exists and is intact     |
| G1   | Replay     | Verify deterministic replay              |
| G2   | Compare    | Compare baseline vs candidate            |
| G3   | Drift      | Detect and classify drift                |
| G4   | Bench      | Benchmark against thresholds             |
| G5   | Certify    | Certify the candidate run                |

**Execution**: Sequential G0->G5. Fail-fast by default (configurable).
After first FAIL, remaining gates are marked SKIPPED.

## Invariants (INV-F-01 through INV-F-10)

| ID       | Name                    | Description                                    |
|----------|-------------------------|------------------------------------------------|
| INV-F-01 | BASELINE_IMMUTABLE      | Once registered, a baseline cannot be changed  |
| INV-F-02 | REPLAY_SAME_SEED        | Replay uses the SAME seed as original          |
| INV-F-03 | REPLAY_BYTE_IDENTICAL   | Replay output is byte-identical to baseline    |
| INV-F-04 | GATES_SEQUENTIAL        | Gates execute sequentially, fail-fast          |
| INV-F-05 | THRESHOLDS_FROM_CONFIG  | All thresholds come from config, not hardcoded |
| INV-F-06 | CERTIFICATE_INCLUDES_GATES | Certificate references all gate results     |
| INV-F-07 | REPORT_PURE_FUNCTION    | Report is deterministic (no side effects)      |
| INV-F-08 | BASELINE_REGISTERED_IMMUTABLE | Re-registration throws                  |
| INV-F-09 | BADGE_REFLECTS_VERDICT  | Badge matches the real verdict                 |
| INV-F-10 | CI_DETERMINISTIC        | Same inputs = same results                     |

## CLI Commands (Phase F)

```
omega-govern baseline --action list --baselines-dir ./baselines
omega-govern baseline --action register --baselines-dir ./baselines --baseline-version v2.0.0 --run ./run
omega-govern baseline --action check --baselines-dir ./baselines --baseline-version v1.0.0
omega-govern replay --baseline ./run-a --candidate ./run-b --seed omega-ci
omega-govern ci --baselines-dir ./baselines --baseline-version v1.0.0 --baseline-dir ./base --candidate ./cand
omega-govern badge --result-file ./ci-report.json --out badge.svg
```

## Test Metrics

- Phase D.2 tests: 212
- Phase F tests: 123+
- **Total: 335 tests**
- All passing, 0 failures

## Exit Codes

| Code | Meaning                |
|------|------------------------|
| 0    | CI PASS                |
| 1    | CI FAIL                |
| 2    | USAGE ERROR            |
| 3    | BASELINE NOT FOUND     |
| 4    | IO ERROR               |
| 5    | INVARIANT BREACH       |

## Configuration

All thresholds are configurable via `CIConfig`:

```typescript
interface CIConfig {
  DEFAULT_SEED: string;           // 'omega-ci'
  REPLAY_TIMEOUT_MS: number;      // 120000
  FAIL_FAST: boolean;             // true
  ACCEPTABLE_DRIFT_LEVELS: DriftLevel[];  // ['NO_DRIFT', 'SOFT_DRIFT']
  MAX_VARIANCE_PERCENT: number;   // 5
  MAX_DURATION_MS: number;        // 60000
  ACCEPTABLE_CERT_VERDICTS: CertVerdict[]; // ['PASS', 'PASS_WITH_WARNINGS']
}
```

## Baseline Structure

```
baselines/
├── registry.json           # Registry of all baselines
└── v1.0.0/
    ├── baseline.manifest.json    # Baseline manifest
    ├── baseline.manifest.sha256  # Manifest hash
    ├── thresholds.json           # Score thresholds
    ├── intent_minimal/
    │   └── intent.json
    ├── intent_standard/
    │   └── intent.json
    └── intent_complex/
        └── intent.json
```
