# OMEGA v4.9.0-stdin-pipe

## Tag Info
- Tag: v4.9.0-stdin-pipe
- TagRef: refs/tags/v4.9.0-stdin-pipe
- CapabilityCommit: 303d4bf34413e07fa40ec8852cf0e05f473bdd64
- Date: 2026-01-18T02:56:00+01:00

## Capabilities
- New option: -I / --stdin
- Read text from stdin (pipe) instead of file
- Unix-style: `cat file.txt | omega analyze --stdin`
- Works with all output formats (json, md, both, stream)
- Creates pseudo file metadata with `<stdin>` path

## Usage Examples
```bash
echo "text" | omega analyze --stdin --lang fr
cat novel.txt | omega analyze --stdin --lang fr --stream
curl -s url | omega analyze --stdin
```

## Proof
- nexus/proof/chapter19/stdin_simple.json
- nexus/proof/chapter19/stdin_stream.ndjson

## Metrics
- Tests: 1389 passed
- FROZEN: packages/genome + packages/mycelium untouched
