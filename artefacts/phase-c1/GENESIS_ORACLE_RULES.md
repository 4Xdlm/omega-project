# OMEGA Genesis Planner — Oracle Rules
## Phase C.1 — Formal Validation Rules

---

### GRULE-001 — No Plan Without Validated Inputs
- **Invariant**: G-INV-01
- **Condition**: IF any of the 5 inputs (intent, canon, constraints, genome, emotion_target) is missing, null, or fails validation THEN verdict = FAIL
- **Pass**: All 5 inputs present and individually valid
- **Fail**: Intent with empty title → FAIL; Canon with zero entries → FAIL

### GRULE-002 — Justified Existence
- **Invariant**: G-INV-02
- **Condition**: IF any arc or scene has empty or missing `justification` field THEN verdict = FAIL
- **Pass**: Arc with justification "Primary arc: establishes isolation as core narrative driver" → PASS
- **Fail**: Arc with justification "" → FAIL

### GRULE-003 — Seed Must Have Bloom
- **Invariant**: G-INV-03
- **Condition**: IF any seed in seed_registry has `blooms_in` referencing a non-existent scene THEN verdict = FAIL
- **Pass**: Seed planted in SCN-01, blooms in SCN-03, both exist → PASS
- **Fail**: Seed blooms_in "SCN-99" which does not exist → FAIL

### GRULE-004 — Bloom Must Have Seed
- **Invariant**: G-INV-03
- **Condition**: IF any seed has `planted_in` referencing a non-existent scene THEN verdict = FAIL
- **Pass**: Seed planted_in SCN-01, scene exists → PASS
- **Fail**: Seed planted_in "NONEXIST" → FAIL

### GRULE-005 — Seed-Bloom Distance
- **Invariant**: G-INV-03
- **Condition**: IF distance(planted_in, blooms_in) > CONFIG:SEED_BLOOM_MAX_DISTANCE (0.7) THEN verdict = FAIL
- **Pass**: 10 scenes, seed at SCN-0, bloom at SCN-6, distance = 6/9 = 0.67 → PASS
- **Fail**: 10 scenes, seed at SCN-0, bloom at SCN-9, distance = 9/9 = 1.0 → FAIL

### GRULE-006 — Minimum Seeds
- **Invariant**: G-INV-03
- **Condition**: IF seed_registry.length < CONFIG:MIN_SEEDS (3) THEN verdict = FAIL
- **Pass**: 3 seeds → PASS
- **Fail**: 1 seed → FAIL

### GRULE-007 — No Tension Plateau
- **Invariant**: G-INV-04
- **Condition**: IF tension_curve has > CONFIG:MAX_TENSION_PLATEAU (3) consecutive equal values THEN verdict = FAIL
- **Pass**: [1, 2, 2, 3, 5] (plateau of 2 ≤ 3) → PASS
- **Fail**: [1, 3, 3, 3, 3] (plateau of 4 > 3) → FAIL

### GRULE-008 — No Tension Whiplash
- **Invariant**: G-INV-04
- **Condition**: IF any adjacent tension values differ by more than CONFIG:MAX_TENSION_DROP (3) downward THEN verdict = FAIL
- **Pass**: [5, 3] (drop of 2 ≤ 3) → PASS
- **Fail**: [10, 5] (drop of 5 > 3) → FAIL

### GRULE-009 — No Empty Scene
- **Invariant**: G-INV-05
- **Condition**: IF any scene has empty `conflict` or invalid `conflict_type` THEN verdict = FAIL
- **Pass**: Scene with conflict "Character faces internal struggle" → PASS
- **Fail**: Scene with conflict "" → FAIL

### GRULE-010 — Conflict Type Diversity
- **Invariant**: G-INV-05
- **Condition**: IF unique conflict types < CONFIG:MIN_CONFLICT_TYPES (2) THEN verdict = FAIL
- **Pass**: Scenes use "internal" and "external" → PASS
- **Fail**: All scenes use "internal" only → FAIL

### GRULE-011 — Emotion Coverage
- **Invariant**: G-INV-06
- **Condition**: IF emotion_trajectory.length < scene_count THEN verdict = FAIL
- **Pass**: 5 scenes, 5 emotion waypoints → PASS
- **Fail**: 5 scenes, 3 emotion waypoints → FAIL

### GRULE-012 — Determinism
- **Invariant**: G-INV-07
- **Condition**: IF same 5 inputs + same config + same timestamp produce different plan_hash on 2 runs THEN verdict = FAIL
- **Pass**: Run 1 hash = Run 2 hash → PASS
- **Fail**: Hashes differ → FAIL

### GRULE-013 — Structural Completeness
- **Invariant**: G-INV-08
- **Condition**: IF any arc has empty `progression` or empty `theme` THEN verdict = FAIL
- **Pass**: Arc with progression "Rising action through isolation" → PASS
- **Fail**: Arc with progression "" → FAIL

### GRULE-014 — Subtext Character Thinks
- **Invariant**: G-INV-09
- **Condition**: IF any scene has empty `subtext.character_thinks` THEN verdict = FAIL
- **Pass**: Scene with character_thinks "Worried about the light failing" → PASS
- **Fail**: Scene with character_thinks "" → FAIL

### GRULE-015 — Subtext Tension Type
- **Invariant**: G-INV-09
- **Condition**: IF any scene has invalid `subtext.tension_type` THEN verdict = FAIL
- **Pass**: tension_type = "dramatic_irony" → PASS
- **Fail**: tension_type = "invalid" → FAIL

### GRULE-016 — Subtext Implied Emotion
- **Invariant**: G-INV-09
- **Condition**: IF any scene has empty `subtext.implied_emotion` THEN verdict = FAIL
- **Pass**: implied_emotion = "fear" → PASS
- **Fail**: implied_emotion = "" → FAIL

### GRULE-017 — Evidence Chain Verifiable
- **Invariant**: G-INV-10
- **Condition**: IF recomputed chain_hash does not match stored chain_hash THEN verdict = FAIL
- **Pass**: Stored hash matches recomputed hash → PASS
- **Fail**: Hash mismatch → FAIL
