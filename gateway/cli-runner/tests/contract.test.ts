/**
 * OMEGA CLI_RUNNER — Contract Tests
 * Phase 16.0 — NASA-Grade
 * 
 * Tests Module Contract and Routing Policy
 */

import { describe, it, expect } from 'vitest';
import { 
  CONTRACTS, 
  getContract, 
  validateRouting, 
  requiresNexus, 
  requiresAudit,
  enforceContract,
  ROUTING_POLICY
} from '../src/cli/contract.js';
import { ROUTING } from '../src/cli/constants.js';

describe('Module Contract', () => {
  describe('CONTRACTS', () => {
    it('should define all required commands', () => {
      const requiredCommands = ['analyze', 'compare', 'export', 'batch', 'health', 'version', 'info'];
      
      for (const cmd of requiredCommands) {
        expect(CONTRACTS[cmd]).toBeDefined();
        expect(CONTRACTS[cmd].name).toBe(cmd);
      }
    });

    it('should have valid routing for all commands', () => {
      for (const [name, contract] of Object.entries(CONTRACTS)) {
        expect(['DIRECT', 'NEXUS']).toContain(contract.routing);
      }
    });

    it('should define input schema for all commands', () => {
      for (const contract of Object.values(CONTRACTS)) {
        expect(contract.input).toBeDefined();
        expect(contract.input.type).toBeDefined();
        expect(typeof contract.input.required).toBe('boolean');
      }
    });

    it('should define output schema for all commands', () => {
      for (const contract of Object.values(CONTRACTS)) {
        expect(contract.output).toBeDefined();
        expect(contract.output.type).toBeDefined();
        expect(Array.isArray(contract.output.formats)).toBe(true);
      }
    });
  });

  describe('getContract()', () => {
    it('should return contract by name', () => {
      const contract = getContract('analyze');
      
      expect(contract).toBeDefined();
      expect(contract?.name).toBe('analyze');
    });

    it('should return undefined for unknown command', () => {
      const contract = getContract('nonexistent');
      
      expect(contract).toBeUndefined();
    });
  });

  describe('validateRouting()', () => {
    it('should validate correct NEXUS routing', () => {
      expect(validateRouting('analyze', ROUTING.NEXUS)).toBe(true);
      expect(validateRouting('compare', ROUTING.NEXUS)).toBe(true);
      expect(validateRouting('batch', ROUTING.NEXUS)).toBe(true);
    });

    it('should validate correct DIRECT routing', () => {
      expect(validateRouting('health', ROUTING.DIRECT)).toBe(true);
      expect(validateRouting('version', ROUTING.DIRECT)).toBe(true);
      expect(validateRouting('info', ROUTING.DIRECT)).toBe(true);
      expect(validateRouting('export', ROUTING.DIRECT)).toBe(true);
    });

    it('should reject incorrect routing', () => {
      expect(validateRouting('analyze', ROUTING.DIRECT)).toBe(false);
      expect(validateRouting('health', ROUTING.NEXUS)).toBe(false);
    });

    it('should return false for unknown command', () => {
      expect(validateRouting('unknown', ROUTING.NEXUS)).toBe(false);
    });
  });

  describe('requiresNexus()', () => {
    it('should return true for NEXUS commands', () => {
      expect(requiresNexus('analyze')).toBe(true);
      expect(requiresNexus('compare')).toBe(true);
      expect(requiresNexus('batch')).toBe(true);
    });

    it('should return false for DIRECT commands', () => {
      expect(requiresNexus('health')).toBe(false);
      expect(requiresNexus('version')).toBe(false);
      expect(requiresNexus('export')).toBe(false);
    });
  });

  describe('requiresAudit()', () => {
    it('should return true for commands requiring audit', () => {
      expect(requiresAudit('analyze')).toBe(true);
      expect(requiresAudit('compare')).toBe(true);
      expect(requiresAudit('batch')).toBe(true);
    });

    it('should return false for commands not requiring audit', () => {
      expect(requiresAudit('health')).toBe(false);
      expect(requiresAudit('version')).toBe(false);
      expect(requiresAudit('info')).toBe(false);
      expect(requiresAudit('export')).toBe(false);
    });
  });

  describe('enforceContract() - INV-CLI-05', () => {
    it('should validate correct routing', () => {
      const result = enforceContract('analyze', ROUTING.NEXUS);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject incorrect routing', () => {
      const result = enforceContract('analyze', ROUTING.DIRECT);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Routing violation');
    });

    it('should reject unknown command', () => {
      const result = enforceContract('nonexistent', ROUTING.NEXUS);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown command');
    });
  });

  describe('ROUTING_POLICY', () => {
    it('should document DIRECT policy', () => {
      expect(ROUTING_POLICY.DIRECT).toBeDefined();
      expect(ROUTING_POLICY.DIRECT.description).toBeDefined();
      expect(ROUTING_POLICY.DIRECT.audit).toBe(false);
    });

    it('should document NEXUS policy', () => {
      expect(ROUTING_POLICY.NEXUS).toBeDefined();
      expect(ROUTING_POLICY.NEXUS.description).toBeDefined();
      expect(ROUTING_POLICY.NEXUS.audit).toBe(true);
    });

    it('should include examples', () => {
      expect(Array.isArray(ROUTING_POLICY.DIRECT.examples)).toBe(true);
      expect(Array.isArray(ROUTING_POLICY.NEXUS.examples)).toBe(true);
      expect(ROUTING_POLICY.NEXUS.examples.length).toBeGreaterThan(0);
    });
  });
});
