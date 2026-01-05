/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — NEXUS (FACADE)
 * Point d'entrée unique orchestrant tout
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Nexus responsibilities:
 * - Single entry point for all module calls
 * - Orchestrate: validate → guard → route → execute → audit
 * - Maintain chronicle
 * - Support replay
 * - NO BYPASS POSSIBLE
 */

import {
  NexusRequest,
  NexusResponse,
  NexusError,
  NexusErrorCode,
  GuardContext,
  ReplayResult,
  createNexusError,
  createSuccessResponse,
  createErrorResponse,
  NEXUS_VERSION,
} from './types';
import { validate, formatValidationErrors, getPrimaryErrorCode } from './validator';
import { applyGuards, createDefaultContext, createContextWithSnapshot } from './guard';
import { route, registerAdapter } from './router';
import { execute } from './executor';
import { createAuditEntry, createAuditSummary } from './audit';
import { Chronicle, getGlobalChronicle } from './chronicle';
import { replay as replayEntry, generateReplayReport } from './replay';

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface NexusConfig {
  /** Maximum entries in chronicle */
  maxChronicleEntries?: number;
  /** Default timeout in ms */
  defaultTimeout?: number;
  /** Whether to use global chronicle */
  useGlobalChronicle?: boolean;
}

const DEFAULT_CONFIG: Required<NexusConfig> = {
  maxChronicleEntries: 10000,
  defaultTimeout: 15000,
  useGlobalChronicle: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Nexus - Universal Authority Module
 * 
 * ALL module calls MUST go through Nexus.call()
 * NO BYPASS POSSIBLE
 */
export class Nexus {
  private readonly config: Required<NexusConfig>;
  private readonly chronicle: Chronicle;
  private guardContext: GuardContext;
  private requestCount: number = 0;
  
  constructor(config: NexusConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.chronicle = this.config.useGlobalChronicle 
      ? getGlobalChronicle() 
      : new Chronicle({ maxEntries: this.config.maxChronicleEntries });
    
    this.guardContext = createDefaultContext();
  }
  
  /**
   * Main entry point - ALL calls go through here
   */
  async call<T>(request: NexusRequest): Promise<NexusResponse<T>> {
    const startTime = Date.now();
    const responseId = this.generateResponseId();
    
    // STEP 1: VALIDATE
    const validationResult = validate(request);
    if (!validationResult.valid) {
      const response = this.createErrorResponse<T>(
        request.request_id ?? 'unknown',
        responseId,
        createNexusError(
          getPrimaryErrorCode(validationResult.errors),
          formatValidationErrors(validationResult.errors),
          false,
          { errors: validationResult.errors }
        ),
        startTime,
        request
      );
      this.addToChronicle(request, response, NEXUS_VERSION);
      return response;
    }
    
    // STEP 2: GUARD
    const guardResult = applyGuards(request, this.guardContext);
    if (!guardResult.passed) {
      const response = this.createErrorResponse<T>(
        request.request_id,
        responseId,
        guardResult.error!,
        startTime,
        request
      );
      this.addToChronicle(request, response, NEXUS_VERSION);
      return response;
    }
    
    // STEP 3: ROUTE
    const routingResult = route(request);
    if (!routingResult.success || !routingResult.decision) {
      const response = this.createErrorResponse<T>(
        request.request_id,
        responseId,
        routingResult.error!,
        startTime,
        request
      );
      this.addToChronicle(request, response, NEXUS_VERSION);
      return response;
    }
    
    // STEP 4: EXECUTE
    const executionResult = await execute<T>(request, routingResult.decision);
    const duration_ms = Date.now() - startTime;
    
    // STEP 5: AUDIT
    const audit = createAuditSummary(
      request,
      executionResult.success ? executionResult.data : executionResult.error,
      duration_ms,
      executionResult.adapter_version ?? NEXUS_VERSION
    );
    
    let response: NexusResponse<T>;
    
    if (executionResult.success) {
      response = createSuccessResponse(
        request.request_id,
        responseId,
        executionResult.data!,
        audit
      );
      
      // Update guard context for successful ORACLE calls
      if (request.module === 'ORACLE' && request.action === 'analyze') {
        this.guardContext = createContextWithSnapshot(this.guardContext);
      }
    } else {
      response = createErrorResponse(
        request.request_id,
        responseId,
        executionResult.error!,
        audit
      );
    }
    
    // STEP 6: CHRONICLE
    this.addToChronicle(request, response, executionResult.adapter_version ?? NEXUS_VERSION);
    
    return response;
  }
  
  /**
   * Add entry to chronicle
   */
  private addToChronicle(request: NexusRequest, response: NexusResponse<unknown>, moduleVersion: string): void {
    try {
      const auditEntry = createAuditEntry(request, response, moduleVersion);
      this.chronicle.append(auditEntry);
      this.requestCount++;
    } catch (error) {
      // Chronicle failure should not break the call
      console.error('Chronicle append failed:', error);
    }
  }
  
  /**
   * Get the chronicle
   */
  getChronicle(): Chronicle {
    return this.chronicle;
  }
  
  /**
   * Replay from chronicle entry ID
   */
  async replay(entryId: string): Promise<ReplayResult | null> {
    const entry = this.chronicle.getEntry(entryId);
    if (!entry) {
      return null;
    }
    return replayEntry(entry);
  }
  
  /**
   * Set ORACLE snapshot status
   */
  setOracleSnapshot(has: boolean): void {
    this.guardContext = has 
      ? createContextWithSnapshot(this.guardContext)
      : createDefaultContext(this.guardContext);
  }
  
  /**
   * Get current guard context
   */
  getGuardContext(): GuardContext {
    return { ...this.guardContext };
  }
  
  /**
   * Update guard context
   */
  updateGuardContext(updates: Partial<GuardContext>): void {
    this.guardContext = { ...this.guardContext, ...updates };
  }
  
  /**
   * Get statistics
   */
  getStats(): NexusStats {
    return {
      totalRequests: this.requestCount,
      chronicleEntries: this.chronicle.length,
      successRate: this.chronicle.getSuccessRate(),
      averageDuration: this.chronicle.getAverageDuration(),
      version: NEXUS_VERSION,
    };
  }
  
  /**
   * Generate response ID
   */
  private generateResponseId(): string {
    // Simple UUID-like generation
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(16).substring(2, 10);
    const count = this.requestCount.toString(16).padStart(4, '0');
    
    return `${timestamp}-${random}-4${count.substring(0, 3)}-8${count.substring(1, 4)}-${random}${timestamp.substring(0, 4)}`;
  }
  
  /**
   * Create error response with audit
   */
  private createErrorResponse<T>(
    requestId: string,
    responseId: string,
    error: NexusError,
    startTime: number,
    request: NexusRequest
  ): NexusResponse<T> {
    const duration_ms = Date.now() - startTime;
    const audit = createAuditSummary(request, error, duration_ms, NEXUS_VERSION);
    return createErrorResponse(requestId, responseId, error, audit);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NexusStats {
  totalRequests: number;
  chronicleEntries: number;
  successRate: number;
  averageDuration: number;
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let globalNexus: Nexus | null = null;

/**
 * Get global Nexus instance
 */
export function getGlobalNexus(config?: NexusConfig): Nexus {
  if (!globalNexus) {
    globalNexus = new Nexus(config);
  }
  return globalNexus;
}

/**
 * Reset global Nexus (for testing)
 */
export function resetGlobalNexus(): void {
  globalNexus = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick call through global nexus
 */
export async function nexusCall<T>(request: NexusRequest): Promise<NexusResponse<T>> {
  return getGlobalNexus().call<T>(request);
}

// Re-export registerAdapter for convenience
export { registerAdapter };
