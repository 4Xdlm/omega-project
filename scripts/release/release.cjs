#!/usr/bin/env node
/**
 * OMEGA Release Validator - Release Readiness Check
 * @version 3.111.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  version: '3.111.0',
  projectRoot: process.cwd(),
  requiredFiles: ['package.json', 'README.md', 'CLAUDE.md', 'nexus/PHASE_CURRENT.md']
};

function checkRequiredFiles() {
  const missing = [];
  for (const file of CONFIG.requiredFiles) {
    if (!fs.existsSync(path.join(CONFIG.projectRoot, file))) {
      missing.push(file);
    }
  }
  return { valid: missing.length === 0, missing };
}

function checkCleanWorktree() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: CONFIG.projectRoot });
    return { clean: status.trim().length === 0 };
  } catch {
    return { clean: false, error: 'Git not available' };
  }
}

function checkTagExists(tag) {
  try {
    execSync(`git rev-parse ${tag}`, { cwd: CONFIG.projectRoot, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getLatestTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8', cwd: CONFIG.projectRoot }).trim();
  } catch {
    return null;
  }
}

function validateRelease() {
  const checks = {
    files: checkRequiredFiles(),
    worktree: checkCleanWorktree(),
    tag: getLatestTag()
  };

  const issues = [];
  if (!checks.files.valid) issues.push(`Missing files: ${checks.files.missing.join(', ')}`);
  if (!checks.worktree.clean) issues.push('Worktree not clean');
  if (!checks.tag) issues.push('No tags found');

  return {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    checks,
    issues,
    releaseReady: issues.length === 0
  };
}

if (require.main === module) {
  const result = validateRelease();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.releaseReady ? 0 : 1);
}

module.exports = { CONFIG, checkRequiredFiles, checkCleanWorktree, checkTagExists, getLatestTag, validateRelease };
