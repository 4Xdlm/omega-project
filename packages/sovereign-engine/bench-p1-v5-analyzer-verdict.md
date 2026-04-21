# BENCH V4 FUSION — VERDICT

**Input** : bench-p1-v4-fusion-results.json
**Runs** : 42/42
**Model** : qwen3:32b
**Started** : 2026-04-21T11:32:51.063Z
**Generated** : 2026-04-21T19:23:09.373Z

## VERDICT : `BENCH_INVALID`

Une ou plusieurs T-gates technical sanity FAIL — bench non-exploitable.

**Gates** : 10 PASS / 7 FAIL / 17 total

## Gates detail

| ID | Label | Pass | Value | Threshold |
|---|---|---|---|---|
| T1 | options_hash OFF/ON divergence per seed | PASS | off=12 on=30 collisions=0 | off=12, collisions=0 |
| T2 | options_hash ON stable per-chunk cross-mode (V5 spec) | FAIL | on=30 buckets=60 obs=120 drift=60 missing_cc=0 | on=30, drift=0, missing_cc=0, buckets>0 |
| T3 | anti_repeat_enabled flags coherence | PASS | off_true=0 on_false=0 | off_true=0, on_false=0 |
| T4 | total bench duration | FAIL | 4789s (0 timeouts) | <= 3000s |
| T5 | run_id unique | PASS | unique=42/42 | unique=42 |
| D1 | Timeouts REPRO OFF C1+C2 x M2 (baseline stress) | FAIL | 0/12 | >= 7 |
| D2 | Timeouts REPRO ON  C1+C2 x M2 (effet P8-FIX) | PASS | 0/12 | <= 1 |
| D3 | Delta timeouts OFF-ON (effect size PRIO1) | FAIL | 0 | >= 6 |
| D4 | Timeouts CTRL C3 x (M2+M_prod) ON | PASS | 0/6 | <= 1 |
| D5 | rp_score median ON REPRO M2 | PASS | 0.075 | <= 0.15 |
| D6 | rp_score median OFF REPRO M2 | FAIL | 0.075 | >= 0.30 |
| G_beta.1 | M2 timeouts REPRO ON (redondant D2) | PASS | 0/12 | <= 1 |
| G_beta.2 | sigma M_prod_p1 ON REPRO composite | FAIL | 1.596 | <= 1.5 |
| G_beta.3 | Delta_I(M_prod - M2) ON REPRO composite mean | PASS | 1.111 | >= 0.5 |
| G_beta.4 | IC 95% bootstrap Delta_I lower bound > 0 | FAIL | [-0.407, 2.392] | lower > 0 |
| G_beta.5 | n_effectif non-timeout >= 5/6 par cellule x mode ON | PASS | cells_below=0 | cells_below=0 |
| G_beta.6 | directive_sha256 traces presentes ON REPRO | PASS | present=24 missing=0 | missing=0, present>=24 |

## Cellules (scene x mode x condition)

| Cellule | N_planned | N_ok | N_timeout | mean_score | sigma | rp_median |
|---|---|---|---|---|---|---|
| fr_interior_maison_enfance / M2_adaptive / OFF | 6 | 6 | 0 | 4.695 | 2.570 | 0.045 |
| fr_interior_maison_enfance / M2_adaptive / ON | 6 | 6 | 0 | 4.503 | 2.611 | 0.047 |
| fr_interior_maison_enfance / M_prod_p1 / ON | 6 | 6 | 0 | 5.266 | 2.027 | 0.034 |
| fr_interior_meditation_aube / M2_adaptive / ON | 3 | 3 | 0 | 2.165 | 0.467 | 0.165 |
| fr_interior_meditation_aube / M_prod_p1 / ON | 3 | 3 | 0 | 3.176 | 4.569 | 0.071 |
| fr_interior_veillee_funebre / M2_adaptive / OFF | 6 | 6 | 0 | 4.125 | 1.649 | 0.090 |
| fr_interior_veillee_funebre / M2_adaptive / ON | 6 | 6 | 0 | 4.125 | 1.649 | 0.090 |
| fr_interior_veillee_funebre / M_prod_p1 / ON | 6 | 6 | 0 | 5.584 | 1.198 | 0.065 |

