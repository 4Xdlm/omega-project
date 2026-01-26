# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA PHASE C — TEST PLAN
#   SENTINEL_JUDGE — Test Strategy & Invariants
#
#   Version: 1.1.0
#   Date: 2026-01-26
#   Status: DRAFT
#
#   Standard: NASA-Grade L4 / DO-178C Level A
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# 📋 TABLE OF CONTENTS

1. Overview
2. Test Categories
3. Test Invariants (INV-C-TEST-*)
4. Test Datasets
5. Determinism Testing (BYTE-IDENTICAL)
6. Adversarial Testing
7. Coverage Requirements
8. Execution Protocol
9. Golden Snapshots

---

# 1. OVERVIEW

## 1.1 Purpose

Ce document définit la stratégie de test AVANT toute implémentation fonctionnelle, conformément à la méthodologie TEST-FIRST d'OMEGA.

## 1.2 Principles

| Principle | Description |
|-----------|-------------|
| **Test-First** | Tests écrits AVANT code |
| **Invariant-Driven** | Chaque test prouve un invariant |
| **Byte-Identical** | RUN1 outputs bytes == RUN2 outputs bytes |
| **Adversarial** | Inputs hostiles explicitement testés |
| **Traceable** | Chaque test lié à un invariant |

---

# 2. TEST CATEGORIES

## 2.1 Unit Tests

| Component | Test File | Focus |
|-----------|-----------|-------|
| Input Gates | `gates.test.ts` | GATE_C_01 → GATE_C_09 |
| Evidence Assembler | `assembler.test.ts` | Canonicalization, hashing |
| Policy Adapter | `policy-adapter.test.ts` | Policy evaluation |
| Forge Adapter | `forge-adapter.test.ts` | Read-only, sanitization |
| Verdict Engine | `verdict-engine.test.ts` | Determination algorithm |
| Judgement Builder | `judgement-builder.test.ts` | Hash computation |
| Trace Writer | `trace-writer.test.ts` | Append-only |
| Chain Verifier | `chain-verifier.test.ts` | Integrity checks |
| Calibration Resolver | `calibration.test.ts` | Symbol resolution |

## 2.2 Integration Tests

| Test File | Focus |
|-----------|-------|
| `pipeline.test.ts` | End-to-end flow |
| `forge-integration.test.ts` | ForgeAdapter + pipeline |

## 2.3 Adversarial Tests

| Test File | Focus |
|-----------|-------|
| `hostile-inputs.test.ts` | Malformed requests |
| `edge-cases.test.ts` | Boundary conditions |
| `injection.test.ts` | Injection attempts |

## 2.4 Determinism Tests

| Test File | Focus |
|-----------|-------|
| `byte-identical.test.ts` | RUN1 bytes == RUN2 bytes |
| `canonical-json.test.ts` | JSON key sorting stability |
| `golden-snapshot.test.ts` | Output matches expected |

---

# 3. TEST INVARIANTS (INV-C-TEST-*)

## 3.1 Gate Test Invariants

| ID | Description | Test |
|----|-------------|------|
| **INV-C-TEST-01** | GATE_C_01 rejects invalid traceId | `gates.test.ts` |
| **INV-C-TEST-02** | GATE_C_02 rejects payload hash mismatch | `gates.test.ts` |
| **INV-C-TEST-03** | GATE_C_03 rejects invalid contextRef sha256 | `gates.test.ts` |
| **INV-C-TEST-04** | GATE_C_04 rejects invalid inputsDigest | `gates.test.ts` |
| **INV-C-TEST-05** | GATE_C_05 rejects empty policyBundle | `gates.test.ts` |
| **INV-C-TEST-06** | GATE_C_06 rejects invalid PolicyRef.sourceSha256 | `gates.test.ts` |
| **INV-C-TEST-07** | GATE_C_07 rejects magic numbers | `gates.test.ts` |
| **INV-C-TEST-08** | GATE_C_08 (OPTIONAL) triggers DEFER for missing evidence | `gates.test.ts` |
| **INV-C-TEST-09** | GATE_C_09 (OPTIONAL) triggers DEFER for uncalibrated threshold | `gates.test.ts` |

