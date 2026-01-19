# ADR-0001: SQLite Backend Choice

**Status**: ACCEPTED
**Date**: 2026-01-19
**Decision Makers**: Francky (Architect)

## Context

Phase A requires a SQL-capable storage backend for the Raw module.
Two main options exist in the Node.js ecosystem:

1. **better-sqlite3**: Native binding, fastest performance
2. **sql.js**: Pure JavaScript, WebAssembly-based

## Decision

**USE sql.js (pure JavaScript)**

## Rationale

### Why sql.js

1. **No Native Compilation Required**
   - Works on all platforms without build tools
   - No C++ compiler dependency
   - No node-gyp issues

2. **Portable**
   - Same binary works on Windows, Linux, macOS
   - Works in restricted environments
   - No architecture-specific binaries

3. **CI-Friendly**
   - No compilation step in CI pipeline
   - Faster cold installs
   - Smaller attack surface

4. **Sufficient for Phase A**
   - Performance acceptable for current data volumes
   - Can be upgraded to native later if needed

### Why NOT better-sqlite3

1. **Compilation Risk**
   - Requires node-gyp + Python + C++ toolchain
   - Frequently breaks with Node.js upgrades
   - Windows build failures common

2. **CI Complexity**
   - Needs OS-specific configuration
   - Build times increase significantly
   - Caching native modules is complex

3. **NASA LOCK Constraint**
   - Prompt explicitly prohibits native compilation
   - "SQLite: sql.js ONLY (pure JS)"

## Consequences

### Positive
- ✓ Zero compilation issues
- ✓ Simple installation
- ✓ Cross-platform by default
- ✓ Compliant with NASA LOCK

### Negative
- Performance ~10-20% slower than native
- Larger memory footprint (WASM)
- No concurrent write support (same as native)

### Mitigation
- Use file-backend as primary for simple cases
- Reserve SQLite for complex queries
- Implement caching layer if needed later

## Alternatives Considered

| Option | Rejected Because |
|--------|------------------|
| better-sqlite3 | Compilation risk, NASA LOCK violation |
| sqlite3 (node) | Async API, even worse compilation issues |
| LevelDB | No SQL support |
| File-only | No complex queries |

## References

- sql.js: https://github.com/sql-js/sql.js
- NASA LOCK #2: "SQLite: PURE JS OBLIGATOIRE"
