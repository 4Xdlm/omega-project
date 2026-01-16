#!/usr/bin/env node
/**
 * OMEGA Health Check - System Health Monitoring
 * @description Check system health and report status
 * @version 3.102.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  version: '3.102.0',
  projectRoot: process.cwd(),
  criticalFiles: ['package.json', 'vitest.config.ts', 'nexus/PHASE_CURRENT.md'],
  criticalDirs: ['scripts', 'test', 'docs', 'nexus']
};

function log(msg, lvl = 'info') {
  const colors = { info: '\x1b[37m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
  console.log(`${colors[lvl]}[HEALTH] ${msg}${colors.reset}`);
}

function checkFile(file) {
  const fullPath = path.join(CONFIG.projectRoot, file);
  return fs.existsSync(fullPath);
}

function checkDir(dir) {
  const fullPath = path.join(CONFIG.projectRoot, dir);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

function checkGit() {
  try {
    execSync('git status', { cwd: CONFIG.projectRoot, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

function checkNode() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    return { available: true, version };
  } catch { return { available: false }; }
}

function checkNpm() {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    return { available: true, version };
  } catch { return { available: false }; }
}

function checkNodeModules() {
  return fs.existsSync(path.join(CONFIG.projectRoot, 'node_modules'));
}

function runHealthCheck() {
  log(`Health Check v${CONFIG.version}`, 'info');

  const results = {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    healthy: true,
    checks: {}
  };

  // Critical files
  results.checks.files = {};
  for (const file of CONFIG.criticalFiles) {
    const exists = checkFile(file);
    results.checks.files[file] = exists;
    if (!exists) results.healthy = false;
  }

  // Critical directories
  results.checks.directories = {};
  for (const dir of CONFIG.criticalDirs) {
    const exists = checkDir(dir);
    results.checks.directories[dir] = exists;
    if (!exists) results.healthy = false;
  }

  // System checks
  results.checks.git = checkGit();
  results.checks.node = checkNode();
  results.checks.npm = checkNpm();
  results.checks.nodeModules = checkNodeModules();

  if (!results.checks.git) results.healthy = false;
  if (!results.checks.node.available) results.healthy = false;
  if (!results.checks.nodeModules) results.healthy = false;

  // Summary
  log(results.healthy ? '✅ System healthy' : '❌ Health issues detected', results.healthy ? 'success' : 'error');

  return results;
}

if (require.main === module) {
  const results = runHealthCheck();
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.healthy ? 0 : 1);
}

module.exports = { CONFIG, checkFile, checkDir, checkGit, checkNode, checkNpm, checkNodeModules, runHealthCheck };
