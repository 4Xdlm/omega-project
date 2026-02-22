# GENIUS SOVEREIGN INTEGRATION — STEP 4b

## What's in this package

```
sovereign-engine-patch/
└── src/genius/
    ├── omega-p0-adapter.ts    ← NEW: Bridge omega-p0 → SE format
    └── genius-metrics.ts      ← MODIFIED: Dual mode support
```

## Changes to genius-metrics.ts

7 surgical additions. No legacy logic altered.

| Change | Description |
|--------|-------------|
| Import | `omega-p0-adapter.ts` |
| Input | `scorerMode?: 'legacy' \| 'dual' \| 'omegaP0'` |
| Output | `layer2_dual?` + `scorer_mode` fields |
| Step 2 | Branch: omegaP0 skips SE scorers |
| Step 3 | Branch: omegaP0 uses weighted sum |
| Step 3b | Dual: runs omega-p0 parallel |
| Step 7b | Patches proof with verdict_old |

## Backward compatibility

- `scorerMode` defaults to `'legacy'` → existing behavior unchanged
- `layer2_dual` is optional → no schema break
- All existing tests should pass unchanged

## Dependency required

In `packages/sovereign-engine/package.json`, add:

```json
"@omega/phonetic-stack": "file:../../omega-p0"
```

Then `npm install` in sovereign-engine.

## Verification

After patching, run existing SE tests. All should pass.
The `scorerMode` parameter is opt-in — default is `legacy`.
