#!/usr/bin/env node
/**
 * OMEGA Integrity Checker - File Integrity Verification
 * @version 3.106.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  version: '3.106.0',
  projectRoot: process.cwd(),
  integrityFile: 'nexus/integrity/INTEGRITY_MANIFEST.json'
};

function hashFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateManifest(patterns = ['scripts/**/*.cjs', 'test/**/*.ts']) {
  const manifest = { timestamp: new Date().toISOString(), version: CONFIG.version, files: {} };

  const scriptsDir = path.join(CONFIG.projectRoot, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const dirs = fs.readdirSync(scriptsDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const dir of dirs) {
      const files = fs.readdirSync(path.join(scriptsDir, dir.name)).filter(f => f.endsWith('.cjs'));
      for (const file of files) {
        const relPath = `scripts/${dir.name}/${file}`;
        const fullPath = path.join(CONFIG.projectRoot, relPath);
        manifest.files[relPath] = hashFile(fullPath);
      }
    }
  }

  return manifest;
}

function saveManifest() {
  const manifest = generateManifest();
  const manifestPath = path.join(CONFIG.projectRoot, CONFIG.integrityFile);
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

function verifyIntegrity() {
  const manifestPath = path.join(CONFIG.projectRoot, CONFIG.integrityFile);
  if (!fs.existsSync(manifestPath)) return { valid: false, error: 'Manifest not found' };

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const results = { valid: true, checked: 0, mismatches: [] };

  for (const [file, expectedHash] of Object.entries(manifest.files)) {
    const fullPath = path.join(CONFIG.projectRoot, file);
    results.checked++;
    if (!fs.existsSync(fullPath)) {
      results.mismatches.push({ file, error: 'MISSING' });
      results.valid = false;
    } else if (hashFile(fullPath) !== expectedHash) {
      results.mismatches.push({ file, error: 'HASH_MISMATCH' });
      results.valid = false;
    }
  }

  return results;
}

if (require.main === module) {
  const cmd = process.argv[2] || 'verify';
  switch (cmd) {
    case 'generate': console.log(JSON.stringify(saveManifest(), null, 2)); break;
    case 'verify': console.log(JSON.stringify(verifyIntegrity(), null, 2)); break;
    default: console.log('Usage: integrity.cjs [generate|verify]');
  }
}

module.exports = { CONFIG, hashFile, generateManifest, saveManifest, verifyIntegrity };
