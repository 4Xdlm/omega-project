/**
 * OMEGA CLI_RUNNER — Runner Tests
 * Phase 16.0 — NASA-Grade
 */

import { describe, it, expect } from 'vitest';
import { run, getCommand, getAllCommands, getVersion } from '../src/cli/runner.js';
import { EXIT_CODES, CLI_VERSION } from '../src/cli/constants.js';

describe('Runner', () => {
  // Capture output
  const captureOutput = () => {
    const captured: { stdout: string[]; stderr: string[] } = { stdout: [], stderr: [] };
    return {
      stdout: (msg: string) => captured.stdout.push(msg),
      stderr: (msg: string) => captured.stderr.push(msg),
      get: () => captured,
    };
  };

  describe('run()', () => {
    it('should show general help with no arguments', async () => {
      const output = captureOutput();
      const result = await run([], { stdout: output.stdout, stderr: output.stderr });
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(output.get().stdout.join('')).toContain('OMEGA CLI');
    });

    it('should handle unknown command', async () => {
      const output = captureOutput();
      const result = await run(['unknown'], { stdout: output.stdout, stderr: output.stderr });
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(EXIT_CODES.USAGE);
      expect(output.get().stderr.join('')).toContain('Unknown command');
    });

    it('should show command help with --help', async () => {
      const output = captureOutput();
      const result = await run(['analyze', '--help'], { stdout: output.stdout, stderr: output.stderr });
      
      expect(result.success).toBe(true);
      expect(output.get().stdout.join('')).toContain('Usage:');
    });

    it('should execute version command', async () => {
      const output = captureOutput();
      const result = await run(['version'], { stdout: output.stdout, stderr: output.stderr });
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(output.get().stdout.join('')).toContain(CLI_VERSION);
    });

    it('should execute info command', async () => {
      const output = captureOutput();
      const result = await run(['info'], { stdout: output.stdout, stderr: output.stderr });
      
      expect(result.success).toBe(true);
      expect(output.get().stdout.join('')).toContain('OMEGA');
    });

    it('should execute analyze command', async () => {
      const output = captureOutput();
      const result = await run(['analyze', 'sample_text.txt'], { stdout: output.stdout, stderr: output.stderr });
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
    });

    it('should execute health command', async () => {
      const output = captureOutput();
      const result = await run(['health'], { stdout: output.stdout, stderr: output.stderr });
      
      expect(result.success).toBe(true);
    });

    it('should validate arguments before execution', async () => {
      const output = captureOutput();
      const result = await run(['analyze'], { stdout: output.stdout, stderr: output.stderr });
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    });
  });

  describe('getCommand()', () => {
    it('should return command by name', () => {
      const cmd = getCommand('analyze');
      
      expect(cmd).toBeDefined();
      expect(cmd?.name).toBe('analyze');
    });

    it('should return undefined for unknown command', () => {
      const cmd = getCommand('nonexistent');
      
      expect(cmd).toBeUndefined();
    });
  });

  describe('getAllCommands()', () => {
    it('should return all registered commands', () => {
      const commands = getAllCommands();
      
      expect(commands.length).toBeGreaterThan(0);
      
      const names = commands.map(c => c.name);
      expect(names).toContain('analyze');
      expect(names).toContain('compare');
      expect(names).toContain('export');
      expect(names).toContain('batch');
      expect(names).toContain('health');
      expect(names).toContain('version');
      expect(names).toContain('info');
    });

    it('should return exactly 7 commands', () => {
      const commands = getAllCommands();
      expect(commands.length).toBe(7);
    });
  });

  describe('getVersion()', () => {
    it('should return CLI version', () => {
      expect(getVersion()).toBe(CLI_VERSION);
    });
  });
});
