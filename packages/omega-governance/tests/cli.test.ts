import { describe, it, expect } from 'vitest';
import { parseGovArgs, getGovHelpText } from '../src/cli/parser.js';

describe('CLI Parser', () => {
  it('parses --help', () => {
    const args = parseGovArgs(['node', 'script', '--help']);
    expect(args.command).toBe('help');
  });

  it('parses --version', () => {
    const args = parseGovArgs(['node', 'script', '--version']);
    expect(args.command).toBe('version');
  });

  it('parses compare command', () => {
    const args = parseGovArgs(['node', 'script', 'compare', '--runs', 'dir1,dir2', '--out', 'result.json']);
    expect(args.command).toBe('compare');
    expect(args.runs).toBe('dir1,dir2');
    expect(args.out).toBe('result.json');
  });

  it('parses drift command', () => {
    const args = parseGovArgs(['node', 'script', 'drift', '--baseline', 'base', '--candidate', 'cand']);
    expect(args.command).toBe('drift');
    expect(args.baseline).toBe('base');
    expect(args.candidate).toBe('cand');
  });

  it('parses bench command', () => {
    const args = parseGovArgs(['node', 'script', 'bench', '--suite', 'suite-dir', '--out', 'output']);
    expect(args.command).toBe('bench');
    expect(args.suite).toBe('suite-dir');
  });

  it('parses certify command', () => {
    const args = parseGovArgs(['node', 'script', 'certify', '--run', 'run-dir', '--out', 'cert.json']);
    expect(args.command).toBe('certify');
    expect(args.run).toBe('run-dir');
  });

  it('parses history command', () => {
    const args = parseGovArgs(['node', 'script', 'history', '--log', 'events.ndjson', '--since', '2026-01-01']);
    expect(args.command).toBe('history');
    expect(args.log).toBe('events.ndjson');
    expect(args.since).toBe('2026-01-01');
  });

  it('parses govern subcommand prefix', () => {
    const args = parseGovArgs(['node', 'script', 'govern', 'compare', '--runs', 'dir1,dir2']);
    expect(args.command).toBe('compare');
    expect(args.runs).toBe('dir1,dir2');
  });

  it('defaults to help for unknown command', () => {
    const args = parseGovArgs(['node', 'script', 'unknown']);
    expect(args.command).toBe('help');
  });

  it('defaults to help for no args', () => {
    const args = parseGovArgs(['node', 'script']);
    expect(args.command).toBe('help');
  });

  it('getGovHelpText returns non-empty string', () => {
    const help = getGovHelpText();
    expect(help.length).toBeGreaterThan(100);
    expect(help).toContain('compare');
    expect(help).toContain('drift');
    expect(help).toContain('bench');
    expect(help).toContain('certify');
    expect(help).toContain('history');
  });

  it('help text contains exit codes', () => {
    const help = getGovHelpText();
    expect(help).toContain('Exit Codes');
    expect(help).toContain('SUCCESS');
  });
});
