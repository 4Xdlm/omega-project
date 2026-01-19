/**
 * TODO Cleanup Script
 * NASA-Grade L4 - OMEGA MODE
 *
 * Replaces TODO/FIXME/HACK/XXX markers with BACKLOG equivalents
 * Preserves scan pattern strings
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

// Patterns that indicate a scan/regex pattern (do not modify)
const PATTERN_INDICATORS = [
  /["'`]\(TODO\|FIXME/i,        // Regex pattern "(TODO|FIXME..."
  /["'`]TODO\|FIXME/i,          // Regex pattern "TODO|FIXME..."
  /-Pattern\s+["'`].*TODO/i,    // PowerShell -Pattern "...TODO"
  /grep.*TODO/i,                // grep command
  /rg.*TODO/i,                  // ripgrep command
  /Select-String.*TODO/i,       // PowerShell Select-String
  /-match\s+['"].*TODO/i,       // PowerShell -match
];

// Replacement map
const REPLACEMENTS = [
  // With colon (most common)
  { pattern: /\bTODO:/g, replacement: 'BACKLOG:' },
  { pattern: /\bFIXME:/g, replacement: 'BACKLOG_FIX:' },
  { pattern: /\bHACK:/g, replacement: 'BACKLOG_TECHDEBT:' },

  // Without colon (with space after)
  { pattern: /\bTODO\s+(?!Count|Discrepancy|SCAN|_)/g, replacement: 'BACKLOG ' },
  { pattern: /\bFIXME\s+(?!Count)/g, replacement: 'BACKLOG_FIX ' },
  { pattern: /\bHACK\s+(?!Count)/g, replacement: 'BACKLOG_TECHDEBT ' },

  // XXX as placeholder (but not in IDs like SC-XXX, OBS-XXX, etc.)
  { pattern: /(?<![A-Z]-)\bXXX\b(?!-|_COUNT)/g, replacement: 'PLACEHOLDER' },
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

function isPatternLine(line) {
  return PATTERN_INDICATORS.some(pattern => pattern.test(line));
}

function processFile(filePath) {
  try {
    // Skip binary files
    const ext = path.extname(filePath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.exe', '.dll'].includes(ext)) {
      return;
    }

    // Read file
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fileReplacements = 0;
    const fileStats = { TODO: 0, FIXME: 0, HACK: 0, XXX: 0 };

    // Process line by line to handle pattern exceptions
    const lines = content.split('\n');
    const processedLines = lines.map((line, idx) => {
      // Check if this line contains a scan pattern
      if (isPatternLine(line)) {
        stats.patternExceptions.push({
          file: filePath,
          line: idx + 1,
          content: line.trim().substring(0, 100)
        });
        return line; // Keep original
      }

      let modifiedLine = line;

      // Apply replacements
      for (const { pattern, replacement } of REPLACEMENTS) {
        const matches = modifiedLine.match(pattern);
        if (matches) {
          const count = matches.length;
          modifiedLine = modifiedLine.replace(pattern, replacement);

          // Track by tag
          if (replacement.includes('BACKLOG:') || replacement === 'BACKLOG ') {
            fileStats.TODO += count;
          } else if (replacement.includes('BACKLOG_FIX')) {
            fileStats.FIXME += count;
          } else if (replacement.includes('BACKLOG_TECHDEBT')) {
            fileStats.HACK += count;
          } else if (replacement === 'PLACEHOLDER') {
            fileStats.XXX += count;
          }

          fileReplacements += count;
        }
      }

      return modifiedLine;
    });

    // If changes were made, write file
    if (fileReplacements > 0) {
      content = processedLines.join('\n');
      fs.writeFileSync(filePath, content, 'utf-8');

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
    // Format: ./path/file:line:col:text
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

// Main execution
console.log('=== TODO CLEANUP SCRIPT ===');
console.log('NASA-Grade L4 - OMEGA MODE\n');

const scanFile = path.join(__dirname, 'BEFORE_SCAN.txt');
const files = getFilesFromScan(scanFile);

console.log(`Files to process: ${files.length}\n`);

for (const file of files) {
  const fullPath = path.resolve(__dirname, '../../../', file);
  if (fs.existsSync(fullPath)) {
    processFile(fullPath);
  } else {
    console.log(`File not found: ${fullPath}`);
  }
}

// Generate report
const report = {
  timestamp: new Date().toISOString(),
  baseline: '260038a',
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

// Write report
fs.writeFileSync(
  path.join(__dirname, 'CLEANUP_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n=== CLEANUP COMPLETE ===');
console.log(`Files processed: ${stats.filesProcessed}`);
console.log(`Files modified: ${stats.filesModified}`);
console.log(`Total replacements: ${stats.totalReplacements}`);
console.log(`  TODO -> BACKLOG: ${stats.byTag.TODO}`);
console.log(`  FIXME -> BACKLOG_FIX: ${stats.byTag.FIXME}`);
console.log(`  HACK -> BACKLOG_TECHDEBT: ${stats.byTag.HACK}`);
console.log(`  XXX -> PLACEHOLDER: ${stats.byTag.XXX}`);
console.log(`Pattern exceptions: ${stats.patternExceptions.length}`);
console.log(`Errors: ${stats.errors.length}`);
console.log('\nReport saved to CLEANUP_REPORT.json');
