# Structural Metrics (S1-S8)

Weight: 0.40 of global score.

## S1 — arc_completeness (weight: 0.15)

**Formula**: `complete_arcs / total_arcs`

An arc is complete if all 5 required fields are present and non-empty:
`arc_id`, `theme`, `progression`, `justification`, `scenes[]`

## S2 — scene_completeness (weight: 0.15)

**Formula**: `complete_scenes / total_scenes`

A scene is complete if all required fields are present:
`scene_id`, `arc_id`, `objective`, `conflict`, `conflict_type`, `emotion_target`,
`emotion_intensity ∈ [0,1]`, `beats[] non-empty`, `target_word_count > 0`,
`sensory_anchor non-empty`, `subtext.character_thinks ≠ "__pending__"`,
`subtext.implied_emotion ≠ "__pending__"`

## S3 — beat_coverage (weight: 0.12)

**Formula**: `scenes_in_range / total_scenes`

Each scene must have beats count ∈ [MIN_BEATS_PER_SCENE, MAX_BEATS_PER_SCENE].
Default config: [2, 12].

## S4 — seed_integrity (weight: 0.12)

**Formula**: `valid_seeds / total_seeds`

A seed is valid if:
- `planted_in` references an existing scene
- `blooms_in` references an existing scene
- `blooms_in` is AFTER `planted_in` in scene order
- Normalized distance ≤ SEED_BLOOM_MAX_DISTANCE (0.7)

Returns 0 if no seeds exist.

## S5 — tension_monotonicity (weight: 0.12)

**Formula**: `conditions_met / 3`

Three conditions checked on `tension_curve[]`:
1. No plateau > MAX_TENSION_PLATEAU (3 consecutive equal values)
2. No drop > MAX_TENSION_DROP (3 units between adjacent values)
3. Ascending trend (last value > first value)

## S6 — conflict_diversity (weight: 0.10)

**Formula**: `min(unique_types / MIN_CONFLICT_TYPES, 1.0)`

Counts unique `conflict_type` values across all scenes.
Valid types: internal, external, relational, societal, existential.
MIN_CONFLICT_TYPES = 2.

## S7 — causal_depth (weight: 0.12)

**Formula**: `min(longest_path / total_scenes, 1.0)`

Builds a directed graph from:
- Seed links: planted_in → blooms_in
- Sequential links: consecutive scenes within an arc

Finds the longest path via DFS.

## S8 — structural_entropy (weight: 0.12)

**Formula**: `H / log2(N)` (normalized Shannon entropy)

Where H = -Σ(p_i × log2(p_i)) over conflict type frequencies.
N = 5 (number of valid conflict types).
Returns 0 for single-type or empty plans.
