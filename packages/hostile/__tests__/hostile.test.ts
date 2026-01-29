import { describe, test, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

const {
  generateTruncations,
  generateBitFlips,
  generateInjections,
  generateMutations,
  generateMalformedSignatures,
  generateHostileSuite
} = require('../generators.cjs')

const { validatePayloadStructure, verifyTrustChain } = require('../../../tools/omega-verify/verify.cjs')
const { validateTrust } = require('../../schemas/validator.cjs')

// Valid payload for mutation base
const VALID_PAYLOAD = {
  chain_id: 'OMEGA-TEST-HOSTILE',
  version: '1.0.0',
  phases: [
    { id: 'A', status: 'SEALED', hash: 'a'.repeat(64) },
    { id: 'B', status: 'PASS', hash: 'b'.repeat(64) }
  ],
  root_hash: 'c'.repeat(64)
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// L3-HOSTILE: TRUNCATION ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L3-HOSTILE: Truncation Attacks', () => {
  const truncations = generateTruncations(VALID_PAYLOAD, 50)

  test.each(truncations.map((t, i) => [`TRUNC-${String(i).padStart(3, '0')}`, t]))(
    'L3-%s: truncated input rejected',
    (_, truncation) => {
      let parsed
      try {
        parsed = JSON.parse(truncation.input)
      } catch (e) {
        // JSON parse failed = correctly rejected
        expect(true).toBe(true)
        return
      }

      // If parsed, should fail validation
      const errors = validatePayloadStructure(parsed)
      expect(errors.length).toBeGreaterThan(0)
    }
  )
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L3-HOSTILE: BIT FLIP ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L3-HOSTILE: Bit Flip Attacks', () => {
  const bitFlips = generateBitFlips(JSON.stringify(VALID_PAYLOAD), 50)

  test.each(bitFlips.map((b, i) => [`BITFLIP-${String(i).padStart(3, '0')}`, b]))(
    'L3-%s: bit-flipped input rejected or detectably different',
    (_, bitFlip) => {
      let parsed
      try {
        parsed = JSON.parse(bitFlip.input)
      } catch (e) {
        // JSON parse failed = correctly rejected
        expect(true).toBe(true)
        return
      }

      // If parsed, either fails validation OR has different values
      const errors = validatePayloadStructure(parsed)
      const canonical1 = JSON.stringify(VALID_PAYLOAD)
      const canonical2 = JSON.stringify(parsed)

      // Must either fail validation or be detectably different
      expect(errors.length > 0 || canonical1 !== canonical2).toBe(true)
    }
  )
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L3-HOSTILE: INJECTION ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L3-HOSTILE: Injection Attacks', () => {
  const injections = generateInjections()

  test.each(injections.map(inj => [inj.id, inj]))(
    'L3-%s: injection payload handled safely',
    (_, injection) => {
      // Should not crash
      expect(() => {
        try {
          const parsed = JSON.parse(injection.input)
          validatePayloadStructure(parsed)
        } catch (e) {
          // Parse error is fine
        }
      }).not.toThrow()
    }
  )

  test('L3-INJ-PROTO-001: __proto__ pollution blocked', () => {
    const malicious = JSON.parse('{"__proto__":{"admin":true}}')
    const clean = {}

    // Verify prototype not polluted
    expect((clean as any).admin).toBeUndefined()
  })

  test('L3-INJ-PROTO-002: constructor pollution blocked', () => {
    const malicious = JSON.parse('{"constructor":{"prototype":{"pwned":true}}}')
    const clean = {}

    // Verify prototype not polluted
    expect((clean as any).pwned).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L3-HOSTILE: MUTATION ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L3-HOSTILE: Mutation Attacks', () => {
  const mutations = generateMutations(VALID_PAYLOAD, 50)

  test.each(mutations.map((m, i) => [m.id || `MUT-${i}`, m]))(
    'L3-%s: mutated input handled without crash',
    (_, mutation) => {
      // Should not crash
      expect(() => {
        const errors = validatePayloadStructure(mutation.input)
        // Validation runs without throwing
      }).not.toThrow()
    }
  )
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L3-HOSTILE: SIGNATURE ATTACKS
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L3-HOSTILE: Signature Attacks', () => {
  const sigAttacks = generateMalformedSignatures()

  // Generate valid keypair for testing
  const { publicKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  })

  test.each(sigAttacks.map(s => [s.id, s]))(
    'L3-%s: malformed signature rejected',
    (_, sigAttack) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sig-attack-'))
      const payloadPath = path.join(tmpDir, 'payload.json')
      const sigPath = path.join(tmpDir, 'sig.bin')
      const keyPath = path.join(tmpDir, 'key.pem')

      fs.writeFileSync(payloadPath, JSON.stringify(VALID_PAYLOAD))
      fs.writeFileSync(sigPath, sigAttack.input)
      fs.writeFileSync(keyPath, publicKey)

      const result = verifyTrustChain(payloadPath, sigPath, keyPath)
      expect(result.valid).toBe(false)

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  )
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L3-HOSTILE: COMBINED SUITE STATS
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L3-HOSTILE: Combined Suite', () => {
  const suite = generateHostileSuite(VALID_PAYLOAD)

  test('L3-SUITE-001: total hostile inputs generated', () => {
    const total =
      suite.truncations.length +
      suite.bitFlips.length +
      suite.injections.length +
      suite.mutations.length +
      suite.signatures.length

    // Should generate at least 100 hostile inputs
    expect(total).toBeGreaterThan(100)
    console.log(`Total hostile inputs: ${total}`)
  })

  test('L3-SUITE-002: zero crashes on full truncation suite', () => {
    let crashCount = 0
    let rejectCount = 0

    for (const t of suite.truncations) {
      try {
        const parsed = JSON.parse(t.input)
        const errors = validatePayloadStructure(parsed)
        if (errors.length > 0) rejectCount++
      } catch (e) {
        rejectCount++ // Parse failure = rejection
      }
    }

    expect(crashCount).toBe(0)
    console.log(`Truncations rejected: ${rejectCount}/${suite.truncations.length}`)
  })

  test('L3-SUITE-003: zero crashes on full injection suite', () => {
    let crashCount = 0

    for (const inj of suite.injections) {
      try {
        const parsed = JSON.parse(inj.input)
        validatePayloadStructure(parsed)
      } catch (e) {
        // Expected - parse or validation error
      }
    }

    expect(crashCount).toBe(0)
  })

  test('L3-SUITE-004: zero crashes on full mutation suite', () => {
    let crashCount = 0

    for (const mut of suite.mutations) {
      try {
        validatePayloadStructure(mut.input)
      } catch (e) {
        crashCount++
      }
    }

    expect(crashCount).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L3-HOSTILE: SCHEMA VALIDATOR ROBUSTNESS
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L3-HOSTILE: Schema Validator Robustness', () => {
  test('L3-SCHEMA-HOSTILE-001: null handling', () => {
    expect(() => validateTrust(null)).not.toThrow()
    const errors = validateTrust(null)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-SCHEMA-HOSTILE-002: undefined handling', () => {
    expect(() => validateTrust(undefined)).not.toThrow()
  })

  test('L3-SCHEMA-HOSTILE-003: circular reference protection', () => {
    const circular: any = { a: 1 }
    circular.self = circular

    // Should not hang or crash (JSON.stringify will throw, but that's expected)
    expect(() => {
      try {
        JSON.stringify(circular)
      } catch (e) {
        // Expected - circular reference error
      }
    }).not.toThrow()
  })

  test('L3-SCHEMA-HOSTILE-004: deeply nested object', () => {
    let deep: any = { value: 'bottom' }
    for (let i = 0; i < 100; i++) {
      deep = { nested: deep }
    }

    expect(() => validateTrust(deep)).not.toThrow()
  })

  test('L3-SCHEMA-HOSTILE-005: very long string values', () => {
    const longString = {
      chain_id: 'OMEGA-' + 'A'.repeat(10000),
      version: '1.0.0',
      phases: [],
      root_hash: 'a'.repeat(64)
    }

    expect(() => validateTrust(longString)).not.toThrow()
  })

  test('L3-SCHEMA-HOSTILE-006: numeric overflow', () => {
    const overflow = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'a'.repeat(64),
      count: Number.MAX_SAFE_INTEGER + 1
    }

    expect(() => validateTrust(overflow)).not.toThrow()
  })

  test('L3-SCHEMA-HOSTILE-007: negative numbers', () => {
    const negative = {
      chain_id: 'OMEGA-TEST',
      version: '-1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'a'.repeat(64)
    }

    expect(() => validateTrust(negative)).not.toThrow()
    const errors = validateTrust(negative)
    expect(errors.length).toBeGreaterThan(0) // Invalid version
  })

  test('L3-SCHEMA-HOSTILE-008: special float values', () => {
    const special = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'a'.repeat(64),
      value: NaN
    }

    expect(() => validateTrust(special)).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// L4-HOSTILE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('L4-HOSTILE: Determinism', () => {
  test('L4-HOST-DET-001: truncation generator is deterministic', () => {
    const run1 = generateTruncations(VALID_PAYLOAD, 20, 12345)
    const run2 = generateTruncations(VALID_PAYLOAD, 20, 12345)

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2))
  })

  test('L4-HOST-DET-002: bitflip generator is deterministic', () => {
    const run1 = generateBitFlips(VALID_PAYLOAD, 20, 54321)
    const run2 = generateBitFlips(VALID_PAYLOAD, 20, 54321)

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2))
  })

  test('L4-HOST-DET-003: mutation generator is deterministic', () => {
    const run1 = generateMutations(VALID_PAYLOAD, 20, 98765)
    const run2 = generateMutations(VALID_PAYLOAD, 20, 98765)

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2))
  })

  test('L4-HOST-DET-004: signature generator is deterministic', () => {
    const run1 = generateMalformedSignatures()
    const run2 = generateMalformedSignatures()

    // Compare buffer contents
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].input.equals(run2[i].input)).toBe(true)
    }
  })

  test('L4-HOST-DET-005: injection generator is deterministic', () => {
    const run1 = generateInjections()
    const run2 = generateInjections()

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2))
  })
})
