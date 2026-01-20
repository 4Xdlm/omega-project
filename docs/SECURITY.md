# Security Policy — OMEGA

**Version**: 1.0.0
**Standard**: NASA-Grade L4
**Last Updated**: 2026-01-20

---

## Supported Versions

| Version | Status | Security Support |
|---------|--------|------------------|
| 6.x | Active | Full support |
| 5.x | Maintained | Security fixes only |
| < 5.0 | End of Life | No support |

---

## Reporting Vulnerabilities

### DO NOT

- Open public GitHub issues for security vulnerabilities
- Discuss vulnerabilities in public channels
- Share vulnerability details before fix is released

### DO

1. **Email**: security@omega-project.example (placeholder)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

### Response Timeline

| Action | Timeframe |
|--------|-----------|
| Initial acknowledgment | 48 hours |
| Severity assessment | 5 business days |
| Fix development | Based on severity |
| Public disclosure | After fix released |

### Severity Levels

| Level | Description | Fix Timeline |
|-------|-------------|--------------|
| CRITICAL | Remote code execution, data breach | 24-48 hours |
| HIGH | Privilege escalation, auth bypass | 7 days |
| MEDIUM | Information disclosure, DoS | 30 days |
| LOW | Minor issues | Next release |

---

## Security Features

### Path Traversal Protection

All file operations use path sanitization:

```typescript
// nexus/raw/src/utils/paths.ts
sanitizeKey(key: string): string
- Blocks ".." path components
- Validates characters (alphanumeric, dash, underscore, dot)
- URL decodes before validation
- Rejects hidden files (starting with .)
```

**Protection against**: T1-PATH-TRAVERSAL, T2-ZIP-SLIP

### Data Integrity

All stored data includes checksum verification:

```typescript
// On store
const checksum = computeChecksum(data);
metadata.checksum = checksum;

// On retrieve
assertChecksum(data, metadata.checksum);
```

**Algorithm**: SHA-256
**Protection against**: T4-DATA-TAMPERING

### Encryption Support

Optional AES-256-GCM encryption for sensitive data:

```typescript
const storage = new RawStorage({
  backend: new FileBackend({ rootDir: './data', clock }),
  keyring: myKeyring,
  defaultEncrypt: true,
});

await storage.store('secret', data, { encrypt: true });
```

**Protection against**: Data at rest disclosure

### Structured Errors

Errors expose only controlled information:

```typescript
class OmegaError extends Error {
  readonly code: string;
  readonly context: Record<string, unknown>; // No sensitive data
}
```

**Protection against**: T7-INFO-LEAK

### Zero Runtime Dependencies

Core modules have no runtime dependencies:

```
nexus/atlas: 0 dependencies
nexus/raw: 0 dependencies
nexus/proof-utils: 0 dependencies
```

**Protection against**: T10-SUPPLY-CHAIN

---

## Security Best Practices

### For Application Developers

1. **Validate Input**: Always validate user input before passing to OMEGA
2. **Use Encryption**: Enable encryption for sensitive data
3. **Rotate Keys**: Implement key rotation policy
4. **Verify Manifests**: Verify integrity before using restored data
5. **Limit Access**: Use filesystem permissions on storage directories
6. **Monitor Logs**: Watch for unusual access patterns

### Example: Secure Storage Setup

```typescript
import { RawStorage, FileBackend, Keyring } from '@omega-private/nexus-raw';

// Create keyring with secure key
const keyring = new Keyring();
keyring.addKey('main', crypto.randomBytes(32)); // 256-bit key

// Configure storage with encryption
const storage = new RawStorage({
  backend: new FileBackend({
    rootDir: './secure-data',
    clock: { now: () => Date.now() },
  }),
  keyring,
  defaultEncrypt: true,
  clock: { now: () => Date.now() },
});

// Store encrypted data
await storage.store('user-pii', Buffer.from(JSON.stringify(userData)), {
  encrypt: true,
});
```

### Example: Integrity Verification

```typescript
import { buildManifest, verifyManifest } from '@omega-private/proof-utils';

// Build manifest after data changes
const manifest = await buildManifest({
  paths: ['./data'],
});

// Save manifest securely
fs.writeFileSync('./manifest.json', JSON.stringify(manifest));

// Later: verify before using data
const savedManifest = JSON.parse(fs.readFileSync('./manifest.json'));
const result = verifyManifest(savedManifest);

if (!result.valid) {
  console.error('Data integrity compromised:', result.errors);
  // Handle tampering
}
```

---

## Secure Configuration

### File Permissions

```bash
# Storage directory
chmod 700 ./data

# Manifest files
chmod 600 ./manifest.json

# Key files (if stored)
chmod 600 ./keys/*
```

### Environment Variables

```bash
# Never log or expose
OMEGA_ENCRYPTION_KEY=<secret>

# Safe to log
OMEGA_STORAGE_DIR=/var/data/omega
OMEGA_LOG_LEVEL=info
```

---

## Audit Checklist

Before deploying OMEGA in production:

- [ ] Encryption enabled for sensitive data
- [ ] Storage directory has restricted permissions
- [ ] Key management policy defined
- [ ] Manifest verification in place
- [ ] Error handling doesn't expose internals
- [ ] Dependencies audited (`npm audit`)
- [ ] Security tests passing
- [ ] Threat model reviewed

---

## Security Testing

Run security tests:

```bash
npm test -- --run tests/security.test.ts
```

Tests cover:
- Path traversal prevention
- Zip slip protection
- Checksum verification
- Error information leakage
- Input validation

---

## Known Limitations

1. **No Request Authentication**: OMEGA is a library, not a service. Authentication is the responsibility of the consuming application.

2. **No Rate Limiting**: Must be implemented at the application layer.

3. **Key Storage**: Keys are held in memory. For production, consider HSM integration.

4. **No Replay Protection**: Timestamps are informational only.

See `docs/THREAT_MODEL.md` for detailed threat analysis.

---

## Security Updates

Security updates are released as patch versions:

```
5.3.1 -> 5.3.2 (security fix)
```

Subscribe to security advisories:
- GitHub Security Advisories
- Release notes with [SECURITY] tag

---

## Compliance

OMEGA is designed to support:

- **NASA-Grade L4**: Full traceability, determinism
- **DO-178C Level A**: Safety-critical software standards

For specific compliance requirements, contact the maintainers.

---

## Contact

- **Security Issues**: security@omega-project.example
- **General Questions**: Open GitHub issue
- **Documentation**: See `/docs`

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Phase B Industrial | Initial security policy |
