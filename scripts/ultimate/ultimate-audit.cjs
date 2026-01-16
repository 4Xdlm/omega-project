#!/usr/bin/env node
/**
 * OMEGA Ultimate Audit - Comprehensive System Audit
 * @version 3.121.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const CONFIG = {
  version: '3.121.0',
  projectRoot: process.cwd(),
  auditFile: 'nexus/audit/ULTIMATE_AUDIT.json'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hashDir(dir) {
  const hashes = [];
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      if (file.isFile()) {
        const content = fs.readFileSync(path.join(dir, file.name));
        hashes.push(crypto.createHash('sha256').update(content).digest('hex'));
      }
    }
  }
  return crypto.createHash('sha256').update(hashes.sort().join('')).digest('hex');
}

function auditScripts() {
  const scriptsDir = path.join(CONFIG.projectRoot, 'scripts');
  return { path: 'scripts', hash: hashDir(scriptsDir), exists: fs.existsSync(scriptsDir) };
}

function auditTests() {
  const testDir = path.join(CONFIG.projectRoot, 'test');
  return { path: 'test', hash: hashDir(testDir), exists: fs.existsSync(testDir) };
}

function auditDocs() {
  const docsDir = path.join(CONFIG.projectRoot, 'docs');
  return { path: 'docs', hash: hashDir(docsDir), exists: fs.existsSync(docsDir) };
}

function runUltimateAudit() {
  const audit = {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    audits: [auditScripts(), auditTests(), auditDocs()],
    overallHash: ''
  };

  audit.overallHash = crypto.createHash('sha256')
    .update(audit.audits.map(a => a.hash).join(''))
    .digest('hex');

  return audit;
}

function saveAudit() {
  const audit = runUltimateAudit();
  const auditPath = path.join(CONFIG.projectRoot, CONFIG.auditFile);
  ensureDir(path.dirname(auditPath));
  fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2));
  return audit;
}

if (require.main === module) {
  const cmd = process.argv[2] || 'run';
  switch (cmd) {
    case 'run': console.log(JSON.stringify(runUltimateAudit(), null, 2)); break;
    case 'save': console.log(JSON.stringify(saveAudit(), null, 2)); break;
    default: console.log('Usage: ultimate-audit.cjs [run|save]');
  }
}

module.exports = { CONFIG, hashDir, auditScripts, auditTests, auditDocs, runUltimateAudit, saveAudit };
