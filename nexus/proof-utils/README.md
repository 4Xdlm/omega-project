# @omega-private/proof-utils

OMEGA Proof Utils — Cryptographic verification and manifests.

## Installation

```bash
# Configure GitHub Packages
npm config set @omega-private:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN

# Install
npm install @omega-private/proof-utils
```

## Usage

```typescript
import { buildManifest, verifyManifest } from '@omega-private/proof-utils'

// Build manifest from file paths
const manifest = buildManifest([
  '/path/to/file1.ts',
  '/path/to/file2.ts',
  '/path/to/data.json'
])

console.log(manifest.entries.length) // 3
console.log(manifest.rootHash) // SHA-256 root hash

// Verify manifest integrity
const result = verifyManifest(manifest)

if (result.valid) {
  console.log('All files verified')
} else {
  console.error('Verification failed:', result.errors)
}
```

## API

### buildManifest(paths)

Build a manifest from an array of file paths.

```typescript
const manifest = buildManifest(['/file1.ts', '/file2.ts'])

// Returns:
{
  entries: [
    { path: '/file1.ts', hash: '...', size: 1234 },
    { path: '/file2.ts', hash: '...', size: 5678 }
  ],
  rootHash: '...',
  timestamp: 1234567890,
  version: '1.0.0'
}
```

### verifyManifest(manifest)

Verify a manifest against current file state.

```typescript
const result = verifyManifest(manifest)

// Returns:
{
  valid: boolean,
  errors: readonly string[]
}
```

## Features

- SHA-256 cryptographic hashes
- Merkle tree root hash
- File integrity verification
- Tamper detection
- Deterministic timestamps (injectable ClockFn)
- Lightweight and fast

## Use Cases

- Proof packs for audit trails
- Build artifact verification
- Deployment integrity checks
- Backup verification
- Change detection

## License

Proprietary — OMEGA Project
