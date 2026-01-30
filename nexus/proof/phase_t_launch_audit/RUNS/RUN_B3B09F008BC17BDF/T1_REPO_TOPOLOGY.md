# T1_REPO_TOPOLOGY
**STATUS**: PASS
**RUN_ID**: B3B09F008BC17BDF

## SCOPE
Verify repository structure, package organization, and build outputs.

## ARTEFACTS
| File | Description | Path |
|------|-------------|------|
| repo_file_list.txt | Complete file listing | EVIDENCE/repo_file_list.txt |
| repo_sha256_manifest.txt | SHA-256 hashes of all files | EVIDENCE/repo_sha256_manifest.txt |
| npm_build.txt | Build output logs | EVIDENCE/run1/npm_build.txt |

## FINDINGS

### F1.1 ROOT PACKAGE
- **Name**: omega-core
- **Version**: 5.0.0
- **Type**: ES Module (type: "module")
- **Workspaces**: packages/*
- **Evidence**: package.json

### F1.2 BUILD CONFIGURATION
Build script: `npm run build`
```
npx esbuild src/runner/main.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/runner/main.js --packages=external
npx esbuild src/auditpack/index.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/auditpack/index.js --packages=external
```

Build outputs:
- dist/runner/main.js (31.5kb)
- dist/auditpack/index.js (13.3kb)

**Evidence**: EVIDENCE/run1/npm_build.txt

### F1.3 PACKAGES STRUCTURE
Packages found under packages/:
- genome (@omega/genome v1.2.0) - Narrative Genome fingerprinting
- mycelium - Core dependency for genome
- mycelium-bio - Bio analysis extension
- omega-segment-engine - Segmentation engine
- emotion-gate - Emotion analysis
- hardening - Security utilities
- search - Search engine
- integration-nexus-dep - Pipeline & Router

**Evidence**: EVIDENCE/repo_file_list.txt

### F1.4 GATEWAY MODULES
Major gateway subsystems:
- gateway/chaos/ - Chaos engineering tests
- gateway/cli-runner/ - CLI interface
- gateway/facade/ - API facade
- gateway/limiter/ - Rate limiting
- gateway/quarantine/ - Quarantine system
- gateway/resilience/ - Resilience patterns
- gateway/sentinel/ - Security sentinel
- gateway/wiring/ - Internal wiring

**Evidence**: EVIDENCE/repo_file_list.txt

### F1.5 KEY DIRECTORIES
- nexus/ - Proof archives, benchmarks, shared code
- apps/omega-ui/ - Tauri-based UI application
- genesis-forge/ - Code generation tools
- evidence/ - Historical test evidence
- certificates/ - Certification records

### F1.6 FROZEN MODULES (per CLAUDE.md)
According to CLAUDE.md:
- packages/sentinel/ -> Phase 27 FROZEN (NOTE: path is gateway/sentinel/)
- packages/genome/ -> Phase 28 SEALED (path exists: packages/genome/)

---

**SECTION STATUS**: PASS (topology documented)
