/**
 * @fileoverview Tests for CLI argument parser.
 */

import { describe, it, expect } from 'vitest';
import { parseArgs, generateHelp, generateVersion } from '../../src/index.js';

describe('parseArgs', () => {
  it('should parse certify command', () => {
    const result = parseArgs(['certify']);
    expect(result.command).toBe('certify');
  });

  it('should parse validate command', () => {
    const result = parseArgs(['validate']);
    expect(result.command).toBe('validate');
  });

  it('should parse report command', () => {
    const result = parseArgs(['report']);
    expect(result.command).toBe('report');
  });

  it('should parse help command', () => {
    const result = parseArgs(['help']);
    expect(result.command).toBe('help');
  });

  it('should default to help for unknown command', () => {
    const result = parseArgs(['unknown']);
    expect(result.command).toBe('help');
  });

  it('should parse --format option', () => {
    const result = parseArgs(['certify', '--format', 'json']);
    expect(result.options.format).toBe('json');
  });

  it('should parse -f shorthand', () => {
    const result = parseArgs(['certify', '-f', 'markdown']);
    expect(result.options.format).toBe('markdown');
  });

  it('should parse --output option', () => {
    const result = parseArgs(['certify', '--output', 'report.md']);
    expect(result.options.output).toBe('report.md');
  });

  it('should parse -o shorthand', () => {
    const result = parseArgs(['certify', '-o', 'output.json']);
    expect(result.options.output).toBe('output.json');
  });

  it('should parse --verbose option', () => {
    const result = parseArgs(['certify', '--verbose']);
    expect(result.options.verbose).toBe(true);
  });

  it('should parse -v shorthand', () => {
    const result = parseArgs(['certify', '-v']);
    expect(result.options.verbose).toBe(true);
  });

  it('should parse --proof-pack option', () => {
    const result = parseArgs(['certify', '--proof-pack']);
    expect(result.options.proofPack).toBe(true);
  });

  it('should parse --no-proof-pack option', () => {
    const result = parseArgs(['certify', '--no-proof-pack']);
    expect(result.options.proofPack).toBe(false);
  });

  it('should parse --cwd option', () => {
    const result = parseArgs(['certify', '--cwd', '/path/to/project']);
    expect(result.options.cwd).toBe('/path/to/project');
  });

  it('should parse -C shorthand', () => {
    const result = parseArgs(['certify', '-C', '/another/path']);
    expect(result.options.cwd).toBe('/another/path');
  });

  it('should parse --version with value', () => {
    const result = parseArgs(['certify', '--version', '1.0.0']);
    expect(result.options.version).toBe('1.0.0');
  });

  it('should parse -V shorthand', () => {
    const result = parseArgs(['certify', '-V', '2.0.0']);
    expect(result.options.version).toBe('2.0.0');
  });

  it('should parse --help as command', () => {
    const result = parseArgs(['--help']);
    expect(result.command).toBe('help');
  });

  it('should parse -h shorthand', () => {
    const result = parseArgs(['-h']);
    expect(result.command).toBe('help');
  });

  it('should collect positional arguments', () => {
    const result = parseArgs(['certify', 'pkg1', 'pkg2']);
    expect(result.positional).toContain('pkg1');
    expect(result.positional).toContain('pkg2');
  });

  it('should handle combined options', () => {
    const result = parseArgs([
      'certify',
      '-f', 'json',
      '-o', 'report.json',
      '-v',
      '--no-proof-pack',
    ]);
    expect(result.command).toBe('certify');
    expect(result.options.format).toBe('json');
    expect(result.options.output).toBe('report.json');
    expect(result.options.verbose).toBe(true);
    expect(result.options.proofPack).toBe(false);
  });

  it('should use default options when not specified', () => {
    const result = parseArgs(['certify']);
    expect(result.options.format).toBe('text');
    expect(result.options.verbose).toBe(false);
    expect(result.options.proofPack).toBe(true);
  });
});

describe('generateHelp', () => {
  it('should return help text', () => {
    const help = generateHelp();
    expect(help).toContain('OMEGA Gold CLI');
    expect(help).toContain('USAGE');
    expect(help).toContain('COMMANDS');
    expect(help).toContain('OPTIONS');
  });

  it('should document all commands', () => {
    const help = generateHelp();
    expect(help).toContain('certify');
    expect(help).toContain('validate');
    expect(help).toContain('report');
    expect(help).toContain('help');
    expect(help).toContain('version');
  });

  it('should document all options', () => {
    const help = generateHelp();
    expect(help).toContain('--format');
    expect(help).toContain('--output');
    expect(help).toContain('--verbose');
    expect(help).toContain('--proof-pack');
    expect(help).toContain('--cwd');
  });
});

describe('generateVersion', () => {
  it('should return version string', () => {
    const version = generateVersion();
    expect(version).toContain('OMEGA Gold CLI');
    expect(version).toMatch(/v\d+\.\d+\.\d+/);
  });
});
