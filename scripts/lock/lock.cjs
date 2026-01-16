#!/usr/bin/env node
/**
 * OMEGA Lock System - Resource Locking
 * @version 3.108.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  version: '3.108.0',
  projectRoot: process.cwd(),
  locksDir: 'nexus/locks'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function acquireLock(resource, owner = 'system') {
  const locksDir = path.join(CONFIG.projectRoot, CONFIG.locksDir);
  ensureDir(locksDir);

  const lockFile = path.join(locksDir, `${resource}.lock`);

  if (fs.existsSync(lockFile)) {
    const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    return { acquired: false, existingLock: lock };
  }

  const lock = {
    resource,
    owner,
    timestamp: new Date().toISOString(),
    version: CONFIG.version
  };

  fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2));
  return { acquired: true, lock };
}

function releaseLock(resource, owner = 'system') {
  const locksDir = path.join(CONFIG.projectRoot, CONFIG.locksDir);
  const lockFile = path.join(locksDir, `${resource}.lock`);

  if (!fs.existsSync(lockFile)) {
    return { released: false, error: 'Lock not found' };
  }

  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  if (lock.owner !== owner) {
    return { released: false, error: 'Owner mismatch' };
  }

  fs.unlinkSync(lockFile);
  return { released: true, resource };
}

function listLocks() {
  const locksDir = path.join(CONFIG.projectRoot, CONFIG.locksDir);
  if (!fs.existsSync(locksDir)) return [];

  return fs.readdirSync(locksDir)
    .filter(f => f.endsWith('.lock'))
    .map(f => JSON.parse(fs.readFileSync(path.join(locksDir, f), 'utf8')));
}

function isLocked(resource) {
  const locksDir = path.join(CONFIG.projectRoot, CONFIG.locksDir);
  const lockFile = path.join(locksDir, `${resource}.lock`);
  return fs.existsSync(lockFile);
}

if (require.main === module) {
  const cmd = process.argv[2] || 'list';
  switch (cmd) {
    case 'acquire': console.log(JSON.stringify(acquireLock(process.argv[3], process.argv[4]), null, 2)); break;
    case 'release': console.log(JSON.stringify(releaseLock(process.argv[3], process.argv[4]), null, 2)); break;
    case 'list': console.log(JSON.stringify(listLocks(), null, 2)); break;
    case 'check': console.log(`Locked: ${isLocked(process.argv[3])}`); break;
    default: console.log('Usage: lock.cjs [acquire|release|list|check] [resource] [owner]');
  }
}

module.exports = { CONFIG, acquireLock, releaseLock, listLocks, isLocked };
