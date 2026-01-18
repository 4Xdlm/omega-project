# OMEGA v4.8.0-stream-both-artifacts

## Tag Info
- Tag: v4.8.0-stream-both-artifacts
- TagRef: refs/tags/v4.8.0-stream-both-artifacts
- CapabilityCommit: 0bc6ae9462feca1d3b443f4fb7de7e0b65569a7e
- Date: 2026-01-18T02:45:00+01:00

## Capabilities
- --stream emits NDJSON (stdout)
- --output both supported in stream mode via --artifacts <dir>
- NDJSON includes type=artifacts with jsonPath + mdPath
- Artifacts: analysis.json + analysis.md written to artifacts dir

## Proof
- nexus/proof/chapter18/stream_short_fr_both.ndjson
- nexus/proof/chapter18/artifacts_short_fr/analysis.json
- nexus/proof/chapter18/artifacts_short_fr/analysis.md

## Metrics
- Tests: 1389 passed
- FROZEN: packages/genome + packages/mycelium untouched