## 3.2 Assembler Test Invariants

| ID | Description | Test |
|----|-------------|------|
| **INV-C-TEST-10** | Assembler produces canonical JSON (sorted keys) | `assembler.test.ts` |
| **INV-C-TEST-11** | Same evidence → same inputsDigest | `assembler.test.ts` |
| **INV-C-TEST-12** | Evidence sorting is deterministic (stable sort) | `assembler.test.ts` |

## 3.3 Evaluator Test Invariants

| ID | Description | Test |
|----|-------------|------|
| **INV-C-TEST-13** | PolicyAdapter rejects missing source | `policy-adapter.test.ts` |
| **INV-C-TEST-14** | ForgeAdapter uses EmotionBridge(false) | `forge-adapter.test.ts` |
| **INV-C-TEST-15** | ForgeAdapter applies volatile sanitization | `forge-adapter.test.ts` |
| **INV-C-TEST-16** | ForgeAdapter does not mutate state | `forge-adapter.test.ts` |

## 3.4 Engine Test Invariants

| ID | Description | Test |
|----|-------------|------|
| **INV-C-TEST-17** | BLOCKER violation → REJECT | `verdict-engine.test.ts` |
| **INV-C-TEST-18** | Missing evidence (blocks) → DEFER | `verdict-engine.test.ts` |
| **INV-C-TEST-19** | Uncalibrated threshold → DEFER | `verdict-engine.test.ts` |
| **INV-C-TEST-20** | Conflict detected → APPEAL | `verdict-engine.test.ts` |
| **INV-C-TEST-21** | All pass → ACCEPT | `verdict-engine.test.ts` |

## 3.5 Builder Test Invariants

| ID | Description | Test |
|----|-------------|------|
| **INV-C-TEST-22** | Volatile fields excluded from hash | `judgement-builder.test.ts` |
| **INV-C-TEST-23** | judgementHash is recomputable | `judgement-builder.test.ts` |
| **INV-C-TEST-24** | prevJudgementHash links correctly | `judgement-builder.test.ts` |

## 3.6 Trace Test Invariants

| ID | Description | Test |
|----|-------------|------|
| **INV-C-TEST-25** | Trace is append-only | `trace-writer.test.ts` |
| **INV-C-TEST-26** | Chain verifier detects corruption | `chain-verifier.test.ts` |
| **INV-C-TEST-27** | Chain verifier detects gaps | `chain-verifier.test.ts` |

## 3.7 Integration Test Invariants

| ID | Description | Test |
|----|-------------|------|
| **INV-C-TEST-28** | Pipeline produces valid Judgement | `pipeline.test.ts` |
| **INV-C-TEST-29** | RUN1 == RUN2 (byte-identical) | `byte-identical.test.ts` |
| **INV-C-TEST-30** | Golden snapshots match | `golden-snapshot.test.ts` |

## 3.8 Adversarial Test Invariants

| ID | Description | Test |
|----|-------------|------|
| **INV-C-TEST-31** | Malformed JSON → gate rejection | `hostile-inputs.test.ts` |
| **INV-C-TEST-32** | Null bytes → gate rejection | `hostile-inputs.test.ts` |
| **INV-C-TEST-33** | Oversized payload → gate rejection | `hostile-inputs.test.ts` |
| **INV-C-TEST-34** | Empty strings → proper handling | `edge-cases.test.ts` |
| **INV-C-TEST-35** | Unicode edge cases → proper handling | `edge-cases.test.ts` |

---

# 4. TEST DATASETS

## 4.1 Dataset Files

| File | Purpose | Location |
|------|---------|----------|
| `c1_valid_requests.json` | Happy path tests | `tests/datasets/` |
| `c2_invalid_requests.json` | Gate rejection tests | `tests/datasets/` |
| `c3_adversarial.json` | Hostile input tests | `tests/datasets/` |
| `c4_edge_cases.json` | Boundary conditions | `tests/datasets/` |

## 4.2 Dataset Schema

### c1_valid_requests.json

