# OMEGA GENIUS — DUAL BENCHMARK REPORT (Phase 4f v1.1)
# Date: 2026-02-22T20:57:07.466Z
# Provider: anthropic / claude-sonnet-4-20250514
# Runs: 46 successful / 2 attempted
# Retried: 2 run(s) (ENGINE_FAIL → auto-retry)
# Provider stopped early: NO
# Schema: genius.dual.benchmark.v1

---

## SUNSET CONTRACT DECISION

| Criterion | Value | Status |
|-----------|-------|--------|
| N runs completed | 46 / 30 required | ✅ PASS |
| median(G_new - G_old) ≥ 0 | +8.803 | ✅ PASS |
| Regressions = 0 | 0 regression(s) | ✅ PASS |
| Determinism | PASS | ✅ PASS |

**VERDICT: BASCULE → omegaP0 (purge legacy next sprint)**

---

## SCORE STATISTICS

| Metric | Mean | Std | Min | Max | Median |
|--------|------|-----|-----|-----|--------|
| M | 88.60 | 1.63 | 84.84 | 92.52 | 88.40 |
| G_old | 67.31 | 3.41 | 61.18 | 76.18 | 66.77 |
| G_new | 76.80 | 4.38 | 67.75 | 84.60 | 77.38 |
| delta (G_new-G_old) | 9.49 | 5.96 | -1.81 | 22.20 | 8.80 |
| Q_text (legacy) | 77.20 | 2.29 | 73.02 | 83.63 | 77.00 |

---

## RETRIES (2)

- Slot 48: original_seed=48 actual_seed=148 retry_attempt=1
- Slot 49: original_seed=49 actual_seed=149 retry_attempt=1

---

## PHI SHADOW METRICS — OBSERVER ONLY

| Metric | Value |
|--------|-------|
| Runs with phi data | 46 |
| Mean of ratio_mean across runs | 1.5346 |
| Mean distance to φ | 0.2436 |
| φ reference | 1.6180339887 |
| PHI_HYPOTHESIS | WEAK (distance 0.2–0.5) |

| Seed | Sentences | ratio_mean | ratio_std | dist_phi |
|------|-----------|------------|-----------|----------|
| 1 | 46 | 1.903 | 2.882 | 0.285 |
| 2 | 39 | 1.834 | 2.421 | 0.216 |
| 3 | 42 | 1.285 | 1.016 | 0.333 |
| 4 | 36 | 1.254 | 0.840 | 0.364 |
| 5 | 39 | 1.236 | 0.856 | 0.382 |
| 6 | 46 | 1.156 | 0.574 | 0.462 |
| 7 | 61 | 1.508 | 1.545 | 0.110 |
| 8 | 29 | 1.477 | 1.773 | 0.141 |
| 9 | 49 | 1.905 | 2.133 | 0.287 |
| 10 | 45 | 1.789 | 2.062 | 0.171 |
| 11 | 50 | 1.707 | 2.152 | 0.089 |
| 12 | 46 | 1.749 | 2.767 | 0.131 |
| 13 | 33 | 1.770 | 2.046 | 0.152 |
| 14 | 30 | 1.961 | 2.823 | 0.343 |
| 15 | 48 | 1.611 | 2.707 | 0.007 |
| 16 | 45 | 1.239 | 0.846 | 0.379 |
| 17 | 40 | 1.287 | 1.065 | 0.331 |
| 18 | 54 | 1.400 | 1.466 | 0.219 |
| 20 | 38 | 1.906 | 2.403 | 0.288 |
| 21 | 32 | 1.211 | 0.913 | 0.407 |
| 23 | 27 | 1.493 | 1.523 | 0.125 |
| 24 | 58 | 2.169 | 4.201 | 0.551 |
| 25 | 46 | 1.400 | 1.202 | 0.218 |
| 26 | 34 | 1.182 | 0.983 | 0.436 |
| 27 | 40 | 1.379 | 1.217 | 0.239 |
| 28 | 38 | 1.633 | 2.582 | 0.015 |
| 29 | 46 | 1.648 | 2.385 | 0.030 |
| 30 | 38 | 2.284 | 3.979 | 0.666 |
| 31 | 67 | 1.393 | 1.444 | 0.225 |
| 33 | 54 | 1.573 | 1.734 | 0.046 |
| 34 | 46 | 1.209 | 0.883 | 0.409 |
| 35 | 40 | 1.301 | 1.006 | 0.317 |
| 36 | 62 | 1.755 | 2.534 | 0.137 |
| 37 | 55 | 1.478 | 1.385 | 0.140 |
| 38 | 58 | 1.527 | 1.808 | 0.091 |
| 39 | 38 | 1.235 | 0.824 | 0.383 |
| 40 | 62 | 1.538 | 1.676 | 0.080 |
| 41 | 37 | 1.321 | 1.014 | 0.297 |
| 42 | 31 | 1.607 | 1.566 | 0.011 |
| 43 | 45 | 1.941 | 2.843 | 0.323 |
| 44 | 47 | 1.296 | 0.914 | 0.322 |
| 45 | 40 | 1.356 | 1.176 | 0.262 |
| 46 | 48 | 1.231 | 0.796 | 0.387 |
| 47 | 39 | 1.380 | 1.200 | 0.238 |
| 48 | 48 | 1.495 | 1.822 | 0.123 |
| 49 | 41 | 1.581 | 2.362 | 0.037 |

