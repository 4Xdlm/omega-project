# ASSUMPTIONS — Phase D.1 X4 Runner

## A1 — API Stability
The public APIs of C.1-C.5 are stable as exported from their respective `index.ts` files.
No breaking changes expected within the same version.

## A2 — IntentPack Format
IntentPack is defined in `@omega/creation-pipeline` and re-exported.
The format matches the type definition at compile time.

## A3 — SHA-256 Provider
SHA-256 uses `@omega/canon-kernel`'s `sha256()` function which wraps Node.js native `crypto`.
No external hashing library needed.

## A4 — Canonicalization
JSON canonicalization uses `@omega/canon-kernel`'s `canonicalize()` which sorts keys recursively
and produces deterministic output (no whitespace, no undefined, no functions).

## A5 — Timestamp Strategy
All timestamps passed to pipeline stages use a fixed deterministic value (`2026-01-01T00:00:00.000Z`).
No `Date.now()` or `new Date()` is used anywhere in the runner.

## A6 — Default Configurations
Each pipeline stage uses its default configuration (`createDefaultConfig()`, `createDefaultSConfig()`, etc.).
Custom configuration injection is not supported in D.1 but the architecture allows it.

## A7 — File System
ProofPack writes use synchronous `fs.writeFileSync` and `fs.mkdirSync`.
CRLF is normalized to LF before hashing (INV-RUN-09).

## A8 — Version Tracking
All version constants are hardcoded strings (`0.1.0`).
Future versions should extract from package.json at build time.

## A9 — Seed Normalization
When `--seed` is not provided, it defaults to empty string `""`.
This ensures deterministic RUN_ID generation (INV-RUN-08).

## A10 — Log Exclusion
`runner.log` is written to the ProofPack directory but is NOT included in manifest hashes.
It serves as human-readable trace only.
