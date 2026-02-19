# OMNIPOTENT — CALIBRATION REPORT
# Date: 2026-02-19T23:52:52.741Z
# Provider: anthropic / claude-sonnet-4-20250514
# Runs: 5

## Correlations

| Metric | Spearman rho | Pearson r |
|--------|-------------|-----------|
| physics_score vs S_score | 0.3000 | 0.3518 |
| physics_score vs Q_text | 0.5000 | 0.6124 |

## SSOT Thresholds

| Threshold | Value |
|-----------|-------|
| strong_min | 0.5 |
| weak_max | 0.3 |

## Decision

**SCENARIO: B_GREY_ZONE**

Justification:
- rho_S (physics vs S_score) = 0.3000
- rho_Q (physics vs Q_text) = 0.5000
- Decision rule applied from GENIUS_SSOT.json

## Data (5 runs)

| Seed | physics_score | S_score | Q_text | delta_AS | Verdict |
|------|--------------|---------|--------|----------|---------|
| 1 | 84.3 | 89.4 | 89.4 | 1 | REJECT |
| 2 | 85.1 | 90.3 | 90.1 | 1 | REJECT |
| 3 | 83.2 | 88.1 | 88.1 | 1 | REJECT |
| 4 | 84.8 | 88.3 | 88.4 | 1 | REJECT |
| 5 | 82.9 | 89.5 | 88.8 | 1 | REJECT |

## Descriptive Statistics

| Metric | Mean | Std | Min | Max |
|--------|------|-----|-----|-----|
| physics_score | 84.06 | 0.86 | 82.93 | 85.11 |
| S_score | 89.15 | 0.80 | 88.14 | 90.30 |
| Q_text | 88.96 | 0.71 | 88.06 | 90.09 |
