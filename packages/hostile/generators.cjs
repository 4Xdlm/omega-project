/**
 * OMEGA Hostile Input Generators
 *
 * Generates adversarial inputs for testing parser and verifier robustness.
 * ZERO external dependencies.
 *
 * @module hostile/generators
 * @version 1.0.0
 */

const crypto = require('crypto')

// ═══════════════════════════════════════════════════════════════════════════════════════
// TRUNCATION GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Generate truncated versions of input
 * @param {string|object} input - Input to truncate
 * @param {number} count - Number of truncations to generate
 * @param {number} seed - Random seed for determinism
 * @returns {Array<{type: string, position: number, input: string}>}
 */
function generateTruncations(input, count = 20, seed = 12345) {
  const results = []
  const str = typeof input === 'string' ? input : JSON.stringify(input)
  let rng = seed

  for (let i = 0; i < count; i++) {
    // Simple LCG for deterministic randomness
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    const cutPoint = Math.floor((rng / 0x7fffffff) * str.length)
    results.push({
      type: 'truncation',
      position: cutPoint,
      input: str.slice(0, cutPoint)
    })
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// BIT FLIP GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Generate inputs with single bit flipped
 * @param {string|object} input - Input to corrupt
 * @param {number} count - Number of bit flips
 * @param {number} seed - Random seed
 * @returns {Array<{type: string, bytePosition: number, bitPosition: number, input: string}>}
 */
function generateBitFlips(input, count = 20, seed = 54321) {
  const results = []
  const buffer = Buffer.from(typeof input === 'string' ? input : JSON.stringify(input))
  let rng = seed

  for (let i = 0; i < count; i++) {
    const flipped = Buffer.from(buffer)
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    const bytePos = Math.floor((rng / 0x7fffffff) * flipped.length)
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    const bitPos = Math.floor((rng / 0x7fffffff) * 8)
    flipped[bytePos] ^= (1 << bitPos)

    results.push({
      type: 'bitflip',
      bytePosition: bytePos,
      bitPosition: bitPos,
      input: flipped.toString('utf8')
    })
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// INJECTION GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════════════

const INJECTION_PAYLOADS = [
  // Null bytes
  '\x00',
  'test\x00injection',
  '{"key":"\x00"}',

  // Unicode confusables
  'OMΕGA', // Greek Epsilon instead of E
  'OMЕGA', // Cyrillic Е instead of E
  '\uFEFF\uFEFF', // Multiple BOMs
  '\u202E', // Right-to-left override
  '\u200B', // Zero-width space

  // Path traversal
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32',
  'file:///etc/passwd',

  // JSON injection
  '{"__proto__":{"admin":true}}',
  '{"constructor":{"prototype":{"admin":true}}}',
  '["__proto__"]',

  // Oversized
  'A'.repeat(10000),
  '{"key":"' + 'A'.repeat(100000) + '"}',

  // Special characters
  '\\n\\r\\t\\0',
  '\n\r\t\0',
  '`${process.exit()}`',
  '{{constructor.constructor("return this")()}}',

  // Type confusion
  'true',
  'false',
  'null',
  '123',
  '[]',
  '{}',
  '""',
]

/**
 * Generate injection payloads
 * @returns {Array<{type: string, id: string, input: string}>}
 */
function generateInjections() {
  return INJECTION_PAYLOADS.map((payload, i) => ({
    type: 'injection',
    id: `INJ-${String(i).padStart(3, '0')}`,
    input: payload
  }))
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// MUTATION GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Get random key from object (deterministic)
 * @param {object} obj
 * @param {number} rng
 * @returns {string}
 */
function randomKey(obj, rng) {
  const keys = Object.keys(obj)
  if (keys.length === 0) return ''
  return keys[Math.floor((rng / 0x7fffffff) * keys.length)]
}

/**
 * Generate mutated versions of valid input
 * @param {object|string} validInput
 * @param {number} count
 * @param {number} seed
 * @returns {Array<{type: string, id: string, input: object}>}
 */
function generateMutations(validInput, count = 30, seed = 98765) {
  const results = []
  const obj = typeof validInput === 'object' ? validInput : JSON.parse(validInput)
  let rng = seed

  const mutations = [
    // Type mutations
    (o, r) => { const k = randomKey(o, r); if (k) o[k] = String(o[k]); return o },
    (o, r) => { const k = randomKey(o, r); if (k) o[k] = Number(o[k]) || 0; return o },
    (o, r) => { const k = randomKey(o, r); if (k) o[k] = [o[k]]; return o },
    (o, r) => { const k = randomKey(o, r); if (k) o[k] = { value: o[k] }; return o },
    (o, r) => { const k = randomKey(o, r); if (k) o[k] = null; return o },
    (o, r) => { const k = randomKey(o, r); if (k) delete o[k]; return o },

    // Structure mutations
    (o, r) => { o['injected_field'] = 'malicious'; return o },
    (o, r) => { o['__proto__'] = { admin: true }; return o },
    (o, r) => { o['constructor'] = { prototype: {} }; return o },

    // Value mutations
    (o, r) => { const k = randomKey(o, r); if (k && typeof o[k] === 'string') o[k] = ''; return o },
    (o, r) => { const k = randomKey(o, r); if (k && typeof o[k] === 'string') o[k] = 'X'.repeat(5000); return o },
    (o, r) => { const k = randomKey(o, r); if (k && Array.isArray(o[k])) o[k] = []; return o },
  ]

  for (let i = 0; i < count; i++) {
    const cloned = JSON.parse(JSON.stringify(obj))
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    const mutationIdx = Math.floor((rng / 0x7fffffff) * mutations.length)
    const mutation = mutations[mutationIdx]

    try {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff
      const mutated = mutation(cloned, rng)
      results.push({
        type: 'mutation',
        id: `MUT-${String(i).padStart(3, '0')}`,
        input: mutated
      })
    } catch (e) {
      // Mutation failed, skip
    }
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// SIGNATURE ATTACK GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Generate malformed signatures (deterministic)
 * @returns {Array<{type: string, id: string, description: string, input: Buffer}>}
 */
function generateMalformedSignatures() {
  // Use deterministic "random" bytes
  const deterministicRandom = (len, seed) => {
    const buf = Buffer.alloc(len)
    let rng = seed
    for (let i = 0; i < len; i++) {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff
      buf[i] = rng & 0xFF
    }
    return buf
  }

  return [
    { type: 'sig_attack', id: 'SIG-001', description: 'Empty signature', input: Buffer.alloc(0) },
    { type: 'sig_attack', id: 'SIG-002', description: 'Too short (32 bytes)', input: Buffer.alloc(32, 0xFF) },
    { type: 'sig_attack', id: 'SIG-003', description: 'Too long (128 bytes)', input: Buffer.alloc(128, 0xFF) },
    { type: 'sig_attack', id: 'SIG-004', description: 'All zeros', input: Buffer.alloc(64, 0x00) },
    { type: 'sig_attack', id: 'SIG-005', description: 'All ones', input: Buffer.alloc(64, 0xFF) },
    { type: 'sig_attack', id: 'SIG-006', description: 'Deterministic random', input: deterministicRandom(64, 11111) },
    { type: 'sig_attack', id: 'SIG-007', description: 'First byte flipped', input: (() => { const b = deterministicRandom(64, 22222); b[0] ^= 0xFF; return b })() },
    { type: 'sig_attack', id: 'SIG-008', description: 'Last byte flipped', input: (() => { const b = deterministicRandom(64, 33333); b[63] ^= 0xFF; return b })() },
  ]
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// COMBINED GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Generate complete hostile test suite
 * @param {object} validPayload - Valid payload to mutate from
 * @returns {object}
 */
function generateHostileSuite(validPayload) {
  return {
    truncations: generateTruncations(validPayload, 50),
    bitFlips: generateBitFlips(validPayload, 50),
    injections: generateInjections(),
    mutations: generateMutations(validPayload, 50),
    signatures: generateMalformedSignatures()
  }
}

module.exports = {
  generateTruncations,
  generateBitFlips,
  generateInjections,
  generateMutations,
  generateMalformedSignatures,
  generateHostileSuite
}
