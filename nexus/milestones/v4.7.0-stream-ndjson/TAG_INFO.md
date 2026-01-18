# OMEGA v4.7.0-stream-ndjson

## Tag Info
- Tag: v4.7.0-stream-ndjson
- TagRef: refs/tags/v4.7.0-stream-ndjson
- CapabilityCommit: 29f6916df7c6c13f680744c4aa1f920000c10e0d
- Date: 2026-01-18T02:32:00+01:00

## Capabilities
- CLI analyze: -S / --stream emits NDJSON on stdout
- Works with --output json (default)
- Event types include: start, input, summary, emotion (multi), metadata, complete
- summary includes: warnings + qualityScore + keywordDensity + intensityMethod

## Proof
- nexus/proof/chapter17/stream_short_fr.ndjson (validated: all lines parse as JSON and include type)

## Metrics
- Tests: 1389 passed
- FROZEN: packages/genome + packages/mycelium untouched
