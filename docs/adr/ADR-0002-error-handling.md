# ADR-0002: Error Handling Strategy

**Status**: ACCEPTED
**Date**: 2026-01-19
**Decision Makers**: Francky (Architect)

## Context

Phase A modules need a consistent error handling strategy that:
- Enables precise error identification
- Supports debugging and tracing
- Works with TypeScript strict mode
- Follows NASA-Grade L4 requirements

## Decision

**Implement typed error hierarchy with error codes**

## Error Hierarchy

```
BaseError (abstract)
├── AtlasError
│   ├── AtlasQueryError (ATLAS_E001_*)
│   ├── AtlasIndexError (ATLAS_E002_*)
│   └── AtlasSubscriptionError (ATLAS_E003_*)
├── RawError
│   ├── RawPathError (RAW_E001_*)
│   ├── RawStorageError (RAW_E002_*)
│   ├── RawCryptoError (RAW_E003_*)
│   └── RawBackendError (RAW_E004_*)
└── ProofError
    ├── ProofManifestError (PROOF_E001_*)
    └── ProofVerifyError (PROOF_E002_*)
```

## Error Code Format

```
{MODULE}_{SEVERITY}{SEQUENCE}_{DESCRIPTION}

Examples:
- RAW_E001_PATH_TRAVERSAL
- ATLAS_E002_INDEX_CORRUPT
- PROOF_E001_MANIFEST_INVALID
```

## Implementation Pattern

```typescript
export abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly module: string;
  readonly context: Record<string, unknown>;
  readonly timestamp: number;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = Object.freeze(context);
    this.timestamp = Date.now(); // Injected in prod
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RawPathError extends BaseError {
  readonly code = 'RAW_E001_PATH_TRAVERSAL';
  readonly module = 'raw';
}
```

## Rationale

1. **Typed Errors**
   - TypeScript narrows error types
   - IDE autocomplete for error handling
   - Exhaustive switch possible

2. **Error Codes**
   - Machine-parseable
   - Enables monitoring/alerting
   - Documentation linkable

3. **Context Object**
   - Structured debugging info
   - No string interpolation in messages
   - Frozen for immutability

4. **Stack Traces**
   - Preserved with captureStackTrace
   - Points to throw site, not constructor

## Consequences

### Positive
- ✓ Clear error identification
- ✓ TypeScript integration
- ✓ Debugging support
- ✓ Monitoring ready

### Negative
- More boilerplate per error class
- Need to maintain error code registry

### Mitigation
- Generator script for error classes
- Error code documentation file

## Rules

1. **Never throw plain Error in production**
   - Use specific error subclass

2. **Always include context**
   - Key info needed for debugging

3. **Never expose secrets in context**
   - Redact paths, tokens, etc.

4. **Test error conditions**
   - Every error path needs a test

## References

- R0.6: Errors Typées requirement
- DO-178C error handling guidelines
