/**
 * OMEGA CLI_RUNNER — Batch Command Tests
 * Phase 16.0 — NASA-Grade
 */

import { describe, it, expect } from 'vitest';
import { batchCommand } from '../../src/cli/commands/batch.js';
import { parse } from '../../src/cli/parser.js';
import { EXIT_CODES } from '../../src/cli/constants.js';

describe('Batch Command', () => {
  describe('execute()', () => {
    it('should process batch directory successfully', async () => {
      const args = parse(['batch', 'test_batch/']);
      const result = await batchCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(result.output).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should fail without directory argument', async () => {
      const args = parse(['batch']);
      const result = await batchCommand.execute(args);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    });

    it('should process files recursively with flag', async () => {
      const args = parse(['batch', 'test_batch/', '--recursive']);
      const result = await batchCommand.execute(args);
      
      expect(result.success).toBe(true);
      // Should include nested file
      expect(result.output).toContain('nested.txt');
    });

    it('should not process nested files without recursive flag', async () => {
      const args = parse(['batch', 'test_batch/']);
      const result = await batchCommand.execute(args);
      
      expect(result.success).toBe(true);
      // Should not include nested file by default
      expect(result.output).not.toContain('nested.txt');
    });

    it('should handle empty directory', async () => {
      const args = parse(['batch', 'empty/']);
      const result = await batchCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      const parsed = JSON.parse(result.output!);
      expect(parsed.total).toBe(0);
    });

    it('should report success and failure counts', async () => {
      const args = parse(['batch', 'fixtures/']);
      const result = await batchCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Total');
      expect(result.output).toContain('Succès');
    });

    it('should include duration in result', async () => {
      const args = parse(['batch', 'test_batch/']);
      const result = await batchCommand.execute(args);
      
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle directory not found', async () => {
      const args = parse(['batch', 'error/']);
      const result = await batchCommand.execute(args);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error');
    });

    it('should include metadata with batch result', async () => {
      const args = parse(['batch', 'test_batch/']);
      const result = await batchCommand.execute(args);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.batchResult).toBeDefined();
    });
  });
});
