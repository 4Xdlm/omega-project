# ═══════════════════════════════════════════════════════════════════════════════
#
#   GENESIS INVARIANTS REGISTRY
#   Version: 1.1.0-FUSION
#   Standard: DO-178C / AS9100D / SpaceX Flight Software
#
# ═══════════════════════════════════════════════════════════════════════════════
#
#   ⚠️  THESE INVARIANTS ARE FROZEN — ANY VIOLATION IS A CERTIFICATION FAILURE
#
# ═══════════════════════════════════════════════════════════════════════════════

## Overview

| Category | Count | IDs |
|----------|-------|-----|
| Contract & Determinism | 4 | I01-I04 |
| SCRIBE Compatibility | 3 | I05-I07 |
| Quality & Structure | 3 | I08-I10 |
| Security & Audit | 4 | I11-I14 |
| Crypto (OPUS) | 3 | I15-I17 |
| Validation (OPUS) | 3 | I18-I20 |
| **TOTAL** | **20** | |

---

## Contract & Determinism (I01-I04)

### GENESIS-I01: Request Completeness

**Description**: All critical fields in GenesisRequest are mandatory (non-optional).

**Fields**:
- saga_id (non-empty)
- seed (any u64)
- target.scenes (> 0)
- canon_read_scope (non-empty)
- voice_profile_ref (non-empty)
- arc_spec.title (non-empty)
- arc_spec.premise (non-empty)
- arc_spec.major_turns (non-empty)
- continuity_claims (non-empty)
- metadata.schema_version (valid format)

**Tests**: L1-01, L1-02

---

### GENESIS-I02: Hash Determinism

**Description**: Same canonical request → same request_hash (100 runs).

**Formula**:
```
∀ req, run ∈ [1..100]:
  H(canonicalize(req)) = H(canonicalize(req))
```

**Tests**: L1-04, L3-01

---

### GENESIS-I03: Seed Determinism

**Description**: Same seed + same request → same plan (bit-for-bit), excluding non-deterministic metadata.

**Exclusions**: Only `created_utc` and `updated_utc` timestamps are excluded from comparison.

**Formula**:
```
∀ req with seed=S:
  plan(S, req) == plan(S, req)  [byte-for-byte]
```

**Tests**: L1-04, L2-07, L4-10

---

### GENESIS-I04: Ordering Stability

**Description**: All collections use stable ordering.

**Mechanisms**:
- BTreeMap for constraints (sorted keys)
- Sorted canon_read_scope (alphabetical)
- Sorted continuity_claims (by claim_id)
- Canonical JSON (sorted keys recursively)
- NFKC normalization (Unicode equivalence)

**Tests**: L1-05, L2-08

---

## SCRIBE Compatibility (I05-I07)

### GENESIS-I05: SceneSpec SCRIBE-Compatible

**Description**: Each generated SceneSpec passes SCRIBE validator.

**Required Fields**:
- pov (non-empty)
- tense (non-empty)
- tone (non-empty)
- canon_read_scope (non-empty)
- length.min ≤ length.max
- instructions (contains GOAL, CONFLICT, OUTCOME_HINT, CONTINUITY_CLAIMS)

**Tests**: L2-10

---

### GENESIS-I06: Canon Scope Non-Empty

**Description**: canon_read_scope is non-empty in request AND in each SceneSpec.

**Formula**:
```
req.canon_read_scope.len() > 0
∀ spec ∈ plan.scene_specs:
  spec.canon_read_scope.len() > 0
```

**Tests**: L1-06, L2-08

---

### GENESIS-I07: Voice Profile Non-Empty

**Description**: voice_profile_ref must be non-empty string.

**Tests**: L1-07

---

## Quality & Structure (I08-I10)

### GENESIS-I08: Beat Coverage

**Description**: If target.scenes ≥ 3 AND require_beats = true, then plan must contain at least one Setup, one Confrontation, and one Payoff beat.

**Formula**:
```
if req.target.scenes >= 3 && req.target.require_beats:
  ∃ beat ∈ beats: beat.kind == Setup
  ∃ beat ∈ beats: beat.kind == Confrontation
  ∃ beat ∈ beats: beat.kind == Payoff
```

**Tests**: L2-04

---

### GENESIS-I09: Instructions Complete

**Description**: Each SceneSpec.instructions contains GOAL, CONFLICT, and OUTCOME_HINT.

**Formula**:
```
∀ spec ∈ plan.scene_specs:
  spec.instructions.contains("GOAL:")
  spec.instructions.contains("CONFLICT:")
  spec.instructions.contains("OUTCOME_HINT:")
```

**Tests**: L2-09

---

### GENESIS-I10: Continuity Propagation

**Description**: All continuity_claims are propagated into each SceneSpec.instructions.

**Formula**:
```
∀ spec ∈ plan.scene_specs:
  spec.instructions.contains("CONTINUITY_CLAIMS:")
  ∀ claim ∈ req.continuity_claims:
    spec.instructions.contains(claim.claim_id)
```

**Tests**: L2-06

---

## Security & Audit (I11-I14)

### GENESIS-I11: Hash Chain Integrity

**Description**: Any tampering with scene content or proof is detected by verify_plan_proof().

**Formula**:
```
∀ plan:
  tamper(plan) → verify_plan_proof(plan) == Err(TamperDetected)
```

