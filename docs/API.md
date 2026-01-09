# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA PROJECT — API REFERENCE
# Version: v3.34.0
# Standard: NASA-Grade L4 / DO-178C Level A
# ═══════════════════════════════════════════════════════════════════════════════

## Overview

The OMEGA API is exposed through two main packages:
- `@omega/genome` - Narrative genome analysis and comparison
- `@omega/mycelium` - Text validation and normalization (via genome adapter)

## @omega/genome

### Core Functions

#### `analyze(text: string, options?: AnalyzeOptions): NarrativeGenome`

Analyzes a text and extracts its narrative genome.

```typescript
import { analyze } from "@omega/genome";

const genome = analyze("Your narrative text here...", {
  seed: 42,  // Optional: for deterministic results
});
```

**Parameters:**
- `text` (string): The narrative text to analyze
- `options.seed` (number, optional): Random seed for deterministic extraction

**Returns:** `NarrativeGenome` - The extracted genome

---

#### `validateGenome(genome: unknown): genome is NarrativeGenome`

Type guard to validate a genome object.

```typescript
import { validateGenome } from "@omega/genome";

if (validateGenome(data)) {
  // data is NarrativeGenome
}
```

---

#### `computeFingerprint(genome: NarrativeGenome): GenomeFingerprint`

Computes a SHA-256 fingerprint for a genome.

```typescript
import { analyze, computeFingerprint } from "@omega/genome";

const genome = analyze(text);
const fingerprint = computeFingerprint(genome);
// fingerprint.hash: "abc123..."
// fingerprint.version: "1.2.0"
```

---

#### `isValidFingerprint(fingerprint: unknown): fingerprint is GenomeFingerprint`

Type guard to validate a fingerprint object.

---

### Similarity Functions

#### `compare(a: NarrativeGenome, b: NarrativeGenome): number`

Computes similarity score between two genomes (0.0 to 1.0).

```typescript
import { analyze, compare } from "@omega/genome";

const g1 = analyze(text1);
const g2 = analyze(text2);
const similarity = compare(g1, g2);
// 0.0 = completely different, 1.0 = identical
```

---

#### `compareDetailed(a: NarrativeGenome, b: NarrativeGenome): DetailedComparison`

Returns detailed comparison with per-axis breakdown.

```typescript
import { compareDetailed } from "@omega/genome";

const result = compareDetailed(g1, g2);
// result.emotion: number (0-1)
// result.style: number (0-1)
// result.structure: number (0-1)
// result.tempo: number (0-1)
// result.overall: number (0-1)
```

---

#### `getVerdict(similarity: number): SimilarityVerdict`

Converts similarity score to human-readable verdict.

```typescript
import { getVerdict } from "@omega/genome";

getVerdict(0.95); // "IDENTICAL"
getVerdict(0.75); // "SIMILAR"
getVerdict(0.50); // "RELATED"
getVerdict(0.25); // "DIFFERENT"
```

**Thresholds:**
- >= 0.90: "IDENTICAL"
- >= 0.70: "SIMILAR"
- >= 0.40: "RELATED"
- < 0.40: "DIFFERENT"

---

#### `cosineSimilarity(a: number[], b: number[]): number`

Computes cosine similarity between two vectors.

---

#### Flattening Functions

Convert genome axes to flat arrays for comparison:

```typescript
import {
  flattenEmotionAxis,
  flattenStyleAxis,
  flattenStructureAxis,
  flattenTempoAxis,
} from "@omega/genome";

const emotionVector = flattenEmotionAxis(genome.emotion);
const styleVector = flattenStyleAxis(genome.style);
```

---

### Mycelium Integration (Phase 29.3+)

#### `processWithMycelium(input: GenomeMyceliumInput): GenomeMyceliumResult`

Main entry point for Mycelium-validated genome processing.

```typescript
import { processWithMycelium, isMyceliumOk } from "@omega/genome";

const result = processWithMycelium({
  request_id: "req-001",
  text: "Your text here",
  seed: 42,           // Optional
  mode: "paragraph",  // Optional
});

if (isMyceliumOk(result)) {
  // result.normalized - validated and normalized input
  // result.genome - extracted NarrativeGenome
  // result.fingerprint - genome fingerprint
} else {
  // result.rej_code - rejection code (REJ-MYC-*, REJ-INT-*)
  // result.reason - human readable reason
}
```

