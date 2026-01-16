#!/usr/bin/env node
/**
 * OMEGA Master Index - Project Index Generator
 * @version 3.119.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  version: '3.119.0',
  projectRoot: process.cwd(),
  indexFile: 'nexus/MASTER_INDEX.json'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hashFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function indexScripts() {
  const scriptsDir = path.join(CONFIG.projectRoot, 'scripts');
  const index = [];

  if (fs.existsSync(scriptsDir)) {
    const dirs = fs.readdirSync(scriptsDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const dir of dirs) {
      const files = fs.readdirSync(path.join(scriptsDir, dir.name)).filter(f => f.endsWith('.cjs'));
      for (const file of files) {
        const fullPath = path.join(scriptsDir, dir.name, file);
        index.push({
          category: dir.name,
          file,
          path: `scripts/${dir.name}/${file}`,
          hash: hashFile(fullPath)
        });
      }
    }
  }

  return index;
}

function indexDocs() {
  const docsDir = path.join(CONFIG.projectRoot, 'docs');
  const index = [];

  if (fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const fullPath = path.join(docsDir, file);
      index.push({
        file,
        path: `docs/${file}`,
        hash: hashFile(fullPath)
      });
    }
  }

  return index;
}

function generateMasterIndex() {
  const index = {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    scripts: indexScripts(),
    docs: indexDocs(),
    summary: {}
  };

  index.summary = {
    scriptsCount: index.scripts.length,
    docsCount: index.docs.length,
    totalFiles: index.scripts.length + index.docs.length
  };

  return index;
}

function saveMasterIndex() {
  const index = generateMasterIndex();
  const indexPath = path.join(CONFIG.projectRoot, CONFIG.indexFile);
  ensureDir(path.dirname(indexPath));
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  return index;
}

function loadMasterIndex() {
  const indexPath = path.join(CONFIG.projectRoot, CONFIG.indexFile);
  if (!fs.existsSync(indexPath)) return null;
  return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
}

if (require.main === module) {
  const cmd = process.argv[2] || 'show';
  switch (cmd) {
    case 'generate': console.log(JSON.stringify(saveMasterIndex(), null, 2)); break;
    case 'show': console.log(JSON.stringify(loadMasterIndex() || generateMasterIndex(), null, 2)); break;
    default: console.log('Usage: master-index.cjs [generate|show]');
  }
}

module.exports = { CONFIG, indexScripts, indexDocs, generateMasterIndex, saveMasterIndex, loadMasterIndex };
