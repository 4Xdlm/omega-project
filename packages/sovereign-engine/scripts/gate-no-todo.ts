#!/usr/bin/env node
/**
 * OMEGA Sovereign — Gate: No TODO
 * Sprint 3.3 — R13-TODO-00
 *
 * Vérifie l'absence de TODO/FIXME/HACK dans les fichiers source.
 * Exit 1 si violations trouvées.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src');

const FORBIDDEN_PATTERNS = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\bHACK\b/i,
  /\bXXX\b/i,
];

function scanDirectory(dir: string): { file: string; line: number; match: string }[] {
  const violations: { file: string; line: number; match: string }[] = [];

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      violations.push(...scanDirectory(fullPath));
    } else if (file.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(path.resolve(__dirname, '..'), fullPath),
              line: index + 1,
              match: line.trim(),
            });
          }
        }
      });
    }
  }

  return violations;
}

const violations = scanDirectory(srcDir);

if (violations.length > 0) {
  console.error('❌ Gate NO-TODO violated [R13-TODO-00]:');
  console.error('');
  violations.forEach(v => {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.match}`);
  });
  console.error('');
  console.error(`Found ${violations.length} TODO/FIXME/HACK markers.`);
  console.error('Remove or resolve them before shipping.');
  process.exit(1);
}

console.log('✅ Gate NO-TODO passed — No TODO/FIXME/HACK found');
process.exit(0);
