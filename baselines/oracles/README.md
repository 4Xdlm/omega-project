# Oracle Baselines

This directory contains expected oracle outputs for CI comparison.

## Files

- `dist_manifest.expected.sha256` - Expected hash of production artefact manifest

## How Baselines Work

1. **ORACLE-2** generates `artefacts/oracles/dist_manifest.sha256`
2. CI compares this against `baselines/oracles/dist_manifest.expected.sha256`
3. If they differ, CI fails with `BASELINE MISMATCH`

## Updating Baselines

When intentional changes are made to production artefacts:

```bash
# Run build first
npm run build

# Generate new baseline
npm run ignition:update-baselines

# Commit the updated baseline
git add baselines/
git commit -m "chore(baselines): update oracle baselines - <reason>"
```

## Policy

- Baselines MUST only be updated intentionally
- Every baseline update MUST have a justification in the commit message
- CI will FAIL if actual != expected
- If baseline doesn't exist, oracle passes (no comparison)

## Why Baselines?

Baselines enable:
- **Determinism verification**: Same code = same hash
- **Accidental change detection**: Unintended changes are caught
- **Audit trail**: Git history shows when/why baselines changed
- **CI enforcement**: Prevents merging non-deterministic code

## Oracle Details

### ORACLE-2: Production Artefact Manifest

- **Purpose**: Verify production build artifacts are deterministic
- **Files hashed**: `dist/runner/main.js`, `dist/auditpack/index.js`
- **Format**: `SHA256  path  size` (sorted by path)
- **Baseline**: `dist_manifest.expected.sha256`

### ORACLE-1: Structured Test Report

- **Purpose**: Verify test results are canonical (no volatile fields)
- **No baseline**: Test count/content changes frequently
- **Determinism verified by**: double-run comparison

### ORACLE-X: Runtime Artifact Manifest

- **Purpose**: Prove runtime determinism via output file hashing
- **No baseline**: Output structure may change
- **Determinism verified by**: double-run comparison
