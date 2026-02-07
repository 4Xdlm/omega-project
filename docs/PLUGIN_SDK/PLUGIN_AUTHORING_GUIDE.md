# OMEGA Plugin Authoring Guide v1.0

**Document**: PLUGIN_AUTHORING_GUIDE.md
**Version**: 1.0.0
**Date**: 2026-02-07

---

## 1. Plugin Structure

```
plugins/p.<domain>.<name>/
├── PLUGIN_MANIFEST.json       # Plugin identity + contract
├── schemas/
│   ├── inputs/                # JSON schemas for input payloads
│   └── outputs/               # JSON schemas for output payloads
├── src/
│   ├── constants.ts           # All thresholds justified
│   ├── core.ts                # Pure function (DR-2)
│   ├── adapter.ts             # AdapterBase implementation
│   └── index.ts               # Public entrypoint
├── tests/
│   ├── core.test.ts           # Pure function tests
│   ├── adapter.test.ts        # Integration tests
│   └── compliance.test.ts     # Compliance Gate E2E
├── CHANGELOG.md
└── README.md
```

## 2. Step-by-Step

### Step 1: Define schemas (DR-3)

Create JSON schemas for inputs and outputs BEFORE writing code.

### Step 2: Write the manifest

```json
{
  "plugin_id": "p.<domain>.<name>",
  "name": "...",
  "vendor": "...",
  "version": "1.0.0",
  "api_version": "1.0.0",
  "capabilities": ["read_text", "write_report"],
  "io": {
    "inputs": [{ "kind": "text", "schema_ref": "...", "limits": { "max_bytes": 1048576 } }],
    "outputs": [{ "kind": "json", "schema_ref": "...", "limits": { "max_bytes": 65536 } }]
  },
  "limits": { "max_bytes": 1048576, "max_ms": 5000, "max_concurrency": 1 },
  "determinism": { "mode": "deterministic", "notes": "..." },
  "entrypoint": { "type": "worker", "file": "src/index.ts", "export": "handleRequest" }
}
```

Or use `ManifestBuilder`:

```typescript
import { ManifestBuilder, PluginCapability } from '@omega/plugin-sdk';

const manifest = new ManifestBuilder()
  .pluginId('p.domain.name')
  .name('My Plugin')
  .vendor('my-vendor')
  .version('1.0.0')
  .addCapability(PluginCapability.READ_TEXT)
  .addCapability(PluginCapability.WRITE_REPORT)
  .addInput({ kind: 'text', schema_ref: '...', limits: { max_bytes: 1048576 } })
  .addOutput({ kind: 'json', schema_ref: '...', limits: { max_bytes: 65536 } })
  .build();
```

### Step 3: Write the pure core (DR-2)

```typescript
// core.ts — PURE FUNCTION. No imports from node:fs, node:net, etc.
export function myCompute(content: string): MyResult {
  // deterministic logic here
  return result;
}
```

### Step 4: Write the adapter

```typescript
import { AdapterBase } from '@omega/plugin-sdk';
import type { PluginPayload } from '@omega/plugin-sdk';
import { myCompute } from './core.js';

export class MyAdapter extends AdapterBase {
  readonly pluginId = 'p.domain.name';

  validateInput(payload: PluginPayload): string | null {
    if (payload.kind !== 'text') return `Expected text, got ${payload.kind}`;
    if (payload.content.length === 0) return 'Empty content';
    return null;  // valid
  }

  compute(payload: PluginPayload): PluginPayload {
    const result = myCompute((payload as { content: string }).content);
    return { kind: 'json', schema_ref: '...', data: result };
  }
}

const adapter = new MyAdapter();
export const handleRequest = adapter.handleRequest.bind(adapter);
```

### Step 5: Run Compliance Gate

```typescript
import { runComplianceGate } from '@omega/plugin-sdk';

const report = await runComplianceGate({
  manifest,
  handler: handleRequest,
  testPayloads: [{ kind: 'text', content: 'test', encoding: 'utf-8', metadata: {} }],
});
// report.passed must be true (10/10)
```

## 3. Rules

1. **No side effects** in `compute()` — no FS, no network, no env access
2. **Fail-closed** — invalid input → `rejected`, not `ok` with partial data
3. **Deterministic** — same input = same output = same hash
4. **Evidence** — every call produces SHA-256 hashes of input and output
5. **Data-only output** — output payload must be text/json/binary_ref/dataset_slice
6. **All constants justified** — no magic numbers in code

## 4. Naming Convention

| Element | Pattern | Example |
|---------|---------|---------|
| Plugin ID | `p.<domain>.<name>` | `p.sample.neutral` |
| Input schema | `omega:p.<d>.<n>:input:<name>:v<semver>` | `omega:p.sample.neutral:input:text-input:v1.0.0` |
| Output schema | `omega:p.<d>.<n>:output:<name>:v<semver>` | `omega:p.sample.neutral:output:analysis-output:v1.0.0` |

## 5. Reference Implementation

`plugins/p.sample.neutral/` — 86 tests, 10/10 Compliance Gate PASS.

---

**END OF DOCUMENT**
