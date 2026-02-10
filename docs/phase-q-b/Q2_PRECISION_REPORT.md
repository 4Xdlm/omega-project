# Q.2 Précision Report — Phase Q-B

## Date: 2026-02-10
## Model: claude-sonnet-4-20250514 | Temperature: 0

---

## Summary

Précision measures whether the LLM differentiates between distinct intents AND between similar-but-varied intents. A precise system produces different output for different inputs, and appropriately varied output for similar inputs.

## Test Matrix

| Run | Intent | Core Emotion | Themes | Target WC | Canon Entries |
|-----|--------|-------------|--------|-----------|---------------|
| run_001 | Le Gardien | fear | isolation, duty, forbidden knowledge | 5000 | 5 |
| run_002 | Le Choix | anticipation | choice | 1000 | 1 |
| run_003 | Le Gardien variant | despair | isolation, duty, forbidden knowledge, **adaptation** | 5000 | **6** |

---

## Test 1: Different Intents (Gardien vs Choix)

### Structural Differentiation

| Metric | Le Gardien (run_001) | Le Choix (run_002) |
|--------|---------------------|-------------------|
| Arc count | 2 | 3 |
| Total scenes | 10 | 10 |
| Arc themes | horror, isolation | contemplation, memory, dialogue |
| Setting | lighthouse, ocean | white room, two doors |
| Characters | Elias (keeper) | unnamed woman |
| Word count targets | sum ~5000 | sum ~1000 |
| Response length (arcs) | 4327 chars | 3695 chars |
| Arc hash | 985252a1b7f9e89c... | 789cf604ed4c6757... |

### Content Differentiation

**Le Gardien** — Cosmic horror narrative:
- Scene titles: "The Anomaly", "Forbidden Records", "What Lies Beneath", "The Ancient Sleeper"
- Conflicts: ocean disturbances, hidden journals, creature stirring, equipment failure
- Resolution: "Eternal Vigil" — acceptance of duty

**Le Choix** — Philosophical exploration:
- Arc 1 "The Weight of Decision": contemplation, examination, choosing
- Arc 2 "Echoes of Past Choices": confrontation with memory, accumulated grief
- Arc 3 "The Voice of Choice": externalized dialogue about nature of choice
- Resolution: "Another Death" — mourning the unchosen

**Hash comparison**: `985252a1...` ≠ `789cf604...` — **100% differentiated**

**Verdict: PASS** — Completely distinct outputs for completely distinct intents.

---

## Test 2: Similar Intents (Gardien vs Variant)

### Intent Delta

| Field | Le Gardien | Variant | Delta |
|-------|-----------|---------|-------|
| Title | Le Gardien | Le Gardien de l'Abime | Modified |
| Premise | ...keeps something asleep | ...creature is evolving to withstand the light | Extended |
| Themes | isolation, duty, forbidden knowledge | + **adaptation** | +1 theme |
| Core emotion | fear | **despair** | Changed |
| Canon entries | 5 | **6** (+ creature adapting) | +1 entry |
| Emotion arc | fear → sadness | **despair → despair** | Darker |
| Message | Some truths are better left in darkness | **Even the strongest barriers eventually fail** | Changed |

### Structural Differentiation

| Metric | Le Gardien | Variant |
|--------|-----------|---------|
| Arc count | 2 | **4** |
| Arc names | "The Keeper's Descent", "The Solitary Vigil" | "The Awakening Truth", **"The Creature's Evolution"**, **"The Inevitable Failure"**, "The Price of Duty" |
| Total scenes | 10 | **8** |
| Response length | 4327 chars | 3705 chars |
| Arc hash | 985252a1... | **9ae0ba26...** |

### Content Differentiation

**Shared elements** (expected — same base setting):
- Lighthouse setting, Elias character
- Discovery of lighthouse's true purpose
- Previous keepers referenced

