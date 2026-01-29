import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'

const {
  normalize,
  sortKeys,
  canonicalizeJson,
  sha256,
  hashCanonical,
  validatePayloadStructure,
  validateLegacyPayload,
  verifyTrustChain,
  verifyManifest
} = require('../verify.cjs')

// ═══════════════════════════════════════════════════════════════════════════
// L0: CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('L0-VERIFY: Normalize Function', () => {
  test('L0-VERIFY-001: removes BOM', () => {
    const withBom = '\uFEFFhello'
    expect(normalize(withBom)).toBe('hello\n')
  })

  test('L0-VERIFY-002: converts CRLF to LF', () => {
    const crlf = 'line1\r\nline2'
    expect(normalize(crlf)).toBe('line1\nline2\n')
  })

  test('L0-VERIFY-003: converts CR to LF', () => {
    const cr = 'line1\rline2'
    expect(normalize(cr)).toBe('line1\nline2\n')
  })

  test('L0-VERIFY-004: trims trailing whitespace', () => {
    const trailing = 'line1   \nline2\t\t'
    expect(normalize(trailing)).toBe('line1\nline2\n')
  })

  test('L0-VERIFY-005: ensures single trailing newline', () => {
    expect(normalize('hello')).toBe('hello\n')
    expect(normalize('hello\n\n\n')).toBe('hello\n')
  })

  test('L0-VERIFY-006: handles non-string input', () => {
    expect(normalize(null as any)).toBe('')
    expect(normalize(undefined as any)).toBe('')
    expect(normalize(123 as any)).toBe('')
  })
})

describe('L0-VERIFY: Canonicalize Functions', () => {
  test('L0-VERIFY-010: sortKeys sorts alphabetically', () => {
    const obj = { z: 1, a: 2, m: 3 }
    const sorted = sortKeys(obj)
    expect(Object.keys(sorted)).toEqual(['a', 'm', 'z'])
  })

  test('L0-VERIFY-011: sortKeys handles nested objects', () => {
    const obj = { b: { z: 1, a: 2 }, a: 1 }
    const sorted = sortKeys(obj)
    expect(Object.keys(sorted)).toEqual(['a', 'b'])
    expect(Object.keys(sorted.b)).toEqual(['a', 'z'])
  })

  test('L0-VERIFY-012: sortKeys handles arrays', () => {
    const obj = { arr: [{ z: 1, a: 2 }, { b: 1 }] }
    const sorted = sortKeys(obj)
    expect(Object.keys(sorted.arr[0])).toEqual(['a', 'z'])
  })

  test('L0-VERIFY-013: sortKeys handles primitives', () => {
    expect(sortKeys(null)).toBe(null)
    expect(sortKeys(42)).toBe(42)
    expect(sortKeys('hello')).toBe('hello')
  })

  test('L0-VERIFY-014: canonicalizeJson produces compact output', () => {
    const obj = { a: 1, b: 2 }
    expect(canonicalizeJson(obj)).toBe('{"a":1,"b":2}')
  })

  test('L0-VERIFY-015: canonicalizeJson sorts keys', () => {
    const obj = { z: 1, a: 2, m: 3 }
    expect(canonicalizeJson(obj)).toBe('{"a":2,"m":3,"z":1}')
  })
})

