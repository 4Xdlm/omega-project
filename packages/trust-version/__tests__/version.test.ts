import { describe, test, expect } from 'vitest'

const { detectVersion, VERSIONS, isSupported, getSupportedVersions, getLatestVersion } = require('../detector.cjs')
const { migrateV1toV2, migrateV2toV1, migrate, isMigrationLossless, getMigrationPaths } = require('../migrate.cjs')
const { verifyCompat, getCompatibilityMatrix, isReadableBy, getUpgradePath } = require('../compat.cjs')

// ═══════════════════════════════════════════════════════════════════════════════════════
// L0-VERSION: DETECTION
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L0-VERSION: Detection', () => {
  test('L0-VER-001: detects V1 payload with phases', () => {
    const v1 = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED', hash: 'a'.repeat(64) }],
      root_hash: 'b'.repeat(64)
    }
    expect(detectVersion(v1)).toBe(VERSIONS.V1)
  })

  test('L0-VER-002: detects V1 payload with entries (legacy)', () => {
    const v1Legacy = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      entries: [{ phase: 'PREFLIGHT', status: 'PASS' }],
      timestamp: '2026-01-29T00:00:00Z'
    }
    expect(detectVersion(v1Legacy)).toBe(VERSIONS.V1)
  })

  test('L0-VER-003: detects V2 payload', () => {
    const v2 = {
      schema_version: '2.0.0',
      chain_id: 'OMEGA-TEST',
      phases: [{ id: 'A', status: 'SEALED', hash: 'a'.repeat(64) }],
      root_hash: 'b'.repeat(64),
      signature_algorithm: 'ed25519'
    }
    expect(detectVersion(v2)).toBe(VERSIONS.V2)
  })

  test('L0-VER-004: detects V3 payload', () => {
    const v3 = {
      schema_version: '3.0.0',
      chain_id: 'OMEGA-TEST',
      phases: []
    }
    expect(detectVersion(v3)).toBe(VERSIONS.V3)
  })

  test('L0-VER-005: returns UNKNOWN for null', () => {
    expect(detectVersion(null)).toBe('UNKNOWN')
  })

  test('L0-VER-006: returns UNKNOWN for empty object', () => {
    expect(detectVersion({})).toBe('UNKNOWN')
  })

  test('L0-VER-007: returns UNKNOWN for array', () => {
    expect(detectVersion([])).toBe('UNKNOWN')
  })

  test('L0-VER-008: returns UNKNOWN for invalid schema_version', () => {
    expect(detectVersion({ schema_version: '9.9.9' })).toBe('UNKNOWN')
  })

  test('L0-VER-009: isSupported validates versions', () => {
    expect(isSupported('1.0.0')).toBe(true)
    expect(isSupported('2.0.0')).toBe(true)
    expect(isSupported('3.0.0')).toBe(true)
    expect(isSupported('9.9.9')).toBe(false)
  })

  test('L0-VER-010: getSupportedVersions returns all', () => {
    const versions = getSupportedVersions()
    expect(versions).toContain('1.0.0')
    expect(versions).toContain('2.0.0')
    expect(versions).toContain('3.0.0')
  })

  test('L0-VER-011: getLatestVersion returns V2', () => {
    expect(getLatestVersion()).toBe('2.0.0')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L0-VERSION: MIGRATION V1→V2
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L0-VERSION: Migration V1→V2', () => {
  const v1Payload = {
    chain_id: 'OMEGA-MIGRATE-TEST',
    version: '1.0.0',
    phases: [
      { id: 'A', status: 'SEALED', hash: 'a'.repeat(64) },
      { id: 'B', status: 'PASS', hash: 'b'.repeat(64) }
    ],
    root_hash: 'c'.repeat(64)
  }

  test('L0-MIG-001: migrates V1 to V2', () => {
    const v2 = migrateV1toV2(v1Payload)
    expect(v2.schema_version).toBe('2.0.0')
    expect(v2.chain_id).toBe(v1Payload.chain_id)
    expect(v2.signature_algorithm).toBe('ed25519')
  })

  test('L0-MIG-002: preserves root_hash', () => {
    const v2 = migrateV1toV2(v1Payload)
    expect(v2.root_hash).toBe(v1Payload.root_hash)
  })

  test('L0-MIG-003: preserves all phases', () => {
    const v2 = migrateV1toV2(v1Payload)
    expect(v2.phases).toHaveLength(2)
    expect(v2.phases[0].id).toBe('A')
    expect(v2.phases[0].status).toBe('SEALED')
    expect(v2.phases[1].id).toBe('B')
  })

  test('L0-MIG-004: migration is lossless V1→V2', () => {
    expect(isMigrationLossless(VERSIONS.V1, VERSIONS.V2)).toBe(true)
  })

  test('L0-MIG-005: throws on invalid V1 input', () => {
    expect(() => migrateV1toV2({ invalid: 'payload' })).toThrow()
  })

  test('L0-MIG-006: adds migrated_from metadata', () => {
    const v2 = migrateV1toV2(v1Payload)
    expect(v2.migrated_from).toBe('v1')
  })

  test('L0-MIG-007: handles legacy entries format', () => {
    const v1Legacy = {
      chain_id: 'OMEGA-LEGACY',
      version: '1.0.0',
      entries: [{ phase: 'PREFLIGHT', status: 'PASS' }]
    }
    const v2 = migrateV1toV2(v1Legacy)
    expect(v2.schema_version).toBe('2.0.0')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L0-VERSION: MIGRATION V2→V1 (LOSSY)
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L0-VERSION: Migration V2→V1 (Lossy)', () => {
  const v2Payload = {
    schema_version: '2.0.0',
    chain_id: 'OMEGA-V2-TEST',
    phases: [
      { id: 'A', status: 'SEALED', hash: 'a'.repeat(64), sealed_at: '2026-01-28T12:00:00Z' },
      { id: 'B', status: 'FAILED', hash: 'b'.repeat(64) }
    ],
    root_hash: 'c'.repeat(64),
    signature_algorithm: 'ed25519',
    migrated_from: 'v1'
  }

  test('L0-MIG-010: downgrades V2 to V1', () => {
    const v1 = migrateV2toV1(v2Payload)
    expect(v1.version).toBe('1.0.0')
    expect(v1.schema_version).toBeUndefined()
  })

  test('L0-MIG-011: maps FAILED to PENDING', () => {
    const v1 = migrateV2toV1(v2Payload)
    expect(v1.phases[1].status).toBe('PENDING')
  })

  test('L0-MIG-012: drops V2-only fields', () => {
    const v1 = migrateV2toV1(v2Payload)
    expect(v1.signature_algorithm).toBeUndefined()
    expect(v1.migrated_from).toBeUndefined()
    expect(v1.phases[0].sealed_at).toBeUndefined()
  })

  test('L0-MIG-013: migration is lossy V2→V1', () => {
    expect(isMigrationLossless(VERSIONS.V2, VERSIONS.V1)).toBe(false)
  })

  test('L0-MIG-014: preserves chain_id', () => {
    const v1 = migrateV2toV1(v2Payload)
    expect(v1.chain_id).toBe(v2Payload.chain_id)
  })

  test('L0-MIG-015: preserves root_hash', () => {
    const v1 = migrateV2toV1(v2Payload)
    expect(v1.root_hash).toBe(v2Payload.root_hash)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L1-VERSION: MIGRATION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L1-VERSION: Migration Orchestrator', () => {
  test('L1-MIG-001: migrate function handles V1→V2', () => {
    const v1 = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED', hash: 'a'.repeat(64) }],
      root_hash: 'b'.repeat(64)
    }
    const v2 = migrate(v1, VERSIONS.V2)
    expect(v2.schema_version).toBe('2.0.0')
  })

  test('L1-MIG-002: migrate returns clone for same version', () => {
    const v1 = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED', hash: 'a'.repeat(64) }],
      root_hash: 'b'.repeat(64)
    }
    const cloned = migrate(v1, VERSIONS.V1)
    expect(cloned).not.toBe(v1) // Different reference
    expect(cloned.chain_id).toEqual(v1.chain_id)
  })

  test('L1-MIG-003: throws on unknown source version', () => {
    expect(() => migrate({}, VERSIONS.V2)).toThrow('Cannot detect source version')
  })

  test('L1-MIG-004: throws on unsupported migration path', () => {
    const v1 = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'a'.repeat(64)
    }
    expect(() => migrate(v1, VERSIONS.V3)).toThrow('No migration path')
  })

  test('L1-MIG-005: getMigrationPaths returns all paths', () => {
    const paths = getMigrationPaths()
    expect(paths.length).toBeGreaterThan(0)
    expect(paths.some(p => p.from === VERSIONS.V1 && p.to === VERSIONS.V2)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L1-VERSION: COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L1-VERSION: Compatibility', () => {
  test('L1-COMPAT-001: getCompatibilityMatrix returns valid matrix', () => {
    const matrix = getCompatibilityMatrix()
    expect(matrix[VERSIONS.V1]).toBeDefined()
    expect(matrix[VERSIONS.V2]).toBeDefined()
    expect(matrix[VERSIONS.V1].canMigrateTo).toContain(VERSIONS.V2)
  })

  test('L1-COMPAT-002: V2 knows about lossy migrations', () => {
    const matrix = getCompatibilityMatrix()
    expect(matrix[VERSIONS.V2].lossyMigrations).toContain(VERSIONS.V1)
  })

  test('L1-COMPAT-003: isReadableBy checks compatibility', () => {
    expect(isReadableBy(VERSIONS.V1, VERSIONS.V1)).toBe(true)
    expect(isReadableBy(VERSIONS.V1, VERSIONS.V2)).toBe(true)
    expect(isReadableBy(VERSIONS.V2, VERSIONS.V1)).toBe(false)
  })

  test('L1-COMPAT-004: getUpgradePath returns valid path', () => {
    const path = getUpgradePath(VERSIONS.V1, VERSIONS.V2)
    expect(path).toBeDefined()
    expect(path!.length).toBe(1)
    expect(path![0].lossless).toBe(true)
  })

  test('L1-COMPAT-005: getUpgradePath returns empty for same version', () => {
    const path = getUpgradePath(VERSIONS.V1, VERSIONS.V1)
    expect(path).toEqual([])
  })

  test('L1-COMPAT-006: getUpgradePath returns null for impossible path', () => {
    const path = getUpgradePath(VERSIONS.V1, VERSIONS.V3)
    expect(path).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L1-VERSION: VERIFY COMPAT
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L1-VERSION: Verify Compat', () => {
  test('L1-VCOMPAT-001: verifyCompat detects version', () => {
    const v1 = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'a'.repeat(64)
    }
    const result = verifyCompat(v1, Buffer.alloc(64), '', {})
    expect(result.version).toBe(VERSIONS.V1)
  })

  test('L1-VCOMPAT-002: verifyCompat rejects unknown version', () => {
    const result = verifyCompat({}, Buffer.alloc(64), '', {})
    expect(result.valid).toBe(false)
    expect(result.version).toBe('UNKNOWN')
  })

  test('L1-VCOMPAT-003: verifyCompat detects version mismatch', () => {
    const v1 = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'a'.repeat(64)
    }
    const result = verifyCompat(v1, Buffer.alloc(64), '', { verifierVersion: VERSIONS.V2 })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('original version verifier')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L2-VERSION: ROUND-TRIP
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L2-VERSION: Round-trip', () => {
  test('L2-RT-001: V1→V2→V1 preserves essential data', () => {
    const original = {
      chain_id: 'OMEGA-ROUNDTRIP',
      version: '1.0.0',
      phases: [
        { id: 'A', status: 'SEALED', hash: 'a'.repeat(64) },
        { id: 'B', status: 'PASS', hash: 'b'.repeat(64) }
      ],
      root_hash: 'c'.repeat(64)
    }

    const v2 = migrate(original, VERSIONS.V2)
    const backToV1 = migrate(v2, VERSIONS.V1)

    expect(backToV1.chain_id).toBe(original.chain_id)
    expect(backToV1.root_hash).toBe(original.root_hash)
    expect(backToV1.phases).toHaveLength(original.phases.length)
  })

  test('L2-RT-002: V1→V2→V1 preserves phase IDs', () => {
    const original = {
      chain_id: 'OMEGA-RT',
      version: '1.0.0',
      phases: [
        { id: 'PHASE-A', status: 'SEALED', hash: 'x'.repeat(64) },
        { id: 'PHASE-B', status: 'PASS', hash: 'y'.repeat(64) }
      ],
      root_hash: 'z'.repeat(64)
    }

    const v2 = migrate(original, VERSIONS.V2)
    const backToV1 = migrate(v2, VERSIONS.V1)

    expect(backToV1.phases[0].id).toBe(original.phases[0].id)
    expect(backToV1.phases[1].id).toBe(original.phases[1].id)
  })

  test('L2-RT-003: V1→V2→V1 preserves hashes', () => {
    const original = {
      chain_id: 'OMEGA-HASH-RT',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED', hash: 'abcd'.repeat(16) }],
      root_hash: '1234'.repeat(16)
    }

    const v2 = migrate(original, VERSIONS.V2)
    const backToV1 = migrate(v2, VERSIONS.V1)

    expect(backToV1.phases[0].hash).toBe(original.phases[0].hash)
    expect(backToV1.root_hash).toBe(original.root_hash)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L4-VERSION: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L4-VERSION: Determinism', () => {
  test('L4-DET-001: V1→V2 migration is deterministic (excluding timestamp)', () => {
    const v1 = {
      chain_id: 'OMEGA-DET-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED', hash: 'a'.repeat(64) }],
      root_hash: 'b'.repeat(64)
    }

    const v2_1 = migrate(v1, VERSIONS.V2)
    const v2_2 = migrate(v1, VERSIONS.V2)
    const v2_3 = migrate(v1, VERSIONS.V2)

    // Remove timestamps for comparison (they will differ)
    delete v2_1.migration_timestamp
    delete v2_2.migration_timestamp
    delete v2_3.migration_timestamp

    expect(JSON.stringify(v2_1)).toBe(JSON.stringify(v2_2))
    expect(JSON.stringify(v2_2)).toBe(JSON.stringify(v2_3))
  })

  test('L4-DET-002: V2→V1 migration is deterministic', () => {
    const v2 = {
      schema_version: '2.0.0',
      chain_id: 'OMEGA-DET-V2',
      phases: [{ id: 'A', status: 'SEALED', hash: 'a'.repeat(64) }],
      root_hash: 'b'.repeat(64),
      signature_algorithm: 'ed25519'
    }

    const v1_1 = migrate(v2, VERSIONS.V1)
    const v1_2 = migrate(v2, VERSIONS.V1)
    const v1_3 = migrate(v2, VERSIONS.V1)

    expect(JSON.stringify(v1_1)).toBe(JSON.stringify(v1_2))
    expect(JSON.stringify(v1_2)).toBe(JSON.stringify(v1_3))
  })

  test('L4-DET-003: detection is deterministic', () => {
    const payload = {
      chain_id: 'OMEGA-DET',
      version: '1.0.0',
      phases: [],
      root_hash: 'x'.repeat(64)
    }

    const results = []
    for (let i = 0; i < 10; i++) {
      results.push(detectVersion(payload))
    }

    expect(new Set(results).size).toBe(1)
  })

  test('L4-DET-004: compatibility check is deterministic', () => {
    const payload = {
      chain_id: 'OMEGA-COMPAT',
      version: '1.0.0',
      phases: [],
      root_hash: 'x'.repeat(64)
    }

    const results = []
    for (let i = 0; i < 10; i++) {
      results.push(JSON.stringify(verifyCompat(payload, Buffer.alloc(64), '', {})))
    }

    expect(new Set(results).size).toBe(1)
  })
})
