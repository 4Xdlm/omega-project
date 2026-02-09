# Phase G.0 — Assumptions

## Architecture
- Release artifacts use JSON-based simulated archives (not real ZIP/tar.gz) for deterministic testing
- `createArtifact` writes deterministic JSON content with fixed timestamp for reproducibility
- Archive extraction reads the JSON manifest, not binary archives

## Versioning
- VERSION file is the single source of truth
- No `v` prefix in VERSION file (used only in git tags)
- SemVer 2.0.0 strict compliance (MAJOR.MINOR.PATCH)

## Platforms
- 3 supported platforms: win-x64, linux-x64, macos-arm64
- Format mapping: win-x64 -> .zip, linux/macos -> .tar.gz

## Self-Test
- `modules-check` uses static import verification (not dynamic require())
- `integrity-check` verifies presence of package.json and VERSION

## Policy
- CURRENT support: 365 days from release
- MAINTENANCE support: 180 days after CURRENT
- EOL: after MAINTENANCE period

## Dependencies
- No dependency on @omega/canon-kernel (uses Node.js crypto directly)
- All hashing done via node:crypto (SHA-256, SHA-512)
