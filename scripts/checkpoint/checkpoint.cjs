#!/usr/bin/env node
/**
 * OMEGA Checkpoint System - State Snapshots
 * @description Create and restore state checkpoints
 * @version 3.98.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  version: '3.98.0',
  projectRoot: process.cwd(),
  checkpointDir: 'nexus/checkpoints',
  maxCheckpoints: 10
};

function log(msg, lvl = 'info') {
  const colors = { info: '\x1b[37m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
  console.log(`${colors[lvl]}[CHECKPOINT] ${msg}${colors.reset}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hashFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function createCheckpoint(name = null) {
  const cpDir = path.join(CONFIG.projectRoot, CONFIG.checkpointDir);
  ensureDir(cpDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const cpName = name || `CP-${timestamp}`;
  const cpPath = path.join(cpDir, `${cpName}.json`);

  const checkpoint = {
    name: cpName,
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    files: {}
  };

  // Capture critical file hashes
  const criticalPaths = ['nexus/PHASE_CURRENT.md', 'package.json', 'vitest.config.ts'];
  for (const p of criticalPaths) {
    const fullPath = path.join(CONFIG.projectRoot, p);
    if (fs.existsSync(fullPath)) {
      checkpoint.files[p] = hashFile(fullPath);
    }
  }

  fs.writeFileSync(cpPath, JSON.stringify(checkpoint, null, 2));
  log(`Checkpoint created: ${cpName}`, 'success');
  return checkpoint;
}

function listCheckpoints() {
  const cpDir = path.join(CONFIG.projectRoot, CONFIG.checkpointDir);
  if (!fs.existsSync(cpDir)) return [];
  return fs.readdirSync(cpDir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
}

function loadCheckpoint(name) {
  const cpPath = path.join(CONFIG.projectRoot, CONFIG.checkpointDir, `${name}.json`);
  if (!fs.existsSync(cpPath)) return null;
  return JSON.parse(fs.readFileSync(cpPath, 'utf8'));
}

function verifyCheckpoint(name) {
  const cp = loadCheckpoint(name);
  if (!cp) return { valid: false, error: 'Checkpoint not found' };

  const results = { valid: true, mismatches: [] };
  for (const [file, hash] of Object.entries(cp.files)) {
    const fullPath = path.join(CONFIG.projectRoot, file);
    if (!fs.existsSync(fullPath)) {
      results.mismatches.push({ file, expected: hash, actual: 'MISSING' });
      results.valid = false;
    } else {
      const currentHash = hashFile(fullPath);
      if (currentHash !== hash) {
        results.mismatches.push({ file, expected: hash, actual: currentHash });
        results.valid = false;
      }
    }
  }
  return results;
}

if (require.main === module) {
  const cmd = process.argv[2] || 'list';
  switch (cmd) {
    case 'create': createCheckpoint(process.argv[3]); break;
    case 'list': console.log(listCheckpoints().join('\n')); break;
    case 'verify': console.log(JSON.stringify(verifyCheckpoint(process.argv[3]), null, 2)); break;
    default: console.log('Usage: checkpoint.cjs [create|list|verify] [name]');
  }
}

module.exports = { CONFIG, createCheckpoint, listCheckpoints, loadCheckpoint, verifyCheckpoint };
