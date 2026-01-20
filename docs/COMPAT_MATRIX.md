# Compatibility Matrix — OMEGA

**Version**: 1.0.0
**Standard**: NASA-Grade L4
**Effective**: v5.3.1+

---

## Node.js Compatibility

| Node.js Version | Status | Notes |
|-----------------|--------|-------|
| 22.x | Supported | Recommended for new projects |
| 20.x | Supported | LTS - Production recommended |
| 18.x | Supported | Minimum supported version |
| 16.x | Not Supported | EOL since September 2023 |
| 14.x | Not Supported | EOL since April 2023 |

### Node.js Features Required

- ES Modules support (native)
- `crypto` module (built-in)
- `fs/promises` API
- `AsyncLocalStorage` (for tracing)

---

## Operating System Compatibility

| Operating System | Status | CI Tested |
|------------------|--------|-----------|
| Linux (Ubuntu 20.04+) | Supported | Yes |
| Linux (Debian 11+) | Supported | Yes |
| Linux (Alpine 3.14+) | Supported | Yes |
| macOS 11 (Big Sur)+ | Supported | Yes |
| macOS 12 (Monterey)+ | Supported | Yes |
| macOS 13 (Ventura)+ | Supported | Yes |
| Windows 10 (1909+) | Supported | Yes |
| Windows 11 | Supported | Yes |
| Windows Server 2019+ | Supported | No (manual) |

### Platform-Specific Notes

**Linux**:
- Tested on x64 and arm64
- Docker official Node images supported

**macOS**:
- Tested on Intel and Apple Silicon (arm64)
- Rosetta 2 not required

**Windows**:
- PowerShell 5.1+ required for scripts
- Git Bash supported for development
- WSL2 supported (follows Linux compatibility)

---

## TypeScript Compatibility

| TypeScript Version | Status | Notes |
|--------------------|--------|-------|
| 5.3+ | Supported | Recommended |
| 5.0 - 5.2 | Supported | Minimum for full features |
| 4.9 | Partial | May work, not tested |
| < 4.9 | Not Supported | Missing required features |

### TypeScript Configuration

Required `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  }
}
```

---

## Package Manager Compatibility

| Package Manager | Status | Notes |
|-----------------|--------|-------|
| npm 9+ | Supported | Recommended |
| npm 8 | Supported | Minimum |
| pnpm 8+ | Supported | Tested |
| yarn 3+ | Supported | Tested with nodeLinker: node-modules |
| yarn 1.x | Not Tested | May work |
| bun 1.0+ | Experimental | Not officially supported |

---

## CI/CD Matrix

### GitHub Actions Matrix

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    node: [18, 20, 22]
```

**Total configurations**: 9 (3 OS x 3 Node versions)

### Required CI Checks

| Check | Required | Blocking |
|-------|----------|----------|
| Unit tests | Yes | Yes |
| Type check | Yes | Yes |
| Lint | Yes | Yes |
| Coverage (>= 95%) | Yes | Yes |
| API surface snapshot | Yes | Yes |
| Security scan | Yes | No |
| Benchmarks | No | No |

---

## Browser Compatibility

OMEGA is **Node.js only**. Browser environments are not supported.

| Environment | Status |
|-------------|--------|
| Node.js | Supported |
| Deno | Not Supported |
| Bun | Experimental |
| Browser | Not Supported |
| Cloudflare Workers | Not Supported |

---

## Dependency Compatibility

### Runtime Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| (none) | - | Zero runtime dependencies |

### Dev Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| typescript | ^5.3.0 | Type checking, build |
| vitest | ^2.0.0 | Testing |
| eslint | ^8.0.0 | Linting |
| prettier | ^3.0.0 | Formatting |

### Optional Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| 0x | ^5.0.0 | CPU profiling |
| typedoc | ^0.25.0 | API documentation |

---

## Database Compatibility

OMEGA does not require external databases. Storage is file-based.

| Storage Backend | Status |
|-----------------|--------|
| FileBackend (local filesystem) | Supported |
| MemoryBackend (in-memory) | Supported |
| S3/Cloud | Not Supported (future) |
| SQLite | Not Supported |
| PostgreSQL | Not Supported |

---

## Migration Guides

### Upgrading Node.js

When upgrading Node.js versions:

1. Update `.nvmrc` or `.node-version`
2. Run `npm ci`
3. Run `npm test`
4. Verify no deprecation warnings

### Upgrading TypeScript

When upgrading TypeScript:

1. Update `devDependencies`
2. Run `npm run typecheck`
3. Fix any new type errors
4. Update `tsconfig.json` if needed

---

## Testing Compatibility

Before claiming compatibility with a new platform/version:

1. All 1866+ tests must pass
2. No new deprecation warnings
3. Performance within 10% of baseline
4. Manual smoke test of key workflows

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Phase B Industrial | Initial release |
