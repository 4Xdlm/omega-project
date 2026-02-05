# ANNEX B: INVARIANTS

**Standard**: Emotional DNA IR v1.0
**Document**: Invariant Specifications

---

## B.1 SCHEMA INVARIANTS

### INV-S0-01: Version Format
```
version MUST match pattern: ^1\.0\.[0-9]+$
```

### INV-S0-02: Hash Format
```
All hash fields MUST be 64 lowercase hexadecimal characters
Pattern: ^[a-f0-9]{64}$
```

### INV-S0-03: Language Code
```
language MUST be ISO 639-1 format
Pattern: ^[a-z]{2}(-[A-Z]{2})?$
```

### INV-S0-04: Value Bounds
```
All emotional_axes.values MUST be in range [-1.0, 1.0]
```

### INV-S0-05: Dimension Match
```
emotional_axes.values.length MUST equal emotional_axes.dimensions
```

### INV-S0-06: Confidence Bounds
```
confidence MUST be in range [0.0, 1.0] when present
```

### INV-S0-07: Timestamp Format
```
timestamp MUST be ISO 8601 format with timezone
Pattern: date-time (RFC 3339)
```

---

## B.2 DETERMINISM INVARIANTS

### INV-S0-10: Canonical Form
```
canonicalize(IR) MUST produce identical output for identical input
```

### INV-S0-11: Hash Stability
```
hash(canonicalize(IR)) MUST be stable across implementations
```

### INV-S0-12: Key Ordering
```
Object keys MUST be sorted alphabetically in canonical form
```

### INV-S0-13: Float Precision
```
Floating point values MUST be rounded to 6 decimal places
```

---

## B.3 SEMANTIC INVARIANTS

### INV-S0-20: Provenance Required
```
Every IR MUST have provenance with source_hash and timestamp
```

### INV-S0-21: ID Uniqueness
```
identity.id SHOULD be globally unique per analyzed work version
```

### INV-S0-22: Non-Empty Title
```
identity.title MUST have length >= 1
```

### INV-S0-23: Label Count
```
If labels provided, labels.length MUST equal dimensions
```

---

## B.4 COMPATIBILITY INVARIANTS

### INV-S0-30: Forward Compatibility
```
Consumers MUST ignore unknown fields
```

### INV-S0-31: Backward Compatibility
```
Producers MUST NOT remove required fields without major version bump
```

### INV-S0-32: Version Range
```
If compatibility specified, min_version <= current <= max_version
```

---

## B.5 NON-ACTUATION INVARIANTS

### INV-S0-40: Read-Only
```
IR instance MUST NOT trigger side effects when parsed
```

### INV-S0-41: No Execution
```
IR fields MUST NOT contain executable code
```

### INV-S0-42: Data Only
```
IR is descriptive data only, not a command or instruction
```

---

## B.6 VALIDATION INVARIANTS

### INV-S0-50: Schema Compliance
```
Valid IR MUST pass JSON Schema validation
```

### INV-S0-51: Type Safety
```
All fields MUST match their declared types
```

### INV-S0-52: Required Fields
```
All required fields MUST be present
```

---

## B.7 INVARIANT VERIFICATION

### Test Requirement

Each invariant MUST have at least one test case in ANNEX_C.

### Violation Handling

Invariant violations MUST result in validation failure.

### Documentation

Each invariant MUST have:
- Unique identifier (INV-S0-XX)
- Clear specification
- Rationale (if non-obvious)

---

*ANNEX B - Invariants - OMEGA Standard v1.0*
