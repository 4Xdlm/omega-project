/**
 * TODO Cleanup Script v2
 * NASA-Grade L4 - OMEGA MODE
 *
 * More aggressive cleanup handling edge cases
 */

const fs = require('fs');
const path = require('path');

// Configuration
const EXCLUDED_PATHS = [
  'nexus/proof',
  'nexus\\proof',
  'packages/genome',
  'packages\\genome',
  'packages/mycelium',
  'packages\\mycelium',
  'OMEGA_SENTINEL_SUPREME/sentinel',
  'OMEGA_SENTINEL_SUPREME\\sentinel',
  'sprint28_5',
  'node_modules',
  '.git'
];

// Patterns that indicate a scan/regex pattern (do not modify the line)
const PATTERN_LINE_SKIP = [
  /["'`]\(?TODO\|FIXME/i,       // Regex "(TODO|FIXME..." or "TODO|FIXME"
  /["'`]TODO\|FIXME/i,
  /["'`]\(TODO\|/i,
  /-Pattern\s+["'`].*\bTODO\b/i,    // PowerShell -Pattern "...TODO"
  /grep\s.*\bTODO\b/i,              // grep command
  /rg\s.*\bTODO\b/i,                // ripgrep command
  /Select-String.*\bTODO\b/i,       // PowerShell Select-String
  /-match\s+['"].*\bTODO\b/i,       // PowerShell -match
  /\$_.Line\s+-match\s+['"]FIXME/i, // PS match check
  /\$_.Line\s+-match\s+['"]HACK/i,
  /\$_.Line\s+-match\s+['"]TODO/i,
  /\.marker\s+-eq\s+["']TODO/i,     // marker comparison
  /\.marker\s+-eq\s+["']FIXME/i,
  /\.marker\s+-eq\s+["']HACK/i,
  /\.marker\s+-eq\s+["']XXX/i,
  /TODO_COUNT|FIXME_COUNT|HACK_COUNT|XXX_COUNT/i,  // Metric names
  /TODOs\s*\|/i,                    // Table headers with "TODOs"
];

// Stats
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  totalReplacements: 0,
  byTag: { TODO: 0, FIXME: 0, HACK: 0, XXX: 0 },
  patternExceptions: [],
  modifiedFiles: [],
  errors: []
};

function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return EXCLUDED_PATHS.some(exc => normalized.includes(exc.replace(/\\/g, '/')));
}

function shouldSkipLine(line) {
  return PATTERN_LINE_SKIP.some(pattern => pattern.test(line));
}

function processLine(line, filePath, lineNum) {
  if (shouldSkipLine(line)) {
    stats.patternExceptions.push({
      file: filePath,
      line: lineNum,
      content: line.trim().substring(0, 100)
    });
    return { line, replaced: 0, tags: {} };
  }

  let modifiedLine = line;
  let replaced = 0;
  const tags = { TODO: 0, FIXME: 0, HACK: 0, XXX: 0 };

  // TODO with colon
  if (/\bTODO:/.test(modifiedLine)) {
    const count = (modifiedLine.match(/\bTODO:/g) || []).length;
    modifiedLine = modifiedLine.replace(/\bTODO:/g, 'BACKLOG:');
    replaced += count;
    tags.TODO += count;
  }

  // TODO with space (not followed by special words)
  if (/\bTODO\s+(?!Count|Discrepancy|SCAN|_|markers|\|)/.test(modifiedLine)) {
    const count = (modifiedLine.match(/\bTODO\s+(?!Count|Discrepancy|SCAN|_|markers|\|)/g) || []).length;
    modifiedLine = modifiedLine.replace(/\bTODO\s+(?!Count|Discrepancy|SCAN|_|markers|\|)/g, 'BACKLOG ');
    replaced += count;
    tags.TODO += count;
  }

  // TODO/ -> BACKLOG/
  if (/\bTODO\//.test(modifiedLine)) {
    const count = (modifiedLine.match(/\bTODO\//g) || []).length;
    modifiedLine = modifiedLine.replace(/\bTODO\//g, 'BACKLOG/');
    replaced += count;
    tags.TODO += count;
  }

  // FIXME with colon
  if (/\bFIXME:/.test(modifiedLine)) {
    const count = (modifiedLine.match(/\bFIXME:/g) || []).length;
    modifiedLine = modifiedLine.replace(/\bFIXME:/g, 'BACKLOG_FIX:');
    replaced += count;
    tags.FIXME += count;
  }

  // FIXME with space
  if (/\bFIXME\s+(?!Count|\|)/.test(modifiedLine)) {
    const count = (modifiedLine.match(/\bFIXME\s+(?!Count|\|)/g) || []).length;
    modifiedLine = modifiedLine.replace(/\bFIXME\s+(?!Count|\|)/g, 'BACKLOG_FIX ');
    replaced += count;
    tags.FIXME += count;
  }

  // /FIXME -> /BACKLOG_FIX
  if (/\/FIXME\b/.test(modifiedLine)) {
    const count = (modifiedLine.match(/\/FIXME\b/g) || []).length;
    modifiedLine = modifiedLine.replace(/\/FIXME\b/g, '/BACKLOG_FIX');
    replaced += count;
    tags.FIXME += count;
  }

  // HACK with colon (but not HACKED, HACKER)
  if (/\bHACK:/.test(modifiedLine) && !/\bHACKE[DR]/.test(modifiedLine)) {
    const count = (modifiedLine.match(/\bHACK:/g) || []).length;
    modifiedLine = modifiedLine.replace(/\bHACK:/g, 'BACKLOG_TECHDEBT:');
    replaced += count;
    tags.HACK += count;
  }

  // HACK with space (but not HACKED, HACKER)
  if (/\bHACK\s+(?!Count|\|)/.test(modifiedLine) && !/\bHACKE[DR]/.test(modifiedLine)) {
    const count = (modifiedLine.match(/\bHACK\s+(?!Count|\|)/g) || []).length;
    modifiedLine = modifiedLine.replace(/\bHACK\s+(?!Count|\|)/g, 'BACKLOG_TECHDEBT ');
    replaced += count;
    tags.HACK += count;
  }

  // XXX standalone (not in IDs like ABC-XXX, XXXX, etc.)
  // Match XXX that is NOT preceded by - or followed by - or more X
  if (/(?<![A-Z\d]-)\bXXX\b(?!X|-)/.test(modifiedLine)) {
    // But preserve escape sequences like \uXXXX
    if (!/\\u[0-9A-Fa-f]*XXX/.test(modifiedLine)) {
      const matches = modifiedLine.match(/(?<![A-Z\d]-)\bXXX\b(?!X|-)/g) || [];
      const count = matches.length;
      if (count > 0) {
        modifiedLine = modifiedLine.replace(/(?<![A-Z\d]-)\bXXX\b(?!X|-)/g, 'PLACEHOLDER');
        replaced += count;
        tags.XXX += count;
      }
    }
  }

  return { line: modifiedLine, replaced, tags };
}

function processFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.exe', '.dll'].includes(ext)) {
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let fileReplacements = 0;
    const fileStats = { TODO: 0, FIXME: 0, HACK: 0, XXX: 0 };

    const processedLines = lines.map((line, idx) => {
      const result = processLine(line, filePath, idx + 1);
      fileReplacements += result.replaced;
      fileStats.TODO += result.tags.TODO;
      fileStats.FIXME += result.tags.FIXME;
      fileStats.HACK += result.tags.HACK;
      fileStats.XXX += result.tags.XXX;
      return result.line;
    });

    if (fileReplacements > 0) {
      fs.writeFileSync(filePath, processedLines.join('\n'), 'utf-8');
      stats.filesModified++;
      stats.totalReplacements += fileReplacements;
      stats.byTag.TODO += fileStats.TODO;
      stats.byTag.FIXME += fileStats.FIXME;
      stats.byTag.HACK += fileStats.HACK;
      stats.byTag.XXX += fileStats.XXX;
      stats.modifiedFiles.push({
        file: filePath,
        replacements: fileReplacements,
        byTag: fileStats
      });
    }

    stats.filesProcessed++;

  } catch (err) {
    stats.errors.push({ file: filePath, error: err.message });
  }
}

function getFilesFromScan(scanFile) {
  const content = fs.readFileSync(scanFile, 'utf-8');
  const files = new Set();

  content.split('\n').forEach(line => {
    if (!line.trim()) return;
    const match = line.match(/^\.?[\\/]?(.+?):\d+:\d+:/);
    if (match) {
      const filePath = match[1].replace(/\\/g, '/');
      if (!isExcluded(filePath)) {
        files.add(filePath);
      }
    }
  });

  return Array.from(files);
}

// Main
console.log('=== TODO CLEANUP SCRIPT v2 ===');
console.log('NASA-Grade L4 - OMEGA MODE\n');

// Use REMAINING file from first pass
const scanFile = path.join(__dirname, 'REMAINING_AFTER_SCRIPT.txt');
const files = getFilesFromScan(scanFile);

console.log(`Files to process: ${files.length}\n`);

for (const file of files) {
  const fullPath = path.resolve(__dirname, '../../../', file);
  if (fs.existsSync(fullPath)) {
    processFile(fullPath);
  }
}

// Save report
const report = {
  timestamp: new Date().toISOString(),
  version: 'v2',
  stats,
  summary: {
    filesProcessed: stats.filesProcessed,
    filesModified: stats.filesModified,
    totalReplacements: stats.totalReplacements,
    byTag: stats.byTag,
    patternExceptions: stats.patternExceptions.length,
    errors: stats.errors.length
  }
};

fs.writeFileSync(
  path.join(__dirname, 'CLEANUP_REPORT_v2.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n=== CLEANUP v2 COMPLETE ===');
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`Files modified: ${stats.filesModified}`);
console.log(`Total replacements: ${stats.totalReplacements}`);
console.log(`  TODO -> BACKLOG: ${stats.byTag.TODO}`);
console.log(`  FIXME -> BACKLOG_FIX: ${stats.byTag.FIXME}`);
console.log(`  HACK -> BACKLOG_TECHDEBT: ${stats.byTag.HACK}`);
console.log(`  XXX -> PLACEHOLDER: ${stats.byTag.XXX}`);
console.log(`Pattern exceptions: ${stats.patternExceptions.length}`);
console.log(`Errors: ${stats.errors.length}`);