## Runs (ordre index §3.3)

| Idx | Cond | Mode | Scene | Seed | Finish | Elapsed | Score | RP |
|---|---|---|---|---|---|---|---|---|
| 1 | OFF | M2_adaptive | maison_enfance | 42 | ok | 121.0s | 4.718 | 0.045 |
| 2 | ON | M2_adaptive | maison_enfance | 42 | ok | 114.3s | 3.567 | 0.051 |
| 3 | OFF | M2_adaptive | maison_enfance | 123 | ok | 122.3s | 2.779 | 0.042 |
| 4 | ON | M2_adaptive | maison_enfance | 123 | ok | 121.8s | 2.779 | 0.042 |
| 5 | OFF | M2_adaptive | maison_enfance | 456 | ok | 128.8s | 3.580 | 0.048 |
| 6 | ON | M2_adaptive | maison_enfance | 456 | ok | 130.8s | 3.580 | 0.048 |
| 7 | OFF | M2_adaptive | maison_enfance | 789 | ok | 124.4s | 3.571 | 0.046 |
| 8 | ON | M2_adaptive | maison_enfance | 789 | ok | 123.8s | 3.571 | 0.046 |
| 9 | OFF | M2_adaptive | maison_enfance | 1024 | ok | 128.8s | 3.734 | 0.031 |
| 10 | ON | M2_adaptive | maison_enfance | 1024 | ok | 127.7s | 3.734 | 0.031 |
| 11 | OFF | M2_adaptive | maison_enfance | 2048 | ok | 147.9s | 9.787 | 0.303 |
| 12 | ON | M2_adaptive | maison_enfance | 2048 | ok | 148.0s | 9.787 | 0.303 |
| 13 | ON | M_prod_p1 | maison_enfance | 42 | ok | 117.6s | 1.559 | 0.049 |
| 14 | ON | M_prod_p1 | maison_enfance | 123 | ok | 120.1s | 6.373 | 0.036 |
| 15 | ON | M_prod_p1 | maison_enfance | 456 | ok | 121.7s | 7.145 | 0.048 |
| 16 | ON | M_prod_p1 | maison_enfance | 789 | ok | 111.4s | 6.614 | 0.022 |
| 17 | ON | M_prod_p1 | maison_enfance | 1024 | ok | 113.1s | 5.088 | 0.032 |
| 18 | ON | M_prod_p1 | maison_enfance | 2048 | ok | 107.7s | 4.816 | 0.028 |
| 19 | OFF | M2_adaptive | veillee_funebr | 42 | ok | 105.5s | 4.909 | 0.065 |
| 20 | ON | M2_adaptive | veillee_funebr | 42 | ok | 105.3s | 4.909 | 0.065 |
| 21 | OFF | M2_adaptive | veillee_funebr | 123 | ok | 102.3s | 6.875 | 0.086 |
| 22 | ON | M2_adaptive | veillee_funebr | 123 | ok | 102.1s | 6.875 | 0.086 |
| 23 | OFF | M2_adaptive | veillee_funebr | 456 | ok | 102.8s | 2.158 | 0.106 |
| 24 | ON | M2_adaptive | veillee_funebr | 456 | ok | 102.8s | 2.158 | 0.106 |
| 25 | OFF | M2_adaptive | veillee_funebr | 789 | ok | 94.4s | 3.710 | 0.094 |
| 26 | ON | M2_adaptive | veillee_funebr | 789 | ok | 94.2s | 3.710 | 0.094 |
| 27 | OFF | M2_adaptive | veillee_funebr | 1024 | ok | 104.1s | 4.152 | 0.086 |
| 28 | ON | M2_adaptive | veillee_funebr | 1024 | ok | 103.9s | 4.152 | 0.086 |
| 29 | OFF | M2_adaptive | veillee_funebr | 2048 | ok | 116.0s | 2.949 | 0.119 |
| 30 | ON | M2_adaptive | veillee_funebr | 2048 | ok | 116.1s | 2.949 | 0.119 |
| 31 | ON | M_prod_p1 | veillee_funebr | 42 | ok | 107.8s | 4.366 | 0.091 |
| 32 | ON | M_prod_p1 | veillee_funebr | 123 | ok | 109.8s | 6.243 | 0.138 |
| 33 | ON | M_prod_p1 | veillee_funebr | 456 | ok | 112.5s | 7.030 | 0.045 |
| 34 | ON | M_prod_p1 | veillee_funebr | 789 | ok | 119.9s | 6.005 | 0.063 |
| 35 | ON | M_prod_p1 | veillee_funebr | 1024 | ok | 106.2s | 5.965 | 0.048 |
| 36 | ON | M_prod_p1 | veillee_funebr | 2048 | ok | 102.8s | 3.897 | 0.066 |
| 37 | ON | M2_adaptive | meditation_aub | 42 | ok | 93.6s | 2.650 | 0.165 |
| 38 | ON | M2_adaptive | meditation_aub | 123 | ok | 103.7s | 2.125 | 0.120 |
| 39 | ON | M2_adaptive | meditation_aub | 456 | ok | 136.9s | 1.719 | 0.501 |
| 40 | ON | M_prod_p1 | meditation_aub | 42 | ok | 117.5s | -2.010 | 0.422 |
| 41 | ON | M_prod_p1 | meditation_aub | 123 | ok | 100.3s | 6.612 | 0.071 |
| 42 | ON | M_prod_p1 | meditation_aub | 456 | ok | 97.4s | 4.925 | 0.054 |

