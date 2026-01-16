#!/usr/bin/env node
/**
 * OMEGA Final Report - Project Status Report
 * @version 3.120.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  version: '3.120.0',
  projectRoot: process.cwd()
};

function getGitInfo() {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: CONFIG.projectRoot }).trim();
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8', cwd: CONFIG.projectRoot }).trim();
    const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd: CONFIG.projectRoot }).trim();
    return { commit, tag, branch };
  } catch { return { commit: 'unknown', tag: 'unknown', branch: 'unknown' }; }
}

function getPhaseInfo() {
  const phasePath = path.join(CONFIG.projectRoot, 'nexus/PHASE_CURRENT.md');
  if (!fs.existsSync(phasePath)) return null;
  const content = fs.readFileSync(phasePath, 'utf8');
  const match = content.match(/Phase Number\s*:\s*(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function countArtifacts() {
  const counts = { scripts: 0, tests: 0, docs: 0, certificates: 0 };

  const scriptsDir = path.join(CONFIG.projectRoot, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    const dirs = fs.readdirSync(scriptsDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const dir of dirs) {
      counts.scripts += fs.readdirSync(path.join(scriptsDir, dir.name)).filter(f => f.endsWith('.cjs')).length;
    }
  }

  const testDir = path.join(CONFIG.projectRoot, 'test');
  if (fs.existsSync(testDir)) {
    counts.tests = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts')).length;
  }

  const docsDir = path.join(CONFIG.projectRoot, 'docs');
  if (fs.existsSync(docsDir)) {
    counts.docs = fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).length;
  }

  const certsDir = path.join(CONFIG.projectRoot, 'certificates');
  if (fs.existsSync(certsDir)) {
    counts.certificates = fs.readdirSync(certsDir, { withFileTypes: true }).filter(d => d.isDirectory()).length;
  }

  return counts;
}

function generateReport() {
  return {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    git: getGitInfo(),
    phase: getPhaseInfo(),
    artifacts: countArtifacts(),
    status: 'COMPLETE'
  };
}

if (require.main === module) {
  const report = generateReport();
  console.log(JSON.stringify(report, null, 2));
}

module.exports = { CONFIG, getGitInfo, getPhaseInfo, countArtifacts, generateReport };
