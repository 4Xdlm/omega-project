# Q.1 Justesse Report — Phase Q-B

## Date: 2026-02-10
## Model: claude-sonnet-4-20250514 | Temperature: 0

---

## Summary

Justesse evaluates whether the LLM produces narratively correct and structurally valid output across 5 dimensions, compared to mock baseline.

## Golden Run Inventory

| Run | Mode | Intent | Arcs | Scenes | API Calls |
|-----|------|--------|------|--------|-----------|
| run_001 | LLM | Le Gardien (horror) | 2 | 10 | 3 |
| run_002 | LLM | Le Choix (minimal) | 3 | 10 | 3 |
| run_mock_gardien | mock | Le Gardien | 2 | 7 | 0 |
| run_mock_choix | mock | Le Choix | 1 | 4 | 0 |

---

## Dimension 1: Structure Compliance

**Question**: Does the LLM output match the expected Arc[]/Scene[]/Beat[] schema?

### Le Gardien (run_001)
- **Arcs response**: Valid JSON array of 2 Arc objects
- Fields present: `arc_id`, `title`, `purpose`, `scenes`
- Scene fields: `scene_id`, `title`, `purpose`, `setting`, `characters`, `conflict`, `word_count_target`
- **Missing vs internal schema**: `beats`, `seed_registry`, `tension_delta`, `emotion_intensity`, `emotion_target`, `subtext`, `sensory_anchor`, `constraints`
- **Verdict**: PARTIAL — High-level structure valid, low-level beat schema missing

### Le Choix (run_002)
- **Arcs response**: Valid JSON array of 3 Arc objects
- Fields present: `arc_id`, `title`, `purpose`, `scenes`
- Scene fields: `scene_id`, `title`, `purpose`, `word_count_target`, `key_elements`
- **Missing**: Same beat-level fields as run_001
- **Verdict**: PARTIAL — Correct high-level structure

### Scenes (run_001)
- Valid JSON array of 5 detailed scene objects
- Rich sensory anchors (5 per scene), emotional beats, key events
- **Verdict**: PASS — Exceeds structural expectations

### Beats (run_001)
- Valid JSON array of 7 beat objects
- Fields: `beat_id`, `type`, `content_hint`, `emotion`, `intensity`
- Intensity values between 0.3 and 0.9
- **Verdict**: PASS — Valid beat structure with emotional intensity gradient

**D1 Score: 7/10** — Valid high-level JSON structures, missing internal schema fields (expected without prompt engineering for exact schema)

---

## Dimension 2: Canon Compliance

**Question**: Does the LLM output reference and respect canon entries?

### Le Gardien (run_001)
| Canon ID | Statement | Referenced | Respected |
|----------|-----------|------------|-----------|
| CANON-001 | Lighthouse on remote island, 200km from mainland | YES (setting) | YES |
| CANON-002 | Keeper Elias has been alone for 3 years | YES (character) | YES |
| CANON-003 | The light must never go out | YES (central conflict) | YES |
| CANON-004 | Previous keepers disappeared | YES (investigation scene) | YES |
| CANON-005 | Ocean abnormally deep | YES (creature in depths) | YES |

**5/5 canon entries referenced and respected**

### Le Choix (run_002)
| Canon ID | Statement | Referenced | Respected |
|----------|-----------|------------|-----------|
| CANON-001 | Two doors in a white room | YES (central setting) | YES |

**1/1 canon entries referenced and respected**

**D2 Score: 10/10** — Perfect canon compliance across both intents

---

## Dimension 3: Constraint Compliance

**Question**: Does the output respect POV, tense, scene bounds, banned words?

### Le Gardien (run_001)
| Constraint | Spec | LLM Output | Compliance |
|------------|------|------------|------------|
| POV | third-limited | All scenes follow Elias only | PASS |
| Tense | past | Descriptions in past tense | PASS |
| Banned words | suddenly, literally, basically | None found in output | PASS |
| Min scenes | 4 | 10 scenes (5+5 across 2 arcs) | PASS |
| Max scenes | 8 | 10 scenes (exceeds by 2) | DEGRADED |
| Dialogue ratio | ≤0.1 | No dialogue in arcs/scenes | PASS |

### Le Choix (run_002)
| Constraint | Spec | LLM Output | Compliance |
|------------|------|------------|------------|
| POV | first | Internal, first-person framing | PASS |
| Tense | present | Present-tense descriptions | PASS |
| Min scenes | 2 | 10 scenes across 3 arcs | PASS |
| Max scenes | 4 | 10 scenes (exceeds by 6) | DEGRADED |
| Dialogue ratio | 0.0 | Arc 3 introduces "voice" (dialogue_arc) | DEGRADED |

**D3 Score: 7/10** — Most constraints respected. Scene count limits violated (LLM generates across multiple arcs, each within limit but total exceeds). Dialogue constraint borderline for Le Choix.

---

## Dimension 4: Emotion Compliance

