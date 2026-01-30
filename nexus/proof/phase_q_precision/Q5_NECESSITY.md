# Q5_NECESSITY — Output Necessity Analysis

## RUN_ID
```
19C10E1FE7800000
```

## OUTPUT ARTIFACTS INVENTORY

From `EVIDENCE/golden/latest_run/`:

| File | Size | Purpose |
|------|------|---------|
| intent.json | ~300B | Copy of input intent |
| contract.json | ~200B | Generation contract (text + timestamp) |
| truthgate_verdict.json | ~150B | Validation result |
| truthgate_proof.json | ~100B | Validation proof |
| delivery_manifest.json | ~200B | Delivery metadata |
| hashes.txt | ~500B | SHA256 of all hashable files |
| run_hash.txt | 64B | Hash of hashes.txt |
| run_report.md | ~1KB | Human-readable report |
| artifacts/output.txt | Variable | Generated output text |

Total: 9 files produced per run.

## NECESSITY ANALYSIS

### Method
Determine if each output is consumed by downstream operations (verify, capsule).

### N1: intent.json — NECESSARY

**Consumer**: `verify` command
**Test**: Verify recomputes hash of intent.json and compares to hashes.txt
**Evidence**: Verify checks 12 files including intent.json
**Verdict**: ✅ NECESSARY (hash integrity)

---

### N2: contract.json — NECESSARY

**Consumer**: `verify` command
**Test**: Verify recomputes hash of contract.json
**Evidence**: Listed in HASHABLE_FILES constant
**Verdict**: ✅ NECESSARY (hash integrity)

---

### N3: truthgate_verdict.json — NECESSARY

**Consumer**: `verify` command, downstream audit
**Test**: Verify recomputes hash
**Evidence**: Listed in HASHABLE_FILES constant
**Verdict**: ✅ NECESSARY (hash integrity + audit trail)

---

### N4: truthgate_proof.json — NECESSARY

**Consumer**: `verify` command
**Test**: Verify recomputes hash
**Evidence**: Listed in HASHABLE_FILES constant
**Verdict**: ✅ NECESSARY (hash integrity)

---

### N5: delivery_manifest.json — NECESSARY

**Consumer**: `verify` command, `capsule` command
**Test**: Verify recomputes hash; Capsule includes it
**Evidence**: Listed in HASHABLE_FILES constant
**Verdict**: ✅ NECESSARY (hash integrity + packaging)

---

### N6: hashes.txt — CRITICAL

**Consumer**: `verify` command (primary reference)
**Test**: Verify compares computed hashes against this file
**Evidence**: Verify output shows "Files checked: 12, Files valid: 12"
**Verdict**: ✅ CRITICAL (integrity anchor)

---

### N7: run_hash.txt — NECESSARY

**Consumer**: External verification, capsule integrity
**Test**: Single hash representing entire run
**Evidence**: Displayed in stdout, used for capsule naming
**Verdict**: ✅ NECESSARY (single-point integrity check)

---

### N8: run_report.md — OPTIONAL

**Consumer**: Human readers only
**Test**: Not consumed by verify or capsule programmatically
**Evidence**: Not in HASHABLE_FILES
**Verdict**: ⚠️ OPTIONAL (human convenience, not machine-critical)

---

### N9: artifacts/output.txt — NECESSARY

**Consumer**: `verify` command, end user
**Test**: Verify recomputes hash
**Evidence**: Listed in hashes.txt
**Verdict**: ✅ NECESSARY (primary deliverable)

---

## NECESSITY MATRIX

| File | Machine Consumer | Hash Verified | Verdict |
|------|------------------|---------------|---------|
| intent.json | verify | ✅ | NECESSARY |
| contract.json | verify | ✅ | NECESSARY |
| truthgate_verdict.json | verify | ✅ | NECESSARY |
| truthgate_proof.json | verify | ✅ | NECESSARY |
| delivery_manifest.json | verify, capsule | ✅ | NECESSARY |
| hashes.txt | verify | ✅ | CRITICAL |
| run_hash.txt | capsule, external | ✅ | NECESSARY |
| run_report.md | — | ❌ | OPTIONAL |
| artifacts/output.txt | verify, user | ✅ | NECESSARY |

## REDUNDANCY CHECK

**Question**: Can any file be removed without breaking verify?

**Answer**: NO. All HASHABLE_FILES are required by verify. Removing any would cause "Files valid" count to decrease.

**Evidence**: Verify reports "Files checked: 12, Files valid: 12"

## VERDICT

| Criterion | Status |
|-----------|--------|
| All hash-verified files necessary | ✅ YES |
| Redundant outputs found | ❌ NONE (except run_report.md) |
| Critical missing outputs | ❌ NONE |

PASS
