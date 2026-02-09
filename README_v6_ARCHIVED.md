# OMEGA

**Production-ready event processing and verification system.**

[![CI](https://img.shields.io/badge/CI-9%20configs-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-2126%20passed-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A595%25-brightgreen)]()
[![Version](https://img.shields.io/badge/version-v6.0.0--INDUSTRIAL-blue)]()
[![License](https://img.shields.io/badge/license-Proprietary-red)]()

---

## Features

- **Atlas**: Event indexing and querying with CQRS pattern
- **Raw**: Encrypted blob storage with pluggable backends
- **Proof Utils**: Cryptographic verification and manifests
- **Observability**: Structured logging, metrics, distributed tracing
- **Performance**: Benchmarked and optimized (<3% of budgets)
- **Security**: CodeQL, dependency audits, integrity checks
- **CI/CD**: GitHub Actions matrix (3 OS × 3 Node = 9 configurations)

---

## Quick Start

### Prerequisites

- Node.js ≥18.0.0
- npm ≥9.0.0

### Installation

```bash
# Configure GitHub Packages
npm config set @omega-private:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN

# Install packages
npm install @omega-private/nexus-atlas
npm install @omega-private/nexus-raw
npm install @omega-private/proof-utils
```

### Basic Usage

```typescript
import { AtlasStore } from '@omega-private/nexus-atlas'
import { RawStorage, MemoryBackend } from '@omega-private/nexus-raw'
import { buildManifest, verifyManifest } from '@omega-private/proof-utils'

// 1. Store events in Atlas
const atlas = new AtlasStore({ clock: { now: () => Date.now() } })
atlas.insert('event-1', {
  type: 'user-action',
  userId: '123',
  action: 'login',
  timestamp: Date.now()
})

// 2. Store blobs in Raw
const raw = new RawStorage({
  backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 })
})
await raw.store('data.json', Buffer.from('{"key": "value"}'))

// 3. Verify integrity
const manifest = buildManifest(['./data/file1.json', './data/file2.json'])
const verification = verifyManifest(manifest)
console.log('Integrity:', verification.valid ? 'OK' : 'FAILED')
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System structure and design |
| [Workflows](docs/WORKFLOWS.md) | E2E integration patterns |
| [Logging](docs/LOGGING.md) | Structured logging guide |
| [Metrics](docs/METRICS.md) | Metrics collection guide |
| [Tracing](docs/TRACING.md) | Distributed tracing guide |
| [Performance](docs/PERFORMANCE_BUDGETS.md) | Performance budgets |
| [Security](SECURITY.md) | Security policy |
| [Contributing](CONTRIBUTING.md) | Contribution guidelines |
| [Changelog](CHANGELOG.md) | Version history |

---

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [@omega-private/nexus-atlas](nexus/atlas) | Event indexing and querying | 2.0.0 |
| [@omega-private/nexus-raw](nexus/raw) | Blob storage with encryption | 2.0.0 |
| [@omega-private/proof-utils](nexus/proof-utils) | Cryptographic verification | 2.0.0 |
| [@omega-private/nexus-shared](nexus/shared) | Logging, metrics, tracing | 2.0.0 |

---

## Development

```bash
# Clone repository
git clone https://github.com/omega/omega-project.git
cd omega-project

# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run benchmarks
npm run bench

# Build packages
npm run build

# Full CI pipeline
npm run ci
```

---

## Performance

All operations meet or exceed performance budgets (p95):

| Operation | Result | Budget | Status |
|-----------|--------|--------|--------|
| Atlas query (10k items) | 0.53ms | <100ms | ✅ 0.5% |
| Raw store (10 MB) | 5.35ms | <1000ms | ✅ 0.5% |
| Proof verify (100 files) | 5.06ms | <200ms | ✅ 2.5% |

**All operations <3% of budget targets.**

---

## Testing

- **2126 tests** (100% pass rate)
- **≥95% coverage** (enforced in CI)
- **21 E2E integration tests**
- **CI matrix**: 3 OS × 3 Node versions = 9 configurations

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests only
npm test -- tests/e2e
```

---

## Security

- CodeQL static analysis (weekly)
- Dependency audits (automated)
- Secrets scanning (TruffleHog)
- License compliance checks
- FROZEN module integrity verification

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## Architecture

```
omega-project/
├── nexus/
│   ├── atlas/          # Event indexing (AtlasStore)
│   ├── raw/            # Blob storage (RawStorage)
│   ├── proof-utils/    # Verification (buildManifest, verifyManifest)
│   ├── shared/         # Logging, metrics, tracing
│   ├── bench/          # Benchmarks
│   └── proof/          # Phase proof packs
├── packages/
│   ├── genome/         # FROZEN — Emotional analysis core
│   └── sentinel/       # FROZEN — Security gateway
├── tests/
│   ├── e2e/            # End-to-end integration tests
│   └── ...             # Unit tests
├── docs/               # Documentation
└── scripts/            # Build and CI scripts
```

---

## Key Principles

1. **FROZEN = Sacred** — Core modules are certified and immutable
2. **Tests First** — No merge without green tests
3. **Proof Required** — Every phase produces verifiable evidence
4. **Observable** — Logging, metrics, and tracing everywhere
5. **Deterministic** — Injectable dependencies for testing

---

## License

**Proprietary** — OMEGA Project

All rights reserved. See [LICENSE](LICENSE) for details.

---

## Maintainers

- **Architect**: Francky
- **Standard**: NASA-Grade L4 / DO-178C Level A

---

**Built with aerospace-grade engineering standards.**
