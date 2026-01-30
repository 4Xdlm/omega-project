# ORACLE-2 Implementation Proof

**Oracle**: ORACLE-2 (Production Artefact Manifest)
**Status**: IMPLEMENTED
**Date**: 2026-01-30

---

## Purpose

ORACLE-2 creates a deterministic hash manifest of production build artefacts.
This proves the build output is reproducible across runs.

## Implementation

### File: tools/oracles/oracle_dist_manifest.ts

**Functionality**:
1. Hashes production files (`dist/runner/main.js`, `dist/auditpack/index.js`)
2. Creates manifest with format: `SHA256  path  size`
3. Sorts entries lexicographically by path
4. Computes manifest hash

**Output**:
- `artefacts/oracles/dist_manifest.txt` - Manifest content
- `artefacts/oracles/dist_manifest.sha256` - Manifest hash

**Baseline**:
- `baselines/oracles/dist_manifest.expected.sha256`

## Determinism Proof

### Triple-Run Results

```
Run 1: 19CE02017768E3AE7DE683EA9C161D2B6E50273376000F5FBF0814D957B99382
Run 2: 19CE02017768E3AE7DE683EA9C161D2B6E50273376000F5FBF0814D957B99382
Run 3: 19CE02017768E3AE7DE683EA9C161D2B6E50273376000F5FBF0814D957B99382
```

**Verdict**: DETERMINISTIC (all hashes identical)

### Test Evidence

Test: `tests/oracles/oracle_dist_manifest.test.ts`

```
✓ should generate manifest file
✓ should produce deterministic output (double run)
✓ should have valid SHA-256 hash format
✓ should have sorted entries
✓ should match baseline if baseline exists
✓ should include all required production files
```

All 6 tests PASS.

## Manifest Format

```
SHA256  path  size
```

Example:
```
A1B2C3D4...  dist/auditpack/index.js  13300
E5F6G7H8...  dist/runner/main.js  31200
```

## npm Script

```bash
npm run oracle:dist
```

---

**SECTION STATUS**: PASS
