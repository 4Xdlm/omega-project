/**
 * OMEGA GATEWAY — Core Implementation
 * Phase 17 — Unified Security Gateway Facade
 * 
 * Single entry point: Gateway.run(input, context)
 * Pipeline: RATE_LIMITER → SENTINEL → QUARANTINE → OUTPUT
 * 
 * INVARIANTS:
 * - INV-GW-01: Rate limit checked before validation
 * - INV-GW-02: Blocked input never reaches output
 * - INV-GW-03: Quarantine preserves original data
 * - INV-GW-04: Result always contains complete context
 * - INV-GW-05: Metrics accurate
 * - INV-GW-06: Deterministic processing
 */

import {
  GatewayStatus,
  GatewayStage,
  ThreatSeverity,
  ThreatCategory,
  DEFAULT_CONFIG,
  GATEWAY_VERSION,
} from './constants.js';

import type {
  GatewayConfig,
  GatewayContext,
  GatewayInput,
  GatewayResult,
  GatewayMetrics,
  Threat,
  RateLimitReport,
  ValidationReport,
  QuarantineReport,
  BeforeHook,
  AfterHook,
  ErrorHook,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY PATTERNS (from SENTINEL)
// ═══════════════════════════════════════════════════════════════════════════════

const SECURITY_PATTERNS: Array<{
  category: ThreatCategory;
  severity: ThreatSeverity;
  pattern: RegExp;
  description: string;
}> = [
  // XSS Patterns
  {
    category: ThreatCategory.XSS,
    severity: ThreatSeverity.HIGH,
    pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    description: 'Script tag detected',
  },
  {
    category: ThreatCategory.XSS,
    severity: ThreatSeverity.HIGH,
    pattern: /javascript\s*:/gi,
    description: 'JavaScript URI detected',
  },
  {
    category: ThreatCategory.XSS,
    severity: ThreatSeverity.MEDIUM,
    pattern: /on\w+\s*=\s*["'][^"']*["']/gi,
    description: 'Event handler attribute detected',
  },
  {
    category: ThreatCategory.XSS,
    severity: ThreatSeverity.MEDIUM,
    pattern: /<iframe[\s\S]*?>/gi,
    description: 'Iframe tag detected',
  },
  
  // SQL Injection Patterns
  {
    category: ThreatCategory.SQL_INJECTION,
    severity: ThreatSeverity.CRITICAL,
    pattern: /(\b(union|select|insert|update|delete|drop|alter|create|truncate)\b[\s\S]*\b(from|into|table|database)\b)/gi,
    description: 'SQL keyword combination detected',
  },
  {
    category: ThreatCategory.SQL_INJECTION,
    severity: ThreatSeverity.HIGH,
    pattern: /['"]?\s*(or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi,
    description: 'SQL injection pattern detected',
  },
  {
    category: ThreatCategory.SQL_INJECTION,
    severity: ThreatSeverity.HIGH,
    pattern: /;\s*(drop|delete|truncate|alter)\s+/gi,
    description: 'SQL statement termination attack',
  },
  {
    category: ThreatCategory.SQL_INJECTION,
    severity: ThreatSeverity.MEDIUM,
    pattern: /--\s*$/gm,
    description: 'SQL comment detected',
  },
  
  // Path Traversal Patterns
  {
    category: ThreatCategory.PATH_TRAVERSAL,
    severity: ThreatSeverity.HIGH,
    pattern: /\.\.[\/\\]/g,
    description: 'Directory traversal detected',
  },
  {
    category: ThreatCategory.PATH_TRAVERSAL,
    severity: ThreatSeverity.HIGH,
    pattern: /%2e%2e[%2f%5c]/gi,
    description: 'Encoded directory traversal detected',
  },
  {
    category: ThreatCategory.PATH_TRAVERSAL,
    severity: ThreatSeverity.MEDIUM,
    pattern: /\/etc\/passwd/gi,
    description: 'Sensitive file access attempt',
  },
  
  // Command Injection Patterns
  {
    category: ThreatCategory.COMMAND_INJECTION,
    severity: ThreatSeverity.CRITICAL,
    pattern: /[;&|`$]\s*(cat|ls|rm|mv|cp|wget|curl|bash|sh|python|perl|ruby|nc|netcat)\b/gi,
    description: 'Command injection detected',
  },
  {
    category: ThreatCategory.COMMAND_INJECTION,
    severity: ThreatSeverity.HIGH,
    pattern: /\$\([^)]+\)/g,
    description: 'Command substitution detected',
  },
  {
    category: ThreatCategory.COMMAND_INJECTION,
    severity: ThreatSeverity.HIGH,
    pattern: /`[^`]+`/g,
    description: 'Backtick command execution detected',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

const SEVERITY_ORDER: ThreatSeverity[] = [
  ThreatSeverity.NONE,
  ThreatSeverity.LOW,
  ThreatSeverity.MEDIUM,
  ThreatSeverity.HIGH,
  ThreatSeverity.CRITICAL,
];

function compareSeverity(a: ThreatSeverity, b: ThreatSeverity): number {
  return SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b);
}

function maxSeverity(threats: Threat[]): ThreatSeverity {
  if (threats.length === 0) return ThreatSeverity.NONE;
  return threats.reduce((max, t) => 
    compareSeverity(t.severity, max) > 0 ? t.severity : max,
    ThreatSeverity.NONE
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * OMEGA Gateway — Unified Security Entry Point
 * 
 * Pipeline: RATE_LIMITER → SENTINEL → QUARANTINE → OUTPUT
 */
export class Gateway {
  private config: GatewayConfig;
  private startTime: number;
  private rateLimitState: Map<string, { count: number; windowStart: number }>;
  private quarantine: Map<string, { data: unknown; reason: string; expiresAt: number }>;
  private idCounter: number;
  
  private metrics: {
    totalRequests: number;
    allowed: number;
    rateLimited: number;
    blocked: number;
    quarantined: number;
    errors: number;
    totalDurationMs: number;
    threatsByCategory: Record<ThreatCategory, number>;
  };
  
  private hooks: {
    before: BeforeHook[];
    after: AfterHook[];
    error: ErrorHook[];
  };

  constructor(config: Partial<GatewayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    this.rateLimitState = new Map();
    this.quarantine = new Map();
    this.idCounter = 0;
    
    this.metrics = {
      totalRequests: 0,
      allowed: 0,
      rateLimited: 0,
      blocked: 0,
      quarantined: 0,
      errors: 0,
      totalDurationMs: 0,
      threatsByCategory: Object.values(ThreatCategory).reduce(
        (acc, cat) => ({ ...acc, [cat]: 0 }),
        {} as Record<ThreatCategory, number>
      ),
    };
    
    this.hooks = {
      before: [],
      after: [],
      error: [],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process input through the gateway pipeline
   * INV-GW-01: Rate limit checked before validation
   * INV-GW-02: Blocked input never reaches output
   * INV-GW-06: Deterministic processing
   */
  async run(input: GatewayInput, context: GatewayContext): Promise<GatewayResult> {
    const startTime = performance.now();
    const stagesCompleted: GatewayStage[] = [];
    const reports: GatewayResult['reports'] = {};
    let threats: Threat[] = [];
    
    this.metrics.totalRequests++;
    
    try {
      // Run before hooks
      for (const hook of this.hooks.before) {
        await hook(input, context);
      }
      
      // ─────────────────────────────────────────────────────────────────────
      // STAGE 1: RATE LIMITING (INV-GW-01)
      // ─────────────────────────────────────────────────────────────────────
      
      if (this.config.rateLimitEnabled) {
        const rateLimitStart = performance.now();
        const rateLimitResult = this.checkRateLimit(context.clientId);
        
        reports.rateLimit = {
          stage: GatewayStage.RATE_LIMIT,
          allowed: rateLimitResult.allowed,
          currentCount: rateLimitResult.count,
          limit: this.config.rateLimit,
          remaining: Math.max(0, this.config.rateLimit - rateLimitResult.count),
          resetAt: new Date(rateLimitResult.resetAt).toISOString(),
          durationMs: performance.now() - rateLimitStart,
        };
        
        stagesCompleted.push(GatewayStage.RATE_LIMIT);
        
        if (!rateLimitResult.allowed) {
          this.metrics.rateLimited++;
          const result = this.buildResult(
            GatewayStatus.RATE_LIMITED,
            false,
            undefined,
            context,
            stagesCompleted,
            GatewayStage.RATE_LIMIT,
            reports,
            [],
            startTime
          );
          await this.runAfterHooks(result);
          return result;
        }
      }
      
      // ─────────────────────────────────────────────────────────────────────
      // STAGE 2: SECURITY VALIDATION
      // ─────────────────────────────────────────────────────────────────────
      
      if (this.config.validationEnabled) {
        const validationStart = performance.now();
        threats = this.validateInput(input);
        const maxSev = maxSeverity(threats);
        
        reports.validation = {
          stage: GatewayStage.VALIDATION,
          passed: threats.length === 0 || 
                  (!this.config.strictMode && compareSeverity(maxSev, ThreatSeverity.HIGH) < 0),
          threats,
          maxSeverity: maxSev,
          patternsChecked: SECURITY_PATTERNS.length,
          durationMs: performance.now() - validationStart,
        };
        
        stagesCompleted.push(GatewayStage.VALIDATION);
        
        // Update threat metrics
        for (const threat of threats) {
          this.metrics.threatsByCategory[threat.category]++;
        }
        
        // Block on critical threats or strict mode violations
        const shouldBlock = this.config.strictMode 
          ? threats.length > 0
          : compareSeverity(maxSev, ThreatSeverity.CRITICAL) >= 0;
        
        if (shouldBlock) {
          this.metrics.blocked++;
          const result = this.buildResult(
            GatewayStatus.BLOCKED,
            false,
            undefined,
            context,
            stagesCompleted,
            GatewayStage.VALIDATION,
            reports,
            threats,
            startTime
          );
          await this.runAfterHooks(result);
          return result;
        }
      }
      
      // ─────────────────────────────────────────────────────────────────────
      // STAGE 3: QUARANTINE (if needed)
      // ─────────────────────────────────────────────────────────────────────
      
      if (this.config.quarantineEnabled && threats.length > 0) {
        const quarantineStart = performance.now();
        const maxSev = maxSeverity(threats);
        const shouldQuarantine = compareSeverity(maxSev, this.config.quarantineThreshold) >= 0;
        
        if (shouldQuarantine) {
          const quarantineId = this.quarantineData(input.data, threats);
          
          reports.quarantine = {
            stage: GatewayStage.QUARANTINE,
            quarantined: true,
            quarantineId,
            reason: `Threat detected: ${maxSev}`,
            expiresAt: new Date(Date.now() + this.config.quarantineTtlMs).toISOString(),
            durationMs: performance.now() - quarantineStart,
          };
          
          stagesCompleted.push(GatewayStage.QUARANTINE);
          this.metrics.quarantined++;
          
          const result = this.buildResult(
            GatewayStatus.QUARANTINED,
            false,
            undefined,
            context,
            stagesCompleted,
            GatewayStage.QUARANTINE,
            reports,
            threats,
            startTime
          );
          await this.runAfterHooks(result);
          return result;
        }
        
        reports.quarantine = {
          stage: GatewayStage.QUARANTINE,
          quarantined: false,
          durationMs: performance.now() - quarantineStart,
        };
        stagesCompleted.push(GatewayStage.QUARANTINE);
      }
      
      // ─────────────────────────────────────────────────────────────────────
      // STAGE 4: ALLOWED OUTPUT
      // ─────────────────────────────────────────────────────────────────────
      
      stagesCompleted.push(GatewayStage.OUTPUT);
      this.metrics.allowed++;
      
      const result = this.buildResult(
        GatewayStatus.ALLOWED,
        true,
        input.data,
        context,
        stagesCompleted,
        undefined,
        reports,
        threats,
        startTime
      );
      
      await this.runAfterHooks(result);
      return result;
      
    } catch (error) {
      this.metrics.errors++;
      
      // Run error hooks
      for (const hook of this.hooks.error) {
        await hook(error instanceof Error ? error : new Error(String(error)), context);
      }
      
      return this.buildResult(
        GatewayStatus.ERROR,
        false,
        undefined,
        context,
        stagesCompleted,
        undefined,
        reports,
        threats,
        startTime
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ═══════════════════════════════════════════════════════════════════════════

  private checkRateLimit(clientId: string): { allowed: boolean; count: number; resetAt: number } {
    const now = Date.now();
    const state = this.rateLimitState.get(clientId);
    
    if (!state || now >= state.windowStart + this.config.rateWindowMs) {
      // New window
      this.rateLimitState.set(clientId, { count: 1, windowStart: now });
      return {
        allowed: 1 <= this.config.rateLimit,
        count: 1,
        resetAt: now + this.config.rateWindowMs,
      };
    }
    
    // Existing window
    state.count++;
    const allowed = state.count <= this.config.rateLimit;
    
    return {
      allowed,
      count: state.count,
      resetAt: state.windowStart + this.config.rateWindowMs,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private validateInput(input: GatewayInput): Threat[] {
    const threats: Threat[] = [];
    const content = this.extractContent(input.data);
    
    if (!content) return threats;
    
    for (const pattern of SECURITY_PATTERNS) {
      pattern.pattern.lastIndex = 0; // Reset regex state
      const match = pattern.pattern.exec(content);
      
      if (match) {
        threats.push({
          category: pattern.category,
          severity: pattern.severity,
          pattern: pattern.pattern.source.substring(0, 50),
          location: `index:${match.index}`,
          description: pattern.description,
        });
      }
    }
    
    return threats;
  }

  private extractContent(data: unknown): string | null {
    if (typeof data === 'string') return data;
    if (data === null || data === undefined) return null;
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data);
      } catch {
        return null;
      }
    }
    return String(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUARANTINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * INV-GW-03: Quarantine preserves original data
   */
  private quarantineData(data: unknown, threats: Threat[]): string {
    const id = this.generateId('QTN');
    const expiresAt = Date.now() + this.config.quarantineTtlMs;
    
    this.quarantine.set(id, {
      data: structuredClone(data), // Preserve original
      reason: threats.map(t => t.description).join('; '),
      expiresAt,
    });
    
    return id;
  }

  /**
   * Get quarantined item
   */
  getQuarantined(id: string): { data: unknown; reason: string } | null {
    const item = this.quarantine.get(id);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.quarantine.delete(id);
      return null;
    }
    return { data: item.data, reason: item.reason };
  }

  /**
   * Release from quarantine (requires explicit action)
   */
  releaseFromQuarantine(id: string): unknown | null {
    const item = this.quarantine.get(id);
    if (!item) return null;
    this.quarantine.delete(id);
    return item.data;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  onBefore(hook: BeforeHook): void {
    this.hooks.before.push(hook);
  }

  onAfter(hook: AfterHook): void {
    this.hooks.after.push(hook);
  }

  onError(hook: ErrorHook): void {
    this.hooks.error.push(hook);
  }

  private async runAfterHooks(result: GatewayResult): Promise<void> {
    for (const hook of this.hooks.after) {
      await hook(result);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get gateway metrics
   * INV-GW-05: Metrics accurate
   */
  getMetrics(): GatewayMetrics {
    const total = this.metrics.totalRequests || 1;
    
    return {
      timestamp: new Date().toISOString(),
      version: GATEWAY_VERSION,
      uptimeMs: Date.now() - this.startTime,
      totalRequests: this.metrics.totalRequests,
      allowed: this.metrics.allowed,
      rateLimited: this.metrics.rateLimited,
      blocked: this.metrics.blocked,
      quarantined: this.metrics.quarantined,
      errors: this.metrics.errors,
      allowRate: (this.metrics.allowed / total) * 100,
      blockRate: ((this.metrics.blocked + this.metrics.rateLimited) / total) * 100,
      avgDurationMs: this.metrics.totalDurationMs / total,
      threatsByCategory: { ...this.metrics.threatsByCategory },
      config: { ...this.config },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  getConfig(): GatewayConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clear all state
   */
  clear(): void {
    this.rateLimitState.clear();
    this.quarantine.clear();
    this.metrics = {
      totalRequests: 0,
      allowed: 0,
      rateLimited: 0,
      blocked: 0,
      quarantined: 0,
      errors: 0,
      totalDurationMs: 0,
      threatsByCategory: Object.values(ThreatCategory).reduce(
        (acc, cat) => ({ ...acc, [cat]: 0 }),
        {} as Record<ThreatCategory, number>
      ),
    };
  }

  /**
   * Purge expired quarantine items
   */
  purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    
    for (const [id, item] of this.quarantine.entries()) {
      if (now > item.expiresAt) {
        this.quarantine.delete(id);
        purged++;
      }
    }
    
    return purged;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateId(prefix: string): string {
    this.idCounter++;
    return `${prefix}-${Date.now().toString(36)}-${this.idCounter.toString(36).padStart(4, '0')}`;
  }

  private buildResult(
    status: GatewayStatus,
    allowed: boolean,
    data: unknown | undefined,
    context: GatewayContext,
    stagesCompleted: GatewayStage[],
    rejectedAt: GatewayStage | undefined,
    reports: GatewayResult['reports'],
    threats: Threat[],
    startTime: number
  ): GatewayResult {
    const totalDurationMs = performance.now() - startTime;
    this.metrics.totalDurationMs += totalDurationMs;
    
    return {
      status,
      allowed,
      data,
      context,
      stagesCompleted,
      rejectedAt,
      reports,
      threats,
      totalDurationMs,
      timestamp: new Date().toISOString(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new Gateway instance
 */
export function createGateway(config?: Partial<GatewayConfig>): Gateway {
  return new Gateway(config);
}

/**
 * Create context helper
 */
export function createContext(
  clientId: string,
  requestId?: string,
  metadata?: Record<string, unknown>
): GatewayContext {
  return {
    requestId: requestId ?? `REQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    clientId,
    timestamp: new Date().toISOString(),
    metadata,
  };
}
