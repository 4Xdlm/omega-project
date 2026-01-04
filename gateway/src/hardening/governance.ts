/**
 * OMEGA GOVERNANCE SYSTEM
 * ======================
 * NASA-Grade L4 / DO-178C / AS9100D
 * 
 * INV-GOV-01: Rôles strictement définis
 * INV-GOV-02: Permissions explicites et immuables
 * INV-GOV-03: Validation humaine obligatoire pour actions critiques
 * INV-GOV-04: Refus par défaut (FAIL-SAFE)
 * INV-GOV-05: Traçabilité complète de chaque décision
 * 
 * @module governance
 * @version 1.0.0
 * @author Claude (IA Principal OMEGA)
 * @authority Francky (Architecte Suprême)
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Rôles disponibles dans le système OMEGA
 * Hiérarchie stricte: USER < AUDITOR < ADMIN < ARCHITECT
 */
export type Role = 'USER' | 'AUDITOR' | 'ADMIN' | 'ARCHITECT';

/**
 * Niveaux de criticité des actions
 */
export type CriticalityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Résultat d'une vérification de permission
 */
export type PermissionResult = 
  | { granted: true; role: Role; action: string }
  | { granted: false; role: Role; action: string; reason: string };

/**
 * Matrice de permissions par rôle
 */
export interface PermissionSet {
  readonly read: boolean;
  readonly write: boolean;
  readonly config: boolean;
  readonly validate: boolean;
  readonly override: boolean;
  readonly delete: boolean;
}

/**
 * Action soumise à validation
 */
export interface ActionRequest {
  readonly id: string;
  readonly role: Role;
  readonly action: string;
  readonly target: string;
  readonly criticality: CriticalityLevel;
  readonly timestamp: string;
  readonly justification?: string;
}

/**
 * Résultat d'une action
 */
export interface ActionResult {
  readonly request: ActionRequest;
  readonly granted: boolean;
  readonly reason: string;
  readonly humanValidationRequired: boolean;
  readonly hash: string;
}

/**
 * Contexte de gouvernance (injectable pour tests)
 */
export interface GovernanceContext {
  readonly currentRole: Role;
  readonly sessionId: string;
  readonly timestamp: () => string;
  readonly generateId: () => string;
  readonly computeHash: (data: string) => string;
}

// ============================================================================
// CONSTANTES IMMUABLES (INV-GOV-02)
// ============================================================================

/**
 * Matrice de permissions par rôle
 * FROZEN - Aucune modification runtime autorisée
 */
export const PERMISSIONS: Readonly<Record<Role, PermissionSet>> = Object.freeze({
  USER: Object.freeze({
    read: true,
    write: true,
    config: false,
    validate: false,
    override: false,
    delete: false,
  }),
  AUDITOR: Object.freeze({
    read: true,
    write: false,
    config: false,
    validate: false,
    override: false,
    delete: false,
  }),
  ADMIN: Object.freeze({
    read: true,
    write: true,
    config: true,
    validate: false,
    override: false,
    delete: false,
  }),
  ARCHITECT: Object.freeze({
    read: true,
    write: true,
    config: true,
    validate: true,
    override: true,
    delete: true,
  }),
});

/**
 * Actions nécessitant validation humaine obligatoire
 * Peu importe le rôle - HUMAN-IN-THE-LOOP
 */
export const HUMAN_VALIDATION_REQUIRED: ReadonlySet<string> = Object.freeze(new Set([
  'DELETE_PROJECT',
  'DELETE_RUN',
  'OVERRIDE_INVARIANT',
  'MODIFY_CANON',
  'BYPASS_TRUTH_GATE',
  'FORCE_VALIDATION',
  'EXPORT_SENSITIVE',
  'MODIFY_GOVERNANCE',
]));

/**
 * Actions strictement interdites (même pour ARCHITECT)
 * Ligne rouge absolue
 */
export const FORBIDDEN_ACTIONS: ReadonlySet<string> = Object.freeze(new Set([
  'DISABLE_LOGGING',
  'DISABLE_HASH_VERIFICATION',
  'MODIFY_FROZEN_INVARIANT',
  'BYPASS_ALL_GATES',
  'DELETE_AUDIT_TRAIL',
  'IMPERSONATE_ROLE',
]));

