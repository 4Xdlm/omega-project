#!/usr/bin/env node
/**
 * OMEGA PHASE X — OFFLINE TRUST CHAIN VERIFIER
 *
 * Usage: node verify_trust.js
 *
 * Verifies the Ed25519 signature of TRUST_MANIFEST.json
 * using only Node.js built-in crypto module.
 *
 * NO EXTERNAL DEPENDENCIES REQUIRED.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MANIFEST_FILE = path.join(__dirname, 'TRUST_MANIFEST.json');
const CANONICAL_FILE = path.join(__dirname, 'CANONICAL_PAYLOAD.json');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  OMEGA PHASE X — TRUST CHAIN VERIFIER');
console.log('═══════════════════════════════════════════════════════════════');

try {
  // 1. Load manifest
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  console.log('\n[1/4] Manifest loaded');
  console.log(`      Chain ID: ${manifest.payload.chain_id}`);
  console.log(`      Timestamp: ${manifest.payload.timestamp}`);

  // 2. Load canonical payload
  const canonical = fs.readFileSync(CANONICAL_FILE, 'utf8');
  console.log('\n[2/4] Canonical payload loaded');
  const payloadHash = crypto.createHash('sha256').update(canonical).digest('hex');
  console.log(`      SHA-256: ${payloadHash}`);

  // 3. Reconstruct public key from hex
  const publicKeyDer = Buffer.from(manifest.signature.public_key_hex, 'hex');
  const publicKey = crypto.createPublicKey({
    key: publicKeyDer,
    format: 'der',
    type: 'spki'
  });
  console.log('\n[3/4] Public key reconstructed');
  console.log(`      Algorithm: ${manifest.signature.algorithm}`);

  // 4. Verify signature
  const signature = Buffer.from(manifest.signature.value, 'hex');
  const isValid = crypto.verify(null, Buffer.from(canonical), publicKey, signature);

  console.log('\n[4/4] Signature verification');
  console.log(`      Status: ${isValid ? 'VALID' : 'INVALID'}`);

  // 5. Display payload summary
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('  PAYLOAD SUMMARY');
  console.log('───────────────────────────────────────────────────────────────');
  for (const entry of manifest.payload.entries) {
    if (entry.phase === 'PREFLIGHT') {
      console.log(`  PREFLIGHT: ${entry.status} (${entry.tests} tests)`);
    } else if (entry.phase === 'SEALED_PHASES') {
      console.log(`  SEALED: ${entry.items.join(', ')}`);
    } else if (entry.phase === 'FROZEN_MODULES') {
      console.log(`  FROZEN: ${entry.items.join(', ')}`);
    } else if (entry.phase === 'GIT_STATE') {
      console.log(`  GIT: ${entry.head} (${entry.branch})`);
    }
  }

  // 6. Final verdict
  console.log('\n═══════════════════════════════════════════════════════════════');
  if (isValid) {
    console.log('  VERDICT: TRUST CHAIN VERIFIED');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(0);
  } else {
    console.log('  VERDICT: TRUST CHAIN COMPROMISED');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(1);
  }

} catch (error) {
  console.error('\nERROR:', error.message);
  process.exit(1);
}