```json
{
  "version": "1.0.0",
  "samples": [
    {
      "sample_id": "C1-001",
      "description": "Valid artifact certification request",
      "request": { /* DecisionRequest */ },
      "expected_verdict": "ACCEPT"
    }
  ]
}
```

### c2_invalid_requests.json

```json
{
  "version": "1.0.0",
  "samples": [
    {
      "sample_id": "C2-001",
      "description": "Invalid traceId format",
      "request": { /* DecisionRequest with bad traceId */ },
      "expected_gate_error": "ERR-C-GATE-01"
    }
  ]
}
```

### c3_adversarial.json

```json
{
  "version": "1.0.0",
  "samples": [
    {
      "sample_id": "C3-001",
      "description": "Null byte injection attempt",
      "request_raw": "...",
      "expected_behavior": "GATE_REJECT"
    }
  ]
}
```

---

# 5. DETERMINISM TESTING (BYTE-IDENTICAL)

## 5.1 Definition

**BYTE-IDENTICAL** means:

```
RUN1_OUTPUT_BYTES === RUN2_OUTPUT_BYTES

For all deterministic fields (excluding volatile fields).
```

This is a **stricter** requirement than "same verdict" — it requires:
- Same JSON key ordering
- Same field values
- Same hash computation
- Same byte sequence

## 5.2 Components of Byte-Identical

| Component | Requirement | Verification |
|-----------|-------------|--------------|
| **JSON Key Sorting** | Keys sorted alphabetically at all levels | `canonicalJson()` function |
| **Array Sorting** | Arrays sorted by stable criteria | Document per-array sort key |
| **Number Formatting** | No floating point variance | Use integer or fixed precision |
| **String Encoding** | UTF-8 normalized | NFC normalization |
| **Volatile Exclusion** | `submittedAt`, `executedAt`, `executionDurationMs` excluded | Explicit field list |

## 5.3 Canonical JSON Specification

```typescript
function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Sort object keys alphabetically
      return Object.keys(value).sort().reduce((sorted, k) => {
        sorted[k] = value[k];
        return sorted;
      }, {} as Record<string, unknown>);
    }
    return value;
  });
}
```

## 5.4 Byte-Identical Test Protocol

```typescript
describe("Byte-Identical Determinism", () => {
  it("RUN1 === RUN2 byte-identical for valid request", async () => {
    const request = loadDataset("c1_valid_requests.json").samples[0].request;
    
    // RUN1
    const run1 = await judge(request);
    const run1_deterministic = extractDeterministicFields(run1);
    const run1_bytes = canonicalJson(run1_deterministic);
    const run1_hash = sha256(run1_bytes);
    
    // RUN2
    const run2 = await judge(request);
    const run2_deterministic = extractDeterministicFields(run2);
    const run2_bytes = canonicalJson(run2_deterministic);
    const run2_hash = sha256(run2_bytes);
    
    // Byte-identical assertion
    expect(run1_bytes).toBe(run2_bytes);
    expect(run1_hash).toBe(run2_hash);
    expect(run1.judgementHash).toBe(run2.judgementHash);
  });
  
  it("Same input across process restarts", async () => {
    // Serialize request, restart process, deserialize, re-run
    // Verify byte-identical output
  });
});

function extractDeterministicFields(judgement: Judgement): Partial<Judgement> {
  const { executedAt, executionDurationMs, ...deterministic } = judgement;
  return deterministic;
}
```

## 5.5 What Byte-Identical DOES NOT Cover

| Excluded | Reason |
|----------|--------|
| `executedAt` | Timestamp varies |
| `executionDurationMs` | Duration varies |
| Process memory layout | Not observable |
| Execution order of parallel tasks | Not deterministic |

---

# 6. ADVERSARIAL TESTING

## 6.1 Hostile Input Categories

| Category | Examples | Expected Behavior |
|----------|----------|-------------------|
| **Malformed JSON** | Truncated, invalid syntax | Parse error, GATE_REJECT |
| **Null bytes** | `\x00` in strings | ERR-C-GATE-xx, REJECT |
| **Control chars** | `\x07`, `\x08` | Sanitize or REJECT |
| **Oversized** | >1MB payload | ERR-C-GATE-xx, REJECT |
| **Unicode edge** | ZWJ, combining marks | Proper handling |
| **Hash collision attempt** | Crafted payload | Must still verify |

