# @omega/genome — Module Documentation

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

| Property | Value |
|----------|-------|
| **Package** | @omega/genome |
| **Version** | 1.2.0 |
| **Status** | FROZEN |
| **LOC** | 3,646 |
| **Tests** | 109 |
| **Layer** | Analysis |

---

## Purpose

The genome package is the **core fingerprinting engine** of OMEGA. It extracts emotional, stylistic, and structural signatures from narrative text, producing a unique "genome" that identifies the text's characteristics.

---

## Public API

### analyze()

```typescript
function analyze(input: ProcessedInput, options?: AnalyzeOptions): NarrativeGenome
```

Extracts a complete fingerprint from validated text.

**Parameters:**
- `input` - Validated input from mycelium (AcceptResult.processed)
- `options` - Optional configuration (segmentation mode, etc.)

**Returns:** `NarrativeGenome` with all axes populated

**Example:**
```typescript
const genome = analyze(processedInput);
console.log(genome.emotion14.joy); // 0.234
```

---

### compare()

```typescript
function compare(genomeA: NarrativeGenome, genomeB: NarrativeGenome): SimilarityResult
```

Computes similarity between two genomes.

**Parameters:**
- `genomeA` - First genome
- `genomeB` - Second genome

**Returns:** `SimilarityResult` with score (0-1) and verdict

**Example:**
```typescript
const result = compare(genomeA, genomeB);
console.log(result.score);   // 0.87
console.log(result.verdict); // "SIMILAR"
```

---

### computeFingerprint()

```typescript
function computeFingerprint(genome: NarrativeGenome): GenomeFingerprint
```

Generates a unique hash for a genome.

**Parameters:**
- `genome` - The genome to fingerprint

**Returns:** 64-character SHA-256 hex string

**Example:**
```typescript
const fingerprint = computeFingerprint(genome);
// "a1b2c3d4e5f6..."
```

---

### canonicalSerialize()

```typescript
function canonicalSerialize(genome: NarrativeGenome): string
```

Converts genome to deterministic JSON string.

**Parameters:**
- `genome` - The genome to serialize

**Returns:** Canonical JSON string (sorted keys, quantized floats)

---

## Data Types

### NarrativeGenome

```typescript
interface NarrativeGenome {
  emotion14: Emotion14;      // 14-dimensional emotions
  emotionAxis: EmotionAxis;  // Aggregate emotional metrics
  styleAxis: StyleAxis;      // Writing style metrics
  structureAxis: StructureAxis;  // Structural patterns
  tempoAxis: TempoAxis;      // Rhythm and pacing
  metadata: ExtractionMetadata;  // Processing info
}
```

### Emotion14

```typescript
interface Emotion14 {
  joy: number;           // 0-1
  sadness: number;       // 0-1
  anger: number;         // 0-1
  fear: number;          // 0-1
  surprise: number;      // 0-1
  disgust: number;       // 0-1
  trust: number;         // 0-1
  anticipation: number;  // 0-1
  love: number;          // 0-1
  hope: number;          // 0-1
  anxiety: number;       // 0-1
  confusion: number;     // 0-1
  curiosity: number;     // 0-1
  determination: number; // 0-1
}
// INVARIANT: Sum of all values = 1.0
```

### SimilarityVerdict

```typescript
type SimilarityVerdict =
  | 'IDENTICAL'       // score >= 0.99
  | 'VERY_SIMILAR'    // score >= 0.90
  | 'SIMILAR'         // score >= 0.75
  | 'SOMEWHAT_SIMILAR'// score >= 0.50
  | 'DIFFERENT';      // score < 0.50
```

---

## Internal Structure

```
packages/genome/
├── src/
│   ├── api/
│   │   ├── analyze.ts      # Main analysis function
│   │   ├── compare.ts      # Similarity computation
│   │   ├── fingerprint.ts  # Hash generation
│   │   └── types.ts        # Type definitions
│   ├── core/
│   │   ├── canonical.ts    # Canonical serialization
│   │   ├── emotion14.ts    # Emotion extraction
│   │   ├── genome.ts       # Genome assembly
│   │   └── version.ts      # Version info
│   └── utils/
│       └── sha256.ts       # Hash utility
├── test/
│   └── *.test.ts           # 109 tests
├── artifacts/
│   ├── GENOME_SEAL.json    # Version seal
│   └── canonical_golden.json  # Golden test data
└── package.json
```

---

## Invariants

| ID | Description | Enforced By |
|----|-------------|-------------|
| GEN-01 | Emotion14 values sum to 1.0 | analyze() |
| GEN-02 | All values are 0-1 range | analyze() |
| GEN-03 | Same input produces same genome | Pure functions |
| GEN-04 | Same genome produces same fingerprint | canonicalSerialize() |
| GEN-05 | Fingerprint is valid SHA-256 | computeFingerprint() |

---

## Dependencies

```
@omega/genome
├── @omega/types
└── (no other OMEGA dependencies)
```

---

## Usage Example

```typescript
import { analyze, compare, computeFingerprint } from '@omega/genome';
import { validate } from '@omega/mycelium';

// 1. Validate input
const result = validate({ text: "Once upon a time..." });
if (!result.accepted) throw new Error(result.rejection.message);

// 2. Analyze
const genome = analyze(result.processed);

// 3. Get fingerprint
const fingerprint = computeFingerprint(genome);
console.log(`Fingerprint: ${fingerprint}`);

// 4. Compare with another
const otherGenome = analyze(otherProcessed);
const similarity = compare(genome, otherGenome);
console.log(`Similarity: ${similarity.verdict}`);
```

---

## FROZEN Status

This module is FROZEN as of v1.2.0 (Phase 28).

**Modifications are FORBIDDEN.**

To make changes:
1. Create a new version (v2.0.0)
2. Create a new phase
3. Pass full recertification
4. Update all consumers

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
