# OMEGA Compliance Gate — Specification v1.0

**Document**: COMPLIANCE_GATE_SPEC.md
**Version**: 1.0.0
**Date**: 2026-02-07
**Status**: SEALED

---

## 1. Purpose

The Compliance Gate is the mandatory certification barrier. A plugin MUST pass all 10 checks (CG-01→CG-10) before the Gateway accepts its registration. PASS or FAIL — never between.

## 2. Check Registry

| ID | Name | Law | Type | Description |
|----|------|-----|------|-------------|
| CG-01 | Manifest valid | L7 | Static | plugin_id, version, api_version, entrypoint, name, vendor, capabilities, IO |
| CG-02 | Schema IO valid | L7 | Static | All IO descriptors have schema_ref, valid max_bytes |
| CG-03 | Capabilities permitted | L4 | Static | No forbidden capabilities (filesystem_access, network_access, process_spawn, env_access) |
| CG-04 | Determinism check | L6 | Dynamic | 2 identical runs produce identical output hashes |
| CG-05 | Stateless check | L3 | Dynamic | 2 independent calls with same input produce same output |
| CG-06 | Fail-closed check | L5 | Dynamic | Invalid input (empty content) returns status=rejected, not ok/error |
| CG-07 | Timeout respect | L5 | Dynamic | Execution completes within manifest.limits.max_ms |
| CG-08 | Non-actuation check | L1 | Dynamic | Output kind is data-only (text/json/binary_ref/dataset_slice) |
| CG-09 | Proof generation | L9 | Dynamic | Evidence hashes present: input_hash non-empty, output_hash non-empty when result exists |
| CG-10 | Version compat | L8 | Static | api_version major matches Gateway major (both ≥1) |

## 3. Static vs Dynamic

**Static checks** (CG-01, CG-02, CG-03, CG-10): Examine manifest only. No handler invocation.

**Dynamic checks** (CG-04–CG-09): Invoke the handler with test payloads. Require `testPayloads` array in `ComplianceGateInput`.

## 4. Failure Semantics

- Any single FAIL → entire report `passed=false`
- Static FAIL: manifest correction required
- Dynamic FAIL: handler or adapter correction required
- Compliance Gate itself never crashes — errors in handler are caught and reported as FAIL

## 5. Report Structure

```typescript
interface ComplianceReport {
  plugin_id: string;        // e.g. "p.sample.neutral"
  timestamp: string;        // ISO 8601
  passed: boolean;          // true only if all 10 checks pass
  checks: ComplianceCheckResult[];  // exactly 10 entries
  summary: {
    total: 10;
    passed_count: number;   // 0–10
    failed_count: number;   // 0–10
  };
}

interface ComplianceCheckResult {
  id: string;               // "CG-01" through "CG-10"
  name: string;             // human-readable check name
  law: string;              // "L1" through "L9"
  passed: boolean;
  detail: string;           // diagnostic message
  duration_ms: number;      // execution time of this check
}
```

## 6. Usage

```typescript
import { runComplianceGate } from '@omega/plugin-sdk';

const report = await runComplianceGate({
  manifest,                 // PluginManifest
  handler: handleRequest,   // PluginHandler function
  testPayloads: [payload],  // at least 1 test payload
});

if (!report.passed) {
  for (const check of report.checks.filter(c => !c.passed)) {
    console.error(`${check.id} ${check.name}: FAIL — ${check.detail}`);
  }
}
```

## 7. Constants

| Constant | Value | Justification |
|----------|-------|---------------|
| `DEFAULT_COMPLIANCE_TIMEOUT_MS` | 5000 | Generous for compliant plugin on test data |
| `DETERMINISM_CHECK_ITERATIONS` | 2 | f(x)=f(x) proven with 2 runs |

## 8. Negative Testing

The Compliance Gate is tested with deliberately non-compliant inputs:
- Forbidden capability in manifest → CG-03 FAIL
- Incompatible API version → CG-10 FAIL
- Empty testPayloads → throws Error (precondition)

---

**END OF DOCUMENT**
