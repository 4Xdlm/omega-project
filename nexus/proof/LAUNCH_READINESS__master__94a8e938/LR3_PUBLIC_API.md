# LR3 — PUBLIC API SURFACE

## PACKAGE EXPORTS SUMMARY

### packages/genome (SEALED)

```typescript
// Core API
export { analyze, validateGenome } from "./api/analyze.js";
export { computeFingerprint, isValidFingerprint } from "./api/fingerprint.js";
export { compare, compareDetailed, cosineSimilarity, ... } from "./api/similarity.js";

// Types
export type { NarrativeGenome, EmotionAxis, StyleAxis, ... } from "./api/types.js";

// Constants
export { GENOME_VERSION, DEFAULT_SEED, FLOAT_PRECISION, ... } from "./core/version.js";
export { EMOTION14_ORDERED } from "./core/emotion14.js";

// Mycelium Integration
export { processWithMycelium, ADAPTER_VERSION } from "./integrations/myceliumAdapter.js";
```

### packages/mycelium (SEALED)

```typescript
export { createMycelium, validateMyceliumInput } from "./mycelium.js";
export { normalizeInput } from "./normalizer.js";
export type { MyceliumInput, MyceliumOutput, ... } from "./types.js";
```

### packages/truth-gate

```typescript
// Gate
export * from './gate/index.js';
// Validators
export * from './validators/index.js';
// Ledger
export * from './ledger/index.js';
// Policy
export * from './policy/index.js';
// Drift
export * from './drift/index.js';
```

### packages/emotion-gate

```typescript
// Similar barrel export pattern
export * from './gate/index.js';
export * from './metrics/index.js';
```

### packages/search

```typescript
export { SearchEngine, createSearchEngine } from './engine';
export { tokenize, ... } from './tokenizer';
export { parseQuery, ... } from './parser';
```

### packages/sentinel-judge

```typescript
export * from './types.js';
export * from './canonical_json.js';
export * from './digest.js';
export * from './schema/validate.js';
export * from './gates/index.js';
export * from './assembler/index.js';
```

### packages/hardening

```typescript
export { verifyTamper, computeHash, ... } from './tamper.js';
export type { TamperResult, ... } from './types.js';
```

---

## API STABILITY CLASSIFICATION

| Package | Stability | Breaking Changes |
|---------|-----------|------------------|
| genome | SEALED | PROHIBITED |
| mycelium | SEALED | PROHIBITED |
| truth-gate | STABLE | Require RFC |
| emotion-gate | STABLE | Require RFC |
| search | STABLE | Require RFC |
| sentinel-judge | STABLE | Require RFC |
| hardening | STABLE | Require RFC |

---

## SCHEMA CONTRACTS

### JSON Schemas (packages/schemas/)

| Schema | Location | Status |
|--------|----------|--------|
| DNA Schema | schemas/ | ACTIVE |
| Analysis Schema | schemas/ | ACTIVE |
| Genome Schema | schemas/ | ACTIVE |

### CLI Contract (gateway/cli-runner/)

| Command | Input | Output | Status |
|---------|-------|--------|--------|
| analyze | file/stdin | JSON | STABLE |
| compare | file1, file2 | JSON | STABLE |
| batch | directory | JSON | STABLE |
| health | - | JSON | STABLE |
| schema | - | JSON Schema | STABLE |

---

## BREAKING CHANGE POLICY

Per CLAUDE.md Golden Rules:
1. FROZEN modules cannot be modified
2. SEALED modules cannot be modified
3. Active modules require evidence + tests for changes

All public API changes require:
- Test coverage
- Documentation update
- Evidence pack
