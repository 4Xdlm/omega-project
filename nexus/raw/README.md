# @omega-private/nexus-raw

OMEGA Raw — Blob storage with compression and encryption.

## Installation

```bash
# Configure GitHub Packages
npm config set @omega-private:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN

# Install
npm install @omega-private/nexus-raw
```

## Usage

```typescript
import { RawStorage } from '@omega-private/nexus-raw'
import { MemoryBackend } from '@omega-private/nexus-raw/backends/memoryBackend'

const raw = new RawStorage({
  backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }), // 100MB
  clock: { now: () => Date.now() }
})

// Store data
await raw.store('path/to/file.json', Buffer.from('{"key": "value"}'))

// Retrieve data
const data = await raw.retrieve('path/to/file.json')
console.log(data.toString()) // {"key": "value"}

// List keys
const { keys } = await raw.list()

// Delete
await raw.delete('path/to/file.json')
```

## API

### RawStorage

| Method | Description |
|--------|-------------|
| `store(key, data)` | Store blob data |
| `retrieve(key)` | Retrieve blob data |
| `list()` | List all keys |
| `delete(key)` | Delete blob |
| `exists(key)` | Check if key exists |

## Backends

### MemoryBackend

In-memory storage for testing and development.

```typescript
import { MemoryBackend } from '@omega-private/nexus-raw/backends/memoryBackend'

const backend = new MemoryBackend({
  maxSize: 100 * 1024 * 1024 // 100MB limit
})
```

### FileBackend

File system storage for production.

```typescript
import { FileBackend } from '@omega-private/nexus-raw/backends/fileBackend'

const backend = new FileBackend({
  rootDir: './data'
})
```

## Features

- Pluggable storage backends
- Memory and file system backends included
- Compression support (gzip)
- Encryption support (AES-256-GCM)
- TTL (time-to-live) support
- Observable (logging, metrics, tracing)
- Injectable dependencies (ClockFn)

## License

Proprietary — OMEGA Project
