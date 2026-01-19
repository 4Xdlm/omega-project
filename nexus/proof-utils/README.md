# nexus/proof-utils

Manifest builder and verification utilities - NASA-Grade L4

## Features

- Build manifest with SHA-256 hashes
- Verify manifest integrity
- Detect tampered files
- Deterministic (time injection)

## Usage

```typescript
import { buildManifest, verifyManifest } from '@omega/proof-utils';

// Build manifest
const manifest = buildManifest(['/path/to/file1.ts', '/path/to/file2.ts']);

// Verify later
const result = verifyManifest(manifest);
if (!result.valid) {
  console.error('Tampered files:', result.tamperedFiles);
}
```

## API

See [types.ts](src/types.ts)

## Tests

```bash
npm test
```

## License

MIT
