/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — CLI GENIUS SCORER TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = 'npx tsx cli/genius-score.ts';
const CWD = process.cwd();

function run(args: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`${CLI} ${args}`, {
      cwd: CWD,
      encoding: 'utf-8',
      timeout: 30000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || err.stderr || '', exitCode: err.status ?? 1 };
  }
}

let tmpDir: string;
let literaryFile: string;
let emptyFile: string;
let unicodeFile: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'genius-cli-'));

  literaryFile = join(tmpDir, 'literary.txt');
  writeFileSync(literaryFile, 
    'Le crépuscule mordoré enveloppait les collines lointaines. ' +
    'Les peupliers frissonnaient sous la brise marine parfumée. ' +
    'Un chien aboyait dans la ruelle déserte du vieux quartier. ' +
    'La rivière charriait des branches mortes entre les rochers moussus.'
  );

  emptyFile = join(tmpDir, 'empty.txt');
  writeFileSync(emptyFile, '');

  unicodeFile = join(tmpDir, 'unicode.txt');
  writeFileSync(unicodeFile,
    "L\u2019\u00EEle \u00E9tait d\u00E9j\u00E0 plong\u00E9e dans l\u2019ombre. " +
    "Les \u0153illets embaumaient le jardin clos. Le c\u0153ur battait \u00E0 tout rompre."
  );
});

describe('CLI — genius-score', () => {

  describe('Smoke', () => {

    it('scores a literary text and outputs markdown', () => {
      const { stdout, exitCode } = run(`"${literaryFile}"`);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('GENIUS Score');
      expect(stdout).toContain('Axis Breakdown');
      expect(stdout).toContain('Density');
      expect(stdout).toContain('Surprise');
      expect(stdout).toContain('Inevitability');
      expect(stdout).toContain('Resonance');
      expect(stdout).toContain('Voice');
    });

    it('GENIUS score is between 0 and 100', () => {
      const { stdout } = run(`"${literaryFile}"`);
      const match = stdout.match(/\*\*(\d+)\/100\*\*/);
      expect(match).toBeTruthy();
      const score = parseInt(match![1], 10);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('JSON output', () => {

    it('outputs valid JSON with --json', () => {
      const { stdout, exitCode } = run(`"${literaryFile}" --json`);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.schema).toBe('GENIUS_SCHEMA_V1');
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.result.geniusScore).toBeGreaterThanOrEqual(0);
      expect(parsed.result.axes.density).toBeDefined();
    });

    it('includes hashes with --json --hash', () => {
      const { stdout } = run(`"${literaryFile}" --json --hash`);
      const parsed = JSON.parse(stdout);
      expect(parsed.hashes).toBeDefined();
      expect(parsed.hashes.textSha256).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Hashes', () => {

    it('includes SHA-256 with --hash', () => {
      const { stdout } = run(`"${literaryFile}" --hash`);
      expect(stdout).toContain('SHA-256');
      expect(stdout).toMatch(/[a-f0-9]{64}/);
    });
  });

  describe('Determinism', () => {

    it('same file → same GENIUS score', () => {
      const { stdout: s1 } = run(`"${literaryFile}" --json`);
      const { stdout: s2 } = run(`"${literaryFile}" --json`);
      const r1 = JSON.parse(s1);
      const r2 = JSON.parse(s2);
      expect(r1.result.geniusScore).toBe(r2.result.geniusScore);
    });

    it('same file → same hash', () => {
      const { stdout: s1 } = run(`"${literaryFile}" --json --hash`);
      const { stdout: s2 } = run(`"${literaryFile}" --json --hash`);
      const r1 = JSON.parse(s1);
      const r2 = JSON.parse(s2);
      expect(r1.hashes.textSha256).toBe(r2.hashes.textSha256);
    });
  });

  describe('Unicode', () => {

    it('handles French special characters', () => {
      const { stdout, exitCode } = run(`"${unicodeFile}" --json`);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.result.geniusScore).toBeGreaterThanOrEqual(0);
      expect(parsed.result.geniusScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Strict mode', () => {

    it('empty file → exit code 2 with --strict', () => {
      const { exitCode } = run(`"${emptyFile}" --strict`);
      expect(exitCode).toBe(2);
    });

    it('non-existent file → exit code 1', () => {
      const { exitCode } = run(`"/tmp/nonexistent-omega-file.txt"`);
      expect(exitCode).toBe(1);
    });
  });

  describe('Help', () => {

    it('--help shows usage info', () => {
      const { stdout, exitCode } = run('--help');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage');
      expect(stdout).toContain('--json');
      expect(stdout).toContain('--hash');
    });
  });
});
