# @omega/mycelium

> **FROZEN MODULE — DO NOT MODIFY**
>
> Status: SEALED | Version: 1.0.0 | Sealed: 2026-01-09
>
> See [FROZEN_MODULES.md](../../FROZEN_MODULES.md) for governance rules.

Input validation guardian for DNA/Genome pipeline.

## Purpose

Mycelium validates and normalizes all inputs before they enter the OMEGA analysis chain. It acts as a strict gatekeeper ensuring data integrity and preventing malformed inputs from corrupting downstream processing.

## Version

**1.0.0** (Phase 29.2)

## Standard

NASA-Grade L4 / DO-178C Level A

## Public API

```typescript
import {
  validateDNAInput,
  normalizeDNAInput,
  MyceliumGuardian
} from "@omega/mycelium";

// Validate input
const result = validateDNAInput(input);
if (!result.valid) {
  console.error(result.rejections);
}

// Normalize input
const normalized = normalizeDNAInput(rawInput);

// Use guardian for full pipeline
const guardian = new MyceliumGuardian();
const output = guardian.process(input);
```

## Invariants (12)

| ID | Description |
|----|-------------|
| INV-MYC-01 | Input validation deterministic |
| INV-MYC-02 | Rejection codes unique |
| INV-MYC-03 | Normalization idempotent |
| INV-MYC-04 | No silent failures |
| INV-MYC-05 | All rejections documented |
| INV-MYC-06 | Gates ordered correctly |
| INV-MYC-07 | Boundary contracts respected |
| INV-MYC-08 | Float precision preserved |
| INV-MYC-09 | UTF-8 strict |
| INV-MYC-10 | No data loss on normalization |
| INV-MYC-11 | Rejection messages actionable |
| INV-MYC-12 | Performance bounded |

## Gates (5)

| Gate | Purpose |
|------|---------|
| GATE-MYC-01 | Structure validation |
| GATE-MYC-02 | Type validation |
| GATE-MYC-03 | Range validation |
| GATE-MYC-04 | Format validation |
| GATE-MYC-05 | Semantic validation |

## Tests

- **Total**: 97
- **Categories**: 8 (CAT-A through CAT-H)
- **Rejections tested**: 20

## License

PROPRIETARY - OMEGA Project