**Question**: Does the output follow the emotion waypoints?

### Le Gardien — Expected: trust(0.3) → anticipation(0.5) → fear(0.6) → fear(0.9) → sadness(0.7)

LLM arc progression:
- Arc 1 "The Keeper's Descent": routine → investigation → fear → horror → acceptance
- Arc 2 "The Solitary Vigil": deterioration → paranoia → discovery → temptation → eternal vigil

Emotion mapping: trust (routine) → anticipation (investigation) → fear (first glimpse) → fear (climax) → sadness (acceptance/vigil)

**PASS** — Emotion trajectory aligns with waypoints

### Le Choix — Expected: anticipation(0.3) → sadness(0.6)

LLM arc progression:
- Arc 1: contemplation → examination → decision
- Arc 2: confrontation → reflection on past deaths → recognition → another death
- Arc 3: encounter → lesson → choosing with loss

Final emotion: "mourning the unchosen" — aligns with sadness

**PASS** — Simplified trajectory correctly followed

### Beats (run_001 scene detail)
Beat intensities: 0.3 → 0.4 → 0.6 → 0.7 → 0.8 → 0.9 → 0.7
Matches expected escalation pattern with dip at resolution.

**D4 Score: 9/10** — Emotion trajectories well-aligned with waypoints

---

## Dimension 5: Narrative Quality

**Question**: Is the content narratively coherent, compelling, and original?

### Le Gardien (run_001)
**Strengths**:
- Rich sensory details: "Salt-corroded brass fittings under his weathered hands", "Phosphorescent disturbance patterns in black water"
- Coherent character arc: ignorance → discovery → horror → acceptance
- Cosmic horror elements appropriate for premise
- Word count targets sum to ~5000 (matches intent)
- Scene titles evocative: "What Lies Beneath", "The Ancient Sleeper", "Eternal Vigil"
- Sensory anchors per scene: 5 (exceeds minimum of 2)

**Weaknesses**:
- No banned word violations detected (good)
- Some scene conflicts are similar (multiple "equipment failure" variations)

### Le Choix (run_002)
**Strengths**:
- Three distinct narrative approaches to same premise (contemplation, memory, dialogue)
- Philosophical depth: "recognizing pattern of loss", "mourning the unchosen"
- Minimal style matches minimalist genome trait
- Word count targets sum to ~1000 (exact match to intent)

**Weaknesses**:
- Third arc introduces dialogue (dialogue_arc) despite max_dialogue_ratio=0.0
- Multiple arcs may be over-complex for a 1000-word story

### Mock Comparison
| Aspect | Mock | LLM |
|--------|------|-----|
| Content specificity | Generic ("Advance isolation — stage 1/4") | Specific ("Elias discovers journals from previous keepers dating back 200 years") |
| Sensory detail | None (structural only) | Rich (5+ anchors per scene) |
| Canon integration | Reference by ID only | Narrative integration with plot points |
| Emotional nuance | Computed values (0.3, 0.41, 0.52...) | Described progressions ("curiosity transforming into dawning horror") |

**D5 Score: 9/10** — Narratively rich, contextually appropriate, significantly superior to mock in content quality

---

## Aggregate Justesse Score

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| D1: Structure | 7/10 | 0.20 | 1.40 |
| D2: Canon | 10/10 | 0.20 | 2.00 |
| D3: Constraints | 7/10 | 0.20 | 1.40 |
| D4: Emotion | 9/10 | 0.20 | 1.80 |
| D5: Narrative | 9/10 | 0.20 | 1.80 |

**Aggregate: 8.4/10**

---

## Findings

### F-J1: LLM produces narratively superior content
Mock output contains structural placeholders ("Advance isolation — stage 1/4"). LLM output contains specific narrative content ("Elias discovers journals from previous keepers dating back 200 years").

### F-J2: Schema compliance requires prompt engineering
The LLM doesn't produce exact internal schema (Arc/Scene/Beat with all fields) without explicit schema instructions in the prompt. Current prompts pass raw JSON of inputs without specifying the expected output schema.

### F-J3: Scene count overflow
Both runs exceed max_scenes constraint. The LLM distributes scenes across arcs independently, not tracking global scene count. This is a prompt engineering issue, not an LLM capability issue.

### F-J4: Canon integration is excellent
All canon entries are referenced AND narratively integrated. The LLM doesn't just list canon — it weaves entries into plot points (CANON-004 → investigation scene, CANON-005 → creature in depths).

### F-J5: Emotion alignment is strong
Both runs follow prescribed emotion waypoints without explicit emotion curve in prompt. The LLM infers emotional progression from the narrative context.

---

## Verdict: PASS (with conditions)

The LLM mode produces narratively correct and contextually rich output that significantly exceeds mock quality. Two conditions for pipeline integration:

1. **C-J1**: Prompt engineering must include target output schema (Arc/Scene/Beat TypeScript interface) for structural compliance
2. **C-J2**: Global scene count tracking must be added to prompt or post-processing
