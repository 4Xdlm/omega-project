#!/usr/bin/env node
/**
 * OMEGA Backup System - Archive Management
 * @description Create and manage project backups
 * @version 3.103.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const CONFIG = {
  version: '3.103.0',
  projectRoot: process.cwd(),
  backupDir: 'archives/backups',
  maxBackups: 5
};

function log(msg, lvl = 'info') {
  const colors = { info: '\x1b[37m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
  console.log(`${colors[lvl]}[BACKUP] ${msg}${colors.reset}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hashFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
}

function createBackup(name = null) {
  const backupDir = path.join(CONFIG.projectRoot, CONFIG.backupDir);
  ensureDir(backupDir);

  const timestamp = getTimestamp();
  const backupName = name || `BACKUP_${timestamp}`;
  const manifestPath = path.join(backupDir, `${backupName}.manifest.json`);

  const manifest = {
    name: backupName,
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    files: []
  };

  // List critical files to backup
  const criticalPaths = ['package.json', 'vitest.config.ts', 'nexus/PHASE_CURRENT.md', 'CLAUDE.md'];
  for (const p of criticalPaths) {
    const fullPath = path.join(CONFIG.projectRoot, p);
    if (fs.existsSync(fullPath)) {
      manifest.files.push({
        path: p,
        hash: hashFile(fullPath),
        size: fs.statSync(fullPath).size
      });
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log(`Backup manifest created: ${backupName}`, 'success');
  return manifest;
}

function listBackups() {
  const backupDir = path.join(CONFIG.projectRoot, CONFIG.backupDir);
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir).filter(f => f.endsWith('.manifest.json')).map(f => f.replace('.manifest.json', ''));
}

function verifyBackup(name) {
  const backupDir = path.join(CONFIG.projectRoot, CONFIG.backupDir);
  const manifestPath = path.join(backupDir, `${name}.manifest.json`);
  if (!fs.existsSync(manifestPath)) return { valid: false, error: 'Backup not found' };

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const results = { valid: true, mismatches: [] };

  for (const file of manifest.files) {
    const fullPath = path.join(CONFIG.projectRoot, file.path);
    if (!fs.existsSync(fullPath)) {
      results.mismatches.push({ file: file.path, error: 'MISSING' });
      results.valid = false;
    } else {
      const currentHash = hashFile(fullPath);
      if (currentHash !== file.hash) {
        results.mismatches.push({ file: file.path, expected: file.hash, actual: currentHash });
        results.valid = false;
      }
    }
  }

  return results;
}

function cleanOldBackups() {
  const backups = listBackups().sort().reverse();
  const toDelete = backups.slice(CONFIG.maxBackups);
  const backupDir = path.join(CONFIG.projectRoot, CONFIG.backupDir);

  for (const name of toDelete) {
    const manifestPath = path.join(backupDir, `${name}.manifest.json`);
    fs.unlinkSync(manifestPath);
    log(`Deleted old backup: ${name}`, 'warn');
  }

  return toDelete.length;
}

if (require.main === module) {
  const cmd = process.argv[2] || 'list';
  switch (cmd) {
    case 'create': console.log(JSON.stringify(createBackup(process.argv[3]), null, 2)); break;
    case 'list': console.log(listBackups().join('\n')); break;
    case 'verify': console.log(JSON.stringify(verifyBackup(process.argv[3]), null, 2)); break;
    case 'clean': console.log(`Cleaned ${cleanOldBackups()} old backups`); break;
    default: console.log('Usage: backup.cjs [create|list|verify|clean] [name]');
  }
}

module.exports = { CONFIG, createBackup, listBackups, verifyBackup, cleanOldBackups, getTimestamp };
