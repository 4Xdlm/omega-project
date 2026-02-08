# OMEGA Creation Pipeline -- E2E Test Scenarios
**Phase**: C.4 | **Standard**: NASA-Grade L4 / DO-178C Level A
**Fixture source**: `tests/fixtures.ts`

---

## Overview

Phase C.4 defines 3 End-to-End test scenarios of increasing complexity. Each scenario provides a complete `IntentPack` (intent, canon, constraints, genome, emotion) that drives the full creation pipeline: F0 (Validate) -> F1 (Genesis) -> F2 (Scribe) -> F3 (Style) -> F4 (Unified Gates) -> F5 (Evidence) -> F6 (Proof-Pack) -> F7 (Report).

All scenarios use a deterministic timestamp: `2026-02-08T00:00:00.000Z`.

---

## Scenario A -- "Le Gardien"

| Property | Value |
|----------|-------|
| **Pack ID** | `PACK-A-001` |
| **Title** | Le Gardien |
| **Genre** | Horror / Adult literary fiction |
| **Target word count** | 5,000 |
| **Canon entries** | 5 |
| **Emotion waypoints** | 5 (4 unique emotions) |
| **Author** | Francky |

### Intent

A lighthouse keeper discovers the light keeps something in the deep ocean asleep. The core message: "Some truths are better left in darkness."

- **Premise**: A lighthouse keeper discovers the light keeps something in the deep ocean asleep.
- **Themes**: isolation, duty, forbidden knowledge
- **Core emotion**: fear
- **Target audience**: adult literary fiction

### Canon Summary

| ID | Category | Statement |
|----|----------|-----------|
| CANON-001 | world | Lighthouse on remote island, 200km from mainland |
| CANON-002 | character | Keeper Elias has been alone for 3 years |
| CANON-003 | rule | The light must never go out |
| CANON-004 | event | Previous keepers disappeared without explanation |
| CANON-005 | world | Ocean around island is abnormally deep |

All entries are immutable.

### Constraints

- **POV**: third-limited
- **Tense**: past
- **Banned words**: suddenly, literally, basically
- **Max dialogue ratio**: 0.1
- **Min sensory anchors per scene**: 2
- **Scene count**: 4-8
- **Forbidden cliches**: "dark and stormy night", "heart pounding", "blood ran cold"

### Genome Targets

| Axis | Target |
|------|--------|
| Burstiness | 0.7 |
| Lexical richness | 0.8 |
| Avg sentence length | 15 words |
| Dialogue ratio | 0.1 |
| Description density | 0.6 |
| Signature traits | concrete imagery, short declarative cuts, sensory immersion, parataxis |

### Emotion Targets

| Position | Emotion | Intensity |
|----------|---------|-----------|
| 0.0 | trust | 0.3 |
| 0.3 | anticipation | 0.5 |
| 0.5 | fear | 0.6 |
| 0.8 | fear | 0.9 |
| 1.0 | sadness | 0.7 |

- **Arc emotion**: fear
- **Climax position**: 0.8
- **Resolution emotion**: sadness
- **Unique emotions to detect**: trust, anticipation, fear, sadness (4 unique)

### Expected Pipeline Behavior

- **U_TRUTH**: PASS -- 5 canon entries provide sufficient vocabulary for a 5,000-word text. The plan expands themes (isolation, duty, forbidden knowledge) into arcs, scenes, and beats that further enlarge the known-word set. The 10% paragraph-level threshold should be met comfortably.
- **U_NECESSITY**: PASS -- With a moderate word count and focused theme set, each paragraph should contribute distinct vocabulary. The horror genre naturally avoids repetitive filler.
- **U_CROSSREF**: PASS -- Proper nouns (Elias, etc.) are defined in canon. The confined setting (lighthouse, island) limits the introduction of orphan names.
- **U_BANALITY**: PASS -- Three banned words and three forbidden cliches to avoid. The IA pattern list applies universally. The scribe and style engines should produce clean output.
- **U_STYLE**: PASS -- High burstiness (0.7) and lexical richness (0.8) targets. Short sentence lengths (15 avg). Genome deviation should stay within 0.25 tolerance.
- **U_EMOTION**: PASS -- 4 unique target emotions (trust, anticipation, fear, sadness). Keyword matching should detect at least 2 (50%) given the horror genre.
- **U_DISCOMFORT**: PASS -- Horror genre naturally produces friction markers. Fear, dark, tension, threat are expected throughout.
- **U_QUALITY**: PASS -- Information density should exceed 0.15 with high lexical richness target. Average sentence length of 15 is well under the 35-word cap.

