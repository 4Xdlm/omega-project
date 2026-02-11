# Metric Pipeline

## Prerequisites

- Node.js ≥ 18
- omega-project repo with golden runs in `golden/h2/`
- `npm install` in `packages/omega-metrics/`

## Commands

### Single run analysis

```bash
npx tsx packages/omega-metrics/src/cli/main.ts run \
  --input golden/h2/run_001 \
  --timestamp "2026-02-10T23:00:00.000Z" \
  --out metrics/h2/run_001.metrics.json
```

### Batch analysis

```bash
npx tsx packages/omega-metrics/src/cli/main.ts batch \
  --inputs golden/h2/run_001 golden/h2/run_002 \
  --timestamp "2026-02-10T23:00:00.000Z" \
  --out metrics/h2/
```

### Aggregate (cross-run comparison)

```bash
npx tsx packages/omega-metrics/src/cli/main.ts aggregate \
  --inputs metrics/h2/run_001.metrics.json metrics/h2/run_002.metrics.json \
  --replay metrics/h2/run_001_replay.metrics.json \
  --timestamp "2026-02-10T23:00:00.000Z" \
  --out metrics/h2/aggregate.metrics.json
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | PASS or WARN |
| 1 | FAIL |
| 2 | Technical error |

## Tests

```bash
cd packages/omega-metrics
npx vitest run
```

## Output Files

Each run produces:
- `<name>.metrics.json` — Machine-readable report
- `<name>.metrics.md` — Human-readable markdown

## CI Integration

```bash
npx tsx packages/omega-metrics/src/cli/main.ts run \
  --input golden/h2/run_001 \
  --out /tmp/metrics.json \
  --timestamp "$(date -u +%FT%TZ)"

# Exit code 1 on FAIL → CI pipeline fails
```
