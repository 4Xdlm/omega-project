# OMEGA Style Emergence Engine -- Oracle Rules
## Phase C.3 -- Formal Rule Definitions

---

### ERULE-001 — GENOME COMPLIANCE (E-INV-02)
**Condition**: For each genome axis (burstiness, lexical_richness, avg_sentence_length, dialogue_ratio, description_density), the absolute deviation between actual and target must be <= STYLE_MAX_DEVIATION (0.25).
**Pass**: max_deviation <= 0.25
**Fail**: max_deviation > 0.25
**Example PASS**: burstiness_delta=0.10, lexical_delta=0.15 -> max=0.15 <= 0.25
**Example FAIL**: burstiness_delta=0.40 -> max=0.40 > 0.25

### ERULE-002 — CADENCE SIGNATURE (E-INV-03)
**Condition**: Coefficient of variation (CV) of sentence lengths must be within [genome.target_burstiness - CADENCE_TOLERANCE, genome.target_burstiness + CADENCE_TOLERANCE].
**Pass**: |CV - target_burstiness| <= 0.15
**Fail**: |CV - target_burstiness| > 0.15
**Example PASS**: CV=0.65, target=0.7 -> delta=0.05 <= 0.15
**Example FAIL**: CV=0.3, target=0.7 -> delta=0.4 > 0.15

### ERULE-003 — LEXICAL RARITY RANGE (E-INV-04)
**Condition**: Rare word ratio must be in [LEXICAL_MIN_RARITY (0.05), LEXICAL_MAX_RARITY (0.20)].
**Pass**: 0.05 <= rare_ratio <= 0.20
**Fail**: rare_ratio < 0.05 OR rare_ratio > 0.20
**Example PASS**: rare_ratio=0.12
**Example FAIL**: rare_ratio=0.02 (too generic)

### ERULE-004 — CONSECUTIVE RARE LIMIT (E-INV-04)
**Condition**: No more than LEXICAL_MAX_CONSECUTIVE_RARE (3) consecutive rare words.
**Pass**: consecutive_rare_count <= 3
**Fail**: consecutive_rare_count > 3
**Example PASS**: "the ephemeral crystalline structure stood" (2 consecutive)
**Example FAIL**: "ephemeral diaphanous iridescent crystalline phantasmagoric" (5 consecutive)

### ERULE-005 — SYNTACTIC DIVERSITY (E-INV-05)
**Condition**: At least SYNTACTIC_MIN_TYPES (4) distinct syntactic structures used.
**Pass**: unique_structures >= 4
**Fail**: unique_structures < 4
**Example PASS**: SVO, question, compound, fragment (4 types)
**Example FAIL**: SVO, compound (2 types)

### ERULE-006 — SYNTACTIC DOMINANCE (E-INV-05)
**Condition**: No single syntactic structure may exceed SYNTACTIC_MAX_RATIO (0.5) of total.
**Pass**: dominant_ratio <= 0.5
**Fail**: dominant_ratio > 0.5
**Example PASS**: SVO=40%, compound=30%, question=20%, fragment=10%
**Example FAIL**: SVO=80% (dominant)

### ERULE-007 — IA DETECTION SCORE (E-INV-06)
**Condition**: Simulated IA detection score must be <= IA_MAX_DETECTION_SCORE (0.3).
**Pass**: ia_score <= 0.3
**Fail**: ia_score > 0.3
**Example PASS**: 0 patterns found -> score=0.0
**Example FAIL**: 8 patterns in 2 paragraphs -> score=0.8

### ERULE-008 — IA PATTERN SCAN (E-INV-06)
**Condition**: Text scanned against 31 IA_DETECTION_PATTERNS (case-insensitive).
**Pass**: Pattern count below threshold
**Fail**: Multiple IA patterns detected
**Example PASS**: "The keeper watched the horizon."
**Example FAIL**: "It is worth noting that furthermore the tapestry of experience."

### ERULE-009 — GENRE SPECIFICITY (E-INV-07)
**Condition**: Genre specificity score (top_score - second_score) must be <= GENRE_MAX_SPECIFICITY (0.6).
**Pass**: specificity <= 0.6
**Fail**: specificity > 0.6
**Example PASS**: fantasy=0.2, romance=0.1 -> specificity=0.1
**Example FAIL**: fantasy=0.9, romance=0.1 -> specificity=0.8

### ERULE-010 — TOURNAMENT INTEGRITY (E-INV-08)
**Condition**: Each paragraph tournament must generate >= TOURNAMENT_MIN_VARIANTS (2) variants.
**Pass**: variants_per_round >= 2
**Fail**: variants_per_round < 2
**Example PASS**: 3 variants generated per paragraph
**Example FAIL**: 1 variant (no competition)

### ERULE-011 — TOURNAMENT SELECTION (E-INV-08)
**Condition**: Selection is deterministic. Tiebreak: highest anti_ia_score -> highest genome_compliance -> variant_id lexicographic.
**Pass**: Same inputs -> same selection
**Fail**: Non-deterministic selection

### ERULE-012 — VOICE COHERENCE (E-INV-09)
**Condition**: Inter-paragraph style drift (stddev of metric deltas) must be <= VOICE_MAX_DRIFT (0.2).
**Pass**: style_drift <= 0.2
**Fail**: style_drift > 0.2
**Example PASS**: Consistent 15-word sentences throughout
**Example FAIL**: Alternating 3-word and 30-word sentences

### ERULE-013 — DETERMINISM (E-INV-10)
**Condition**: Same inputs -> same variants -> same selection -> same output -> same hash.
**Pass**: output_hash(run1) === output_hash(run2)
**Fail**: output_hash(run1) !== output_hash(run2)

### ERULE-014 — INPUT VALIDATION (E-INV-01)
**Condition**: ScribeOutput must be non-null with paragraphs.
**Pass**: scribeOutput exists and has paragraphs
**Fail**: null, undefined, or empty paragraphs

### ERULE-015 — EVIDENCE CHAIN (Pipeline)
**Condition**: Every pipeline step (E0-E6) is recorded with input/output hashes.
**Pass**: chain verifiable (recomputed hash matches stored hash)
**Fail**: Chain tampered or missing steps

### ERULE-016 — COMPOSITE SCORING (Tournament)
**Condition**: composite = 0.3*genome + 0.3*anti_ia + 0.2*anti_genre + 0.2*anti_banality
**Pass**: Weights sum to 1.0 and correctly applied
**Fail**: Incorrect weights or calculation
