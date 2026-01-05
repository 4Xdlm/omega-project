/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — ROUTER
 * Policy-based routing simple
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Routing responsibilities:
 * - Resolve target module from request
 * - Validate action is valid for module
 * - Create adapter identifier for execution
 * - Deterministic routing (same input = same route)
 */

import {
  NexusRequest,
  ModuleTarget,
  RoutingDecision,
  ModuleAdapter,
  NexusErrorCode,
  createNexusError,
  NexusError,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid actions per module
 */
const MODULE_ACTIONS: Record<ModuleTarget, string[]> = {
  PIPELINE: ['run', 'segment', 'aggregate'],
  ORACLE: ['analyze'],
  MUSE: ['suggest', 'assess', 'project'],
};

/**
 * Module adapter identifiers
 */
const MODULE_ADAPTERS: Record<ModuleTarget, string> = {
  PIPELINE: 'omega-pipeline-adapter',
  ORACLE: 'omega-oracle-v2-adapter',
  MUSE: 'omega-muse-divine-adapter',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoutingResult {
  success: boolean;
  decision?: RoutingDecision;
  error?: NexusError;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ROUTING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Route a request to the appropriate module
 * @param request - Validated NexusRequest
 * @returns Routing decision or error
 */
export function route(request: NexusRequest): RoutingResult {
  const { module, action } = request;
  
  // Validate module exists
  if (!isValidModule(module)) {
    return {
      success: false,
      error: createNexusError(
        NexusErrorCode.ROUTING_ERROR,
        `Unknown module: ${module}`,
        false,
        { module }
      ),
    };
  }
  
  // Validate action is valid for module
  if (!isValidAction(module, action)) {
    return {
      success: false,
      error: createNexusError(
        NexusErrorCode.ROUTING_ERROR,
        `Invalid action '${action}' for module '${module}'. Valid actions: ${MODULE_ACTIONS[module].join(', ')}`,
        false,
        { module, action, valid_actions: MODULE_ACTIONS[module] }
      ),
    };
  }
  
  // Create routing decision
  const decision: RoutingDecision = {
    target: module,
    action: action,
    adapter_id: MODULE_ADAPTERS[module],
  };
  
  return {
    success: true,
    decision,
  };
}

/**
 * Check if module is valid
 */
export function isValidModule(module: string): module is ModuleTarget {
  return module in MODULE_ACTIONS;
}

/**
 * Check if action is valid for module
 */
export function isValidAction(module: ModuleTarget, action: string): boolean {
  return MODULE_ACTIONS[module]?.includes(action) ?? false;
}

/**
 * Get valid actions for a module
 */
export function getValidActions(module: ModuleTarget): string[] {
  return MODULE_ACTIONS[module] ?? [];
}

/**
 * Get adapter ID for a module
 */
export function getAdapterId(module: ModuleTarget): string {
  return MODULE_ADAPTERS[module];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adapter registry - maps adapter IDs to adapter factories
 */
const adapterRegistry: Map<string, () => ModuleAdapter> = new Map();

/**
 * Register an adapter factory
 */
export function registerAdapter(adapterId: string, factory: () => ModuleAdapter): void {
  adapterRegistry.set(adapterId, factory);
}

/**
 * Resolve adapter from routing decision
 */
export function resolveAdapter(decision: RoutingDecision): ModuleAdapter | null {
  const factory = adapterRegistry.get(decision.adapter_id);
  if (!factory) {
    return null;
  }
  return factory();
}

/**
 * Check if adapter is registered
 */
export function hasAdapter(adapterId: string): boolean {
  return adapterRegistry.has(adapterId);
}

/**
 * Clear all registered adapters (for testing)
 */
export function clearAdapters(): void {
  adapterRegistry.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format route string for audit
 * @returns Format: "MODULE.action"
 */
export function formatRoute(module: ModuleTarget, action: string): string {
  return `${module}.${action}`;
}

/**
 * Parse route string
 */
export function parseRoute(route: string): { module: ModuleTarget; action: string } | null {
  const parts = route.split('.');
  if (parts.length !== 2) {
    return null;
  }
  
  const [module, action] = parts;
  
  if (!isValidModule(module)) {
    return null;
  }
  
  if (!isValidAction(module as ModuleTarget, action)) {
    return null;
  }
  
  return { module: module as ModuleTarget, action };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify routing is deterministic
 * Same request = same routing decision
 */
export function verifyDeterminism(request: NexusRequest): boolean {
  const result1 = route(request);
  const result2 = route(request);
  
  if (result1.success !== result2.success) {
    return false;
  }
  
  if (result1.success && result2.success) {
    return (
      result1.decision!.target === result2.decision!.target &&
      result1.decision!.action === result2.decision!.action &&
      result1.decision!.adapter_id === result2.decision!.adapter_id
    );
  }
  
  return true;
}
