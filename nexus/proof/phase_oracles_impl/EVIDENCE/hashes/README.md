# OMEGA ORACLES EVIDENCE - HASH MANIFEST

## Purpose
This directory contains canonical SHA-256 hashes for audit verification.
These files serve as the single source of truth for Phase ORACLES certification.

## Files

### ORACLE_1_CANON_REPORT_SHA256.txt
- **Content**: Hash of test_report.canon.json
- **Proves**: Test execution produces stable, normalized output
- **Source**: `artefacts/oracles/test_report.canon.json`

### ORACLE_2_TRIPLE_RUN_SHA256.txt
- **Content**: Hash verified identical across 3 independent runs
- **Proves**: Build determinism (same source → same output)
- **Source**: `triple_run_oracle2/run1.sha256 = run2.sha256 = run3.sha256`

### ORACLE_X_RUNTIME_MANIFEST_SHA256.txt
- **Content**: Hash of runtime environment fingerprint
- **Proves**: Environment reproducibility
- **Source**: `artefacts/oracles/runtime_manifest.sha256`

## Verification

```bash
# Verify ORACLE-2 determinism
cat triple_run_oracle2/run*.sha256 | sort -u | wc -l  # Must be 1

# Recompute ORACLE-1
npm run oracle:tests
Get-FileHash artefacts/oracles/test_report.canon.json

# Recompute ORACLE-X  
npm run ignition
cat artefacts/oracles/runtime_manifest.sha256
```

## Certification Status
- Phase: ORACLES
- Status: SEALED
- Date: 2026-01-30
- Authority: Francky (Architecte Suprême)
