#!/usr/bin/env node
/**
 * OMEGA PHASE X — CI GATE VERIFICATION
 *
 * Usage: node ci_gate.cjs
 *
 * Performs all CI gate checks locally before push.
 * This script mirrors the GitHub Actions workflow.
 *
 * EXIT CODES:
 *   0 = All gates pass
 *   1 = One or more gates failed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MINIMUM_TESTS = 4400;
const PHASE_X_DIR = __dirname;
const PROJECT_ROOT = path.resolve(PHASE_X_DIR, '..', '..', '..');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  OMEGA PHASE X — CI GATE VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Project Root: ${PROJECT_ROOT}`);
console.log(`  Phase X Dir:  ${PHASE_X_DIR}`);
console.log('───────────────────────────────────────────────────────────────');

let failures = 0;

// Gate 1: Trust Chain Artifacts
console.log('\n[GATE 1/5] Trust Chain Artifacts');
const requiredFiles = [
  'TRUST_MANIFEST.json',
  'PUBLIC_KEY.pem',
  'CANONICAL_PAYLOAD.json',
  'verify_trust.cjs'
];

for (const file of requiredFiles) {
  const filePath = path.join(PHASE_X_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} MISSING`);
    failures++;
  }
}

// Gate 2: Trust Chain Verification
console.log('\n[GATE 2/5] Trust Chain Signature');
try {
  execSync('node ' + path.join(PHASE_X_DIR, 'verify_trust.cjs'), {
    stdio: 'pipe',
    cwd: PROJECT_ROOT
  });
  console.log('  ✅ Signature verified');
} catch (e) {
  console.log('  ❌ Signature verification failed');
  failures++;
}

// Gate 3: TypeScript Strict
console.log('\n[GATE 3/5] TypeScript Strict');
try {
  execSync('npx tsc --noEmit', {
    stdio: 'pipe',
    cwd: PROJECT_ROOT
  });
  console.log('  ✅ 0 errors');
} catch (e) {
  console.log('  ❌ TypeScript errors detected');
  failures++;
}

// Gate 4: Test Threshold
console.log('\n[GATE 4/5] Test Threshold');
try {
  const output = execSync('npm test', {
    encoding: 'utf8',
    cwd: PROJECT_ROOT,
    stdio: 'pipe'
  });

  // Strip ANSI codes and match "Tests" line (not "Test Files")
  const stripped = output.replace(/\x1b\[[0-9;]*m/g, '');
  const match = stripped.match(/^\s*Tests\s+(\d+)\s+passed/m);
  const testCount = match ? parseInt(match[1], 10) : 0;

  if (testCount >= MINIMUM_TESTS) {
    console.log(`  ✅ ${testCount} tests (min: ${MINIMUM_TESTS})`);
  } else {
    console.log(`  ❌ ${testCount} tests < ${MINIMUM_TESTS} minimum`);
    failures++;
  }
} catch (e) {
  console.log('  ❌ Tests failed to run');
  failures++;
}

// Gate 5: Ed25519 Crypto
console.log('\n[GATE 5/5] Ed25519 Crypto');
try {
  const crypto = require('crypto');
  const kp = crypto.generateKeyPairSync('ed25519');
  const msg = Buffer.from('CI_GATE_TEST');
  const sig = crypto.sign(null, msg, kp.privateKey);
  const valid = crypto.verify(null, msg, kp.publicKey, sig);

  if (valid) {
    console.log('  ✅ Ed25519 operational');
  } else {
    console.log('  ❌ Ed25519 verification failed');
    failures++;
  }
} catch (e) {
  console.log('  ❌ Ed25519 not available: ' + e.message);
  failures++;
}

// Final Verdict
console.log('\n═══════════════════════════════════════════════════════════════');
if (failures === 0) {
  console.log('  CI GATE: PASS (all 5 gates verified)');
  console.log('═══════════════════════════════════════════════════════════════');
  process.exit(0);
} else {
  console.log(`  CI GATE: FAIL (${failures} gate(s) failed)`);
  console.log('═══════════════════════════════════════════════════════════════');
  process.exit(1);
}
