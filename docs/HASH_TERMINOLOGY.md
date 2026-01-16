# OMEGA Hash Terminology

## Overview

This document defines the official hash terminology used in the OMEGA project.
All hashes are SHA-256 unless otherwise specified.

## Version

- Document Version: 3.93.0
- Phase: 93
- Standard: NASA-Grade L4 / DO-178C Level A

## Hash Types

### merkleRoot

**Definition**: The Merkle root hash computed from all entity and atlas file hashes.

**Computation**:
1. Collect all file hashes from `nexus/atlas/` and `nexus/entities/`
2. Sort hashes alphabetically for determinism
3. Concatenate all hashes
4. Compute SHA-256 of the concatenation

**Usage**:
- Represents the cryptographic state of the entire atlas
- Changes if ANY file in the atlas changes
- Used to verify integrity of the full atlas

**Example**:
```
merkleRoot: a1b2c3d4e5f6...
```

### atlasMetaHash

**Definition**: The SHA-256 hash of the `ATLAS-META.json` file.

**Computation**:
1. Read `nexus/atlas/ATLAS-META.json`
2. Compute SHA-256 of the file content (bytes, not parsed JSON)

**Usage**:
- Quick verification of atlas metadata
- Simpler than full merkle root computation
- Used in seals for rapid validation

**Example**:
```
atlasMetaHash: sha256:f7e8d9c0b1a2...
```

### fileHash

**Definition**: Individual SHA-256 hash of a specific file.

**Usage**:
- Per-file integrity verification
- Component of merkle root calculation
- Evidence in certificates

## Seal Structure

Seals contain both hash types:

```yaml
seal:
  id: SEAL-20260116-0001
  snapshot:
    merkleRoot: a1b2c3d4e5f6...      # Full atlas integrity
    atlasMetaHash: sha256:f7e8d9c0... # Quick verification
```

## Hash Verification

### Full Verification

```bash
# Regenerate and compare merkle root
node scripts/atlas/auto-regen.cjs --verbose
```

### Quick Verification

```bash
# Verify atlas meta hash only
sha256sum nexus/atlas/ATLAS-META.json
```

## Determinism Requirements

For hash consistency across platforms:

1. **File Content**: Use LF line endings (via .gitattributes)
2. **JSON**: Consistent formatting (2-space indent, sorted keys)
3. **Order**: Always sort hashes alphabetically before merkle computation
4. **Encoding**: Always use UTF-8 without BOM

## References

- Phase 93: Atlas Auto-Regeneration
- Tag: v3.93.0
- Script: `scripts/atlas/auto-regen.cjs`
- Certificate: `certificates/phase93_0/CERT_PHASE_93_0.md`
