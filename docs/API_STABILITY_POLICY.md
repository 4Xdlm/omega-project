# API Stability Policy — OMEGA

**Version**: 1.0.0
**Standard**: NASA-Grade L4
**Effective**: v5.3.1+

---

## Public API Surface

APIs marked `@public` in source code are **guaranteed stable** within a major version.

### Modules with Public APIs

| Module | Package Name | Public Exports |
|--------|--------------|----------------|
| nexus/atlas | @omega-private/nexus-atlas | AtlasStore, IndexManager, SubscriptionManager, executeQuery, validateQuery |
| nexus/raw | @omega-private/nexus-raw | RawStorage, FileBackend, MemoryBackend, encryption/compression utils |
| nexus/proof-utils | @omega-private/proof-utils | manifest, verify, snapshot, diff, serialize |
| nexus/ledger | @omega-private/nexus-ledger | LedgerStore, LedgerEntry types |

---

## Versioning

OMEGA follows **Semantic Versioning 2.0.0** (SemVer):

```
MAJOR.MINOR.PATCH[-PRERELEASE]

Examples:
  5.3.1          - Patch release
  5.4.0          - Minor release (new features)
  6.0.0          - Major release (breaking changes)
  6.0.0-alpha.1  - Pre-release
```

### Version Increments

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Bug fix (backward compatible) | PATCH | 5.3.0 → 5.3.1 |
| New feature (backward compatible) | MINOR | 5.3.1 → 5.4.0 |
| Breaking change | MAJOR | 5.4.0 → 6.0.0 |
| Pre-release | PRERELEASE | 6.0.0-alpha.1 |

---

## Breaking Changes Policy

### Announcement Window

Breaking changes are announced **2 minor versions in advance** with deprecation warnings.

```typescript
/**
 * @deprecated Since v5.4.0. Use `executeQuery()` instead. Will be removed in v6.0.0.
 * @public
 */
export function query(index: Index, q: Query): Result {
  console.warn('query() is deprecated. Use executeQuery() instead.');
  return executeQuery(index, q);
}
```

### Breaking Change Checklist

Before introducing a breaking change:

- [ ] Document in CHANGELOG.md
- [ ] Add deprecation warning 2 versions before removal
- [ ] Update migration guide
- [ ] Update API surface tests
- [ ] Announce in release notes

---

## API Annotations

### @public

Stable API. Guaranteed backward compatible within major version.

```typescript
/**
 * Execute a query against an index.
 * @public
 * @since v2.0.0
 */
export function executeQuery<T>(index: Index<T>, query: Query): QueryResult<T> {
  // Implementation
}
```

### @internal

Internal implementation detail. May change without notice.

```typescript
/**
 * Internal query optimizer.
 * @internal
 */
function _optimizeQuery(query: Query): Query {
  // Implementation
}
```

### @experimental

Experimental API. May change rapidly between minor versions.

```typescript
/**
 * Experimental streaming query support.
 * @experimental
 * @since v5.4.0
 */
export function streamQuery<T>(index: Index<T>, query: Query): AsyncIterable<T> {
  // Implementation
}
```

### @deprecated

Scheduled for removal. Use alternative.

```typescript
/**
 * @deprecated Since v5.3.0. Use `newMethod()` instead.
 * @public
 */
export function oldMethod(): void {
  // Implementation
}
```

---

## Stability Tiers

| Tier | Annotation | Stability Guarantee |
|------|------------|---------------------|
| Stable | `@public` | No breaking changes within major version |
| Internal | `@internal` | No guarantee, may change any time |
| Experimental | `@experimental` | May change between minor versions |
| Deprecated | `@deprecated` | Will be removed in specified version |

---

## API Surface Testing

All public APIs are covered by snapshot tests:

```typescript
// tests/api-surface.test.ts
describe('API Surface — Snapshot', () => {
  test('Atlas public exports', async () => {
    const exports = Object.keys(await import('../nexus/atlas/src'));
    expect(exports).toMatchSnapshot();
  });
});
```

Any change to public exports will cause snapshot tests to fail, requiring explicit approval.

---

## Exception: Security Fixes

Security vulnerabilities may require breaking changes without the standard deprecation window.

In such cases:
1. CVE or security advisory published
2. Breaking change documented in SECURITY.md
3. Patch released immediately
4. Migration guide provided

---

## Contact

For API stability questions or concerns:
- Open an issue with label `api-stability`
- Reference this document

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Phase B Industrial | Initial release |
