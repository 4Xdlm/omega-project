# Calibration File — Phase B

## Purpose

This file is the **SINGLE SOURCE** of all numeric parameters for Phase B execution.

## Rules

1. **NO HARDCODED VALUES** in any harness or spec
2. **ALL VALUES REQUIRED** - execution fails if any key = "REQUIRED"
3. **IMMUTABLE DURING RUN** - modifying this file invalidates all previous runs
4. **HASH REQUIRED** - proof packs must include SHA256 of this file

## Usage

```typescript
const config = JSON.parse(readFileSync('tools/calibration/B123_calibration.json'));
for (const [key, value] of Object.entries(config)) {
  if (value === 'REQUIRED') {
    throw new Error(`Calibration key "${key}" not set`);
  }
}
```

## Before Execution

1. Replace ALL "REQUIRED" values with actual numbers
2. Document the source/justification for each value
3. Compute SHA256 of the file
4. Include hash in proof pack

## Integrity

```
SHA256(B123_calibration.json) = <compute at runtime>
```

Any modification = new hash = new run series.
