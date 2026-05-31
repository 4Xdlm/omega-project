# Dynamic Metrics (D1-D4)

Weight: 0.25 of global score.

Dynamic metrics compare runs against each other. Metrics with insufficient data
return `null` (SKIP) and their weight is redistributed to non-SKIP metrics.

## D1 — intra_intent_stability (weight: 0.35)

**Formula**: `plan_hash(run) === plan_hash(replay) ? 1.0 : 0.0`

**HARD FAIL** if `< 0.999`.

Compares a run against its cache replay (same intent, same seed).
Byte-identical plans → 1.0. Any difference → 0.0.

SKIP if no replay run is available.

## D2 — inter_intent_variance (weight: 0.25)

**Formula**: Sum of 4 criteria (0.25 each):
- Different plan hashes: +0.25
- Different arc themes: +0.25
- Different scene count: +0.25
- Different final emotion: +0.25

Compares two runs from different intents. Must show structural differences.
Expected score for genuinely different intents: ≥ 0.5.

SKIP if only one run is available.

## D3 — variant_sensitivity (weight: 0.20)

**Formula**: Not yet implemented.

Will compare baseline vs variant of same intent with modifications.
Currently always returns SKIP.

## D4 — noise_floor_ratio (weight: 0.20)

**Formula**: `1.0 - (noise_distance / signal_distance)`

Where:
- signal_distance = planDistance(run_001, run_002) — different intents
- noise_distance = planDistance(run, replay) — same intent

planDistance counts differing fields (scene_count, beat_count, arc_count, plan_hash)
normalized by total fields.

A high score (→ 1.0) means noise is negligible compared to signal.
A low score (→ 0.0) means too much unexplained variance.

SKIP if insufficient data.

## Weight Redistribution (SKIP)

When a metric is SKIP, its weight is redistributed proportionally:

Example: D3 SKIP (0.20) with D1 (0.35), D2 (0.25), D4 (0.20) active:
- D1 effective weight: 0.35 / (0.35+0.25+0.20) = 0.4375
- D2 effective weight: 0.25 / (0.35+0.25+0.20) = 0.3125
- D4 effective weight: 0.20 / (0.35+0.25+0.20) = 0.2500
