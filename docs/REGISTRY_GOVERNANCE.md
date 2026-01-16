# OMEGA Registry Governance

## Overview
Registry files are now versioned in git with rotation and audit trail.

## Version
- Version: 3.94.0
- Phase: 94
- Standard: NASA-Grade L4

## Commands

```bash
# List active registries
node scripts/registry/rotate.cjs list

# Rotate (archive old registries)
node scripts/registry/rotate.cjs rotate

# Create new registry
node scripts/registry/rotate.cjs create

# View audit trail
node scripts/registry/rotate.cjs audit
```

## Rotation Policy
- Keep last 7 days of registries active
- Archive older registries to `nexus/ledger/registry/archive/`
- All actions logged to `AUDIT_TRAIL.jsonl`

## References
- Tag: v3.94.0
