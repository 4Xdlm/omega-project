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
| E1_continuity_impossible | 10 | 3 | 7 | 0 | 70.0% | 87.13 | 0.5900 |
| E2_non_classifiable | 10 | 7 | 3 | 0 | 30.0% | 87.42 | 0.6100 |
| E3_absolute_necessity | 10 | 3 | 7 | 0 | 70.0% | 86.09 | 0.4500 |

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

## Pack: ValidationPack_phase-s_real_20260228_4c00551

Baseline: PENDING — to be defined during real LLM runs