**Verification Steps**:
1. Chain length matches scene count
2. Each index is sequential
3. Each prev_hash matches previous chain_hash
4. Each scene_hash matches recomputed
5. Each chain_hash matches recomputed
6. Manifest tip matches final chain_hash
7. Plan ID matches recomputed

**Tests**: L2-02, L4-01, L4-02, L4-03, L4-04

---

### GENESIS-I12: Export/Import Idempotent

**Description**: JSON export → import → export produces identical JSON.

**Formula**:
```
∀ plan:
  JSON₁ = export(plan)
  JSON₂ = export(import(JSON₁))
  JSON₁ == JSON₂
```

**Tests**: L2-05, L2-06

---

### GENESIS-I13: Dry-Run Mode

**Description**: GENESIS never calls external providers (LLM, API). All generation is local and deterministic.

**Tests**: All tests run offline without network

---

### GENESIS-I14: Warnings Deterministic

**Description**: Same inputs → same warnings (order, content, count).

**Tests**: L2-*, L3-*

---

## Crypto — OPUS Extensions (I15-I17)

### GENESIS-I15: Domain Separation

**Description**: Hashes from different domains (Request, Scene, ChainLink, Manifest) never collide.

**Mechanism**: Each hash is prefixed with domain-specific bytes:
- Request: `GENESIS:REQ:V1:`
- Scene: `GENESIS:SCN:V1:`
- ChainLink: `GENESIS:LNK:V1:`
- Manifest: `GENESIS:MAN:V1:`

**Formula**:
```
∀ data:
  H(Request, data) ≠ H(Scene, data)
  H(Scene, data) ≠ H(ChainLink, data)
  ...
```

**Tests**: L1-Crypto-01

---

### GENESIS-I16: Length Prefix

**Description**: Hash concatenation uses length-prefix to prevent extension attacks.

**Formula**:
```
H([2]"ab"[2]"cd") ≠ H([1]"a"[3]"bcd")
```

**Mechanism**: Each field is prefixed with 8-byte big-endian length.

**Tests**: L1-Crypto-02

---

### GENESIS-I17: NFKC Normalization

**Description**: All strings are NFKC-normalized before hashing.

**Formula**:
```
H("café") == H("cafe\u{0301}")  // combining accent
H("ABC") == H("\u{FF21}\u{FF22}\u{FF23}")  // fullwidth
```

**Tests**: L1-Crypto-03

---

## Validation — OPUS Extensions (I18-I20)

### GENESIS-I18: EntityId Format

**Description**: All EntityIds must match format `TYPE:IDENTIFIER`.

**Valid Types**: CHAR, LOC, OBJ, EVT, FAC, TL, CON, VOICE, SAGA

**Identifier Rules**:
- 1-64 characters
- Alphanumeric + underscore
- No leading/trailing underscore

**Tests**: L1-Val-01, L1-Val-02, L1-Val-03

---

### GENESIS-I19: ClaimId Uniqueness

**Description**: All claim_ids within a request must be unique.

**Formula**:
```
∀ i, j ∈ req.continuity_claims where i ≠ j:
  claims[i].claim_id ≠ claims[j].claim_id
```

**Tests**: L1-Val-04, L1-Val-05

---

### GENESIS-I20: Arc Bounds

**Description**: Arc specification must be within valid bounds.

**Constraints**:
- 1 ≤ act_count ≤ 10
- major_turns non-empty
- title non-empty
- premise non-empty
- stakes non-empty

**Tests**: L1-Val-06, L1-Val-07

---

## Formulas Summary

| ID | Formula |
|----|---------|
| I02 | `H(req_canon) == H(req_canon)` on N runs |
| I03 | `plan(seed, req) == plan(seed, req)` byte-for-byte |
| I11 | `∀ i: chain_hash_i = H(domain \|\| len(prev_i) \|\| prev_i \|\| len(scene_i) \|\| scene_i)` |
| I15 | `H(domain_A, data) ≠ H(domain_B, data)` |
| I16 | `H([len]data_1 [len]data_2) ≠ H([len]data_1' [len]data_2')` if segmentation differs |
| I17 | `NFKC(s1) == NFKC(s2) → H(s1) == H(s2)` |

---

## Test Coverage Matrix

| Invariant | L1 | L2 | L3 | L4 |
|-----------|----|----|----|----|
| I01 | ✅ | | | |
| I02 | ✅ | | ✅ | |
| I03 | ✅ | ✅ | | ✅ |
| I04 | ✅ | ✅ | | |
| I05 | | ✅ | | |
| I06 | ✅ | ✅ | | |
| I07 | ✅ | | | |
| I08 | | ✅ | | |
| I09 | | ✅ | | |
| I10 | | ✅ | | |
| I11 | | ✅ | | ✅ |
| I12 | | ✅ | | |
| I13 | ✅ | ✅ | ✅ | ✅ |
| I14 | | ✅ | ✅ | |
| I15 | ✅ | | | |
| I16 | ✅ | | | |
| I17 | ✅ | | | |
| I18 | ✅ | | | |
| I19 | ✅ | | | |
| I20 | ✅ | | | |

---

**Document ID**: GENESIS-INV-001
**Version**: 1.1.0-FUSION
**Date**: 2026-01-01
**Status**: FROZEN
