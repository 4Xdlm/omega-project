# OMEGA Creation Pipeline -- Unified E2E Oracle Rules
**Phase**: C.4 | **Standard**: NASA-Grade L4 / DO-178C Level A
**Module**: `packages/creation-pipeline/src/gates/`

---

## Overview

Phase C.4 defines 8 unified End-to-End gate rules (oracle rules) that validate the final output of the creation pipeline. Every gate runs in a fixed, deterministic order. The pipeline verdict is FAIL if **any** gate fails. There is no bypass mechanism (C4-INV-02) and the system operates in fail-closed mode (C4-INV-07).

**Gate execution order** (config key `UNIFIED_GATE_ORDER`):

```
U_TRUTH -> U_NECESSITY -> U_CROSSREF -> U_BANALITY -> U_STYLE -> U_EMOTION -> U_DISCOMFORT -> U_QUALITY
```

All 8 gates execute regardless of individual failures. The chain collects all violations and records the first failure point.

---

## Gate Definitions

### 1. U_TRUTH -- Canon Lock

| Property | Value |
|----------|-------|
| **Gate ID** | `U_TRUTH` |
| **Invariant** | `C4-INV-04` |
| **Source file** | `gates/unified-truth-gate.ts` |
| **Severity on fail** | FATAL |

**Rule**: Every paragraph's vocabulary must be traceable to canon, plan, and intent sources.

**Mechanism**:
1. Build a comprehensive known-word set from all available sources:
   - Canon entry statements (words > 2 characters)
   - Plan arc themes, justifications, scene objectives, beat actions
   - Seed registry descriptions
   - Intent themes, premise, message
   - Emotion waypoint emotion names
2. For each paragraph in the styled output, compute a match ratio: the fraction of content words (> 2 characters) that appear in the known-word set.
3. A paragraph is "supported" if its match ratio >= **0.10** (10% paragraph-level threshold).
4. Compute the global truth ratio = `supported_paragraphs / total_paragraphs`.
5. The gate FAILS if the truth ratio is below the configured `E2E_TRUTH_THRESHOLD` (default: **1.0**, meaning 100% of paragraphs must be supported).

**Metrics reported**: `truth_ratio`, `total_paragraphs`, `supported_paragraphs`, `known_words`.

---

### 2. U_NECESSITY -- Ablation

| Property | Value |
|----------|-------|
| **Gate ID** | `U_NECESSITY` |
| **Invariant** | `C4-INV-05` |
| **Source file** | `gates/unified-necessity-gate.ts` |
| **Severity on fail** | ERROR |

**Rule**: Removing any single paragraph must degrade unique word coverage by at least 15%.

**Mechanism**:
1. Compute the base coverage: the count of unique words (lowercased) across all paragraphs.
2. For each paragraph, perform ablation: remove that paragraph and recompute unique word count.
3. Compute the retained ratio = `ablated_coverage / base_coverage`.
4. A paragraph is flagged as "removable" if `retained_ratio >= NECESSITY_ABLATION_THRESHOLD` (default: **0.85**). This means removing it did NOT degrade coverage by at least 15%.
5. The gate FAILS if any paragraph is removable (i.e., any violation exists).

**Metrics reported**: `base_coverage`, `removable_paragraphs`, `total_paragraphs`.

---

### 3. U_CROSSREF -- Cross-Reference Integrity

| Property | Value |
|----------|-------|
| **Gate ID** | `U_CROSSREF` |
| **Invariant** | `C4-INV-06` |
| **Source file** | `gates/unified-crossref-gate.ts` |
| **Severity on fail** | ERROR |

**Rule**: Proper nouns in the generated text must resolve to canon or plan references. Maximum 5 orphaned names allowed.

**Mechanism**:
1. Build a reference set from all plan and canon sources (words > 3 characters from: canon statements, arc themes/justifications, scene objectives, beat actions, seed descriptions, intent title/themes/premise/message).
2. Extract proper nouns from the styled text using capitalization pattern matching (`/\b[A-Z][a-z]{2,}\b/`). Common sentence starters (The, This, That, When, Where, What, How, With, From, Into, After, Before, While, Each, Every, Some, But, And, For, His, Her, Its) are excluded.
3. For each extracted name, check if it exists in the reference set via exact match or partial containment (substring match in either direction).
4. Count orphaned names (names not found in reference set).
5. The gate FAILS if `orphan_count > CROSSREF_MAX_ORPHANS` (default: **5**).

**Metrics reported**: `known_refs`, `text_names`, `orphan_count`.

