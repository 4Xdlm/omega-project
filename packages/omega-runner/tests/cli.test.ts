/**
 * OMEGA Runner — CLI Parser Tests
 * Phase D.1 — 12 tests for argument parsing
 */

import { describe, it, expect } from 'vitest';
import { parseArgs, validateArgs, getHelpText } from '../src/cli/parser.js';

describe('CLI parseArgs', () => {
  it('empty args → help command', () => {
    const result = parseArgs(['node', 'omega']);
    expect(result.command).toBe('help');
  });

  it('--help → help command', () => {
    const result = parseArgs(['node', 'omega', '--help']);
    expect(result.command).toBe('help');
  });

  it('-h → help command', () => {
    const result = parseArgs(['node', 'omega', '-h']);
    expect(result.command).toBe('help');
  });

  it('--version → version command', () => {
    const result = parseArgs(['node', 'omega', '--version']);
    expect(result.command).toBe('version');
  });

  it('-v → version command', () => {
    const result = parseArgs(['node', 'omega', '-v']);
    expect(result.command).toBe('version');
  });

  it('run create --intent f.json --out d → run-create with intent and out', () => {
    const result = parseArgs(['node', 'omega', 'run', 'create', '--intent', 'f.json', '--out', 'd']);
    expect(result.command).toBe('run-create');
    expect(result.intent).toBe('f.json');
    expect(result.out).toBe('d');
  });

  it('run forge --input f.json --out d → run-forge', () => {
    const result = parseArgs(['node', 'omega', 'run', 'forge', '--input', 'f.json', '--out', 'd']);
    expect(result.command).toBe('run-forge');
    expect(result.input).toBe('f.json');
    expect(result.out).toBe('d');
  });

  it('run full --intent f.json --out d --seed s → run-full with seed', () => {
    const result = parseArgs(['node', 'omega', 'run', 'full', '--intent', 'f.json', '--out', 'd', '--seed', 's']);
    expect(result.command).toBe('run-full');
    expect(result.intent).toBe('f.json');
    expect(result.out).toBe('d');
    expect(result.seed).toBe('s');
  });

  it('run report --dir d --out f.md → run-report', () => {
    const result = parseArgs(['node', 'omega', 'run', 'report', '--dir', 'd', '--out', 'f.md']);
    expect(result.command).toBe('run-report');
    expect(result.dir).toBe('d');
    expect(result.out).toBe('f.md');
  });

  it('verify --dir d --strict → verify with strict=true', () => {
    const result = parseArgs(['node', 'omega', 'verify', '--dir', 'd', '--strict']);
    expect(result.command).toBe('verify');
    expect(result.dir).toBe('d');
    expect(result.strict).toBe(true);
  });
});

describe('CLI getHelpText', () => {
  it('contains omega', () => {
    const text = getHelpText();
    expect(text.toLowerCase()).toContain('omega');
  });

  it('contains all 5 commands', () => {
    const text = getHelpText();
    expect(text).toContain('run create');
    expect(text).toContain('run forge');
    expect(text).toContain('run full');
    expect(text).toContain('run report');
    expect(text).toContain('verify');
  });
});
