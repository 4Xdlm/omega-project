# Error Catalog — OMEGA

**Version**: 1.0.0
**Standard**: NASA-Grade L4
**Pattern**: ADR-0002 Typed Error Hierarchy

---

## Error Code Convention

All OMEGA errors follow the pattern: `{MODULE}_E{SEQ}_{DESCRIPTION}`

| Component | Format | Example |
|-----------|--------|---------|
| MODULE | Uppercase module name | ATLAS, RAW, PROOF |
| SEQ | 3-digit sequence | E001, E002, E010 |
| DESCRIPTION | Snake case description | QUERY_ERROR, NOT_FOUND |

---

## Atlas Errors

Module: `nexus/atlas`
Base class: `AtlasError`

### Query Errors (ATLAS_E001_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| ATLAS_E001_QUERY_ERROR | AtlasQueryError | General query error | Check query syntax |
| ATLAS_E001_INVALID_FILTER | AtlasQueryInvalidFilterError | Filter syntax invalid | Fix filter structure |
| ATLAS_E001_INVALID_OPERATOR | AtlasQueryInvalidOperatorError | Unknown operator | Use valid operator |
| ATLAS_E001_FIELD_NOT_FOUND | AtlasQueryFieldNotFoundError | Field does not exist | Check field name |

### Index Errors (ATLAS_E002_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| ATLAS_E002_INDEX_ERROR | AtlasIndexError | General index error | Check index definition |
| ATLAS_E002_INDEX_EXISTS | AtlasIndexAlreadyExistsError | Index already exists | Use existing or drop first |
| ATLAS_E002_INDEX_NOT_FOUND | AtlasIndexNotFoundError | Index does not exist | Create index first |
| ATLAS_E002_INDEX_CORRUPT | AtlasIndexCorruptError | Index data corrupted | Rebuild index |

### Subscription Errors (ATLAS_E003_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| ATLAS_E003_SUBSCRIPTION_ERROR | AtlasSubscriptionError | General subscription error | Check subscription setup |
| ATLAS_E003_SUBSCRIPTION_NOT_FOUND | AtlasSubscriptionNotFoundError | Subscription ID invalid | Check subscription ID |
| ATLAS_E003_CALLBACK_ERROR | AtlasSubscriptionCallbackError | Callback threw exception | Fix callback code |

### View Errors (ATLAS_E004_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| ATLAS_E004_VIEW_ERROR | AtlasViewError | General view error | Check view operation |
| ATLAS_E004_VIEW_NOT_FOUND | AtlasViewNotFoundError | View does not exist | Check view ID |
| ATLAS_E004_VIEW_EXISTS | AtlasViewAlreadyExistsError | View already exists | Use update or delete first |
| ATLAS_E004_VERSION_CONFLICT | AtlasViewVersionConflictError | Optimistic lock failure | Retry with current version |

### Projection Errors (ATLAS_E005_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| ATLAS_E005_PROJECTION_ERROR | AtlasProjectionError | General projection error | Check projection definition |
| ATLAS_E005_PROJECTION_FAILED | AtlasProjectionFailedError | Projection execution failed | Check projector function |

---

## Raw Errors

Module: `nexus/raw`
Base class: `RawError`

### Path Errors (RAW_E001_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| RAW_E001_PATH_ERROR | RawPathError | General path error | Check path format |
| RAW_E001_PATH_TRAVERSAL | RawPathTraversalError | Path traversal attempt | Use safe path |
| RAW_E001_PATH_INVALID | RawPathInvalidError | Path format invalid | Fix path format |

### Storage Errors (RAW_E002_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| RAW_E002_STORAGE_ERROR | RawStorageError | General storage error | Check storage config |
| RAW_E002_WRITE_FAILED | RawStorageWriteError | Write operation failed | Check permissions/space |
| RAW_E002_READ_FAILED | RawStorageReadError | Read operation failed | Check file exists |
| RAW_E002_DELETE_FAILED | RawStorageDeleteError | Delete operation failed | Check permissions |
| RAW_E002_NOT_FOUND | RawStorageNotFoundError | Key does not exist | Check key name |
| RAW_E002_QUOTA_EXCEEDED | RawStorageQuotaError | Storage quota exceeded | Free space or increase quota |

### Crypto Errors (RAW_E003_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| RAW_E003_CRYPTO_ERROR | RawCryptoError | General crypto error | Check crypto config |
| RAW_E003_ENCRYPT_FAILED | RawCryptoEncryptError | Encryption failed | Check key and data |
| RAW_E003_DECRYPT_FAILED | RawCryptoDecryptError | Decryption failed | Check key matches |
| RAW_E003_KEY_NOT_FOUND | RawCryptoKeyNotFoundError | Encryption key missing | Add key to keyring |
| RAW_E003_KEY_EXPIRED | RawCryptoKeyExpiredError | Encryption key expired | Rotate key |

