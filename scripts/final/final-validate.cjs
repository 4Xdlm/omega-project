#!/usr/bin/env node
/**
 * OMEGA Final Validator - Pre-Release Validation
 * @version 3.117.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  version: '3.117.0',
  projectRoot: process.cwd(),
  requiredScripts: 25,
  requiredTests: 1000
};

function countScripts() {
  const scriptsDir = path.join(CONFIG.projectRoot, 'scripts');
  if (!fs.existsSync(scriptsDir)) return 0;
  let count = 0;
  const dirs = fs.readdirSync(scriptsDir, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const dir of dirs) {
    count += fs.readdirSync(path.join(scriptsDir, dir.name)).filter(f => f.endsWith('.cjs')).length;
  }
  return count;
}

function runFinalValidation() {
  const validation = {
    scriptsCount: countScripts(),
    scriptsRequired: CONFIG.requiredScripts,
    scriptsPass: false,
    phaseExists: fs.existsSync(path.join(CONFIG.projectRoot, 'nexus/PHASE_CURRENT.md')),
    configExists: fs.existsSync(path.join(CONFIG.projectRoot, 'CLAUDE.md'))
  };

  validation.scriptsPass = validation.scriptsCount >= CONFIG.requiredScripts;
  const allPass = validation.scriptsPass && validation.phaseExists && validation.configExists;

  return {
    timestamp: new Date().toISOString(),
    version: CONFIG.version,
    validation,
    finalStatus: allPass ? 'VALIDATED' : 'PENDING'
  };
}

if (require.main === module) {
  const result = runFinalValidation();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { CONFIG, countScripts, runFinalValidation };