---

### 4. U_BANALITY -- Zero Tolerance for IA Patterns

| Property | Value |
|----------|-------|
| **Gate ID** | `U_BANALITY` |
| **Invariant** | `C4-INV-06` |
| **Source file** | `gates/unified-banality-gate.ts` |
| **Severity on fail** | FATAL (cliches/banned words), ERROR (IA patterns) |

**Rule**: Zero tolerance for IA-speak patterns, forbidden cliches, and banned words.

**Mechanism**:
1. Scan each paragraph (lowercased) against 3 detection lists:
   - **IA patterns** (31 hardcoded patterns): `it is worth noting`, `it should be noted`, `in conclusion`, `furthermore`, `moreover`, `needless to say`, `as previously mentioned`, `it goes without saying`, `at the end of the day`, `in terms of`, `with regard to`, `it is important to`, `it is clear that`, `one might argue`, `delve into`, `tapestry of`, `symphony of`, `dance of`, `testament to`, `echoed through`, `a sense of`, `in this context`, `on the other hand`, `having said that`, `to be sure`, `it bears mentioning`, `not unlike`, `inasmuch as`, `in the grand scheme`, `it stands to reason`, `for all intents and purposes`.
   - **Forbidden cliches**: sourced from `IntentPack.constraints.forbidden_cliches` (per-scenario).
   - **Banned words**: sourced from `IntentPack.constraints.banned_words` (per-scenario, matched via word-boundary regex).
2. Any detection creates a violation.
3. The gate FAILS if any violation exists (zero tolerance).

**Metrics reported**: `cliche_count`, `ia_speak_count`, `banned_word_count`, `total_findings`.

---

### 5. U_STYLE -- E2E Style Compliance

| Property | Value |
|----------|-------|
| **Gate ID** | `U_STYLE` |
| **Invariant** | `C4-INV-06` |
| **Source file** | `gates/unified-style-gate.ts` |
| **Severity on fail** | ERROR |

**Rule**: Genome deviation axes must remain within tolerance. IA detection must be low. Genre specificity must be bounded.

**Mechanism**:
1. Read the `global_profile.genome_deviation` from the styled output.
2. Check each deviation axis against the E2E tolerance of `1 - E2E_STYLE_THRESHOLD` (default threshold: 0.75, so tolerance = **0.25**):
   - `|burstiness_delta|` must be <= 0.25
   - `|lexical_richness_delta|` must be <= 0.25
   - `|sentence_length_delta|` must be <= 0.25
3. Check IA detection score (from C.3 output): must be < **0.3**.
4. Check genre specificity (from C.3 output): must be < **0.6**.
5. The gate FAILS if any axis exceeds tolerance or if IA/genre thresholds are breached.

**Metrics reported**: `compliance`, `max_deviation`, `burstiness_delta`, `lexical_delta`, `ia_score`, `genre_specificity`.

---

### 6. U_EMOTION -- Emotion Pivot Coverage

| Property | Value |
|----------|-------|
| **Gate ID** | `U_EMOTION` |
| **Invariant** | `C4-INV-06` |
| **Source file** | `gates/unified-emotion-gate.ts` |
| **Severity on fail** | ERROR |

**Rule**: At least 50% of target emotions from waypoints must be detected in the final text via keyword matching.

**Mechanism**:
1. Extract unique target emotions from `IntentPack.emotion.waypoints`.
2. Join all paragraph texts into a single lowercase string.
3. For each target emotion, check for presence using an emotion keyword dictionary:
   - `fear`: fear, afraid, terrif, dread, horror, fright, panic, trembl
   - `sadness`: sad, grief, sorrow, mourn, weep, tear, loss, melanchol
   - `anger`: anger, rage, fury, wrath, hostil, bitter
   - `joy`: joy, happy, delight, bliss, elat, cheerful
   - `trust`: trust, faith, confid, rely, loyal, believ
   - `anticipation`: anticipat, expect, await, eager, watch, prepar
   - `surprise`: surprise, shock, astonish, startle, unexpect, sudden
   - `disgust`: disgust, revuls, repuls, loath, abhor, nause
   - `hope`: hope, optimi, aspir, wish, dream, promis
   - For unlisted emotions, the emotion name itself is used as keyword.
4. Compute coverage = `covered_emotions / target_emotions`.
5. The gate FAILS if coverage < **0.5** (50%).

**Metrics reported**: `target_emotions`, `covered_emotions`, `coverage`.

---

### 7. U_DISCOMFORT -- Friction Markers

