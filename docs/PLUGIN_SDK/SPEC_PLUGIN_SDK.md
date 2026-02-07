# OMEGA Plugin SDK — Specification v1.0

**Document**: SPEC_PLUGIN_SDK.md
**Version**: 1.0.0
**Date**: 2026-02-07
**Status**: SEALED
**Auteur**: Claude (IA Principal)
**Autorité**: Francky (Architecte Suprême)

---

## 1. Purpose

The Plugin SDK is the official toolkit for building OMEGA-compliant plugins. It provides types, builders, adapters, evidence helpers, and the Compliance Gate — the mandatory certification barrier every plugin must pass before Gateway registration.

## 2. Architectural Position

```
┌─────────────────────────────────────────────────────┐
│                   OMEGA CORE (BUILD)                │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Plugin SDK   │───▶│ Plugin Gateway            │   │
│  │ (this pkg)   │    │ (INV-PNP-01→10)          │   │
│  │              │    │                          │   │
│  │ • Types      │    │ • Registry               │   │
│  │ • Builder    │    │ • Validator               │   │
│  │ • Adapter    │    │ • Sandbox                 │   │
│  │ • Evidence   │    │ • Router                  │   │
│  │ • Compliance │    │ • Ledger                  │   │
│  └──────────────┘    └──────────────────────────┘   │
│         │                       ▲                   │
│         ▼                       │                   │
│  ┌──────────────┐               │                   │
│  │ Plugin       │───────────────┘                   │
│  │ (p.*.*)      │                                   │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

## 3. Design Rules Applied

| Rule | Description | Implementation |
|------|-------------|----------------|
| DR-1 | Narrow waist | SDK exports a single barrel `index.ts` |
| DR-2 | Pure core | `AdapterBase` separates validation from pure `compute()` |
| DR-3 | Schema-first | JSON schemas define IO contracts before code |
| DR-4 | Evidence-first | `computeEvidenceHashes()` on every invocation |
| DR-5 | Resource budgeting | `PluginLimits` in manifest (max_bytes, max_ms, max_concurrency) |

## 4. Components

### 4.1 Types (`types.ts`)

Self-contained type definitions mirroring Gateway types. Zero `any`. Plugin authors depend on SDK types, never on Gateway internals.

Key types: `PluginManifest`, `PluginRequest`, `PluginResponse`, `PluginPayload` (discriminated union: text/json/binary_ref/dataset_slice), `PluginHandler`, `ComplianceReport`.

### 4.2 Constants (`constants.ts`)

All numeric constants justified. No magic numbers.

- `OMEGA_PLUGIN_API_VERSION = '1.0.0'` — matches Gateway
- `PluginCapability` — 6 permitted capabilities
- `ForbiddenCapability` — 4 explicit deny-list entries
- `PLUGIN_ID_PATTERN` — `p.<domain>.<name>` naming convention
- Limits: `MAX_TIMEOUT_MS=60000`, `MAX_PAYLOAD_BYTES=1048576`, etc.

### 4.3 ManifestBuilder (`manifest-builder.ts`)

Builder pattern for constructing valid `PluginManifest`. Validates at `build()` time — fail-closed. Errors collected and thrown as single exception listing all violations.

### 4.4 AdapterBase (`adapter-base.ts`)

Abstract class implementing the `handleRequest` orchestration:

```
validateInput() → compute() → evidence → response
```

Plugin authors extend and implement:
- `pluginId: string`
- `validateInput(payload): string | null`
- `compute(payload): PluginPayload`

Fail-closed: validation error → `rejected`, compute error → `error`.

### 4.5 Evidence Helpers (`evidence.ts`)

- `hashPayload()` — SHA-256 of canonical JSON (via `fast-json-stable-stringify`)
- `hashData()` — SHA-256 of arbitrary data
- `computeEvidenceHashes()` — input + output hashes
- `generateRequestId()` — crypto-safe UUID v4

### 4.6 Compliance Gate (`compliance/compliance-gate.ts`)

10 mandatory checks. Details in `COMPLIANCE_GATE_SPEC.md`.

## 5. Laws Enforced

| Law | Description | SDK Enforcement |
|-----|-------------|-----------------|
| L1 | Sovereignty | CG-08: Non-actuation check |
| L3 | Stateless | CG-05: Stateless check |
| L4 | Zero ambient authority | CG-03: Forbidden capabilities |
| L5 | Fail-closed | CG-06: Invalid input rejection |
| L6 | Determinism | CG-04: Determinism check |
| L7 | IO contract | CG-01, CG-02: Manifest + schema validation |
| L8 | Version compat | CG-10: SemVer major match |
| L9 | Proof | CG-09: Evidence hash generation |

## 6. Test Coverage

| Suite | Tests | Description |
|-------|-------|-------------|
| sdk.test.ts | 34 | Constants, evidence, manifest-builder, adapter-base |
| **Total SDK** | **34** | |

## 7. Dependencies

| Package | Version | Justification |
|---------|---------|---------------|
| ajv | ^8.17.1 | JSON Schema validation (CG-01, CG-02) |
| ajv-formats | ^3.0.1 | Format validation (date-time, etc.) |
| fast-json-stable-stringify | ^2.1.0 | Canonical JSON for deterministic hashing |

## 8. File Inventory

| File | Lines | Role |
|------|-------|------|
| src/types.ts | ~110 | Type definitions |
| src/constants.ts | ~45 | Constants with justification |
| src/evidence.ts | ~35 | Hash and UUID helpers |
| src/manifest-builder.ts | ~75 | Builder pattern |
| src/adapter-base.ts | ~55 | Abstract adapter |
| src/compliance/compliance-gate.ts | ~200 | 10-check Compliance Gate |
| src/compliance/index.ts | ~1 | Barrel export |
| src/index.ts | ~25 | Public API barrel |
| schemas/compliance/compliance-report.schema.json | ~45 | Report schema |
| src/__tests__/sdk.test.ts | ~175 | 34 tests |

---

**END OF DOCUMENT**
