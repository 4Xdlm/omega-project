# OMEGA Error Codes - Standardization Guide

## Overview
Standardized error codes for consistent error handling across OMEGA project.

## Version
- Version: 3.96.0
- Phase: 96
- Standard: NASA-Grade L4

## Error Code Format

```
OMEGA-{CATEGORY}-{NUMBER}
```

Example: `OMEGA-VAL-001`

## Categories

| Code | Category | Description |
|------|----------|-------------|
| VAL | Validation | Input validation errors |
| FS | Filesystem | File system operations |
| SAN | Sanctuary | Sanctuary protection violations |
| HASH | Hash | Integrity/hash errors |
| GIT | Git | Git operation errors |
| CFG | Config | Configuration errors |
| RUN | Runtime | Runtime errors |
| INV | Invariant | Invariant violations |
| PHS | Phase | Phase-related errors |
| CRT | Certificate | Certificate errors |

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| CRITICAL | System cannot continue | Immediate stop |
| ERROR | Operation failed | Retry or abort |
| WARNING | Completed with issues | Log and continue |
| INFO | Informational | Log only |

## Common Error Codes

### Validation (VAL)
- `OMEGA-VAL-001`: Invalid input format
- `OMEGA-VAL-002`: Missing required parameter
- `OMEGA-VAL-003`: Value out of range

### Sanctuary (SAN)
- `OMEGA-SAN-001`: Read-only path modified (CRITICAL)
- `OMEGA-SAN-002`: Forbidden file access (CRITICAL)
- `OMEGA-SAN-003`: Frozen module modified (CRITICAL)

### Invariant (INV)
- `OMEGA-INV-001`: Invariant violation detected (CRITICAL)
- `OMEGA-INV-002`: Contract violation (CRITICAL)

## Usage

```javascript
const { createError, ErrorCodes } = require('./scripts/errors/error-codes.cjs');

// Create error from predefined code
const err = createError('VAL_001', { field: 'email' });
throw err;

// Output: [ERROR] OMEGA-VAL-001: Invalid input format | Details: {"field":"email"}
```

## Commands

```bash
# List all error codes
node scripts/errors/error-codes.cjs list

# List categories
node scripts/errors/error-codes.cjs categories

# Validate error code format
node scripts/errors/error-codes.cjs validate OMEGA-VAL-001
```

## References
- Tag: v3.96.0
- Phase: 96
