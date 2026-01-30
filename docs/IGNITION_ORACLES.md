# OMEGA Ignition Oracles

## Overview

Ignition oracles are deterministic checks that must pass before any release or deployment.
They replace stdout-based verification (which is non-deterministic due to timestamps and timing)
with structured, hashable artifacts.

## Decision Context

Per `DEC_ALLUMAGE_DETERMINISM.md`:
- **stdout hashing is NOT an oracle** (non-deterministic by design)
- **ORACLE-1 + ORACLE-2 are MANDATORY** for ignition
- **ORACLE-X is OPTIONAL** additional proof (radical variant)
- **ORACLE-3 (stdout archive)** is NON-BLOCKING (archived only, never blocks)

## Oracles

### ORACLE-1: Structured Test Report

**Purpose**: Verify all tests are tracked with canonical, deterministic output.

**What it does**:
1. Runs `vitest run --reporter=json`
2. Parses JSON output
3. Removes volatile fields (duration, timestamp, seed)
4. Sorts results lexicographically (file > suite > name)
5. Outputs canonical JSON

**Command**: `npm run oracle:tests`

**Output**:
- `artefacts/oracles/test_report.raw.json` - Raw vitest output
- `artefacts/oracles/test_report.canon.json` - Canonical report
- `artefacts/oracles/test_report.canon.sha256` - Hash of canonical report

**Determinism**: Volatile fields removed; results sorted. Same tests = same hash.

---

### ORACLE-2: Production Artefact Manifest

**Purpose**: Verify production build artifacts are deterministic.

**What it does**:
1. Hashes production files (`dist/runner/main.js`, `dist/auditpack/index.js`)
2. Creates manifest with format: `SHA256  path  size`
3. Sorts by path for determinism
4. Compares to committed baseline

**Command**: `npm run oracle:dist`

**Output**:
- `artefacts/oracles/dist_manifest.txt` - Manifest file
- `artefacts/oracles/dist_manifest.sha256` - Hash of manifest

**Baseline**: `baselines/oracles/dist_manifest.expected.sha256`

**Determinism**: Same source code = same build = same hash.

---

### ORACLE-X: Runtime Artifact Manifest (Radical)

**Purpose**: Prove runtime determinism via output file hashing (not stdout).

**What it does**:
1. Executes runner with `intents/intent_mvp.json`
2. Hashes all output files in run directory
3. Creates manifest with format: `SHA256  path  size`
4. Sorts by path for determinism

**Command**: `npm run oracle:runtime`

**Output**:
- `artefacts/oracles/runtime_manifest.txt` - Manifest file
- `artefacts/oracles/runtime_manifest.sha256` - Hash of manifest

**Determinism**: Same intent + same code = same output files = same hash.

---

## Running Ignition

### Full Ignition (All Oracles)

```bash
npm run ignition
```

This runs:
1. ORACLE-2 (dist manifest)
2. ORACLE-1 (test report)
3. ORACLE-X (runtime manifest)

### Individual Oracles

```bash
npm run oracle:dist     # ORACLE-2 only
npm run oracle:tests    # ORACLE-1 only
npm run oracle:runtime  # ORACLE-X only
```

### Updating Baselines

After intentional changes to production code:

```bash
# Build first
npm run build

# Update baseline
npm run ignition:update-baselines

# Commit
git add baselines/
git commit -m "chore(baselines): update oracle baselines - <reason>"
```

---

## CI Integration

Add to CI workflow:

```yaml
- name: Build
  run: npm run build

- name: Test
  run: npm test

- name: Ignition Gate
  run: npm run ignition
```

The ignition gate runs after build and test. Any oracle failure blocks merge.

---

## Failure Modes

### ORACLE-2 Baseline Mismatch

**Symptom**: `ORACLE-2: BASELINE MISMATCH`

**Cause**: Production build changed but baseline wasn't updated.

**Fix**:
1. If change is intentional: `npm run ignition:update-baselines && git commit`
2. If change is accidental: investigate what changed in build

### ORACLE-1 Hash Changed

**Symptom**: ORACLE-1 hash differs between runs with same tests.

**Cause**: Something volatile is leaking into canonical output.

**Fix**: Check canonicalizer for missed volatile fields.

### ORACLE-X Hash Changed

**Symptom**: ORACLE-X hash differs between runs with same intent.

**Cause**: Runner output is non-deterministic.

**Fix**: Check for timestamps, random values, or non-sorted output.

---

## Architecture

```
tools/oracles/
├── types.ts                    # Shared types
├── canonicalizer.ts            # Volatile field removal
├── oracle_dist_manifest.ts     # ORACLE-2
├── oracle_test_report.ts       # ORACLE-1
├── oracle_runtime_manifest.ts  # ORACLE-X
└── ignition.ts                 # Master script

baselines/oracles/
├── dist_manifest.expected.sha256  # ORACLE-2 baseline
└── README.md                      # Policy docs

artefacts/oracles/                 # Generated at runtime
├── dist_manifest.txt
├── dist_manifest.sha256
├── test_report.raw.json
├── test_report.canon.json
├── test_report.canon.sha256
├── runtime_manifest.txt
├── runtime_manifest.sha256
└── ignition_summary.json

tests/oracles/
├── oracle_dist_manifest.test.ts
├── oracle_test_report.test.ts (optional)
├── canonicalizer.test.ts
├── mm3_fixtures.test.ts
├── mm4_capsule.test.ts
└── mm5_batch.test.ts
```

---

## Compliance

This oracle system satisfies:
- **NASA-Grade L4**: Deterministic, hashable, auditable outputs
- **DO-178C**: Traceability from requirement to test to evidence
- **OMEGA Golden Rules**: PROVE IT, TEST IT, TRACE IT
