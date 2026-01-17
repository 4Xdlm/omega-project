# @omega/search — Module Documentation

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

| Property | Value |
|----------|-------|
| **Package** | @omega/search |
| **Version** | 3.155.0 |
| **Status** | Active |
| **LOC** | 9,142 |
| **Tests** | 287 |
| **Layer** | Analysis |

---

## Purpose

The search package provides **full-text search capabilities** for OMEGA. It supports indexing, querying, ranking, and filtering of narrative content.

---

## Public API

### SearchEngine Class

```typescript
class SearchEngine {
  constructor(config?: SearchConfig)

  // Indexing
  index(documents: Document[]): void
  addDocument(document: Document): void
  removeDocument(id: string): void
  clear(): void

  // Querying
  search(query: string, options?: SearchOptions): SearchResult[]
  searchWithGenome(query: string, genome: NarrativeGenome): SearchResult[]

  // Statistics
  getStats(): SearchStats
}
```

---

### Query Parser

```typescript
function parseQuery(query: string): ParsedQuery
function buildQuery(parts: QueryPart[]): ParsedQuery
```

---

### Document Types

```typescript
interface Document {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  genome?: NarrativeGenome;
}

interface SearchResult {
  document: Document;
  score: number;
  highlights: Highlight[];
  matchedTerms: string[];
}

interface Highlight {
  field: string;
  snippet: string;
  positions: [number, number][];
}
```

---

## Query Syntax

### Basic Search
```
hello world          // Match both terms
"hello world"        // Exact phrase
hello OR world       // Either term
hello -world         // Exclude term
```

### Field Search
```
content:hello        // Search in content field
author:doe           // Search in author metadata
genre:fiction        // Search in genre metadata
```

### Wildcards
```
hel*                 // Prefix match
*ello                // Suffix match
h?llo                // Single character wildcard
```

### Fuzzy Search
```
hello~               // Fuzzy match (default distance 1)
hello~2              // Fuzzy match (distance 2)
```

---

## Configuration

### SearchConfig

```typescript
interface SearchConfig {
  // Indexing
  analyzer?: Analyzer;         // Text analyzer
  tokenizer?: Tokenizer;       // Tokenization strategy
  stopWords?: string[];        // Words to ignore

  // Ranking
  ranking?: RankingConfig;     // Scoring configuration
  boosts?: FieldBoosts;        // Field weight boosts

  // Performance
  maxResults?: number;         // Default: 100
  cacheSize?: number;          // Query cache size
}
```

### RankingConfig

```typescript
interface RankingConfig {
  algorithm: 'bm25' | 'tfidf' | 'boolean';
  k1?: number;        // BM25 term saturation (default: 1.2)
  b?: number;         // BM25 length normalization (default: 0.75)
  genomeWeight?: number; // Weight for genome similarity (0-1)
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       SearchEngine                              │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      search()                            │   │
│   └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│   ┌────────────────────────┼────────────────────────────────┐   │
│   │                        ▼                                │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│   │   │ Query Parser │→ │   Index      │→ │   Ranker     │  │   │
│   │   └──────────────┘  └──────────────┘  └──────────────┘  │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      Index                               │   │
│   │                                                          │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│   │   │  Inverted    │  │  Document    │  │   Genome     │   │   │
│   │   │   Index      │  │   Store      │  │   Index      │   │   │
│   │   └──────────────┘  └──────────────┘  └──────────────┘   │   │
│   │                                                          │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Internal Structure

```
packages/search/
├── src/
│   ├── engine.ts           # SearchEngine class
│   ├── index/
│   │   ├── inverted.ts     # Inverted index
│   │   ├── document.ts     # Document store
│   │   └── genome.ts       # Genome index
│   ├── query/
│   │   ├── parser.ts       # Query parser
│   │   ├── tokenizer.ts    # Query tokenization
│   │   └── builder.ts      # Query builder
│   ├── ranking/
│   │   ├── bm25.ts         # BM25 scoring
│   │   ├── tfidf.ts        # TF-IDF scoring
│   │   └── hybrid.ts       # Hybrid ranking
│   ├── analysis/
│   │   ├── analyzer.ts     # Text analysis
│   │   ├── stemmer.ts      # Word stemming
│   │   └── stopwords.ts    # Stop word filtering
│   └── types.ts            # Type definitions
├── test/
│   └── *.test.ts           # 287 tests
└── package.json
```

---

## Usage Examples

### Basic Search

```typescript
import { SearchEngine } from '@omega/search';

const engine = new SearchEngine();

// Index documents
engine.index([
  { id: '1', content: 'The quick brown fox jumps over the lazy dog' },
  { id: '2', content: 'A quick brown dog runs in the park' },
  { id: '3', content: 'The lazy cat sleeps all day' }
]);

// Search
const results = engine.search('quick brown');
console.log(results.length); // 2
console.log(results[0].document.id); // '1' (higher score)
```

### Search with Genome Similarity

```typescript
import { SearchEngine } from '@omega/search';
import { analyze } from '@omega/genome';

const engine = new SearchEngine({
  ranking: {
    algorithm: 'bm25',
    genomeWeight: 0.3 // 30% genome similarity weight
  }
});

// Index documents with genomes
const doc = {
  id: '1',
  content: 'Once upon a time...',
  genome: analyze({ text: 'Once upon a time...' })
};
engine.addDocument(doc);

// Search with query genome context
const queryGenome = analyze({ text: 'fairy tale story' });
const results = engine.searchWithGenome('story', queryGenome);
```

### Advanced Query

```typescript
const results = engine.search(
  'content:"love story" author:shakespeare genre:tragedy -comedy',
  {
    maxResults: 10,
    highlight: true,
    fields: ['content', 'title']
  }
);

for (const result of results) {
  console.log(`${result.document.id}: ${result.score}`);
  for (const highlight of result.highlights) {
    console.log(`  ${highlight.snippet}`);
  }
}
```

---

## Statistics

```typescript
interface SearchStats {
  documentCount: number;
  termCount: number;
  indexSize: number;          // Bytes
  averageDocumentLength: number;
  queryCount: number;
  cacheHitRate: number;
}
```

---

## Dependencies

```
@omega/search
├── @omega/genome
├── @omega/types
└── @omega/mycelium (for text validation)
```

---

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Index document | O(n) | n = document length |
| Search (term) | O(k) | k = matching documents |
| Search (phrase) | O(k * m) | m = phrase length |
| Genome comparison | O(d) | d = dimensions (fixed) |

---

## State Management

| Component | State Type | Persistence |
|-----------|------------|-------------|
| Inverted Index | In-memory | Session only |
| Document Store | In-memory | Session only |
| Query Cache | In-memory | Session only |

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
