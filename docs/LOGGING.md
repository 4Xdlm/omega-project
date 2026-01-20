# OMEGA Logging System

**Standard**: NASA-Grade L4
**VERROU 3**: Injectable Clock for deterministic testing

---

## Overview

OMEGA provides a structured logging system with injectable dependencies for deterministic testing. All timestamps come from an injected clock function, never from `Date.now()` directly.

---

## Quick Start

```typescript
import { Logger, createLogger, createTestLogger } from 'nexus/shared/logging';

// Production usage
const logger = createLogger({
  module: 'my-module',
  minLevel: 'info',
});

logger.info('Operation complete', { items: 42 });
// Output: {"timestamp":"2026-01-20T15:00:00.000Z","level":"info","module":"my-module","message":"Operation complete","context":{"items":42}}
```

---

## API Reference

### Logger Class

```typescript
interface LoggerConfig {
  module: string;         // Module name (required)
  clock?: ClockFn;        // Injectable clock (default: Date.now)
  minLevel?: LogLevel;    // Minimum level to log (default: 'info')
  output?: LogOutput;     // Custom output handler (default: console)
  correlationId?: string; // Request correlation ID
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type ClockFn = () => number;
type LogOutput = (entry: LogEntry) => void;
```

### Methods

| Method | Description |
|--------|-------------|
| `debug(message, context?)` | Log debug message |
| `info(message, context?)` | Log info message |
| `warn(message, context?)` | Log warning message |
| `error(message, context?)` | Log error message |
| `child(config)` | Create child logger with inherited config |
| `withCorrelationId(id)` | Create child with correlation ID |
| `isLevelEnabled(level)` | Check if level would be logged |
| `getMinLevel()` | Get current minimum level |
| `getModule()` | Get module name |

---

## Factory Functions

### createLogger(config)

Create a production logger:

```typescript
const logger = createLogger({
  module: 'api',
  minLevel: 'info',
});
```

### createNullLogger(module?)

Create a no-op logger for production code paths that need a logger but shouldn't output:

```typescript
const logger = createNullLogger('silent');
logger.info('This produces no output');
```

### createTestLogger(module?, clock?)

Create a logger that collects entries for test assertions:

```typescript
const { logger, entries } = createTestLogger('test', () => 1705766400000);

logger.info('Test message');

expect(entries.length).toBe(1);
expect(entries[0].message).toBe('Test message');
```

---

## Log Entry Structure

```typescript
interface LogEntry {
  timestamp: string;              // ISO 8601 timestamp
  level: LogLevel;                // Log level
  module: string;                 // Module name
  message: string;                // Log message
  context?: Record<string, unknown>;  // Structured context
  correlationId?: string;         // Request correlation ID
}
```

Example output:

```json
{
  "timestamp": "2026-01-20T15:00:00.000Z",
  "level": "info",
  "module": "atlas",
  "message": "View inserted",
  "context": {
    "viewId": "user-123",
    "version": 1
  },
  "correlationId": "req-abc-123"
}
```

---

## Integration with OMEGA Modules

### Atlas Integration

```typescript
import { AtlasStore } from 'nexus/atlas/src/store';
import { createLogger } from 'nexus/shared/logging';

const logger = createLogger({ module: 'atlas' });
const store = new AtlasStore({
  clock: { now: () => Date.now() },
  logger,
});

// Operations are now logged
store.insert('view-1', { name: 'test' });
// Logs: View inserted { viewId: 'view-1', version: 1 }
```

### Raw Storage Integration

```typescript
import { RawStorage } from 'nexus/raw/src/storage';
import { MemoryBackend } from 'nexus/raw/src/backends/memoryBackend';
import { createLogger } from 'nexus/shared/logging';

const logger = createLogger({ module: 'raw' });
const storage = new RawStorage({
  backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
  clock: { now: () => Date.now() },
  logger,
});

// Operations are now logged
await storage.store('key', Buffer.from('data'));
// Logs: Entry stored { key: 'key', size: 4, compressed: false, encrypted: false }
```

---

## Deterministic Testing (VERROU 3)

The logger uses injectable clock for deterministic timestamps:

```typescript
import { Logger } from 'nexus/shared/logging';

test('deterministic timestamps', () => {
  const entries: LogEntry[] = [];
  let mockTime = 1000000000000;

  const logger = new Logger({
    module: 'test',
    clock: () => mockTime,
    output: (entry) => entries.push(entry),
  });

  logger.info('First');
  mockTime += 1000;
  logger.info('Second');

  expect(entries[0].timestamp).toBe('2001-09-09T01:46:40.000Z');
  expect(entries[1].timestamp).toBe('2001-09-09T01:46:41.000Z');
});
```

---

## Correlation IDs

Use correlation IDs to trace requests across modules:

```typescript
const baseLogger = createLogger({ module: 'api' });

// Per-request logger
const requestLogger = baseLogger.withCorrelationId('req-12345');
requestLogger.info('Request received');

// Service-level logger inherits correlation ID
const serviceLogger = requestLogger.child({ module: 'service' });
serviceLogger.info('Processing');

// Both logs have correlationId: 'req-12345'
```

---

## Log Levels

| Level | Priority | Use Case |
|-------|----------|----------|
| `debug` | 0 | Detailed debugging information |
| `info` | 1 | General operational information |
| `warn` | 2 | Warning conditions |
| `error` | 3 | Error conditions |

Set minimum level to filter logs:

```typescript
const logger = createLogger({
  module: 'app',
  minLevel: 'warn',  // Only warn and error logged
});

logger.debug('Not logged');
logger.info('Not logged');
logger.warn('Logged');
logger.error('Logged');
```

---

## Best Practices

1. **Use structured context** - Pass objects, not string interpolation:
   ```typescript
   // Good
   logger.info('User created', { userId: '123', email: 'a@b.com' });

   // Avoid
   logger.info(`User created: 123, a@b.com`);
   ```

2. **Use correlation IDs for request tracing** - Create request-scoped loggers

3. **Keep debug logs detailed** - They're filtered in production

4. **Use appropriate levels**:
   - `debug`: Internal state, detailed flow
   - `info`: Business operations, milestones
   - `warn`: Recoverable issues, deprecations
   - `error`: Failures, exceptions

5. **Inject clock in tests** - Ensures deterministic timestamps

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Claude Opus 4.5 | Initial logging system |
