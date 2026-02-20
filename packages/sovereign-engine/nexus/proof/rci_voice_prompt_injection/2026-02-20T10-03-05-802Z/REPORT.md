# OMNIPOTENT — CALIBRATION REPORT
# Date: 2026-02-20T15:39:30.264Z
# Provider: anthropic / claude-sonnet-4-20250514
# Runs: 14

## Correlations

| Metric | Spearman rho | Pearson r |
|--------|-------------|-----------|
| physics_score vs S_score | 0.4330 | 0.3844 |
| physics_score vs Q_text | 0.3890 | 0.2123 |

## SSOT Thresholds

| Threshold | Value |
|-----------|-------|
| strong_min | 0.5 |
| weak_max | 0.3 |

## Decision

**SCENARIO: B_GREY_ZONE**

Justification:
- rho_S (physics vs S_score) = 0.4330
- rho_Q (physics vs Q_text) = 0.3890
- Decision rule applied from GENIUS_SSOT.json

## Data (14 runs)

| Seed | physics_score | S_score | Q_text | delta_AS | Verdict |
|------|--------------|---------|--------|----------|---------|
| 1 | 82.1 | 90.6 | 90.6 | 1 | REJECT |
| 2 | 80.2 | 88.4 | 88.2 | 1 | REJECT |
| 3 | 84.7 | 88.8 | 88.5 | 1 | REJECT |
| 4 | 83.4 | 91.7 | 91.4 | 1 | REJECT |
| 5 | 78.5 | 86.9 | 87.8 | 1 | REJECT |
| 6 | 81.8 | 88.9 | 88.6 | 1 | REJECT |
| 7 | 87.3 | 88.0 | 87.9 | 1 | REJECT |
| 8 | 84.5 | 90.0 | 89.9 | 1 | REJECT |
| 9 | 82.4 | 86.6 | 86.8 | 1 | REJECT |
| 10 | 91.0 | 90.3 | 89.2 | 1 | REJECT |
| 11 | 81.7 | 87.1 | 87.4 | 1 | REJECT |
| 12 | 80.1 | 89.1 | 89.1 | 1 | REJECT |
| 13 | 79.0 | 87.3 | 87.7 | 1 | REJECT |
| 14 | 82.6 | 90.9 | 90.6 | 1 | REJECT |

## Descriptive Statistics

| Metric | Mean | Std | Min | Max |
|--------|------|-----|-----|-----|
| physics_score | 82.81 | 3.21 | 78.51 | 90.99 |
| S_score | 88.91 | 1.57 | 86.55 | 91.75 |
| Q_text | 88.84 | 1.31 | 86.78 | 91.37 |