/**
 * Hiérarchie des rôles (pour comparaison)
 */
export const ROLE_HIERARCHY: Readonly<Record<Role, number>> = Object.freeze({
  USER: 0,
  AUDITOR: 1,
  ADMIN: 2,
  ARCHITECT: 3,
});

// ============================================================================
// FONCTIONS CORE
// ============================================================================

/**
 * Vérifie si un rôle a une permission spécifique
 * INV-GOV-01: Vérification déterministe
 * 
 * @param role - Rôle à vérifier
 * @param permission - Permission demandée
 * @returns true si autorisé, false sinon
 */
export function hasPermission(
  role: Role,
  permission: keyof PermissionSet
): boolean {
  const perms = PERMISSIONS[role];
  if (!perms) {
    return false; // Rôle inconnu = REFUS (INV-GOV-04)
  }
  return perms[permission] === true;
}

/**
 * Vérifie si une action est autorisée pour un rôle
 * INV-GOV-04: Refus par défaut
 * 
 * @param role - Rôle demandeur
 * @param action - Action demandée
 * @returns Résultat détaillé de la vérification
 */
export function checkPermission(
  role: Role,
  action: string
): PermissionResult {
  // Ligne rouge: actions interdites
  if (FORBIDDEN_ACTIONS.has(action)) {
    return {
      granted: false,
      role,
      action,
      reason: `FORBIDDEN: Action '${action}' is strictly prohibited for all roles`,
    };
  }

  // Mapping action -> permission requise
  const requiredPermission = mapActionToPermission(action);
  
  if (!requiredPermission) {
    return {
      granted: false,
      role,
      action,
      reason: `UNKNOWN: Action '${action}' is not recognized`,
    };
  }

  const granted = hasPermission(role, requiredPermission);
  
  if (granted) {
    return { granted: true, role, action };
  }
  
  return {
    granted: false,
    role,
    action,
    reason: `DENIED: Role '${role}' lacks '${requiredPermission}' permission for action '${action}'`,
  };
}

/**
 * Mappe une action à la permission requise
 * @internal
 */
function mapActionToPermission(action: string): keyof PermissionSet | null {
  const actionUpper = action.toUpperCase();
  
  // Actions de lecture
  if (actionUpper.startsWith('READ_') || 
      actionUpper.startsWith('GET_') || 
      actionUpper.startsWith('LIST_') ||
      actionUpper.startsWith('VIEW_') ||
      actionUpper.startsWith('AUDIT_')) {
    return 'read';
  }
  
  // Actions d'écriture
  if (actionUpper.startsWith('WRITE_') || 
      actionUpper.startsWith('CREATE_') || 
      actionUpper.startsWith('UPDATE_') ||
      actionUpper.startsWith('SAVE_') ||
      actionUpper.startsWith('ADD_')) {
    return 'write';
  }
  
  // Actions de configuration
  if (actionUpper.startsWith('CONFIG_') || 
      actionUpper.startsWith('SET_') || 
      actionUpper.startsWith('CONFIGURE_')) {
    return 'config';
  }
  
  // Actions de validation
  if (actionUpper.startsWith('VALIDATE_') || 
      actionUpper.startsWith('APPROVE_') || 
      actionUpper.startsWith('CERTIFY_')) {
    return 'validate';
  }
  
  // Actions de suppression
  if (actionUpper.startsWith('DELETE_') || 
      actionUpper.startsWith('REMOVE_') || 
      actionUpper.startsWith('PURGE_')) {
    return 'delete';
  }
  
  // Actions de bypass/override
  if (actionUpper.startsWith('OVERRIDE_') || 
      actionUpper.startsWith('BYPASS_') || 
      actionUpper.startsWith('FORCE_')) {
    return 'override';
  }
  
  return null;
}

/**
 * Vérifie si une action nécessite validation humaine
 * INV-GOV-03: Human-in-the-loop obligatoire
 * 
 * @param action - Action à vérifier
 * @returns true si validation humaine requise
 */
export function requiresHumanValidation(action: string): boolean {
  return HUMAN_VALIDATION_REQUIRED.has(action.toUpperCase());
}