---

## Scenario B -- "Le Choix"

| Property | Value |
|----------|-------|
| **Pack ID** | `PACK-B-001` |
| **Title** | Le Choix |
| **Genre** | Minimal / General |
| **Target word count** | 1,000 |
| **Canon entries** | 1 |
| **Emotion waypoints** | 2 (2 unique emotions) |
| **Author** | Francky |

### Intent

A woman must choose between two doors. The core message: "Every choice is a death."

- **Premise**: A woman must choose between two doors
- **Themes**: choice
- **Core emotion**: anticipation
- **Target audience**: general

### Canon Summary

| ID | Category | Statement |
|----|----------|-----------|
| CANON-001 | world | Two doors in a white room |

Single immutable entry. Minimal world-building.

### Constraints

- **POV**: first
- **Tense**: present
- **Banned words**: (none)
- **Max dialogue ratio**: 0.0 (no dialogue)
- **Min sensory anchors per scene**: 1
- **Scene count**: 2-4
- **Forbidden cliches**: (none)

### Genome Targets

| Axis | Target |
|------|--------|
| Burstiness | 0.5 |
| Lexical richness | 0.5 |
| Avg sentence length | 10 words |
| Dialogue ratio | 0.0 |
| Description density | 0.5 |
| Signature traits | minimalist |

### Emotion Targets

| Position | Emotion | Intensity |
|----------|---------|-----------|
| 0.0 | anticipation | 0.3 |
| 1.0 | sadness | 0.6 |

- **Arc emotion**: anticipation
- **Climax position**: 0.7
- **Resolution emotion**: sadness
- **Unique emotions to detect**: anticipation, sadness (2 unique)

### Expected Pipeline Behavior

- **U_TRUTH**: PASS -- Only 1 canon entry, but the plan/intent expansion (themes, premise, message) provides additional vocabulary. With very short text (1,000 words), the known-word set from plan expansion should cover paragraph vocabulary at the 10% threshold.
- **U_NECESSITY**: Boundary case -- With only 1,000 words across few paragraphs, each paragraph's unique word contribution matters. Paragraphs that repeat the limited vocabulary may be flagged as removable. This scenario tests the ablation gate at its limits.
- **U_CROSSREF**: PASS -- Minimal setting (white room, two doors) produces few proper nouns. Orphan count should stay well under 5.
- **U_BANALITY**: PASS -- No banned words or forbidden cliches configured. Only the 31 universal IA patterns apply.
- **U_STYLE**: PASS -- Moderate genome targets (0.5 across axes). Short sentence length (10 avg). Low deviation expected with minimalist style.
- **U_EMOTION**: PASS -- Only 2 unique emotions needed (anticipation, sadness). 50% threshold means detecting just 1 suffices. Both are common enough to appear via keyword matching.
- **U_DISCOMFORT**: Boundary case -- Minimalist text with a single theme (choice). Friction may be limited, but markers like "but", "yet", "uncertain", "doubt" should appear in internal-monologue-style text.
- **U_QUALITY**: PASS -- Short sentences (10 avg) well under 35-word cap. Information density should be adequate with moderate lexical richness. Paragraphs should exceed the 5-word minimum.

---

## Scenario C -- "The Fracture of Meridian"

| Property | Value |
|----------|-------|
| **Pack ID** | `PACK-C-001` |
| **Title** | The Fracture of Meridian |
| **Genre** | Complex speculative fiction / Adult |
| **Target word count** | 100,000 |
| **Canon entries** | 21 |
| **Emotion waypoints** | 10 (8 unique emotions) |
| **Author** | Francky |

### Intent

