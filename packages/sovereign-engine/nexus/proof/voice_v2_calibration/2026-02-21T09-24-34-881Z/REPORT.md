# OMNIPOTENT — CALIBRATION REPORT
# Date: 2026-02-21T11:33:28.583Z
# Provider: anthropic / claude-sonnet-4-20250514
# Runs: 6

## Correlations

| Metric | Spearman rho | Pearson r |
|--------|-------------|-----------|
| physics_score vs S_score | 0.3714 | 0.4410 |
| physics_score vs Q_text | 0.3714 | 0.3769 |

## SSOT Thresholds

| Threshold | Value |
|-----------|-------|
| strong_min | 0.5 |
| weak_max | 0.3 |

## Decision

**SCENARIO: B_GREY_ZONE**

Justification:
- rho_S (physics vs S_score) = 0.3714
- rho_Q (physics vs Q_text) = 0.3714
- Decision rule applied from GENIUS_SSOT.json

## Data (6 runs)

| Seed | physics_score | S_score | Q_text | delta_AS | Verdict |
|------|--------------|---------|--------|----------|---------|
| 1 | 81.1 | 88.4 | 87.9 | 1 | REJECT |
| 2 | 85.8 | 90.4 | 89.5 | 1 | REJECT |
| 3 | 85.5 | 86.9 | 86.3 | 1 | REJECT |
| 4 | 88.3 | 89.6 | 89.6 | 1 | REJECT |
| 5 | 81.2 | 87.7 | 88.0 | 1 | REJECT |
| 6 | 84.8 | 89.8 | 89.7 | 1 | REJECT |

## Descriptive Statistics

| Metric | Mean | Std | Min | Max |
|--------|------|-----|-----|-----|
| physics_score | 84.45 | 2.55 | 81.10 | 88.26 |
| S_score | 88.78 | 1.25 | 86.86 | 90.40 |
| Q_text | 88.51 | 1.22 | 86.33 | 89.75 |

## RCI Sub-Scores Diagnostic

| Seed | RCI | rhythm | signature | hook_presence | euphony_basic | voice_conformity |
|------|-----|-----|-----|-----|-----|-----|
| 1 | 76.5 | 56.4 | 100.0 | 35.4 | 85.4 | 72.7 |
| 2 | 83.2 | 71.3 | 100.0 | 68.8 | 84.4 | 80.2 |
| 3 | 75.4 | 58.8 | 100.0 | 41.7 | 68.5 | 81.0 |
| 4 | 80.2 | 67.3 | 100.0 | 45.8 | 85.6 | 74.9 |
| 5 | 78.4 | 73.2 | 100.0 | 54.2 | 75.4 | 70.1 |
| 6 | 78.4 | 68.5 | 100.0 | 79.2 | 75.6 | 69.2 |

### RCI Sub-Score Statistics

| Sub-Score | Mean | Std | Min | Max | Weight |
|-----------|------|-----|-----|-----|--------|
| rhythm | 65.9 | 6.2 | 56.4 | 73.2 | 1.00 |
| signature | 100.0 | 0.0 | 100.0 | 100.0 | 1.00 |
| hook_presence | 54.2 | 15.4 | 35.4 | 79.2 | 0.20 |
| euphony_basic | 79.1 | 6.4 | 68.5 | 85.6 | 1.00 |
| voice_conformity | 74.7 | 4.6 | 69.2 | 81.0 | 1.00 |