## 6.2 Adversarial Test Structure

```typescript
describe("Adversarial", () => {
  const samples = loadDataset("c3_adversarial.json").samples;
  
  for (const sample of samples) {
    it(`handles ${sample.description}`, async () => {
      const result = await safeJudge(sample.request_raw);
      expect(result.behavior).toBe(sample.expected_behavior);
      // Must not crash, must not corrupt state
    });
  }
});
```

---

# 7. COVERAGE REQUIREMENTS

## 7.1 Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Line coverage | ≥ 90% | NASA-Grade requirement |
| Branch coverage | ≥ 85% | DO-178C Level A |
| Invariant coverage | 100% | All INV-C-* must have ≥1 test |
| Test invariant coverage | 100% | All INV-C-TEST-* must pass |

## 7.2 Coverage Verification

```bash
# Run tests with coverage
npm test -- --coverage

# Verify invariant coverage
node scripts/verify-invariant-coverage.js
```

---

# 8. EXECUTION PROTOCOL

## 8.1 Test Order

```
1. Unit tests (fast, isolated)
2. Integration tests (pipeline)
3. Adversarial tests (hostile inputs)
4. Determinism tests (byte-identical)
5. Golden snapshot tests
```

## 8.2 CI Integration

```yaml
# .github/workflows/phase-c-tests.yml
name: Phase C Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:adversarial
      - run: npm run test:determinism
```

## 8.3 Pre-Certification Checklist

```
□ All unit tests pass
□ All integration tests pass
□ All adversarial tests pass
□ All determinism tests pass (byte-identical)
□ Coverage targets met
□ Golden snapshots verified
□ No flaky tests
```

---

# 9. GOLDEN SNAPSHOTS

## 9.1 Purpose

Golden snapshots capture expected output for known inputs. They enable regression detection.

## 9.2 Snapshot Structure

```
tests/datasets/c4_golden_snapshots/
├── request_001.json          ← Input
├── judgement_001.json        ← Expected output (golden)
├── request_002.json
├── judgement_002.json
└── SNAPSHOT_MANIFEST.sha256
```

## 9.3 Snapshot Verification

```typescript
describe("Golden Snapshots", () => {
  const snapshots = loadSnapshotManifest();
  
  for (const [requestFile, expectedFile] of snapshots) {
    it(`matches ${requestFile}`, async () => {
      const request = loadJson(requestFile);
      const expected = loadJson(expectedFile);
      
      const actual = await judge(request);
      
      // Compare deterministic fields (byte-identical)
      const actualDet = extractDeterministicFields(actual);
      const expectedDet = extractDeterministicFields(expected);
      
      expect(canonicalJson(actualDet)).toBe(canonicalJson(expectedDet));
      expect(actual.judgementHash).toBe(expected.judgementHash);
    });
  }
});
```

## 9.4 Snapshot Update Protocol

```
1. Run tests with --update-snapshots
2. Review ALL changes manually
3. Verify changes are intentional
4. Update SNAPSHOT_MANIFEST.sha256
5. Commit with "test: update golden snapshots [reason]"
```

---

# 📜 REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-26 | Initial test plan (DRAFT) |
| 1.1.0 | 2026-01-26 | Added byte-identical specification (§5), updated invariants |

---

# 📜 SEAL

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║  TEST_PLAN_PHASE_C v1.1.0                                                                             ║
║  Date: 2026-01-26                                                                                     ║
║  Status: DRAFT                                                                                        ║
║                                                                                                       ║
║  35 Test Invariants defined (INV-C-TEST-01 → INV-C-TEST-35)                                           ║
║  TEST-FIRST methodology: Tests written BEFORE implementation                                          ║
║  BYTE-IDENTICAL requirement: RUN1 bytes == RUN2 bytes                                                 ║
║                                                                                                       ║
║  Standard: NASA-Grade L4 / DO-178C Level A                                                            ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```