| Property | Value |
|----------|-------|
| **Gate ID** | `U_DISCOMFORT` |
| **Invariant** | `C4-INV-06` |
| **Source file** | `gates/unified-discomfort-gate.ts` |
| **Severity on fail** | ERROR |

**Rule**: Friction markers must be present in at least 50% of scene segments.

**Mechanism**:
1. Determine scene count from the genesis plan (`sum of arc.scenes.length`).
2. Divide paragraphs into equal-sized segments (one segment per scene). If no scenes, treat all paragraphs as one segment.
3. For each segment, join paragraph texts (lowercased) and scan for any of the 30 friction markers:
   - `but`, `however`, `yet`, `despite`, `although`, `though`
   - `conflict`, `tension`, `struggle`, `resist`, `refuse`
   - `against`, `oppose`, `challenge`, `threat`, `risk`
   - `question`, `doubt`, `uncertain`, `hesitat`, `reluct`
   - `fear`, `anger`, `pain`, `loss`, `dark`
   - `clash`, `dilemma`, `crisis`, `danger`, `trap`
4. A segment has friction if at least one marker is found.
5. Compute friction ratio = `scenes_with_friction / total_scenes`.
6. The gate FAILS if friction ratio < **0.5** (50%).

**Metrics reported**: `total_scenes`, `scenes_with_friction`, `friction_ratio`.

---

### 8. U_QUALITY -- Information Density and Clarity

| Property | Value |
|----------|-------|
| **Gate ID** | `U_QUALITY` |
| **Invariant** | `C4-INV-06` |
| **Source file** | `gates/unified-quality-gate.ts` |
| **Severity on fail** | ERROR |

**Rule**: Text must meet minimum information density, sentence length bounds, and paragraph content requirements.

**Mechanism**:
1. **Information density**: Compute `unique_words / total_words` across all paragraphs. Must be >= **0.15**.
2. **Clarity**: Compute average sentence length in words (sentences split on `[.!?]+`). Must be <= **35** words per sentence.
3. **Precision**: Every paragraph must have >= **5** words. Count of paragraphs below this threshold must be **0**.
4. Each failing check produces a separate violation.
5. The gate FAILS if any violation exists.

**Metrics reported**: `information_density`, `avg_sentence_length`, `empty_paragraphs`, `total_words`, `unique_words`.

---

## Gate Chain Orchestration

The gate chain is executed in stage `F4` of the pipeline (`pipeline/stage-gates.ts`).

```
Input: StyledOutput + GenesisPlan + IntentPack + C4Config + timestamp
Output: UnifiedGateChainResult { verdict, gate_results[], first_failure, total_violations }
```

- All 8 gates run in the fixed order defined by `UNIFIED_GATE_ORDER`.
- Each gate receives the same inputs; no gate output feeds into another gate.
- The chain verdict is FAIL if any individual gate verdict is FAIL.
- `first_failure` records the ID of the first gate that failed (or null if all pass).
- `total_violations` is the sum of all violations across all gates.

---

## Configuration Reference

| Config Key | Default | Unit | Rule |
|------------|---------|------|------|
| `E2E_TRUTH_THRESHOLD` | 1.0 | ratio (0-1) | C4-INV-04 |
| `NECESSITY_ABLATION_THRESHOLD` | 0.85 | ratio | C4-INV-05 |
| `CROSSREF_MAX_ORPHANS` | 5 | count | C4-INV-06 |
| `E2E_STYLE_THRESHOLD` | 0.75 | ratio (0-1) | E2E style |
| `PIPELINE_STRICT_MODE` | true | boolean | C4-INV-07 |
| `UNIFIED_GATE_ORDER` | [U_TRUTH, ..., U_QUALITY] | gate_sequence | C4-INV-02 |

---

## Invariant Cross-Reference

| Invariant | Gate(s) | Description |
|-----------|---------|-------------|
| C4-INV-02 | Chain | Gates execute in fixed order, no bypass |
| C4-INV-04 | U_TRUTH | Canon lock -- 100% paragraph traceability |
| C4-INV-05 | U_NECESSITY | Ablation -- every paragraph contributes >= 15% unique words |
| C4-INV-06 | U_CROSSREF, U_BANALITY, U_STYLE, U_EMOTION, U_DISCOMFORT, U_QUALITY | Cross-module quality and integrity constraints |
| C4-INV-07 | Chain | Fail-closed -- any gate failure rejects the entire pipeline |

---

**Standard**: NASA-Grade L4 / DO-178C Level A
**Author**: OMEGA Phase C.4
