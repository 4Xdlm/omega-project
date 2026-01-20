# Threat Model — OMEGA

**Version**: 1.0.0
**Standard**: NASA-Grade L4
**Last Updated**: 2026-01-20

---

## Overview

This document describes the threat model for the OMEGA system, identifying potential security threats, their impact, and implemented mitigations.

---

## Assets

### Primary Assets

| Asset | Description | Sensitivity |
|-------|-------------|-------------|
| User Data | Raw storage entries, Atlas views | HIGH |
| System Configuration | Backend configs, keyring settings | HIGH |
| Encryption Keys | AES-256 keys in keyring | CRITICAL |
| Manifests | Integrity verification data | MEDIUM |
| Audit Logs | Operation history | MEDIUM |

### Secondary Assets

| Asset | Description | Sensitivity |
|-------|-------------|-------------|
| API Surface | Public module interfaces | LOW |
| Performance Data | Benchmarks, metrics | LOW |
| Documentation | Technical docs | PUBLIC |

---

## Threat Categories

### T1 — Path Traversal

**Threat ID**: T1-PATH-TRAVERSAL
**STRIDE**: Tampering, Information Disclosure
**Attack Vector**: Malicious key input like `../../../etc/passwd`

**Impact**: HIGH
- Unauthorized file read outside storage directory
- Potential system file modification
- Data exfiltration

**Mitigation**: IMPLEMENTED
- `sanitizeKey()` in `nexus/raw/src/utils/paths.ts`
- Blocks `..` components
- Validates characters (alphanumeric, dash, underscore, dot only)
- URL decoding before validation
- `createSafePath()` enforces root directory boundary

**Status**: MITIGATED

**Test Coverage**: `tests/security.test.ts`

---

### T2 — Zip Slip

**Threat ID**: T2-ZIP-SLIP
**STRIDE**: Tampering
**Attack Vector**: Malicious archive with paths like `../../malicious.sh`

**Impact**: HIGH
- File overwrite outside intended directory
- Code execution via overwritten scripts
- System compromise

**Mitigation**: IMPLEMENTED
- Same path sanitization as T1
- `extractKey()` validates path is within root directory
- Backup/restore operations use sanitized paths

**Status**: MITIGATED

**Test Coverage**: `tests/security.test.ts`

---

### T3 — Key Compromise

**Threat ID**: T3-KEY-COMPROMISE
**STRIDE**: Information Disclosure
**Attack Vector**: Encryption key exposure via logs, errors, or memory dumps

**Impact**: CRITICAL
- Decryption of all encrypted data
- Loss of confidentiality guarantees

**Mitigation**: PARTIALLY IMPLEMENTED
- Keys stored in memory-only `Keyring` class
- Keys not serialized in error contexts
- No key logging

**Recommended Additional Measures**:
- Key rotation policy
- Hardware security module (HSM) integration
- Key derivation from master key

**Status**: PARTIALLY MITIGATED

---

### T4 — Data Tampering

**Threat ID**: T4-DATA-TAMPERING
**STRIDE**: Tampering
**Attack Vector**: Direct modification of stored files

**Impact**: MEDIUM
- Corrupted data returned to application
- Silent data integrity loss

**Mitigation**: IMPLEMENTED
- SHA-256 checksums on all stored data
- `computeChecksum()` on store
- `assertChecksum()` on retrieve
- Manifest verification for directories

**Status**: MITIGATED

**Test Coverage**: `tests/edge-cases/corruption.test.ts`

---

### T5 — Replay Attacks

**Threat ID**: T5-REPLAY
**STRIDE**: Spoofing, Tampering
**Attack Vector**: Replaying old valid requests or data

**Impact**: LOW (context-dependent)
- Stale data injection
- Duplicate operations

**Mitigation**: NOT IMPLEMENTED
- Timestamps in metadata (informational only)
- No request signing or nonce validation

**Recommended Measures**:
- Request timestamps with tolerance window
- Nonce-based deduplication
- Sequence numbers for operations

**Status**: NOT MITIGATED (accepted risk for current use case)

---

### T6 — Denial of Service

**Threat ID**: T6-DOS
**STRIDE**: Denial of Service
**Attack Vector**: Resource exhaustion via large files or many requests