describe('L0-VERIFY: Hash Functions', () => {
  test('L0-VERIFY-020: sha256 produces 64-char hex', () => {
    const hash = sha256('hello')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  test('L0-VERIFY-021: sha256 is deterministic', () => {
    expect(sha256('test')).toBe(sha256('test'))
  })

  test('L0-VERIFY-022: hashCanonical normalizes JSON', () => {
    const obj1 = { z: 1, a: 2 }
    const obj2 = { a: 2, z: 1 }
    expect(hashCanonical(obj1)).toBe(hashCanonical(obj2))
  })

  test('L0-VERIFY-023: hashCanonical produces consistent output', () => {
    const obj = { chain_id: 'OMEGA-TEST', version: '1.0.0' }
    const hash1 = hashCanonical(obj)
    const hash2 = hashCanonical(obj)
    const hash3 = hashCanonical(obj)
    expect(hash1).toBe(hash2)
    expect(hash2).toBe(hash3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// L0: PAYLOAD VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe('L0-VERIFY: Payload Validation', () => {
  test('L0-VERIFY-030: valid payload passes', () => {
    const payload = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED', hash: 'a'.repeat(64) }],
      root_hash: 'b'.repeat(64)
    }
    const errors = validatePayloadStructure(payload)
    expect(errors).toHaveLength(0)
  })

  test('L0-VERIFY-031: missing chain_id fails', () => {
    const payload = {
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'b'.repeat(64)
    }
    const errors = validatePayloadStructure(payload)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.includes('chain_id'))).toBe(true)
  })

  test('L0-VERIFY-032: invalid chain_id pattern fails', () => {
    const payload = {
      chain_id: 'invalid-chain',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'b'.repeat(64)
    }
    const errors = validatePayloadStructure(payload)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-VERIFY-033: invalid status fails', () => {
    const payload = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'INVALID' }],
      root_hash: 'b'.repeat(64)
    }
    const errors = validatePayloadStructure(payload)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-VERIFY-034: empty phases fails', () => {
    const payload = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [],
      root_hash: 'b'.repeat(64)
    }
    const errors = validatePayloadStructure(payload)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-VERIFY-035: invalid hash format fails', () => {
    const payload = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED', hash: 'tooshort' }],
      root_hash: 'b'.repeat(64)
    }
    const errors = validatePayloadStructure(payload)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L0-VERIFY-036: legacy format detected', () => {
    const payload = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      entries: [{ phase: 'PREFLIGHT', status: 'PASS' }]
    }
    const errors = validatePayloadStructure(payload)
    // Should use legacy validation, not fail on missing phases
    expect(errors).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// L1: INTEGRATION - KEYPAIR VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('L1-VERIFY: Keypair Integration', () => {
  let testDir: string
  let payloadPath: string
  let signaturePath: string
  let pubkeyPath: string
  let privateKey: crypto.KeyObject

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-verify-test-'))

    // Generate Ed25519 keypair
    const keypair = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    })

    // Create valid payload (without root_hash first)
    const payloadWithoutHash = {
      chain_id: 'OMEGA-TEST-CHAIN',
      version: '1.0.0',
      phases: [
        { id: 'A', status: 'SEALED', hash: 'a'.repeat(64) },
        { id: 'B', status: 'PASS', hash: 'b'.repeat(64) }
      ]
    }

    // Compute root_hash from payload without root_hash
    const rootHash = sha256(canonicalizeJson(payloadWithoutHash))

    // Create full payload with root_hash
    const payload = {
      ...payloadWithoutHash,
      root_hash: rootHash
    }

    // Final canonical form (with root_hash)
    const finalCanonical = canonicalizeJson(payload)

    // Sign using SHA-256 prehash
    const digest = crypto.createHash('sha256').update(finalCanonical, 'utf8').digest()
    privateKey = crypto.createPrivateKey(keypair.privateKey)
    const signature = crypto.sign(null, digest, privateKey)

    // Write files
    payloadPath = path.join(testDir, 'payload.json')
    signaturePath = path.join(testDir, 'signature.bin')
    pubkeyPath = path.join(testDir, 'pubkey.pem')

    fs.writeFileSync(payloadPath, finalCanonical)
    fs.writeFileSync(signaturePath, signature)
    fs.writeFileSync(pubkeyPath, keypair.publicKey)
  })

  afterAll(() => {
    // Cleanup
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  test('L1-VERIFY-001: valid trust chain passes', () => {
    const results = verifyTrustChain(payloadPath, signaturePath, pubkeyPath)
    expect(results.valid).toBe(true)
    expect(results.errors).toHaveLength(0)
  })

  test('L1-VERIFY-002: tampered payload fails', () => {
    const tamperedPath = path.join(testDir, 'tampered.json')
    const original = JSON.parse(fs.readFileSync(payloadPath, 'utf8'))
    original.version = '9.9.9' // Tamper
    fs.writeFileSync(tamperedPath, canonicalizeJson(original))

    const results = verifyTrustChain(tamperedPath, signaturePath, pubkeyPath)
    expect(results.valid).toBe(false)
  })

  test('L1-VERIFY-003: wrong signature fails', () => {
    const wrongSigPath = path.join(testDir, 'wrong.bin')
    const wrongSig = Buffer.alloc(64, 0xFF)
    fs.writeFileSync(wrongSigPath, wrongSig)

    const results = verifyTrustChain(payloadPath, wrongSigPath, pubkeyPath)
    expect(results.valid).toBe(false)
  })

  test('L1-VERIFY-004: wrong public key fails', () => {
    const { publicKey: wrongKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    })
    const wrongKeyPath = path.join(testDir, 'wrong.pem')
    fs.writeFileSync(wrongKeyPath, wrongKey)

    const results = verifyTrustChain(payloadPath, signaturePath, wrongKeyPath)
    expect(results.valid).toBe(false)
  })

  test('L1-VERIFY-005: modified hash fails', () => {
    const modifiedPath = path.join(testDir, 'modified.json')
    const original = JSON.parse(fs.readFileSync(payloadPath, 'utf8'))
    original.root_hash = 'f'.repeat(64) // Change hash
    fs.writeFileSync(modifiedPath, canonicalizeJson(original))

    const results = verifyTrustChain(modifiedPath, signaturePath, pubkeyPath)
    expect(results.valid).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// L2: MANIFEST MODE (Phase X compatibility)
// ═══════════════════════════════════════════════════════════════════════════

describe('L2-VERIFY: Manifest Mode', () => {
  test('L2-VERIFY-001: Phase X manifest verification', () => {
    const manifestPath = path.resolve('nexus/proof/phase_x/TRUST_MANIFEST.json')
    if (!fs.existsSync(manifestPath)) {
      console.log('Skipping: Phase X TRUST_MANIFEST.json not found')
      return
    }

    const results = verifyManifest(manifestPath)
    expect(results.valid).toBe(true)
    expect(results.errors).toHaveLength(0)
  })

  test('L2-VERIFY-002: manifest with missing payload fails', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'))
    const manifestPath = path.join(tmpDir, 'bad.json')
    fs.writeFileSync(manifestPath, JSON.stringify({ signature: {} }))

    const results = verifyManifest(manifestPath)
    expect(results.valid).toBe(false)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('L2-VERIFY-003: manifest with missing signature fails', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'))
    const manifestPath = path.join(tmpDir, 'bad.json')
    fs.writeFileSync(manifestPath, JSON.stringify({ payload: { chain_id: 'OMEGA-TEST', version: '1.0.0', entries: [] } }))

    const results = verifyManifest(manifestPath)
    expect(results.valid).toBe(false)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// L3: HOSTILE INPUTS
// ═══════════════════════════════════════════════════════════════════════════

describe('L3-HOSTILE: Verifier Hostile Inputs', () => {
  test('L3-HOST-VERIFY-001: missing file fails gracefully', () => {
    const results = verifyTrustChain('/nonexistent/path', '/nonexistent/sig', '/nonexistent/key')
    expect(results.valid).toBe(false)
    expect(results.errors.length).toBeGreaterThan(0)
    expect(results.errors[0]).toContain('not found')
  })

  test('L3-HOST-VERIFY-002: truncated signature fails', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hostile-'))
    const sigPath = path.join(tmpDir, 'truncated.bin')
    fs.writeFileSync(sigPath, Buffer.alloc(32, 0)) // 32 bytes instead of 64

    const payload = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'a'.repeat(64)
    }
    const payloadPath = path.join(tmpDir, 'payload.json')
    fs.writeFileSync(payloadPath, JSON.stringify(payload))

    const { publicKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    })
    const keyPath = path.join(tmpDir, 'key.pem')
    fs.writeFileSync(keyPath, publicKey)

    const results = verifyTrustChain(payloadPath, sigPath, keyPath)
    expect(results.valid).toBe(false)
    expect(results.errors.some(e => e.includes('signature length'))).toBe(true)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('L3-HOST-VERIFY-003: malformed JSON fails', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hostile-'))
    const payloadPath = path.join(tmpDir, 'malformed.json')
    fs.writeFileSync(payloadPath, '{ not valid json')

    const sigPath = path.join(tmpDir, 'sig.bin')
    fs.writeFileSync(sigPath, Buffer.alloc(64, 0))

    const { publicKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    })
    const keyPath = path.join(tmpDir, 'key.pem')
    fs.writeFileSync(keyPath, publicKey)

    const results = verifyTrustChain(payloadPath, sigPath, keyPath)
    expect(results.valid).toBe(false)
    expect(results.errors.some(e => e.includes('parse'))).toBe(true)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('L3-HOST-VERIFY-004: null payload fails', () => {
    const errors = validatePayloadStructure(null)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-VERIFY-005: array payload fails', () => {
    const errors = validatePayloadStructure([])
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-VERIFY-006: string payload fails', () => {
    const errors = validatePayloadStructure('not an object' as any)
    expect(errors.length).toBeGreaterThan(0)
  })

  test('L3-HOST-VERIFY-007: invalid PEM key fails', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hostile-'))

    const payload = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'a'.repeat(64)
    }
    const payloadPath = path.join(tmpDir, 'payload.json')
    fs.writeFileSync(payloadPath, JSON.stringify(payload))

    const sigPath = path.join(tmpDir, 'sig.bin')
    fs.writeFileSync(sigPath, Buffer.alloc(64, 0))

    const keyPath = path.join(tmpDir, 'bad.pem')
    fs.writeFileSync(keyPath, 'not a valid PEM')

    const results = verifyTrustChain(payloadPath, sigPath, keyPath)
    expect(results.valid).toBe(false)

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('L3-HOST-VERIFY-008: manifest nonexistent file fails', () => {
    const results = verifyManifest('/nonexistent/manifest.json')
    expect(results.valid).toBe(false)
    expect(results.errors[0]).toContain('not found')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// L4: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════

describe('L4-VERIFY: Determinism', () => {
  test('L4-VERIFY-001: same input = same hash (10 runs)', () => {
    const payload = {
      chain_id: 'OMEGA-DET-TEST',
      version: '1.0.0',
      phases: [{ id: 'X', status: 'PASS', hash: 'x'.repeat(64) }],
      root_hash: 'y'.repeat(64)
    }

    const hashes = []
    for (let i = 0; i < 10; i++) {
      hashes.push(hashCanonical(payload))
    }

    expect(new Set(hashes).size).toBe(1)
  })

  test('L4-VERIFY-002: key order does not affect hash', () => {
    const payload1 = { a: 1, b: 2, c: 3 }
    const payload2 = { c: 3, a: 1, b: 2 }
    const payload3 = { b: 2, c: 3, a: 1 }

    const hash1 = hashCanonical(payload1)
    const hash2 = hashCanonical(payload2)
    const hash3 = hashCanonical(payload3)

    expect(hash1).toBe(hash2)
    expect(hash2).toBe(hash3)
  })

  test('L4-VERIFY-003: canonicalizeJson is pure', () => {
    const obj = { z: 1, a: 2 }
    const results = []
    for (let i = 0; i < 10; i++) {
      results.push(canonicalizeJson(obj))
    }
    expect(new Set(results).size).toBe(1)
  })

  test('L4-VERIFY-004: normalize is pure', () => {
    const input = 'hello\r\nworld'
    const results = []
    for (let i = 0; i < 10; i++) {
      results.push(normalize(input))
    }
    expect(new Set(results).size).toBe(1)
  })

  test('L4-VERIFY-005: validation is deterministic', () => {
    const payload = {
      chain_id: 'OMEGA-TEST',
      version: '1.0.0',
      phases: [{ id: 'A', status: 'SEALED' }],
      root_hash: 'a'.repeat(64)
    }

    const results = []
    for (let i = 0; i < 10; i++) {
      results.push(JSON.stringify(validatePayloadStructure(payload)))
    }
    expect(new Set(results).size).toBe(1)
  })
})
