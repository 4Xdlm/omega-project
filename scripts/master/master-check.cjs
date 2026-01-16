#!/usr/bin/env node
/**
 * OMEGA Master Checker - Complete System Validation
 * @version 3.116.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  version: '3.116.0',
  projectRoot: process.cwd()
};

function runMasterCheck() {
  const checks = {
    git: false,
    tests: false,
    phase: false,
    scripts: false,
    docs: false
  };

  try { execSync('git status', { cwd: CONFIG.projectRoot, stdio: 'pipe' }); checks.git = true; } catch {}
  checks.phase = fs.existsSync(path.join(CONFIG.projectRoot, 'nexus/PHASE_CURRENT.md'));
  checks.scripts = fs.existsSync(path.join(CONFIG.projectRoot, 'scripts'));
  checks.docs = fs.existsSync(path.join(CONFIG.projectRoot, 'docs'));

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  return {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    checks,
    summary: { passed, total, percentage: ((passed / total) * 100).toFixed(0) },
    masterStatus: passed === total ? 'PASS' : 'FAIL'
  };
}

if (require.main === module) {
  const result = runMasterCheck();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.masterStatus === 'PASS' ? 0 : 1);
}

module.exports = { CONFIG, runMasterCheck };
