# OMEGA v1.0.0 — Installation Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Installation from Source

### Step 1 — Clone

```bash
git clone <repo-url> omega-project
cd omega-project
```

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Build All Packages

```bash
npx tsc -p packages/canon-kernel/tsconfig.json
npx tsc -p packages/truth-gate/tsconfig.json
npx tsc -p packages/genesis-planner/tsconfig.json
npx tsc -p packages/scribe-engine/tsconfig.json
npx tsc -p packages/style-emergence-engine/tsconfig.json
npx tsc -p packages/creation-pipeline/tsconfig.json
npx tsc -p packages/omega-forge/tsconfig.json
npx tsc -p packages/omega-runner/tsconfig.json
```

### Step 4 — Verify Installation

```bash
npm test
```

Expected: 2046 tests PASS, 0 failures.

### Step 5 — Run a Pipeline

```bash
npx tsx packages/omega-runner/src/cli/main.ts run full \
  --intent examples/intents/intent_quickstart.json \
  --out my-run \
  --seed omega-quickstart-v1
```

### Step 6 — Verify Output

```bash
npx tsx packages/omega-runner/src/cli/main.ts verify \
  --dir my-run/runs/<run-id> --strict
```

Expected: exit code 0 (SUCCESS).

## CLI Usage

```bash
# Full pipeline
npx tsx packages/omega-runner/src/cli/main.ts run full --intent <path.json> --out <dir> [--seed <string>]

# Creation only (no forge)
npx tsx packages/omega-runner/src/cli/main.ts run create --intent <path.json> --out <dir> [--seed <string>]

# Forge only (score existing)
npx tsx packages/omega-runner/src/cli/main.ts run forge --input <path.json> --out <dir> [--seed <string>]

# Generate report
npx tsx packages/omega-runner/src/cli/main.ts run report --dir <runDir> --out <file.{md|json}>

# Verify integrity
npx tsx packages/omega-runner/src/cli/main.ts verify --dir <runDir> [--strict]
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | SUCCESS |
| 1 | GENERIC ERROR |
| 2 | USAGE ERROR |
| 3 | DETERMINISM VIOLATION |
| 4 | IO ERROR |
| 5 | INVARIANT BREACH |
| 6 | VERIFY FAIL |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ERR_UNSUPPORTED_DIR_IMPORT` | Use `npx tsx` (source) instead of `node dist/` (built) |
| `npm install` fails | Ensure Node >= 18, delete `node_modules` and retry |
| Hash mismatch on replay | Ensure same seed, same intent, same Node version |
| Forge verdict is FAIL | Expected with mock generators — not a bug |

## Platform Support

| Platform | Status |
|----------|--------|
| Windows 10/11 | Tested |
| Linux (Ubuntu 22.04+) | Supported |
| macOS (13+) | Supported |

## Uninstallation

Remove the project directory:
```bash
rm -rf omega-project
```

No global packages or system modifications are made by OMEGA.
