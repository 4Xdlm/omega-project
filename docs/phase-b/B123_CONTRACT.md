# ═══════════════════════════════════════════════════════════════════════════════════════════════════════
#
#   OMEGA PHASE B — CONTRACT SPECIFICATION
#   B123_CONTRACT.md
#
#   Version: 1.1.0
#   Date: 2026-01-26
#   Status: AUTHORITATIVE
#
#   AUDIT: ChatGPT hostile review 2026-01-26
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════════

# 📋 TABLE OF CONTENTS

1. Purpose
2. Scope
3. Input Gates
4. Output Artifacts
5. Determinism Rules
6. **Volatile Fields Exclusion** ← NEW v1.1.0
7. **Stability Definition** ← NEW v1.1.0
8. Invariants
9. Schema References
10. Calibration Binding
11. **Import Strategy** ← NEW v1.1.0

---

# 1. PURPOSE

This contract defines the **exact specification** for Phase B (B1/B2/B3) execution:
- What inputs are required
- What outputs must be produced
- What invariants must hold
- How determinism is enforced

**Any implementation that does not conform to this contract is INVALID.**

---

# 2. SCOPE

## 2.1 What Phase B Tests

| Phase | Name | Purpose |
|-------|------|---------|
| B1 | Stability at Scale | Prove GENESIS FORGE produces deterministic results over N iterations |
| B2 | Adversarial Robustness | Prove GENESIS FORGE handles hostile inputs without explosion |
| B3 | Cross-Validation | Prove RUN1 == RUN2 (determinism across runs) |

## 2.2 What Phase B Does NOT Test

- Emotional accuracy (no "expected_emotion" oracle)
- Semantic quality (no "good/bad" judgment)
- Performance benchmarks (no timing requirements)

**Rationale**: Canon emotion model is not frozen. Testing against unfrozen oracle = magic numbers.

---

# 3. INPUT GATES

## 3.1 Required Inputs

| Input | Path | Validation |
|-------|------|------------|
| Phase A Root Hash | `docs/phase-a/PHASE_A_ROOT_MANIFEST.sha256` | Must exist, non-empty |
| Calibration | `tools/calibration/B123_calibration.json` | Must exist, valid JSON, NO "REQUIRED" literals |
| Genesis Forge | `genesis-forge/` | Must be importable, API probe must pass |
| B1 Dataset | `tools/harness_official/datasets/b1_stability.json` | Must exist, valid schema |
| B2 Dataset | `tools/harness_official/datasets/b2_adversarial.json` | Must exist, valid schema |

## 3.2 Gate Checks (MUST PASS before execution)

```
GATE_1: File.exists(PHASE_A_ROOT_MANIFEST.sha256) === true
GATE_2: File.exists(B123_calibration.json) === true
GATE_3: B123_calibration.json.contains('"REQUIRED"') === false
GATE_4: GENESIS_FORGE_API_PROBE.status === "PASS"
GATE_5: Dataset.validate(b1_stability.json, B1_DATASET_SCHEMA) === true
GATE_6: Dataset.validate(b2_adversarial.json, B2_DATASET_SCHEMA) === true
```

**If ANY gate fails → EXECUTION BLOCKED**

---

# 4. OUTPUT ARTIFACTS

## 4.1 Directory Structure

```
nexus/proof/phase_b/
├── b1/
│   ├── B1_PAYLOAD_RUN1.json      ← Canonical JSON, deterministic
│   ├── B1_PAYLOAD_RUN2.json      ← Must produce identical results array
│   ├── B1_REPORT_RUN1.md         ← Human-readable report
│   ├── B1_REPORT_RUN2.md
├── b2/
│   ├── B2_PAYLOAD_RUN1.json
│   ├── B2_PAYLOAD_RUN2.json
│   ├── B2_REPORT_RUN1.md
│   ├── B2_REPORT_RUN2.md
├── b3/
│   ├── B3_CROSSRUN_REPORT.json   ← Cross-validation results
│   ├── B3_CROSSRUN_REPORT.md
│   └── B3_SIGNATURE_DIGEST.txt   ← Final signature
├── B_FINAL_MANIFEST.sha256       ← SHA256 of all artifacts (sorted)
└── B_CERTIFICATION_SEAL.md       ← Certification document
```

## 4.2 Payload Format (B1/B2)

