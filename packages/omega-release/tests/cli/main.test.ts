/**
 * OMEGA Release — CLI Main Tests
 * Phase G.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeCLI, EXIT_OK, EXIT_ERROR, EXIT_USAGE } from '../../src/cli/main.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('executeCLI', () => {
  const testDir = join(tmpdir(), 'omega-cli-main-test');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'VERSION'), '1.0.0');
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('help command', () => {
    const { output, exitCode } = executeCLI(['node', 'script', 'help'], testDir);
    expect(exitCode).toBe(EXIT_OK);
    expect(output).toContain('OMEGA Release CLI');
  });

  it('unknown command returns usage error', () => {
    const { exitCode } = executeCLI(['node', 'script', 'unknown'], testDir);
    expect(exitCode).toBe(EXIT_USAGE);
  });

  it('version show', () => {
    const { output, exitCode } = executeCLI(['node', 'script', 'version', 'show'], testDir);
    expect(exitCode).toBe(EXIT_OK);
    expect(output).toBe('1.0.0');
  });

  it('version bump patch', () => {
    const { output, exitCode } = executeCLI(['node', 'script', 'version', 'bump', 'patch'], testDir);
    expect(exitCode).toBe(EXIT_OK);
    expect(output).toContain('1.0.1');
  });

  it('version validate', () => {
    const { output, exitCode } = executeCLI(['node', 'script', 'version', 'validate'], testDir);
    expect(exitCode).toBe(EXIT_OK);
    expect(output).toContain('VALID');
  });

  it('selftest runs', () => {
    const { output, exitCode } = executeCLI(['node', 'script', 'selftest'], testDir);
    expect(exitCode).toBe(EXIT_OK);
    expect(output).toContain('Self-Test');
  });

  it('selftest --format=json', () => {
    const { output, exitCode } = executeCLI(['node', 'script', 'selftest', '--format=json'], testDir);
    expect(exitCode).toBe(EXIT_OK);
    const parsed = JSON.parse(output);
    expect(parsed.version).toBe('1.0.0');
  });

  it('selftest --format=summary', () => {
    const { output, exitCode } = executeCLI(['node', 'script', 'selftest', '--format=summary'], testDir);
    expect(exitCode).toBe(EXIT_OK);
    expect(output).toContain('Self-test');
  });

  it('rollback without target returns error', () => {
    const { output, exitCode } = executeCLI(['node', 'script', 'rollback'], testDir);
    expect(exitCode).toBe(EXIT_ERROR);
    expect(output).toContain('ERROR');
  });

  it('rollback with target', () => {
    const { output, exitCode } = executeCLI(['node', 'script', 'rollback', '0.9.0'], testDir);
    expect(exitCode).toBe(EXIT_OK);
    expect(output).toContain('Rollback Plan');
  });

  it('exit codes are correct constants', () => {
    expect(EXIT_OK).toBe(0);
    expect(EXIT_ERROR).toBe(1);
    expect(EXIT_USAGE).toBe(2);
  });
});
