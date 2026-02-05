# EMOTIONAL DNA IR SPECIFICATION v1.0

**Standard**: OMEGA Emotional DNA Intermediate Representation
**Version**: 1.0.0
**Status**: DRAFT
**Date**: 2026-02-05

---

## 1. OVERVIEW

The Emotional DNA IR (Intermediate Representation) is a machine-first format for encoding the emotional and stylistic genome of narrative works. It provides a standardized, deterministic, and verifiable representation of emotional content analysis.

### 1.1 Design Principles

1. **Machine-First**: Designed for programmatic consumption before human readability
2. **Deterministic**: Same input produces identical output (hashable)
3. **Non-Actuating**: IR describes; it does not trigger actions
4. **Versioned**: Explicit compatibility rules for evolution
5. **Verifiable**: All data traceable to source via hashes

---

## 2. STRUCTURE

### 2.1 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Schema version (semver: 1.0.x) |
| `identity` | object | Work identification |
| `emotional_axes` | object | Emotional vector representation |
| `provenance` | object | Source and analysis metadata |

### 2.2 Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `style_signatures` | object | Rhythm, density, register |
| `constraints` | object | Taboos, bounds, arc rules |
| `compatibility` | object | Version range support |
| `proofs` | object | Hash chain evidence |

---

## 3. FIELD SPECIFICATIONS

### 3.1 Identity

```json
{
  "id": "<sha256>",
  "title": "Work Title",
  "language": "en",
  "work_version": "1.0"
}
```

- `id`: SHA256 hash computed from canonical representation
- `language`: ISO 639-1 code (e.g., "en", "fr", "de")

### 3.2 Emotional Axes

```json
{
  "dimensions": 14,
  "values": [0.5, -0.2, 0.8, ...],
  "labels": ["joy", "sadness", "anger", ...],
  "confidence": 0.92
}
```

- `dimensions`: Fixed at runtime (default: 14 for Emotion14 model)
- `values`: Normalized to [-1.0, 1.0]
- `confidence`: Analysis confidence [0.0, 1.0]

### 3.3 Provenance

```json
{
  "source_hash": "<sha256 of source text>",
  "analyzer_version": "omega-genome@5.0.0",
  "timestamp": "2026-02-05T12:00:00.000Z",
  "license": "analysis-permitted",
  "consent": true
}
```

---

## 4. CONSTRAINTS

### 4.1 No Magic Numbers

All constants must be:
- Declared as parameters, OR
- Defined as "calibrated at runtime", OR
- Justified in ANNEX_A_MATHEMATICAL_MODEL.md

### 4.2 Determinism

Requirements:
- Arrays sorted alphabetically where applicable
- Floating point rounded to 6 decimal places
- Timestamps in UTC ISO 8601 format
- Hashes lowercase hexadecimal

### 4.3 Validation

Every IR instance must be validatable against the JSON Schema.

---

## 5. CANONICALIZATION

To compute deterministic hashes:

1. Remove optional fields with null/undefined values
2. Sort object keys alphabetically
3. Serialize with minimal whitespace
4. Encode as UTF-8
5. Compute SHA256

```typescript
function canonicalize(ir: EmotionalDNA_IR): string {
  const sorted = sortKeysDeep(removeNulls(ir));
  return JSON.stringify(sorted);
}
```

---

## 6. COMPATIBILITY

### 6.1 Version Rules

- **MAJOR**: Breaking changes to required fields
- **MINOR**: New optional fields, deprecations
- **PATCH**: Bug fixes, documentation

### 6.2 Forward Compatibility

Consumers MUST ignore unknown fields.

### 6.3 Backward Compatibility

Producers MUST include deprecated fields during transition period.

---

## 7. REFERENCES

- JSON Schema: `EMOTIONAL_DNA_IR_SCHEMA.json`
- Mathematical Model: `ANNEX_A_MATHEMATICAL_MODEL.md`
- Invariants: `ANNEX_B_INVARIANTS.md`
- Conformity Tests: `ANNEX_C_CONFORMITY_TESTS.md`
- Compatibility Matrix: `ANNEX_D_COMPATIBILITY_MATRIX.md`

---

*OMEGA Emotional DNA Standard v1.0 - NASA-Grade / DO-178C Level A*
