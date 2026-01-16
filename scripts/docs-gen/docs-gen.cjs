#!/usr/bin/env node
/**
 * OMEGA Documentation Generator
 * @description Generate documentation from code
 * @version 3.101.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  version: '3.101.0',
  projectRoot: process.cwd(),
  outputDir: 'docs/generated'
};

function log(msg, lvl = 'info') {
  const colors = { info: '\x1b[37m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m', reset: '\x1b[0m' };
  console.log(`${colors[lvl]}[DOCS-GEN] ${msg}${colors.reset}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function extractJSDocHeader(content) {
  const match = content.match(/\/\*\*[\s\S]*?\*\//);
  if (!match) return null;
  const lines = match[0].split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim()).filter(Boolean);
  return lines.filter(l => !l.startsWith('/') && l !== '*').join('\n');
}

function parseScript(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const header = extractJSDocHeader(content);

  const configMatch = content.match(/const CONFIG = \{[\s\S]*?\};/);
  const exportsMatch = content.match(/module\.exports = \{([^}]+)\}/);

  return {
    file: path.basename(filePath),
    header,
    hasConfig: !!configMatch,
    exports: exportsMatch ? exportsMatch[1].split(',').map(e => e.trim()).filter(Boolean) : []
  };
}

function generateScriptDocs(scriptsDir) {
  const docs = [];
  const dirs = fs.readdirSync(scriptsDir, { withFileTypes: true }).filter(d => d.isDirectory());

  for (const dir of dirs) {
    const fullDir = path.join(scriptsDir, dir.name);
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.cjs'));

    for (const file of files) {
      const parsed = parseScript(path.join(fullDir, file));
      docs.push({ category: dir.name, ...parsed });
    }
  }

  return docs;
}

function generateMarkdown(docs) {
  let md = `# OMEGA Scripts Documentation\n\n`;
  md += `Generated: ${new Date().toISOString()}\n`;
  md += `Version: ${CONFIG.version}\n\n`;

  const categories = [...new Set(docs.map(d => d.category))];
  for (const cat of categories) {
    md += `## ${cat}\n\n`;
    const catDocs = docs.filter(d => d.category === cat);
    for (const doc of catDocs) {
      md += `### ${doc.file}\n\n`;
      if (doc.header) md += `${doc.header}\n\n`;
      if (doc.exports.length > 0) {
        md += `**Exports:** ${doc.exports.join(', ')}\n\n`;
      }
    }
  }

  return md;
}

function generate() {
  log('Generating documentation...', 'info');

  const scriptsDir = path.join(CONFIG.projectRoot, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    return { success: false, error: 'Scripts directory not found' };
  }

  const docs = generateScriptDocs(scriptsDir);
  const markdown = generateMarkdown(docs);

  const outputPath = path.join(CONFIG.projectRoot, CONFIG.outputDir, 'SCRIPTS.md');
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, markdown);

  log(`Generated ${docs.length} script docs`, 'success');
  return { success: true, count: docs.length, output: outputPath };
}

if (require.main === module) {
  const result = generate();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { CONFIG, extractJSDocHeader, parseScript, generateScriptDocs, generateMarkdown, generate };
