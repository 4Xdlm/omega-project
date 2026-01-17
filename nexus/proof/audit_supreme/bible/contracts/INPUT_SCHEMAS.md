# OMEGA Input Contracts

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

This document defines all input contracts for OMEGA public APIs.

---

## DNAInput (Validation Entry Point)

**Used By:** `@omega/mycelium.validate()`

```typescript
interface DNAInput {
  /**
   * The text content to analyze
   * @required
   * @constraints
   *   - Must be valid UTF-8
   *   - Length: 10 - 1,000,000 characters
   *   - No binary content
   *   - No control characters (except newline, tab)
   *   - Not HTML, JSON, or XML
   */
  text: string;

  /**
   * Optional metadata attached to the analysis
   * @optional
   * @constraints
   *   - Must be JSON-serializable
   *   - No circular references
   */
  metadata?: Record<string, unknown>;

  /**
   * Seed for deterministic operations
   * @optional
   * @default 42
   * @constraints
   *   - Must be a finite positive integer
   *   - Range: 0 - 2^32-1
   */
  seed?: number;

  /**
   * Segmentation mode for text analysis
   * @optional
   * @default 'auto'
   */
  mode?: SegmentMode;
}

type SegmentMode =
  | 'auto'       // Automatic detection
  | 'paragraph'  // Split by paragraph
  | 'sentence'   // Split by sentence
  | 'chunk';     // Fixed-size chunks
```

---

## AnalyzeOptions (Genome Analysis)

**Used By:** `@omega/genome.analyze()`

```typescript
interface AnalyzeOptions {
  /**
   * Include detailed extraction metadata
   * @optional
   * @default false
   */
  includeMetadata?: boolean;

  /**
   * Segmentation configuration
   * @optional
   */
  segmentation?: {
    mode: SegmentMode;
    chunkSize?: number;  // For 'chunk' mode, default: 1000
  };

  /**
   * Feature extraction flags
   * @optional
   * @default All enabled
   */
  features?: {
    emotion14?: boolean;
    emotionAxis?: boolean;
    styleAxis?: boolean;
    structureAxis?: boolean;
    tempoAxis?: boolean;
  };
}
```

---

## CompareOptions (Genome Comparison)

**Used By:** `@omega/genome.compare()`, `@omega/genome.compareDetailed()`

```typescript
interface CompareOptions {
  /**
   * Axes to include in comparison
   * @optional
   * @default All axes
   */
  axes?: {
    emotion14?: boolean;
    emotionAxis?: boolean;
    styleAxis?: boolean;
    structureAxis?: boolean;
    tempoAxis?: boolean;
  };

  /**
   * Custom weights for each axis
   * @optional
   * @default Equal weights (0.2 each)
   */
  weights?: {
    emotion14?: number;    // 0-1
    emotionAxis?: number;  // 0-1
    styleAxis?: number;    // 0-1
    structureAxis?: number;// 0-1
    tempoAxis?: number;    // 0-1
  };
  // Note: Weights should sum to 1.0
}
```

---

## OracleConfig (AI Configuration)

**Used By:** `@omega/oracle.createOracle()`

```typescript
interface OracleConfig {
  /**
   * AI backend to use
   * @required
   */
  backend: 'openai' | 'anthropic' | 'local' | 'mock';

  /**
   * API key for authentication
   * @optional (required for openai/anthropic)
   */
  apiKey?: string;

  /**
   * Model identifier
   * @optional
   * @default Backend-specific default
   */
  model?: string;

  /**
   * Temperature for response generation
   * @optional
   * @default 0.7
   * @constraints 0-1
   */
  temperature?: number;

  /**
   * Maximum tokens in response
   * @optional
   * @default 4096
   * @constraints 1-128000 (model-dependent)
   */
  maxTokens?: number;

  /**
   * Cache configuration
   * @optional
   */
  cache?: {
    enabled: boolean;
    maxSize?: number;  // Max entries, default: 100
    ttl?: number;      // TTL in ms, default: 3600000
  };

  /**
   * Clock function for determinism
   * @optional
   * @default Date.now
   */
  clock?: () => number;
}
```

---

## SearchConfig (Search Engine)

**Used By:** `@omega/search.SearchEngine()`

```typescript
interface SearchConfig {
  /**
   * Text analyzer configuration
   * @optional
   */
  analyzer?: {
    lowercase?: boolean;     // Default: true
    stemming?: boolean;      // Default: true
    removeAccents?: boolean; // Default: true
  };

  /**
   * Stop words to ignore
   * @optional
   * @default English stop words
   */
  stopWords?: string[];

  /**
   * Ranking algorithm
   * @optional
   * @default 'bm25'
   */
  ranking?: {
    algorithm: 'bm25' | 'tfidf' | 'boolean';
    k1?: number;        // BM25 param, default: 1.2
    b?: number;         // BM25 param, default: 0.75
    genomeWeight?: number; // 0-1, default: 0
  };

  /**
   * Maximum results per query
   * @optional
   * @default 100
   */
  maxResults?: number;
}
```

---

## SearchQuery

**Used By:** `@omega/search.SearchEngine.search()`

```typescript
interface SearchOptions {
  /**
   * Maximum results to return
   * @optional
   * @default Config maxResults or 100
   */
  maxResults?: number;

  /**
   * Fields to search in
   * @optional
   * @default ['content']
   */
  fields?: string[];

  /**
   * Include highlight snippets
   * @optional
   * @default false
   */
  highlight?: boolean;

  /**
   * Highlight configuration
   * @optional
   */
  highlightConfig?: {
    preTag?: string;    // Default: '<mark>'
    postTag?: string;   // Default: '</mark>'
    fragmentSize?: number; // Default: 100
  };

  /**
   * Filter documents by metadata
   * @optional
   */
  filters?: Record<string, unknown>;
}
```

---

## Document (Search Indexing)

**Used By:** `@omega/search.SearchEngine.index()`

```typescript
interface Document {
  /**
   * Unique document identifier
   * @required
   * @constraints Non-empty string
   */
  id: string;

  /**
   * Document content
   * @required
   * @constraints Non-empty string
   */
  content: string;

  /**
   * Optional metadata
   * @optional
   */
  metadata?: Record<string, unknown>;

  /**
   * Pre-computed genome
   * @optional
   */
  genome?: NarrativeGenome;
}
```

---

## Validation Rules Summary

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| text | string | Yes | UTF-8, 10-1M chars, no binary |
| metadata | object | No | JSON-serializable |
| seed | number | No | 0 to 2^32-1, integer |
| mode | string | No | Enum: auto, paragraph, sentence, chunk |
| apiKey | string | Context | Required for cloud backends |
| temperature | number | No | 0-1 |
| maxTokens | number | No | 1-128000 |

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
