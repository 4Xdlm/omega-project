# @omega/mycelium — Module Documentation

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

| Property | Value |
|----------|-------|
| **Package** | @omega/mycelium |
| **Version** | 1.0.0 |
| **Status** | FROZEN |
| **LOC** | 2,591 |
| **Tests** | 147 |
| **Layer** | Validation |

---

## Purpose

The mycelium package is the **input validation gate** for OMEGA. All user input must pass through mycelium before any processing occurs. It acts as a security boundary and data sanitizer.

Named after fungal mycelium networks that filter nutrients in nature.

---

## Public API

### validate()

```typescript
function validate(input: DNAInput): ValidationResult
```

Main validation function. Checks all hard constraints and normalizes input.

**Parameters:**
- `input` - Raw user input: `{ text: string, metadata?: object, seed?: number }`

**Returns:** `AcceptResult` if valid, `RejectResult` if invalid

**Example:**
```typescript
const result = validate({ text: "Hello world" });
if (result.accepted) {
  console.log(result.processed.text); // Normalized text
} else {
  console.log(result.rejection.code); // "EMPTY_TEXT", etc.
}
```

---

### Individual Validators

```typescript
function validateUTF8(text: string): boolean
function validateSize(text: string, options: SizeOptions): boolean
function validateBinary(text: string): boolean
function validateNotEmpty(text: string): boolean
function validateControlChars(text: string): boolean
function validateNotHTML(text: string): boolean
function validateNotJSON(text: string): boolean
function validateNotXML(text: string): boolean
function validateSeed(seed: number | undefined): boolean
function validateMode(mode: SegmentMode | undefined): boolean
```

---

### Normalizers

```typescript
function normalizeLineEndings(text: string): string
function normalizeWhitespace(text: string): string
```

---

## Data Types

### DNAInput

```typescript
interface DNAInput {
  text: string;
  metadata?: Record<string, unknown>;
  seed?: number;
  mode?: SegmentMode;
}
```

### ValidationResult

```typescript
type ValidationResult = AcceptResult | RejectResult;

interface AcceptResult {
  accepted: true;
  processed: {
    text: string;      // Normalized text
    seed: number;      // Resolved seed
    mode: SegmentMode; // Resolved mode
    metadata: Record<string, unknown>;
  };
}

interface RejectResult {
  accepted: false;
  rejection: {
    code: RejectionCode;
    message: string;
    category: RejectionCategory;
  };
}
```

### RejectionCode

```typescript
type RejectionCode =
  | 'EMPTY_TEXT'
  | 'TEXT_TOO_SHORT'
  | 'TEXT_TOO_LONG'
  | 'INVALID_UTF8'
  | 'BINARY_DETECTED'
  | 'CONTROL_CHARS'
  | 'HTML_DETECTED'
  | 'JSON_DETECTED'
  | 'XML_DETECTED'
  | 'INVALID_SEED'
  | 'INVALID_MODE'
  // ... 20 total
```

---

## Validation Pipeline

```
Input: DNAInput
    │
    ▼
┌─────────────────────────────────────────────────┐
│ 1. validateUTF8()                               │
│    Check: Valid UTF-8 encoding                  │
│    Fail: INVALID_UTF8                           │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ 2. validateNotEmpty()                           │
│    Check: Non-empty after trim                  │
│    Fail: EMPTY_TEXT                             │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ 3. validateSize()                               │
│    Check: MIN_LENGTH <= length <= MAX_LENGTH    │
│    Fail: TEXT_TOO_SHORT / TEXT_TOO_LONG         │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ 4. validateBinary()                             │
│    Check: No binary content (null bytes, etc.)  │
│    Fail: BINARY_DETECTED                        │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ 5. validateControlChars()                       │
│    Check: No dangerous control characters       │
│    Fail: CONTROL_CHARS                          │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ 6. validateNotHTML/JSON/XML()                   │
│    Check: Not markup or data format             │
│    Fail: HTML_DETECTED / JSON_DETECTED / etc.   │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ 7. validateSeed() / validateMode()              │
│    Check: Valid optional parameters             │
│    Fail: INVALID_SEED / INVALID_MODE            │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ 8. Normalize                                    │
│    • normalizeLineEndings() - CRLF → LF         │
│    • normalizeWhitespace() - Trim, collapse     │
└─────────────────────────────────────────────────┘
    │
    ▼
Output: AcceptResult { processed: {...} }
```

---

## Internal Structure

```
packages/mycelium/
├── src/
│   ├── validate.ts         # Main validator
│   ├── validators/
│   │   ├── utf8.ts         # UTF-8 validation
│   │   ├── size.ts         # Size limits
│   │   ├── binary.ts       # Binary detection
│   │   ├── empty.ts        # Empty check
│   │   ├── control.ts      # Control chars
│   │   ├── markup.ts       # HTML/JSON/XML
│   │   ├── seed.ts         # Seed validation
│   │   └── mode.ts         # Mode validation
│   ├── normalizers/
│   │   ├── lineEndings.ts  # CRLF normalization
│   │   └── whitespace.ts   # Whitespace handling
│   ├── types.ts            # Type definitions
│   └── constants.ts        # Size limits, etc.
├── test/
│   └── *.test.ts           # 147 tests
└── package.json
```

---

## Constants

```typescript
const MIN_LENGTH = 10;        // Minimum text length
const MAX_LENGTH = 1_000_000; // Maximum text length (1MB)
const DEFAULT_SEED = 42;      // Default seed value
const DEFAULT_MODE = 'auto';  // Default segmentation mode
```

---

## Invariants

| ID | Description | Enforced By |
|----|-------------|-------------|
| MYC-01 | All input passes validation | validate() entry point |
| MYC-02 | Invalid UTF-8 is rejected | validateUTF8() |
| MYC-03 | Binary content is rejected | validateBinary() |
| MYC-04 | Size limits are enforced | validateSize() |
| MYC-05 | Output text is normalized | normalizers |
| MYC-06 | Rejection includes code and message | RejectResult type |

---

## Dependencies

```
@omega/mycelium
└── @omega/types
```

---

## Usage Example

```typescript
import { validate } from '@omega/mycelium';

// Valid input
const validResult = validate({ text: "Once upon a time..." });
if (validResult.accepted) {
  // Safe to use validResult.processed
  console.log(validResult.processed.text);
}

// Invalid input
const invalidResult = validate({ text: "" });
if (!invalidResult.accepted) {
  console.log(invalidResult.rejection.code);    // "EMPTY_TEXT"
  console.log(invalidResult.rejection.message); // "Text cannot be empty"
}

// With options
const withSeed = validate({
  text: "Hello world",
  seed: 12345,
  mode: 'paragraph'
});
```

---

## Security Role

Mycelium is the **trust boundary** for OMEGA:

```
┌───────────────────────────────────────┐
│           UNTRUSTED ZONE              │
│                                       │
│   User Input → File Input → CLI Args  │
│                                       │
└─────────────────┬─────────────────────┘
                  │
                  ▼
    ══════════════════════════════════
    ║  MYCELIUM VALIDATION GATE      ║
    ║  (TRUST BOUNDARY)              ║
    ══════════════════════════════════
                  │
                  ▼
┌─────────────────────────────────────────┐
│            TRUSTED CORE                 │
│                                         │
│   genome → oracle → search → output     │
│                                         │
└─────────────────────────────────────────┘
```

---

## FROZEN Status

This module is FROZEN as of v1.0.0 (Phase 27).

**Modifications are FORBIDDEN.**

To make changes:
1. Create a new version (v2.0.0)
2. Create a new phase
3. Pass full recertification
4. Update all consumers

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
