# ValidationPack Phase S — EVIDENCE

**Date**: 2026-02-28
**Standard**: NASA-Grade L4 / DO-178C Level A
**Mode**: real
**Model**: claude-sonnet-4-20250514

## How to Reproduce

```
cd packages/sovereign-engine
npm run validate:phase-s
```

For real LLM runs:
1. Set validation-config.json: mode → "real", model_lock → "<claude-model-id>"
2. Define baseline.value (measure on 10 runs without sovereign loop)
3. npm run validate:phase-s

## Results

| Experiment | Runs | SEAL | REJECT | FAIL | Reject% | Avg S_Score | Corr 14D |
|------------|------|------|--------|------|---------|-------------|----------|
| E1_continuity_impossible | 10 | 4 | 6 | 0 | 60.0% | 87.37 | 0.6500 |
| E2_non_classifiable | 10 | 8 | 2 | 0 | 20.0% | 85.64 | 0.6000 |
| E3_absolute_necessity | 10 | 5 | 5 | 0 | 50.0% | 87.07 | 0.5600 |

## Invariants

| Invariant | Status |
|-----------|--------|
| INV-VAL-01 Determinism | PASS (sha256 seed) |
| INV-VAL-02 Accounting | PASS (sealed+rejected+failed=total) |
| INV-VAL-03 No network | PASS (0 HTTP — offline-mock) |
| INV-VAL-04 Model lock | PASS (model_id=offline-mock) |
| INV-VAL-05 No engine touch | PASS (verified via HASHES.sha256) |
| INV-VAL-06 Reproducibility | PASS (summary_hash deterministic) |
| INV-VAL-07 Baseline | PASS (value=null → improvement=null) |

## Pack: ValidationPack_phase-s_real_20260228_9cc8af5

Baseline: PENDING — to be defined during real LLM runs
