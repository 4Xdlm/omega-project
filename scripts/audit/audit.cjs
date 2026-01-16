#!/usr/bin/env node
/**
 * OMEGA Audit System - Action Logging
 * @version 3.107.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  version: '3.107.0',
  projectRoot: process.cwd(),
  auditLog: 'nexus/audit/AUDIT_LOG.jsonl'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function logAction(action, details = {}) {
  const logPath = path.join(CONFIG.projectRoot, CONFIG.auditLog);
  ensureDir(path.dirname(logPath));

  const entry = {
    timestamp: new Date().toISOString(),
    action,
    version: CONFIG.version,
    ...details
  };

  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  return entry;
}

function getAuditLog(limit = 100) {
  const logPath = path.join(CONFIG.projectRoot, CONFIG.auditLog);
  if (!fs.existsSync(logPath)) return [];

  const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
  return lines.slice(-limit).map(l => JSON.parse(l));
}

function searchAuditLog(action) {
  return getAuditLog(1000).filter(e => e.action.includes(action));
}

function clearAuditLog() {
  const logPath = path.join(CONFIG.projectRoot, CONFIG.auditLog);
  if (fs.existsSync(logPath)) {
    const backup = logPath + '.backup';
    fs.copyFileSync(logPath, backup);
    fs.unlinkSync(logPath);
    return { cleared: true, backup };
  }
  return { cleared: false };
}

if (require.main === module) {
  const cmd = process.argv[2] || 'list';
  switch (cmd) {
    case 'log': console.log(JSON.stringify(logAction(process.argv[3] || 'MANUAL', { note: process.argv[4] }), null, 2)); break;
    case 'list': console.log(JSON.stringify(getAuditLog(50), null, 2)); break;
    case 'search': console.log(JSON.stringify(searchAuditLog(process.argv[3] || ''), null, 2)); break;
    default: console.log('Usage: audit.cjs [log|list|search] [action] [note]');
  }
}

module.exports = { CONFIG, logAction, getAuditLog, searchAuditLog, clearAuditLog };
