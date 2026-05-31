# OMEGA Scribe Engine -- Oracle Rules
## Phase C.2 -- Formal Validation Rules

---

### SRULE-001 -- Truth Support (Canon)
- **Oracle**: ORACLE_TRUTH
- **Invariant**: S-INV-03
- **Condition**: IF any paragraph has no canon_refs AND no segment_ids tracing to plan THEN score penalized
- **Pass**: Paragraph with canon_refs=["CANON-001"] and segment_ids=["SEG-001"] -> supported
- **Fail**: Paragraph with canon_refs=[] and segment_ids=[] -> unsupported

### SRULE-002 -- Truth Support (Plan)
- **Oracle**: ORACLE_TRUTH
- **Invariant**: S-INV-02
- **Condition**: IF referenced canon entry does not exist in canon THEN score penalized
- **Pass**: canon_ref "CANON-001" exists in canon.entries -> valid
- **Fail**: canon_ref "NONEXIST-001" not in canon.entries -> invalid

### SRULE-003 -- Necessity Ablation
- **Oracle**: ORACLE_NECESSITY
- **Invariant**: S-INV-04
- **Condition**: IF paragraph has no content (word_count < 3) OR no segment references THEN unnecessary
- **Pass**: Paragraph with 16 words and segment references -> necessary
- **Fail**: Paragraph with 0 words and no segments -> unnecessary

### SRULE-004 -- Necessity Ratio
- **Oracle**: ORACLE_NECESSITY
- **Invariant**: S-INV-04
- **Condition**: IF ratio of necessary/total paragraphs < 0.85 THEN verdict = FAIL
- **Pass**: 10/10 paragraphs necessary (ratio = 1.0) -> PASS
- **Fail**: 5/10 paragraphs necessary (ratio = 0.5) -> FAIL

### SRULE-005 -- Style Burstiness
- **Oracle**: ORACLE_STYLE
- **Invariant**: S-INV-07
- **Condition**: IF actual burstiness deviates > 0.3 from genome target THEN score penalized
- **Pass**: Target 0.7, actual 0.65 -> deviation 0.05 -> PASS
- **Fail**: Target 0.7, actual 0.2 -> deviation 0.5 -> FAIL

### SRULE-006 -- Style Lexical Richness
- **Oracle**: ORACLE_STYLE
- **Invariant**: S-INV-07
- **Condition**: IF actual lexical richness deviates > 0.3 from target THEN score penalized
- **Pass**: Target 0.8, actual 0.75 -> deviation 0.05 -> PASS
- **Fail**: Target 0.8, actual 0.3 -> deviation 0.5 -> FAIL

### SRULE-007 -- Emotion Waypoint Coverage
- **Oracle**: ORACLE_EMOTION
- **Invariant**: S-INV-06
- **Condition**: IF paragraph intensity at waypoint position deviates > 0.3 THEN waypoint missed
- **Pass**: Waypoint intensity 0.5, paragraph intensity 0.55 -> diff 0.05 -> aligned
- **Fail**: Waypoint intensity 0.9, paragraph intensity 0.1 -> diff 0.8 -> misaligned

### SRULE-008 -- Emotion Climax
- **Oracle**: ORACLE_EMOTION
- **Invariant**: S-INV-06
- **Condition**: IF paragraph at climax_position has intensity < 0.5 THEN finding logged
- **Pass**: Climax paragraph intensity 0.9 -> strong climax
- **Fail**: Climax paragraph intensity 0.1 -> weak climax

### SRULE-009 -- Banality IA-Speak
- **Oracle**: ORACLE_BANALITY
- **Invariant**: S-INV-08
- **Condition**: IF text contains any IA_SPEAK_PATTERNS entry (case-insensitive) THEN verdict = FAIL
- **Pass**: "The light pierced darkness" -> no IA-speak -> PASS
- **Fail**: "It is worth noting that the light pierced" -> IA-speak detected -> FAIL

### SRULE-010 -- Banality Cliche
- **Oracle**: ORACLE_BANALITY
- **Invariant**: S-INV-08
- **Condition**: IF text contains any CLICHE_REGISTRY entry (case-insensitive) THEN verdict = FAIL
- **Pass**: "Fear settled in his chest" -> no cliche -> PASS
- **Fail**: "His blood ran cold" -> cliche detected -> FAIL

### SRULE-011 -- Banality Banned Words
- **Oracle**: ORACLE_BANALITY
- **Invariant**: S-INV-08
- **Condition**: IF text contains any banned_word from constraints (whole word, case-insensitive) THEN verdict = FAIL
- **Pass**: "The keeper observed the ocean" -> no banned word -> PASS
- **Fail**: "He suddenly turned around" -> "suddenly" banned -> FAIL

### SRULE-012 -- Crossref Canon Validity
- **Oracle**: ORACLE_CROSSREF
- **Invariant**: S-INV-02
- **Condition**: IF any canon_ref in paragraphs points to non-existent canon entry THEN score penalized
- **Pass**: canon_ref "CANON-001" exists -> valid
- **Fail**: canon_ref "NONEXIST-001" missing -> invalid

### SRULE-013 -- Crossref Motif Validity
- **Oracle**: ORACLE_CROSSREF
- **Invariant**: S-INV-05
- **Condition**: IF any motif_ref in paragraphs points to non-existent seed THEN score penalized
- **Pass**: motif_ref "SEED-001" exists in plan.seed_registry -> valid
- **Fail**: motif_ref "NONEXIST-SEED" missing -> invalid

### SRULE-014 -- Crossref Constraint Compliance
- **Oracle**: ORACLE_CROSSREF
- **Invariant**: S-INV-02
- **Condition**: IF paragraphs lack segment references THEN finding logged
- **Pass**: All paragraphs have segment_ids -> traceable
- **Fail**: Some paragraphs have empty segment_ids -> untraceable

### SRULE-015 -- Gate Chain Order
- **Gate Chain**: TRUTH -> NECESSITY -> BANALITY -> STYLE -> EMOTION -> DISCOMFORT -> QUALITY
- **Invariant**: S-INV-01 through S-INV-08
- **Condition**: IF any gate FAILs THEN chain stops (fail-fast), text rejected for rewrite
- **Pass**: All 7 gates PASS in order -> text accepted
- **Fail**: BANALITY_GATE FAILs -> gates 4-7 not executed -> text rejected

### SRULE-016 -- Rewrite Loop
- **Stage**: S4
- **Invariant**: S-INV-07
- **Condition**: IF gate chain FAILs AND passes < REWRITE_MAX_PASSES THEN rewrite from scratch
- **Pass**: Pass 1 FAIL -> rewrite -> Pass 2 PASS -> accepted
- **Fail**: Pass 1-3 all FAIL -> best candidate selected by oracle score
