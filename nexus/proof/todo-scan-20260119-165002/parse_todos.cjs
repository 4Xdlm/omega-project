const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rawFile = process.argv[2] || 'raw_scan.txt';
const packDir = path.dirname(rawFile);

// Read raw scan
const lines = fs.readFileSync(rawFile, 'utf-8').split('\n').filter(l => l.trim());

// Parse each line: path:line:col:text
const results = [];
const fileHashes = new Map();

for (const line of lines) {
  // Format: ./path/file.ext:LINE:COL:text
  const match = line.match(/^\.?[\\\/]?(.+?):(\d+):(\d+):(.*)$/);
  if (!match) continue;

  let [, filePath, lineNum, col, text] = match;
  filePath = filePath.split('\\').join('/');

  // Determine tag
  let tag = 'UNKNOWN';
  if (/\bTODO\b/i.test(text)) tag = 'TODO';
  else if (/\bFIXME\b/i.test(text)) tag = 'FIXME';
  else if (/\bHACK\b/i.test(text)) tag = 'HACK';
  else if (/\bXXX\b/.test(text)) tag = 'XXX';

  // Get file hash (cache)
  if (!fileHashes.has(filePath)) {
    try {
      const content = fs.readFileSync(filePath);
      fileHashes.set(filePath, crypto.createHash('sha256').update(content).digest('hex'));
    } catch {
      fileHashes.set(filePath, 'FILE_NOT_FOUND');
    }
  }

  results.push({
    path: filePath,
    line: parseInt(lineNum),
    column: parseInt(col),
    tag,
    text: text.trim().substring(0, 200),
    file_sha256: fileHashes.get(filePath)
  });
}

// Sort: path ASC, line ASC
results.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);

// Stats
const stats = {
  total: results.length,
  files: new Set(results.map(r => r.path)).size,
  by_tag: {},
  by_extension: {},
  by_zone: {},
  top_files: []
};

// Count by tag
for (const r of results) {
  stats.by_tag[r.tag] = (stats.by_tag[r.tag] || 0) + 1;

  const ext = path.extname(r.path) || 'no-ext';
  stats.by_extension[ext] = (stats.by_extension[ext] || 0) + 1;

  const zone = r.path.split('/')[0] || 'root';
  stats.by_zone[zone] = (stats.by_zone[zone] || 0) + 1;
}

// Top files
const fileCounts = {};
for (const r of results) {
  fileCounts[r.path] = (fileCounts[r.path] || 0) + 1;
}
stats.top_files = Object.entries(fileCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([file, count]) => ({ file, count }));

// Write outputs
fs.writeFileSync(path.join(packDir, 'TODO_SCAN_RESULTS.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(packDir, 'TODO_SCAN_SUMMARY.json'), JSON.stringify(stats, null, 2));

// CSV
const csv = ['path,line,column,tag,text'];
for (const r of results) {
  csv.push('"' + r.path + '",' + r.line + ',' + r.column + ',"' + r.tag + '","' + r.text.replace(/"/g, '""') + '"');
}
fs.writeFileSync(path.join(packDir, 'TODO_SCAN_FILES.csv'), csv.join('\n'));

console.log(JSON.stringify(stats, null, 2));
