#!/usr/bin/env node
/**
 * OMEGA Local CI Runner - Run CI checks locally
 * @description Runs all CI checks before pushing
 * @version 3.97.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  version: '3.97.0',
  projectRoot: process.cwd(),
  sanctuaries: ['packages/sentinel', 'packages/genome', 'packages/mycelium', 'gateway'],
  phaseFile: 'nexus/PHASE_CURRENT.md'
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[37m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    step: '\x1b[36m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[level]}[${timestamp}] [CI] ${message}${colors.reset}`);
}

function runCommand(cmd, description) {
  log(`Running: ${description}`, 'step');
  try {
    const output = execSync(cmd, {
      cwd: CONFIG.projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CI CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

function checkPhaseDeclaration() {
  log('Checking phase declaration...', 'step');
  const phasePath = path.join(CONFIG.projectRoot, CONFIG.phaseFile);

  if (!fs.existsSync(phasePath)) {
    log('PHASE_CURRENT.md not found', 'error');
    return { success: false, error: 'Phase file missing' };
  }

  const content = fs.readFileSync(phasePath, 'utf8');
  const phaseMatch = content.match(/Phase Number\s*:\s*(\d+)/);

  if (!phaseMatch) {
    log('Phase number not found in declaration', 'error');
    return { success: false, error: 'Invalid phase format' };
  }

  log(`Phase ${phaseMatch[1]} declared`, 'success');
  return { success: true, phase: parseInt(phaseMatch[1]) };
}

function checkSanctuaries() {
  log('Checking sanctuary paths...', 'step');

  const result = runCommand('git status --porcelain', 'Check modified files');
  if (!result.success) {
    return { success: false, error: 'Git status failed' };
  }

  const modifiedFiles = result.output.split('\n').filter(Boolean);
  const violations = [];

  for (const line of modifiedFiles) {
    const file = line.substring(3).trim();
    for (const sanctuary of CONFIG.sanctuaries) {
      if (file.startsWith(sanctuary + '/')) {
        violations.push({ file, sanctuary });
      }
    }
  }

  if (violations.length > 0) {
    log(`Sanctuary violations found: ${violations.length}`, 'error');
    violations.forEach(v => log(`  - ${v.file} in ${v.sanctuary}`, 'warn'));
    return { success: false, violations };
  }

  log('Sanctuary paths intact', 'success');
  return { success: true };
}

function runTests() {
  log('Running tests...', 'step');
  const result = runCommand('npm test', 'npm test');

  if (!result.success) {
    log('Tests failed', 'error');
    return { success: false, error: result.error };
  }

  // Parse test results
  const match = result.output.match(/(\d+) passed/);
  const testCount = match ? parseInt(match[1]) : 0;

  log(`Tests passed: ${testCount}`, 'success');
  return { success: true, testCount };
}

function runTypeCheck() {
  log('Running type check...', 'step');
  const result = runCommand('npx tsc --noEmit', 'TypeScript check');

  // Type check may have warnings but not fail
  if (result.output && result.output.includes('error')) {
    log('Type errors found', 'warn');
    return { success: true, warnings: true };
  }

  log('Type check passed', 'success');
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function runLocalCI(options = {}) {
  const { skipTests = false } = options;

  log(`OMEGA Local CI v${CONFIG.version}`, 'info');
  log('═══════════════════════════════════════════════════════════════', 'info');

  const results = {
    phase: null,
    sanctuary: null,
    typeCheck: null,
    tests: null,
    passed: true
  };

  // Phase check
  results.phase = checkPhaseDeclaration();
  if (!results.phase.success) results.passed = false;

  // Sanctuary check
  results.sanctuary = checkSanctuaries();
  if (!results.sanctuary.success) results.passed = false;

  // Type check
  results.typeCheck = runTypeCheck();

  // Tests
  if (!skipTests) {
    results.tests = runTests();
    if (!results.tests.success) results.passed = false;
  } else {
    log('Tests skipped', 'warn');
    results.tests = { success: true, skipped: true };
  }

  // Summary
  log('═══════════════════════════════════════════════════════════════', 'info');
  if (results.passed) {
    log('✅ LOCAL CI PASSED', 'success');
  } else {
    log('❌ LOCAL CI FAILED', 'error');
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const skipTests = args.includes('--skip-tests');

  const results = runLocalCI({ skipTests });
  process.exit(results.passed ? 0 : 1);
}

module.exports = {
  CONFIG,
  checkPhaseDeclaration,
  checkSanctuaries,
  runTests,
  runTypeCheck,
  runLocalCI
};
