/**
 * OMEGA CLI_RUNNER — Parser Tests
 * Phase 16.0 — NASA-Grade
 */

import { describe, it, expect } from 'vitest';
import { parse, validateArgs, generateHelp } from '../src/cli/parser.js';
import { analyzeCommand } from '../src/cli/commands/analyze.js';

describe('Parser', () => {
  describe('parse()', () => {
    it('should parse command without options', () => {
      const result = parse(['analyze', 'file.txt']);
      
      expect(result.command).toBe('analyze');
      expect(result.args).toEqual(['file.txt']);
      expect(result.options).toEqual({});
    });

    it('should parse short options', () => {
      const result = parse(['analyze', 'file.txt', '-o', 'json']);
      
      expect(result.command).toBe('analyze');
      expect(result.args).toEqual(['file.txt']);
      expect(result.options['o']).toBe('json');
    });

    it('should parse long options', () => {
      const result = parse(['analyze', 'file.txt', '--output', 'md']);
      
      expect(result.command).toBe('analyze');
      expect(result.options['output']).toBe('md');
    });

    it('should parse long options with equals sign', () => {
      const result = parse(['analyze', 'file.txt', '--output=json']);
      
      expect(result.options['output']).toBe('json');
    });

    it('should parse boolean flags', () => {
      const result = parse(['analyze', 'file.txt', '--verbose']);
      
      expect(result.options['verbose']).toBe(true);
    });

    it('should parse multiple options', () => {
      const result = parse(['analyze', 'file.txt', '-o', 'md', '-v']);
      
      expect(result.options['o']).toBe('md');
      expect(result.options['v']).toBe(true);
    });

    it('should handle empty input', () => {
      const result = parse([]);
      
      expect(result.command).toBe('');
      expect(result.args).toEqual([]);
    });

    it('should parse compare with two files', () => {
      const result = parse(['compare', 'file1.txt', 'file2.txt']);
      
      expect(result.command).toBe('compare');
      expect(result.args).toEqual(['file1.txt', 'file2.txt']);
    });

    it('should parse help flag', () => {
      const result = parse(['analyze', '--help']);
      
      expect(result.command).toBe('analyze');
      expect(result.options['help']).toBe(true);
    });
  });

  describe('validateArgs()', () => {
    it('should validate valid arguments', () => {
      const parsed = parse(['analyze', 'test.txt']);
      const result = validateArgs(parsed, analyzeCommand);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing required arguments', () => {
      const parsed = parse(['analyze']);
      const result = validateArgs(parsed, analyzeCommand);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid option values', () => {
      const parsed = parse(['analyze', 'test.txt', '--output', 'invalid']);
      const result = validateArgs(parsed, analyzeCommand);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('generateHelp()', () => {
    it('should generate help text with usage', () => {
      const help = generateHelp(analyzeCommand);
      
      expect(help).toContain('Usage:');
      expect(help).toContain('analyze');
      expect(help).toContain('file');
    });

    it('should include options in help', () => {
      const help = generateHelp(analyzeCommand);
      
      expect(help).toContain('--output');
      expect(help).toContain('--verbose');
    });
  });
});
