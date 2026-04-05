# OMEGA Bench API P4 — Loom OFF vs ON

**Bench ID**: P4-BENCH-1775364498617
**Date**: 2026-04-05T06:03:54.791Z
**Golden run**: golden/e2e/run_001/runs/13535cccff86620f
**Scènes**: 5
**Modèle**: claude-sonnet-4-20250514

## Résumé

| Métrique | ARM A (OFF) | ARM B (ON) | Delta |
|----------|-------------|------------|-------|
| Composite moyen | 83.03 | 84.15 | 1.12 |
| ECC moyen | 76.55 | 82.89 | 6.34 |
| Temps moyen (ms) | 465620.4 | 441541.2 | -24079.2 |
| Continuity tokens | 125 | 123 | -2 |
| SEAL | 0 | 0 | — |
| Crashes | 0 | 0 | — |
| Overhead Loom | — | -5.17% | — |

## Loom Telemetry (ARM B)

| Métrique | Total |
|----------|-------|
| Dettes ouvertes | 3 |
| Dettes résolues | 0 |
| Motifs accumulés | 29 |

## Détail par scène

### ARM A — LOOM OFF

| # | Scene ID | Verdict | Comp | ECC | AAI | RCI | SII | IFI | Words | ms |
|---|----------|---------|------|-----|-----|-----|-----|-----|-------|----|
| 0 | SCN-01-001-4f6a5 | REJECT | 84.09 | 69 | 94.8 | 87.53 | 90.87 | 91.07 | 528 | 504562 |
| 1 | SCN-01-002-814b8 | REJECT | 77.72 | 67.38 | 93.6 | 66.32 | 84.2 | 81.77 | 394 | 394870 |
| 2 | SCN-01-003-1d966 | REJECT | 85.22 | 80.27 | 93.6 | 81.37 | 86.73 | 84.89 | 481 | 551630 |
| 3 | SCN-02-001-73012 | REJECT | 88.2 | 85.65 | 94.8 | 85.32 | 89.2 | 83.51 | 319 | 417975 |
| 4 | SCN-02-002-40813 | REJECT | 79.94 | 80.45 | 83.6 | 76.43 | 82.8 | 70.82 | 314 | 459065 |

### ARM B — LOOM ON

| # | Scene ID | Verdict | Comp | ECC | AAI | RCI | SII | IFI | Words | ms | Debts+ | Debts- | Motifs |
|---|----------|---------|------|-----|-----|-----|-----|-----|-------|----|--------|--------|--------|
| 0 | SCN-01-001-4f6a5 | REJECT | 81.86 | 67.82 | 94.8 | 81.56 | 85.6 | 90.72 | 467 | 450803 | 0 | 0 | 4 |
| 1 | SCN-01-002-814b8 | REJECT | 86.28 | 85.99 | 92.8 | 75.94 | 89.93 | 83.02 | 377 | 470353 | 1 | 0 | 2 |
| 2 | SCN-01-003-1d966 | REJECT | 79.73 | 76.58 | 84 | 76.6 | 83.27 | 79.45 | 477 | 438988 | 1 | 0 | 9 |
| 3 | SCN-02-001-73012 | REJECT | 87.92 | 91.42 | 93.6 | 78.82 | 85 | 82.03 | 613 | 423918 | 1 | 0 | 8 |
| 4 | SCN-02-002-40813 | REJECT | 84.96 | 92.61 | 85.2 | 76.08 | 83.27 | 76.75 | 385 | 423644 | 0 | 0 | 6 |

## VERDICT

**PASS**

Critères satisfaits :
- Pas de crash ARM B
- Régression composite < 3 points (Δ = 1.12)
- Overhead latence < 20% (-5.17%)
- Retrieval Loom actif (dettes: 3, motifs: 29)