**Impact**: MEDIUM
- System unavailability
- Resource exhaustion

**Mitigation**: PARTIALLY IMPLEMENTED
- `MemoryBackend` has configurable `maxSize` quota
- `FileBackend` relies on filesystem limits

**Recommended Measures**:
- Rate limiting at API layer
- Per-key size limits
- Total storage quotas

**Status**: PARTIALLY MITIGATED

---

### T7 — Information Leakage

**Threat ID**: T7-INFO-LEAK
**STRIDE**: Information Disclosure
**Attack Vector**: Error messages revealing internal paths or structure

**Impact**: LOW
- Internal path disclosure
- System architecture exposure

**Mitigation**: IMPLEMENTED
- Structured errors with controlled context
- No stack traces in production errors
- Sensitive data excluded from error context

**Status**: MITIGATED

---

### T8 — Injection Attacks

**Threat ID**: T8-INJECTION
**STRIDE**: Tampering
**Attack Vector**: Malicious data in keys or values affecting downstream systems

**Impact**: MEDIUM
- If data used in SQL: SQL injection
- If data used in shell: Command injection
- If data rendered in HTML: XSS

**Mitigation**: PARTIALLY IMPLEMENTED
- Key sanitization prevents special characters
- Data stored as binary (no interpretation)

**Note**: OMEGA is a storage layer. Injection prevention is the responsibility of consuming applications.

**Status**: PARTIALLY MITIGATED (by design)

---

### T9 — Downgrade Attack

**Threat ID**: T9-DOWNGRADE
**STRIDE**: Tampering
**Attack Vector**: Forcing use of older, vulnerable version

**Impact**: MEDIUM
- Exploitation of known vulnerabilities
- Bypass of security fixes

**Mitigation**: NOT IMPLEMENTED
- No version enforcement
- No minimum version checking

**Recommended Measures**:
- Version field in manifests
- Minimum version validation
- Deprecation warnings

**Status**: NOT MITIGATED

---

### T10 — Supply Chain

**Threat ID**: T10-SUPPLY-CHAIN
**STRIDE**: Tampering
**Attack Vector**: Compromised dependencies

**Impact**: HIGH
- Malicious code execution
- Data exfiltration

**Mitigation**: IMPLEMENTED
- Zero runtime dependencies (core modules)
- Dev dependencies audited
- Lock file pinning (`package-lock.json`)
- GitHub security scanning

**Status**: MITIGATED

---

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│                   (consuming application)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   TRUST BOUNDARY  │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                        OMEGA LAYER                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Atlas  │  │   Raw   │  │  Proof  │  │ Ledger  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   TRUST BOUNDARY  │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      STORAGE LAYER                           │
│        ┌──────────────┐        ┌──────────────┐             │
│        │ Memory Store │        │  File System │             │
│        └──────────────┘        └──────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## Risk Summary

| Threat | Risk Level | Status |
|--------|------------|--------|
| T1 Path Traversal | HIGH | MITIGATED |
| T2 Zip Slip | HIGH | MITIGATED |
| T3 Key Compromise | CRITICAL | PARTIAL |
| T4 Data Tampering | MEDIUM | MITIGATED |
| T5 Replay Attacks | LOW | NOT MITIGATED |
| T6 Denial of Service | MEDIUM | PARTIAL |
| T7 Info Leakage | LOW | MITIGATED |
| T8 Injection | MEDIUM | PARTIAL |
| T9 Downgrade | MEDIUM | NOT MITIGATED |
| T10 Supply Chain | HIGH | MITIGATED |

---

## Recommendations

### High Priority

1. **Key Rotation**: Implement automated key rotation policy
2. **Rate Limiting**: Add request rate limiting at API boundary
3. **Audit Logging**: Enhanced audit trail for security events

### Medium Priority

4. **Version Checking**: Minimum version enforcement
5. **Request Signing**: HMAC-based request authentication
6. **Storage Quotas**: Per-user and global storage limits

### Low Priority

7. **HSM Integration**: Hardware key storage for production
8. **Anomaly Detection**: Unusual access pattern detection

---

## Review Schedule

- Quarterly review of threat model
- Update after any security incident
- Review before major releases

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Phase B Industrial | Initial threat model |