```json
{
  "phase": "B1",
  "mode": "RUN1",
  "rootA": "<sha256 from PHASE_A_ROOT_MANIFEST>",
  "calibration_sha256": "<sha256 of calibration file>",
  "dataset_sha256": "<sha256 of dataset file>",
  "results": [
    {
      "sample_id": "B1-001",
      "iterations": "<calibration.N_LONG_REPEAT>",
      "stable": true,
      "analysis_hash": "<sha256 of SANITIZED canonical analysis>"
    }
  ],
  "verdict": "PASS|FAIL",
  "invariants": {
    "no_throw": true,
    "schema_valid": true,
    "deterministic": true
  }
}
```

**Note**: `mode` field differs between RUN1/RUN2. Determinism is verified on `results` array only.

## 4.3 B3 Signature Format

```
B3_SIGNATURE_SHA256 <sha256>
```

Where `<sha256>` = SHA256 of canonical JSON containing only RESULTS hashes:
```json
{
  "B1_results_hash": "<sha256 of B1 results array>",
  "B2_Village_hash": "<sha256 of B2 results array>",
  "B1_match": true,
  "B2_match": true,
  "verdict": "PASS|FAIL"
}
```

---

# 5. DETERMINISM RULES

## 5.1 Canonical JSON

All JSON outputs MUST use canonical serialization:
- Keys sorted alphabetically (recursive)
- No trailing whitespace
- UTF-8 encoding without BOM
- 2-space indentation
- No trailing newline in hash input

```javascript
function sortKeys(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeys(obj[key]);
  }
  return sorted;
}

function canonicalJson(obj) {
  return JSON.stringify(sortKeys(obj), null, 2);
}
```

## 5.2 Hash Computation

All hashes use SHA-256:
```javascript
import { createHash } from "node:crypto";
function sha256(s) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}
```

## 5.3 No Non-Deterministic Elements

FORBIDDEN in payloads:
- `Date.now()`
- `Math.random()`
- UUIDs (unless seeded)
- Timestamps
- Execution duration
- Memory usage

---

# 6. VOLATILE FIELDS EXCLUSION (NEW v1.1.0)

## 6.1 Problem Statement

`EmotionAnalysisResult` from Genesis Forge contains fields that vary between executions even for identical inputs.

## 6.2 Volatile Fields (EXCLUDED from hash)

| Field | Type | Reason |
|-------|------|--------|
| `durationMs` | `number` | Execution time varies |
| `cached` | `boolean` | Cache state varies between runs |

## 6.3 Deterministic Fields (INCLUDED in hash)

| Field | Type | Determinism |
|-------|------|-------------|
| `state` | `EmotionState14D` | ✅ Pure function output |
| `state.dimensions` | `Record<Emotion14, number>` | ✅ |
| `state.valence` | `number` | ✅ |
| `state.arousal` | `number` | ✅ |
| `state.dominance` | `number` | ✅ |
| `confidence` | `number` | ✅ Pure function output |
| `method` | `string` | ✅ Always "heuristic" for fresh analysis |

## 6.4 Sanitization Function (MANDATORY)

```javascript
function sanitizeForHash(result) {
  return {
    state: result.state,
    confidence: result.confidence,
    method: result.method
    // EXCLUDED: durationMs, cached
  };
}

function hashAnalysisResult(result) {
  return sha256(canonicalJson(sanitizeForHash(result)));
}
```

## 6.5 Verification

The harness MUST:
1. Create `EmotionBridge(false)` to disable cache
2. Apply sanitization BEFORE hashing
3. Hash ONLY the sanitized object

---

# 7. STABILITY DEFINITION (NEW v1.1.0)

## 7.1 Formal Definition

A sample is **STABLE** if and only if:

```
∀i,j ∈ [1, N_LONG_REPEAT]: hash(sanitize(run(i))) === hash(sanitize(run(j)))
```

Where:
- `run(i)` = i-th execution of `analyzeEmotion(text)`
- `sanitize()` = Remove volatile fields (§6.4)
- `hash()` = SHA-256 of canonical JSON

## 7.2 Implementation

```javascript
const hashes = [];
for (let i = 0; i < N_LONG_REPEAT; i++) {
  const result = bridge.analyzeEmotion(sample.text);
  const sanitized = { state: result.state, confidence: result.confidence, method: result.method };
  hashes.push(sha256(canonicalJson(sanitized)));
}
const stable = hashes.every(h => h === hashes[0]);
```

## 7.3 Distinction

| Term | Definition |
|------|------------|
| **Stable** | All N iterations produce identical sanitized hash |
| **No-throw** | Execution completes without exception |
| **Deterministic** | RUN1 and RUN2 produce identical results arrays |