/**
 * Vérifie si une action est strictement interdite
 * 
 * @param action - Action à vérifier
 * @returns true si action interdite
 */
export function isForbidden(action: string): boolean {
  return FORBIDDEN_ACTIONS.has(action.toUpperCase());
}

/**
 * Compare deux rôles dans la hiérarchie
 * 
 * @param role1 - Premier rôle
 * @param role2 - Second rôle
 * @returns -1 si role1 < role2, 0 si égaux, 1 si role1 > role2
 */
export function compareRoles(role1: Role, role2: Role): -1 | 0 | 1 {
  const h1 = ROLE_HIERARCHY[role1];
  const h2 = ROLE_HIERARCHY[role2];
  
  if (h1 < h2) return -1;
  if (h1 > h2) return 1;
  return 0;
}

// ============================================================================
// CLASSE GOVERNANCE ENGINE
// ============================================================================

/**
 * Moteur de gouvernance OMEGA
 * Gère les autorisations et la traçabilité
 */
export class GovernanceEngine {
  private readonly context: GovernanceContext;
  private readonly actionLog: ActionResult[] = [];

  constructor(context: GovernanceContext) {
    this.context = Object.freeze({ ...context });
  }

  /**
   * Demande d'exécution d'une action
   * INV-GOV-05: Traçabilité complète
   * 
   * @param action - Action demandée
   * @param target - Cible de l'action
   * @param criticality - Niveau de criticité
   * @param justification - Justification (optionnelle mais recommandée)
   * @returns Résultat de l'action
   */
  requestAction(
    action: string,
    target: string,
    criticality: CriticalityLevel = 'LOW',
    justification?: string
  ): ActionResult {
    const request: ActionRequest = {
      id: this.context.generateId(),
      role: this.context.currentRole,
      action: action.toUpperCase(),
      target,
      criticality,
      timestamp: this.context.timestamp(),
      justification,
    };

    // Vérification permission
    const permResult = checkPermission(request.role, request.action);
    
    // Construction du résultat
    const result: ActionResult = {
      request,
      granted: permResult.granted,
      reason: permResult.granted 
        ? 'GRANTED' 
        : (permResult as { reason: string }).reason,
      humanValidationRequired: requiresHumanValidation(request.action),
      hash: this.computeResultHash(request, permResult.granted),
    };

    // Log de l'action (traçabilité)
    this.actionLog.push(result);

    return result;
  }

  /**
   * Récupère l'historique des actions
   * @returns Copie immutable du log
   */
  getActionLog(): readonly ActionResult[] {
    return Object.freeze([...this.actionLog]);
  }

  /**
   * Exporte l'audit trail complet
   * @returns JSON stringifié du log
   */
  exportAuditTrail(): string {
    return JSON.stringify(this.actionLog, null, 2);
  }

  /**
   * Calcule le hash d'un résultat d'action
   * @internal
   */
  private computeResultHash(request: ActionRequest, granted: boolean): string {
    const data = JSON.stringify({
      id: request.id,
      role: request.role,
      action: request.action,
      target: request.target,
      timestamp: request.timestamp,
      granted,
    });
    return this.context.computeHash(data);
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Crée un contexte de gouvernance par défaut
 * À utiliser en production
 */
export function createDefaultContext(
  role: Role,
  sessionId: string
): GovernanceContext {
  return {
    currentRole: role,
    sessionId,
    timestamp: () => new Date().toISOString(),
    generateId: () => crypto.randomUUID(),
    computeHash: (data: string) => {
      // Simple hash pour démo - en prod utiliser crypto.subtle
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    },
  };
}

/**
 * Crée un contexte de test (déterministe)
 * INV-HARD-01: Pas de Date.now() implicite
 */
export function createTestContext(
  role: Role,
  sessionId: string = 'TEST-SESSION',
  fixedTimestamp: string = '2026-01-04T12:00:00.000Z'
): GovernanceContext {
  let idCounter = 0;
  return {
    currentRole: role,
    sessionId,
    timestamp: () => fixedTimestamp,
    generateId: () => `TEST-${String(++idCounter).padStart(6, '0')}`,
    computeHash: (data: string) => {
      // Hash déterministe pour tests
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    },
  };
}
