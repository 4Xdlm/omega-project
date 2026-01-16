#!/usr/bin/env node
/**
 * OMEGA EOL Normalizer - Cross-Platform Line Ending Management
 * @description Normalizes line endings based on .gitattributes rules
 * @version 3.95.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  version: '3.95.0',
  projectRoot: process.cwd(),

  // Files that MUST use LF (Unix)
  lfPatterns: [
    /\.ts$/,
    /\.js$/,
    /\.cjs$/,
    /\.mjs$/,
    /\.json$/,
    /\.md$/,
    /\.yaml$/,
    /\.yml$/,
    /\.sh$/,
    /\.html$/,
    /\.css$/,
    /\.vue$/,
    /\.tsx$/,
    /\.jsx$/
  ],

  // Files that MUST use CRLF (Windows)
  crlfPatterns: [
    /\.ps1$/,
    /\.psm1$/,
    /\.psd1$/,
    /\.bat$/,
    /\.cmd$/
  ],

  // Directories to skip
  skipDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.nyc_output',
    'archives'
  ],

  // Binary extensions (never touch)
  binaryExtensions: [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
    '.zip', '.tar', '.gz', '.7z',
    '.pdf', '.doc', '.docx',
    '.exe', '.dll', '.so'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const colors = { info: '\x1b[37m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
  console.log(`${colors[level]}[${timestamp}] [EOL] ${message}${colors.reset}`);
}

function isBinary(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CONFIG.binaryExtensions.includes(ext);
}

function shouldUseLF(filePath) {
  return CONFIG.lfPatterns.some(pattern => pattern.test(filePath));
}

function shouldUseCRLF(filePath) {
  return CONFIG.crlfPatterns.some(pattern => pattern.test(filePath));
}

function detectEOL(content) {
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfCount = (content.match(/(?<!\r)\n/g) || []).length;
  const crCount = (content.match(/\r(?!\n)/g) || []).length;

  return {
    crlf: crlfCount,
    lf: lfCount,
    cr: crCount,
    mixed: (crlfCount > 0 && lfCount > 0) || crCount > 0,
    dominant: crlfCount > lfCount ? 'CRLF' : 'LF'
  };
}

function normalizeToLF(content) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function normalizeToCRLF(content) {
  // First normalize to LF, then convert to CRLF
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function scanDirectory(dir, results = { files: [], issues: [] }) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(CONFIG.projectRoot, fullPath);

    if (entry.isDirectory()) {
      if (!CONFIG.skipDirs.includes(entry.name)) {
        scanDirectory(fullPath, results);
      }
    } else if (entry.isFile()) {
      if (!isBinary(fullPath)) {
        results.files.push(relativePath);
      }
    }
  }

  return results;
}

function analyzeFile(filePath) {
  const fullPath = path.join(CONFIG.projectRoot, filePath);

  if (!fs.existsSync(fullPath)) {
    return { file: filePath, error: 'File not found' };
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const eol = detectEOL(content);
  const expectedEOL = shouldUseCRLF(filePath) ? 'CRLF' : 'LF';

  const hasIssue = eol.mixed ||
    (expectedEOL === 'LF' && eol.crlf > 0) ||
    (expectedEOL === 'CRLF' && eol.lf > 0 && eol.crlf === 0);

  return {
    file: filePath,
    expected: expectedEOL,
    actual: eol,
    hasIssue,
    needsFix: hasIssue
  };
}

function fixFile(filePath, dryRun = false) {
  const fullPath = path.join(CONFIG.projectRoot, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const expectedEOL = shouldUseCRLF(filePath) ? 'CRLF' : 'LF';

  let normalized;
  if (expectedEOL === 'CRLF') {
    normalized = normalizeToCRLF(content);
  } else {
    normalized = normalizeToLF(content);
  }

  if (content === normalized) {
    return { file: filePath, changed: false };
  }

  if (!dryRun) {
    fs.writeFileSync(fullPath, normalized, 'utf8');
  }

  return {
    file: filePath,
    changed: true,
    expectedEOL,
    dryRun
  };
}

function runAnalysis() {
  log(`EOL Analyzer v${CONFIG.version}`, 'info');
  log('═══════════════════════════════════════════════════════════════', 'info');

  const scan = scanDirectory(CONFIG.projectRoot);
  const results = {
    total: scan.files.length,
    analyzed: 0,
    issues: [],
    clean: []
  };

  for (const file of scan.files) {
    const analysis = analyzeFile(file);
    results.analyzed++;

    if (analysis.hasIssue) {
      results.issues.push(analysis);
    } else {
      results.clean.push(file);
    }
  }

  log('═══════════════════════════════════════════════════════════════', 'info');
  log(`Analyzed: ${results.analyzed} files`, 'info');
  log(`Clean: ${results.clean.length}`, 'success');
  log(`Issues: ${results.issues.length}`, results.issues.length > 0 ? 'warn' : 'success');

  return results;
}

function runNormalization(options = {}) {
  const { dryRun = false } = options;

  log(`EOL Normalizer v${CONFIG.version}${dryRun ? ' [DRY-RUN]' : ''}`, 'info');
  log('═══════════════════════════════════════════════════════════════', 'info');

  const analysis = runAnalysis();
  const fixed = [];

  for (const issue of analysis.issues) {
    const result = fixFile(issue.file, dryRun);
    if (result.changed) {
      fixed.push(result);
      log(`${dryRun ? '[DRY-RUN] Would fix' : 'Fixed'}: ${issue.file} -> ${result.expectedEOL}`, 'success');
    }
  }

  log('═══════════════════════════════════════════════════════════════', 'info');
  log(`Fixed: ${fixed.length} files`, 'success');

  return { analysis, fixed };
}

function checkCompliance() {
  const analysis = runAnalysis();
  const compliant = analysis.issues.length === 0;

  if (!compliant) {
    log('NON-COMPLIANT: Files with EOL issues found', 'error');
    for (const issue of analysis.issues) {
      log(`  - ${issue.file} (expected: ${issue.expected}, found: ${issue.actual.dominant})`, 'warn');
    }
  } else {
    log('COMPLIANT: All files have correct EOL', 'success');
  }

  return { compliant, issues: analysis.issues };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  const dryRun = args.includes('--dry-run');

  switch (command) {
    case 'analyze':
      runAnalysis();
      break;
    case 'fix':
      runNormalization({ dryRun });
      break;
    case 'check':
    default:
      const result = checkCompliance();
      process.exit(result.compliant ? 0 : 1);
  }
}

module.exports = {
  CONFIG,
  detectEOL,
  normalizeToLF,
  normalizeToCRLF,
  analyzeFile,
  fixFile,
  runAnalysis,
  runNormalization,
  checkCompliance,
  shouldUseLF,
  shouldUseCRLF
};
