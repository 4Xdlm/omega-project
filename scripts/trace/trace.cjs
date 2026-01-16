#!/usr/bin/env node
/**
 * OMEGA Trace Matrix - Requirement Traceability
 * @version 3.113.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  version: '3.113.0',
  projectRoot: process.cwd(),
  traceFile: 'nexus/trace/TRACE_MATRIX.json'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createTraceEntry(reqId, requirement, implementation, test) {
  return {
    reqId,
    requirement,
    implementation,
    test,
    timestamp: new Date().toISOString(),
    status: test ? 'TRACED' : 'PENDING'
  };
}

function loadTraceMatrix() {
  const tracePath = path.join(CONFIG.projectRoot, CONFIG.traceFile);
  if (!fs.existsSync(tracePath)) return { entries: [], version: CONFIG.version };
  return JSON.parse(fs.readFileSync(tracePath, 'utf8'));
}

function saveTraceMatrix(matrix) {
  const tracePath = path.join(CONFIG.projectRoot, CONFIG.traceFile);
  ensureDir(path.dirname(tracePath));
  fs.writeFileSync(tracePath, JSON.stringify({ ...matrix, lastUpdated: new Date().toISOString() }, null, 2));
}

function addTraceEntry(reqId, requirement, implementation, test) {
  const matrix = loadTraceMatrix();
  const entry = createTraceEntry(reqId, requirement, implementation, test);
  matrix.entries.push(entry);
  saveTraceMatrix(matrix);
  return entry;
}

function getTraceStats() {
  const matrix = loadTraceMatrix();
  const traced = matrix.entries.filter(e => e.status === 'TRACED').length;
  const pending = matrix.entries.filter(e => e.status === 'PENDING').length;

  return {
    total: matrix.entries.length,
    traced,
    pending,
    coverage: matrix.entries.length > 0 ? ((traced / matrix.entries.length) * 100).toFixed(1) : 0
  };
}

function findByReqId(reqId) {
  const matrix = loadTraceMatrix();
  return matrix.entries.filter(e => e.reqId.includes(reqId));
}

if (require.main === module) {
  const cmd = process.argv[2] || 'stats';
  switch (cmd) {
    case 'add': console.log(JSON.stringify(addTraceEntry(process.argv[3], process.argv[4], process.argv[5], process.argv[6]), null, 2)); break;
    case 'list': console.log(JSON.stringify(loadTraceMatrix(), null, 2)); break;
    case 'stats': console.log(JSON.stringify(getTraceStats(), null, 2)); break;
    case 'find': console.log(JSON.stringify(findByReqId(process.argv[3] || ''), null, 2)); break;
    default: console.log('Usage: trace.cjs [add|list|stats|find] [reqId] [requirement] [implementation] [test]');
  }
}

module.exports = { CONFIG, createTraceEntry, loadTraceMatrix, saveTraceMatrix, addTraceEntry, getTraceStats, findByReqId };