These are THREE DIFFERENT invariants. A sample can be no-throw but unstable.

---

# 8. INVARIANTS

## 8.1 B1 Invariants

| ID | Invariant | Check |
|----|-----------|-------|
| B1-INV-001 | No throw on valid input | `try/catch` wrapper, no exceptions |
| B1-INV-002 | Schema compliance | `schema.validate(payload) === true` |
| B1-INV-003 | Determinism | `hash(RUN1.results) === hash(RUN2.results)` |
| B1-INV-004 | Stability | For each sample: all N iterations produce same sanitized hash |

## 8.2 B2 Invariants

| ID | Invariant | Check |
|----|-----------|-------|
| B2-INV-001 | No throw on adversarial input | `try/catch` wrapper, no exceptions |
| B2-INV-002 | Schema compliance | `schema.validate(payload) === true` |
| B2-INV-003 | Determinism | `hash(RUN1.results) === hash(RUN2.results)` |

## 8.3 B3 Invariants

| ID | Invariant | Check |
|----|-----------|-------|
| B3-INV-001 | B1 determinism | `B1_RUN1_results_hash === B1_RUN2_results_hash` |
| B3-INV-002 | B2 determinism | `B2_RUN1_results_hash === B2_RUN2_results_hash` |
| B3-INV-003 | Signature stability | Same inputs → same signature |

---

# 9. SCHEMA REFERENCES

Schemas are defined in:
- `docs/phase-b/schema/B1_PAYLOAD.schema.json`
- `docs/phase-b/schema/B2_PAYLOAD.schema.json`
- `docs/phase-b/schema/B3_REPORT.schema.json`
- `docs/phase-b/schema/B1_DATASET.schema.json`
- `docs/phase-b/schema/B2_DATASET.schema.json`

---

# 10. CALIBRATION BINDING

## 10.1 Rule

**NO MAGIC NUMBERS.** All numeric thresholds come from calibration or are explicit symbols.

## 10.2 Binding Table

| Parameter | Source | Usage |
|-----------|--------|-------|
| N_LONG_REPEAT | `calibration.N_LONG_REPEAT` | B1: Number of iterations per sample |
| N_STEPS | `calibration.N_STEPS` | Reserved for future use |
| STEP_SIZE | `calibration.STEP_SIZE` | Reserved for future use |
| DRIFT_THRESHOLD | `calibration.DRIFT_THRESHOLD` | B1: Stability threshold (if used) |

## 10.3 Current Calibration Values

Source: `tools/calibration/B123_calibration.json`

**Note**: Current values are BOOTSTRAP MINIMAL. They will be refined after A5 calibration.

---

# 11. IMPORT STRATEGY (NEW v1.1.0)

## 11.1 Current Setup

Genesis Forge is NOT a published npm package. It exists as a local directory in the monorepo.

## 11.2 Import Path

```javascript
import { EmotionBridge } from "../../genesis-forge/src/genesis/index.js";
```

**Rationale**: 
- No `exports` field in genesis-forge/package.json
- No npm workspace linking configured
- Relative path to barrel export (index.js) is the only option

## 11.3 Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Path changes on refactor | MEDIUM | Document path in API_PROBE, update on change |
| Deep import into internals | LOW | Using barrel export (index.js), not deep files |
| TypeScript issues | MEDIUM | Use MJS + tsx runtime, avoid tsc compilation |

## 11.4 Recommendation for Future

When Phase B is stable, consider:
1. Adding `"exports"` field to genesis-forge/package.json
2. Setting up npm workspace linking
3. Using package name import (`import { ... } from "genesis-forge"`)

**For now**: Relative path to barrel export is ACCEPTABLE.

---

# 📜 REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-25 | Initial contract |
| 1.1.0 | 2026-01-26 | Added §6 Volatile Fields, §7 Stability Definition, §11 Import Strategy (ChatGPT audit) |

---

# 📜 SEAL

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║  B123_CONTRACT v1.1.0                                                                                 ║
║  Date: 2026-01-26                                                                                     ║
║  Status: AUTHORITATIVE                                                                                ║
║                                                                                                       ║
║  Audit: ChatGPT hostile review 2026-01-26                                                             ║
║  Changes: Volatile fields exclusion, Stability definition, Import strategy                            ║
║                                                                                                       ║
║  Any implementation not conforming to this contract is INVALID.                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
```
