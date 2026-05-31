# Global Score Model

## Formula

```
global = structural × 0.40 + semantic × 0.35 + dynamic × 0.25
```

Each category score is a weighted average of its individual metrics.

## Thresholds

| Status | Condition |
|--------|-----------|
| PASS | global ≥ 0.90 |
| WARN | 0.80 ≤ global < 0.90 |
| FAIL | global < 0.80 |

## Hard Fails (override status to FAIL)

| Condition | Rationale |
|-----------|-----------|
| canon_violation_count > 0 | Canon is sacred, never contradicted |
| intra_intent_stability < 0.999 | Determinism is non-negotiable |

## Calibration

Thresholds are calibrated against golden runs:
- If golden runs score ≥ 0.95 → consider raising PASS to 0.95
- If golden runs score < 0.90 → adjust weights, document reasons
- Calibration decisions recorded in GLOBAL_THRESHOLDS.json

## Category Weights

| Category | Weight | Rationale |
|----------|--------|-----------|
| Structural | 0.40 | Plan integrity is the foundation |
| Semantic | 0.35 | Intent alignment ensures the plan serves its purpose |
| Dynamic | 0.25 | Cross-run metrics validate system behavior |
