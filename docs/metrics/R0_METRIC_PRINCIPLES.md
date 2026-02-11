# R0 — Metric Principles

## Purpose

OMEGA Metrics measures narrative plan quality **objectively and deterministically**.
It serves as the quality gate before P.2-SCRIBE (prose generation).

**Without metrics, no prose.**

## Design Principles

### 1. Objectivity (INV-RM-01)
Every metric is computed by a deterministic algorithm. No NLP opinion analysis, no sentiment scoring, no subjective evaluation. Each formula is documented and reproducible.

### 2. Determinism (INV-RM-02)
Same artifacts → same scores → same report hash. No `Date.now()`, no `Math.random()`, no async non-determinism. Timestamps are passed as parameters.

### 3. Offline-Only (INV-RM-03, INV-RM-06)
All inputs are JSON artifacts on disk. Zero network calls, zero API dependencies. The system works air-gapped.

### 4. Documented Thresholds (INV-RM-04)
Every threshold is justified and stored in `GLOBAL_THRESHOLDS.json`. Thresholds are calibrated against golden runs.

### 5. Bounded Scores (INV-RM-05)
All metric scores ∈ [0, 1]. The global score is a weighted average with hard fail overrides.

## Metric Categories

| Category | Weight | Count | Focus |
|----------|--------|-------|-------|
| Structural | 0.40 | 8 (S1-S8) | Plan completeness, integrity, diversity |
| Semantic | 0.35 | 5 (M1-M5) | Intent alignment, canon respect, constraints |
| Dynamic | 0.25 | 4 (D1-D4) | Cross-run stability, variance, sensitivity |

## Hard Fails

Two conditions cause automatic FAIL regardless of global score:
- `canon_violation_count > 0` — Canon must never be contradicted
- `intra_intent_stability < 0.999` — Same input must produce same output

## Standards Alignment

- NASA-Grade L4 / DO-178C Level A
- Full traceability from metric → formula → evidence
- Non-regression: scores can only improve across sprints