**Input Fields:**
- `request_id` (string, required): Unique request identifier
- `text` (string, required): Text to process
- `seed` (number, optional): Random seed
- `mode` (string, optional): Processing mode

**Result (discriminated union):**
- `ok: true` - Success with `normalized`, `genome`, `fingerprint`
- `ok: false` - Failure with `rej_code`, `reason`

---

#### `isMyceliumOk(result): result is GenomeMyceliumOk`

Type guard for successful Mycelium results.

---

#### `isMyceliumErr(result): result is GenomeMyceliumErr`

Type guard for failed Mycelium results.

---

### Constants

```typescript
import {
  GENOME_VERSION,           // "1.2.0"
  EXTRACTOR_VERSION,        // "1.1.0"
  DEFAULT_SEED,             // 42
  DEFAULT_WEIGHTS,          // { emotion: 0.4, style: 0.25, ... }
  FLOAT_PRECISION,          // 1e-6
  FLOAT_DECIMALS,           // 6
  FINGERPRINT_LENGTH,       // 64
  DISTRIBUTION_SUM_TOLERANCE, // 0.001
  EMOTION14_ORDERED,        // ["joy", "sadness", ...]
  MYCELIUM_SEAL_REF,        // { version, commit, date }
  ADAPTER_VERSION,          // "1.0.0"
  INTEGRATION_GATES,        // Gate definitions
} from "@omega/genome";
```

---

### Types

```typescript
// Core types
interface NarrativeGenome {
  emotion: EmotionAxis;
  style: StyleAxis;
  structure: StructureAxis;
  tempo: TempoAxis;
  metadata: ExtractionMetadata;
}

interface EmotionAxis {
  primary: Emotion14;
  secondary: Emotion14 | null;
  distribution: Record<Emotion14, number>;
  transitions: EmotionTransition[];
}

interface StyleAxis {
  formality: number;      // 0-1
  complexity: number;     // 0-1
  poeticity: number;      // 0-1
  dialogueRatio: number;  // 0-1
}

interface StructureAxis {
  avgSentenceLength: number;
  avgParagraphLength: number;
  chapterCount: number;
  sceneCount: number;
}

interface TempoAxis {
  pacingScore: number;    // 0-1
  tensionCurve: number[]; // Normalized values
  rhythmVariance: number;
}

// Mycelium types
interface GenomeMyceliumInput {
  request_id: string;
  text: string;
  seed?: number;
  mode?: string;
}

type GenomeMyceliumResult = GenomeMyceliumOk | GenomeMyceliumErr;

interface GenomeMyceliumOk {
  ok: true;
  request_id: string;
  seal_ref: MyceliumSealRef;
  normalized: { content: string; seed: number; mode: string };
  genome: NarrativeGenome;
  fingerprint: GenomeFingerprint;
}

interface GenomeMyceliumErr {
  ok: false;
  request_id: string;
  seal_ref: MyceliumSealRef;
  rej_code: string;
  reason: string;
}
```

---

## Rejection Codes

### Mycelium Rejections (REJ-MYC-*)

| Code | Description |
|------|-------------|
| REJ-MYC-001 | Empty text |
| REJ-MYC-002 | Whitespace-only text |
| REJ-MYC-003 | Binary content detected |
| REJ-MYC-004 | Control characters detected |

### Integration Rejections (REJ-INT-*)

| Code | Description |
|------|-------------|
| REJ-INT-001 | Empty request_id |
| REJ-INT-002 | Invalid input structure |

---

## Cross-Platform Considerations

- Float precision: 1e-6 for cross-platform determinism
- All hashes: SHA-256 hex-encoded lowercase
- Line endings: Normalized to LF internally
- Encoding: UTF-8

---

## Version History

| Version | Changes |
|---------|---------|
| 1.2.0 | Added Mycelium integration |
| 1.1.0 | Added similarity functions |
| 1.0.0 | Initial release |
