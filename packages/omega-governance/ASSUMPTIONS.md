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

## A11: Baseline Immutability (Phase F)
Once a baseline is registered, it cannot be modified or re-registered. The `registerBaseline()` function throws if the version already exists. This is enforced at the registry level.

## A12: Replay Engine (Phase F)
The replay engine does NOT re-execute the pipeline. It reads two existing ProofPacks (baseline + candidate) and compares them byte-by-byte. CRLF normalization is applied before hashing.

## A13: Gate Execution Order (Phase F)
Gates execute strictly sequentially: G0 -> G1 -> G2 -> G3 -> G4 -> G5. In fail-fast mode (default), the first failing gate causes all subsequent gates to be marked SKIPPED. No parallel execution.

## A14: CI Configuration (Phase F)
All CI thresholds are centralized in `CIConfig`. No gate implementation contains hardcoded values. This enables per-environment configuration.

## A15: Badge Generation (Phase F)
Badge SVG is generated in-process (no external API calls). The shield URL is for reference only and is not fetched during CI execution.
