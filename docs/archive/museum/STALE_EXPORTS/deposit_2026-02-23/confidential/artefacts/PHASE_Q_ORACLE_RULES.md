# OMEGA Phase Q — Oracle Rules (Formal Specification)

**Version**: 1.0.0
**Standard**: NASA-Grade L4 / DO-178C Level A
**Applies to**: Oracle-A (Symbolic Rules Engine)

---

## Rule Index

| Rule ID | Invariant | Check Type | Description |
|---------|-----------|------------|-------------|
| RULE-PREC-001 | Q-INV-01 | count_threshold | Zero unsupported claims (strict mode) |
| RULE-PREC-002 | Q-INV-01 | must_find | Required patterns must appear in output |
| RULE-PREC-003 | Q-INV-01 | must_not_find | Forbidden patterns must not appear in output |
| RULE-PREC-004 | Q-INV-01 | pattern_match | Fact-sourcing: claims traceable to input facts |
| RULE-CONT-001 | Q-INV-03 | contradiction_check | Direct negation detection |
| RULE-CONT-002 | Q-INV-03 | contradiction_check | Incompatible constraints detection |
| RULE-CONT-003 | Q-INV-03 | contradiction_check | Assertion-then-infirmation detection |

---

## RULE-PREC-001: Zero Unsupported Claims

**Invariant**: Q-INV-01 (NO-BULLSHIT)
**Check Type**: count_threshold
**Threshold**: CONFIG:UNSUPPORTED_MAX (default: 0)

### Definition
Every factual assertion in the candidate output MUST be traceable to:
1. An input fact (fact sourcing via substring match), OR
2. A derivation rule explicitly defined in this document

### Algorithm
1. Split candidate_output into sentences (delimiters: `.`, `!`, `?`)
2. Normalize each sentence (lowercase, trim whitespace)
3. For each sentence, check if ANY input fact contains it OR it contains any input fact
4. Count sentences with no fact match = unsupported_count
5. If unsupported_count > UNSUPPORTED_MAX => FAIL

### Parameters
```json
{
  "threshold_ref": "CONFIG:UNSUPPORTED_MAX",
  "match_mode": "case_insensitive_substring",
  "sentence_delimiters": [".", "!", "?"]
}
```

---

## RULE-PREC-002: Must-Find Patterns

**Invariant**: Q-INV-01
**Check Type**: must_find

### Definition
Patterns listed in `expected.must_find` MUST appear in the candidate output.
Matching is case-insensitive substring.

### Algorithm
1. Normalize candidate_output (lowercase)
2. For each pattern in must_find: check if output contains pattern (lowercase)
3. Any missing pattern => FAIL

---

## RULE-PREC-003: Must-Not-Find Patterns

**Invariant**: Q-INV-01
**Check Type**: must_not_find

### Definition
Patterns listed in `expected.must_not_find` MUST NOT appear in the candidate output.

### Algorithm
1. Normalize candidate_output (lowercase)
2. For each pattern in must_not_find: check if output contains pattern (lowercase)
3. Any present forbidden pattern => FAIL

---

## RULE-PREC-004: Fact Sourcing

**Invariant**: Q-INV-01
**Check Type**: pattern_match

### Definition
Each factual claim in the output must be derivable from the input facts.
A claim is "sourced" if:
- The claim text (sentence) is a substring of any input fact, OR
- Any input fact is a substring of the claim text

### Match Strategy
- Case-insensitive
- Whitespace-normalized (collapsed to single spaces, trimmed)
- No stemming or semantic analysis (deterministic only)

---

## RULE-CONT-001: Direct Negation Detection

**Invariant**: Q-INV-03 (CONTRADICTION ZERO-TOLERANCE)
**Check Type**: contradiction_check

### Definition
The output must not contain both sides of a contradiction pair simultaneously.

### Predefined Contradiction Pairs
| Term A | Term B |
|--------|--------|
| always | never |
| true | false |
| increase | decrease |
| positive | negative |
| valid | invalid |
| correct | incorrect |
| success | failure |
| above | below |
| present | absent |
| enabled | disabled |

### Algorithm
1. For each contradiction_id in expected.contradiction_ids
2. Find matching pair from predefined pairs
3. Check if BOTH terms appear in the candidate output (case-insensitive)
4. If both present => contradiction found => FAIL

---

## RULE-CONT-002: Incompatible Constraints

**Invariant**: Q-INV-03
**Check Type**: contradiction_check

### Definition
Constraints like "X > Y" and "Y > X" cannot coexist in the same output.
Detected via the same contradiction pair mechanism as RULE-CONT-001.

---

## RULE-CONT-003: Assertion Then Infirmation

**Invariant**: Q-INV-03
**Check Type**: contradiction_check

### Definition
An assertion followed by its negation within the same output constitutes a contradiction.
Example: "X is true" followed later by "X is false".

### Detection
Uses the same pair-matching approach. If a contradiction_id maps to a known pair
and both terms appear, the contradiction is flagged.

---

## Verdict Rules

1. Each rule produces: `{ verdict: PASS|FAIL, violations: [], evidence: [] }`
2. Oracle-A verdict = FAIL if ANY rule produces FAIL
3. All evidence steps are recorded regardless of verdict
4. Violations reference the specific Q-INV invariant

---

## Extensibility

New rules can be added by:
1. Adding a QOracleRule entry with unique ID
2. Implementing the check_type handler in oracle-a.ts
3. Adding corresponding test cases to PHASE_Q_TESTSET.ndjson
4. Updating this document

Rules are immutable once published. New versions create new rule IDs.