## Metrics (detail)

```json
{
  "t1_off_unique_hashes": 12,
  "t1_on_unique_hashes": 30,
  "t1_seed_collision_count": 0,
  "t2_v5_perchunk_buckets": 60,
  "t2_v5_total_chunk_observations": 120,
  "t2_v5_runs_missing_chunks": 0,
  "t2_v5_violations": 60,
  "t2_v5_drift_sample": [
    "fr_interior_maison_enfance|42|0 → 2 hashes distincts",
    "fr_interior_maison_enfance|42|1 → 2 hashes distincts",
    "fr_interior_maison_enfance|42|2 → 2 hashes distincts",
    "fr_interior_maison_enfance|42|3 → 2 hashes distincts",
    "fr_interior_maison_enfance|123|0 → 2 hashes distincts"
  ],
  "t4_total_seconds": 4789.014,
  "t4_timeout_count": 0,
  "d1_timeouts_off": 0,
  "d2_timeouts_on": 0,
  "d3_delta_timeouts": 0,
  "d4_timeouts_ctrl": 0,
  "d5_rp_median_on": 0.07537467090937205,
  "d6_rp_median_off": 0.07537467090937205,
  "g_beta2_sigma_mprod_repro": 1.5963532346239828,
  "g_beta3_delta_I": 1.110967791526562,
  "g_beta3_n_mprod": 12,
  "g_beta3_n_m2": 12,
  "g_beta4_bootstrap_lower": -0.40696012800038606,
  "g_beta4_bootstrap_upper": 2.392043317730194,
  "g_beta4_bootstrap_point": 1.110967791526562,
  "g_beta5_cell_details": [
    "fr_interior_maison_enfance|M2_adaptive:6/6",
    "fr_interior_maison_enfance|M_prod_p1:6/6",
    "fr_interior_veillee_funebre|M2_adaptive:6/6",
    "fr_interior_veillee_funebre|M_prod_p1:6/6",
    "fr_interior_meditation_aube|M2_adaptive:3/3",
    "fr_interior_meditation_aube|M_prod_p1:3/3"
  ],
  "g_beta6_traces_present": 24,
  "g_beta6_traces_missing": 0
}
```