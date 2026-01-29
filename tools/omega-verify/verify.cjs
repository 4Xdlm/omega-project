#!/usr/bin/env node
/**
 * OMEGA External Verifier v1.0.0
 *
 * ZERO external dependencies.
 * Uses ONLY Node.js built-in modules.
 * Can be run standalone to verify any OMEGA trust chain.
 *
 * Supports two modes:
 *   1. Separate files: --payload + --signature + --pubkey
 *   2. Manifest mode:  --manifest (contains payload + signature inline)
 *
 * Usage:
 *   node verify.cjs --payload <file> --signature <file> --pubkey <file>
 *   node verify.cjs --manifest <file>
 *
 * @module omega-verify
 * @version 1.0.0
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const VERSION = '1.0.0'
const ED25519_SIGNATURE_LENGTH = 64  // RFC 8032
const SHA256_HEX_LENGTH = 64

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize text to canonical form
 * @param {string} text
 * @returns {string}
 */
function normalize(text) {
  if (typeof text !== 'string') return ''
  let result = text

  // Remove BOM
  if (result.charCodeAt(0) === 0xFEFF) {
    result = result.slice(1)
  }

  // Convert line endings to LF
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Remove trailing whitespace per line
  result = result.split('\n').map(line => line.trimEnd()).join('\n')

  // Ensure exactly one final newline
  result = result.trimEnd() + '\n'

  return result
}

/**
 * Sort object keys recursively for canonical JSON
 * @param {*} obj
 * @returns {*}
 */
function sortKeys(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)

  const sorted = {}
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeys(obj[key])
  }
  return sorted
}

/**
 * Canonicalize JSON (sorted keys, compact, no trailing newline)
 * @param {object} obj
 * @returns {string}
 */
function canonicalizeJson(obj) {
  return JSON.stringify(sortKeys(obj))
}

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute SHA-256 hash
 * @param {string|Buffer} data
 * @returns {string} hex hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Compute SHA-256 hash of canonical JSON
 * @param {object} obj
 * @returns {string} hex hash
 */
function hashCanonical(obj) {
  const canonical = typeof obj === 'object' ? canonicalizeJson(obj) : normalize(obj)
  return sha256(canonical)
}

/**
 * Verify Ed25519 signature
 * @param {string|Buffer} data - Data that was signed
 * @param {Buffer} signature - 64-byte signature
 * @param {crypto.KeyObject|string} publicKey - Public key (PEM or KeyObject)
 * @returns {boolean}
 */
function verifyEd25519(data, signature, publicKey) {
  try {
    // Ed25519 signs data directly (no prehash by default in Node)
    // But OMEGA uses SHA-256 prehash for compatibility
    const digest = crypto.createHash('sha256').update(data).digest()
    return crypto.verify(null, digest, publicKey, signature)
  } catch (err) {
    return false
  }
}

/**
 * Verify Ed25519 signature with direct signing (no prehash)
 * @param {string|Buffer} data
 * @param {Buffer} signature
 * @param {crypto.KeyObject|string} publicKey
 * @returns {boolean}
 */
