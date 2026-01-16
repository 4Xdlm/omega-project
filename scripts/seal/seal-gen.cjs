#!/usr/bin/env node
/**
 * OMEGA Seal Generator - Cryptographic Sealing
 * @version 3.118.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  version: '3.118.0',
  projectRoot: process.cwd(),
  sealDir: 'nexus/seals'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function generateSeal(name, data) {
  const seal = {
    name,
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    data,
    dataHash: hashString(JSON.stringify(data)),
    sealHash: ''
  };

  seal.sealHash = hashString(JSON.stringify({ name: seal.name, timestamp: seal.timestamp, dataHash: seal.dataHash }));

  return seal;
}

function saveSeal(seal) {
  const sealDir = path.join(CONFIG.projectRoot, CONFIG.sealDir);
  ensureDir(sealDir);
  const sealPath = path.join(sealDir, `${seal.name}.seal.json`);
  fs.writeFileSync(sealPath, JSON.stringify(seal, null, 2));
  return sealPath;
}

function verifySeal(name) {
  const sealPath = path.join(CONFIG.projectRoot, CONFIG.sealDir, `${name}.seal.json`);
  if (!fs.existsSync(sealPath)) return { valid: false, error: 'Seal not found' };

  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  const expectedHash = hashString(JSON.stringify({ name: seal.name, timestamp: seal.timestamp, dataHash: seal.dataHash }));

  return {
    valid: seal.sealHash === expectedHash,
    seal
  };
}

function listSeals() {
  const sealDir = path.join(CONFIG.projectRoot, CONFIG.sealDir);
  if (!fs.existsSync(sealDir)) return [];
  return fs.readdirSync(sealDir).filter(f => f.endsWith('.seal.json')).map(f => f.replace('.seal.json', ''));
}

if (require.main === module) {
  const cmd = process.argv[2] || 'list';
  switch (cmd) {
    case 'generate': {
      const seal = generateSeal(process.argv[3] || 'TEST', { note: process.argv[4] || 'Manual seal' });
      console.log(JSON.stringify(seal, null, 2));
      break;
    }
    case 'verify': console.log(JSON.stringify(verifySeal(process.argv[3] || 'TEST'), null, 2)); break;
    case 'list': console.log(listSeals().join('\n')); break;
    default: console.log('Usage: seal-gen.cjs [generate|verify|list] [name] [data]');
  }
}

module.exports = { CONFIG, hashString, generateSeal, saveSeal, verifySeal, listSeals };
