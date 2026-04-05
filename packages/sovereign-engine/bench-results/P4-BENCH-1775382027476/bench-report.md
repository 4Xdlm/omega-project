# OMEGA Bench API P4 — Loom OFF vs ON

**Bench ID**: P4-BENCH-1775382027476
**Date**: 2026-04-05T11:28:19.618Z
**Golden run**: golden/e2e/run_001/runs/13535cccff86620f
**Scènes**: 7
**Modèle**: claude-sonnet-4-20250514

## Résumé

| Métrique | ARM A (OFF) | ARM B (ON) | Delta |
|----------|-------------|------------|-------|
| Composite moyen | 83.03 | 83.54 | 0.51 |
| ECC moyen | 81.12 | 77.18 | -3.94 |
| Temps moyen (ms) | 455086.71 | 469439.29 | 14352.57 |
| Continuity tokens | 125 | 123.71 | -1.29 |
| SEAL | 0 | 0 | — |
| Crashes | 0 | 0 | — |
| Overhead Loom | — | 3.15% | — |

## Loom Telemetry (ARM B)

| Métrique | Total |
|----------|-------|
| Dettes ouvertes | 10 |
| Dettes résolues | 8 |
| Motifs accumulés | 44 |

## Détail par scène

### ARM A — LOOM OFF

| # | Scene ID | Verdict | Comp | ECC | AAI | RCI | SII | IFI | Words | ms |
|---|----------|---------|------|-----|-----|-----|-----|-----|-------|----|
| 0 | SCN-01-001-4f6a5 | REJECT | 80.02 | 67.93 | 94.8 | 81.07 | 81.67 | 78.73 | 390 | 415160 |
| 1 | SCN-01-002-814b8 | REJECT | 83.65 | 84.38 | 94.8 | 81.24 | 60.73 | 91.84 | 456 | 440456 |
| 2 | SCN-01-003-1d966 | REJECT | 84.26 | 86.54 | 93.6 | 76.55 | 74.67 | 80.93 | 460 | 403151 |
| 3 | SCN-02-001-73012 | REJECT | 84.01 | 87.87 | 94.8 | 80.85 | 62.6 | 81.79 | 422 | 448354 |
| 4 | SCN-02-002-40813 | REJECT | 85.92 | 85.77 | 92.8 | 79.52 | 89.87 | 74.11 | 512 | 522078 |
| 5 | SCN-02-003-55c1b | REJECT | 83.37 | 86.36 | 92.8 | 81.28 | 63.87 | 82.76 | 538 | 501064 |
| 6 | SCN-02-004-d7f11 | REJECT | 79.95 | 69.02 | 94.8 | 79.93 | 80.6 | 77.99 | 395 | 455344 |

### ARM B — LOOM ON

| # | Scene ID | Verdict | Comp | ECC | AAI | RCI | SII | IFI | Words | ms | Debts+ | Debts- | Motifs |
|---|----------|---------|------|-----|-----|-----|-----|-----|-------|----|--------|--------|--------|
| 0 | SCN-01-001-4f6a5 | REJECT | 82.48 | 70.41 | 94.8 | 86.91 | 81.53 | 85.43 | 456 | 466158 | 2 | 0 | 5 |
| 1 | SCN-01-002-814b8 | REJECT | 79.98 | 66.19 | 94.8 | 79.61 | 83.93 | 83.15 | 464 | 451787 | 2 | 2 | 8 |
| 2 | SCN-01-003-1d966 | REJECT | 85.47 | 86.71 | 94.8 | 76.96 | 85.07 | 73.08 | 494 | 463358 | 1 | 1 | 6 |
| 3 | SCN-02-001-73012 | REJECT | 86.71 | 83.23 | 94.8 | 81.79 | 90.67 | 80.38 | 411 | 476368 | 0 | 0 | 5 |
| 4 | SCN-02-002-40813 | REJECT | 82.24 | 80.69 | 94.8 | 72.31 | 82.27 | 72.78 | 349 | 453224 | 1 | 1 | 4 |
| 5 | SCN-02-003-55c1b | REJECT | 85.87 | 80.11 | 94.8 | 80.66 | 89.8 | 85.55 | 405 | 474541 | 2 | 2 | 4 |
| 6 | SCN-02-004-d7f11 | REJECT | 82.04 | 72.94 | 94.8 | 74.42 | 89.2 | 82.36 | 475 | 500639 | 2 | 2 | 12 |

## VERDICT

**PASS**

Critères satisfaits :
- Pas de crash ARM B
- Régression composite < 3 points (Δ = 0.51)
- Overhead latence < 20% (3.15%)
- Retrieval Loom actif (dettes: 10, motifs: 44)
