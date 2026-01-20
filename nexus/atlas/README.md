# @omega-private/nexus-atlas

OMEGA Atlas — Event indexing and querying system.

## Installation

```bash
# Configure GitHub Packages
npm config set @omega-private:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN

# Install
npm install @omega-private/nexus-atlas
```

## Usage

```typescript
import { AtlasStore } from '@omega-private/nexus-atlas'

const atlas = new AtlasStore({
  clock: { now: () => Date.now() }
})

// Insert event
const view = atlas.insert('event-1', {
  type: 'user-action',
  userId: '123',
  action: 'login'
})

// Query events
const results = atlas.query({
  filter: { field: 'type', operator: 'eq', value: 'user-action' },
  limit: 100
})

// Get single view
const view = atlas.get('event-1')

// Update
atlas.update('event-1', { action: 'logout' })

// Delete
atlas.delete('event-1')
```

## API

### AtlasStore

| Method | Description |
|--------|-------------|
| `insert(id, data)` | Insert a new view |
| `update(id, data)` | Update existing view |
| `upsert(id, data)` | Insert or update |
| `delete(id)` | Delete view |
| `get(id)` | Get view by ID |
| `has(id)` | Check if view exists |
| `query(options)` | Query views with filters |
| `size()` | Get total view count |

### Query Options

```typescript
{
  filter?: { field: string, operator: 'eq' | 'ne' | 'gt' | 'lt', value: unknown },
  limit?: number,
  offset?: number
}
```

## Features

- In-memory view storage with CQRS pattern
- Query with filters and pagination
- Subscription system for real-time updates
- Index management for fast lookups
- Observable (logging, metrics, tracing)
- Injectable dependencies (ClockFn)

## License

Proprietary — OMEGA Project
