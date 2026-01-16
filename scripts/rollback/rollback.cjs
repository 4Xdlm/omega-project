#!/usr/bin/env node
/**
 * OMEGA Rollback System - State Recovery
 * @description Rollback to previous states
 * @version 3.99.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  version: '3.99.0',
  projectRoot: process.cwd(),
  rollbackLog: 'nexus/ledger/rollback/ROLLBACK_LOG.jsonl'
};

function log(msg, lvl = 'info') {
  const colors = { info: '\x1b[37m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
  console.log(`${colors[lvl]}[ROLLBACK] ${msg}${colors.reset}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendLog(entry) {
  const logPath = path.join(CONFIG.projectRoot, CONFIG.rollbackLog);
  ensureDir(path.dirname(logPath));
  fs.appendFileSync(logPath, JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + '\n');
}

function getGitTags() {
  try {
    const output = execSync('git tag -l --sort=-v:refname', { encoding: 'utf8', cwd: CONFIG.projectRoot });
    return output.trim().split('\n').filter(Boolean);
  } catch { return []; }
}

function getCurrentCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: CONFIG.projectRoot }).trim();
  } catch { return null; }
}

function rollbackToTag(tag, dryRun = false) {
  const tags = getGitTags();
  if (!tags.includes(tag)) return { success: false, error: 'Tag not found' };

  const currentCommit = getCurrentCommit();
  log(`Current commit: ${currentCommit}`, 'info');
  log(`Rolling back to: ${tag}`, 'warn');

  if (dryRun) {
    log('[DRY-RUN] Would execute: git checkout ' + tag, 'warn');
    return { success: true, dryRun: true, tag };
  }

  try {
    execSync(`git checkout ${tag}`, { cwd: CONFIG.projectRoot });
    appendLog({ action: 'ROLLBACK', from: currentCommit, to: tag });
    log(`Rolled back to ${tag}`, 'success');
    return { success: true, tag, previousCommit: currentCommit };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function listRollbackHistory() {
  const logPath = path.join(CONFIG.projectRoot, CONFIG.rollbackLog);
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function canRollback() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: CONFIG.projectRoot });
    return status.trim().length === 0;
  } catch { return false; }
}

if (require.main === module) {
  const cmd = process.argv[2] || 'list';
  const dryRun = process.argv.includes('--dry-run');
  switch (cmd) {
    case 'to': console.log(JSON.stringify(rollbackToTag(process.argv[3], dryRun), null, 2)); break;
    case 'tags': console.log(getGitTags().join('\n')); break;
    case 'history': console.log(JSON.stringify(listRollbackHistory(), null, 2)); break;
    case 'check': console.log(`Can rollback: ${canRollback()}`); break;
    default: console.log('Usage: rollback.cjs [to <tag>|tags|history|check] [--dry-run]');
  }
}

module.exports = { CONFIG, getGitTags, getCurrentCommit, rollbackToTag, listRollbackHistory, canRollback };
