# OMEGA Quickstart Guide

Get a deterministic narrative run verified in under 15 minutes.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Step 1 — Clone & Install (3 min)

```bash
git clone <repo-url> omega-project
cd omega-project
npm install
```

## Step 2 — Create an IntentPack (1 min)

Create `my-intent.json`:

```json
{
  "title": "OMEGA Quickstart Demo",
  "premise": "A lone explorer discovers a hidden library beneath an ancient city",
  "themes": ["discovery", "knowledge"],
  "core_emotion": "wonder",
  "paragraphs": 5
}
```

Or use the provided example: `examples/intents/intent_quickstart.json`

## Step 3 — Run the Full Pipeline (2 min)

```bash
npx tsx packages/omega-runner/src/cli/main.ts run full \
  --intent examples/intents/intent_quickstart.json \
  --out my-run \
  --seed omega-quickstart-v1
```

This produces a run directory with:
- `00-intent/` — Serialized intent with SHA-256 hash
- `10-genesis/` — BlueprintPack (narrative plan)
- `20-scribe/` — DraftPack (generated text)
- `30-style/` — StyledPack (style-applied text)
- `40-creation/` — CreationResult (full pipeline output)
- `50-forge/` — ScoredPack (emotional trajectory M1-M12 scored)
- `manifest.json` — Artifact manifest with SHA-256 chain
- `merkle-tree.json` — Merkle tree of all artifacts
- `report.md` — Human-readable run report

## Step 4 — Examine Output (3 min)

```
my-run/
  runs/<run-id>/
    00-intent/intent.json          (186 bytes)
    00-intent/intent.sha256
    10-genesis/genesis-plan.json   (265 bytes)
    10-genesis/genesis-plan.sha256
    20-scribe/scribe-output.json   (571 bytes)
    20-scribe/scribe-output.sha256
    30-style/styled-output.json    (645 bytes)
    30-style/styled-output.sha256
    40-creation/creation-result.json (7305 bytes)
    40-creation/creation-result.sha256
    50-forge/forge-report.json     (1632 bytes)
    50-forge/forge-report.sha256
    manifest.json
    manifest.sha256
    merkle-tree.json
    report.json
    report.md
    runner.log
```

The `manifest.json` contains all artifact hashes and the `final_hash`:
```
final_hash: 65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a
merkle_root: db6a1a34cc18e719cfab08bba7545b273f732390ed4bd8ed54fd27df05c8492d
```

Note: Forge verdict is "FAIL" because mock generators produce zero-scored
emotional trajectories. This is expected — see Known Limitations.

## Step 5 — Generate Report (1 min)

The report is auto-generated during `run full`. View it:

```bash
cat my-run/runs/<run-id>/report.md
```

Or generate a JSON report:

```bash
npx tsx packages/omega-runner/src/cli/main.ts run report \
  --dir my-run/runs/<run-id> \
  --out my-report.json
```

## Step 6 — Verify Integrity (1 min)

```bash
npx tsx packages/omega-runner/src/cli/main.ts verify \
  --dir my-run/runs/<run-id> --strict
```

Expected: exit code 0 (SUCCESS). This checks:
- Every artifact hash matches its declared SHA-256
- Merkle tree is valid
- No phantom files exist
- No files are missing

## Step 7 — Prove Determinism (1 min)

Run the same command again with the same seed:

```bash
npx tsx packages/omega-runner/src/cli/main.ts run full \
  --intent examples/intents/intent_quickstart.json \
  --out my-run-replay \
  --seed omega-quickstart-v1
```

Compare hashes — they MUST be identical:
- Run 1 final_hash: `65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a`
- Run 2 final_hash: `65d560a7641cc4a8827eeb68437dc9b2359b7f6534d86c858a62a3ee343e542a` (identical)

This proves byte-identical determinism.

## What's Next

- See [examples/](../examples/) for more intents and attack scenarios
- See [ATTACK_CATALOG.md](../examples/ATTACK_CATALOG.md) for hostile testing results
- Run `omega verify --dir <run> --strict` on any run to verify integrity

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `omega: command not found` | Use `npx tsx packages/omega-runner/src/cli/main.ts` instead |
| `ERR_UNSUPPORTED_DIR_IMPORT` | Use `npx tsx` (source) instead of `node dist/` (built) |
| `npm install` fails | Ensure Node >= 18, delete `node_modules` and retry |
| Hash mismatch on replay | Ensure same seed, same intent file, same Node version |
| Forge verdict is FAIL | Expected — mock generators produce zero scores |
