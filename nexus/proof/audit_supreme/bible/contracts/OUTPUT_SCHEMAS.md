# OMEGA Output Contracts

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

This document defines all output contracts for OMEGA public APIs.

---

## ValidationResult (Validation Gate)

**Returned By:** `@omega/mycelium.validate()`

```typescript
type ValidationResult = AcceptResult | RejectResult;

interface AcceptResult {
  /**
   * Indicates successful validation
   * @invariant Always true for AcceptResult
   */
  accepted: true;

  /**
   * Processed and normalized input
   */
  processed: {
    /**
     * Normalized text
     * @invariant Line endings are LF only
     * @invariant Leading/trailing whitespace trimmed
     */
    text: string;

    /**
     * Resolved seed value
     * @invariant Always a positive integer
     */
    seed: number;

    /**
     * Resolved segmentation mode
     * @invariant Always one of SegmentMode values
     */
    mode: SegmentMode;

    /**
     * Passed-through metadata
     */
    metadata: Record<string, unknown>;
  };
}

interface RejectResult {
  /**
   * Indicates failed validation
   * @invariant Always false for RejectResult
   */
  accepted: false;

  /**
   * Rejection details
   */
  rejection: {
    /**
     * Machine-readable rejection code
     * @invariant One of 20 defined codes
     */
    code: RejectionCode;

    /**
     * Human-readable message
     * @invariant Non-empty string
     */
    message: string;

    /**
     * Rejection category
     */
    category: RejectionCategory;
  };
}
```

---

## NarrativeGenome (Core Output)

**Returned By:** `@omega/genome.analyze()`

```typescript
interface NarrativeGenome {
  /**
   * 14-dimensional emotional signature
   * @invariant All values 0-1
   * @invariant Sum equals 1.0 (±1e-6)
   */
  emotion14: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    trust: number;
    anticipation: number;
    love: number;
    hope: number;
    anxiety: number;
    confusion: number;
    curiosity: number;
    determination: number;
  };

  /**
   * Aggregate emotional characteristics
   * @invariant All values 0-1
   */
  emotionAxis: {
    intensity: number;    // Overall emotional strength
    volatility: number;   // Emotional variation
    dominance: number;    // Dominant vs submissive tone
    valence: number;      // Positive vs negative
  };

  /**
   * Writing style metrics
   * @invariant All values 0-1
   */
  styleAxis: {
    formality: number;    // Formal vs casual
    complexity: number;   // Simple vs complex
    verbosity: number;    // Concise vs verbose
    emotionality: number; // Neutral vs expressive
  };

  /**
   * Structural patterns
   * @invariant All values 0-1
   */
  structureAxis: {
    paragraphDensity: number;   // Paragraph frequency
    sentenceVariation: number;  // Sentence length variation
    dialogueRatio: number;      // Dialogue vs narrative
  };

  /**
   * Rhythm and pacing
   * @invariant All values 0-1
   */
  tempoAxis: {
    rhythm: number;      // Regular vs irregular
    pacing: number;      // Fast vs slow
    tension: number;     // Tense vs relaxed
    resolution: number;  // Resolved vs open
  };

  /**
   * Extraction metadata
   */
  metadata: {
    version: string;     // Genome version
    timestamp: string;   // ISO 8601
    textLength: number;  // Input character count
    segmentCount: number;// Number of segments
    mode: SegmentMode;   // Segmentation used
  };
}
```

---

## GenomeFingerprint

**Returned By:** `@omega/genome.computeFingerprint()`

```typescript
/**
 * SHA-256 hash of canonical genome serialization
 * @invariant Exactly 64 lowercase hex characters
 * @invariant Same genome always produces same fingerprint
 * @invariant Different genomes produce different fingerprints (collision-resistant)
 */
type GenomeFingerprint = string;

// Example: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
```

---

## SimilarityResult

**Returned By:** `@omega/genome.compare()`

```typescript
interface SimilarityResult {
  /**
   * Similarity score
   * @invariant 0-1 range
   * @invariant 1.0 = identical
   * @invariant 0.0 = completely different
   */
  score: number;

  /**
   * Categorical verdict
   * @invariant Derived from score thresholds
   */
  verdict: SimilarityVerdict;
}

type SimilarityVerdict =
  | 'IDENTICAL'        // score >= 0.99
  | 'VERY_SIMILAR'     // score >= 0.90
  | 'SIMILAR'          // score >= 0.75
  | 'SOMEWHAT_SIMILAR' // score >= 0.50
  | 'DIFFERENT';       // score < 0.50
```

---

## DetailedComparison

**Returned By:** `@omega/genome.compareDetailed()`

```typescript
interface DetailedComparison extends SimilarityResult {
  /**
   * Per-axis similarity scores
   */
  axisScores: {
    emotion14: number;
    emotionAxis: number;
    styleAxis: number;
    structureAxis: number;
    tempoAxis: number;
  };

  /**
   * Contribution of each axis to final score
   */
  contributions: {
    emotion14: number;
    emotionAxis: number;
    styleAxis: number;
    structureAxis: number;
    tempoAxis: number;
  };
}
```

---

## SearchResult

**Returned By:** `@omega/search.SearchEngine.search()`

```typescript
interface SearchResult {
  /**
   * The matched document
   */
  document: Document;

  /**
   * Relevance score
   * @invariant Positive number
   * @invariant Higher = more relevant
   */
  score: number;

  /**
   * Highlighted snippets (if enabled)
   */
  highlights: Highlight[];

  /**
   * Terms that matched
   */
  matchedTerms: string[];
}

interface Highlight {
  /**
   * Field containing match
   */
  field: string;

  /**
   * Snippet with highlights
   */
  snippet: string;

  /**
   * Match positions [start, end]
   */
  positions: [number, number][];
}
```

---

## OracleResponse

**Returned By:** `@omega/oracle.Oracle.query()`

```typescript
interface OracleResponse {
  /**
   * Generated content
   * @invariant Non-empty string
   */
  content: string;

  /**
   * Token usage statistics
   */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /**
   * Model that generated response
   */
  model: string;

  /**
   * Whether response was from cache
   */
  cached: boolean;
}
```

---

## ProofBundle

**Returned By:** `@omega/proof-pack.bundle()`

```typescript
interface ProofBundle {
  /**
   * Bundle creation timestamp
   * @invariant ISO 8601 format
   */
  timestamp: string;

  /**
   * Certification results per package
   */
  packages: PackageResult[];

  /**
   * File hashes (SHA-256)
   */
  hashes: Record<string, string>;

  /**
   * Bundle signature
   * @invariant Valid SHA-256 of bundle content
   */
  signature: string;
}

interface PackageResult {
  name: string;
  version: string;
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  duration: number;
  status: 'PASS' | 'FAIL';
}
```

---

## Invariant Summary

| Output | Invariant | Check |
|--------|-----------|-------|
| emotion14 sum | = 1.0 | Runtime assertion |
| All axis values | 0-1 range | Type + runtime |
| Fingerprint | 64 hex chars | String validation |
| Score | 0-1 range | Math constraint |
| Verdict | Matches score | Threshold mapping |
| timestamp | ISO 8601 | Format validation |

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
