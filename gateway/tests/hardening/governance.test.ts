/**
 * OMEGA GOVERNANCE TESTS
 * ======================
 * NASA-Grade L4 / DO-178C / AS9100D
 * 
 * Tests exhaustifs pour le système de gouvernance
 * Couvre: INV-GOV-01 à INV-GOV-05
 * 
 * @module governance.test
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Role,
  PermissionSet,
  PERMISSIONS,
  HUMAN_VALIDATION_REQUIRED,
  FORBIDDEN_ACTIONS,
  ROLE_HIERARCHY,
  hasPermission,
  checkPermission,
  requiresHumanValidation,
  isForbidden,
  compareRoles,
  GovernanceEngine,
  createTestContext,
  createDefaultContext,
} from '../../src/hardening/governance';

// ============================================================================
// INV-GOV-01: RÔLES STRICTEMENT DÉFINIS
// ============================================================================

describe('INV-GOV-01: Rôles strictement définis', () => {
  
  it('should define exactly 4 roles', () => {
    const roles: Role[] = ['USER', 'AUDITOR', 'ADMIN', 'ARCHITECT'];
    expect(Object.keys(PERMISSIONS)).toHaveLength(4);
    roles.forEach(role => {
      expect(PERMISSIONS[role]).toBeDefined();
    });
  });

  it('should have immutable role definitions', () => {
    expect(() => {
      (PERMISSIONS as any).HACKER = { read: true };
    }).toThrow();
  });

  it('should have immutable permission sets', () => {
    expect(() => {
      (PERMISSIONS.USER as any).delete = true;
    }).toThrow();
  });

  it('should define strict hierarchy USER < AUDITOR < ADMIN < ARCHITECT', () => {
    expect(ROLE_HIERARCHY.USER).toBeLessThan(ROLE_HIERARCHY.AUDITOR);
    expect(ROLE_HIERARCHY.AUDITOR).toBeLessThan(ROLE_HIERARCHY.ADMIN);
    expect(ROLE_HIERARCHY.ADMIN).toBeLessThan(ROLE_HIERARCHY.ARCHITECT);
  });

  it('should compare roles correctly', () => {
    expect(compareRoles('USER', 'ADMIN')).toBe(-1);
    expect(compareRoles('ARCHITECT', 'USER')).toBe(1);
    expect(compareRoles('ADMIN', 'ADMIN')).toBe(0);
  });
});

// ============================================================================
// INV-GOV-02: PERMISSIONS EXPLICITES ET IMMUABLES
// ============================================================================

describe('INV-GOV-02: Permissions explicites et immuables', () => {

  describe('USER permissions', () => {
    it('should allow read', () => {
      expect(hasPermission('USER', 'read')).toBe(true);
    });

    it('should allow write', () => {
      expect(hasPermission('USER', 'write')).toBe(true);
    });

    it('should deny config', () => {
      expect(hasPermission('USER', 'config')).toBe(false);
    });

    it('should deny validate', () => {
      expect(hasPermission('USER', 'validate')).toBe(false);
    });

    it('should deny override', () => {
      expect(hasPermission('USER', 'override')).toBe(false);
    });

    it('should deny delete', () => {
      expect(hasPermission('USER', 'delete')).toBe(false);
    });
  });

  describe('AUDITOR permissions', () => {
    it('should allow read only', () => {
      expect(hasPermission('AUDITOR', 'read')).toBe(true);
      expect(hasPermission('AUDITOR', 'write')).toBe(false);
      expect(hasPermission('AUDITOR', 'config')).toBe(false);
      expect(hasPermission('AUDITOR', 'validate')).toBe(false);
      expect(hasPermission('AUDITOR', 'override')).toBe(false);
      expect(hasPermission('AUDITOR', 'delete')).toBe(false);
    });
  });

  describe('ADMIN permissions', () => {
    it('should allow read, write, config', () => {
      expect(hasPermission('ADMIN', 'read')).toBe(true);
      expect(hasPermission('ADMIN', 'write')).toBe(true);
      expect(hasPermission('ADMIN', 'config')).toBe(true);
    });

    it('should deny validate, override, delete', () => {
      expect(hasPermission('ADMIN', 'validate')).toBe(false);
      expect(hasPermission('ADMIN', 'override')).toBe(false);
      expect(hasPermission('ADMIN', 'delete')).toBe(false);
    });
  });

  describe('ARCHITECT permissions', () => {
    it('should allow all permissions', () => {
      expect(hasPermission('ARCHITECT', 'read')).toBe(true);
      expect(hasPermission('ARCHITECT', 'write')).toBe(true);
      expect(hasPermission('ARCHITECT', 'config')).toBe(true);
      expect(hasPermission('ARCHITECT', 'validate')).toBe(true);
      expect(hasPermission('ARCHITECT', 'override')).toBe(true);
      expect(hasPermission('ARCHITECT', 'delete')).toBe(true);
    });
  });

  describe('Unknown role handling', () => {
    it('should deny all permissions for unknown role', () => {
      expect(hasPermission('HACKER' as Role, 'read')).toBe(false);
      expect(hasPermission('HACKER' as Role, 'write')).toBe(false);
    });
  });
});

// ============================================================================
// INV-GOV-03: VALIDATION HUMAINE OBLIGATOIRE
// ============================================================================

describe('INV-GOV-03: Validation humaine obligatoire pour actions critiques', () => {

  it('should require human validation for DELETE_PROJECT', () => {
    expect(requiresHumanValidation('DELETE_PROJECT')).toBe(true);
  });

  it('should require human validation for DELETE_RUN', () => {
    expect(requiresHumanValidation('DELETE_RUN')).toBe(true);
  });

  it('should require human validation for OVERRIDE_INVARIANT', () => {
    expect(requiresHumanValidation('OVERRIDE_INVARIANT')).toBe(true);
  });

  it('should require human validation for MODIFY_CANON', () => {
    expect(requiresHumanValidation('MODIFY_CANON')).toBe(true);
  });

  it('should require human validation for BYPASS_TRUTH_GATE', () => {
    expect(requiresHumanValidation('BYPASS_TRUTH_GATE')).toBe(true);
  });

  it('should require human validation for FORCE_VALIDATION', () => {
    expect(requiresHumanValidation('FORCE_VALIDATION')).toBe(true);
  });

  it('should require human validation for EXPORT_SENSITIVE', () => {
    expect(requiresHumanValidation('EXPORT_SENSITIVE')).toBe(true);
  });

  it('should require human validation for MODIFY_GOVERNANCE', () => {
    expect(requiresHumanValidation('MODIFY_GOVERNANCE')).toBe(true);
  });

  it('should NOT require human validation for READ_PROJECT', () => {
    expect(requiresHumanValidation('READ_PROJECT')).toBe(false);
  });

  it('should NOT require human validation for WRITE_RUN', () => {
    expect(requiresHumanValidation('WRITE_RUN')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(requiresHumanValidation('delete_project')).toBe(true);
    expect(requiresHumanValidation('Delete_Project')).toBe(true);
  });

  it('should have exactly 8 actions requiring human validation', () => {
    expect(HUMAN_VALIDATION_REQUIRED.size).toBe(8);
  });
});

// ============================================================================
// INV-GOV-04: REFUS PAR DÉFAUT (FAIL-SAFE)
// ============================================================================

describe('INV-GOV-04: Refus par défaut (FAIL-SAFE)', () => {

  describe('Forbidden actions', () => {
    it('should forbid DISABLE_LOGGING for all roles', () => {
      expect(isForbidden('DISABLE_LOGGING')).toBe(true);
      expect(checkPermission('ARCHITECT', 'DISABLE_LOGGING').granted).toBe(false);
    });

    it('should forbid DISABLE_HASH_VERIFICATION for all roles', () => {
      expect(isForbidden('DISABLE_HASH_VERIFICATION')).toBe(true);
      expect(checkPermission('ARCHITECT', 'DISABLE_HASH_VERIFICATION').granted).toBe(false);
    });

    it('should forbid MODIFY_FROZEN_INVARIANT for all roles', () => {
      expect(isForbidden('MODIFY_FROZEN_INVARIANT')).toBe(true);
      expect(checkPermission('ARCHITECT', 'MODIFY_FROZEN_INVARIANT').granted).toBe(false);
    });

    it('should forbid BYPASS_ALL_GATES for all roles', () => {
      expect(isForbidden('BYPASS_ALL_GATES')).toBe(true);
      expect(checkPermission('ARCHITECT', 'BYPASS_ALL_GATES').granted).toBe(false);
    });

    it('should forbid DELETE_AUDIT_TRAIL for all roles', () => {
      expect(isForbidden('DELETE_AUDIT_TRAIL')).toBe(true);
      expect(checkPermission('ARCHITECT', 'DELETE_AUDIT_TRAIL').granted).toBe(false);
    });

    it('should forbid IMPERSONATE_ROLE for all roles', () => {
      expect(isForbidden('IMPERSONATE_ROLE')).toBe(true);
      expect(checkPermission('ARCHITECT', 'IMPERSONATE_ROLE').granted).toBe(false);
    });

    it('should have exactly 6 forbidden actions', () => {
      expect(FORBIDDEN_ACTIONS.size).toBe(6);
    });
  });

  describe('Unknown actions', () => {
    it('should deny unknown actions', () => {
      const result = checkPermission('ARCHITECT', 'UNKNOWN_ACTION');
      expect(result.granted).toBe(false);
      expect((result as any).reason).toContain('not recognized');
    });

    it('should deny malformed actions', () => {
      const result = checkPermission('ARCHITECT', '');
      expect(result.granted).toBe(false);
    });
  });

  describe('Permission checks', () => {
    it('should deny USER from DELETE_PROJECT', () => {
      const result = checkPermission('USER', 'DELETE_PROJECT');
      expect(result.granted).toBe(false);
      expect((result as any).reason).toContain('delete');
    });

    it('should deny AUDITOR from WRITE_RUN', () => {
      const result = checkPermission('AUDITOR', 'WRITE_RUN');
      expect(result.granted).toBe(false);
      expect((result as any).reason).toContain('write');
    });

    it('should allow ADMIN to CONFIG_SETTINGS', () => {
      const result = checkPermission('ADMIN', 'CONFIG_SETTINGS');
      expect(result.granted).toBe(true);
    });

    it('should allow ARCHITECT to DELETE_PROJECT', () => {
      const result = checkPermission('ARCHITECT', 'DELETE_PROJECT');
      expect(result.granted).toBe(true);
    });
  });
});

// ============================================================================
// INV-GOV-05: TRAÇABILITÉ COMPLÈTE
// ============================================================================

describe('INV-GOV-05: Traçabilité complète de chaque décision', () => {
  let engine: GovernanceEngine;

  beforeEach(() => {
    const context = createTestContext('ADMIN', 'TEST-SESSION-001');
    engine = new GovernanceEngine(context);
  });

  it('should generate unique IDs for each action', () => {
    const result1 = engine.requestAction('READ_PROJECT', '/project/1');
    const result2 = engine.requestAction('READ_PROJECT', '/project/2');
    
    expect(result1.request.id).not.toBe(result2.request.id);
  });

  it('should record timestamp for each action', () => {
    const result = engine.requestAction('READ_PROJECT', '/project/1');
    
    expect(result.request.timestamp).toBe('2026-01-04T12:00:00.000Z');
  });

  it('should record role for each action', () => {
    const result = engine.requestAction('READ_PROJECT', '/project/1');
    
    expect(result.request.role).toBe('ADMIN');
  });

  it('should compute hash for each action result', () => {
    const result = engine.requestAction('READ_PROJECT', '/project/1');
    
    expect(result.hash).toBeDefined();
    expect(result.hash.length).toBe(16);
  });

  it('should maintain action log', () => {
    engine.requestAction('READ_PROJECT', '/project/1');
    engine.requestAction('WRITE_RUN', '/run/1');
    engine.requestAction('CONFIG_SETTINGS', '/settings');
    
    const log = engine.getActionLog();
    expect(log).toHaveLength(3);
  });

  it('should return immutable action log', () => {
    engine.requestAction('READ_PROJECT', '/project/1');
    const log = engine.getActionLog();
    
    expect(() => {
      (log as any).push({});
    }).toThrow();
  });

  it('should export audit trail as JSON', () => {
    engine.requestAction('READ_PROJECT', '/project/1');
    
    const trail = engine.exportAuditTrail();
    const parsed = JSON.parse(trail);
    
    expect(parsed).toHaveLength(1);
    expect(parsed[0].request.action).toBe('READ_PROJECT');
  });

  it('should mark actions requiring human validation', () => {
    const result = engine.requestAction('DELETE_PROJECT', '/project/1');
    
    expect(result.humanValidationRequired).toBe(true);
  });

  it('should NOT mark normal actions as requiring human validation', () => {
    const result = engine.requestAction('READ_PROJECT', '/project/1');
    
    expect(result.humanValidationRequired).toBe(false);
  });

  it('should include justification when provided', () => {
    const result = engine.requestAction(
      'DELETE_RUN',
      '/run/1',
      'HIGH',
      'Run corrupted, must be removed'
    );
    
    expect(result.request.justification).toBe('Run corrupted, must be removed');
  });

  it('should record criticality level', () => {
    const result = engine.requestAction('DELETE_RUN', '/run/1', 'CRITICAL');
    
    expect(result.request.criticality).toBe('CRITICAL');
  });
});

// ============================================================================
// DÉTERMINISME (INV-HARD-01)
// ============================================================================

describe('INV-HARD-01: Déterminisme - pas de Date.now() implicite', () => {

  it('should use injected timestamp in test context', () => {
    const context = createTestContext('USER', 'SESSION', '2026-01-01T00:00:00.000Z');
    const engine = new GovernanceEngine(context);
    
    const result1 = engine.requestAction('READ_PROJECT', '/p1');
    const result2 = engine.requestAction('READ_PROJECT', '/p2');
    
    expect(result1.request.timestamp).toBe('2026-01-01T00:00:00.000Z');
    expect(result2.request.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should produce same hash for same input', () => {
    const context1 = createTestContext('USER', 'SESSION', '2026-01-01T00:00:00.000Z');
    const context2 = createTestContext('USER', 'SESSION', '2026-01-01T00:00:00.000Z');
    
    const engine1 = new GovernanceEngine(context1);
    const engine2 = new GovernanceEngine(context2);
    
    const result1 = engine1.requestAction('READ_PROJECT', '/project/1');
    const result2 = engine2.requestAction('READ_PROJECT', '/project/1');
    
    expect(result1.hash).toBe(result2.hash);
  });

  it('should produce deterministic IDs in test context', () => {
    const context1 = createTestContext('USER');
    const context2 = createTestContext('USER');
    
    const engine1 = new GovernanceEngine(context1);
    const engine2 = new GovernanceEngine(context2);
    
    engine1.requestAction('READ_PROJECT', '/p1');
    engine2.requestAction('READ_PROJECT', '/p1');
    
    const log1 = engine1.getActionLog();
    const log2 = engine2.getActionLog();
    
    expect(log1[0].request.id).toBe(log2[0].request.id);
  });
});

// ============================================================================
// EDGE CASES & ATTACK TESTS
// ============================================================================

describe('Edge cases & Attack tests', () => {

  it('should handle empty action string', () => {
    const result = checkPermission('ARCHITECT', '');
    expect(result.granted).toBe(false);
  });

  it('should handle action with special characters', () => {
    // Les caractères spéciaux dans l'action ne changent pas le mapping
    // READ_ est reconnu comme permission de lecture
    const result = checkPermission('ARCHITECT', 'READ_<script>alert(1)</script>');
    // ARCHITECT a la permission read, donc c'est autorisé
    expect(result.granted).toBe(true);
    
    // Mais une action sans préfixe reconnu est refusée
    const unknown = checkPermission('ARCHITECT', '<script>alert(1)</script>');
    expect(unknown.granted).toBe(false);
  });

  it('should handle very long action string', () => {
    const longAction = 'READ_' + 'A'.repeat(10000);
    const result = checkPermission('ARCHITECT', longAction);
    expect(result.granted).toBe(true); // READ_ prefix recognized
  });

  it('should handle unicode in action', () => {
    const result = checkPermission('ARCHITECT', 'READ_项目');
    expect(result.granted).toBe(true);
  });

  it('should handle null-like values gracefully', () => {
    const result = checkPermission('ARCHITECT', 'null');
    expect(result.granted).toBe(false);
  });

  it('should be case-insensitive for action mapping', () => {
    const result1 = checkPermission('USER', 'read_project');
    const result2 = checkPermission('USER', 'READ_PROJECT');
    const result3 = checkPermission('USER', 'Read_Project');
    
    expect(result1.granted).toBe(result2.granted);
    expect(result2.granted).toBe(result3.granted);
  });

  it('should prevent prototype pollution on PERMISSIONS', () => {
    // Tenter de polluer le prototype
    const originalProto = Object.getPrototypeOf(PERMISSIONS);
    
    // Vérifier que PERMISSIONS est frozen
    expect(Object.isFrozen(PERMISSIONS)).toBe(true);
    
    // Vérifier qu'on ne peut pas ajouter une propriété
    expect(() => {
      (PERMISSIONS as any).HACKER = { read: true };
    }).toThrow();
    
    // Vérifier que hasPermission refuse les rôles non définis
    // Note: hasPermission retourne false pour un rôle inexistant
    // car PERMISSIONS['HACKER'] est undefined
    expect(PERMISSIONS['HACKER' as Role]).toBeUndefined();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration tests', () => {

  it('should handle complete workflow: USER creating and reading runs', () => {
    const context = createTestContext('USER');
    const engine = new GovernanceEngine(context);
    
    // User can read
    const read = engine.requestAction('READ_PROJECT', '/project/1');
    expect(read.granted).toBe(true);
    
    // User can write
    const write = engine.requestAction('WRITE_RUN', '/run/1');
    expect(write.granted).toBe(true);
    
    // User cannot delete
    const del = engine.requestAction('DELETE_RUN', '/run/1');
    expect(del.granted).toBe(false);
    
    // User cannot config
    const config = engine.requestAction('CONFIG_SETTINGS', '/settings');
    expect(config.granted).toBe(false);
    
    // All actions logged
    expect(engine.getActionLog()).toHaveLength(4);
  });

  it('should handle complete workflow: ARCHITECT with full access', () => {
    const context = createTestContext('ARCHITECT');
    const engine = new GovernanceEngine(context);
    
    // Architect can do everything except forbidden
    const read = engine.requestAction('READ_PROJECT', '/project/1');
    const write = engine.requestAction('WRITE_RUN', '/run/1');
    const config = engine.requestAction('CONFIG_SETTINGS', '/settings');
    const validate = engine.requestAction('VALIDATE_RELEASE', '/release/1');
    const del = engine.requestAction('DELETE_RUN', '/run/1');
    
    expect(read.granted).toBe(true);
    expect(write.granted).toBe(true);
    expect(config.granted).toBe(true);
    expect(validate.granted).toBe(true);
    expect(del.granted).toBe(true);
    
    // But even ARCHITECT cannot disable logging
    const forbidden = engine.requestAction('DISABLE_LOGGING', '/system');
    expect(forbidden.granted).toBe(false);
  });

  it('should enforce human validation for critical actions even with permission', () => {
    const context = createTestContext('ARCHITECT');
    const engine = new GovernanceEngine(context);
    
    const result = engine.requestAction('DELETE_PROJECT', '/project/critical');
    
    // Permission granted (ARCHITECT can delete)
    expect(result.granted).toBe(true);
    // But human validation still required
    expect(result.humanValidationRequired).toBe(true);
  });
});