function verifyEd25519Direct(data, signature, publicKey) {
  try {
    return crypto.verify(null, Buffer.from(data), publicKey, signature)
  } catch (err) {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate trust payload structure (Phase S schema)
 * @param {object} payload
 * @returns {string[]} Array of error messages
 */
function validatePayloadStructure(payload) {
  const errors = []

  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object')
    return errors
  }

  // chain_id
  if (!payload.chain_id || typeof payload.chain_id !== 'string') {
    errors.push('Missing or invalid chain_id')
  } else if (!/^OMEGA-[A-Z0-9-]+$/.test(payload.chain_id)) {
    errors.push('chain_id does not match pattern OMEGA-[A-Z0-9-]+')
  }

  // version
  if (!payload.version || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(payload.version)) {
    errors.push('Missing or invalid version (expected semver)')
  }

  // phases array
  if (!Array.isArray(payload.phases)) {
    // Legacy format uses 'entries' instead of 'phases'
    if (Array.isArray(payload.entries)) {
      // Legacy format - validate differently
      return validateLegacyPayload(payload)
    }
    errors.push('Missing phases array')
  } else if (payload.phases.length === 0) {
    errors.push('phases array cannot be empty')
  } else {
    payload.phases.forEach((phase, i) => {
      if (!phase.id) errors.push(`Phase ${i}: missing id`)
      if (!['SEALED', 'PASS', 'PENDING'].includes(phase.status)) {
        errors.push(`Phase ${i}: invalid status "${phase.status}"`)
      }
      if (phase.hash && !/^[a-f0-9]{64}$/.test(phase.hash)) {
        errors.push(`Phase ${i}: invalid hash format`)
      }
    })
  }

  // root_hash
  if (!payload.root_hash || !/^[a-f0-9]{64}$/.test(payload.root_hash)) {
    errors.push('Missing or invalid root_hash')
  }

  return errors
}

/**
 * Validate legacy payload structure (Phase X format)
 * @param {object} payload
 * @returns {string[]}
 */
function validateLegacyPayload(payload) {
  const errors = []

  if (!payload.chain_id) {
    errors.push('Missing chain_id')
  }

  if (!payload.version) {
    errors.push('Missing version')
  }

  if (!Array.isArray(payload.entries)) {
    errors.push('Missing entries array')
  }

  return errors
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify trust chain with separate files
 * @param {string} payloadPath
 * @param {string} signaturePath
 * @param {string} publicKeyPath
 * @returns {{valid: boolean, checks: Array, errors: string[]}}
 */
function verifyTrustChain(payloadPath, signaturePath, publicKeyPath) {
  const results = {
    valid: false,
    checks: [],
    errors: []
  }

  try {
    // 1. Load files
    if (!fs.existsSync(payloadPath)) {
      results.errors.push(`Payload file not found: ${payloadPath}`)
      return results
    }
    if (!fs.existsSync(signaturePath)) {
      results.errors.push(`Signature file not found: ${signaturePath}`)
      return results
    }
    if (!fs.existsSync(publicKeyPath)) {
      results.errors.push(`Public key file not found: ${publicKeyPath}`)
      return results
    }

    const payloadContent = fs.readFileSync(payloadPath, 'utf8')
    const signature = fs.readFileSync(signaturePath)
    const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8')

    results.checks.push({ name: 'Files loaded', status: 'PASS' })

    // 2. Parse payload
    let payload
    try {
      payload = JSON.parse(payloadContent)
      results.checks.push({ name: 'Payload parsed', status: 'PASS' })
    } catch (err) {
      results.errors.push(`Failed to parse payload: ${err.message}`)
      results.checks.push({ name: 'Payload parsed', status: 'FAIL' })
      return results
    }

    // 3. Validate structure
    const structureErrors = validatePayloadStructure(payload)
    if (structureErrors.length > 0) {
      results.errors.push(...structureErrors)
      results.checks.push({ name: 'Payload structure', status: 'FAIL' })
      return results
    }
    results.checks.push({ name: 'Payload structure', status: 'PASS' })

    // 4. Verify signature length
    if (signature.length !== ED25519_SIGNATURE_LENGTH) {
      results.errors.push(`Invalid signature length: ${signature.length} (expected ${ED25519_SIGNATURE_LENGTH})`)
      results.checks.push({ name: 'Signature length', status: 'FAIL' })
      return results
    }
    results.checks.push({ name: 'Signature length', status: 'PASS' })

    // 5. Create public key object
    let publicKey
    try {
      publicKey = crypto.createPublicKey(publicKeyPem)
      results.checks.push({ name: 'Public key loaded', status: 'PASS' })
    } catch (err) {
      results.errors.push(`Failed to load public key: ${err.message}`)
      results.checks.push({ name: 'Public key loaded', status: 'FAIL' })
      return results
    }

    // 6. Compute canonical form for signature
    const canonical = canonicalizeJson(payload)

    // 7. Verify root_hash matches (if present)
    // root_hash is computed from payload WITHOUT root_hash field
    if (payload.root_hash) {
      const payloadWithoutHash = { ...payload }
      delete payloadWithoutHash.root_hash
      const computedHash = sha256(canonicalizeJson(payloadWithoutHash))
      results.checks.push({
        name: 'Root hash computed',
        status: 'PASS',
        value: computedHash
      })

      if (computedHash !== payload.root_hash) {
        results.errors.push(`Root hash mismatch: computed ${computedHash}, declared ${payload.root_hash}`)
        results.checks.push({ name: 'Root hash match', status: 'FAIL' })
        return results
      }
      results.checks.push({ name: 'Root hash match', status: 'PASS' })
    }

    // 8. Verify Ed25519 signature (try both prehash and direct)
    let signatureValid = verifyEd25519(canonical, signature, publicKey)
    if (!signatureValid) {
      // Try direct verification (no SHA-256 prehash)
      signatureValid = verifyEd25519Direct(canonical, signature, publicKey)
    }

    if (!signatureValid) {
      results.errors.push('Ed25519 signature verification FAILED')
      results.checks.push({ name: 'Signature verification', status: 'FAIL' })
      return results
    }
    results.checks.push({ name: 'Signature verification', status: 'PASS' })

    // All checks passed
    results.valid = true
    return results

  } catch (err) {
    results.errors.push(`Unexpected error: ${err.message}`)
    return results
  }
}

/**
 * Verify trust chain from manifest file (Phase X format)
 * @param {string} manifestPath
 * @returns {{valid: boolean, checks: Array, errors: string[]}}
 */
function verifyManifest(manifestPath) {
  const results = {
    valid: false,
    checks: [],
    errors: []
  }

  try {
    // 1. Load manifest
    if (!fs.existsSync(manifestPath)) {
      results.errors.push(`Manifest file not found: ${manifestPath}`)
      return results
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8')
    let manifest
    try {
      manifest = JSON.parse(manifestContent)
      results.checks.push({ name: 'Manifest loaded', status: 'PASS' })
    } catch (err) {
      results.errors.push(`Failed to parse manifest: ${err.message}`)
      results.checks.push({ name: 'Manifest loaded', status: 'FAIL' })
      return results
    }

    // 2. Validate manifest structure
    if (!manifest.payload) {
      results.errors.push('Manifest missing payload')
      return results
    }
    if (!manifest.signature) {
      results.errors.push('Manifest missing signature')
      return results
    }
    results.checks.push({ name: 'Manifest structure', status: 'PASS' })

    // 3. Extract components
    const payload = manifest.payload
    const sig = manifest.signature

    // 4. Validate payload
    const structureErrors = validatePayloadStructure(payload)
    if (structureErrors.length > 0) {
      results.errors.push(...structureErrors)
      results.checks.push({ name: 'Payload structure', status: 'FAIL' })
      return results
    }
    results.checks.push({ name: 'Payload structure', status: 'PASS' })

    // 5. Get canonical payload file if referenced
    let canonicalContent
    const canonicalPath = path.join(path.dirname(manifestPath), 'CANONICAL_PAYLOAD.json')
    if (fs.existsSync(canonicalPath)) {
      canonicalContent = fs.readFileSync(canonicalPath, 'utf8')
      results.checks.push({ name: 'Canonical payload loaded', status: 'PASS' })
    } else {
      // Use manifest payload
      canonicalContent = canonicalizeJson(payload)
      results.checks.push({ name: 'Using manifest payload', status: 'PASS' })
    }

    // 6. Reconstruct public key from hex
    let publicKey
    try {
      if (sig.public_key_hex) {
        const publicKeyDer = Buffer.from(sig.public_key_hex, 'hex')
        publicKey = crypto.createPublicKey({
          key: publicKeyDer,
          format: 'der',
          type: 'spki'
        })
      } else {
        results.errors.push('Missing public_key_hex in signature')
        return results
      }
      results.checks.push({ name: 'Public key reconstructed', status: 'PASS' })
    } catch (err) {
      results.errors.push(`Failed to reconstruct public key: ${err.message}`)
      results.checks.push({ name: 'Public key reconstructed', status: 'FAIL' })
      return results
    }

    // 7. Get signature bytes
    let signatureBytes
    if (sig.value) {
      signatureBytes = Buffer.from(sig.value, 'hex')
    } else {
      results.errors.push('Missing signature value')
      return results
    }

    if (signatureBytes.length !== ED25519_SIGNATURE_LENGTH) {
      results.errors.push(`Invalid signature length: ${signatureBytes.length}`)
      results.checks.push({ name: 'Signature length', status: 'FAIL' })
      return results
    }
    results.checks.push({ name: 'Signature length', status: 'PASS' })

    // 8. Compute hash
    const computedHash = sha256(canonicalContent)
    results.checks.push({
      name: 'Payload hash computed',
      status: 'PASS',
      value: computedHash
    })

    // 9. Verify signature (try direct first for Phase X compatibility)
    let signatureValid = verifyEd25519Direct(canonicalContent, signatureBytes, publicKey)
    if (!signatureValid) {
      signatureValid = verifyEd25519(canonicalContent, signatureBytes, publicKey)
    }

    if (!signatureValid) {
      results.errors.push('Ed25519 signature verification FAILED')
      results.checks.push({ name: 'Signature verification', status: 'FAIL' })
      return results
    }
    results.checks.push({ name: 'Signature verification', status: 'PASS' })

    // All checks passed
    results.valid = true
    results.payload = payload
    return results

  } catch (err) {
    results.errors.push(`Unexpected error: ${err.message}`)
    return results
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════

function printUsage() {
  console.log(`
OMEGA External Verifier v${VERSION}

Usage:
  node verify.cjs --payload <file> --signature <file> --pubkey <file>
  node verify.cjs --manifest <file>

Options:
  --payload    Path to CANONICAL_PAYLOAD.json (Phase S format)
  --signature  Path to SIGNATURE.bin (64-byte Ed25519)
  --pubkey     Path to PUBLIC_KEY.pem
  --manifest   Path to TRUST_MANIFEST.json (Phase X format, self-contained)
  --quiet      Minimal output (just VALID/INVALID)
  --help       Show this help

Exit codes:
  0  Trust chain VALID
  1  Trust chain INVALID or error

Examples:
  # Verify Phase S style (separate files)
  node verify.cjs --payload payload.json --signature sig.bin --pubkey key.pem

  # Verify Phase X style (manifest with embedded signature)
  node verify.cjs --manifest nexus/proof/phase_x/TRUST_MANIFEST.json
`)
}

function printBanner() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  OMEGA EXTERNAL VERIFIER v' + VERSION)
  console.log('═══════════════════════════════════════════════════════════════')
}

function printResults(results, quiet) {
  if (quiet) {
    console.log(results.valid ? 'VALID' : 'INVALID')
    return
  }

  console.log()
  console.log('VERIFICATION CHECKS:')
  for (const check of results.checks) {
    const icon = check.status === 'PASS' ? '✓' : '✗'
    console.log(`  ${icon} ${check.name}`)
    if (check.value) console.log(`     └─ ${check.value}`)
  }

  if (results.errors.length > 0) {
    console.log()
    console.log('ERRORS:')
    for (const error of results.errors) {
      console.log(`  ✗ ${error}`)
    }
  }

  console.log()
  console.log('═══════════════════════════════════════════════════════════════')
  if (results.valid) {
    console.log('  VERDICT: ✓ TRUST CHAIN VALID')
  } else {
    console.log('  VERDICT: ✗ TRUST CHAIN INVALID')
  }
  console.log('═══════════════════════════════════════════════════════════════')
}

function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    printUsage()
    process.exit(0)
  }

  // Parse arguments
  let payloadPath, signaturePath, pubkeyPath, manifestPath
  let quiet = args.includes('--quiet') || args.includes('-q')

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--payload' && args[i + 1]) payloadPath = args[++i]
    else if (args[i] === '--signature' && args[i + 1]) signaturePath = args[++i]
    else if (args[i] === '--pubkey' && args[i + 1]) pubkeyPath = args[++i]
    else if (args[i] === '--manifest' && args[i + 1]) manifestPath = args[++i]
  }

  if (!quiet) {
    printBanner()
    console.log()
  }

  let results

  if (manifestPath) {
    // Manifest mode (Phase X style)
    if (!quiet) {
      console.log(`Mode:     Manifest`)
      console.log(`Manifest: ${manifestPath}`)
    }
    results = verifyManifest(manifestPath)
  } else if (payloadPath && signaturePath && pubkeyPath) {
    // Separate files mode (Phase S style)
    if (!quiet) {
      console.log(`Mode:      Separate files`)
      console.log(`Payload:   ${payloadPath}`)
      console.log(`Signature: ${signaturePath}`)
      console.log(`Public Key: ${pubkeyPath}`)
    }
    results = verifyTrustChain(payloadPath, signaturePath, pubkeyPath)
  } else {
    console.error('ERROR: Missing required arguments')
    console.error('Use --manifest <file> OR --payload + --signature + --pubkey')
    printUsage()
    process.exit(1)
  }

  printResults(results, quiet)
  process.exit(results.valid ? 0 : 1)
}

// Run if executed directly
if (require.main === module) {
  main()
}

// Export for testing
module.exports = {
  VERSION,
  normalize,
  sortKeys,
  canonicalizeJson,
  sha256,
  hashCanonical,
  verifyEd25519,
  verifyEd25519Direct,
  validatePayloadStructure,
  validateLegacyPayload,
  verifyTrustChain,
  verifyManifest
}
