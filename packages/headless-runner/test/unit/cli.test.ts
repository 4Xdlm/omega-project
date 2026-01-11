/**
 * @fileoverview Unit tests for CLI module.
 */

import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  createCliExecutor,
  CLI_VERSION,
  HELP_TEXT,
} from '../../src/cli.js';
import { ExitCode } from '../../src/types.js';

describe('CLI', () => {
  describe('parseArgs', () => {
    describe('help command', () => {
      it('should parse "help"', () => {
        const result = parseArgs(['help']);
        expect(result.command).toBe('help');
      });

      it('should parse "--help"', () => {
        const result = parseArgs(['--help']);
        expect(result.command).toBe('help');
      });

      it('should parse "-h"', () => {
        const result = parseArgs(['-h']);
        expect(result.command).toBe('help');
      });

      it('should default to help with no args', () => {
        const result = parseArgs([]);
        expect(result.command).toBe('help');
      });
    });

    describe('version command', () => {
      it('should parse "version"', () => {
        const result = parseArgs(['version']);
        expect(result.command).toBe('version');
      });

      it('should parse "--version"', () => {
        const result = parseArgs(['--version']);
        expect(result.command).toBe('version');
      });
    });

    describe('verify command', () => {
      it('should parse verify with two paths', () => {
        const result = parseArgs(['verify', 'file1.json', 'file2.json']);
        expect(result.command).toBe('verify');
        expect(result.verifyPaths).toEqual(['file1.json', 'file2.json']);
      });

      it('should throw for verify with one path', () => {
        expect(() => parseArgs(['verify', 'file1.json'])).toThrow();
      });

      it('should throw for verify with no paths', () => {
        expect(() => parseArgs(['verify'])).toThrow();
      });
    });

    describe('run command', () => {
      it('should parse run with plan and seed', () => {
        const result = parseArgs(['run', 'plan.json', '--seed', 'test-seed']);
        expect(result.command).toBe('run');
        expect(result.planPath).toBe('plan.json');
        expect(result.config?.seed).toBe('test-seed');
      });

      it('should throw for run without plan', () => {
        expect(() => parseArgs(['run'])).toThrow();
      });

      it('should throw for run without seed', () => {
        expect(() => parseArgs(['run', 'plan.json'])).toThrow('--seed is required');
      });

      it('should parse --output option', () => {
        const result = parseArgs(['run', 'plan.json', '--seed', 's', '--output', '/out']);
        expect(result.config?.outputDir).toBe('/out');
      });

      it('should throw for --output without value', () => {
        expect(() => parseArgs(['run', 'plan.json', '--seed', 's', '--output'])).toThrow();
      });

      it('should parse --verbose option', () => {
        const result = parseArgs(['run', 'plan.json', '--seed', 's', '--verbose']);
        expect(result.config?.verbosity).toBe(2);
      });

      it('should parse -v option', () => {
        const result = parseArgs(['run', 'plan.json', '--seed', 's', '-v']);
        expect(result.config?.verbosity).toBe(2);
      });

      it('should parse --quiet option', () => {
        const result = parseArgs(['run', 'plan.json', '--seed', 's', '--quiet']);
        expect(result.config?.verbosity).toBe(0);
      });

      it('should parse -q option', () => {
        const result = parseArgs(['run', 'plan.json', '--seed', 's', '-q']);
        expect(result.config?.verbosity).toBe(0);
      });

      it('should parse --verify option', () => {
        const result = parseArgs(['run', 'plan.json', '--seed', 's', '--verify']);
        expect(result.config?.verifyDeterminism).toBe(true);
      });

      it('should parse --timeout option', () => {
        const result = parseArgs(['run', 'plan.json', '--seed', 's', '--timeout', '5000']);
        expect(result.config?.timeout).toBe(5000);
      });

      it('should throw for invalid --timeout', () => {
        expect(() => parseArgs(['run', 'plan.json', '--seed', 's', '--timeout', 'abc'])).toThrow();
      });

      it('should throw for unknown option', () => {
        expect(() => parseArgs(['run', 'plan.json', '--seed', 's', '--unknown'])).toThrow('Unknown option');
      });

      it('should throw for --seed without value', () => {
        expect(() => parseArgs(['run', 'plan.json', '--seed'])).toThrow('--seed requires a value');
      });
    });

    describe('unknown command', () => {
      it('should throw for unknown command', () => {
        expect(() => parseArgs(['unknown'])).toThrow('Unknown command');
      });
    });
  });

  describe('CLI constants', () => {
    it('should have a version', () => {
      expect(CLI_VERSION).toBe('0.1.0');
    });

    it('should have help text', () => {
      expect(HELP_TEXT).toContain('OMEGA Headless Runner');
      expect(HELP_TEXT).toContain('USAGE');
      expect(HELP_TEXT).toContain('COMMANDS');
      expect(HELP_TEXT).toContain('OPTIONS');
    });
  });

  describe('createCliExecutor', () => {
    const mockDeps = {
      readFile: async (path: string) => {
        if (path.includes('exists')) {
          return JSON.stringify({ seed: 'test', stepsExecuted: 5 });
        }
        throw new Error('File not found');
      },
      writeFile: async () => {},
      mkdir: async () => {},
      exists: async (path: string) => path.includes('exists') || path === 'plan.json',
    };

    it('should execute help command', async () => {
      const executor = createCliExecutor(mockDeps);
      const result = await executor.execute(['help']);

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.output).toBe(HELP_TEXT);
    });

    it('should execute version command', async () => {
      const executor = createCliExecutor(mockDeps);
      const result = await executor.execute(['version']);

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.output).toContain(CLI_VERSION);
    });

    it('should handle verify with missing file', async () => {
      const executor = createCliExecutor(mockDeps);
      const result = await executor.execute(['verify', 'missing.json', 'exists.json']);

      expect(result.exitCode).toBe(ExitCode.PLAN_NOT_FOUND);
      expect(result.error).toContain('File not found');
    });

    it('should handle verify with matching results', async () => {
      const executor = createCliExecutor(mockDeps);
      const result = await executor.execute(['verify', 'exists1.json', 'exists2.json']);

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.output).toContain('deterministically equivalent');
    });

    it('should handle run with missing plan', async () => {
      const executor = createCliExecutor(mockDeps);
      const result = await executor.execute(['run', 'missing.json', '--seed', 'test']);

      expect(result.exitCode).toBe(ExitCode.PLAN_NOT_FOUND);
      expect(result.error).toContain('Plan file not found');
    });

    it('should handle run with existing plan', async () => {
      const executor = createCliExecutor(mockDeps);
      const result = await executor.execute(['run', 'plan.json', '--seed', 'test']);

      expect(result.exitCode).toBe(ExitCode.SUCCESS);
      expect(result.output).toContain('Would execute plan');
    });

    it('should handle invalid arguments', async () => {
      const executor = createCliExecutor(mockDeps);
      const result = await executor.execute(['run']);

      expect(result.exitCode).toBe(ExitCode.INVALID_ARGS);
      expect(result.error).toBeDefined();
    });
  });
});
