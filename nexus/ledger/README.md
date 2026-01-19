# nexus/ledger

Event sourcing ledger with append-only guarantees and runtime validation.

## Features

- Append-only event store
- Runtime validation (strict reject)
- Source registry (add/get)
- Entity projection via replay
- 100% deterministic (time injection)
- >=95% test coverage

## Usage

```typescript
import { EventStore, Registry, validateEvent } from '@omega/nexus-ledger';

// Create event (with injected timestamp)
const event = {
  type: 'CREATED',
  payload: { id: '123' },
  timestamp: Date.now()  // Only in app code, not in module
};

// Validate
const result = validateEvent(event);
if (result.valid) {
  EventStore.append(event);
}

// Registry
Registry.register({ sourceId: 'source-1', name: 'Test', version: '1.0.0' });
```

## API

See [types.ts](src/types.ts) for complete API.

## Tests

```bash
npm test
```

## License

MIT
