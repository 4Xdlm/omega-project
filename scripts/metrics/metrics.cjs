#!/usr/bin/env node
/**
 * OMEGA Metrics Collection - Project Metrics
 * @description Collect and report project metrics
 * @version 3.100.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  version: '3.100.0',
  projectRoot: process.cwd(),
  metricsFile: 'nexus/metrics/METRICS_LATEST.json'
};

function log(msg, lvl = 'info') {
  const colors = { info: '\x1b[37m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
  console.log(`${colors[lvl]}[METRICS] ${msg}${colors.reset}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function countFiles(pattern) {
  try {
    const result = execSync(`git ls-files "${pattern}" | wc -l`, { encoding: 'utf8', cwd: CONFIG.projectRoot });
    return parseInt(result.trim()) || 0;
  } catch { return 0; }
}

function countLines(pattern) {
  try {
    const files = execSync(`git ls-files "${pattern}"`, { encoding: 'utf8', cwd: CONFIG.projectRoot }).trim().split('\n').filter(Boolean);
    let total = 0;
    for (const f of files) {
      const fullPath = path.join(CONFIG.projectRoot, f);
      if (fs.existsSync(fullPath)) {
        total += fs.readFileSync(fullPath, 'utf8').split('\n').length;
      }
    }
    return total;
  } catch { return 0; }
}

function getGitStats() {
  const { execSync } = require('node:child_process');

  function sh(cmd, cwd) {
    return execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  }

  let root = null;
  try {
    // __dirname is stable even under vitest
    root = sh('git rev-parse --show-toplevel', __dirname);
  } catch (e) {
    return { commits: 0, tags: 0, root: null };
  }

  let commits = 0;
  let tags = 0;

  try {
    const out = sh('git rev-list --count HEAD', root);
    const n = Number.parseInt(out, 10);
    commits = Number.isFinite(n) ? n : 0;
  } catch (e) {}

  try {
    const out = sh('git tag -l', root);
    tags = out ? out.split(/\r?\n/).filter(Boolean).length : 0;
  } catch (e) {}

  return { commits, tags, root };
}

function collectMetrics() {
  log('Collecting metrics...', 'info');

  const metrics = {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    files: {
      typescript: countFiles('*.ts'),
      javascript: countFiles('*.js') + countFiles('*.cjs'),
      markdown: countFiles('*.md'),
      json: countFiles('*.json'),
      yaml: countFiles('*.yml') + countFiles('*.yaml')
    },
    lines: {
      typescript: countLines('*.ts'),
      javascript: countLines('*.js') + countLines('*.cjs')
    },
    git: getGitStats(),
    directories: {
      scripts: fs.existsSync(path.join(CONFIG.projectRoot, 'scripts')) ? fs.readdirSync(path.join(CONFIG.projectRoot, 'scripts')).length : 0,
      tests: fs.existsSync(path.join(CONFIG.projectRoot, 'test')) ? fs.readdirSync(path.join(CONFIG.projectRoot, 'test')).length : 0,
      docs: fs.existsSync(path.join(CONFIG.projectRoot, 'docs')) ? fs.readdirSync(path.join(CONFIG.projectRoot, 'docs')).length : 0
    }
  };

  const metricsPath = path.join(CONFIG.projectRoot, CONFIG.metricsFile);
  ensureDir(path.dirname(metricsPath));
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

  log(`Metrics saved to ${CONFIG.metricsFile}`, 'success');
  return metrics;
}

function loadMetrics() {
  const metricsPath = path.join(CONFIG.projectRoot, CONFIG.metricsFile);
  if (!fs.existsSync(metricsPath)) return null;
  return JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
}

if (require.main === module) {
  const cmd = process.argv[2] || 'collect';
  switch (cmd) {
    case 'collect': console.log(JSON.stringify(collectMetrics(), null, 2)); break;
    case 'show': console.log(JSON.stringify(loadMetrics(), null, 2)); break;
    default: console.log('Usage: metrics.cjs [collect|show]');
  }
}

module.exports = { CONFIG, collectMetrics, loadMetrics, countFiles, countLines, getGitStats };
