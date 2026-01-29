import { describe, test, expect } from 'vitest'
import { validateTrust, validateManifest, validateSealedZones } from '../validator.cjs'

describe('L0-SCHEMA: Trust Payload Validation', () => {
  const validTrust = {
    chain_id: 'OMEGA-PHASE-X-TRUST',
    version: '1.0.0',
    phases: [
      { id: 'A', status: 'SEALED', hash: 'a'.repeat(64) },
      { id: 'B', status: 'PASS', hash: 'b'.repeat(64) }
    ],
    root_hash: 'c'.repeat(64)
  }

  test('L0-SCHEMA-001: valid trust payload passes', () => {
    const errors = validateTrust(validTrust)
    expect(errors).toHaveLength(0)
  })

  test('L0-SCHEMA-002: missing required field rejected', () => {
    const invalid = { ...validTrust }
    // @ts-expect-error Testing missing field
    delete invalid.chain_id
    const errors = validateTrust(invalid)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.path.includes('chain_id'))).toBe(true)
  })

  test('L0-SCHEMA-003: invalid chain_id pattern rejected', () => {
    const invalid = { ...validTrust, chain_id: 'invalid-chain' }
    const errors = validateTrust(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-004: invalid hash length rejected', () => {
    const invalid = { ...validTrust, root_hash: 'tooshort' }
    const errors = validateTrust(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-005: additional properties rejected', () => {
    const invalid = { ...validTrust, extra_field: 'not allowed' }
    const errors = validateTrust(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-006: invalid phase status rejected', () => {
    const invalid = {
      ...validTrust,
      phases: [{ id: 'A', status: 'INVALID', hash: 'a'.repeat(64) }]
    }
    const errors = validateTrust(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-007: empty phases array rejected', () => {
    const invalid = { ...validTrust, phases: [] }
    const errors = validateTrust(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-008: phase without hash allowed (optional)', () => {
    const valid = {
      ...validTrust,
      phases: [{ id: 'A', status: 'PENDING' }]
    }
    const errors = validateTrust(valid)
    expect(errors).toHaveLength(0)
  })

  test('L0-SCHEMA-009: phase with additional properties rejected', () => {
    const invalid = {
      ...validTrust,
      phases: [{ id: 'A', status: 'SEALED', hash: 'a'.repeat(64), extra: 'field' }]
    }
    const errors = validateTrust(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('L0-SCHEMA: Manifest Validation', () => {
  const validManifest = {
    phase: 's',
    version: '1.0.0',
    verdict: 'PASS',
    commit: 'a'.repeat(40),
    artifacts: {
      'REPORT.md': {
        path: 'nexus/proof/phase_s/REPORT.md',
        sha256: 'b'.repeat(64),
        size: 1234
      }
    }
  }

  test('L0-SCHEMA-010: valid manifest passes', () => {
    const errors = validateManifest(validManifest)
    expect(errors).toHaveLength(0)
  })

  test('L0-SCHEMA-011: invalid verdict rejected', () => {
    const invalid = { ...validManifest, verdict: 'MAYBE' }
    const errors = validateManifest(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-012: invalid commit hash rejected', () => {
    const invalid = { ...validManifest, commit: 'short' }
    const errors = validateManifest(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-013: negative artifact size rejected', () => {
    const invalid = {
      ...validManifest,
      artifacts: {
        'file.txt': { path: 'path', sha256: 'a'.repeat(64), size: -1 }
      }
    }
    const errors = validateManifest(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-014: manifest with tests passes', () => {
    const withTests = {
      ...validManifest,
      tests: {
        L0: { total: 10, pass: 10, fail: 0 },
        L3: { total: 5, pass: 5, fail: 0 }
      }
    }
    const errors = validateManifest(withTests)
    expect(errors).toHaveLength(0)
  })

  test('L0-SCHEMA-015: invalid test level rejected', () => {
    const invalid = {
      ...validManifest,
      tests: {
        L0: { total: 'ten', pass: 10, fail: 0 }
      }
    }
    const errors = validateManifest(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-016: artifact missing required field rejected', () => {
    const invalid = {
      ...validManifest,
      artifacts: {
        'file.txt': { path: 'path', sha256: 'a'.repeat(64) } // missing size
      }
    }
    const errors = validateManifest(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-017: manifest with timestamp passes', () => {
    const withTimestamp = {
      ...validManifest,
      timestamp: '2026-01-29T12:00:00Z'
    }
    const errors = validateManifest(withTimestamp)
    expect(errors).toHaveLength(0)
  })
})

describe('L0-SCHEMA: Sealed Zones Validation', () => {
  const validSealedZones = {
    version: '1.0.0',
    zones: [
      {
        path: 'packages/sentinel/',
        sealed_at: '2026-01-28',
        tag: 'phase-x-sealed',
        reason: 'Core security module'
      }
    ]
  }

  test('L0-SCHEMA-020: valid sealed zones passes', () => {
    const errors = validateSealedZones(validSealedZones)
    expect(errors).toHaveLength(0)
  })

  test('L0-SCHEMA-021: missing zone reason rejected', () => {
    const invalid = {
      version: '1.0.0',
      zones: [{ path: 'test/', sealed_at: '2026-01-28', tag: 'tag' }]
    }
    const errors = validateSealedZones(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-022: empty zones array allowed', () => {
    const valid = {
      version: '1.0.0',
      zones: []
    }
    const errors = validateSealedZones(valid)
    expect(errors).toHaveLength(0)
  })

  test('L0-SCHEMA-023: invalid version format rejected', () => {
    const invalid = {
      version: 'v1.0.0', // should not have 'v' prefix
      zones: []
    }
    const errors = validateSealedZones(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-SCHEMA-024: zone with extra property rejected', () => {
    const invalid = {
      version: '1.0.0',
      zones: [{
        path: 'test/',
        sealed_at: '2026-01-28',
        tag: 'tag',
        reason: 'test',
        extra: 'not allowed'
      }]
    }
    const errors = validateSealedZones(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('L3-HOSTILE: Schema Hostile Inputs', () => {
  test('L3-HOST-SCHEMA-001: null input rejected', () => {
    const errors = validateTrust(null)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-SCHEMA-002: array instead of object rejected', () => {
    const errors = validateTrust([])
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-SCHEMA-003: string instead of object rejected', () => {
    const errors = validateTrust('not an object')
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-SCHEMA-004: deeply nested invalid rejected', () => {
    const invalid = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 123, status: 'SEALED' }], // id should be string
      root_hash: 'a'.repeat(64)
    }
    const errors = validateTrust(invalid)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-SCHEMA-005: undefined input rejected', () => {
    const errors = validateTrust(undefined)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-SCHEMA-006: number input rejected', () => {
    const errors = validateManifest(42)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-SCHEMA-007: boolean input rejected', () => {
    const errors = validateSealedZones(true)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-SCHEMA-008: empty object missing required fields', () => {
    const errors = validateTrust({})
    expect(errors.length).toBeGreaterThan(0)
    // Should have errors for all required fields
    expect(errors.some(e => e.path.includes('chain_id'))).toBe(true)
    expect(errors.some(e => e.path.includes('version'))).toBe(true)
    expect(errors.some(e => e.path.includes('phases'))).toBe(true)
    expect(errors.some(e => e.path.includes('root_hash'))).toBe(true)
  })
})

describe('L4-DETERMINISM: Schema Validation Consistency', () => {
  const validTrust = {
    chain_id: 'OMEGA-PHASE-X-TRUST',
    version: '1.0.0',
    phases: [
      { id: 'A', status: 'SEALED', hash: 'a'.repeat(64) }
    ],
    root_hash: 'c'.repeat(64)
  }

  test('L4-DET-001: multiple validations return identical results', () => {
    const results = []
    for (let i = 0; i < 10; i++) {
      results.push(JSON.stringify(validateTrust(validTrust)))
    }
    // All results should be identical
    expect(new Set(results).size).toBe(1)
  })

  test('L4-DET-002: error order is deterministic', () => {
    const invalid = { extra: 'field' } // Multiple missing required fields
    const results = []
    for (let i = 0; i < 10; i++) {
      results.push(JSON.stringify(validateTrust(invalid)))
    }
    expect(new Set(results).size).toBe(1)
  })

  test('L4-DET-003: validation does not mutate input', () => {
    const input = JSON.parse(JSON.stringify(validTrust))
    const inputBefore = JSON.stringify(input)
    validateTrust(input)
    const inputAfter = JSON.stringify(input)
    expect(inputBefore).toBe(inputAfter)
  })
})
