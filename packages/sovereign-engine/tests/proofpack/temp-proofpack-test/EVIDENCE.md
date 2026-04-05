# OMEGA Proof Pack Evidence

**Schema**: proofpack.v1
**Generated**: 2026-04-05T09:34:09.033Z
**Git Commit**: 444f1ab8ae00c059980084ab47a37eb857c30908
**Git Branch**: phase-p2-alignment

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
