# OMNIPOTENT — CALIBRATION REPORT
# Date: 2026-02-19T12:21:18.152Z
# Provider: anthropic / claude-sonnet-4-20250514
# Runs: 20

## Correlations

| Metric | Spearman rho | Pearson r |
|--------|-------------|-----------|
| physics_score vs S_score | 0.3308 | 0.3781 |
| physics_score vs Q_text | 0.2812 | 0.3662 |

## SSOT Thresholds

| Threshold | Value |
|-----------|-------|
| strong_min | 0.5 |
| weak_max | 0.3 |

## Decision

**SCENARIO: B_GREY_ZONE**

Justification:
- rho_S (physics vs S_score) = 0.3308
- rho_Q (physics vs Q_text) = 0.2812
- Decision rule applied from GENIUS_SSOT.json

## Data (20 runs)

| Seed | physics_score | S_score | Q_text | delta_AS | Verdict |
|------|--------------|---------|--------|----------|---------|
| 1 | 89.6 | 91.6 | 91.7 | 1 | REJECT |
| 2 | 84.2 | 89.4 | 88.8 | 1 | REJECT |
| 3 | 82.6 | 88.0 | 88.0 | 1 | REJECT |
| 4 | 84.4 | 89.2 | 89.0 | 1 | REJECT |
| 5 | 81.8 | 87.3 | 87.2 | 1 | REJECT |
| 6 | 80.3 | 91.3 | 90.9 | 1 | REJECT |
| 7 | 81.7 | 87.8 | 88.2 | 1 | REJECT |
| 8 | 85.1 | 89.9 | 89.7 | 1 | REJECT |
| 9 | 85.9 | 90.0 | 90.0 | 1 | REJECT |
| 10 | 80.6 | 88.6 | 88.6 | 1 | REJECT |
| 11 | 86.2 | 90.0 | 89.9 | 1 | REJECT |
| 12 | 84.4 | 89.2 | 89.4 | 1 | REJECT |
| 13 | 83.2 | 89.8 | 89.2 | 1 | REJECT |
| 14 | 81.0 | 86.7 | 86.9 | 1 | REJECT |
| 15 | 86.3 | 87.3 | 86.3 | 1 | REJECT |
| 16 | 83.5 | 88.2 | 88.4 | 1 | REJECT |
| 17 | 86.1 | 90.0 | 89.8 | 1 | REJECT |
| 18 | 84.1 | 89.8 | 90.0 | 1 | REJECT |
| 19 | 84.6 | 86.8 | 87.2 | 1 | REJECT |
| 20 | 84.8 | 87.9 | 88.3 | 1 | REJECT |

## Descriptive Statistics

| Metric | Mean | Std | Min | Max |
|--------|------|-----|-----|-----|
| physics_score | 84.02 | 2.21 | 80.35 | 89.57 |
| S_score | 88.94 | 1.37 | 86.68 | 91.59 |
| Q_text | 88.87 | 1.33 | 86.30 | 91.66 |
