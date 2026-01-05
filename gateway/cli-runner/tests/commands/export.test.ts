/**
 * OMEGA CLI_RUNNER — Export Command Tests
 * Phase 16.0 — NASA-Grade
 */

import { describe, it, expect } from 'vitest';
import { exportCommand } from '../../src/cli/commands/export.js';
import { parse } from '../../src/cli/parser.js';
import { EXIT_CODES } from '../../src/cli/constants.js';

describe('Export Command', () => {
  describe('execute()', () => {
    it('should export project successfully', async () => {
      const args = parse(['export', 'sample_project.omega', '--format', 'json']);
      const result = await exportCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(result.output).toBeDefined();
      expect(result.artifacts).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should fail without project argument', async () => {
      const args = parse(['export']);
      const result = await exportCommand.execute(args);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    });

    it('should reject non-.omega files', async () => {
      const args = parse(['export', 'file.txt']);
      const result = await exportCommand.execute(args);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(EXIT_CODES.INVALID_INPUT);
      expect(result.error).toContain('.omega');
    });

    it('should export to JSON format', async () => {
      const args = parse(['export', 'sample_project.omega', '--format', 'json']);
      const result = await exportCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(() => JSON.parse(result.output!)).not.toThrow();
    });

    it('should export to Markdown format', async () => {
      const args = parse(['export', 'sample_project.omega', '--format', 'md']);
      const result = await exportCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('#');
      expect(result.output).toContain('Sample OMEGA Project');
    });

    it('should export to DOCX format (simulated)', async () => {
      const args = parse(['export', 'sample_project.omega', '--format', 'docx']);
      const result = await exportCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('DOCX');
    });

    it('should include chapters in export', async () => {
      const args = parse(['export', 'sample_project.omega', '--format', 'md']);
      const result = await exportCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Chapitre 1');
      expect(result.output).toContain('Chapitre 2');
    });

    it('should create artifact entry', async () => {
      const args = parse(['export', 'sample_project.omega']);
      const result = await exportCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.artifacts).toContain('sample_project_export.json');
    });

    it('should handle missing project file', async () => {
      const args = parse(['export', 'error.omega']);
      const result = await exportCommand.execute(args);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error');
    });
  });
});
