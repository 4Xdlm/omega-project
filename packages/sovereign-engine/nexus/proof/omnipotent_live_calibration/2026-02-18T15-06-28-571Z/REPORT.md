# OMNIPOTENT — CALIBRATION REPORT
# Date: 2026-02-18T21:56:45.066Z
# Provider: anthropic / claude-sonnet-4-20250514
# Runs: 18

## Correlations

| Metric | Spearman rho | Pearson r |
|--------|-------------|-----------|
| physics_score vs S_score | 0.0000 | 0.0000 |
| physics_score vs Q_text | 0.0000 | 0.0000 |

## SSOT Thresholds

| Threshold | Value |
|-----------|-------|
| strong_min | 0.5 |
| weak_max | 0.3 |

## Decision

**SCENARIO: B**

Justification:
- rho_S (physics vs S_score) = 0.0000
- rho_Q (physics vs Q_text) = 0.0000
- Decision rule applied from GENIUS_SSOT.json

## Data (18 runs)

| Seed | physics_score | S_score | Q_text | delta_AS | Verdict |
|------|--------------|---------|--------|----------|---------|
| 1 | 60.0 | 86.6 | 86.9 | 1 | REJECT |
| 2 | 60.0 | 87.3 | 87.5 | 1 | REJECT |
| 3 | 60.0 | 90.3 | 90.2 | 1 | REJECT |
| 4 | 60.0 | 87.7 | 87.3 | 1 | REJECT |
| 5 | 60.0 | 90.0 | 90.2 | 1 | REJECT |
| 6 | 60.0 | 90.2 | 90.2 | 1 | REJECT |
| 7 | 60.0 | 87.3 | 87.4 | 1 | REJECT |
| 8 | 60.0 | 90.1 | 89.4 | 1 | REJECT |
| 9 | 60.0 | 87.8 | 87.5 | 1 | REJECT |
| 10 | 60.0 | 89.2 | 89.1 | 1 | REJECT |
| 11 | 60.0 | 90.6 | 90.6 | 1 | REJECT |
| 12 | 60.0 | 86.3 | 87.1 | 1 | REJECT |
| 13 | 60.0 | 91.2 | 90.8 | 1 | REJECT |
| 14 | 60.0 | 90.1 | 89.2 | 1 | REJECT |
| 15 | 60.0 | 90.0 | 89.4 | 1 | REJECT |
| 16 | 60.0 | 89.0 | 89.0 | 1 | REJECT |
| 17 | 60.0 | 89.7 | 89.5 | 1 | REJECT |
| 20 | 60.0 | 90.6 | 90.3 | 1 | REJECT |

## Descriptive Statistics

| Metric | Mean | Std | Min | Max |
|--------|------|-----|-----|-----|
| physics_score | 60.00 | 0.00 | 60.00 | 60.00 |
| S_score | 89.11 | 1.48 | 86.31 | 91.17 |
| Q_text | 88.98 | 1.30 | 86.92 | 90.78 |
