# ANNEX C: CONFORMITY TESTS

**Standard**: Emotional DNA IR v1.0
**Document**: Conformity Test Suite

---

## C.1 TEST CATEGORIES

### C.1.1 Schema Validation Tests

| Test ID | Description | Input | Expected |
|---------|-------------|-------|----------|
| CT-001 | Minimal valid IR | Valid minimal | PASS |
| CT-002 | Full valid IR | Valid full | PASS |
| CT-003 | Missing version | No version field | FAIL |
| CT-004 | Missing identity | No identity field | FAIL |
| CT-005 | Missing emotional_axes | No emotional_axes | FAIL |
| CT-006 | Missing provenance | No provenance field | FAIL |

### C.1.2 Type Validation Tests

| Test ID | Description | Input | Expected |
|---------|-------------|-------|----------|
| CT-010 | Invalid version format | "2.0.0" | FAIL |
| CT-011 | Invalid hash (short) | 32-char hash | FAIL |
| CT-012 | Invalid hash (uppercase) | "ABCD..." | FAIL |
| CT-013 | Invalid language | "english" | FAIL |
| CT-014 | Values out of range | value=1.5 | FAIL |
| CT-015 | Dimension mismatch | dim=5, len=3 | FAIL |

### C.1.3 Semantic Validation Tests

| Test ID | Description | Input | Expected |
|---------|-------------|-------|----------|
| CT-020 | Empty title | title="" | FAIL |
| CT-021 | Title too long | 501 chars | FAIL |
| CT-022 | Negative dimensions | dim=-1 | FAIL |
| CT-023 | Zero dimensions | dim=0 | FAIL |
| CT-024 | Invalid timestamp | "yesterday" | FAIL |

---

## C.2 DETERMINISM TESTS

### C.2.1 Canonicalization Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| CT-030 | Same IR, same canonical | hash(c1) == hash(c2) |
| CT-031 | Key order independence | canonical stable |
| CT-032 | Null removal | no nulls in output |
| CT-033 | Whitespace minimal | no extra whitespace |

### C.2.2 Hash Stability Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| CT-040 | Repeated hash | 10x same result |
| CT-041 | Cross-implementation | reference hash match |

---

## C.3 TEST VECTORS

### C.3.1 Minimal Valid IR

```json
{
  "version": "1.0.0",
  "identity": {
    "id": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "title": "Test",
    "language": "en"
  },
  "emotional_axes": {
    "dimensions": 1,
    "values": [0.0]
  },
  "provenance": {
    "source_hash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "analyzer_version": "test@1.0.0",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

**Expected**: VALID

### C.3.2 Invalid: Missing Required

```json
{
  "version": "1.0.0",
  "identity": {
    "id": "aaaa...",
    "title": "Test",
    "language": "en"
  }
}
```

**Expected**: INVALID (missing emotional_axes, provenance)

### C.3.3 Invalid: Value Out of Range

```json
{
  "version": "1.0.0",
  "identity": { "id": "aaa...", "title": "Test", "language": "en" },
  "emotional_axes": { "dimensions": 1, "values": [2.0] },
  "provenance": { "source_hash": "bbb...", "analyzer_version": "x", "timestamp": "2026-01-01T00:00:00Z" }
}
```

**Expected**: INVALID (value 2.0 > 1.0)

---

## C.4 CONFORMITY LEVELS

### BASIC Level

Pass tests: CT-001 to CT-006

### STANDARD Level

Pass tests: CT-001 to CT-024, CT-030 to CT-033

### FULL Level

Pass all tests: CT-001 to CT-041

---

## C.5 TEST EXECUTION

### Running Tests

```bash
npx vitest run nexus/standards/EMOTIONAL_DNA_v1.0/IR/validator.test.ts
```

### Expected Output

```
✓ Valid Cases > accepts minimal valid IR
✓ Valid Cases > accepts full valid IR
✓ Invalid Cases - Schema > rejects missing required fields
✓ Invalid Cases - Schema > rejects invalid version format
...
```

---

*ANNEX C - Conformity Tests - OMEGA Standard v1.0*
