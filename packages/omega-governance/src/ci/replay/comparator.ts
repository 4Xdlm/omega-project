/**
 * OMEGA Governance — Replay Comparator
 * Phase F — Byte-identical comparison of two runs
 *
 * INV-F-03: Replay output byte-identical to stored baseline.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import type { ReplayDifference } from './types.js';

/** Compare all files in two directories recursively */
export function compareDirectories(dirA: string, dirB: string): readonly ReplayDifference[] {
  const filesA = collectFiles(dirA, dirA);
  const filesB = collectFiles(dirB, dirB);
  const diffs: ReplayDifference[] = [];

  const setB = new Set(filesB.map((f) => f.relative));

  for (const fileA of filesA) {
    if (!setB.has(fileA.relative)) {
      diffs.push({
        path: fileA.relative,
        type: 'MISSING_IN_REPLAY',
        baseline_hash: fileA.hash,
        message: `File missing in B: ${fileA.relative}`,
      });
      continue;
    }

    const fileB = filesB.find((f) => f.relative === fileA.relative)!;
    if (fileA.hash !== fileB.hash) {
      diffs.push({
        path: fileA.relative,
        type: 'HASH_MISMATCH',
        baseline_hash: fileA.hash,
        replay_hash: fileB.hash,
        message: `Hash mismatch: ${fileA.relative}`,
      });
    }
  }

  for (const fileB of filesB) {
    const inA = filesA.some((f) => f.relative === fileB.relative);
    if (!inA) {
      diffs.push({
        path: fileB.relative,
        type: 'MISSING_IN_BASELINE',
        replay_hash: fileB.hash,
        message: `File only in B: ${fileB.relative}`,
      });
    }
  }

  return diffs;
}

interface FileEntry {
  readonly relative: string;
  readonly hash: string;
}

function collectFiles(dir: string, base: string): FileEntry[] {
  const results: FileEntry[] = [];
  if (!existsSync(dir)) return results;

  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...collectFiles(fullPath, base));
    } else if (item.isFile()) {
      const content = readFileSync(fullPath, 'utf-8');
      const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const hash = createHash('sha256').update(normalized, 'utf-8').digest('hex');
      results.push({ relative: relative(base, fullPath).replace(/\\/g, '/'), hash });
    }
  }

  return results.sort((a, b) => a.relative.localeCompare(b.relative));
}

/** Hash a single file with CRLF normalization */
export function hashFileNormalized(filePath: string): string {
  if (!existsSync(filePath)) return '';
  const content = readFileSync(filePath, 'utf-8');
  return createHash('sha256').update(content.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf-8').digest('hex');
}