**Differentiated elements** (responding to variant delta):
- Variant introduces **adaptation arc** ("The Creature's Evolution") — directly from added theme
- Variant has **"The Inevitable Failure"** arc — reflecting despair emotion
- Variant's resolution is **catastrophic** ("The Deep Awakens") vs original's **acceptance** ("The Guardian's Burden")
- Variant explicitly addresses CANON-006: "the light frequency is losing effectiveness"
- Variant's arc structure is more complex (4 arcs vs 2) — responding to increased thematic complexity
- Scene titles reflect despair: "When Light Dies", "The Deep Awakens" vs "Eternal Vigil"

### Quantitative Precision Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Hash identity | 0% (completely different hashes) | PASS |
| Arc name overlap | 0/4 shared titles | HIGH differentiation |
| Theme integration | "adaptation" present in variant only | PASS |
| CANON-006 reference | Present in variant only | PASS |
| Emotional tone shift | fear→sadness to despair→despair | PASS |
| Resolution difference | acceptance vs catastrophe | PASS |

**Verdict: PASS** — The LLM correctly differentiates between similar intents, responding specifically to each delta (added theme, changed emotion, new canon entry, modified message).

---

## Test 3: Mock Comparison (Precision)

### Mock Structural Differentiation

| Metric | Mock Gardien | Mock Choix | Mock Variant |
|--------|-------------|-----------|--------------|
| Arcs | 2 | 1 | 2 |
| Scenes | 7 | 4 | 6 |
| Beats | 39 | 24 | 43 |
| Plan hash | f0bd23d0... | 902d441d... | cdeb9480... |

Mock mode produces **structurally differentiated** output (different arc/scene/beat counts, different hashes), but content is **parametric** — generated from formulas, not narrative intelligence. Scene content is generic ("Advance isolation — stage 1/4").

### LLM vs Mock Precision

| Aspect | Mock | LLM |
|--------|------|-----|
| Structural differentiation | YES | YES |
| Content differentiation | Parametric | Narrative |
| Theme integration | By ID reference | By narrative weaving |
| Canon integration | Structural reference | Plot integration |
| Emotion expression | Computed intensity value | Described emotional state |
| Adaptation to variant | Different beat counts | Different arc structure + new plot threads |

**LLM precision is qualitatively superior to mock precision.** Both differentiate, but LLM differentiates with narrative intelligence — creating new plot threads for new themes, adjusting story resolution for different emotions, introducing new arcs for added complexity.

---

## Aggregate Precision Score

| Test | Result | Weight | Score |
|------|--------|--------|-------|
| T1: Different intents → different output | PASS | 0.40 | 4.0 |
| T2: Similar intents → appropriate variation | PASS | 0.40 | 4.0 |
| T3: LLM precision > mock precision | PASS | 0.20 | 2.0 |

**Aggregate: 10/10**

---

## Findings

### F-P1: Complete differentiation for distinct intents
Le Gardien and Le Choix produce 0% overlap in arc names, themes, settings, and resolution. Hash identity = 0%.

### F-P2: Intelligent variant response
The LLM doesn't just produce "slightly different" output for the variant. It creates new arc structures (adaptation_arc, despair_arc) that directly respond to the added theme and changed emotion. This demonstrates semantic understanding of intent differences.

### F-P3: Canon entry integration in variant
CANON-006 ("creature adapting to light") appears only in the variant output, with specific narrative integration ("the light frequency is losing effectiveness"). The LLM correctly integrates new canon entries without disrupting existing ones.

### F-P4: Emotional tone calibration
- Original: fear → acceptance (somber but resolved)
- Variant: despair → catastrophe (darker, unresolved)
The LLM correctly adjusts narrative tone from "acceptance" to "despair" based on the emotion delta.

### F-P5: Mock provides structural baseline
Mock differentiation is formula-based (different theme → different beat count). LLM differentiation is narrative-based (different theme → new plot arc). Both are valid but operate at different quality levels.

---

## Verdict: PASS

The LLM mode demonstrates high precision across all three test axes. Different intents produce different outputs. Similar intents produce appropriately varied outputs that specifically respond to each intent delta. LLM precision exceeds mock precision in narrative quality.
