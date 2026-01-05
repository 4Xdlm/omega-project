/**
 * OMEGA CLI_RUNNER — Health Command Tests
 * Phase 16.0 — NASA-Grade
 */

import { describe, it, expect } from 'vitest';
import { healthCommand, checkCore, checkEmotionEngine } from '../../src/cli/commands/health.js';
import { parse } from '../../src/cli/parser.js';
import { EXIT_CODES } from '../../src/cli/constants.js';

describe('Health Command', () => {
  describe('checkCore()', () => {
    it('should return OK status', async () => {
      const result = await checkCore();
      
      expect(result.component).toBe('OMEGA Core');
      expect(result.status).toBe('OK');
      expect(result.latency).toBeGreaterThan(0);
    });
  });

  describe('checkEmotionEngine()', () => {
    it('should return OK status', async () => {
      const result = await checkEmotionEngine();
      
      expect(result.component).toBe('Emotion Engine');
      expect(result.status).toBe('OK');
    });
  });

  describe('execute()', () => {
    it('should run basic health check', async () => {
      const args = parse(['health']);
      const result = await healthCommand.execute(args);
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(result.output).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should include version in output', async () => {
      const args = parse(['health']);
      const result = await healthCommand.execute(args);
      
      expect(result.output).toContain('Version');
    });

    it('should run full health check with flag', async () => {
      const args = parse(['health', '--full']);
      const result = await healthCommand.execute(args);
      
      expect(result.success).toBe(true);
      // Full check includes more components
      expect(result.output).toContain('NEXUS');
      expect(result.output).toContain('Storage');
      expect(result.output).toContain('Memory');
    });

    it('should return overall status', async () => {
      const args = parse(['health']);
      const result = await healthCommand.execute(args);
      
      expect(result.output).toContain('Status:');
    });

    it('should include timestamp', async () => {
      const args = parse(['health']);
      const result = await healthCommand.execute(args);
      
      expect(result.output).toContain('Timestamp:');
    });

    it('should include metadata with health report', async () => {
      const args = parse(['health']);
      const result = await healthCommand.execute(args);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.healthReport).toBeDefined();
    });

    it('should check latency for each component', async () => {
      const args = parse(['health', '--full']);
      const result = await healthCommand.execute(args);
      
      expect(result.output).toContain('ms');
    });
  });
});