---

## RUN DATA

| Seed | Actual Seed | Retry | M | G_old | G_new | delta | Q_text | Verdict |
|------|-------------|-------|---|-------|-------|-------|--------|---------|
| 1 | undefined | undefined | 88.2 | 65.5 | 72.3 | +6.81 | 76.0 | PITCH |
| 2 | undefined | undefined | 91.8 | 76.2 | 75.3 | -0.93 | 83.6 | PITCH |
| 3 | undefined | undefined | 87.6 | 63.4 | 79.8 | +16.37 | 74.5 | PITCH |
| 4 | undefined | undefined | 88.2 | 68.6 | 70.3 | +1.76 | 77.8 | PITCH |
| 5 | undefined | undefined | 84.8 | 65.2 | 77.3 | +12.13 | 74.4 | PITCH |
| 6 | undefined | undefined | 85.4 | 63.0 | 81.0 | +18.08 | 73.3 | PITCH |
| 7 | undefined | undefined | 87.8 | 63.8 | 78.9 | +15.06 | 74.8 | PITCH |
| 8 | undefined | undefined | 89.4 | 74.2 | 76.0 | +1.85 | 81.4 | PITCH |
| 9 | undefined | undefined | 88.4 | 72.6 | 79.0 | +6.38 | 80.1 | PITCH |
| 10 | undefined | undefined | 88.5 | 71.2 | 78.4 | +7.14 | 79.4 | PITCH |
| 11 | undefined | undefined | 90.4 | 66.0 | 76.3 | +10.32 | 77.2 | PITCH |
| 12 | undefined | undefined | 91.6 | 67.1 | 73.8 | +6.79 | 78.4 | PITCH |
| 13 | undefined | undefined | 91.0 | 68.8 | 78.7 | +9.93 | 79.1 | PITCH |
| 14 | undefined | undefined | 89.1 | 66.6 | 79.2 | +12.62 | 77.0 | PITCH |
| 15 | undefined | undefined | 88.0 | 65.9 | 73.3 | +7.48 | 76.1 | PITCH |
| 16 | undefined | undefined | 86.0 | 70.3 | 78.0 | +7.75 | 77.8 | PITCH |
| 17 | undefined | undefined | 92.5 | 70.8 | 82.7 | +11.86 | 81.0 | PITCH |
| 18 | undefined | undefined | 87.6 | 70.4 | 76.0 | +5.68 | 78.5 | PITCH |
| 20 | undefined | undefined | 90.3 | 65.7 | 81.8 | +16.10 | 77.0 | PITCH |
| 21 | 21 | 0 | 87.4 | 71.0 | 73.4 | +2.42 | 78.8 | PITCH |
| 23 | undefined | undefined | 89.6 | 70.8 | 76.9 | +6.06 | 79.7 | PITCH |
| 24 | undefined | undefined | 88.4 | 66.4 | 74.1 | +7.65 | 76.7 | PITCH |
| 25 | undefined | undefined | 89.6 | 65.4 | 81.3 | +15.88 | 76.5 | PITCH |
| 26 | undefined | undefined | 88.6 | 70.0 | 78.3 | +8.29 | 78.7 | PITCH |
| 27 | undefined | undefined | 89.4 | 65.2 | 77.5 | +12.29 | 76.3 | PITCH |
| 28 | undefined | undefined | 88.0 | 66.4 | 79.3 | +12.87 | 76.5 | PITCH |
| 29 | undefined | undefined | 87.8 | 67.0 | 73.8 | +6.89 | 76.7 | PITCH |
| 30 | undefined | undefined | 89.4 | 61.2 | 70.5 | +9.32 | 74.0 | PITCH |
| 31 | undefined | undefined | 88.0 | 67.1 | 84.6 | +17.50 | 76.9 | PITCH |
| 33 | 33 | 0 | 87.3 | 69.9 | 69.2 | -0.74 | 78.1 | PITCH |
| 34 | 34 | 0 | 86.1 | 69.3 | 76.5 | +7.19 | 77.3 | PITCH |
| 35 | 35 | 0 | 88.4 | 61.9 | 83.8 | +21.93 | 74.0 | PITCH |
| 36 | 36 | 0 | 90.7 | 68.9 | 69.9 | +0.98 | 79.1 | PITCH |
| 37 | 37 | 0 | 91.7 | 71.5 | 73.9 | +2.40 | 81.0 | PITCH |
| 38 | 38 | 0 | 89.1 | 66.0 | 71.3 | +5.25 | 76.7 | PITCH |
| 39 | 39 | 0 | 86.4 | 69.2 | 82.8 | +13.56 | 77.4 | PITCH |
| 40 | 40 | 0 | 89.2 | 66.1 | 73.8 | +7.63 | 76.8 | PITCH |
| 41 | 41 | 0 | 88.1 | 70.4 | 82.1 | +11.67 | 78.8 | PITCH |
| 42 | 42 | 0 | 87.5 | 62.3 | 73.2 | +10.92 | 73.8 | PITCH |
| 43 | 43 | 0 | 90.2 | 69.6 | 67.8 | -1.81 | 79.2 | PITCH |
| 44 | 44 | 0 | 88.2 | 63.6 | 82.2 | +18.60 | 74.9 | PITCH |
| 45 | 45 | 0 | 87.5 | 62.8 | 79.7 | +16.90 | 74.1 | PITCH |
| 46 | 46 | 0 | 88.5 | 64.3 | 78.3 | +14.02 | 75.4 | PITCH |
| 47 | 47 | 0 | 87.0 | 61.2 | 83.4 | +22.20 | 73.0 | PITCH |
| 48 | 148 | 1 | 89.0 | 67.9 | 79.2 | +11.35 | 77.7 | PITCH |
| 49 | 149 | 1 | 87.8 | 65.8 | 67.9 | +2.14 | 76.0 | PITCH |

---

## REGRESSIONS (0)

_None. Zero regressions detected._

---

## ERRORS (4)

- run_19_ERROR.json
- run_22_ERROR.json
- run_32_ERROR.json
- run_50_ERROR.json

---

*Generated by run-dual-benchmark.ts v1.1 — Phase 4f — NASA-Grade L4*
*PATCH v1.1: Auto-retry ENGINE_FAIL (MAX_RETRIES=2, RETRY_SEED_OFFSET=100)*
