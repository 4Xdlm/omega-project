/**
 * OMEGA Runner — IO Errors & CLI Parser Tests
 * Phase D.1 — 10 tests for exit codes and argument validation
 */

import { describe, it, expect } from 'vitest';
import { parseArgs, validateArgs } from '../src/cli/parser.js';
import { EXIT_IO_ERROR, EXIT_USAGE_ERROR } from '../src/types.js';

describe('Exit code constants', () => {
  it('EXIT_IO_ERROR value is 4', () => {
    expect(EXIT_IO_ERROR).toBe(4);
  });

  it('EXIT_USAGE_ERROR value is 2', () => {
    expect(EXIT_USAGE_ERROR).toBe(2);
  });
});

describe('parseArgs + validateArgs for missing args', () => {
  it('parseArgs with no arguments returns help command', () => {
    const parsed = parseArgs(['node', 'omega']);
    expect(parsed.command).toBe('help');

    const error = validateArgs(parsed);
    expect(error).toBeNull();
  });
});

describe('validateArgs run-create', () => {
  it('missing intent returns error message', () => {
    const parsed = parseArgs(['node', 'omega', 'run', 'create', '--out', '/tmp/out']);
    expect(parsed.command).toBe('run-create');

    const error = validateArgs(parsed);
    expect(error).toBe('Missing --intent <path.json>');
  });

  it('missing out returns error message', () => {
    const parsed = parseArgs(['node', 'omega', 'run', 'create', '--intent', 'intent.json']);
    expect(parsed.command).toBe('run-create');

    const error = validateArgs(parsed);
    expect(error).toBe('Missing --out <dir>');
  });
});

describe('validateArgs run-forge', () => {
  it('missing input returns error message', () => {
    const parsed = parseArgs(['node', 'omega', 'run', 'forge', '--out', '/tmp/out']);
    expect(parsed.command).toBe('run-forge');

    const error = validateArgs(parsed);
    expect(error).toBe('Missing --input <path.json>');
  });
});

describe('validateArgs run-full', () => {
  it('missing intent returns error message', () => {
    const parsed = parseArgs(['node', 'omega', 'run', 'full', '--out', '/tmp/out']);
    expect(parsed.command).toBe('run-full');

    const error = validateArgs(parsed);
    expect(error).toBe('Missing --intent <path.json>');
  });
});

describe('validateArgs verify', () => {
  it('missing dir returns error message', () => {
    const parsed = parseArgs(['node', 'omega', 'verify']);
    expect(parsed.command).toBe('verify');

    const error = validateArgs(parsed);
    expect(error).toBe('Missing --dir <runDir>');
  });
});

describe('validateArgs run-report', () => {
  it('missing dir returns error message', () => {
    const parsed = parseArgs(['node', 'omega', 'run', 'report', '--out', 'report.md']);
    expect(parsed.command).toBe('run-report');

    const error = validateArgs(parsed);
    expect(error).toBe('Missing --dir <runDir>');
  });

  it('missing out returns error message', () => {
    const parsed = parseArgs(['node', 'omega', 'run', 'report', '--dir', '/tmp/run']);
    expect(parsed.command).toBe('run-report');

    const error = validateArgs(parsed);
    expect(error).toBe('Missing --out <file>');
  });
});
