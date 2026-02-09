/**
 * OMEGA Governance — Replay Comparator Tests
 * Phase F — Byte-identical comparison
 */

import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir } from '../../fixtures/helpers.js';
import { compareDirectories, hashFileNormalized } from '../../../src/ci/replay/comparator.js';

describe('Replay Comparator', () => {
  it('identical directories produce no differences', () => {
    const dirA = createTempDir('comp-a');
    const dirB = createTempDir('comp-b');

    writeFileSync(join(dirA, 'file.txt'), 'hello world', 'utf-8');
    writeFileSync(join(dirB, 'file.txt'), 'hello world', 'utf-8');

    const diffs = compareDirectories(dirA, dirB);
    expect(diffs).toHaveLength(0);
  });

  it('detects file content difference', () => {
    const dirA = createTempDir('comp-diff-a');
    const dirB = createTempDir('comp-diff-b');

    writeFileSync(join(dirA, 'file.txt'), 'hello', 'utf-8');
    writeFileSync(join(dirB, 'file.txt'), 'world', 'utf-8');

    const diffs = compareDirectories(dirA, dirB);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe('HASH_MISMATCH');
  });

  it('detects missing file in B', () => {
    const dirA = createTempDir('comp-miss-a');
    const dirB = createTempDir('comp-miss-b');

    writeFileSync(join(dirA, 'file.txt'), 'hello', 'utf-8');

    const diffs = compareDirectories(dirA, dirB);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe('MISSING_IN_REPLAY');
  });

  it('detects extra file in B', () => {
    const dirA = createTempDir('comp-extra-a');
    const dirB = createTempDir('comp-extra-b');

    writeFileSync(join(dirB, 'extra.txt'), 'extra', 'utf-8');

    const diffs = compareDirectories(dirA, dirB);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe('MISSING_IN_BASELINE');
  });

  it('handles nested directories', () => {
    const dirA = createTempDir('comp-nested-a');
    const dirB = createTempDir('comp-nested-b');

    mkdirSync(join(dirA, 'sub'), { recursive: true });
    mkdirSync(join(dirB, 'sub'), { recursive: true });
    writeFileSync(join(dirA, 'sub', 'file.txt'), 'content', 'utf-8');
    writeFileSync(join(dirB, 'sub', 'file.txt'), 'content', 'utf-8');

    const diffs = compareDirectories(dirA, dirB);
    expect(diffs).toHaveLength(0);
  });

  it('CRLF normalization makes CRLF and LF identical', () => {
    const dirA = createTempDir('comp-crlf-a');
    const dirB = createTempDir('comp-crlf-b');

    writeFileSync(join(dirA, 'file.txt'), 'hello\r\nworld', 'utf-8');
    writeFileSync(join(dirB, 'file.txt'), 'hello\nworld', 'utf-8');

    const diffs = compareDirectories(dirA, dirB);
    expect(diffs).toHaveLength(0);
  });

  it('handles empty directories', () => {
    const dirA = createTempDir('comp-empty-a');
    const dirB = createTempDir('comp-empty-b');
    const diffs = compareDirectories(dirA, dirB);
    expect(diffs).toHaveLength(0);
  });
});

describe('hashFileNormalized', () => {
  it('produces 64-char hex hash', () => {
    const dir = createTempDir('hash-norm');
    writeFileSync(join(dir, 'file.txt'), 'hello', 'utf-8');
    const hash = hashFileNormalized(join(dir, 'file.txt'));
    expect(hash).toHaveLength(64);
  });

  it('returns empty string for missing file', () => {
    const hash = hashFileNormalized('/nonexistent/path/file.txt');
    expect(hash).toBe('');
  });

  it('normalizes CRLF to LF', () => {
    const dir = createTempDir('hash-crlf');
    writeFileSync(join(dir, 'crlf.txt'), 'hello\r\nworld', 'utf-8');
    writeFileSync(join(dir, 'lf.txt'), 'hello\nworld', 'utf-8');
    expect(hashFileNormalized(join(dir, 'crlf.txt'))).toBe(hashFileNormalized(join(dir, 'lf.txt')));
  });
});
