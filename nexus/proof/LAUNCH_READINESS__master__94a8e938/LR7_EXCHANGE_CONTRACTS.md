# LR7 — INTER-MODULE EXCHANGE CONTRACTS

## MODULE DEPENDENCY GRAPH

```
                    ┌──────────────┐
                    │   CLI        │
                    │ (cli-runner) │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Gateway    │
                    │   (facade)   │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
│  Truth Gate   │  │ Emotion Gate  │  │   Sentinel    │
│               │  │               │  │    Judge      │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼───────┐
                    │    Genome    │  ← SEALED
                    │  (analysis)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Mycelium   │  ← SEALED
                    │  (DNA build) │
                    └──────────────┘
```

---

## CONTRACT SPECIFICATIONS

### Contract C-01: CLI → Gateway

| Field | Spec |
|-------|------|
| Input | `{ command, args, options }` |
| Output | `{ success, exitCode, stdout, stderr, duration }` |
| Test | gateway/cli-runner/tests/contract.test.ts |
| Status | **TESTED** |

### Contract C-02: Gateway → Genome

| Field | Spec |
|-------|------|
| Input | `OmegaDNA` (text, metadata) |
| Output | `NarrativeGenome` (axes, fingerprint) |
| Test | packages/genome/test/ |
| Status | **SEALED** |

### Contract C-03: Genome → Mycelium

| Field | Spec |
|-------|------|
| Input | `GenomeMyceliumInput` |
| Output | `GenomeMyceliumResult` (Ok | Err) |
| Test | packages/genome/test/integrations/ |
| Status | **SEALED** |

### Contract C-04: Gateway → Truth Gate

| Field | Spec |
|-------|------|
| Input | `TruthGateInput` |
| Output | `TruthGateVerdict` |
| Test | packages/truth-gate/tests/ |
| Status | **TESTED** |

### Contract C-05: Gateway → Emotion Gate

| Field | Spec |
|-------|------|
| Input | `EmotionGateInput` |
| Output | `EmotionGateResult` |
| Test | packages/emotion-gate/tests/ |
| Status | **TESTED** |

---

## COMPATIBILITY MATRIX

| From | To | Contract Version | Tested |
|------|-----|-----------------|--------|
| cli-runner | facade | v1.0 | YES |
| facade | truth-gate | v1.0 | YES |
| facade | emotion-gate | v1.0 | YES |
| facade | sentinel-judge | v1.0 | YES |
| truth-gate | genome | v1.2 | YES |
| emotion-gate | genome | v1.2 | YES |
| genome | mycelium | v1.0 | YES |

---

## CONTRACT TEST RESULTS

### CLI Contract (gateway/cli-runner/tests/contract.test.ts)

```
✓ enforceContract() - INV-CLI-05
  ✓ analyze command uses NEXUS route
  ✓ export command uses DIRECT route
  ✓ health command uses DIRECT route
```

### Integration Tests

```
✓ tests/gates/integration/full-pipeline.test.ts (27 tests)
✓ tests/runner/integration/e2e.test.ts (15 tests)
✓ tests/runner/integration/capsule.test.ts (20 tests)
```

---

## EXCHANGE VALIDATION

### Schema Validation

| Exchange | Schema Location | Validation |
|----------|-----------------|------------|
| CLI→Gateway | gateway/schemas/ | JSON Schema |
| Gateway→Genome | packages/genome/src/api/types.ts | TypeScript |
| Genome→Mycelium | packages/genome/src/integrations/myceliumTypes.ts | TypeScript |

### Runtime Validation

All module boundaries enforce:
1. Type validation (TypeScript)
2. Schema validation (JSON Schema where applicable)
3. Invariant checks (runtime assertions)

---

## VERDICT

| Check | Status |
|-------|--------|
| Contract definitions | **PASS** |
| Contract tests | **PASS** |
| Compatibility matrix | **PASS** |
| Schema validation | **PASS** |

**OVERALL: PASS**

All inter-module contracts are defined, tested, and compatible.