### Backend Errors (RAW_E004_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| RAW_E004_BACKEND_ERROR | RawBackendError | General backend error | Check backend config |
| RAW_E004_INIT_FAILED | RawBackendInitError | Backend initialization failed | Check config/permissions |
| RAW_E004_CLOSED | RawBackendClosedError | Backend already closed | Reinitialize backend |

### TTL Errors (RAW_E005_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| RAW_E005_TTL_ERROR | RawTTLError | General TTL error | Check TTL config |
| RAW_E005_EXPIRED | RawTTLExpiredError | Data has expired | Data no longer available |

### Compression Errors (RAW_E006_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| RAW_E006_COMPRESSION_ERROR | RawCompressionError | General compression error | Check compression config |
| RAW_E006_DECOMPRESSION_FAILED | RawDecompressionError | Decompression failed | Data may be corrupted |

### Backup Errors (RAW_E007_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| RAW_E007_BACKUP_ERROR | RawBackupError | General backup error | Check backup config |
| RAW_E007_RESTORE_FAILED | RawRestoreError | Restore operation failed | Check backup integrity |

### Checksum Errors (RAW_E008_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| RAW_E008_CHECKSUM_ERROR | RawChecksumError | General checksum error | Check data integrity |
| RAW_E008_CHECKSUM_MISMATCH | RawChecksumMismatchError | Checksum does not match | Data corrupted |

---

## Proof Errors

Module: `nexus/proof-utils`
Base class: `ProofError`

### Manifest Errors (PROOF_E00x_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| PROOF_E001_MANIFEST | ProofManifestError | General manifest error | Check manifest format |
| PROOF_E002_MANIFEST_BUILD | ProofManifestBuildError | Manifest build failed | Check source files |
| PROOF_E003_MANIFEST_PARSE | ProofManifestParseError | Manifest parse failed | Check manifest JSON |

### Verification Errors (PROOF_E01x_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| PROOF_E010_VERIFY | ProofVerifyError | General verification error | Check verification params |
| PROOF_E011_FILE_NOT_FOUND | ProofFileNotFoundError | File in manifest missing | Restore file or update manifest |
| PROOF_E012_HASH_MISMATCH | ProofHashMismatchError | File hash changed | File was modified |

### Snapshot Errors (PROOF_E02x_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| PROOF_E020_SNAPSHOT | ProofSnapshotError | General snapshot error | Check snapshot config |
| PROOF_E021_SNAPSHOT_CREATE | ProofSnapshotCreateError | Snapshot creation failed | Check permissions/space |
| PROOF_E022_SNAPSHOT_RESTORE | ProofSnapshotRestoreError | Snapshot restore failed | Check snapshot integrity |
| PROOF_E023_SNAPSHOT_NOT_FOUND | ProofSnapshotNotFoundError | Snapshot does not exist | Check snapshot ID |

### Diff Errors (PROOF_E03x_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| PROOF_E030_DIFF | ProofDiffError | General diff error | Check diff params |
| PROOF_E031_DIFF_INVALID_INPUT | ProofDiffInvalidInputError | Invalid diff input | Check input format |

### Serialization Errors (PROOF_E04x_*)

| Code | Class | Description | Recovery |
|------|-------|-------------|----------|
| PROOF_E040_SERIALIZE | ProofSerializeError | Serialization failed | Check data format |
| PROOF_E041_DESERIALIZE | ProofDeserializeError | Deserialization failed | Check input format |

---

## Error Handling Best Practices

### Catching Specific Errors

```typescript
import { RawStorageNotFoundError, isRawError } from '@omega-private/nexus-raw';

try {
  await storage.retrieve('my-key');
} catch (error) {
  if (error instanceof RawStorageNotFoundError) {
    // Handle missing key
    console.log('Key not found:', error.context.key);
  } else if (isRawError(error)) {
    // Handle other raw errors
    console.log('Raw error:', error.code, error.message);
  } else {
    throw error;
  }
}
```

### Error Context

All errors include context for debugging:

```typescript
try {
  await atlas.update('view-1', data, expectedVersion);
} catch (error) {
  if (error instanceof AtlasViewVersionConflictError) {
    console.log('Conflict:', {
      viewId: error.context.viewId,
      expected: error.context.expectedVersion,
      actual: error.context.actualVersion
    });
  }
}
```

### Error Serialization

Errors can be serialized for logging:

```typescript
if (isAtlasError(error)) {
  logger.error(JSON.stringify({
    code: error.code,
    message: error.message,
    context: error.context,
    timestamp: error.timestamp
  }));
}
```

---

## Adding New Errors

When adding new errors:

1. Follow the code convention: `{MODULE}_E{SEQ}_{DESCRIPTION}`
2. Extend the appropriate base class
3. Include relevant context in constructor
4. Add to this catalog
5. Add tests for error throwing and catching

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Phase B Industrial | Initial catalog |
