# OMEGA Progress Callbacks — User Guide

**Version:** 1.0.0  
**Module:** omega-observability  
**Standard:** OUTP v2.0.0 / NASA-Grade L4  
**Date:** 2026-01-03

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [CLI Options](#cli-options)
3. [Output Formats](#output-formats)
4. [API Reference](#api-reference)
5. [CI/CD Integration](#cicd-integration)
6. [Zero-Impact Contract](#zero-impact-contract)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### CLI Progress (Development)

```bash
# Basic progress (CLI format, updating line)
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --progress
```

Output:
```
[analyze  ]  58% | 12,031/20,713 | 01:12 | ETA 00:51
```

### JSON Progress (CI/CD)

```bash
# JSON Lines format for CI/CD
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --ci
```

Output:
```json
{"phase":"segment","current":42,"total":100,"percent":42,"elapsed_ms":1200}
{"phase":"analyze","current":42,"total":100,"percent":42,"elapsed_ms":1500}
{"phase":"done","current":1,"total":1,"percent":100,"elapsed_ms":5000}
```

---

## CLI Options

| Option | Short | Values | Default | Description |
|--------|-------|--------|---------|-------------|
| `--progress` | `-p` | `cli`, `jsonl`, `none` | disabled | Enable progress output |
| `--progress-throttle` | | `<ms>` | 100 | Minimum time between events |
| `--quiet` | `-q` | flag | false | Suppress all output |
| `--ci` | | flag | false | CI mode (jsonl + machine-readable) |
| `--no-eta` | | flag | false | Don't show ETA |
| `--no-rate` | | flag | false | Don't show processing rate |

### Examples

```bash
# CLI format with custom throttle
npx tsx run_pipeline_scale_v2.ts --in corpus/ --out results/ --progress --progress-throttle 50

# JSONL format
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --progress=jsonl

# Quiet mode (errors only)
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --quiet

# Streaming + Progress
npx tsx run_pipeline_scale_v2.ts --in huge.txt --out results/ --stream --progress
```

---

## Output Formats

### CLI Format

Single line that updates in place (using carriage return):

```
[phase    ] pct% | current/total | MM:SS | ETA MM:SS | filename
```

Example progression:
```
[init     ]  --% | 0              | 00:00 | Initializing...
[read     ]  25% | 256,000/1,024,000 | 00:01 | ETA 00:03
[segment  ]  50% | 50/100        | 00:02 | ETA 00:02
[analyze  ]  75% | 75/100        | 00:03 | ETA 00:01
[done     ] 100% | 1/1           | 00:04 | ✅ Complete | hash: 1a30b6e6...
```

### JSONL Format

One JSON object per line, machine-readable:

```json
{"phase":"init","current":0,"elapsed_ms":0,"message":"Initializing..."}
{"phase":"read","current":256000,"total":1024000,"percent":25,"elapsed_ms":1000,"eta_ms":3000}
{"phase":"segment","current":50,"total":100,"percent":50,"elapsed_ms":2000,"eta_ms":2000}
{"phase":"analyze","current":75,"total":100,"percent":75,"elapsed_ms":3000,"eta_ms":1000}
{"phase":"done","current":1,"total":1,"percent":100,"elapsed_ms":4000,"metadata":{"root_hash":"1a30b6e6..."}}
```

### Phases

| Phase | Description | Current Unit |
|-------|-------------|--------------|
| `init` | Pipeline initialization | 0 |
| `read` | Reading input file(s) | Bytes read |
| `segment` | Text segmentation | Segments produced |
| `analyze` | Emotional analysis | Segments analyzed |
| `dna` | DNA building | DNAs built |
| `aggregate` | Merkle + aggregation | 0→1 (start→end) |
| `write` | Writing output | 1 (complete) |
| `done` | Pipeline complete | 1 (final) |

---

## API Reference

### ProgressEmitter

```typescript
import { ProgressEmitter, createCliEmitter, createCiEmitter } from "omega-observability";

// Create emitter
const progress = createCliEmitter(100); // throttle 100ms

// Emit events
progress.init("Starting...");
progress.read(bytesRead, totalBytes, "file.txt");
progress.segment(index, total);
progress.analyze(count, total);
progress.dna(count, total);
progress.aggregate("start");
progress.aggregate("end");
progress.write("output.json");
progress.done(rootHash, { segments_count: 100 });
```

### Factory Functions

```typescript
// Disabled (zero overhead)
const noop = createNoopEmitter();

// CLI format
const cli = createCliEmitter(100); // throttle in ms

// CI/CD format
const ci = createCiEmitter();

// Custom callback
const custom = createCallbackEmitter((event) => {
  console.log(event.phase, event.percent);
}, 50);

// Test helper
const [emitter, events] = createTestEmitter();
```

### Types

```typescript
interface ProgressEvent {
  phase: ProgressPhase;
  current: number;
  total?: number;
  percent?: number;
  elapsed_ms: number;
  eta_ms?: number;
  message?: string;
  file?: string;
  metadata?: Record<string, unknown>;
}

type ProgressPhase = 
  | "init" | "read" | "segment" | "analyze" 
  | "dna" | "aggregate" | "write" | "done";

type ProgressCallback = (event: Readonly<ProgressEvent>) => void;
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Process Novel
on: [push]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install
        run: npm ci
      
      - name: Process Novel with Progress
        run: |
          npx tsx run_pipeline_scale_v2.ts \
            --in novels/my-novel.txt \
            --out results/ \
            --ci \
            2>&1 | tee progress.log
      
      - name: Parse Results
        run: |
          # Extract final hash from JSONL
          HASH=$(grep '"phase":"done"' progress.log | jq -r '.metadata.root_hash')
          echo "Root hash: $HASH"
```

### GitLab CI

```yaml
analyze:
  script:
    - npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --progress=jsonl
  artifacts:
    paths:
      - results/
```

### Azure DevOps

```yaml
- task: Bash@3
  inputs:
    targetType: 'inline'
    script: |
      npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --ci
```

---

## Zero-Impact Contract

### Fundamental Guarantee

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   Progress callbacks NEVER affect the pipeline hash.                          ║
║                                                                               ║
║   Same input + seed + mode = Same rootHash (ALWAYS)                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Invariants Proven

| ID | Name | Guarantee |
|----|------|-----------|
| **INV-PROG-01** | Progress hash isolation | ON/OFF → same hash |
| **INV-PROG-02** | Format hash isolation | cli/jsonl/none → same hash |
| **INV-PROG-03** | Throttle hash isolation | 10ms/200ms → same hash |
| **INV-PROG-04** | Streaming + Progress | stream+progress → same hash |

### How It Works

1. **Side-Channel Design**: Progress data flows separately from pipeline data
2. **Read-Only Events**: Events are frozen (immutable) after creation
3. **Fire-and-Forget**: Callbacks use `queueMicrotask` (no blocking)
4. **No Hash Contamination**: Progress values never enter hash calculations

### Verification

```bash
# Run without progress
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out /tmp/a --seed 42
# Note the rootHash

# Run with progress
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out /tmp/b --seed 42 --progress
# rootHash MUST be identical

# Run with streaming + progress
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out /tmp/c --seed 42 --stream --progress
# rootHash MUST still be identical
```

---

## Troubleshooting

### Progress Not Showing

```bash
# Make sure --progress is specified
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --progress

# Check stderr for CLI format (it writes to stderr by default)
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --progress 2>&1
```

### Garbled Output

```bash
# Use JSONL format in non-TTY environments
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --progress=jsonl
```

### Too Many Events in Logs

```bash
# Increase throttle
npx tsx run_pipeline_scale_v2.ts --in novel.txt --out results/ --progress --progress-throttle 1000
```

### ETA Jumping Around

The ETA is calculated based on current progress rate. Early in processing, it may be unstable. This is normal and does not affect the pipeline results.

---

## See Also

- [STREAMING_V2.md](./STREAMING_V2.md) — Streaming documentation
- [tests/progress_invariants.test.ts](../tests/progress_invariants.test.ts) — Invariant tests
- [packages/omega-observability/](../packages/omega-observability/) — Module source

---

**Document ID:** DOC-PROGRESS-001  
**Version:** 1.0.0  
**Author:** Claude (IA Principal)  
**Approved:** Francky (Architecte Suprême)