A civilization built on suppressed memories discovers that their entire history is fabricated by a sentient archive that feeds on cognitive dissonance, and the only way to free themselves is to remember what they chose to forget, but remembering will destroy the archive and with it all knowledge they ever had. The core message: "Freedom requires the courage to lose everything you know."

- **Premise**: Full-length speculative fiction premise involving memory suppression, sentient archives, and civilizational truth.
- **Themes**: memory, identity, truth, sacrifice, collective consciousness, technological hubris, freedom, loss (8 themes)
- **Core emotion**: fear
- **Target audience**: adult speculative fiction

### Canon Summary

| ID | Category | Statement |
|----|----------|-----------|
| C-CANON-001 | world | Meridian is a city-state of 10 million inhabitants |
| C-CANON-002 | world | The Archive is a sentient crystalline structure beneath the city |
| C-CANON-003 | character | Kael is a memory archaeologist, age 34 |
| C-CANON-004 | character | Vesper is the Archive keeper, age unknown |
| C-CANON-005 | character | Lira is Kael resistance contact, age 28 |
| C-CANON-006 | rule | Accessing suppressed memories causes physical pain |
| C-CANON-007 | rule | The Archive rewrites memories every 7 years |
| C-CANON-008 | event | The Great Forgetting happened 49 years ago (7 cycles) |
| C-CANON-009 | relationship | Kael and Vesper were siblings before memory suppression |
| C-CANON-010 | world | Memory crystals grow in fractal patterns |
| C-CANON-011 | character | The Collective is a hive-mind of recovered memories |
| C-CANON-012 | event | Three previous attempts to destroy the Archive all failed |
| C-CANON-013 | rule | Complete memory recovery is irreversible |
| C-CANON-014 | world | The city has 7 districts, each representing a memory layer |
| C-CANON-015 | relationship | Lira was memory-bonded to Kael in a previous cycle |
| C-CANON-016 | character | Elder Mara remembers fragments from before the Great Forgetting |
| C-CANON-017 | event | The Archive pulse happens at midnight, reinforcing suppression |
| C-CANON-018 | rule | Memory recovery spreads through physical contact |
| C-CANON-019 | world | Outside Meridian is the Blanklands -- erased territory |
| C-CANON-020 | relationship | Vesper chose to become the Archive keeper voluntarily |
| C-CANON-021 | event | Kael found a pre-Forgetting journal in the ruins |

All 21 entries are immutable. Categories span: 5 world, 5 character, 4 rule, 4 event, 3 relationship.

### Constraints

- **POV**: third-omniscient
- **Tense**: past
- **Banned words**: suddenly, literally, basically, very, really, just, quite (7 words)
- **Banned topics**: gratuitous violence, sexual content
- **Max dialogue ratio**: 0.4
- **Min sensory anchors per scene**: 3
- **Scene count**: exactly 3
- **Forbidden cliches**: "chosen one", "dark lord", "prophecy fulfilled", "love at first sight"

### Genome Targets

| Axis | Target |
|------|--------|
| Burstiness | 0.99 |
| Lexical richness | 0.99 |
| Avg sentence length | 22 words |
| Dialogue ratio | 0.35 |
| Description density | 0.7 |
| Signature traits | recursive metaphor, unreliable narrator, temporal fragmentation, synesthetic description, stream of consciousness, parallel structure |

### Emotion Targets

| Position | Emotion | Intensity |
|----------|---------|-----------|
| 0.0 | trust | 0.2 |
| 0.1 | anticipation | 0.4 |
| 0.2 | surprise | 0.6 |
| 0.3 | fear | 0.5 |
| 0.4 | anger | 0.7 |
| 0.5 | sadness | 0.6 |
| 0.6 | disgust | 0.8 |
| 0.7 | fear | 0.9 |
| 0.8 | anger | 0.95 |
| 1.0 | hope | 0.5 |

- **Arc emotion**: fear
- **Climax position**: 0.8
- **Resolution emotion**: hope
- **Unique emotions to detect**: trust, anticipation, surprise, fear, anger, sadness, disgust, hope (8 unique)

### Expected Pipeline Behavior

