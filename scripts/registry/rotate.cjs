#!/usr/bin/env node
/**
 * OMEGA Registry Governance - Rotation Script
 * @description Manages registry rotation, archiving, and audit trail
 * @version 3.94.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  version: '3.94.0',
  projectRoot: process.cwd(),
  registryDir: 'nexus/ledger/registry',
  archiveDir: 'nexus/ledger/registry/archive',
  auditFile: 'nexus/ledger/registry/AUDIT_TRAIL.jsonl',
  maxActiveRegistries: 7, // Keep last 7 days
  registryPrefix: 'REG-'
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const colors = { info: '\x1b[37m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
  console.log(`${colors[level]}[${timestamp}] [REGISTRY] ${message}${colors.reset}`);
}

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function appendAudit(entry) {
  const auditPath = path.join(CONFIG.projectRoot, CONFIG.auditFile);
  ensureDir(path.dirname(auditPath));
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString(), scriptVersion: CONFIG.version }) + '\n';
  fs.appendFileSync(auditPath, line, 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function listRegistries() {
  const registryPath = path.join(CONFIG.projectRoot, CONFIG.registryDir);
  if (!fs.existsSync(registryPath)) return [];

  return fs.readdirSync(registryPath)
    .filter(f => f.startsWith(CONFIG.registryPrefix) && f.endsWith('.yaml'))
    .sort()
    .reverse();
}

function getRegistryDate(filename) {
  const match = filename.match(/REG-(\d{8})/);
  return match ? match[1] : null;
}

function archiveRegistry(filename) {
  const registryPath = path.join(CONFIG.projectRoot, CONFIG.registryDir);
  const archivePath = path.join(CONFIG.projectRoot, CONFIG.archiveDir);

  ensureDir(archivePath);

  const source = path.join(registryPath, filename);
  const dest = path.join(archivePath, filename);

  const hash = hashFile(source);
  fs.copyFileSync(source, dest);
  fs.unlinkSync(source);

  appendAudit({
    action: 'ARCHIVE',
    file: filename,
    hash: hash,
    destination: CONFIG.archiveDir
  });

  log(`Archived: ${filename} (hash: ${hash.substring(0, 16)}...)`, 'success');
  return { file: filename, hash, archived: true };
}

function rotateRegistries(options = {}) {
  const { dryRun = false, maxKeep = CONFIG.maxActiveRegistries } = options;

  log(`Registry Rotation v${CONFIG.version}`, 'info');
  log('═══════════════════════════════════════════════════════════════', 'info');

  const registries = listRegistries();
  log(`Found ${registries.length} registries`, 'info');

  const results = { kept: [], archived: [], errors: [] };

  registries.forEach((file, index) => {
    if (index < maxKeep) {
      results.kept.push(file);
      log(`Keeping: ${file}`, 'info');
    } else {
      if (dryRun) {
        log(`[DRY-RUN] Would archive: ${file}`, 'warn');
        results.archived.push({ file, dryRun: true });
      } else {
        try {
          const result = archiveRegistry(file);
          results.archived.push(result);
        } catch (error) {
          log(`Error archiving ${file}: ${error.message}`, 'error');
          results.errors.push({ file, error: error.message });
        }
      }
    }
  });

  log('═══════════════════════════════════════════════════════════════', 'info');
  log(`Rotation complete: ${results.kept.length} kept, ${results.archived.length} archived`, 'success');

  return results;
}

function createRegistry(date = null) {
  const registryPath = path.join(CONFIG.projectRoot, CONFIG.registryDir);
  ensureDir(registryPath);

  const dateStr = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `${CONFIG.registryPrefix}${dateStr}.yaml`;
  const filePath = path.join(registryPath, filename);

  if (fs.existsSync(filePath)) {
    log(`Registry already exists: ${filename}`, 'warn');
    return { file: filename, created: false, exists: true };
  }

  const content = `# OMEGA Registry - ${dateStr}
# Generated: ${new Date().toISOString()}
# Version: ${CONFIG.version}

registry:
  date: "${dateStr}"
  created_at: "${new Date().toISOString()}"
  entries: []
  metadata:
    script_version: "${CONFIG.version}"
    standard: "NASA-Grade L4"
`;

  fs.writeFileSync(filePath, content, 'utf8');
  const hash = hashFile(filePath);

  appendAudit({
    action: 'CREATE',
    file: filename,
    hash: hash
  });

  log(`Created: ${filename}`, 'success');
  return { file: filename, hash, created: true };
}

function getAuditTrail(limit = 50) {
  const auditPath = path.join(CONFIG.projectRoot, CONFIG.auditFile);
  if (!fs.existsSync(auditPath)) return [];

  const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
  return lines.slice(-limit).map(line => JSON.parse(line));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const dryRun = args.includes('--dry-run');

  switch (command) {
    case 'rotate':
      rotateRegistries({ dryRun });
      break;
    case 'create':
      createRegistry(args[1]);
      break;
    case 'list':
      console.log(listRegistries().join('\n'));
      break;
    case 'audit':
      console.log(JSON.stringify(getAuditTrail(), null, 2));
      break;
    case 'status':
    default:
      const regs = listRegistries();
      log(`Active registries: ${regs.length}`, 'info');
      regs.forEach(r => log(`  - ${r}`, 'info'));
      break;
  }
}

module.exports = { rotateRegistries, createRegistry, listRegistries, getAuditTrail, archiveRegistry, CONFIG };
