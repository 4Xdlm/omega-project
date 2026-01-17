# @omega/oracle — Module Documentation

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Overview

| Property | Value |
|----------|-------|
| **Package** | @omega/oracle |
| **Version** | 3.145.0 |
| **Status** | Active |
| **LOC** | 5,227 |
| **Tests** | 98 |
| **Layer** | AI |

---

## Purpose

The oracle package is the **AI decision engine** for OMEGA. It provides a unified interface to multiple AI backends and supports streaming responses, caching, and metrics collection.

---

## Public API

### Oracle Class

```typescript
class Oracle {
  constructor(config: OracleConfig)

  async query(prompt: string, context?: Context): Promise<OracleResponse>
  async stream(prompt: string, context?: Context): AsyncIterable<StreamChunk>

  getMetrics(): OracleMetrics
  clearCache(): void
}
```

---

### StreamingOracle Class

```typescript
class StreamingOracle extends Oracle {
  async *stream(prompt: string, context?: Context): AsyncIterable<StreamChunk>
}
```

---

### Factory Function

```typescript
function createOracle(config: OracleConfig): Oracle
function createStreamingOracle(config: OracleConfig): StreamingOracle
```

---

## Configuration

### OracleConfig

```typescript
interface OracleConfig {
  // Required
  backend: Backend;

  // Authentication
  apiKey?: string;

  // Behavior
  model?: string;
  temperature?: number;      // 0-1, default: 0.7
  maxTokens?: number;        // default: 4096

  // Caching
  cache?: CacheConfig;

  // Determinism (for testing)
  clock?: () => number;

  // Metrics
  metrics?: MetricsConfig;
}
```

### Backend

```typescript
type Backend =
  | 'openai'     // OpenAI GPT models
  | 'anthropic'  // Anthropic Claude models
  | 'local'      // Local LLM (Ollama, etc.)
  | 'mock';      // Mock for testing
```

### CacheConfig

```typescript
interface CacheConfig {
  enabled: boolean;
  maxSize?: number;    // Max entries, default: 100
  ttl?: number;        // TTL in ms, default: 3600000 (1h)
}
```

---

## Response Types

### OracleResponse

```typescript
interface OracleResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  cached: boolean;
}
```

### StreamChunk

```typescript
interface StreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  error?: Error;
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Oracle                               │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                    query() / stream()               │   │
│   └─────────────────────────────────────────────────────┘   │
│                            │                                │
│   ┌────────────────────────┼────────────────────────────┐   │
│   │                        ▼                            │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌───────────┐   │   │
│   │   │    Cache    │  │   Metrics   │  │  Adapter  │   │   │
│   │   │   (opt-in)  │  │ (collected) │  │ Selection │   │   │
│   │   └─────────────┘  └─────────────┘  └─────┬─────┘   │   │
│   │                                           │         │   │
│   └───────────────────────────────────────────┼─────────┘   │
│                                               │             │
│   ┌───────────────────────────────────────────┼─────────┐   │
│   │                    Adapters               │         │   │
│   │                                           ▼         │   │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────┐  │   │
│   │   │  OpenAI  │  │Anthropic │  │  Local   │  │Mock│  │   │
│   │   │ Adapter  │  │ Adapter  │  │ Adapter  │  │    │  │   │
│   │   └──────────┘  └──────────┘  └──────────┘  └────┘  │   │
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Internal Structure

```
packages/oracle/
├── src/
│   ├── oracle.ts           # Main Oracle class
│   ├── streaming.ts        # StreamingOracle
│   ├── adapters/
│   │   ├── openai.ts       # OpenAI adapter
│   │   ├── anthropic.ts    # Anthropic adapter
│   │   ├── local.ts        # Local LLM adapter
│   │   └── mock.ts         # Mock adapter for testing
│   ├── cache/
│   │   ├── cache.ts        # Cache implementation
│   │   └── strategies.ts   # Cache strategies
│   ├── metrics/
│   │   └── collector.ts    # Metrics collection
│   └── types.ts            # Type definitions
├── test/
│   └── *.test.ts           # 98 tests
└── package.json
```

---

## Usage Examples

### Basic Query

```typescript
import { createOracle } from '@omega/oracle';

const oracle = createOracle({
  backend: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-sonnet'
});

const response = await oracle.query('Analyze this text: ...');
console.log(response.content);
```

### Streaming Response

```typescript
import { createStreamingOracle } from '@omega/oracle';

const oracle = createStreamingOracle({
  backend: 'openai',
  apiKey: process.env.OPENAI_API_KEY
});

for await (const chunk of oracle.stream('Tell me a story')) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content);
  }
}
```

### With Caching

```typescript
const oracle = createOracle({
  backend: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  cache: {
    enabled: true,
    maxSize: 500,
    ttl: 3600000 // 1 hour
  }
});

// First call - hits API
const response1 = await oracle.query('Hello');

// Second call - returns cached
const response2 = await oracle.query('Hello');
console.log(response2.cached); // true
```

### Mock for Testing

```typescript
const mockOracle = createOracle({
  backend: 'mock',
  // Deterministic responses for testing
});

const response = await mockOracle.query('test');
// Returns predictable mock response
```

---

## Metrics

```typescript
interface OracleMetrics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  totalTokens: number;
  averageLatency: number;
  errorCount: number;
  byBackend: {
    [backend: string]: {
      queries: number;
      tokens: number;
    };
  };
}
```

---

## Dependencies

```
@omega/oracle
├── @omega/oracle-types
├── @omega/types
└── @omega/orchestrator-core
```

---

## Error Handling

```typescript
class OracleError extends Error {
  code: OracleErrorCode;
  backend: Backend;
  retryable: boolean;
}

type OracleErrorCode =
  | 'AUTH_FAILED'      // Invalid API key
  | 'RATE_LIMITED'     // Too many requests
  | 'CONTEXT_EXCEEDED' // Input too long
  | 'NETWORK_ERROR'    // Connection failed
  | 'BACKEND_ERROR';   // Provider error
```

---

## State Management

| Component | State Type | Persistence |
|-----------|------------|-------------|
| OracleCache | In-memory | Session only |
| OracleMetrics | In-memory | Session only |
| Adapters | Stateless | None |

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
