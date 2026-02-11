# Semantic Metrics (M1-M5)

Weight: 0.35 of global score.

## M1 — intent_theme_coverage (weight: 0.20)

**Formula**: `covered_themes / total_intent_themes`

For each theme in `intent.themes[]`, checks if any `arc.theme` contains it
(case-insensitive, bidirectional substring match).

Returns 1.0 if intent has no themes.

## M2 — theme_fidelity (weight: 0.15)

**Formula**: Jaccard coefficient = `|A ∩ B| / |A ∪ B|`

Set A: tokenized keywords from `intent.themes[]`
Set B: tokenized keywords from `arc.theme` + `arc.progression`

Tokenization: lowercase, remove non-alpha, filter words > 2 chars, remove stop-words
(English + French stop-word list).

## M3 — canon_respect (weight: 0.25)

**Formula**: `1.0 - (violations / total_canon_entries)`

**HARD FAIL** if `canon_violation_count > 0`.

Heuristic: for each canon entry, extracts keywords (> 3 chars, non stop-words)
and searches all plan descriptions for negation patterns:
`"not " + keyword`, `"no " + keyword`, `"never " + keyword`,
`"without " + keyword`, `"impossible " + keyword`

Searched text: arc.progression, scene.objective, scene.conflict, beat.action

This is deliberately conservative — only detects explicit negations, not semantic contradictions.

## M4 — emotion_trajectory_alignment (weight: 0.20)

**Formula**: `resolution_score (0.4) + waypoint_score (0.6)`

Resolution: checks if plan's final emotion matches `intent.emotion.resolution_emotion`.
Match = +0.4.

Waypoints: for each `intent.emotion.waypoints[]`, finds closest trajectory point
within position tolerance (0.15) with matching emotion.
Score = `(waypoints_hit / total_waypoints) × 0.6`

Returns 0 if plan has no emotion_trajectory.

## M5 — constraint_satisfaction (weight: 0.20)

**Formula**: `passed_constraints / verifiable_constraints`

Checks:
- C1: `plan.scene_count ∈ [constraints.min_scenes, constraints.max_scenes]`
- C2: `constraints.banned_words` absent from all descriptions (case-insensitive)
- C3: `constraints.banned_topics` absent from themes and objectives

Returns 1.0 if no constraints are verifiable.
