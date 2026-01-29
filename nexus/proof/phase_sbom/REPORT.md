# PHASE SBOM — SUPPLY CHAIN PROOF — REPORT

## Metadata

| Field | Value |
|-------|-------|
| Phase | SBOM |
| Date | 2026-01-29T02:19:00Z |
| Verdict | **PASS** (with warnings) |
| Base Commit | efe8161 |
| Prerequisite | Phase Z SEALED |

## Mission

Prove the integrity of the OMEGA supply chain through lockfile audit, dependency hashing, and drift detection. Generate a complete SBOM with verifiable hashes.

## Deliverables

| Artifact | Path | SHA-256 |
|----------|------|---------|
| generator.cjs | packages/sbom/generator.cjs | 31E4DFF0F208C78C0F861249CB2A5A6A4754342DC86D29C407A5C907C73AB03E |
| sbom.test.ts | packages/sbom/__tests__/sbom.test.ts | E1376192984A6CC848F29AC21EB6BD062CC7108CDA1B96AAB7852D37D799F17E |
| SBOM.json | nexus/proof/phase_sbom/SBOM.json | 0ACA01511BD35EBD28F86E88159F5CF6C61C7F4A3FC5483C2C7651596B7B8D34 |

## SBOM Summary

| Metric | Value |
|--------|-------|
| Total Dependencies | 467 |
| Production Dependencies | 116 |
| Dev Dependencies | 351 |
| Optional Dependencies | 0 |
| Lockfile Version | 3 |

## Warnings

### Floating Versions Detected

The following packages in package.json use floating versions:

| Package | Version | Type |
|---------|---------|------|
| archiver | ^7.0.1 | production |
| fast-json-stable-stringify | ^2.1.0 | production |
| @types/archiver | ^7.0.0 | dev |
| @vitest/coverage-v8 | ^4.0.17 | dev |
| esbuild | ^0.27.2 | dev |
| tsx | ^4.21.0 | dev |
| vitest | ^4.0.17 | dev |
| zod | ^3.23.8 | dev |

**Note**: While floating versions are present in package.json, the package-lock.json pins exact versions ensuring reproducible builds.

## Tests Executed

| Level | Description | Count | Pass | Fail |
|-------|-------------|-------|------|------|
| L0 | Floating Detection | 10 | 10 | 0 |
| L1 | Generation | 5 | 5 | 0 |
| L1 | Verification | 3 | 3 | 0 |
| L1 | Drift Detection | 4 | 4 | 0 |
| L4 | Determinism | 3 | 3 | 0 |
| **Total** | | **25** | **25** | **0** |

## Features

### SBOM Generator
- Zero external dependencies
- Generates OMEGA-SBOM format
- Computes lockfile SHA-256
- Includes integrity hash for tamper detection

### Verification
- Verifies lockfile hash matches SBOM
- Verifies SBOM integrity (tamper detection)
- Verifies dependency count

### Drift Detection
- Detects added dependencies
- Detects removed dependencies
- Detects version changes

## CLI Usage

```bash
# Generate SBOM
node generator.cjs generate --output sbom.json

# Generate with floating versions allowed
node generator.cjs generate --allow-floating --output sbom.json

# Verify SBOM
node generator.cjs verify sbom.json

# Detect drift
node generator.cjs drift baseline.json current.json
```

## Invariants Verified

| ID | Status | Description |
|----|--------|-------------|
| SUPPLY-INV-01 | ✅ PASS | Lockfile present |
| SUPPLY-INV-02 | ⚠️ WARN | Floating versions detected (documented) |
| SUPPLY-INV-03 | ✅ PASS | SBOM reproducible |
| SUPPLY-INV-04 | ✅ PASS | SBOM deterministic |

## Verification Proof

```
VERIFICATION RESULTS:
  ✓ Lockfile hash
  ✓ SBOM integrity
  ✓ Dependency count

VERDICT: ✓ VALID
```

---

*Report generated: 2026-01-29T02:19:00Z*
*Standard: NASA-Grade L4 / DO-178C Level A*
