#!/usr/bin/env node
/**
 * OMEGA Verification Chain - Multi-Step Verification
 * @version 3.109.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  version: '3.109.0',
  projectRoot: process.cwd()
};

function runStep(name, fn) {
  try {
    const result = fn();
    return { name, status: 'PASS', result };
  } catch (e) {
    return { name, status: 'FAIL', error: e.message };
  }
}

function verifyPhaseDeclaration() {
  const phasePath = path.join(CONFIG.projectRoot, 'nexus/PHASE_CURRENT.md');
  if (!fs.existsSync(phasePath)) throw new Error('Phase file missing');
  const content = fs.readFileSync(phasePath, 'utf8');
  if (!content.match(/Phase Number/)) throw new Error('Invalid phase format');
  return { valid: true };
}

function verifyGitStatus() {
  try {
    execSync('git status', { cwd: CONFIG.projectRoot, stdio: 'pipe' });
    return { valid: true };
  } catch { throw new Error('Git not available'); }
}

function verifyPackageJson() {
  const pkgPath = path.join(CONFIG.projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) throw new Error('package.json missing');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.version) throw new Error('Version missing in package.json');
  return { version: pkg.version };
}

function verifyNodeModules() {
  const nmPath = path.join(CONFIG.projectRoot, 'node_modules');
  if (!fs.existsSync(nmPath)) throw new Error('node_modules missing');
  return { installed: true };
}

function runVerificationChain() {
  const steps = [
    runStep('PHASE_DECLARATION', verifyPhaseDeclaration),
    runStep('GIT_STATUS', verifyGitStatus),
    runStep('PACKAGE_JSON', verifyPackageJson),
    runStep('NODE_MODULES', verifyNodeModules)
  ];

  const passed = steps.filter(s => s.status === 'PASS').length;
  const failed = steps.filter(s => s.status === 'FAIL').length;

  return {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    steps,
    summary: { total: steps.length, passed, failed },
    chainValid: failed === 0
  };
}

if (require.main === module) {
  const result = runVerificationChain();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.chainValid ? 0 : 1);
}

module.exports = { CONFIG, runStep, verifyPhaseDeclaration, verifyGitStatus, verifyPackageJson, verifyNodeModules, runVerificationChain };
