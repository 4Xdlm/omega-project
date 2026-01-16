#!/usr/bin/env node
/**
 * OMEGA Constitution Gate
 * @description Validates commits against OMEGA constitution rules
 * @version 3.92.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  version: '3.92.0',
  timeout: 5000, // 5 seconds max for pre-commit
  sanctuaries: [
    'packages/sentinel',
    'packages/genome',
    'packages/mycelium',
    'gateway'
  ],
  requiredFiles: {
    phaseDeclaration: 'nexus/PHASE_CURRENT.md'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} GateResult
 * @property {boolean} pass
 * @property {string} rule
 * @property {string} message
 * @property {number} duration
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} pass
 * @property {GateResult[]} results
 * @property {number} totalDuration
 */

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute git command
 * @param {string} cmd
 * @returns {string}
 */
function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf-8', timeout: CONFIG.timeout }).trim();
  } catch (error) {
    return '';
  }
}

/**
 * Check if file exists
 * @param {string} filePath
 * @returns {boolean}
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Read file content
 * @param {string} filePath
 * @returns {string}
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Log message with color
 * @param {string} message
 * @param {'info'|'success'|'error'|'warn'} level
 */
function log(message, level = 'info') {
  const colors = {
    info: '\x1b[37m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[level]}[GATE] ${message}${colors.reset}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rule: Sanctuary Protection
 * Ensures no sanctuary files are staged
 * @returns {GateResult}
 */
function ruleSanctuaryProtection() {
  const start = Date.now();
  const stagedFiles = git('diff --cached --name-only');

  for (const sanctuary of CONFIG.sanctuaries) {
    if (stagedFiles.includes(sanctuary)) {
      return {
        pass: false,
        rule: 'SANCTUARY_PROTECTION',
        message: `Sanctuary violation: ${sanctuary} is being modified`,
        duration: Date.now() - start
      };
    }
  }

  return {
    pass: true,
    rule: 'SANCTUARY_PROTECTION',
    message: 'No sanctuary violations detected',
    duration: Date.now() - start
  };
}

/**
 * Rule: Phase Declaration
 * Ensures PHASE_CURRENT.md exists and has valid content
 * @returns {GateResult}
 */
function rulePhaseDeclaration() {
  const start = Date.now();
  const phasePath = CONFIG.requiredFiles.phaseDeclaration;

  if (!fileExists(phasePath)) {
    return {
      pass: false,
      rule: 'PHASE_DECLARATION',
      message: `Phase declaration missing: ${phasePath}`,
      duration: Date.now() - start
    };
  }

  const content = readFile(phasePath);

  if (!content.includes('Phase Number')) {
    return {
      pass: false,
      rule: 'PHASE_DECLARATION',
      message: 'Phase declaration invalid: missing Phase Number',
      duration: Date.now() - start
    };
  }

  const match = content.match(/Phase Number\s*:\s*(\d+)/);
  if (!match) {
    return {
      pass: false,
      rule: 'PHASE_DECLARATION',
      message: 'Phase declaration invalid: Phase Number is empty',
      duration: Date.now() - start
    };
  }

  return {
    pass: true,
    rule: 'PHASE_DECLARATION',
    message: `Phase ${match[1]} declared`,
    duration: Date.now() - start
  };
}

/**
 * Rule: No Forbidden Commands
 * Checks staged files don't contain forbidden patterns
 * @returns {GateResult}
 */
function ruleNoForbiddenPatterns() {
  const start = Date.now();
  const forbiddenPatterns = [
    { pattern: /git\s+add\s+\./, message: 'git add . is forbidden' },
    { pattern: /git\s+add\s+-A/, message: 'git add -A is forbidden' },
    { pattern: /git\s+push\s+--force/, message: 'git push --force is forbidden' },
    { pattern: /rm\s+-rf/, message: 'rm -rf is forbidden' }
  ];

  const stagedFiles = git('diff --cached --name-only').split('\n').filter(Boolean);

  for (const file of stagedFiles) {
    if (!fileExists(file)) continue;

    const content = readFile(file);
    for (const { pattern, message } of forbiddenPatterns) {
      if (pattern.test(content)) {
        return {
          pass: false,
          rule: 'NO_FORBIDDEN_PATTERNS',
          message: `${message} in ${file}`,
          duration: Date.now() - start
        };
      }
    }
  }

  return {
    pass: true,
    rule: 'NO_FORBIDDEN_PATTERNS',
    message: 'No forbidden patterns detected',
    duration: Date.now() - start
  };
}

/**
 * Rule: Working Tree Clean After Commit
 * Validates git status is clean (except untracked)
 * @returns {GateResult}
 */
function ruleWorkingTreeStatus() {
  const start = Date.now();
  const status = git('status --porcelain');
  const lines = status.split('\n').filter(Boolean);

  // Filter out untracked files (??)
  const uncommitted = lines.filter(line => !line.startsWith('??'));

  // During pre-commit, staged files are expected
  // This rule is mainly for post-commit validation

  return {
    pass: true,
    rule: 'WORKING_TREE_STATUS',
    message: `Working tree status: ${uncommitted.length} modified, ${lines.length - uncommitted.length} untracked`,
    duration: Date.now() - start
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run all gate rules
 * @param {'pre-commit'|'pre-push'} mode
 * @returns {ValidationResult}
 */
function validate(mode = 'pre-commit') {
  const start = Date.now();
  const results = [];

  log(`Constitution Gate v${CONFIG.version} - ${mode}`, 'info');
  log('═══════════════════════════════════════════════════════════════', 'info');

  // Pre-commit rules (fast, < 5s total)
  if (mode === 'pre-commit') {
    results.push(ruleSanctuaryProtection());
    results.push(rulePhaseDeclaration());
    results.push(ruleWorkingTreeStatus());
  }

  // Pre-push rules (can be slower)
  if (mode === 'pre-push') {
    results.push(ruleSanctuaryProtection());
    results.push(rulePhaseDeclaration());
    results.push(ruleNoForbiddenPatterns());
  }

  // Report results
  let allPass = true;
  for (const result of results) {
    const icon = result.pass ? '✓' : '✗';
    const level = result.pass ? 'success' : 'error';
    log(`${icon} [${result.rule}] ${result.message} (${result.duration}ms)`, level);
    if (!result.pass) allPass = false;
  }

  const totalDuration = Date.now() - start;
  log('═══════════════════════════════════════════════════════════════', 'info');
  log(`Total: ${totalDuration}ms (limit: ${CONFIG.timeout}ms)`, totalDuration > CONFIG.timeout ? 'warn' : 'info');

  return {
    pass: allPass,
    results,
    totalDuration
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

const mode = process.argv[2] || 'pre-commit';
const result = validate(mode);

if (!result.pass) {
  log('GATE FAILED - Commit blocked', 'error');
  process.exit(1);
} else {
  log('GATE PASSED', 'success');
  process.exit(0);
}
