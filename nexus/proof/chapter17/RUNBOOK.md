# Chapter 17 — STREAM NDJSON Runbook

## Feature
Add `-S` / `--stream` option to `analyze` command for NDJSON (newline-delimited JSON) output.

## Usage
```bash
npm run omega -- analyze <file> --lang <lang> --output json --stream
```

Or directly:
```bash
node gateway/cli-runner/dist/cli/runner.js analyze <file> --stream
```

## Output Format
Each line is a self-contained JSON object with a `type` field:

| Event | Description |
|-------|-------------|
| `start` | Analysis begins (timestamp) |
| `input` | File metadata (path, bytes, sha256) |
| `summary` | Aggregate stats (wordCount, dominantEmotion, qualityScore, warnings) |
| `emotion` | One per Plutchik emotion (8 total) |
| `metadata` | Analysis metadata (seed, version, lang) |
| `complete` | Analysis finished (success: true/false) |

## Validation
```python
import json
with open("output.ndjson") as f:
    for line in f:
        obj = json.loads(line.strip())
        assert "type" in obj
```

## Files Modified
- `gateway/cli-runner/src/cli/commands/analyze.ts`
  - Added `--stream` option
  - Added `formatNDJSON()` function
