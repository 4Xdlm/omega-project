# OMNIPOTENT — CALIBRATION REPORT
# Date: 2026-02-21T11:33:52.106Z
# Provider: anthropic / claude-sonnet-4-20250514
# Runs: 5

## Correlations

| Metric | Spearman rho | Pearson r |
|--------|-------------|-----------|
| physics_score vs S_score | 0.6000 | 0.5955 |
| physics_score vs Q_text | 0.6000 | 0.5141 |

## SSOT Thresholds

| Threshold | Value |
|-----------|-------|
| strong_min | 0.5 |
| weak_max | 0.3 |

## Decision

**SCENARIO: A**

Justification:
- rho_S (physics vs S_score) = 0.6000
- rho_Q (physics vs Q_text) = 0.6000
- Decision rule applied from GENIUS_SSOT.json

## Data (5 runs)

| Seed | physics_score | S_score | Q_text | delta_AS | Verdict |
|------|--------------|---------|--------|----------|---------|
| 1 | 83.6 | 89.8 | 89.4 | 1 | REJECT |
| 2 | 85.0 | 89.2 | 89.2 | 1 | REJECT |
| 3 | 78.9 | 87.4 | 87.6 | 1 | REJECT |
| 4 | 89.3 | 88.8 | 88.6 | 1 | REJECT |
| 5 | 82.3 | 88.2 | 88.5 | 1 | REJECT |

## Descriptive Statistics

| Metric | Mean | Std | Min | Max |
|--------|------|-----|-----|-----|
| physics_score | 83.82 | 3.40 | 78.87 | 89.27 |
| S_score | 88.66 | 0.83 | 87.37 | 89.78 |
| Q_text | 88.65 | 0.65 | 87.58 | 89.44 |

## RCI Sub-Scores Diagnostic

| Seed | RCI | rhythm | signature | hook_presence | euphony_basic | voice_conformity |
|------|-----|-----|-----|-----|-----|-----|
| 1 | 81.0 | 67.7 | 100.0 | 63.0 | 82.2 | 77.6 |
| 2 | 78.8 | 64.5 | 100.0 | 72.9 | 82.2 | 69.5 |
| 3 | 78.8 | 67.1 | 100.0 | 52.1 | 78.0 | 75.2 |
| 4 | 76.5 | 64.6 | 100.0 | 72.9 | 72.9 | 69.3 |
| 5 | 77.9 | 68.0 | 100.0 | 60.4 | 66.8 | 80.1 |

### RCI Sub-Score Statistics

| Sub-Score | Mean | Std | Min | Max | Weight |
|-----------|------|-----|-----|-----|--------|
| rhythm | 66.4 | 1.5 | 64.5 | 68.0 | 1.00 |
| signature | 100.0 | 0.0 | 100.0 | 100.0 | 1.00 |
| hook_presence | 64.3 | 7.9 | 52.1 | 72.9 | 0.20 |
| euphony_basic | 76.4 | 5.9 | 66.8 | 82.2 | 1.00 |
| voice_conformity | 74.3 | 4.3 | 69.3 | 80.1 | 1.00 |

