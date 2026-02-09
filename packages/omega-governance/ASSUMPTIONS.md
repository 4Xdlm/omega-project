# OMEGA Governance — Assumptions

## A1: ProofPack Format Stability
The ProofPack format from D.1 (@omega/runner) is stable:
- `manifest.json` follows the `Manifest` interface
- `manifest.sha256` contains 64-char hex hash of manifest.json content
- `merkle-tree.json` follows the `SerializedMerkleTree` interface
- Stages are numbered: 00-intent, 10-genesis, 20-scribe, 30-style, 40-creation, 50-forge

## A2: ForgeReport Location
The forge report is located at `<run_dir>/50-forge/forge-report.json` and follows the `ForgeReport` interface with `metrics.composite_score`, `metrics.emotion_score`, `metrics.quality_score`, and M1-M12 fields.

## A3: Hash Algorithm
All SHA-256 hashes use CRLF-to-LF normalization before hashing, consistent with D.1's `canonicalBytes()` function.

## A4: Manifest Canonicalization
The manifest.json is stored with sorted keys (canonical JSON) and its hash is computed from the raw file content after CRLF normalization.

## A5: No Runtime Pipeline Execution
This package does NOT execute the OMEGA pipeline (C.1-C.5). It only reads and analyzes existing ProofPack outputs.

## A6: NDJSON Log Format
The governance history log uses NDJSON (newline-delimited JSON) format, one `RuntimeEvent` per line.

## A7: Score Ranges
All scores (forge_score, emotion_score, quality_score, M1-M12) are in the range [0, 1]. The composite_score in ForgeReport is the primary quality metric.

## A8: Deterministic Timestamps
ProofPack timestamps are deterministic (frozen to "2026-01-01T00:00:00.000Z"). Governance certificates do not include timestamps to maintain determinism (INV-GOV-06).

## A9: No External Dependencies
The governance CLI uses no external argument parsing libraries. All parsing is done with pure TypeScript.

## A10: canon-kernel Dependency
This package depends on `@omega/canon-kernel` for hash utilities. It does NOT depend on `@omega/runner` at runtime to avoid circular dependency risks — instead it re-declares the necessary types from the ProofPack format.
