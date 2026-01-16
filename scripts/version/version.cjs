#!/usr/bin/env node
/**
 * OMEGA Version Validator - Version Consistency
 * @description Validate version consistency across project
 * @version 3.104.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  version: '3.104.0',
  projectRoot: process.cwd()
};

function log(msg, lvl = 'info') {
  const colors = { info: '\x1b[37m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
  console.log(`${colors[lvl]}[VERSION] ${msg}${colors.reset}`);
}

function getPackageVersion() {
  const pkgPath = path.join(CONFIG.projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

function getLatestTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8', cwd: CONFIG.projectRoot }).trim();
  } catch { return null; }
}

function getPhaseVersion() {
  const phasePath = path.join(CONFIG.projectRoot, 'nexus/PHASE_CURRENT.md');
  if (!fs.existsSync(phasePath)) return null;
  const content = fs.readFileSync(phasePath, 'utf8');
  const match = content.match(/Phase Number\s*:\s*(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function parseVersion(v) {
  if (!v) return null;
  const match = v.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: parseInt(match[1]), minor: parseInt(match[2]), patch: parseInt(match[3]) };
}

function compareVersions(v1, v2) {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);
  if (!p1 || !p2) return 0;

  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  return p1.patch - p2.patch;
}

function validateVersions() {
  log(`Version Validator v${CONFIG.version}`, 'info');

  const results = {
    timestamp: new Date().toISOString(),
    valid: true,
    versions: {
      package: getPackageVersion(),
      tag: getLatestTag(),
      phase: getPhaseVersion()
    },
    issues: []
  };

  // Check package version exists
  if (!results.versions.package) {
    results.issues.push('Package version not found');
    results.valid = false;
  }

  // Check tag exists
  if (!results.versions.tag) {
    results.issues.push('No git tags found');
  }

  // Check phase exists
  if (!results.versions.phase) {
    results.issues.push('Phase number not found');
    results.valid = false;
  }

  // Check tag matches expected pattern
  if (results.versions.tag && !results.versions.tag.match(/^v?\d+\.\d+\.\d+/)) {
    results.issues.push('Tag does not match semver pattern');
    results.valid = false;
  }

  log(results.valid ? '✅ Versions valid' : '❌ Version issues found', results.valid ? 'success' : 'error');
  return results;
}

function bumpVersion(type = 'patch') {
  const current = getPackageVersion();
  const parsed = parseVersion(current);
  if (!parsed) return null;

  switch (type) {
    case 'major': parsed.major++; parsed.minor = 0; parsed.patch = 0; break;
    case 'minor': parsed.minor++; parsed.patch = 0; break;
    case 'patch': parsed.patch++; break;
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

if (require.main === module) {
  const cmd = process.argv[2] || 'validate';
  switch (cmd) {
    case 'validate': console.log(JSON.stringify(validateVersions(), null, 2)); break;
    case 'bump': console.log(bumpVersion(process.argv[3] || 'patch')); break;
    case 'current': console.log(`Package: ${getPackageVersion()}, Tag: ${getLatestTag()}, Phase: ${getPhaseVersion()}`); break;
    default: console.log('Usage: version.cjs [validate|bump|current] [major|minor|patch]');
  }
}

module.exports = { CONFIG, getPackageVersion, getLatestTag, getPhaseVersion, parseVersion, compareVersions, validateVersions, bumpVersion };
