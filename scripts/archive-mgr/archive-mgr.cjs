#!/usr/bin/env node
/**
 * OMEGA Archive Manager - Archive Organization
 * @version 3.112.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  version: '3.112.0',
  projectRoot: process.cwd(),
  archiveDir: 'archives',
  maxAge: 30 // days
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function listArchives() {
  const archiveDir = path.join(CONFIG.projectRoot, CONFIG.archiveDir);
  if (!fs.existsSync(archiveDir)) return [];

  return fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.zip') || f.endsWith('.manifest.json'))
    .map(f => {
      const fullPath = path.join(archiveDir, f);
      const stats = fs.statSync(fullPath);
      return {
        name: f,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    });
}

function getArchiveStats() {
  const archives = listArchives();
  const totalSize = archives.reduce((sum, a) => sum + a.size, 0);

  return {
    count: archives.length,
    totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
  };
}

function cleanOldArchives(dryRun = false) {
  const archiveDir = path.join(CONFIG.projectRoot, CONFIG.archiveDir);
  if (!fs.existsSync(archiveDir)) return { cleaned: 0 };

  const now = Date.now();
  const maxAgeMs = CONFIG.maxAge * 24 * 60 * 60 * 1000;
  const toDelete = [];

  const files = fs.readdirSync(archiveDir);
  for (const file of files) {
    const fullPath = path.join(archiveDir, file);
    const stats = fs.statSync(fullPath);
    if (now - stats.mtime.getTime() > maxAgeMs) {
      toDelete.push(file);
      if (!dryRun) fs.unlinkSync(fullPath);
    }
  }

  return { cleaned: toDelete.length, files: toDelete, dryRun };
}

function organizeArchives() {
  const archiveDir = path.join(CONFIG.projectRoot, CONFIG.archiveDir);
  if (!fs.existsSync(archiveDir)) return { organized: 0 };

  const subdirs = { backups: [], phases: [], other: [] };
  const files = fs.readdirSync(archiveDir);

  for (const file of files) {
    if (file.startsWith('BACKUP')) subdirs.backups.push(file);
    else if (file.includes('PHASE')) subdirs.phases.push(file);
    else subdirs.other.push(file);
  }

  return {
    timestamp: new Date().toISOString(),
    categories: subdirs
  };
}

if (require.main === module) {
  const cmd = process.argv[2] || 'list';
  const dryRun = process.argv.includes('--dry-run');
  switch (cmd) {
    case 'list': console.log(JSON.stringify(listArchives(), null, 2)); break;
    case 'stats': console.log(JSON.stringify(getArchiveStats(), null, 2)); break;
    case 'clean': console.log(JSON.stringify(cleanOldArchives(dryRun), null, 2)); break;
    case 'organize': console.log(JSON.stringify(organizeArchives(), null, 2)); break;
    default: console.log('Usage: archive-mgr.cjs [list|stats|clean|organize] [--dry-run]');
  }
}

module.exports = { CONFIG, listArchives, getArchiveStats, cleanOldArchives, organizeArchives };
