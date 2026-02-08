# OMEGA Forge — Oracle Rules

## FRULE-001: Certified Input Gate
**Invariant**: F5-INV-01
**Rule**: ForgeResult = FAIL if CreationResult.verdict != 'PASS'
**Rationale**: C.5 only analyzes certified pipeline output. No analysis on uncertified text.

## FRULE-002: Read-Only Operation
**Invariant**: F5-INV-02
**Rule**: Forge never modifies source text or existing artifacts.
**Output**: ForgeReport (diagnosis + prescriptions only).

## FRULE-003: Emotion Coverage
**Invariant**: F5-INV-03
**Rule**: coverage = analyzed_paragraphs / total_paragraphs = 1.0
**Method**: Each paragraph gets EmotionState14D extraction + Omega(X,Y,Z) conversion.

## FRULE-004: Trajectory Deviation Bound
**Invariant**: F5-INV-04
**Rule**: For each paragraph: cosine_distance <= TAU_COSINE, euclidean <= TAU_EUCLIDEAN, VAD <= TAU_VAD
**Non-compliant**: Paragraph marked as deviation, generates prescription.

## FRULE-005: Law 1 Compliance (Inertia)
**Invariant**: F5-INV-05
**Rule**: For each transition: |F_narrative| > M x R
**Violation**: Forced transition detected, CRITICAL prescription generated.

## FRULE-006: Law 3 Compliance (Feasibility)
**Invariant**: F5-INV-06
**Rule**: For each transition: F >= feasibility_threshold(from, to)
**Violation**: Dissonant transition, CRITICAL prescription generated.

## FRULE-007: Law 4 Compliance (Organic Decay)
**Invariant**: F5-INV-07
**Rule**: For each decay segment: MSE(I_actual, I_theoretical) <= TAU_DECAY
**Method**: I(t) = E0 + (I0-E0) x exp(-lambda_eff x t) x cos(omega x t + phi)

## FRULE-008: Law 5 Compliance (Flux Conservation)
**Invariant**: F5-INV-08
**Rule**: |Phi_trans - Phi_stock - Phi_diss| / total_energy <= TAU_FLUX
**Method**: Energy accounting across all transitions.

## FRULE-009: Canon Compliance
**Invariant**: F5-INV-09
**Rule**: M1 = 0 (zero contradictions) AND M2 = 1.0 (100% coverage)
**Method**: Keyword matching against canon entries.

## FRULE-010: Necessity Compliance
**Invariant**: F5-INV-10
**Rule**: M8 >= TAU_NECESSITY (default 95%)
**Method**: Unique information per sentence ratio.

## FRULE-011: Style Emergence
**Invariant**: F5-INV-11
**Rule**: M6 >= 0.5 (style is emergent, not imposed)
**Method**: Consumes C.3 IA detection + genre detection scores.

## FRULE-012: Prescription Actionability
**Invariant**: F5-INV-12
**Rule**: Each prescription has: paragraph_indices, diagnostic, action, current_value, target_value.
**No empty prescriptions**: All fields populated with actionable content.

## FRULE-013: Determinism
**Invariant**: F5-INV-13
**Rule**: Same CreationResult -> same ForgeResult -> same output_hash.
**Verification**: Double execution + hash comparison.

## FRULE-014: Weight Compliance
**Invariant**: F5-INV-14
**Rule**: composite = 0.6 x emotion_compliance + 0.4 x quality_score
**Decision**: Architecte Supreme (60% emotion physics, 40% quality envelope).

## Quality Metrics (M1-M12)

| Metric | Target | Description |
|--------|--------|-------------|
| M1 | 0 | Canon contradiction rate |
| M2 | 1.0 | Canon compliance ratio |
| M3 | high | Coherence span (words) |
| M4 | all | Arc maintenance count |
| M5 | 1.0 | Memory integrity ratio |
| M6 | high | Style emergence (not imposed) |
| M7 | high | Author fingerprint distance |
| M8 | >= 0.95 | Sentence necessity |
| M9 | high | Semantic density |
| M10 | >= 2 | Reading levels (layers) |
| M11 | [0.3, 0.7] | Discomfort index |
| M12 | composite | Weighted aggregate of M1-M11 |
