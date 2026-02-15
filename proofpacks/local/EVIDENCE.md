# OMEGA Proof Pack Evidence

**Schema**: proofpack.v1
**Generated**: 2026-02-15T22:48:32.915Z
**Git Commit**: 2978c91c1ab4e105178eb9035303fa562a7e3ad7
**Git Branch**: master

## Reproduction Steps

```bash
# 1. Run tests
npm test

# 2. Run all gates
npm run gate:all

# 3. Generate proof pack
npm run proofpack:generate
```

## Output Location

- MANIFEST.json — Metadata (git, node, packages, gates)
- HASHES.sha256 — SHA-256 hashes of critical files
- EVIDENCE.md — This file

## Critical Files Hashed

- sessions/ROADMAP_CHECKPOINT.md
- packages/signal-registry/signal-registry.idl.json
- packages/signal-registry/src/registry.ts

## Gates Verified

- gate:no-shadow
- gate:no-todo
- gate:active
- gate:roadmap
- gate:idl
- gate:proofpack
