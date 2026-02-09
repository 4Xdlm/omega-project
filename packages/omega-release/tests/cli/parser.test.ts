/**
 * OMEGA Release — CLI Parser Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { parseArgs, isValidCommand, COMMANDS } from '../../src/cli/parser.js';

describe('parseArgs', () => {
  it('parses command', () => {
    const result = parseArgs(['node', 'script', 'version']);
    expect(result.command).toBe('version');
  });

  it('defaults to help', () => {
    const result = parseArgs(['node', 'script']);
    expect(result.command).toBe('help');
  });

  it('parses positional args', () => {
    const result = parseArgs(['node', 'script', 'version', 'bump', 'minor']);
    expect(result.args).toEqual(['bump', 'minor']);
  });

  it('parses --flag=value', () => {
    const result = parseArgs(['node', 'script', 'build', '--platform=win-x64']);
    expect(result.flags['platform']).toBe('win-x64');
  });

  it('parses --flag value', () => {
    const result = parseArgs(['node', 'script', 'build', '--output', '/tmp']);
    expect(result.flags['output']).toBe('/tmp');
  });

  it('parses boolean flags', () => {
    const result = parseArgs(['node', 'script', 'rollback', '--json']);
    expect(result.flags['json']).toBe(true);
  });

  it('parses short flags', () => {
    const result = parseArgs(['node', 'script', 'selftest', '-v']);
    expect(result.flags['v']).toBe(true);
  });
});

describe('isValidCommand', () => {
  it('accepts valid commands', () => {
    for (const cmd of COMMANDS) {
      expect(isValidCommand(cmd)).toBe(true);
    }
  });

  it('rejects invalid command', () => {
    expect(isValidCommand('invalid')).toBe(false);
  });
});
