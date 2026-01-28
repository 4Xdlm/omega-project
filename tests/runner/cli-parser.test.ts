/**
 * OMEGA Runner CLI Parser Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Tests for CLI argument parsing.
 */

import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  extractFlag,
  hasFlag,
  validatePathArg,
  getHelpText,
  formatError,
  CliParseError,
  MAIN_HELP,
  RUN_HELP,
  BATCH_HELP,
  VERIFY_HELP,
  CAPSULE_HELP,
} from '../../src/runner/cli-parser';
import { DEFAULT_PROFILE } from '../../src/runner/types';

describe('CLI Parser — Phase I', () => {
  describe('extractFlag', () => {
    it('extracts flag value', () => {
      const args = ['--intent', 'file.json', '--profile', 'OMEGA_STD'];
      expect(extractFlag(args, '--intent')).toBe('file.json');
      expect(extractFlag(args, '--profile')).toBe('OMEGA_STD');
    });

    it('returns undefined for missing flag', () => {
      const args = ['--intent', 'file.json'];
      expect(extractFlag(args, '--profile')).toBeUndefined();
    });

    it('returns undefined if flag is last arg', () => {
      const args = ['--intent'];
      expect(extractFlag(args, '--intent')).toBeUndefined();
    });

    it('handles empty args', () => {
      expect(extractFlag([], '--intent')).toBeUndefined();
    });
  });

  describe('hasFlag', () => {
    it('returns true if flag present', () => {
      const args = ['--help', '--verbose'];
      expect(hasFlag(args, '--help')).toBe(true);
      expect(hasFlag(args, '--verbose')).toBe(true);
    });

    it('returns false if flag missing', () => {
      const args = ['--help'];
      expect(hasFlag(args, '--verbose')).toBe(false);
    });

    it('handles empty args', () => {
      expect(hasFlag([], '--help')).toBe(false);
    });
  });

  describe('validatePathArg', () => {
    it('accepts valid paths', () => {
      expect(() => validatePathArg('file.json', 'test')).not.toThrow();
      expect(() => validatePathArg('dir/file.json', 'test')).not.toThrow();
    });

    it('throws for path traversal', () => {
      expect(() => validatePathArg('../file.json', 'test')).toThrow(CliParseError);
    });

    it('throws for absolute path', () => {
      expect(() => validatePathArg('/etc/passwd', 'test')).toThrow(CliParseError);
    });

    it('includes arg name in error', () => {
      try {
        validatePathArg('../bad', '--intent');
      } catch (e) {
        expect((e as Error).message).toContain('--intent');
      }
    });
  });

  describe('parseArgs - help command', () => {
    it('returns help for no args', () => {
      const result = parseArgs([]);
      expect(result.command).toBe('help');
    });

    it('returns help for --help', () => {
      const result = parseArgs(['--help']);
      expect(result.command).toBe('help');
    });

    it('returns help for help command', () => {
      const result = parseArgs(['help']);
      expect(result.command).toBe('help');
    });

    it('sets default profile for help', () => {
      const result = parseArgs(['help']);
      expect(result.profile).toBe(DEFAULT_PROFILE);
    });
  });

  describe('parseArgs - run command', () => {
    it('parses run with intent', () => {
      const result = parseArgs(['run', '--intent', 'test.json']);
      expect(result.command).toBe('run');
      expect(result.intentPath).toBe('test.json');
      expect(result.profile).toBe(DEFAULT_PROFILE);
    });

    it('parses run with profile', () => {
      const result = parseArgs(['run', '--intent', 'test.json', '--profile', 'PROF-custom']);
      expect(result.profile).toBe('PROF-custom');
    });

    it('throws for missing intent', () => {
      expect(() => parseArgs(['run'])).toThrow(CliParseError);
      expect(() => parseArgs(['run'])).toThrow('--intent');
    });

    it('returns help for run --help', () => {
      const result = parseArgs(['run', '--help']);
      expect(result.command).toBe('help');
    });

    it('throws for path traversal in intent', () => {
      expect(() => parseArgs(['run', '--intent', '../bad.json'])).toThrow(CliParseError);
    });
  });

  describe('parseArgs - batch command', () => {
    it('parses batch with dir', () => {
      const result = parseArgs(['batch', '--dir', 'intents/']);
      expect(result.command).toBe('batch');
      expect(result.dirPath).toBe('intents/');
      expect(result.profile).toBe(DEFAULT_PROFILE);
    });

    it('parses batch with profile', () => {
      const result = parseArgs(['batch', '--dir', 'intents/', '--profile', 'PROF-x']);
      expect(result.profile).toBe('PROF-x');
    });

    it('throws for missing dir', () => {
      expect(() => parseArgs(['batch'])).toThrow(CliParseError);
      expect(() => parseArgs(['batch'])).toThrow('--dir');
    });

    it('returns help for batch --help', () => {
      const result = parseArgs(['batch', '--help']);
      expect(result.command).toBe('help');
    });

    it('throws for path traversal in dir', () => {
      expect(() => parseArgs(['batch', '--dir', '../bad/'])).toThrow(CliParseError);
    });
  });

  describe('parseArgs - verify command', () => {
    it('parses verify with run path', () => {
      const result = parseArgs(['verify', '--run', 'artefacts/runs/run_1/']);
      expect(result.command).toBe('verify');
      expect(result.runPath).toBe('artefacts/runs/run_1/');
    });

    it('throws for missing run path', () => {
      expect(() => parseArgs(['verify'])).toThrow(CliParseError);
      expect(() => parseArgs(['verify'])).toThrow('--run');
    });

    it('returns help for verify --help', () => {
      const result = parseArgs(['verify', '--help']);
      expect(result.command).toBe('help');
    });

    it('throws for path traversal in run', () => {
      expect(() => parseArgs(['verify', '--run', '../bad/'])).toThrow(CliParseError);
    });
  });

  describe('parseArgs - capsule command', () => {
    it('parses capsule with run and output', () => {
      const result = parseArgs(['capsule', '--run', 'runs/r1/', '--output', 'out.zip']);
      expect(result.command).toBe('capsule');
      expect(result.runPath).toBe('runs/r1/');
      expect(result.outputPath).toBe('out.zip');
    });

    it('throws for missing run path', () => {
      expect(() => parseArgs(['capsule', '--output', 'out.zip'])).toThrow(CliParseError);
      expect(() => parseArgs(['capsule', '--output', 'out.zip'])).toThrow('--run');
    });

    it('throws for missing output path', () => {
      expect(() => parseArgs(['capsule', '--run', 'runs/r1/'])).toThrow(CliParseError);
      expect(() => parseArgs(['capsule', '--run', 'runs/r1/'])).toThrow('--output');
    });

    it('returns help for capsule --help', () => {
      const result = parseArgs(['capsule', '--help']);
      expect(result.command).toBe('help');
    });

    it('throws for path traversal in output', () => {
      expect(() => parseArgs(['capsule', '--run', 'r/', '--output', '../bad.zip'])).toThrow(CliParseError);
    });
  });

  describe('parseArgs - unknown command', () => {
    it('throws for unknown command', () => {
      expect(() => parseArgs(['unknown'])).toThrow(CliParseError);
      expect(() => parseArgs(['unknown'])).toThrow('Unknown command');
    });
  });

  describe('parseArgs - result immutability', () => {
    it('returns frozen result', () => {
      const result = parseArgs(['run', '--intent', 'test.json']);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('getHelpText', () => {
    it('returns main help for no command', () => {
      expect(getHelpText()).toBe(MAIN_HELP);
    });

    it('returns run help', () => {
      expect(getHelpText('run')).toBe(RUN_HELP);
    });

    it('returns batch help', () => {
      expect(getHelpText('batch')).toBe(BATCH_HELP);
    });

    it('returns verify help', () => {
      expect(getHelpText('verify')).toBe(VERIFY_HELP);
    });

    it('returns capsule help', () => {
      expect(getHelpText('capsule')).toBe(CAPSULE_HELP);
    });

    it('returns main help for help command', () => {
      expect(getHelpText('help')).toBe(MAIN_HELP);
    });
  });

  describe('formatError', () => {
    it('formats error with command hint', () => {
      const formatted = formatError('Missing argument', 'run');
      expect(formatted).toContain('Error: Missing argument');
      expect(formatted).toContain('omega run --help');
    });

    it('formats error with general hint', () => {
      const formatted = formatError('Unknown command');
      expect(formatted).toContain('Error: Unknown command');
      expect(formatted).toContain('omega help');
    });
  });

  describe('Help text content', () => {
    it('MAIN_HELP contains commands', () => {
      expect(MAIN_HELP).toContain('run');
      expect(MAIN_HELP).toContain('batch');
      expect(MAIN_HELP).toContain('verify');
      expect(MAIN_HELP).toContain('capsule');
      expect(MAIN_HELP).toContain('help');
    });

    it('RUN_HELP contains intent flag', () => {
      expect(RUN_HELP).toContain('--intent');
      expect(RUN_HELP).toContain('--profile');
    });

    it('BATCH_HELP contains dir flag', () => {
      expect(BATCH_HELP).toContain('--dir');
      expect(BATCH_HELP).toContain('--profile');
    });

    it('VERIFY_HELP contains run flag', () => {
      expect(VERIFY_HELP).toContain('--run');
      expect(VERIFY_HELP).toContain('read-only');
    });

    it('CAPSULE_HELP contains run and output flags', () => {
      expect(CAPSULE_HELP).toContain('--run');
      expect(CAPSULE_HELP).toContain('--output');
      expect(CAPSULE_HELP).toContain('deterministic');
    });
  });

  describe('CliParseError', () => {
    it('has correct name', () => {
      const error = new CliParseError('test');
      expect(error.name).toBe('CliParseError');
    });

    it('has message', () => {
      const error = new CliParseError('test message');
      expect(error.message).toBe('test message');
    });

    it('is instance of Error', () => {
      const error = new CliParseError('test');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles flag appearing multiple times', () => {
      const result = parseArgs(['run', '--intent', 'first.json', '--intent', 'second.json']);
      expect(result.intentPath).toBe('first.json');
    });

    it('handles flags in any order', () => {
      const result = parseArgs(['run', '--profile', 'PROF-x', '--intent', 'test.json']);
      expect(result.intentPath).toBe('test.json');
      expect(result.profile).toBe('PROF-x');
    });

    it('handles paths with spaces', () => {
      const result = parseArgs(['run', '--intent', 'my file.json']);
      expect(result.intentPath).toBe('my file.json');
    });

    it('handles unicode paths', () => {
      const result = parseArgs(['run', '--intent', 'données.json']);
      expect(result.intentPath).toBe('données.json');
    });
  });
});