- **U_TRUTH**: PASS -- 21 canon entries across 5 categories provide a rich vocabulary base. 8 themes further expand the known-word set. With the genesis plan expanding into arcs, scenes, beats, and seeds, the vocabulary coverage should be extensive. The 10% paragraph-level threshold should be met.
- **U_NECESSITY**: Stress test -- 100,000 target words produce a large paragraph set. With 21 canon entries and 8 themes, the vocabulary pool is large, but the ablation gate must verify each paragraph contributes unique words. Repetition risk increases at scale. This scenario tests whether the scribe engine avoids redundancy across a long text.
- **U_CROSSREF**: Boundary case -- Multiple character names (Kael, Vesper, Lira, Mara) and location names (Meridian, Blanklands) must all resolve. With 21 canon entries and a complex plan, the reference set is rich but the generated text may introduce additional proper nouns (district names, etc.). The 5-orphan tolerance provides buffer.
- **U_BANALITY**: Stress test -- 7 banned words (including common fillers: very, really, just, quite) and 4 forbidden cliches. At 100,000 words, the probability of a banned word slipping through is high. This scenario tests the scribe and style engines' ability to avoid common words at scale. The 31 IA patterns must also be avoided across a very long text.
- **U_STYLE**: Boundary case -- Extreme genome targets (0.99 burstiness, 0.99 lexical richness). The style engine must maintain near-maximum variation across 100,000 words. Deviation tolerance is 0.25, so actual burstiness must be >= 0.74 and lexical richness must be >= 0.74. IA detection must stay < 0.3 despite 6 complex signature traits.
- **U_EMOTION**: PASS -- 8 unique emotions required, 50% threshold means at least 4 must be detected. With 10 waypoints spanning the full emotional spectrum and a long text, keyword matching should find most emotions. Fear, anger, sadness, and hope are particularly likely given the narrative premise.
- **U_DISCOMFORT**: PASS -- The premise involves conflict, suppression, pain, and resistance. The text should be saturated with friction markers. Even with only 3 scenes, each scene segment (spanning thousands of paragraphs) will contain multiple markers.
- **U_QUALITY**: Boundary case -- At 100,000 words, information density (unique/total) naturally decreases. The 0.15 threshold requires that at least 15% of all words are unique. With 0.99 lexical richness target, the style engine should maintain high diversity. Average sentence length of 22 words is within the 35-word cap. Paragraph minimum of 5 words should not be an issue.

---

## Scenario Comparison Matrix

| Dimension | Scenario A | Scenario B | Scenario C |
|-----------|-----------|-----------|-----------|
| **Title** | Le Gardien | Le Choix | The Fracture of Meridian |
| **Genre** | Horror | Minimal | Speculative fiction |
| **Word count** | 5,000 | 1,000 | 100,000 |
| **Canon entries** | 5 | 1 | 21 |
| **Themes** | 3 | 1 | 8 |
| **Unique emotions** | 4 | 2 | 8 |
| **Waypoints** | 5 | 2 | 10 |
| **Banned words** | 3 | 0 | 7 |
| **Forbidden cliches** | 3 | 0 | 4 |
| **Scene range** | 4-8 | 2-4 | 3 (exact) |
| **POV** | third-limited | first | third-omniscient |
| **Tense** | past | present | past |
| **Burstiness target** | 0.7 | 0.5 | 0.99 |
| **Lexical richness** | 0.8 | 0.5 | 0.99 |
| **Signature traits** | 4 | 1 | 6 |
| **Test profile** | Standard | Minimal/Boundary | Stress/XL |

---

## Test Coverage Intent

- **Scenario A** validates the standard happy path: moderate complexity, balanced constraints, focused narrative.
- **Scenario B** tests boundary conditions: minimal input, single canon entry, no banned words, minimal emotion targets. Probes whether gates handle sparse data gracefully.
- **Scenario C** stress-tests all gates at scale: maximum canon density, extreme genome targets, large word count, 8 unique emotions, 7 banned words. Designed to expose regressions in ablation performance, vocabulary coverage, and IA pattern avoidance under heavy load.

---

**Standard**: NASA-Grade L4 / DO-178C Level A
**Author**: OMEGA Phase C.4
