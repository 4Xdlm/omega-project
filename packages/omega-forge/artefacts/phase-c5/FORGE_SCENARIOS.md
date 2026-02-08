# OMEGA Forge — E2E Test Scenarios

## Scenario A: "Le Gardien" (Standard)

**Intent**: Horror, lighthouse keeper, ocean depth
**Canon**: 5 entries (world, character, rule, event)
**Constraints**: third-limited/past, 4-8 scenes
**Genome**: burstiness 0.7, lexical 0.8, sentence length 15
**Emotion**: trust(0.3) -> anticipation(0.5) -> fear(0.6) -> fear(0.9) -> sadness(0.7)
**Climax**: position 0.8 (peak fear)

**Expected Forge Behavior**:
- Trajectory: emotion curve follows fear arc with rising intensity
- Law 1: most transitions justified by narrative beats
- Law 4: dissipation between fear peaks follows organic decay
- Quality: high canon compliance (lighthouse, keeper, light, ocean, deep)
- Prescriptions: moderate count, mostly trajectory alignment

## Scenario B: "Le Choix" (Minimal)

**Intent**: Minimal, two doors, choice
**Canon**: 1 entry (white room, two doors)
**Constraints**: first/present, 2-4 scenes
**Genome**: burstiness 0.5, lexical 0.5, sentence length 10
**Emotion**: anticipation(0.3) -> sadness(0.6)
**Climax**: position 0.7

**Expected Forge Behavior**:
- Trajectory: simple ascending anticipation to sadness
- Law 1: fewer transitions to verify
- Quality: minimal canon to reference
- Prescriptions: fewer due to simpler structure
- Dead zones: possible in minimal text

## Scenario C: "The Fracture of Meridian" (Complex)

**Intent**: Speculative fiction, suppressed memories, 100k words
**Canon**: 21 entries (extensive world/character/rule/event)
**Constraints**: third-omniscient/past, exactly 3 scenes
**Genome**: burstiness 0.99, lexical 0.99
**Emotion**: 10 waypoints (trust -> anticipation -> surprise -> fear -> anger -> sadness -> disgust -> fear -> anger -> hope)
**Climax**: position 0.8 (peak anger)

**Expected Forge Behavior**:
- Trajectory: complex multi-emotion curve with many transitions
- Law 1: high force required for frequent emotional shifts
- Law 4: multiple decay segments with varying zeta regimes
- Law 5: large flux conservation accounting
- Quality: many canon refs to verify, high complexity
- Prescriptions: higher count due to complexity
- Dead zones: possible during extended segments

## Comparison Matrix

| Dimension | A (Standard) | B (Minimal) | C (Complex) |
|-----------|-------------|-------------|-------------|
| Paragraphs | ~20 | ~5 | ~100+ |
| Canon entries | 5 | 1 | 21 |
| Emotion waypoints | 5 | 2 | 10 |
| Expected transitions | ~19 | ~4 | ~100+ |
| Complexity | Medium | Low | High |
| Decay segments | ~3 | ~1 | ~10+ |
